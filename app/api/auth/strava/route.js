import { NextResponse } from 'next/server';

// Exportar como dinámica explícitamente
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  
  // Usar la URL base correcta configurada en Strava API
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://theratio.vercel.app';
  const redirectUri = `${baseUrl}/api/auth/strava/callback`;
  
  console.log("URL de redirección utilizada:", redirectUri);
  
  const scope = 'activity:read,activity:write';

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

  return NextResponse.redirect(stravaAuthUrl);
} 