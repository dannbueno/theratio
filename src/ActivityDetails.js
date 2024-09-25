import { useEffect, useState } from 'react';
import { metersToKm, secondsToTime, metersPerSecondToPace, calculateElevationRatio } from './utils';

function ActivityDetails({ activityId }) {
    const [activityDetails, setActivityDetails] = useState({});
    const [activityZones, setActivityZones] = useState([]);
    const [activityStreamHeartRate, setActivityStreamHeartRate] = useState([]);
    const [activityStreamPower, setActivityStreamPower] = useState([]);
    const [activityStreamDistance, setActivityStreamDistance] = useState([]);
    const [activityStreamTime, setActivityStreamTime] = useState([]);
    const [activityStreamAltitude, setActivityStreamAltitude] = useState([]);

    useEffect(() => {
        if (!activityId) return;

        console.log('Fetching details for activity ID:', activityId);

        Promise.all([
            fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token_strava')}`,
                },
            }),
            fetch(`https://www.strava.com/api/v3/activities/${activityId}/zones`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token_strava')}`,
                },
            }),
            fetch(`https://www.strava.com/api/v3/activities/${activityId}/streams?keys=heartrate,watts,altitude,distance,time&key_by_type=true`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token_strava')}`,
                },
            }),
        ])
            .then(([activityDetailsRes, activityZonesRes, activityStreamsRes]) => {
                if (!activityDetailsRes.ok || !activityZonesRes.ok || !activityStreamsRes.ok) {
                    throw new Error('Error fetching data from Strava API');
                }
                return Promise.all([activityDetailsRes.json(), activityZonesRes.json(), activityStreamsRes.json()]);
            })
            .then(([activityDetails, activityZones, activityStreams]) => {
                setActivityDetails(activityDetails);
                setActivityZones(activityZones);

                // Si un stream no está disponible, muestra un mensaje en la consola
                setActivityStreamHeartRate(activityStreams.heartrate ? activityStreams.heartrate.data : []);
                setActivityStreamPower(activityStreams.watts ? activityStreams.watts.data : []);
                setActivityStreamDistance(activityStreams.distance ? activityStreams.distance.data : []);
                setActivityStreamTime(activityStreams.time ? activityStreams.time.data : []);
                setActivityStreamAltitude(activityStreams.altitude ? activityStreams.altitude.data : []);
            })
            .catch(error => {
                console.error('Error fetching details:', error);
            });
    }, [activityId]);

    // Condición para mostrar el estado de carga solo si todos los streams están vacíos
    if (!activityZones.length || (!activityStreamHeartRate.length && !activityStreamPower.length && !activityStreamDistance.length && !activityStreamTime.length && !activityStreamAltitude.length)) {
        return <div>Loading activity details...</div>;
    }

    console.log('Heartrate Stream:', activityStreamHeartRate);
    console.log('Power Stream:', activityStreamPower);
    console.log('Distance Stream:', activityStreamDistance);
    console.log('Altitude Stream:', activityStreamAltitude);
    console.log('Time Stream:', activityStreamTime);

    return (

        <div>
            <h2>
                <a
                    href={`https://www.strava.com/activities/${activityDetails.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-link-style"
                >
                    {activityDetails.name}
                </a>
            </h2>
            <h4>Details</h4>
            <p>Distance: {metersToKm(activityDetails.distance)} Km</p>
            <p>Elevation: {activityDetails.total_elevation_gain} m+</p>
            <p>Duration: {secondsToTime(activityDetails.moving_time)} </p>
            <p>Pace: {metersPerSecondToPace(activityDetails.average_speed)} /km</p>
            <p>Average Heart Rate: {activityDetails.average_heartrate} ppm </p>
            <p>Elevation ratio: {calculateElevationRatio(activityDetails.total_elevation_gain, activityDetails.distance)} m+/km</p>

            <h4>Activity Heart Rate Zones</h4>
            {activityZones[0] && (
                <>
                    <p>Time in Zone 1 ({activityZones[0]?.distribution_buckets[0]?.min} - {activityZones[0]?.distribution_buckets[0]?.max}): {secondsToTime(activityZones[0]?.distribution_buckets[0]?.time)}</p>
                    <p>Time in Zone 2 ({activityZones[0]?.distribution_buckets[1]?.min} - {activityZones[0]?.distribution_buckets[1]?.max}): {secondsToTime(activityZones[0]?.distribution_buckets[1]?.time)}</p>
                    <p>Time in Zone 3 ({activityZones[0]?.distribution_buckets[2]?.min} - {activityZones[0]?.distribution_buckets[2]?.max}): {secondsToTime(activityZones[0]?.distribution_buckets[2]?.time)}</p>
                    <p>Time in Zone 4 ({activityZones[0]?.distribution_buckets[3]?.min} - {activityZones[0]?.distribution_buckets[3]?.max}): {secondsToTime(activityZones[0]?.distribution_buckets[3]?.time)}</p>
                    <p>Time in Zone 5 ({activityZones[0]?.distribution_buckets[4]?.min} - {activityDetails.max_heartrate}): {secondsToTime(activityZones[0]?.distribution_buckets[4]?.time)}</p>
                </>
            )}
            <h4>Streams: </h4>
            <table>
                <thead>
                    <tr>
                        <th>Time (s)</th>
                        <th>Distance (m)</th>
                        <th>Heart Rate (bpm)</th>
                        <th>Power (Watts)</th>
                        <th>Altitude (m)</th>
                    </tr>
                </thead>
                <tbody>
                    {activityStreamTime.map((time, index) => (
                        <tr key={index}>
                            <td>{time}</td>
                            <td>{activityStreamDistance[index]}</td>
                            <td>{activityStreamHeartRate[index] !== null && activityStreamHeartRate[index] !== undefined ? activityStreamHeartRate[index] : 'N/A'}</td>
                            <td>{activityStreamPower[index] !== null && activityStreamPower[index] !== undefined ? activityStreamPower[index] : 'N/A'}</td>
                            <td>{activityStreamAltitude[index] !== null && activityStreamAltitude[index] !== undefined ? activityStreamAltitude[index] : 'N/A'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ActivityDetails;

