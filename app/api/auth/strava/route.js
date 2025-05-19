import { NextResponse } from 'next/server';

// Exportar como dinámica explícitamente
export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Usar la variable correcta de .env
  const clientId = process.env.STRAVA_CLIENT_ID;

  // URLS FIJAS - NO USAR VARIABLES DE ENTORNO
  let redirectUri;
  const isProd = process.env.NODE_ENV === 'production';
  
  if (isProd) {
    console.log('Entorno PRODUCCIÓN - Usando URL FIJA de PRODUCCIÓN');
    // IMPORTANTE: Debe coincidir EXACTAMENTE con lo configurado en el panel de Strava
    redirectUri = 'https://theratio.vercel.app/api/auth/strava/exchange';
  } else {
    // IMPORTANTE: Ignorar completamente NEXT_PUBLIC_BASE_URL en desarrollo
    console.log('Entorno DESARROLLO - Usando URL FIJA para localhost:3000');
    // URL FIJA para desarrollo SIEMPRE en puerto 3000
    redirectUri = 'http://localhost:3000/api/auth/strava/exchange';
  }
  
  // NO encodificar la URL para diagnóstico
  const redirectUriRaw = redirectUri;
  // Ahora sí encodificar para uso en la URL
  redirectUri = encodeURIComponent(redirectUri);
  
  console.log('========== DIAGNÓSTICO STRAVA AUTH ==========');
  console.log('Entorno:', isProd ? 'PRODUCCIÓN' : 'DESARROLLO');
  console.log('ID de cliente Strava:', clientId);
  console.log('URL de redirección sin codificar:', redirectUriRaw);
  console.log('URL de redirección codificada:', redirectUri);
  
  // Scope ampliado para que coincida con lo que aparece en el log
  const scope = 'read,activity:write,activity:read';

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

  console.log('URL completa de autorización:', stravaAuthUrl);
  console.log('==============================================');
  
  return NextResponse.redirect(stravaAuthUrl);
} 