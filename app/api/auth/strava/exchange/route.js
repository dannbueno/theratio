import { NextResponse } from 'next/server';
import { savePgSession } from '../../../../../lib/postgres';
import { cookies } from 'next/headers';

// Asegurar que se ejecuta dinámicamente para cada solicitud
export const dynamic = 'force-dynamic';

// Añadir soporte para el método GET desde la redirección de Strava
export async function GET(request) {
  // Capturamos todos los errores posibles
  try {
    // Extraer todos los parámetros y encabezados para diagnóstico
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const scope = searchParams.get('scope');
    const requestUrl = request.url;
    const headers = Object.fromEntries([...request.headers]);
    
    // Log completo de solicitud
    console.log('=== EXCHANGE PARAMETERS ===');
    console.log('Request URL:', requestUrl);
    console.log('Code:', code);
    console.log('Error:', error);
    console.log('Scope:', scope); 
    console.log('Headers:', JSON.stringify(headers));
    
    // Si hay error o no hay código, redireccionar con error
    if (error || !code) {
      console.error('Error o código faltante:', error || 'No code');
      return NextResponse.redirect(`/dashboard?auth_error=${error || 'no_code'}`);
    }
    
    // Información para intercambio
    const tokenUrl = 'https://www.strava.com/api/v3/oauth/token';
    const clientId = process.env.STRAVA_CLIENT_ID || '129187';
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    
    if (!clientSecret) {
      console.error('Falta secreto de cliente');
      return NextResponse.redirect(`/dashboard?auth_error=missing_secret`);
    }
    
    // Construir parámetros
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    
    console.log('Parámetros de intercambio:', params.toString());
    
    // Hacer solicitud para intercambiar código por token
    try {
      console.log('Iniciando solicitud a Strava API...');
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      console.log('Respuesta de Strava recibida. Estado:', response.status);
      
      // Manejo de errores de la API
      if (!response.ok) {
        let errorText = await response.text();
        console.error('Error de Strava API:', response.status, errorText);
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Error JSON:', errorJson);
          return NextResponse.redirect(`/dashboard?auth_error=${encodeURIComponent(JSON.stringify(errorJson))}`);
        } catch (e) {
          return NextResponse.redirect(`/dashboard?auth_error=${encodeURIComponent(errorText)}`);
        }
      }
      
      // Procesar respuesta exitosa
      const tokenData = await response.json();
      console.log('Token obtenido. Detalles athlete:', tokenData.athlete?.id);
      
      // Verificar datos de atleta
      if (!tokenData.athlete || !tokenData.athlete.id) {
        console.error('No hay datos de atleta en la respuesta');
        return NextResponse.redirect(`/dashboard?auth_error=no_athlete_data`);
      }
      
      // Guardar cookies
      try {
        const cookieStore = cookies();
        const sixHoursInSeconds = 6 * 60 * 60;
        const options = {
          maxAge: sixHoursInSeconds,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true
        };
        
        cookieStore.set('strava_athlete_id', tokenData.athlete.id.toString(), options);
        cookieStore.set('strava_access_token', tokenData.access_token, options);
        cookieStore.set('strava_refresh_token', tokenData.refresh_token, options);
        cookieStore.set('strava_expires_at', tokenData.expires_at.toString(), options);
        
        console.log('Cookies guardadas correctamente');
      } catch (cookieError) {
        console.error('Error guardando cookies:', cookieError);
        // Continuar incluso con error de cookies
      }
      
      // Intentar guardar la sesión en base de datos
      try {
        const session = {
          id: tokenData.athlete.id,
          firstname: tokenData.athlete.firstname,
          lastname: tokenData.athlete.lastname,
          profile: tokenData.athlete.profile,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at
        };
        
        await savePgSession(session);
        console.log('Sesión guardada en base de datos');
      } catch (dbError) {
        console.error('Error guardando sesión en base de datos:', dbError);
        // Continuar incluso con error de BD
      }
      
      // Redirigir al dashboard con éxito
      console.log('Autenticación exitosa, redirigiendo al dashboard');
      return NextResponse.redirect(`/dashboard?auth_success=true`);
      
    } catch (fetchError) {
      console.error('Error haciendo fetch a Strava API:', fetchError);
      return NextResponse.redirect(`/dashboard?auth_error=fetch_error&message=${encodeURIComponent(fetchError.message)}`);
    }
    
  } catch (globalError) {
    // Capturar cualquier error y mostrar
    console.error('ERROR GLOBAL:', globalError);
    return NextResponse.redirect(`/dashboard?auth_error=global_error&message=${encodeURIComponent(globalError.message)}`);
  }
}

// Mantener la función POST por compatibilidad
export async function POST(request) {
  try {
    // Redirigir al método GET para simplificar
    console.log('Solicitud POST recibida, redirigiendo a GET');
    return GET(request);
  } catch (error) {
    console.error('Error en POST:', error);
    return NextResponse.json({ 
      error: 'Error en solicitud POST',
      message: error.message
    }, { status: 500 });
  }
} 