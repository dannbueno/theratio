import { updateAthleteSessionRaw, getSessionsByAthlete, getPgSessions } from '../../../../lib/postgres';
import { NextResponse } from 'next/server';

// Para actualizar una sesión
export async function PUT(request) {
  const data = await request.json();

  // Verificar que se proporcionan los campos requeridos
  if (!data.id) {
    return NextResponse.json({ error: 'Falta el ID de la sesión' }, { status: 400 });
  }

  try {
    // Actualizar la sesión en la base de datos
    const result = await updateAthleteSessionRaw(data);
    
    if (result) {
      return NextResponse.json({ success: true, session: result });
    } else {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error actualizando la sesión:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Para obtener todas las sesiones de un atleta
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const athleteId = searchParams.get('athleteId');

  if (!athleteId) {
    return NextResponse.json({ error: 'Falta el ID del atleta' }, { status: 400 });
  }

  try {
    const sessions = await getSessionsByAthlete(athleteId);
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error al obtener sesiones:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Asegurar que se ejecuta dinámicamente para cada solicitud
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Obteniendo sesiones desde PostgreSQL...');
    
    // Intentar obtener las sesiones desde PostgreSQL
    try {
      const sessions = await getPgSessions();
      
      // Calcular estadísticas
      const stats = {
        totalUsers: sessions.length,
        lastLogin: sessions.length > 0 ? sessions[0] : null
      };
      
      console.log('Estadísticas calculadas:', stats);
      
      // Devolver las sesiones con estadísticas
      return NextResponse.json({
        sessions,
        stats,
        source: 'postgresql'
      });
    } catch (dbError) {
      console.error('Error al obtener datos de PostgreSQL:', dbError);
      throw new Error(`Error de base de datos: ${dbError.message}`);
    }
  } catch (error) {
    console.error('Error completo al leer las sesiones:', error);
    
    // Devolver datos estáticos en caso de error
    const staticSessions = [
      {
        id: 12345678,
        name: "Daniel Bueno (Fallback)",
        profile: "https://example.com/profile.jpg",
        timestamp: new Date().toISOString()
      },
      {
        id: 87654321,
        name: "Ana García (Fallback)",
        profile: "https://example.com/profile2.jpg",
        timestamp: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    
    const stats = {
      totalUsers: staticSessions.length,
      lastLogin: staticSessions[0]
    };
    
    return NextResponse.json({
      sessions: staticSessions,
      stats,
      source: 'error-fallback',
      error: error.message
    });
  }
} 