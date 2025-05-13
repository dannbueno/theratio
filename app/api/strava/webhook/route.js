import { NextResponse } from 'next/server';
import { getValidAccessToken } from '../../../../lib/strava.js';
import { calculatePreciseVAM, formatClimbTime } from '../../../../lib/strava.js';

// Exportar como dinámica explícitamente
export const dynamic = 'force-dynamic';

// Constantes
const METERS_TO_KM = 0.001;
const MIN_RATIO_FOR_COMMENT = 10; // Umbral mínimo para comentar
const MIN_VAM_FOR_COMMENT = 500; // Umbral mínimo para comentar VAM (metros/hora)
const SECONDS_TO_HOURS = 1 / 3600; // Conversión de segundos a horas
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

// Función para verificar y actualizar comentarios existentes
async function updateActivityWithTheRatio(accessToken, activityId, activityDetails, vamData) {
  try {
    // Extraer datos necesarios
    const elevationGain = activityDetails.total_elevation_gain;
    const distanceKm = activityDetails.distance * METERS_TO_KM;
    const ratio = distanceKm > 0 ? elevationGain / distanceKm : 0;
    const standardVam = activityDetails.moving_time > 0 ? 
      elevationGain / (activityDetails.moving_time * SECONDS_TO_HOURS) : 0;
    
    // Usar VAM preciso si está disponible, o el estándar como respaldo
    const vam = vamData?.vam || Math.round(standardVam);
    
    // Preparar las partes del comentario
    const commentParts = [];
    let shouldComment = false;
    
    // Añadir THE RATIO si es relevante
    if (ratio >= MIN_RATIO_FOR_COMMENT) {
      commentParts.push(`🏔️ TheRatio: ${ratio.toFixed(1)} m/km`);
      shouldComment = true;
    }
    
    // Añadir VAM si es relevante
    if (vam >= MIN_VAM_FOR_COMMENT) {
      if (vamData?.vam && vamData.climbTime && vamData.climbMeters) {
        commentParts.push(`⬆️ TheVAM: ${vam} m/h (${Math.round(vamData.climbMeters)}m / ${formatClimbTime(vamData.climbTime)})`);
      } else {
        commentParts.push(`⬆️ TheVAM: ${Math.round(vam)} m/h`);
      }
      shouldComment = true;
    }
    
    // Solo continuar si al menos uno de los valores supera el umbral
    if (!shouldComment) {
      console.log(`Actividad ${activityId} no alcanza los umbrales mínimos para comentar`);
      return {
        updated: false,
        reason: 'Métricas no alcanzan umbrales mínimos',
        vam,
        ratio: ratio.toFixed(1)
      };
    }
    
    // Añadir línea final con crédito
    commentParts.push(`Calculated by TheRatio https://theratio.vercel.app`);
    
    // Unir las partes del comentario
    const theRatioComment = commentParts.join('\n');
    
    // Extraer descripción actual
    let description = activityDetails.description || '';
    
    // Verificar si ya existe un comentario de TheRatio
    const ratioLineRegExp = /🏔️ TheRatio: \d+\.\d+ m\/km/;
    const vamLineRegExp = /⬆️ TheVAM: \d+ m\/h/;
    const calculatedByRegExp = /Calculated by TheRatio/;
    
    // Si ya existe un comentario de TheRatio, reemplazarlo
    if (ratioLineRegExp.test(description) || 
        vamLineRegExp.test(description) || 
        calculatedByRegExp.test(description)) {
      
      // Dividir por líneas
      const lines = description.split('\n');
      
      // Filtrar líneas de TheRatio
      const filteredLines = lines.filter(line => 
        !ratioLineRegExp.test(line) && 
        !vamLineRegExp.test(line) && 
        !calculatedByRegExp.test(line)
      );
      
      // Reconstruir descripción sin las líneas de TheRatio
      description = filteredLines.join('\n');
    }
    
    // Añadir un salto de línea si la descripción no está vacía y no termina en uno
    if (description && !description.endsWith('\n\n')) {
      description = description.trim() + '\n\n';
    }
    
    // Añadir el nuevo comentario
    const newDescription = description + theRatioComment;
    
    // Actualizar la actividad con el nuevo comentario
    const updateResponse = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: newDescription
      })
    });
    
    if (!updateResponse.ok) {
      console.error('Error actualizando actividad:', await updateResponse.text());
      return {
        updated: false,
        reason: 'Error al actualizar actividad',
        error: updateResponse.status
      };
    }
    
    console.log(`Actividad ${activityId} actualizada con comentarios de TheRatio`);
    return {
      updated: true,
      vam,
      ratio: ratio.toFixed(1),
      preciseVam: !!vamData?.vam,
      description: newDescription
    };
  } catch (error) {
    console.error('Error procesando actividad:', error);
    return {
      updated: false,
      reason: 'Error procesando actividad',
      error: error.message
    };
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