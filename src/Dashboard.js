import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import './Modal.css';
import { metersToKm, secondsToTime, metersPerSecondToKmPerHour, metersPerSecondToPace, calculateElevationRatio, formatDate } from './utils.js';
import { getTotalTimeThisWeek, getRunningStatisticsThisWeek, getTotalTimeThisMonth, getRunningStatisticsThisMonth, getRunningStatisticsPreviousWeek, comparingWeeks } from './stravaUtils.js';
import ActivityDetails from './ActivityDetail/ActivityDetails.js';
import { refreshAccessToken, isTokenExpired } from './Home.js';

export default function Dashboard() {
    const [activities, setActivities] = useState([]);
    const [athlete, setAthlete] = useState({});
    const [selectedActivityId, setSelectedActivityId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();
    const [dataFetched, setDataFetched] = useState(false); // Nuevo estado para evitar llamadas repetidas

    // Función para hacer logout
    const handleLogout = () => { //FIXME no está haciando logout a la primera
        localStorage.removeItem('token_strava');
        localStorage.removeItem('expires_at');
        navigate('/');
    };

    const handleActivityClick = (activityId) => {
        setSelectedActivityId(activityId);
        setIsModalOpen(true); // Abre el modal
    };

    const closeModal = () => {
        setIsModalOpen(false); // Cierra el modal
        setSelectedActivityId(null); // Limpia el ID de la actividad seleccionada
    };

    useEffect(() => {
        if (dataFetched) return; // Evitar llamadas repetidas si ya se han obtenido los datos

        async function fetchData() {
            let token = localStorage.getItem('token_strava');

            // Verificar si el token ha expirado
            if (!token || isTokenExpired()) {
                console.log("Token expirado o inexistente, renovando...");
                await refreshAccessToken();
                token = localStorage.getItem('token_strava');
            }

            if (!token) {
                console.error('No token found even after refresh');
                return;
            }

            try {
                const athleteRes = await fetch('https://www.strava.com/api/v3/athlete', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (!athleteRes.ok) {
                    throw new Error('Error fetching athlete data');
                }

                const athleteData = await athleteRes.json();
                setAthlete(athleteData);

                const activitiesRes = await fetch('https://www.strava.com/api/v3/athlete/activities', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (!activitiesRes.ok) {
                    throw new Error('Error fetching activities data');
                }

                const activitiesData = await activitiesRes.json();
                setActivities(activitiesData);

                setDataFetched(true); // Marcar como completado

            } catch (error) {
                console.error('Error fetching athlete or activities:', error);
            }
        }

        fetchData();
    }, [dataFetched]);


    const totalTimeThisWeek = getTotalTimeThisWeek(activities);
    const formattedTotalTimeThisWeek = secondsToTime(totalTimeThisWeek);
    const runningStats = getRunningStatisticsThisWeek(activities);
    const formattedTotalDistanceRunningThisWeek = metersToKm(runningStats.totalDistance);
    const formattedTotalTimeRunningThisWeek = secondsToTime(runningStats.totalTime);
    const runningStatsPreviousWeek = getRunningStatisticsPreviousWeek(activities);
    const diffBetweenWeeks = comparingWeeks(runningStats, runningStatsPreviousWeek);
    const totalTimeThisMonth = getTotalTimeThisMonth(activities);
    const formattedTotalTimeThisMonth = secondsToTime(totalTimeThisMonth);
    const runningStatsMonth = getRunningStatisticsThisMonth(activities);
    const formattedTotalDistanceRunningThisMonth = metersToKm(runningStatsMonth.totalDistance);
    const formattedTotalTimeRunningThisMonth = secondsToTime(runningStatsMonth.totalTime);

    return (
        <div>
            <div className="header">
                <div className="header-left">
                    <a href={`https://www.strava.com/athletes/${athlete.id}`} target="_blank" rel="noopener noreferrer">
                        <img
                            src={athlete.profile_medium}
                            alt={`${athlete.firstname || ''} ${athlete.lastname || ''}`}
                        />
                    </a>

                </div>
                <div className="header-center">
                    <img src={'/theratio_logo.png'} alt={`theRatio`} />
                    <div className="header-title">·theratio·</div>
                </div>
                <div className="header-right">
                    <button onClick={handleLogout} className="logout-button">Logout</button>
                </div>
            </div>

            <h2>{athlete.firstname} {athlete.lastname} Last Strava Activities</h2>
            <div className='week-activities'>
                <h4>Total time this week: {formattedTotalTimeThisWeek}</h4>
                <h4>Total running this week: {formattedTotalDistanceRunningThisWeek} km | {runningStats.totalElevation.toLocaleString('es-ES')} m+ | {formattedTotalTimeRunningThisWeek}</h4>
                <h4>Comparing with previous week: {diffBetweenWeeks.distance} km | {diffBetweenWeeks.elevation.toLocaleString('es-ES')} m+ | {diffBetweenWeeks.time}</h4>
                <h4>Total running this month: {formattedTotalDistanceRunningThisMonth} km | {runningStatsMonth.totalElevation} m+ | {formattedTotalTimeRunningThisMonth}</h4>

            </div>

            <ul className="activities-list">
                {activities.length > 0 ? (
                    activities.map(activity => {
                        const activityClass = activity.type.charAt(0).toLowerCase() + activity.type.slice(1);
                        return (
                            <li
                                key={activity.id}
                                id={activity.id}
                                className={`activity-item ${activityClass}`}
                                onClick={() => handleActivityClick(activity.id)} // Almacena el ID de la actividad seleccionada
                            >
                                <span className="activity-date">{formatDate(activity.start_date)} | {activity.sport_type}</span>
                                <div className="activity-name">
                                    <a
                                        href={`https://www.strava.com/activities/${activity.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="no-link-style"
                                    >
                                        {activity.name}
                                    </a>
                                </div>
                                <div className="activity-details">
                                    {activity.type === 'WeightTraining' ? (
                                        <span className="metric">{secondsToTime(activity.moving_time)}</span>
                                    ) : activity.type === 'Walk' ? (
                                        <span className="metric">
                                            {metersToKm(activity.distance)} km | {activity.total_elevation_gain.toLocaleString('es-ES')} m+ | {secondsToTime(activity.moving_time)} | {activity.average_heartrate} ppm
                                        </span>
                                    ) : activity.type === 'Ride' ? (
                                        <span className="metric">
                                            {metersToKm(activity.distance)} km | {metersPerSecondToKmPerHour(activity.average_speed)} km/h | {activity.total_elevation_gain.toLocaleString('es-ES')} m+ | {secondsToTime(activity.moving_time)} | {activity.average_heartrate} ppm | {activity.average_watts} W
                                        </span>
                                    ) : activity.sport_type === 'TrailRun' ? (
                                        <span className="metric">
                                            {metersToKm(activity.distance)} km | {activity.total_elevation_gain.toLocaleString('es-ES')} m+ | {metersPerSecondToPace(activity.average_speed)} /km | {secondsToTime(activity.moving_time)} | {activity.average_heartrate} ppm | {calculateElevationRatio(activity.total_elevation_gain, activity.distance)} +/km
                                        </span>
                                    ) : (
                                        <span className="metric">
                                            {metersToKm(activity.distance)} km | {metersPerSecondToPace(activity.average_speed)} /km | {secondsToTime(activity.moving_time)} | {activity.average_heartrate} ppm | {activity.average_watts} W
                                        </span>
                                    )}
                                </div>
                            </li>
                        );
                    })
                ) : (
                    <li>No activities found</li>
                )}
            </ul>

            {isModalOpen && (
                <Modal closeModal={closeModal}>
                    <ActivityDetails activityId={selectedActivityId} />
                </Modal>
            )}

        </div>
    );
}

function Modal({ closeModal, children }) {
    // Función para manejar el clic en el overlay
    const handleOverlayClick = (event) => {
        // Si el clic es en el overlay y no en el contenido, cerrar el modal
        if (event.target.className === 'modal-overlay') {
            closeModal();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-content">
                <button onClick={closeModal} className="modal-close">Close</button>
                {children}
            </div>
        </div>
    );
}
