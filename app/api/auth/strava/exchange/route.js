import { NextResponse } from 'next/server';
import { saveAthleteSession } from '../../../../../lib/postgres';

// Asegurar que se ejecuta dinámicamente para cada solicitud
export const dynamic = 'force-dynamic';

// Función para guardar la sesión del usuario
async function saveSession(userData) {
  try {
    console.log('Intentando guardar sesión para:', userData.athlete.id);
    
    // Guardar sesión en PostgreSQL
    const result = await saveAthleteSession(userData);
    
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
    const requestData = await request.json();
    const { code, error } = requestData;

    if (error || !code) {
      return NextResponse.json({
        error: error || 'No se recibió el código de autorización',
      }, { status: 400 });
    }

    // Configuración para hacer la solicitud a Strava
    const tokenUrl = 'https://www.strava.com/api/v3/oauth/token';
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Faltan credenciales de Strava en las variables de entorno');
      return NextResponse.json({
        error: 'Configuración de la aplicación incompleta',
      }, { status: 500 });
    }

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');

    // Realizar intercambio de código por token
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error respuesta Strava:', errorData);
      return NextResponse.json({
        error: 'Error intercambiando el código por token',
        details: errorData,
      }, { status: response.status });
    }

    const tokenData = await response.json();
    
    // Extraer información del atleta
    const { athlete, access_token, refresh_token, expires_at } = tokenData;
    
    if (!athlete || !athlete.id) {
      return NextResponse.json({
        error: 'No se pudo obtener la información del atleta',
      }, { status: 500 });
    }
    
    // Guardar sesión en base de datos
    try {
      const session = {
        id: athlete.id,
        firstname: athlete.firstname,
        lastname: athlete.lastname,
        profile: athlete.profile,
        access_token,
        refresh_token,
        expires_at,
        username: athlete.username || null,
        city: athlete.city || null,
        state: athlete.state || null,
        country: athlete.country || null,
        sex: athlete.sex || null,
        athlete_type: athlete.athlete_type || null
      };
      
      await saveAthleteSession(session);
      console.log(`Sesión guardada para atleta ${athlete.id}`);
    } catch (dbError) {
      console.error('Error guardando sesión en base de datos:', dbError);
      // Continuar incluso si hay error en BD
    }

    // Devolver los datos relevantes (no incluimos refresh_token por seguridad)
    return NextResponse.json({
      id: athlete.id,
      firstname: athlete.firstname,
      lastname: athlete.lastname,
      profile: athlete.profile,
      token: access_token,
      expires_at,
    });
  } catch (error) {
    console.error('Error en el intercambio de código:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message,
    }, { status: 500 });
  }
} 