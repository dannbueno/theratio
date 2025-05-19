import { NextResponse } from 'next/server';

// Exportar como dinámica explícitamente
export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Usar la variable correcta de .env
  const clientId = process.env.STRAVA_CLIENT_ID;
  
  // Definir URL de redirección basada en el entorno de manera directa
  let redirectUri;
  
  if (process.env.NODE_ENV === 'production') {
    // En producción, usar EXACTAMENTE lo que está configurado en Strava
    redirectUri = encodeURIComponent('https://theratio.vercel.app/api/auth/strava/exchange');
    console.log("Entorno de producción detectado, usando URL fija de producción");
  } else {
    // En desarrollo, usar el puerto que aparezca en la URL actual de la solicitud
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    redirectUri = encodeURIComponent(`${protocol}://${host}/api/auth/strava/exchange`);
    console.log(`Entorno de desarrollo detectado, usando ${protocol}://${host}`);
  }
  
  console.log("ID de cliente Strava:", clientId);
  console.log("URL de redirección codificada:", redirectUri);
  
  // Scope ampliado para que coincida con lo que aparece en el log
  const scope = 'read,activity:write,activity:read';

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

  console.log("URL completa de autorización:", stravaAuthUrl);
  
  return NextResponse.redirect(stravaAuthUrl);
} 