// Este archivo no existe ya que la URL de redirección es solo el dominio base.
// Strava redirigirá al dominio base (/) y manejaremos ese caso en la página raíz.

// Esta ruta ya no se utilizará, pero la dejamos como documentación.

import { NextResponse } from 'next/server';

// Exportar como dinámica explícitamente
export const dynamic = 'force-dynamic';

export async function GET(request) {
  return NextResponse.redirect('/');
} 