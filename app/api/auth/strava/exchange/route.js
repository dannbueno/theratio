import { NextResponse } from 'next/server';
import { savePgSession } from '@/lib/postgres';

// Asegurar que se ejecuta dinámicamente para cada solicitud
export const dynamic = 'force-dynamic';

// Función para guardar la sesión del usuario
async function saveSession(userData) {
  try {
    console.log('Intentando guardar sesión para:', userData.athlete.id);
    
    // Guardar sesión en PostgreSQL
    const result = await savePgSession(userData);
    
    if (result) {
      console.log(`Sesión guardada para ${userData.athlete.firstname} ${userData.athlete.lastname}`);
      return true;
    } else {
      console.error('No se pudo guardar la sesión en PostgreSQL');
      return false;
    }
  } catch (error) {
    console.error('Error al guardar la sesión:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    // Obtener el código de la solicitud
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'Se requiere un código de autorización' }, { status: 400 });
    }
    
    // Variables para la solicitud a Strava
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    
    console.log('Intercambiando código por token');
    console.log('Client ID:', clientId);
    console.log('Secret disponible:', !!clientSecret);
    
    if (!clientId || !clientSecret) {
      console.error('Faltan credenciales de Strava');
      return NextResponse.json({ error: 'Faltan credenciales de Strava' }, { status: 500 });
    }

    // Intercambiar el código por un token
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    
    // Registrar la respuesta para depuración
    console.log('Respuesta de token (status):', tokenResponse.status);
    
    if (!tokenResponse.ok) {
      console.error('Error intercambiando código por token:', tokenData);
      return NextResponse.json(tokenData, { status: tokenResponse.status });
    }

    // Guardar la sesión del usuario si la autenticación es exitosa
    if (tokenData.athlete) {
      await saveSession(tokenData);
    }

    // Devolver el token y otros datos al cliente
    return NextResponse.json(tokenData);
  } catch (error) {
    console.error('Error en el intercambio de token:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 