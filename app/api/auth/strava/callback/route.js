import { NextResponse } from 'next/server';

export async function GET(request) {
  // Obtener el código de autorización de los parámetros de URL
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Si hay un error o no hay código, redirigir a la página principal con un mensaje de error
  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}?error=authentication_failed`);
  }

  try {
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

    if (!tokenResponse.ok) {
      console.error('Error intercambiando código por token:', tokenData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}?error=token_exchange_failed`);
    }

    // Extraer los tokens
    const { access_token, refresh_token, expires_at } = tokenData;
    
    // Redirigir al dashboard con el token de acceso
    // En una aplicación real, almacenarías estos tokens de forma segura en una base de datos
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?token=${access_token}`);
  } catch (error) {
    console.error('Error procesando el callback de Strava:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}?error=server_error`);
  }
} 