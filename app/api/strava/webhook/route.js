import { NextResponse } from 'next/server';
import { getValidAccessToken } from '../../../../lib/strava.js';
import { calculatePreciseVAM, updateActivityWithTheRatio } from '../../../../lib/strava.js';

// Exportar como dinámica explícitamente
export const dynamic = 'force-dynamic';

// Constantes
const METERS_TO_KM = 0.001;
const MIN_RATIO_FOR_COMMENT = 10; // Umbral mínimo para comentar
const MIN_ELEVATION_GAIN_FOR_SEGMENT = 10; // Mínimo desnivel para considerar un segmento de subida (en metros)
const MIN_GRADIENT_FOR_CLIMB = 2; // Pendiente mínima en % para considerar una subida

// Endpoint GET para verificar el webhook con Strava
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verificar que el token es el esperado
  if (mode === 'subscribe' && token === process.env.STRAVA_VERIFY_TOKEN) {
    console.log('Webhook verificado con éxito');
    return NextResponse.json({ 'hub.challenge': challenge });
  } else {
    console.error('Verificación de webhook fallida');
    return NextResponse.json({ error: 'Verificación fallida' }, { status: 403 });
  }
}

// Endpoint POST para recibir eventos de Strava
export async function POST(request) {
  try {
    // Obtener datos del webhook
    const data = await request.json();
    console.log('Evento recibido de Strava:', data);

    // Verificar si es un evento de creación de actividad
    if (data.aspect_type === 'create' && data.object_type === 'activity') {
      const activityId = data.object_id;
      const ownerId = data.owner_id;

      // Obtener token de acceso válido para el usuario
      const accessToken = await getValidAccessToken(ownerId);

      // Si no hay token, no podemos continuar
      if (!accessToken) {
        console.error('No se encontró token de acceso para el usuario:', ownerId);
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
        
        // Calcular ratio para verificar umbral
        const elevationGain = activityDetails.total_elevation_gain;
        const distanceKm = activityDetails.distance * METERS_TO_KM;
        const ratio = distanceKm > 0 ? elevationGain / distanceKm : 0;
        
        // Verificar si la actividad cumple el umbral mínimo de ratio
        if (ratio < MIN_RATIO_FOR_COMMENT) {
          console.log(`Actividad ${activityId} no cumple el umbral mínimo de ratio: ${ratio.toFixed(1)}`);
          return NextResponse.json({ 
            success: true, 
            message: 'Actividad no alcanza el umbral de ratio para comentar',
            ratio: ratio.toFixed(1)
          });
        }
        
        // Calcular VAM preciso
        const vamData = await calculatePreciseVAM(activityId, accessToken);
        
        // Actualizar actividad con TheRatio/TheVAM
        const updateResult = await updateActivityWithTheRatio(
          accessToken, 
          activityId, 
          activityDetails, 
          vamData
        );
        
        return NextResponse.json(updateResult);
      } else {
        console.log(`Actividad ${activityId} ignorada. Tipo: ${activityDetails.sport_type}`);
        return NextResponse.json({ 
          success: true, 
          message: 'Tipo de actividad no procesable o sin elevación'
        });
      }
    }
    
    // Para otros tipos de eventos
    return NextResponse.json({ success: true, message: 'Evento recibido pero no procesado' });
  } catch (error) {
    console.error('Error procesando webhook de Strava:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
} 