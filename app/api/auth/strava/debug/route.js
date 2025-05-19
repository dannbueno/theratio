import { NextResponse } from 'next/server';

// Exportar como dinámica explícitamente
export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Información del entorno
  const isProd = process.env.NODE_ENV === 'production';
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET ? '[CONFIGURADO]' : '[NO CONFIGURADO]';
  
  // URLs de redirección - IGNORAR variables de entorno incorrectas
  const baseUrl = isProd ? 'https://theratio.vercel.app' : 'http://localhost:3000';
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  // Info de la solicitud
  const headers = Object.fromEntries([...request.headers]);
  const host = headers.host || 'desconocido';
  const url = request.url || 'desconocida';
  
  // Diferentes formatos de URL de redirección
  const redirectOptions = {
    hardcoded_prod: 'https://theratio.vercel.app/api/auth/strava/exchange',
    hardcoded_dev: 'http://localhost:3000/api/auth/strava/exchange',
    env_base: `${configuredBaseUrl}/api/auth/strava/exchange`,
    corrected_base: `${baseUrl}/api/auth/strava/exchange`,
    dynamic_host: `${request.url.split('/')[0]}//${host}/api/auth/strava/exchange`,
    strava_doc_domain: 'theratio.vercel.app', // Sólo dominio
    strava_doc_full: 'https://theratio.vercel.app/api/auth/strava/exchange' // URL completa
  };
  
  // URLs completas de autorización
  const authUrls = {};
  for (const [key, uri] of Object.entries(redirectOptions)) {
    // No codificar las que son solo dominio
    const encoded = key.includes('domain') ? uri : encodeURIComponent(uri);
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
  
  // Lo que realmente se está usando en la app
  const actualUrl = isProd 
    ? 'https://theratio.vercel.app/api/auth/strava/exchange'
    : 'http://localhost:3000/api/auth/strava/exchange';
  
  return NextResponse.json({
    environment: {
      node_env: process.env.NODE_ENV,
      base_url_configured: configuredBaseUrl,
      base_url_corrected: baseUrl,
      is_production: isProd,
      strava_client_id: clientId,
      strava_client_secret: clientSecret,
      host: host,
      request_url: url,
      next_config: nextConfigInfo
    },
    redirect_options: redirectOptions,
    auth_urls: authUrls,
    actual_url_used: {
      raw: actualUrl,
      encoded: encodeURIComponent(actualUrl),
      full_auth_url: `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(actualUrl)}&response_type=code&scope=read,activity:write,activity:read`
    }
  });
} 