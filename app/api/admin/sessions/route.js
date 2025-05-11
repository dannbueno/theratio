import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// Asegurar que se ejecuta dinámicamente para cada solicitud
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Conectar a MongoDB
    const client = await clientPromise;
    const db = client.db("theratio");
    
    // Obtener las sesiones
    const sessions = await db.collection("sessions").find({}).toArray();
    
    // Calcular estadísticas
    const stats = {
      totalUsers: sessions.length,
      lastLogin: sessions.length > 0 
        ? sessions.reduce((latest, session) => {
            return new Date(session.timestamp) > new Date(latest.timestamp) ? session : latest;
          }, sessions[0])
        : null
    };
    
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