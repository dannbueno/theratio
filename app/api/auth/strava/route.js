import { NextResponse } from 'next/server';

// Exportar como dinámica explícitamente
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  
  // Usar la URL exacta que está configurada en la app de Strava
  // IMPORTANTE: Asegúrate de que esta URL coincida exactamente con la configurada en tu app de Strava
  const redirectUri = encodeURIComponent('https://theratio.vercel.app');
  
  console.log("URL de redirección utilizada:", redirectUri);
  
  // Scope ampliado para que coincida con lo que aparece en el log
  const scope = 'read,activity:write,activity:read';

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

  console.log("URL completa de autorización:", stravaAuthUrl);
  
  return NextResponse.redirect(stravaAuthUrl);
} 