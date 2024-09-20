import './App.css';
import { metersToKm, secondsToTime, metersPerSecondToKmPerHour, metersPerSecondToPace, calculateElevationRatio, formatDate } from './utils';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getTotalTimeThisWeek, getRunningStatisticsThisWeek } from './stravaUtils';

function Dashboard() {
  const [activities, setActivities] = useState([]);
  const [athlete, setAthlete] = useState({});
  const token = localStorage.getItem('token_strava');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      console.error('No access token found. Redirecting to home.');
      navigate('/');
      return;
    }

    // Fetch del atleta y actividades del usuario
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
      .catch(error => {
        console.error('Error fetching athlete or activities:', error);
      });
  }, [token, navigate]);

  // Usamos las funciones de utilidades
  const totalTimeThisWeek = getTotalTimeThisWeek(activities);
  const formattedTotalTimeThisWeek = secondsToTime(totalTimeThisWeek);
  const runningStats = getRunningStatisticsThisWeek(activities);
  const formattedTotalTimeRunningThisWeek = secondsToTime(runningStats.totalTime);
  const formattedTotalDistanceRunningThisWeek = metersToKm(runningStats.totalDistance);

  return (
    <div>
      <div className="header">
        <div className="header-left">
          <img src={athlete.profile_medium} alt={`${athlete.firstname} ${athlete.lastname}`} />
        </div>
        <div className="header-center">
          <img src={'/theratio_logo.png'} alt={`theRatio`} />
          <div className="header-title">·theratio·</div>
        </div>
        <div className='header-right'>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </div>

      <h2>{athlete.firstname} {athlete.lastname} Last Strava Activities</h2>
      <h4>Total Time This Week: {formattedTotalTimeThisWeek}</h4>
      <h4>Totals Running This Week: {formattedTotalDistanceRunningThisWeek} km | {runningStats.totalElevation} m+ | {formattedTotalTimeRunningThisWeek}</h4>
      <ul className="activities-list">
        {activities.length > 0 ? (
          activities.map(activity => {
            const activityClass = activity.type.charAt(0).toLowerCase() + activity.type.slice(1);
            console.log(activity.sport_type)

            return (
              <li key={activity.id} className={`activity-item ${activityClass}`}>
                <span className="activity-date">{formatDate(activity.start_date_local)} | {activity.sport_type}</span>
                <div className="activity-name">{activity.name}</div>


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
    </div >
  );
}

// Definición del componente App con el enrutamiento
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/redirect" element={<StravaRedirect />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

// Exportamos App como el componente principal
export default App;

function Home() {
  return (
    <div>
      <h1>theratio</h1>
      <h2>Connect with Strava</h2>
      <a href="https://www.strava.com/oauth/authorize?client_id=129187&response_type=code&redirect_uri=https://theratio.vercel.app/redirect&scope=read,activity:read_all">
        <button className="btn strava-auth-button">Authenticate with Strava</button>
      </a>
    </div>
  );
}

function StravaRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const code = params.get('code');

  useEffect(() => {
    if (!code) {
      console.error('Authorization code is missing');
      return;
    }

    // Intercambiar el código por un token de acceso
    const data = {
      client_id: '129187',
      client_secret: '32de5ccecc07b133839496a48020e53437dc4aa1',
      code: code,
      grant_type: 'authorization_code',
    };

    fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to exchange code for token');
        }
        return response.json();
      })
      .then(data => {
        localStorage.setItem('token_strava', data.access_token);
        navigate('/dashboard');
      })
      .catch(error => {
        console.error('Error:', error);
        alert('There was an issue during the authentication process. Please try again.');
      });
  }, [code, navigate]);

  return <div>Strava Authorization Completed!</div>;
}

function handleLogout() {
  localStorage.removeItem('token_strava');
  window.location.href = '/';
}
