import { getStravaTokens, saveStravaTokens } from './postgres.js';

// Función para verificar y refrescar tokens de Strava si es necesario
export async function getValidAccessToken(athleteId) {
  try {
    // Obtener tokens actuales desde la base de datos
    const tokens = await getStravaTokens(athleteId);
    
    if (!tokens) {
      console.error(`No se encontraron tokens para el atleta ${athleteId}`);
      return null;
    }
    
    const now = Math.floor(Date.now() / 1000);
    
    // Verificar si el token ha expirado
    if (tokens.expires_at <= now) {
      console.log(`Token expirado para atleta ${athleteId}, renovando...`);
      
      // Renovar el token
      const refreshResult = await refreshStravaToken(tokens.refresh_token);
      
      if (!refreshResult) {
        console.error(`Error renovando token para atleta ${athleteId}`);
        return null;
      }
      
      // Guardar el nuevo token
      await saveStravaTokens(
        athleteId,
        refreshResult.access_token,
        refreshResult.refresh_token,
        refreshResult.expires_at
      );
      
      return refreshResult.access_token;
    }
    
    // Token aún válido
    return tokens.access_token;
  } catch (error) {
    console.error('Error obteniendo token válido:', error);
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

// Función para calcular VAM preciso
export async function calculatePreciseVAM(activityId, accessToken) {
  try {
    // Constantes para cálculo VAM
    const SECONDS_TO_HOURS = 1 / 3600;
    const MIN_ELEVATION_GAIN_FOR_SEGMENT = 5; // En metros
    const MIN_GRADIENT_FOR_CLIMB = 1; // Pendiente mínima en %
    const SMOOTHING_WINDOW = 5; // Puntos para suavizado
    
    // Obtener datos de stream para la actividad
    const streamsResponse = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=altitude,distance,time&key_by_type=true`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    
    if (!streamsResponse.ok) {
      console.error('Error obteniendo streams:', await streamsResponse.text());
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
    
    // Crear arrays de altitud suavizada
    const smoothedAltitudes = [];
    for (let i = 0; i < altitudes.length; i++) {
      smoothedAltitudes[i] = smoothAltitude(i);
    }
    
    // Procesar los datos punto por punto para identificar subidas
    for (let i = 1; i < smoothedAltitudes.length; i++) {
      const altitudeDiff = smoothedAltitudes[i] - smoothedAltitudes[i-1];
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
          totalClimbTime += segmentTime;
          totalClimbMeters += currentClimbMeters;
        }
        inClimbSegment = false;
      }
    }
    
    // Comprobar si estamos en un segmento de subida al final de la actividad
    if (inClimbSegment && currentClimbMeters >= MIN_ELEVATION_GAIN_FOR_SEGMENT) {
      const segmentTime = times[times.length-1] - times[segmentStartIndex];
      totalClimbTime += segmentTime;
      totalClimbMeters += currentClimbMeters;
    }
    
    // Calcular VAM preciso (solo si hay datos válidos)
    let vam = null;
    if (totalClimbTime > 0 && totalClimbMeters > 0) {
      // Convertir tiempo de segundos a horas
      const climbTimeHours = totalClimbTime * SECONDS_TO_HOURS;
      vam = Math.round(totalClimbMeters / climbTimeHours);
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

// Función para formatear tiempo de segundos a formato hh:mm
export function formatClimbTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h${minutes.toString().padStart(2, '0')}`;
} 