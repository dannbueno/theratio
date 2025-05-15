import { updateAthleteSessionRaw, getSessionsByAthlete } from '../../../../lib/postgres';
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