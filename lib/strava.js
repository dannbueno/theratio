import { getStravaTokens, saveStravaTokens, refreshToken } from './postgres.js';

// Constantes
const METERS_TO_KM = 0.001;
const MIN_RATIO_FOR_COMMENT = 10; // Umbral mínimo para comentar
const MIN_VAM_FOR_COMMENT = 250; // Umbral mínimo para comentar VAM (metros/hora)
const SECONDS_TO_HOURS = 1 / 3600; // Conversión de segundos a horas
const MIN_ELEVATION_GAIN_FOR_SEGMENT = 5; // Mínimo desnivel para considerar un segmento de subida (en metros)
const MIN_GRADIENT_FOR_CLIMB = 1; // Pendiente mínima en % para considerar una subida
const SMOOTHING_WINDOW = 5; // Ventana para suavizado de datos de altitud

// Función para verificar y refrescar tokens de Strava si es necesario
export async function getValidAccessToken(athleteId) {
  try {
    // Obtener tokens actuales desde la base de datos
    const tokens = await refreshToken(athleteId);
    
    if (!tokens) {
      console.error(`No se encontraron tokens para el atleta ${athleteId}`);
      return null;
    }
    
    return tokens.access_token;
  } catch (error) {
    console.error(`Error obteniendo token válido para atleta ${athleteId}:`, error);
    return null;
  }
}

// Función para refrescar un token de Strava
async function refreshStravaToken(refreshToken) {
  try {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Faltan credenciales de Strava (CLIENT_ID o CLIENT_SECRET)');
    }
    
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error al refrescar token: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error al refrescar token:', error);
    return null;
  }
}

// Función para calcular VAM preciso utilizando los streams de la actividad
export async function calculatePreciseVAM(activityId, accessToken) {
  try {
    console.log(`[VAM] Iniciando cálculo de VAM preciso para actividad ${activityId}`);
    
    // Intentar obtener los streams para calcular VAM preciso
    const streamsResponse = await fetch(`https://www.strava.com/api/v3/activities/${activityId}/streams?keys=altitude,distance,time&key_by_type=true`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!streamsResponse.ok) {
      console.log(`[VAM] Error obteniendo streams para actividad ${activityId}: ${streamsResponse.status} ${streamsResponse.statusText}`);
      return null;
    }
    
    const streams = await streamsResponse.json();
    
    // Verificar que tenemos todos los datos necesarios
    if (!streams.altitude || !streams.distance || !streams.time) {
      console.log(`[VAM] Faltan streams necesarios para el cálculo preciso de VAM. Disponibles: ${Object.keys(streams).join(', ')}`);
      return null;
    }
    
    const altitudes = streams.altitude.data;
    const distances = streams.distance.data;
    const times = streams.time.data;
    
    console.log(`[VAM] Datos de streams obtenidos - Puntos: ${altitudes.length}, Distancia total: ${distances[distances.length-1]}m, Tiempo: ${times[times.length-1]}s`);
    
    // Variables para acumular datos de subidas
    let totalClimbTime = 0;
    let totalClimbMeters = 0;
    let inClimbSegment = false;
    let segmentStartIndex = 0;
    let currentClimbMeters = 0;
    let climbSegments = [];
    
    // Función para suavizar los datos de altitud
    function smoothAltitude(index) {
      let sum = 0;
      let count = 0;
      
      for (let i = Math.max(0, index - Math.floor(SMOOTHING_WINDOW/2)); 
           i <= Math.min(altitudes.length - 1, index + Math.floor(SMOOTHING_WINDOW/2)); 
           i++) {
        sum += altitudes[i];
        count++;
      }
      
      return sum / count;
    }
    
    // Crear array de altitud suavizada
    const smoothedAltitudes = [];
    for (let i = 0; i < altitudes.length; i++) {
      smoothedAltitudes[i] = smoothAltitude(i);
    }
    
    console.log(`[VAM] Altitudes suavizadas con ventana de ${SMOOTHING_WINDOW} puntos`);
    console.log(`[VAM] Detectando segmentos de subida con pendiente mínima de ${MIN_GRADIENT_FOR_CLIMB}% y ganancia mínima de ${MIN_ELEVATION_GAIN_FOR_SEGMENT}m`);
    
    // Identificar segmentos de subida
    for (let i = 1; i < smoothedAltitudes.length; i++) {
      const altitudeDiff = smoothedAltitudes[i] - smoothedAltitudes[i-1];
      const distanceDiff = distances[i] - distances[i-1];
      
      // Calcular pendiente en porcentaje
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
        // Permitimos pequeñas interrupciones en la subida (hasta 3 puntos consecutivos)
        // sin terminar el segmento, para manejar pequeños llanos o descensos
        let resumesClimbing = false;
        for (let j = 1; j <= 3 && i + j < smoothedAltitudes.length; j++) {
          const futureAltDiff = smoothedAltitudes[i + j] - smoothedAltitudes[i + j - 1];
          const futureDistDiff = distances[i + j] - distances[i + j - 1];
          const futureGradient = futureDistDiff > 0 ? (futureAltDiff / futureDistDiff) * 100 : 0;
          
          if (futureGradient >= MIN_GRADIENT_FOR_CLIMB && futureAltDiff > 0) {
            resumesClimbing = true;
            break;
          }
        }
        
        if (resumesClimbing) {
          // La subida continúa, no hacemos nada y seguimos en el mismo segmento
          continue;
        }
        
        // Fin de un segmento de subida
        if (currentClimbMeters >= MIN_ELEVATION_GAIN_FOR_SEGMENT) {
          // Solo considerar segmentos con desnivel mínimo
          const segmentTime = times[i-1] - times[segmentStartIndex];
          const segmentDistance = distances[i-1] - distances[segmentStartIndex];
          const avgGradient = segmentDistance > 0 ? (currentClimbMeters / segmentDistance) * 100 : 0;
          
          totalClimbTime += segmentTime;
          totalClimbMeters += currentClimbMeters;
          
          // Guardar info del segmento para debugging
          climbSegments.push({
            startIndex: segmentStartIndex,
            endIndex: i-1,
            elevation: currentClimbMeters,
            time: segmentTime,
            distance: segmentDistance,
            gradient: avgGradient
          });
        }
        inClimbSegment = false;
      }
    }
    
    // Comprobar si estamos en un segmento de subida al final de la actividad
    if (inClimbSegment && currentClimbMeters >= MIN_ELEVATION_GAIN_FOR_SEGMENT) {
      const segmentTime = times[times.length-1] - times[segmentStartIndex];
      const segmentDistance = distances[distances.length-1] - distances[segmentStartIndex];
      const avgGradient = segmentDistance > 0 ? (currentClimbMeters / segmentDistance) * 100 : 0;
      
      totalClimbTime += segmentTime;
      totalClimbMeters += currentClimbMeters;
      
      // Guardar info del segmento para debugging
      climbSegments.push({
        startIndex: segmentStartIndex,
        endIndex: smoothedAltitudes.length-1,
        elevation: currentClimbMeters,
        time: segmentTime,
        distance: segmentDistance,
        gradient: avgGradient
      });
    }
    
    // Verificar si tenemos datos válidos
    if (totalClimbTime > 0 && totalClimbMeters > 0) {
      // Convertir tiempo de subida de segundos a horas
      const climbTimeHours = totalClimbTime / 3600;
      const vam = Math.round(totalClimbMeters / climbTimeHours);
      
      console.log(`[VAM] Cálculo exitoso - Segmentos de subida: ${climbSegments.length}`);
      console.log(`[VAM] Metros totales de subida: ${Math.round(totalClimbMeters)}m`);
      console.log(`[VAM] Tiempo total de subida: ${formatClimbTime(totalClimbTime)} (${totalClimbTime}s)`);
      console.log(`[VAM] VAM calculado: ${vam} m/h`);
      
      return {
        vam,
        climbTime: totalClimbTime,
        climbMeters: totalClimbMeters,
        segmentCount: climbSegments.length
      };
    }
    
    console.log(`[VAM] No se encontraron segmentos de subida válidos`);
    return null;
  } catch (error) {
    console.error('Error calculando VAM preciso:', error);
    return null;
  }
}

// Función para formatear el tiempo de subida
export function formatClimbTime(seconds) {
  if (!seconds) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}min`;
  }
}

// Función para verificar y actualizar comentarios existentes
export async function updateActivityWithTheRatio(accessToken, activityId, activityDetails, vamData) {
  try {
    // Extraer datos necesarios
    const elevationGain = activityDetails.total_elevation_gain;
    const distanceKm = activityDetails.distance * METERS_TO_KM;
    const ratio = distanceKm > 0 ? elevationGain / distanceKm : 0;
    
    // Preparar las partes del comentario
    const commentParts = [];
    let shouldComment = false;
    
    // Añadir THE RATIO si es relevante
    if (ratio >= MIN_RATIO_FOR_COMMENT) {
      commentParts.push(`🏔️ TheRatio: ${ratio.toFixed(1)} m/km`);
      shouldComment = true;
    }
    
    // Añadir VAM solo si tenemos datos precisos y es relevante
    if (vamData?.vam && vamData.vam >= MIN_VAM_FOR_COMMENT) {
      commentParts.push(`⬆️ TheVAM: ${vamData.vam} m/h (${Math.round(vamData.climbMeters)}m / ${formatClimbTime(vamData.climbTime)})`);
      shouldComment = true;
    }
    
    // Solo continuar si al menos uno de los valores supera el umbral
    if (!shouldComment) {
      console.log(`Actividad ${activityId} no alcanza los umbrales mínimos para comentar`);
      return {
        updated: false,
        reason: 'Métricas no alcanzan umbrales mínimos',
        vam: vamData?.vam || null,
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
      vam: vamData?.vam || null,
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