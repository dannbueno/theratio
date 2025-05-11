import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import kv from '@/lib/kv';

// Asegurar que se ejecuta dinámicamente para cada solicitud
export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('Obteniendo sesiones...');
  
  // Crear datos de prueba estáticos para depuración
  try {
    // Devolver datos estáticos para pruebas
    const mockSessions = [
      {
        id: 12345678,
        name: "Usuario de Prueba",
        profile: "https://example.com/profile.jpg",
        timestamp: new Date().toISOString()
      }
    ];
    
    const stats = {
      totalUsers: mockSessions.length,
      lastLogin: mockSessions[0]
    };
    
    console.log('Utilizando datos de prueba estáticos:', mockSessions);
    
    return NextResponse.json({
      sessions: mockSessions,
      stats,
      source: 'static-data'
    });
    
  } catch (error) {
    console.error('Error completo:', error);
    return NextResponse.json({ 
      error: 'Error al obtener las sesiones', 
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 