import { NextResponse } from 'next/server';

export async function middleware(request) {
  // Registro de todas las solicitudes a la API
  if (request.nextUrl.pathname.startsWith('/api/')) {
    console.log(`[Middleware] Solicitud a: ${request.method} ${request.nextUrl.pathname}`);
  }
  
  // Manejo específico para la API de sesiones
  if (request.nextUrl.pathname === '/api/admin/sessions') {
    console.log('[Middleware] Procesando solicitud a API de sesiones');
  }
  
  return NextResponse.next();
}

// Configuración del middleware
export const config = {
  matcher: [
    '/api/:path*',
  ],
}; 