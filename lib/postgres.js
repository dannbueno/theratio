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

// Configuración del pool de conexiones a Neon
const pool = new Pool({
  connectionString,
  ssl: true,
});

// Log de inicialización
console.log('Configurando conexión a Neon PostgreSQL...');
console.log('Variable de entorno disponible:', !!connectionString);

// Verificar la conexión cuando se importa este módulo
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error al conectar a Neon PostgreSQL:', err);
  } else {
    console.log('Conexión a Neon PostgreSQL exitosa:', res.rows[0]);
  }
});

export async function createTablesIfNotExist() {
  try {
    console.log('Verificando si existen las tablas necesarias...');
    
    // Crear tabla de sesiones si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id BIGINT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        profile VARCHAR(255),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Crear tabla de tokens de Strava si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS strava_tokens (
        athlete_id BIGINT PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Tablas verificadas o creadas correctamente');
    return true;
  } catch (error) {
    console.error('Error al crear tablas:', error);
    return false;
  }
}

export async function savePgSession(userData) {
  try {
    console.log('Guardando sesión para usuario:', userData.athlete.id);
    
    // Asegurar que las tablas existen
    await createTablesIfNotExist();
    
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
    
    // También guardar los tokens para webhook
    if (userData.access_token && userData.refresh_token && userData.expires_at) {
      await saveStravaTokens(
        userData.athlete.id,
        userData.access_token,
        userData.refresh_token,
        userData.expires_at
      );
    }
    
    console.log('Sesión guardada correctamente para:', session.name);
    return true;
  } catch (error) {
    console.error('Error al guardar sesión en PostgreSQL:', error);
    return false;
  }
}

// Guardar tokens de Strava en la base de datos
export async function saveStravaTokens(athleteId, accessToken, refreshToken, expiresAt) {
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

export async function getPgSessions() {
  try {
    // Asegurar que las tablas existen
    await createTablesIfNotExist();
    
    // Obtener todas las sesiones
    const result = await pool.query('SELECT * FROM sessions ORDER BY timestamp DESC;');
    const rows = result.rows;
    console.log(`Obtenidas ${rows.length} sesiones de Neon PostgreSQL`);
    
    return rows;
  } catch (error) {
    console.error('Error al obtener sesiones de PostgreSQL:', error);
    throw error;
  }
}

// Función para refrescar el token de Strava
export async function refreshToken(athleteId) {
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

export default {
  createTablesIfNotExist,
  savePgSession,
  getPgSessions,
  saveStravaTokens,
  getStravaTokens,
  pool
}; 