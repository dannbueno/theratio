import { startOfWeek, endOfWeek } from 'date-fns';
import { calculateElevationRatio } from './utils.js';

export function getActivitiesThisWeek(activities) {
    const now = new Date();
    const startOfWeekDate = startOfWeek(now, { weekStartsOn: 1 }); // Lunes
    const endOfWeekDate = endOfWeek(now, { weekStartsOn: 1 }); // Domingo

    return activities.filter(activity => {
        const activityDate = new Date(activity.start_date); // La fecha de inicio de la actividad
        return activityDate >= startOfWeekDate && activityDate <= endOfWeekDate;
    });
}

export function getTotalTimeThisWeek(activities) {
    const activitiesThisWeek = getActivitiesThisWeek(activities);

    return activitiesThisWeek.reduce((totalTime, activity) => {
        return totalTime + activity.moving_time;
    }, 0);
}

export function getRunningStatisticsThisWeek(activities) {
    const activitiesThisWeek = getActivitiesThisWeek(activities);
    const runningActivities = activitiesThisWeek.filter(activity => activity.type === 'Run');

    const totalDistance = runningActivities.reduce((total, activity) => total + activity.distance, 0);
    const totalElevation = runningActivities.reduce((total, activity) => total + activity.total_elevation_gain, 0);
    const totalTime = runningActivities.reduce((total, activity) => total + activity.moving_time, 0);

    return {
        totalDistance,
        totalElevation,
        totalTime,
    };
}

export async function handleAddRatioToStrava(activityDetails) {
    const token = localStorage.getItem('token_strava');
    const elevationRatio = calculateElevationRatio(activityDetails.total_elevation_gain, activityDetails.distance);
    const ratioText = `${elevationRatio} m+/km by: theratio.vercel.app`;

    if (!token || !activityDetails.id) return;

    try {
        // Obtener la actividad más reciente desde Strava
        const updatedActivityResponse = await fetch(`https://www.strava.com/api/v3/activities/${activityDetails.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!updatedActivityResponse.ok) {
            throw new Error('Failed to fetch the latest activity details.');
        }

        const updatedActivity = await updatedActivityResponse.json();

        // Verificar si ya existe el ratio en la descripción actualizada
        if (updatedActivity.description && updatedActivity.description.includes(ratioText)) {
            console.log(updatedActivity.description)
            alert('Elevation ratio already exists in the description.');
            return;
        }

        // Si no existe, añadir el ratio al principio de la descripción
        const response = await fetch(`https://www.strava.com/api/v3/activities/${activityDetails.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: `${ratioText}\n\n${updatedActivity.description || ''}`, // Añadir al principio
            }),
        });

        if (response.ok) {
            alert('Elevation ratio added successfully!');
        } else {
            const errorData = await response.json();
            throw new Error(`Failed to update: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Error updating description:', error);
        alert('Failed to add elevation ratio to Strava');
    }
}