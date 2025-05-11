import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import kv from '@/lib/kv';

// Asegurar que se ejecuta dinámicamente para cada solicitud
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Obteniendo sesiones...');
    
    // Conectar a MongoDB con mejor manejo de errores
    let client;
    try {
      client = await clientPromise;
      console.log('Conexión a MongoDB exitosa');
    } catch (mongoConnectError) {
      console.error('Error al conectar a MongoDB:', mongoConnectError);
      throw new Error(`Error de conexión a MongoDB: ${mongoConnectError.message}`);
    }
    
    // Acceder a la base de datos
    const db = client.db("theratio");
    console.log('Accediendo a la base de datos theratio');
    
    // Verificar si la colección existe
    let collections;
    try {
      collections = await db.listCollections({ name: "sessions" }).toArray();
      console.log('Verificando colección sessions:', collections.length > 0 ? 'Existe' : 'No existe');
    } catch (listCollError) {
      console.error('Error al listar colecciones:', listCollError);
      throw new Error(`Error al listar colecciones: ${listCollError.message}`);
    }
    
    // Si la colección no existe, crear una vacía
    if (collections.length === 0) {
      try {
        console.log('Creando colección sessions');
        await db.createCollection("sessions");
      } catch (createCollError) {
        console.error('Error al crear colección:', createCollError);
        // Continuamos aunque falle la creación, podría ser un problema de permisos
      }
    }
    
    // Obtener las sesiones
    let sessions;
    try {
      sessions = await db.collection("sessions").find({}).toArray();
      console.log(`Encontradas ${sessions.length} sesiones`);
    } catch (findError) {
      console.error('Error al buscar sesiones:', findError);
      throw new Error(`Error al buscar sesiones: ${findError.message}`);
    }
    
    // Si no hay sesiones, proporcionar al menos una sesión de ejemplo
    if (!sessions || sessions.length === 0) {
      console.log('No se encontraron sesiones, usando datos de ejemplo');
      sessions = [{
        id: 12345678,
        name: "Usuario de Ejemplo",
        profile: "https://example.com/profile.jpg",
        timestamp: new Date().toISOString()
      }];
    }
    
    // Calcular estadísticas
    const stats = {
      totalUsers: sessions.length,
      lastLogin: sessions.length > 0 
        ? sessions.reduce((latest, session) => {
            return new Date(session.timestamp) > new Date(latest.timestamp) ? session : latest;
          }, sessions[0])
        : null
    };
    
    console.log('Estadísticas calculadas:', stats);
    
    // Devolver las sesiones con estadísticas
    return NextResponse.json({
      sessions,
      stats,
      source: 'mongodb'
    });
  } catch (error) {
    console.error('Error completo al leer las sesiones:', error);
    return NextResponse.json({ 
      error: 'Error al obtener las sesiones', 
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 