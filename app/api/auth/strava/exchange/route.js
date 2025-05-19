import { NextResponse } from 'next/server';
import { savePgSession } from '../../../../../lib/postgres';
import { cookies } from 'next/headers';

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

// Añadir soporte para el método GET desde la redirección de Strava
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const scope = searchParams.get('scope');

    console.log('--- DIAGNÓSTICO DE EXCHANGE ---');
    console.log('URL completa:', request.url);
    console.log('Código recibido:', code);
    console.log('Error (si existe):', error);
    console.log('Scope:', scope);

    if (error || !code) {
      console.error('Error en la redirección de Strava:', error || 'No se recibió código');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}?auth_error=${error || 'no_code'}`);
    }

    // Configuración para hacer la solicitud a Strava
    const tokenUrl = 'https://www.strava.com/api/v3/oauth/token';
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Faltan credenciales de Strava en las variables de entorno');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}?auth_error=missing_credentials`);
    }

    console.log('Procesando código de autorización recibido via GET:', code);

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');

    console.log('Realizando intercambio de código por token...');
    console.log('Parámetros:', params.toString());
    
    // Realizar intercambio de código por token
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      
      console.error('Error respuesta Strava:', errorData);
      
      // Redirigir a la página principal con error
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}?auth_error=${encodeURIComponent(JSON.stringify(errorData))}`);
    }

    const tokenData = await response.json();
    console.log('Token obtenido correctamente');
    
    // Extraer información del atleta
    const { athlete, access_token, refresh_token, expires_at } = tokenData;
    
    if (!athlete || !athlete.id) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}?auth_error=no_athlete_data`);
    }
    
    // Configurar cookies para almacenar la sesión
    const cookieStore = cookies();
    
    // Establecer todas las cookies necesarias para la autenticación
    // Tiempo de expiración: 6 horas
    const sixHoursInSeconds = 6 * 60 * 60;
    const options = {
      maxAge: sixHoursInSeconds,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
    };
    
    // Guardar datos del atleta y tokens en cookies
    cookieStore.set('strava_athlete_id', athlete.id.toString(), options);
    cookieStore.set('strava_access_token', access_token, options);
    cookieStore.set('strava_refresh_token', refresh_token, options);
    cookieStore.set('strava_expires_at', expires_at.toString(), options);
    
    console.log('Cookies de autenticación establecidas');
    
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
      
      await savePgSession(session);
      console.log(`Sesión guardada para atleta ${athlete.id}`);
    } catch (dbError) {
      console.error('Error guardando sesión en base de datos:', dbError);
      // Continuar incluso si hay error en BD
    }

    // Redirigir a la página principal/dashboard
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`);
  } catch (error) {
    console.error('Error en el intercambio de código:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}?auth_error=server_error&message=${encodeURIComponent(error.message)}`);
  }
} 