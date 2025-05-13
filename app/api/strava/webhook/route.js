import { NextResponse } from 'next/server';

// Exportar como dinámica explícitamente
export const dynamic = 'force-dynamic';

// Constantes
const METERS_TO_KM = 0.001;
const MIN_RATIO_FOR_COMMENT = 10; // Umbral mínimo para comentar
const MIN_VAM_FOR_COMMENT = 500; // Umbral mínimo para comentar VAM (metros/hora)
const SECONDS_TO_HOURS = 1 / 3600; // Conversión de segundos a horas

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
        
        // Calcular el VAM (Velocidad de Ascenso Media) en metros/hora
        const vam = movingTimeHours > 0 ? elevationGain / movingTimeHours : 0;
        
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
          commentParts.push(`⬆️ VAM: ${Math.round(vam)} m/h`);
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
            ratio: distanceKm > 0 ? (elevationGain / distanceKm).toFixed(1) : null
          });
        } else {
          console.log(`Actividad ${activityId} no alcanza los umbrales mínimos para comentar`);
          return NextResponse.json({ 
            success: true, 
            message: 'Métricas no alcanzan umbrales mínimos',
            vam: vam > 0 ? Math.round(vam) : null,
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