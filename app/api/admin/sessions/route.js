import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Asegurar que se ejecuta dinámicamente para cada solicitud
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Ruta al archivo de sesiones
    const dataFilePath = path.join(process.cwd(), 'server', 'data', 'sessions.json');
    
    // Si el archivo no existe, devolver un array vacío
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json({ sessions: [] });
    }
    
    // Leer el archivo de sesiones
    const fileContent = fs.readFileSync(dataFilePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Agregar información adicional
    const stats = {
      totalUsers: data.sessions.length,
      lastLogin: data.sessions.length > 0 
        ? data.sessions.reduce((latest, session) => {
            return new Date(session.timestamp) > new Date(latest.timestamp) ? session : latest;
          }, data.sessions[0])
        : null
    };
    
    // Devolver las sesiones con estadísticas
    return NextResponse.json({
      sessions: data.sessions,
      stats
    });
  } catch (error) {
    console.error('Error al leer las sesiones:', error);
    return NextResponse.json({ error: 'Error al obtener las sesiones' }, { status: 500 });
  }
} 