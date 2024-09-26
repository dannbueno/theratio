import './Dashboard.css';
import './Modal.css'
import { metersToKm, secondsToTime, metersPerSecondToKmPerHour, metersPerSecondToPace, calculateElevationRatio, formatDate } from './Utils/utils';
import { getTotalTimeThisWeek, getRunningStatisticsThisWeek } from './Utils/stravaUtils';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ActivityDetails from './ActivityDetail/ActivityDetails';

export function Dashboard() {
    const [activities, setActivities] = useState([]);
    const [athlete, setAthlete] = useState({});
    const [selectedActivityId, setSelectedActivityId] = useState(null);
    const token = localStorage.getItem('token_strava');
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false); // Estado para controlar el modal

    // Función para hacer logout
    const handleLogout = () => {
        localStorage.removeItem('token_strava');
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
        // Fetch para obtener los datos del atleta y actividades
        if (!token) {
            navigate('/');
            return;
        }

        Promise.all([
            fetch('https://www.strava.com/api/v3/athlete', {
                headers: { 'Authorization': `Bearer ${token}` },
            }),
            fetch('https://www.strava.com/api/v3/athlete/activities', {
                headers: { 'Authorization': `Bearer ${token}` },
            }),
        ])
            .then(async ([athleteRes, activitiesRes]) => {
                if (!athleteRes.ok || !activitiesRes.ok) {
                    throw new Error('Error fetching data from Strava API');
                }
                const athleteData = await athleteRes.json();
                const activitiesData = await activitiesRes.json();
                setAthlete(athleteData);
                setActivities(activitiesData);
            })
            .catch(error => console.error('Error fetching athlete or activities:', error));
    }, [token, navigate]);

    const totalTimeThisWeek = getTotalTimeThisWeek(activities);
    const formattedTotalTimeThisWeek = secondsToTime(totalTimeThisWeek);
    const runningStats = getRunningStatisticsThisWeek(activities);
    const formattedTotalDistanceRunningThisWeek = metersToKm(runningStats.totalDistance);
    const formattedTotalTimeRunningThisWeek = secondsToTime(runningStats.totalTime);

    return (
        <div>
            <div className="header">
                <div className="header-left">
                    <img
                        src={athlete.profile_medium}
                        alt={`${athlete.firstname || ''} ${athlete.lastname || ''}`}
                    />
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
                <h4>Total Time This Week: {formattedTotalTimeThisWeek}</h4>
                <h4>Totals Running This Week: {formattedTotalDistanceRunningThisWeek} km | {runningStats.totalElevation} m+ | {formattedTotalTimeRunningThisWeek}</h4>
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
                                            {metersToKm(activity.distance)} km | {activity.total_elevation_gain} m+ | {secondsToTime(activity.moving_time)} | {activity.average_heartrate} ppm
                                        </span>
                                    ) : activity.type === 'Ride' ? (
                                        <span className="metric">
                                            {metersToKm(activity.distance)} km | {metersPerSecondToKmPerHour(activity.average_speed)} km/h | {activity.total_elevation_gain} m+ | {secondsToTime(activity.moving_time)} | {activity.average_heartrate} ppm | {activity.average_watts} W
                                        </span>
                                    ) : activity.sport_type === 'TrailRun' ? (
                                        <span className="metric">
                                            {metersToKm(activity.distance)} km | {activity.total_elevation_gain} m+ | {metersPerSecondToPace(activity.average_speed)} /km | {secondsToTime(activity.moving_time)} | {activity.average_heartrate} ppm | {calculateElevationRatio(activity.total_elevation_gain, activity.distance)} +/km
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
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button onClick={closeModal} className="modal-close">X</button>
                {children}
            </div>
        </div>
    );
}