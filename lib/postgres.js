import { sql } from '@vercel/postgres';

export async function createTablesIfNotExist() {
  try {
    console.log('Verificando si existen las tablas necesarias...');
    
    // Crear tabla de sesiones si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id BIGINT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        profile VARCHAR(255),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
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
    await sql`
      INSERT INTO sessions (id, name, profile, timestamp)
      VALUES (${session.id}, ${session.name}, ${session.profile}, ${session.timestamp})
      ON CONFLICT (id) 
      DO UPDATE SET name = ${session.name}, profile = ${session.profile}, timestamp = ${session.timestamp};
    `;
    
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
    const { rows } = await sql`SELECT * FROM sessions ORDER BY timestamp DESC;`;
    console.log(`Obtenidas ${rows.length} sesiones de PostgreSQL`);
    
    return rows;
  } catch (error) {
    console.error('Error al obtener sesiones de PostgreSQL:', error);
    throw error;
  }
}

export default {
  createTablesIfNotExist,
  savePgSession,
  getPgSessions
}; 