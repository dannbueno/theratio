import postgres from '../../../../lib/postgres';
import { NextResponse } from 'next/server';

// Asegurar que se ejecuta dinámicamente para cada solicitud
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table') || 'sessions';

    let query;
    switch (table) {
      case 'tokens':
        query = 'SELECT * FROM strava_tokens';
        break;
      case 'sessions':
        query = 'SELECT * FROM sessions';
        break;
      default:
        query = 'SELECT * FROM sessions';
    }

    const result = await postgres.query(query);
    
    return NextResponse.json({
      data: result.rows,
      count: result.rowCount,
      table
    });
  } catch (error) {
    console.error('Error consultando la base de datos:', error);
    return NextResponse.json({ 
      error: 'Error al consultar la base de datos',
      message: error.message
    }, { status: 500 });
  }
} 