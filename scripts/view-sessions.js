// Script para consultar y mostrar todas las sesiones en la base de datos
require('dotenv').config({ path: '.env.development.local' });
const { Pool } = require('pg');

// Obtener la URL de conexión
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: No se encontró la URL de conexión a la base de datos.');
  console.error('Asegúrate de tener un archivo .env.development.local con POSTGRES_URL o DATABASE_URL');
  process.exit(1);
}

console.log('Conectando a la base de datos...');

const pool = new Pool({
  connectionString,
  ssl: true,
});

async function viewSessions() {
  try {
    // Verificar que la tabla existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id BIGINT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        profile VARCHAR(255),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Consultar las sesiones
    const result = await pool.query('SELECT * FROM sessions ORDER BY timestamp DESC;');
    const sessions = result.rows;
    
    console.log('\n===== SESIONES GUARDADAS =====\n');
    
    if (sessions.length === 0) {
      console.log('No hay sesiones guardadas en la base de datos.');
    } else {
      console.log(`Total de sesiones: ${sessions.length}\n`);
      
      sessions.forEach((session, index) => {
        const date = new Date(session.timestamp).toLocaleString();
        console.log(`[${index + 1}] ${session.name} (ID: ${session.id})`);
        console.log(`    Perfil: ${session.profile || 'N/A'}`);
        console.log(`    Fecha: ${date}`);
        console.log('-----------------------------------');
      });
    }
  } catch (error) {
    console.error('Error al consultar las sesiones:', error);
  } finally {
    // Cerrar la conexión
    await pool.end();
  }
}

// Ejecutar la función
viewSessions(); 