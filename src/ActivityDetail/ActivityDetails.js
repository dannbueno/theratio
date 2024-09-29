import { useEffect, useState } from 'react';
import { metersToKm, secondsToTime, metersPerSecondToPace, calculateElevationRatio, formatDate, getLocationDetails, metersPerSecondToKmPerHour } from '../utils.js';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend } from 'chart.js';
import './ActivityDetails.css'
import AltimetryChart from '../Charts/AltimetryChart.js';
import PowerHeartRateChart from '../Charts/PowerHeartRateChart.js';
import HeartRateCadencePaceChart from '../Charts/HeartRateCadencePaceChart.js';
import { handleAddRatioToStrava } from '../stravaUtils.js';
import { isTokenExpired, refreshAccessToken } from '../Home.js'


ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

function ActivityDetails({ activityId }) {
    const [activityDetails, setActivityDetails] = useState({});
    const [activityZones, setActivityZones] = useState([]);
    const [activityStreamHeartRate, setActivityStreamHeartRate] = useState([]);
    const [activityStreamPower, setActivityStreamPower] = useState([]);
    const [activityStreamDistance, setActivityStreamDistance] = useState([]);
    const [activityStreamTime, setActivityStreamTime] = useState([]);
    const [activityStreamAltitude, setActivityStreamAltitude] = useState([]);
    const [activityStreamCadence, setActivityStreamCadence] = useState([]);
    const [location, setLocation] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token_strava');

        async function fetchActivityDetails() {
            try {
                const [activityDetailsRes, activityZonesRes, activityStreamsRes] = await Promise.all([
                    fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token_strava')}` },
                    }),
                    fetch(`https://www.strava.com/api/v3/activities/${activityId}/zones`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token_strava')}` },
                    }),
                    fetch(`https://www.strava.com/api/v3/activities/${activityId}/streams?keys=heartrate,watts,altitude,distance,time,cadence&key_by_type=true`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token_strava')}` },
                    }),
                ]);

                if (activityDetailsRes.status === 401 || activityZonesRes.status === 401 || activityStreamsRes.status === 401) {
                    console.log('Token expirado, intentando renovar...');
                    await refreshAccessToken()
                    fetchActivityDetails();
                    return;
                }

                if (!activityDetailsRes.ok || !activityZonesRes.ok || !activityStreamsRes.ok) {
                    throw new Error('Error fetching data from Strava API');
                }

                const [activityDetails, activityZones, activityStreams] = await Promise.all([
                    activityDetailsRes.json(),
                    activityZonesRes.json(),
                    activityStreamsRes.json(),
                ]);

                setActivityDetails(activityDetails);
                setActivityZones(activityZones);
                setActivityStreamHeartRate(activityStreams.heartrate ? activityStreams.heartrate.data : []);
                setActivityStreamPower(activityStreams.watts ? activityStreams.watts.data : []);
                setActivityStreamDistance(activityStreams.distance ? activityStreams.distance.data : []);
                setActivityStreamTime(activityStreams.time ? activityStreams.time.data : []);
                setActivityStreamAltitude(activityStreams.altitude ? activityStreams.altitude.data : []);
                setActivityStreamCadence(activityStreams.cadence ? activityStreams.cadence.data : []);

                if (activityDetails.start_latlng && activityDetails.start_latlng.length) {
                    const locationDetails = await getLocationDetails(activityDetails.start_latlng);
                    setLocation(locationDetails);
                }

            } catch (error) {
                console.error('Error fetching details:', error);
            }
        }

        if (!token || isTokenExpired()) {
            refreshAccessToken().then(() => {
                fetchActivityDetails();
            }).catch(error => console.error('Error refreshing access token:', error));
        } else {
            fetchActivityDetails();
        }
    }, [activityId]);

    // Condición para mostrar el estado de carga solo si todos los streams están vacíos
    if (!activityZones.length || (!activityStreamHeartRate.length && !activityStreamPower.length && !activityStreamDistance.length && !activityStreamTime.length && !activityStreamAltitude.length && !activityStreamCadence.length)) {
        return <div>Loading activity details...</div>;
    }

    return (
        <div>
            {activityDetails.type === 'WeightTraining' ? (
                <h5>{formatDate(activityDetails.start_date)} </h5>
            ) : (
                <h5>{formatDate(activityDetails.start_date)} - {location} </h5>
            )}
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

            {activityDetails.type === 'WeightTraining' ? (
                <div className='details'>
                    <p>Duration: {secondsToTime(activityDetails.moving_time)} </p>
                    <p>Average Heart Rate: {activityDetails.average_heartrate} ppm </p>
                    <p>Calories: {activityDetails.calories} kCal </p>
                </div>
            ) : activityDetails.type === 'Ride' ? (
                <div className='details'>
                    <p>Distance: {metersToKm(activityDetails.distance)} Km</p>
                    <p>Elevation: {activityDetails.total_elevation_gain} m+</p>
                    <p>Duration: {secondsToTime(activityDetails.moving_time)} </p>
                    <p>Speed: {metersPerSecondToKmPerHour(activityDetails.average_speed)} Km/h</p>
                    <p>Cadence: {activityDetails.average_cadence.toFixed(0)} rpm</p>
                    <p>Average Heart Rate: {activityDetails.average_heartrate} ppm </p>

                    {activityDetails.device_watts === false ? (
                        <p>Watts: {activityDetails.average_watts} W (Registered without Powermeter)</p>
                    ) : (
                        <p>Watts: {activityDetails.average_watts} W</p>
                    )}


                    <AltimetryChart activityStreamDistance={activityStreamDistance} activityStreamAltitude={activityStreamAltitude} activityStreamHeartRate={activityStreamHeartRate} />
                    {activityDetails.device_watts === true && (
                        <PowerHeartRateChart
                            activityStreamPower={activityStreamPower}
                            activityStreamHeartRate={activityStreamHeartRate}
                            activityStreamTime={activityStreamTime}
                        />
                    )}

                    {activityStreamHeartRate.length && activityStreamCadence.length && activityStreamDistance.length && activityStreamTime.length ? (
                        <HeartRateCadencePaceChart
                            activityStreamHeartRate={activityStreamHeartRate}
                            activityStreamCadence={activityStreamCadence}
                            activityStreamTime={activityStreamTime}
                            activityStreamDistance={activityStreamDistance}
                            sportType={activityDetails.type} // Use 'Ride' for cycling and 'Run' for running
                        />
                    ) : null}

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
                </div>
            ) : activityDetails.sport_type === 'Run' ? (
                <div className='details'>
                    <p>Distance: {metersToKm(activityDetails.distance)} Km</p>
                    <p>Elevation: {activityDetails.total_elevation_gain} m+</p>
                    <p>Duration: {secondsToTime(activityDetails.moving_time)} </p>
                    <p>Pace: {metersPerSecondToPace(activityDetails.average_speed)} /km</p>
                    <p>Cadence: {activityDetails.average_cadence.toFixed(0)} spm</p>
                    <p>Average Heart Rate: {activityDetails.average_heartrate} ppm </p>
                    <p>Watts: {activityDetails.average_watts} W</p>

                    {activityDetails.device_watts === true && (
                        <PowerHeartRateChart
                            activityStreamPower={activityStreamPower}
                            activityStreamHeartRate={activityStreamHeartRate}
                            activityStreamTime={activityStreamTime}
                        />
                    )}

                    {activityStreamHeartRate.length && activityStreamCadence.length && activityStreamDistance.length && activityStreamTime.length ? (
                        <HeartRateCadencePaceChart
                            activityStreamPower={activityStreamPower}
                            activityStreamHeartRate={activityStreamHeartRate}
                            activityStreamCadence={activityStreamCadence}
                            activityStreamTime={activityStreamTime}
                            activityStreamDistance={activityStreamDistance}
                            sportType={activityDetails.type} // This determines whether it's Run or Ride
                        />

                    ) : null}

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
                </div>
            ) : (
                <div className='details'>
                    <p>Distance: {metersToKm(activityDetails.distance)} Km</p>
                    <p>Elevation: {activityDetails.total_elevation_gain} m+</p>
                    <p>Duration: {secondsToTime(activityDetails.moving_time)} </p>
                    <p>Pace: {metersPerSecondToPace(activityDetails.average_speed)} /km</p>
                    <p>Average Heart Rate: {activityDetails.average_heartrate} ppm </p>
                    <p>Elevation ratio: {calculateElevationRatio(activityDetails.total_elevation_gain, activityDetails.distance)} m+/km</p>
                    <button onClick={() => handleAddRatioToStrava(activityDetails)}>Add Ratio to Strava</button>
                    <p>Watts: {activityDetails.average_watts} W</p>

                    {/* Gráfico de altimetría */}
                    <AltimetryChart activityStreamDistance={activityStreamDistance} activityStreamAltitude={activityStreamAltitude} activityStreamHeartRate={activityStreamHeartRate} />

                    <HeartRateCadencePaceChart
                        activityStreamHeartRate={activityStreamHeartRate}
                        activityStreamCadence={activityStreamCadence}
                        activityStreamTime={activityStreamTime}
                        activityStreamDistance={activityStreamDistance}
                        sportType={activityDetails.type}
                    />

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
                </div>
            )}
        </div>
    );
}

export default ActivityDetails;