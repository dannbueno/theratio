import { NextResponse } from 'next/server';

// Exportar como dinámica explícitamente
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Obtener el código de autorización de los parámetros de URL
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    
    // Obtener la URL base correcta
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://theratio.vercel.app';
    const redirectUri = `${baseUrl}/api/auth/strava/callback`;
    
    console.log('URL de redirección que se usó:', redirectUri);
    console.log('Código recibido:', code);
    console.log('Error recibido:', error);

    // Si hay un error o no hay código, redirigir a la página de error
    if (error || !code) {
      const errorDetails = error || 'No se recibió código de autorización';
      return NextResponse.redirect(`${baseUrl}/error-page.html?error=${encodeURIComponent(errorDetails)}&redirect_uri=${encodeURIComponent(redirectUri)}`);
    }

    // Intercambiar el código por un token de acceso
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    // Registrar los datos para depuración
    console.log('Respuesta de token:', JSON.stringify(tokenData));

    if (!tokenResponse.ok) {
      console.error('Error intercambiando código por token:', tokenData);
      // Redirigir a la página de error con detalles
      return NextResponse.redirect(`${baseUrl}/error-page.html?error=${encodeURIComponent(JSON.stringify(tokenData))}&redirect_uri=${encodeURIComponent(redirectUri)}`);
    }

    // Extraer los tokens
    const { access_token, refresh_token, expires_at } = tokenData;
    
    // Redirigir al dashboard con el token de acceso
    // En una aplicación real, almacenarías estos tokens de forma segura en una base de datos
    return NextResponse.redirect(`${baseUrl}/dashboard?token=${access_token}`);
  } catch (error) {
    console.error('Error procesando el callback de Strava:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://theratio.vercel.app';
    return NextResponse.redirect(`${baseUrl}/error-page.html?error=server_error&details=${encodeURIComponent(error.message)}`);
  }
} 