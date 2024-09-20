// stravaUtils.js
import { startOfWeek, endOfWeek } from 'date-fns';

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
