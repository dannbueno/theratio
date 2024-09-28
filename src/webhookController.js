import express from 'express';
import { handleAddRatioToStrava } from './stravaUtils.js';
const app = express();
app.use(express.json());

// Verificar la suscripción de Strava usando un token de entorno
const verifyToken = process.env.STRAVA_VERIFY_TOKEN || '4882a27f3ff0f0beb3dcfb6f039d5c56cc7b8e65'; // Establece tu token de verificación aquí

// Verificar la suscripción de Strava
app.get('/webhook', (req, res) => {
    console.log('req.query')
    console.log(req.query)
    if (req.query['hub.verify_token'] === verifyToken) {
        res.status(200).json({ 'hub.challenge': req.query['hub.challenge'] });
    } else {
        res.status(400).send('Verification failed');
    }
});

// Manejar las notificaciones de Strava
app.post('/webhook', async (req, res) => {
    const event = req.body;

    // Revisa si el evento es una nueva actividad creada
    if (event.object_type === 'activity' && event.aspect_type === 'create') {
        // Extrae detalles de la actividad del evento recibido
        const activityDetails = {
            id: event.object_id,
            type: event.object_type,
            total_elevation_gain: event.updates ? event.updates.total_elevation_gain : 0,
            distance: event.updates ? event.updates.distance : 0,
            description: '', // Se inicializa vacío porque no tenemos la descripción completa del evento
        };

        try {
            // Verifica si la actividad es de tipo TrailRun
            if (event.updates && event.updates.type === 'TrailRun') {
                await handleAddRatioToStrava(activityDetails); // Llama a la función que actualiza la descripción
                res.status(200).send('Ratio añadido a la descripción.');
            } else {
                res.status(200).send('No es una actividad de tipo TrailRun.');
            }
        } catch (error) {
            console.error('Error al actualizar la descripción:', error);
            res.status(500).send('Error al actualizar la descripción.');
        }
    } else {
        res.status(200).send('Evento no manejado.');
    }
});

// Inicializa el servidor en el puerto deseado (por ejemplo, 3000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor de webhook escuchando en el puerto ${PORT}`));
