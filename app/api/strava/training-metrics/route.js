import { getAthleteTrainingMetrics } from '../../../../lib/postgres';
import { NextResponse } from 'next/server';

// Asegurar renderizado dinámico
export const dynamic = 'force-dynamic';

// GET /api/strava/training-metrics
export async function GET(request) {
  try {
    // Obtener el ID de atleta desde los parámetros de consulta
    const url = new URL(request.url);
    const athleteId = url.searchParams.get('athleteId');
    
    if (!athleteId) {
      return NextResponse.json(
        { error: 'Se requiere un ID de atleta' },
        { status: 400 }
      );
    }
    
    // Obtener las métricas de entrenamiento
    const metrics = await getAthleteTrainingMetrics(athleteId);
    
    if (!metrics) {
      return NextResponse.json(
        { error: 'No se encontraron métricas para este atleta' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error obteniendo métricas de entrenamiento:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 