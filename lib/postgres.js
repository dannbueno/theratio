// Usamos diferentes clientes según el entorno
let Pool;
if (process.env.NODE_ENV === 'production') {
  // En producción, usamos el driver serverless de Neon
  const { neonConfig, Pool: NeonPool } = require('@neondatabase/serverless');
  // Configurar Neon para entornos serverless
  neonConfig.fetchConnectionCache = true;
  Pool = NeonPool;
  console.log('Usando driver serverless de Neon en producción');
} else {
  // En desarrollo, usamos pg estándar
  const { Pool: PgPool } = require('pg');
  Pool = PgPool;
  console.log('Usando driver pg estándar en desarrollo');
}

// Obtener la URL de conexión de las variables de entorno
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

console.log('Configurando conexión a Neon PostgreSQL...');
console.log('Variable de entorno disponible:', !!connectionString);

// Si no hay connectionString en desarrollo, usar valores por defecto
let poolConfig = connectionString 
  ? { connectionString } 
  : process.env.NODE_ENV !== 'production'
    ? {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'theratio',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || '',
      }
    : { connectionString: '' }; // En producción debería haber siempre un connectionString

// En producción, añadir SSL si no está en la URL
if (process.env.NODE_ENV === 'production' && !connectionString?.includes('?sslmode=')) {
  poolConfig.ssl = true;
}

// Configuración del pool de conexiones
const pool = connectionString ? new Pool(poolConfig) : null;

// Si estamos construyendo la aplicación y no hay base de datos configurada, crear un pool falso
if (!pool && process.env.NODE_ENV === 'production') {
  console.warn('No se ha configurado una base de datos. Las operaciones de BD no funcionarán.');
}

// Función para crear las tablas necesarias si no existen
async function createTablesIfNotExist() {
  if (!pool) {
    console.warn('No hay conexión a la base de datos disponible.');
    return false;
  }

  try {
    // Crear tabla para los tokens de Strava
    await pool.query(`
      CREATE TABLE IF NOT EXISTS strava_tokens (
        athlete_id BIGINT PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Crear tabla para las actividades de los usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id SERIAL PRIMARY KEY,
        strava_activity_id BIGINT UNIQUE NOT NULL,
        athlete_id BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL,
        sport_type VARCHAR(50) NOT NULL,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        distance FLOAT NOT NULL,
        moving_time INTEGER NOT NULL,
        elapsed_time INTEGER NOT NULL,
        total_elevation_gain FLOAT,
        has_heartrate BOOLEAN DEFAULT false,
        average_heartrate FLOAT,
        max_heartrate FLOAT,
        average_speed FLOAT,
        max_speed FLOAT,
        average_watts FLOAT,
        max_watts FLOAT,
        weighted_average_watts FLOAT,
        kilojoules FLOAT,
        average_cadence FLOAT,
        suffer_score INTEGER,
        calories FLOAT,
        elevation_ratio FLOAT,
        tss FLOAT,
        intensity_factor FLOAT,
        normalized_power FLOAT,
        vam FLOAT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_athlete FOREIGN KEY(athlete_id) REFERENCES strava_tokens(athlete_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_activities_athlete_date ON user_activities(athlete_id, start_date);
      CREATE INDEX IF NOT EXISTS idx_user_activities_sport_type ON user_activities(athlete_id, sport_type);

      -- Función para actualizar el timestamp de update automáticamente
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Trigger para actualizar automáticamente updated_at
      DROP TRIGGER IF EXISTS update_user_activities_updated_at ON user_activities;
      CREATE TRIGGER update_user_activities_updated_at
      BEFORE UPDATE ON user_activities
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
    
    return true;
  } catch (error) {
    console.error('Error creando tablas:', error);
    return false;
  }
}

// Guardar tokens de Strava en la base de datos
export async function saveStravaTokens(athleteId, accessToken, refreshToken, expiresAt) {
  if (!pool) {
    console.warn('No hay conexión a la base de datos disponible.');
    return null;
  }

  try {
    // Verificar si existe una entrada para este atleta
    const checkResult = await pool.query(
      'SELECT athlete_id FROM strava_tokens WHERE athlete_id = $1',
      [athleteId]
    );
    
    let result;
    
    if (checkResult.rowCount > 0) {
      // Actualizar tokens existentes
      result = await pool.query(
        `UPDATE strava_tokens 
         SET access_token = $2, refresh_token = $3, expires_at = $4, updated_at = NOW() 
         WHERE athlete_id = $1 
         RETURNING *`,
        [athleteId, accessToken, refreshToken, expiresAt]
      );
    } else {
      // Crear nueva entrada
      result = await pool.query(
        `INSERT INTO strava_tokens 
         (athlete_id, access_token, refresh_token, expires_at, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, NOW(), NOW()) 
         RETURNING *`,
        [athleteId, accessToken, refreshToken, expiresAt]
      );
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error guardando tokens de Strava:', error);
    return null;
  }
}

// Obtener tokens de Strava para un atleta
export async function getStravaTokens(athleteId) {
  if (!pool) {
    console.warn('No hay conexión a la base de datos disponible.');
    return null;
  }

  try {
    const result = await pool.query(
      'SELECT access_token, refresh_token, expires_at FROM strava_tokens WHERE athlete_id = $1',
      [athleteId]
    );
    
    if (result.rowCount === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error obteniendo tokens de Strava:', error);
    return null;
  }
}

// Función para refrescar el token de Strava
export async function refreshToken(athleteId) {
  if (!pool) {
    console.warn('No hay conexión a la base de datos disponible.');
    return null;
  }

  try {
    // Obtener el token actual
    const tokens = await getStravaTokens(athleteId);
    if (!tokens) {
      console.error(`No se encontraron tokens para el atleta ${athleteId}`);
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    
    // Verificar si el token ha expirado
    if (tokens.expires_at <= now) {
      console.log(`Token expirado para atleta ${athleteId}, renovando...`);
      
      // Renovar el token
      const refreshResult = await refreshStravaToken(tokens.refresh_token);
      
      if (!refreshResult) {
        console.error(`Error renovando token para atleta ${athleteId}`);
        return null;
      }
      
      // Guardar el nuevo token
      await saveStravaTokens(
        athleteId,
        refreshResult.access_token,
        refreshResult.refresh_token,
        refreshResult.expires_at
      );
      
      return {
        access_token: refreshResult.access_token,
        refresh_token: refreshResult.refresh_token,
        expires_at: refreshResult.expires_at
      };
    }
    
    // Token aún válido
    return tokens;
  } catch (error) {
    console.error('Error refrescando token:', error);
    return null;
  }
}

// Función para refrescar el token de Strava usando el refresh_token
async function refreshStravaToken(refreshToken) {
  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });
    
    if (!response.ok) {
      console.error('Error refrescando token de Strava:', await response.text());
      return null;
    }
    
    const data = await response.json();
    console.log('Token refrescado correctamente');
    return data;
  } catch (error) {
    console.error('Error en la solicitud de refresh:', error);
    return null;
  }
}

// Función para obtener todas las sesiones de la base de datos
export async function getPgSessions() {
  if (!pool) {
    console.warn('No hay conexión a la base de datos disponible.');
    return [];
  }

  try {
    // Si no existe la tabla sessions, crearla
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id BIGINT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        profile VARCHAR(255),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Obtener todas las sesiones ordenadas por fecha más reciente
    const result = await pool.query('SELECT * FROM sessions ORDER BY timestamp DESC');
    return result.rows;
  } catch (error) {
    console.error('Error obteniendo sesiones:', error);
    throw error;
  }
}

// Función para guardar una sesión en la base de datos
export async function savePgSession(userData) {
  if (!pool) {
    console.warn('No hay conexión a la base de datos disponible.');
    return false;
  }

  try {
    // Crear objeto de sesión
    const session = {
      id: userData.athlete.id,
      name: `${userData.athlete.firstname} ${userData.athlete.lastname}`,
      profile: userData.athlete.profile || '',
      timestamp: new Date()
    };
    
    // Insertar o actualizar sesión
    const query = `
      INSERT INTO sessions (id, name, profile, timestamp)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) 
      DO UPDATE SET name = $2, profile = $3, timestamp = $4;
    `;
    
    await pool.query(query, [
      session.id,
      session.name,
      session.profile,
      session.timestamp
    ]);
    
    console.log('Sesión guardada correctamente para:', session.name);
    return true;
  } catch (error) {
    console.error('Error guardando sesión:', error);
    return false;
  }
}

// Función para guardar una actividad en la base de datos
export async function saveActivity(activity, athleteId) {
  if (!pool) {
    console.warn('No hay conexión a la base de datos disponible.');
    return null;
  }

  try {
    // Calcular el elevation ratio si tiene distancia y elevación
    let elevationRatio = null;
    if (activity.distance > 0 && activity.total_elevation_gain) {
      elevationRatio = (activity.total_elevation_gain / (activity.distance / 1000));
    }
    
    // Calcular o estimar TSS y otros valores si están disponibles los datos
    // Nota: estos cálculos son una aproximación y dependen del tipo de actividad
    let tss = null;
    let intensityFactor = null;
    let normalizedPower = null;
    
    // Para actividades de ciclismo con datos de potencia
    if ((activity.sport_type === 'Ride' || activity.sport_type === 'VirtualRide') && 
        activity.weighted_average_watts && activity.moving_time) {
      // Aproximación básica de IF basada en potencia normalizada
      // En una implementación real, necesitaríamos FTP del usuario
      const estimatedFTP = 250; // Valor predeterminado para ejemplo
      intensityFactor = activity.weighted_average_watts / estimatedFTP;
      normalizedPower = activity.weighted_average_watts;
      
      // TSS = (sec * NP * IF) / (FTP * 3600) * 100
      tss = (activity.moving_time * normalizedPower * intensityFactor) / (estimatedFTP * 3600) * 100;
    }
    
    // Insertar o actualizar la actividad
    const query = `
      INSERT INTO user_activities (
        strava_activity_id, athlete_id, name, sport_type, start_date, 
        distance, moving_time, elapsed_time, total_elevation_gain,
        has_heartrate, average_heartrate, max_heartrate, 
        average_speed, max_speed, average_watts, max_watts, 
        weighted_average_watts, kilojoules, average_cadence, 
        suffer_score, calories, elevation_ratio, tss, 
        intensity_factor, normalized_power, vam
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      )
      ON CONFLICT (strava_activity_id) 
      DO UPDATE SET
        name = $3, sport_type = $4, start_date = $5, 
        distance = $6, moving_time = $7, elapsed_time = $8, 
        total_elevation_gain = $9, has_heartrate = $10, 
        average_heartrate = $11, max_heartrate = $12, 
        average_speed = $13, max_speed = $14, average_watts = $15, 
        max_watts = $16, weighted_average_watts = $17, 
        kilojoules = $18, average_cadence = $19, suffer_score = $20, 
        calories = $21, elevation_ratio = $22, tss = $23, 
        intensity_factor = $24, normalized_power = $25, vam = $26,
        updated_at = NOW()
      RETURNING id;
    `;
    
    const result = await pool.query(query, [
      activity.id, athleteId, activity.name, activity.sport_type,
      activity.start_date, activity.distance, activity.moving_time,
      activity.elapsed_time, activity.total_elevation_gain,
      activity.has_heartrate, activity.average_heartrate,
      activity.max_heartrate, activity.average_speed, activity.max_speed,
      activity.average_watts, activity.max_watts,
      activity.weighted_average_watts, activity.kilojoules,
      activity.average_cadence, activity.suffer_score,
      activity.calories, elevationRatio, tss, intensityFactor,
      normalizedPower, activity.vam || null
    ]);
    
    console.log(`Actividad ${activity.id} guardada correctamente para atleta ${athleteId}`);
    return result.rows[0];
  } catch (error) {
    console.error('Error guardando actividad:', error);
    return null;
  }
}

// Función para obtener las actividades de un atleta en un período de tiempo
export async function getAthleteActivities(athleteId, days = 42) {
  if (!pool) {
    console.warn('No hay conexión a la base de datos disponible.');
    return [];
  }

  try {
    // Calcular la fecha de hace 'days' días
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    // Consultar actividades desde esa fecha
    const query = `
      SELECT * FROM user_activities
      WHERE athlete_id = $1 AND start_date >= $2
      ORDER BY start_date DESC
    `;
    
    const result = await pool.query(query, [athleteId, date]);
    return result.rows;
  } catch (error) {
    console.error('Error obteniendo actividades del atleta:', error);
    return [];
  }
}

// Función para obtener las métricas de entrenamiento de un atleta
export async function getAthleteTrainingMetrics(athleteId) {
  if (!pool) {
    console.warn('No hay conexión a la base de datos disponible.');
    return null;
  }

  try {
    // Obtener las actividades de los últimos 42 días
    const activities = await getAthleteActivities(athleteId, 42);
    
    // Preparar objeto de resumen por tipo de deporte
    const sportSummary = {};
    let totalTSS = 0;
    
    // Para cada actividad, acumular estadísticas
    activities.forEach(activity => {
      // Inicializar el resumen para este deporte si no existe
      if (!sportSummary[activity.sport_type]) {
        sportSummary[activity.sport_type] = {
          count: 0,
          distance: 0,
          duration: 0,
          elevation: 0,
          tss: 0,
          activities: []
        };
      }
      
      // Acumular estadísticas
      sportSummary[activity.sport_type].count += 1;
      sportSummary[activity.sport_type].distance += activity.distance;
      sportSummary[activity.sport_type].duration += activity.moving_time;
      sportSummary[activity.sport_type].elevation += activity.total_elevation_gain || 0;
      sportSummary[activity.sport_type].tss += activity.tss || 0;
      
      // Guardar referencia a la actividad
      sportSummary[activity.sport_type].activities.push({
        id: activity.strava_activity_id,
        name: activity.name,
        date: activity.start_date,
        distance: activity.distance,
        duration: activity.moving_time,
        elevation: activity.total_elevation_gain,
        tss: activity.tss
      });
      
      // Acumular TSS total
      totalTSS += activity.tss || 0;
    });
    
    // Calcular CTL (Chronic Training Load) - promedio de TSS de los últimos 42 días
    const ctl = activities.length > 0 ? totalTSS / 42 : 0;
    
    // Obtener actividades de los últimos 7 días para ATL
    const recentActivities = await getAthleteActivities(athleteId, 7);
    let recentTSS = 0;
    
    // Acumular TSS de los últimos 7 días
    recentActivities.forEach(activity => {
      recentTSS += activity.tss || 0;
    });
    
    // Calcular ATL (Acute Training Load) - promedio de TSS de los últimos 7 días
    const atl = recentActivities.length > 0 ? recentTSS / 7 : 0;
    
    // Calcular TSB (Training Stress Balance) - diferencia entre CTL y ATL
    const tsb = ctl - atl;
    
    return {
      ctl,
      atl,
      tsb,
      sportSummary,
      totalActivities: activities.length,
      recentActivities: recentActivities.length
    };
  } catch (error) {
    console.error('Error obteniendo métricas de entrenamiento:', error);
    return null;
  }
}

// Inicializar la base de datos al cargar el módulo
createTablesIfNotExist()
  .then(created => {
    if (created) {
      console.log('Tablas creadas/verificadas correctamente');
    }
  })
  .catch(error => {
    console.error('Error inicializando la base de datos:', error);
  });

export default {
  query: async (...args) => {
    if (!pool) {
      console.warn('No hay conexión a la base de datos disponible.');
      return { rows: [] };
    }
    return pool.query(...args);
  },
  getStravaTokens,
  saveStravaTokens,
  refreshToken,
  getPgSessions,
  savePgSession,
  saveActivity,
  getAthleteActivities,
  getAthleteTrainingMetrics
}; 