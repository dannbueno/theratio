import { NextResponse } from 'next/server';
import { getValidAccessToken } from '../../../../lib/strava.js';
import { calculatePreciseVAM } from '../../../../lib/strava.js';
import { updateActivityWithTheRatio } from '../../../../lib/strava.js';

// Exportar como dinámica explícitamente
export const dynamic = 'force-dynamic';

// Endpoint POST para añadir comentario manualmente
export async function POST(request) {
  try {
    // Obtener datos de la solicitud
    const data = await request.json();
    const { activityId, userId } = data;
    
    if (!activityId || !userId) {
      return NextResponse.json({ 
        error: 'Se requieren activityId y userId' 
      }, { status: 400 });
    }

    // Obtener token de acceso válido para el usuario
    const accessToken = await getValidAccessToken(userId);

    // Si no hay token, no podemos continuar
    if (!accessToken) {
      console.error('No se encontró token de acceso para el usuario:', userId);
      return NextResponse.json({ error: 'Token no encontrado' }, { status: 400 });
    }

    // Obtener detalles de la actividad
    const activityResponse = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!activityResponse.ok) {
      console.error('Error obteniendo detalles de la actividad:', await activityResponse.text());
      return NextResponse.json({ error: 'Error al obtener actividad' }, { status: 500 });
    }

    const activityDetails = await activityResponse.json();
    
    // Solo procesar actividades de tipo TrailRun o Run con elevación
    if ((activityDetails.sport_type === 'TrailRun' || activityDetails.sport_type === 'Run') && 
        activityDetails.total_elevation_gain > 0) {
      
      // Calcular VAM preciso
      const vamData = await calculatePreciseVAM(activityId, accessToken);
      
      // Actualizar actividad con TheRatio/TheVAM
      const updateResult = await updateActivityWithTheRatio(
        accessToken, 
        activityId, 
        activityDetails, 
        vamData
      );
      
      return NextResponse.json({
        ...updateResult,
        activityName: activityDetails.name
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Tipo de actividad no procesable o sin elevación'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error añadiendo comentario:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
} 