import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Obtener el almacén de cookies
    const cookieStore = cookies();
    
    // Eliminar las cookies relacionadas con la autenticación
    cookieStore.delete('strava_athlete_id');
    cookieStore.delete('strava_refresh_token');
    cookieStore.delete('strava_access_token');
    cookieStore.delete('strava_expires_at');
    
    // Devolver respuesta exitosa
    return NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('Error cerrando sesión:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 