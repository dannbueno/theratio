import { Pool } from 'pg';

// Configuración del pool de conexiones a Neon
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false, // Necesario para conexiones a Neon en algunos entornos
  },
});

// Log de inicialización
console.log('Configurando conexión a Neon PostgreSQL...');

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
    
    console.log('Sesión guardada correctamente para:', session.name);
    return true;
  } catch (error) {
    console.error('Error al guardar sesión en PostgreSQL:', error);
    return false;
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
  pool
}; 