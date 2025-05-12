import { NextResponse } from 'next/server';
import { getPgSessions } from '@/lib/postgres';

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