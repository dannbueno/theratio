import { NextResponse } from 'next/server';

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

// Función para identificar segmentos de subida y calcular VAM preciso
async function calculatePreciseVAM(activityId, accessToken) {
  try {
    // Obtener datos de stream para la actividad (altitud, distancia y tiempo)
    const streamsResponse = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=altitude,distance,time&key_by_type=true`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    
    if (!streamsResponse.ok) {
      console.error('Error obteniendo streams:', await streamsResponse.text());
      // Si no podemos obtener los streams, retornamos null para usar el método básico
      return { vam: null, climbTime: null, climbMeters: null };
    }
    
    const streams = await streamsResponse.json();
    
    // Verificar que tenemos todos los datos necesarios
    if (!streams.altitude || !streams.distance || !streams.time) {
      console.log('Faltan streams necesarios para el cálculo preciso');
      return { vam: null, climbTime: null, climbMeters: null };
    }
    
    const altitudes = streams.altitude.data;
    const distances = streams.distance.data;
    const times = streams.time.data;
    
    // Variables para acumular datos de subidas
    let totalClimbTime = 0; // Tiempo total en subidas (segundos)
    let totalClimbMeters = 0; // Metros totales ascendidos
    let inClimbSegment = false;
    let segmentStartIndex = 0;
    let currentClimbMeters = 0;
    
    // Procesar los datos punto por punto para identificar subidas
    for (let i = 1; i < altitudes.length; i++) {
      const altitudeDiff = altitudes[i] - altitudes[i-1];
      const distanceDiff = distances[i] - distances[i-1];
      
      // Calcular pendiente en porcentaje (altitud/distancia horizontal * 100)
      const gradient = distanceDiff > 0 ? (altitudeDiff / distanceDiff) * 100 : 0;
      
      // Si es una subida significativa
      if (gradient >= MIN_GRADIENT_FOR_CLIMB && altitudeDiff > 0) {
        if (!inClimbSegment) {
          // Inicio de un nuevo segmento de subida
          inClimbSegment = true;
          segmentStartIndex = i-1;
          currentClimbMeters = 0;
        }
        // Acumular metros ascendidos
        currentClimbMeters += altitudeDiff;
      } else if (inClimbSegment) {
        // Fin de un segmento de subida
        if (currentClimbMeters >= MIN_ELEVATION_GAIN_FOR_SEGMENT) {
          // Solo considerar segmentos con desnivel mínimo
          const segmentTime = times[i-1] - times[segmentStartIndex];
          totalClimbTime += segmentTime;
          totalClimbMeters += currentClimbMeters;
          console.log(`Segmento de subida identificado: ${currentClimbMeters.toFixed(1)}m en ${segmentTime}s`);
        }
        inClimbSegment = false;
      }
    }
    
    // Comprobar si estamos en un segmento de subida al final de la actividad
    if (inClimbSegment && currentClimbMeters >= MIN_ELEVATION_GAIN_FOR_SEGMENT) {
      const segmentTime = times[times.length-1] - times[segmentStartIndex];
      totalClimbTime += segmentTime;
      totalClimbMeters += currentClimbMeters;
      console.log(`Segmento final de subida: ${currentClimbMeters.toFixed(1)}m en ${segmentTime}s`);
    }
    
    // Calcular VAM preciso (solo si hay datos válidos)
    let vam = null;
    if (totalClimbTime > 0 && totalClimbMeters > 0) {
      // Convertir tiempo de segundos a horas
      const climbTimeHours = totalClimbTime * SECONDS_TO_HOURS;
      vam = Math.round(totalClimbMeters / climbTimeHours);
      console.log(`VAM preciso calculado: ${vam} m/h (${totalClimbMeters.toFixed(1)}m en ${totalClimbTime}s)`);
    } else {
      console.log('No se identificaron segmentos de subida significativos');
    }
    
    return { 
      vam, 
      climbTime: totalClimbTime, 
      climbMeters: totalClimbMeters 
    };
  } catch (error) {
    console.error('Error calculando VAM preciso:', error);
    return { vam: null, climbTime: null, climbMeters: null };
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

      // Aquí deberías buscar en tu base de datos el token de acceso del usuario
      // Para simplificar, usamos una variable de entorno (no recomendado en producción)
      const accessToken = process.env.STRAVA_ACCESS_TOKEN;

      // Si no tienes token, no puedes continuar
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
        
        // Calcular ratio elevación/distancia (metros de desnivel por km)
        const elevationGain = activityDetails.total_elevation_gain;
        const distanceKm = activityDetails.distance * METERS_TO_KM;
        const movingTimeHours = activityDetails.moving_time * SECONDS_TO_HOURS;
        
        // Calcular VAM estándar como respaldo
        const standardVam = movingTimeHours > 0 ? elevationGain / movingTimeHours : 0;
        
        // Intentar calcular VAM preciso identificando subidas específicas
        const { vam: preciseVam, climbTime, climbMeters } = await calculatePreciseVAM(activityId, accessToken);
        
        // Usar VAM preciso si está disponible, sino usar el estándar
        const vam = preciseVam || standardVam;
        
        let commentParts = [];
        let shouldComment = false;
        
        // Calcular y añadir ratio si es relevante
        if (distanceKm > 0) {
          const ratio = elevationGain / distanceKm;
          if (ratio >= MIN_RATIO_FOR_COMMENT) {
            commentParts.push(`🏔️ THE RATIO: ${ratio.toFixed(1)} m/km de desnivel`);
            shouldComment = true;
          }
        }
        
        // Añadir VAM si es relevante
        if (vam >= MIN_VAM_FOR_COMMENT) {
          // Si es VAM preciso, añadir más detalles
          if (preciseVam && climbTime && climbMeters) {
            const climbTimeMinutes = Math.round(climbTime / 60);
            commentParts.push(`⬆️ VAM: ${Math.round(vam)} m/h (${Math.round(climbMeters)}m en ${climbTimeMinutes}min efectivos de subida)`);
          } else {
            commentParts.push(`⬆️ VAM: ${Math.round(vam)} m/h`);
          }
          shouldComment = true;
        }
        
        // Solo comentar si al menos uno de los valores supera el umbral
        if (shouldComment) {
          // Unir las partes del comentario
          const comment = commentParts.join('\n');
          
          // Actualizar la actividad con el comentario
          const updateResponse = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              description: activityDetails.description 
                ? `${activityDetails.description}\n\n${comment}` 
                : comment
            })
          });
          
          if (!updateResponse.ok) {
            console.error('Error actualizando actividad:', await updateResponse.text());
            return NextResponse.json({ error: 'Error al actualizar actividad' }, { status: 500 });
          }
          
          console.log(`Actividad ${activityId} actualizada con comentarios: ${comment}`);
          return NextResponse.json({ 
            success: true, 
            message: 'Actividad actualizada con métricas',
            vam: vam > 0 ? Math.round(vam) : null,
            precise_vam: preciseVam !== null,
            climb_time: climbTime,
            climb_meters: climbMeters,
            ratio: distanceKm > 0 ? (elevationGain / distanceKm).toFixed(1) : null
          });
        } else {
          console.log(`Actividad ${activityId} no alcanza los umbrales mínimos para comentar`);
          return NextResponse.json({ 
            success: true, 
            message: 'Métricas no alcanzan umbrales mínimos',
            vam: vam > 0 ? Math.round(vam) : null,
            precise_vam: preciseVam !== null,
            ratio: distanceKm > 0 ? (elevationGain / distanceKm).toFixed(1) : null
          });
        }
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