import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// Asegurar que se ejecuta dinámicamente para cada solicitud
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Obteniendo sesiones...');
    
    // Conectar a MongoDB
    const client = await clientPromise;
    console.log('Conexión a MongoDB exitosa');
    
    const db = client.db("theratio");
    console.log('Accediendo a la base de datos theratio');
    
    // Verificar si la colección existe
    const collections = await db.listCollections({ name: "sessions" }).toArray();
    console.log('Verificando colección sessions:', collections.length > 0 ? 'Existe' : 'No existe');
    
    // Si la colección no existe, crear una vacía
    if (collections.length === 0) {
      console.log('Creando colección sessions');
      await db.createCollection("sessions");
    }
    
    // Obtener las sesiones
    const sessions = await db.collection("sessions").find({}).toArray();
    console.log(`Encontradas ${sessions.length} sesiones`);
    
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
      stats
    });
  } catch (error) {
    console.error('Error al leer las sesiones:', error);
    return NextResponse.json({ error: 'Error al obtener las sesiones' }, { status: 500 });
  }
} 