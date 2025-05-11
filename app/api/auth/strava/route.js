import { NextResponse } from 'next/server';

// Exportar como dinámica explícitamente
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  
  // Usar la URL base correcta configurada en Strava API
  // Strava solo acepta un dominio simple como redirect_uri autorizado
  const redirectUri = 'https://theratio.vercel.app';
  
  console.log("URL de redirección utilizada:", redirectUri);
  
  // Scope ampliado para que coincida con lo que aparece en el log
  const scope = 'read,activity:write,activity:read';

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

  return NextResponse.redirect(stravaAuthUrl);
} 