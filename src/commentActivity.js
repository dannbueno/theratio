const fetch = require('node-fetch');
require('dotenv').config();

export async function commentOnActivity(activityId) {
    const token = `Bearer ${localStorage.getItem('token_strava')}`;

    await fetch(`https://www.strava.com/api/v3/activities/${activityId}/comments`, {
        method: 'POST',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: 'Comentario automático:',
        }),
    });
}
