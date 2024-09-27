const express = require('express');
const { commentOnActivity } = require('./commentActivity');
const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
    const event = req.body;

    if (event.object_type === 'activity' && event.aspect_type === 'create') {
        const activityId = event.object_id;
        try {
            await commentOnActivity(activityId);  // Asegurarse de esperar a que termine
            res.status(200).send('Comentario añadido');
        } catch (error) {
            console.error('Error al comentar:', error);
            res.status(500).send('Error al añadir comentario');
        }
    } else {
        res.status(200).send('Evento recibido');
    }
});
