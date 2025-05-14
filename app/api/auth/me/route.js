import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Obtener los cookies de la solicitud
    const cookieStore = cookies();
    const athleteIdCookie = cookieStore.get('strava_athlete_id');
    const accessTokenCookie = cookieStore.get('strava_access_token');
    
    if (!athleteIdCookie) {
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
    }
    
    // Devolver el ID de atleta y el token de acceso si está disponible
    return NextResponse.json({ 
      id: athleteIdCookie.value,
      token: accessTokenCookie ? accessTokenCookie.value : null
    });
  } catch (error) {
    console.error('Error obteniendo información del usuario:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 