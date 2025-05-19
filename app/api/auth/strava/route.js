import { NextResponse } from 'next/server';

// Exportar como dinámica explícitamente
export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Usar la variable correcta de .env
  const clientId = process.env.STRAVA_CLIENT_ID;
  
  // Usar la URL base desde la variable de entorno para soportar desarrollo y producción
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectUri = encodeURIComponent(`${baseUrl}/api/auth/strava/exchange`);
  
  console.log("ID de cliente Strava:", clientId);
  console.log("URL de redirección utilizada:", redirectUri);
  
  // Scope ampliado para que coincida con lo que aparece en el log
  const scope = 'read,activity:write,activity:read';

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

  console.log("URL completa de autorización:", stravaAuthUrl);
  
  return NextResponse.redirect(stravaAuthUrl);
} 