// Script para simular un evento de webhook de Strava
require('dotenv').config();
const fetch = require('node-fetch');

// Reemplaza con el ID de tu última actividad de TrailRun
const ACTIVITY_ID = process.argv[2]; 
const STRAVA_TOKEN = process.argv[3]; // Token de acceso
const USER_ID = process.argv[4] || '7349882'; // Tu ID de usuario en Strava

if (!ACTIVITY_ID) {
  console.error('Por favor proporciona un ID de actividad como primer argumento');
  console.error('Uso: node test-webhook.js <ID_ACTIVIDAD> <TOKEN_DE_ACCESO> [ID_USUARIO]');
  process.exit(1);
}

if (!STRAVA_TOKEN) {
  console.error('Por favor proporciona un token de acceso como segundo argumento');
  console.error('Uso: node test-webhook.js <ID_ACTIVIDAD> <TOKEN_DE_ACCESO> [ID_USUARIO]');
  process.exit(1);
}

// Guardar temporalmente el token como variable de entorno
process.env.STRAVA_ACCESS_TOKEN = STRAVA_TOKEN;

async function main() {
  try {
    console.log(`Procesando actividad ID: ${ACTIVITY_ID}`);
    
    // Obtener detalles de la actividad para verificar tipo y elevación
    const activityResponse = await fetch(`https://www.strava.com/api/v3/activities/${ACTIVITY_ID}`, {
      headers: { 'Authorization': `Bearer ${STRAVA_TOKEN}` }
    });
    
    if (!activityResponse.ok) {
      console.error(`Error obteniendo detalles de la actividad: ${activityResponse.status}`);
      process.exit(1);
    }
    
    const activityDetails = await activityResponse.json();
    console.log(`Actividad: "${activityDetails.name}" (${activityDetails.sport_type})`);
    console.log(`Distancia: ${(activityDetails.distance/1000).toFixed(2)} km`);
    console.log(`Elevación: ${Math.round(activityDetails.total_elevation_gain)} m`);
    console.log(`Duración: ${Math.floor(activityDetails.moving_time/60)} min ${activityDetails.moving_time%60} s`);
    console.log(`Fecha: ${new Date(activityDetails.start_date_local).toLocaleString('es-ES')}`);
    console.log('');
    
    if (activityDetails.sport_type !== 'TrailRun' && activityDetails.sport_type !== 'Run') {
      console.warn(`⚠️ Advertencia: Esta actividad no es de tipo TrailRun o Run (es ${activityDetails.sport_type})`);
      console.warn('El comentario solo se añadirá si es TrailRun o Run con elevación positiva');
    }
    
    if (activityDetails.total_elevation_gain <= 0) {
      console.warn('⚠️ Advertencia: Esta actividad no tiene elevación positiva registrada');
      console.warn('El comentario solo se añadirá si hay elevación positiva');
    }
    
    console.log('Simulando evento de webhook...');
    
    // Simulando un evento de webhook de Strava
    const webhookEvent = {
      aspect_type: 'create',
      object_type: 'activity',
      object_id: ACTIVITY_ID,
      owner_id: USER_ID
    };
    
    // Llamar al endpoint webhook
    console.log('Llamando al endpoint webhook...');
    const response = await fetch('http://localhost:3000/api/strava/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookEvent)
    });
    
    const result = await response.json();
    
    console.log('\nRespuesta del webhook:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('\n❌ Error procesando la actividad.');
      console.error(result.error);
    } else if (result.success) {
      console.log('\n✅ La actividad fue procesada exitosamente.');
      
      if (result.vam) {
        console.log(`VAM calculado: ${result.vam} m/h`);
        if (result.precise_vam) {
          console.log(`VAM preciso: Sí (${result.climb_meters}m en ${Math.round(result.climb_time/60)}min efectivos de subida)`);
        } else {
          console.log('VAM preciso: No (usando cálculo estándar)');
        }
      }
      
      if (result.ratio) {
        console.log(`Ratio calculado: ${result.ratio} m/km`);
      }
      
      console.log('\nRevisa tu actividad en Strava para ver el comentario actualizado.');
    }
  } catch (error) {
    console.error('Error ejecutando la prueba:', error);
  }
}

main(); 