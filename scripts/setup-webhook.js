// Script para configurar el webhook de Strava
require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');

// Constantes
const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN || '4882a27f3ff0f0beb3dcfb6f039d5c56cc7b8e65';
const BASE_URL = process.env.BASE_URL || 'https://theratio.vercel.app';
const CALLBACK_URL = `${BASE_URL}/api/strava/webhook`;

async function setupWebhook() {
  try {
    console.log('Configurando webhook de Strava...');
    console.log(`URL de callback: ${CALLBACK_URL}`);
    console.log(`Token de verificación: ${VERIFY_TOKEN}`);
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('Faltan credenciales de Strava (CLIENT_ID o CLIENT_SECRET)');
    }
    
    // Verificar suscripciones existentes
    const viewResponse = await fetch(
      `https://www.strava.com/api/v3/push_subscriptions?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`
    );
    
    if (!viewResponse.ok) {
      throw new Error(`Error al verificar suscripciones: ${viewResponse.status} ${viewResponse.statusText}`);
    }
    
    const existingSubscriptions = await viewResponse.json();
    console.log('Suscripciones existentes:', JSON.stringify(existingSubscriptions, null, 2));
    
    // Si ya hay suscripciones, eliminarlas
    if (existingSubscriptions && existingSubscriptions.length > 0) {
      for (const subscription of existingSubscriptions) {
        console.log(`Eliminando suscripción existente ID: ${subscription.id}...`);
        const deleteResponse = await fetch(
          `https://www.strava.com/api/v3/push_subscriptions/${subscription.id}?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`,
          { method: 'DELETE' }
        );
        
        if (deleteResponse.ok) {
          console.log(`Suscripción ${subscription.id} eliminada con éxito`);
        } else {
          console.error(`Error eliminando suscripción ${subscription.id}:`, await deleteResponse.text());
        }
      }
    }
    
    // Crear nueva suscripción
    console.log('Creando nueva suscripción...');
    const createResponse = await fetch('https://www.strava.com/api/v3/push_subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        callback_url: CALLBACK_URL,
        verify_token: VERIFY_TOKEN
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Error al crear suscripción: ${createResponse.status} ${await createResponse.text()}`);
    }
    
    const newSubscription = await createResponse.json();
    console.log('Nueva suscripción creada con éxito:', newSubscription);
    console.log(`ID de suscripción: ${newSubscription.id}`);
    
    // Guardar ID de suscripción para referencia futura
    fs.writeFileSync('webhook-subscription.json', JSON.stringify(newSubscription, null, 2));
    console.log('ID de suscripción guardado en webhook-subscription.json');
    
    console.log('\n✅ Webhook configurado correctamente!');
    console.log('Ahora recibirás notificaciones de nuevas actividades de Strava.');
    
  } catch (error) {
    console.error('Error configurando webhook:', error);
    process.exit(1);
  }
}

// Ejecutar la función principal
setupWebhook(); 