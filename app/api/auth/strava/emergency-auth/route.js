import { NextResponse } from 'next/server';

// Exportar como dinámica explícitamente
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // HARDCODED - NO variables, NO lógica compleja
    const clientId = "129187"; // Tu client_id
    
    // URL de redirección SIN encodeURIComponent para ver exactamente qué se envía
    const redirectUri = "https://theratio.vercel.app/api/auth/strava/exchange";
    
    // Ahora sí lo codificamos para la URL
    const encodedUri = encodeURIComponent(redirectUri);
    
    // Construimos la URL con todo hardcodeado
    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodedUri}&response_type=code&scope=read,activity:write,activity:read`;
    
    // Log antes de redirigir
    console.log('=== EMERGENCY AUTH REDIRECT ===');
    console.log('URL sin codificar:', redirectUri);
    console.log('URL codificada:', encodedUri);
    console.log('URL de autorización completa:', stravaAuthUrl);
    
    // Redirigir
    return NextResponse.redirect(stravaAuthUrl);
  } catch (error) {
    console.error('Error en auth de emergencia:', error);
    // En caso de error, devolver una respuesta JSON
    return NextResponse.json({
      error: 'Error interno de autenticación',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 