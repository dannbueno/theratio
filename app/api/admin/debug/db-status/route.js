import postgres from '../../../../../lib/postgres';
import { NextResponse } from 'next/server';

// Asegurar que se ejecuta dinámicamente para cada solicitud
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Verificar estado del pool
    const poolStatus = !!postgres.query;
    
    // Verificar si hay conexión a la base de datos intentando ejecutar una consulta
    let dbConnected = false;
    let tablesExist = false;
    let sessions = [];
    let testSessionCreated = false;
    
    try {
      // Probar conexión con una consulta simple
      const result = await postgres.query('SELECT NOW() as time');
      dbConnected = !!result && !!result.rows && result.rows.length > 0;
      
      // Verificar si existen las tablas
      try {
        // Verificar tabla sessions
        const tablesResult = await postgres.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'sessions'
          ) as exists;
        `);
        tablesExist = tablesResult.rows[0].exists;
        
        // Obtener sesiones existentes
        if (tablesExist) {
          const sessionsResult = await postgres.query('SELECT * FROM sessions ORDER BY timestamp DESC');
          sessions = sessionsResult.rows;
        }
        
        // Crear sesión de prueba
        const testUser = {
          id: 9999999,
          firstname: 'Test',
          lastname: 'User',
          profile: 'https://example.com/test-user.jpg'
        };
        
        const savePgSessionResult = await postgres.savePgSession(testUser);
        testSessionCreated = savePgSessionResult;
        
        // Obtener sesiones actualizadas
        if (testSessionCreated) {
          const updatedSessionsResult = await postgres.query('SELECT * FROM sessions ORDER BY timestamp DESC');
          sessions = updatedSessionsResult.rows;
        }
      } catch (tableError) {
        console.error('Error verificando tablas:', tableError);
      }
    } catch (queryError) {
      console.error('Error ejecutando consulta de prueba:', queryError);
    }
    
    // Obtener variables de entorno relacionadas con la base de datos (ocultando credenciales)
    const dbEnv = {
      NODE_ENV: process.env.NODE_ENV,
      POSTGRES_URL: process.env.POSTGRES_URL ? '[CONFIGURADO]' : '[NO CONFIGURADO]',
      DATABASE_URL: process.env.DATABASE_URL ? '[CONFIGURADO]' : '[NO CONFIGURADO]',
      NEON_DATABASE_URL: process.env.NEON_DATABASE_URL ? '[CONFIGURADO]' : '[NO CONFIGURADO]',
      DB_HOST: process.env.DB_HOST || '[NO CONFIGURADO]',
      DB_PORT: process.env.DB_PORT || '[NO CONFIGURADO]',
      DB_NAME: process.env.DB_NAME || '[NO CONFIGURADO]',
      DB_USER: process.env.DB_USER ? '[CONFIGURADO]' : '[NO CONFIGURADO]',
      DB_PASS: process.env.DB_PASS ? '[CONFIGURADO]' : '[NO CONFIGURADO]'
    };
    
    return NextResponse.json({
      poolStatus,
      dbConnected,
      tablesExist,
      sessionCount: sessions.length,
      sessions,
      testSessionCreated,
      environment: dbEnv,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error verificando estado de la base de datos:', error);
    return NextResponse.json({ 
      error: 'Error verificando estado de la base de datos',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 