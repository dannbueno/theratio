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

export async function saveStravaTokens(athleteId, accessToken, refreshToken, expiresAt) {
  try {
    // Asegurar que las tablas existen
    await createTablesIfNotExist();
    
    const query = `
      INSERT INTO strava_tokens (athlete_id, access_token, refresh_token, expires_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (athlete_id) 
      DO UPDATE SET 
        access_token = $2, 
        refresh_token = $3, 
        expires_at = $4,
        updated_at = NOW();
    `;
    
    await pool.query(query, [athleteId, accessToken, refreshToken, expiresAt]);
    console.log('Tokens de Strava guardados correctamente para atleta:', athleteId);
    return true;
  } catch (error) {
    console.error('Error al guardar tokens de Strava:', error);
    return false;
  }
}

export async function getStravaTokens(athleteId) {
  try {
    const result = await pool.query(
      'SELECT * FROM strava_tokens WHERE athlete_id = $1',
      [athleteId]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error al obtener tokens de Strava:', error);
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

export default {
  createTablesIfNotExist,
  savePgSession,
  getPgSessions,
  saveStravaTokens,
  getStravaTokens,
  pool
}; 