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
  refreshToken
}; 