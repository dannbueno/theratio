import { NextResponse } from 'next/server';

// Exportar como dinámica explícitamente
export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Información del entorno
  const isProd = process.env.NODE_ENV === 'production';
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET ? '[CONFIGURADO]' : '[NO CONFIGURADO]';
  
  // URLs de redirección
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  // Info de la solicitud
  const headers = Object.fromEntries([...request.headers]);
  const host = headers.host || 'desconocido';
  const url = request.url || 'desconocida';
  
  // Diferentes formatos de URL de redirección
  const redirectOptions = {
    hardcoded_prod: 'https://theratio.vercel.app/api/auth/strava/exchange',
    hardcoded_dev: 'http://localhost:3000/api/auth/strava/exchange',
    env_base: `${baseUrl}/api/auth/strava/exchange`,
    dynamic_host: `${request.url.split('/')[0]}//${host}/api/auth/strava/exchange`,
    strava_doc: 'theratio.vercel.app'
  };
  
  // URLs completas de autorización
  const authUrls = {};
  for (const [key, uri] of Object.entries(redirectOptions)) {
    const encoded = encodeURIComponent(uri);
    authUrls[key] = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encoded}&response_type=code&scope=read,activity:write,activity:read`;
  }
  
  // Información de configuración de Next
  let nextConfigInfo = {};
  try {
    const { serverRuntimeConfig, publicRuntimeConfig } = require('next/config').default() || { 
      serverRuntimeConfig: {}, 
      publicRuntimeConfig: {} 
    };
    nextConfigInfo = { serverRuntimeConfig, publicRuntimeConfig };
  } catch (e) {
    nextConfigInfo = { error: e.message };
  }
  
  return NextResponse.json({
    environment: {
      node_env: process.env.NODE_ENV,
      base_url: baseUrl,
      is_production: isProd,
      strava_client_id: clientId,
      strava_client_secret: clientSecret,
      host: host,
      request_url: url,
      next_config: nextConfigInfo
    },
    redirect_options: redirectOptions,
    auth_urls: authUrls
  });
} 