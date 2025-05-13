// Script para listar actividades recientes
require('dotenv').config();
const fetch = require('node-fetch');

// Obtener el token de acceso
const accessToken = process.argv[2] || process.env.STRAVA_ACCESS_TOKEN;

if (!accessToken) {
  console.error('Error: No se proporcionó un token de acceso');
  console.error('Uso: node list-activities.js <TOKEN_DE_ACCESO>');
  process.exit(1);
}

// Obtener actividades recientes
async function getActivities() {
  try {
    console.log('Obteniendo actividades recientes...');
    
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=15', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener actividades: ${response.status} ${response.statusText}`);
    }
    
    const activities = await response.json();
    
    if (activities.length === 0) {
      console.log('No se encontraron actividades recientes.');
      return;
    }
    
    console.log('\nLista de actividades recientes:');
    console.log('---------------------------------');
    
    activities.forEach((activity, index) => {
      const date = new Date(activity.start_date_local).toLocaleDateString('es-ES');
      const time = new Date(activity.start_date_local).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const distance = (activity.distance / 1000).toFixed(2);
      const elevation = Math.round(activity.total_elevation_gain);
      
      console.log(`[${index + 1}] ${activity.id} - ${date} ${time}`);
      console.log(`    "${activity.name}" - ${activity.sport_type}`);
      console.log(`    ${distance} km, ${elevation}m+`);
      console.log('');
    });
    
    console.log('\nPara procesar una actividad con el webhook, ejecuta:');
    console.log('node test-webhook.js <ID_ACTIVIDAD> <TOKEN_DE_ACCESO>');
    console.log('\nEjemplo:');
    if (activities.length > 0) {
      console.log(`node test-webhook.js ${activities[0].id} "${accessToken}"`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getActivities(); 