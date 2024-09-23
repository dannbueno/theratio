import './Home.css';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Dashboard } from './Dashboard';


const CLIENT_ID = '129187';
const CLIENT_SECRET = '32de5ccecc07b133839496a48020e53437dc4aa1';
const REDIRECT_URL = 'theratio.vercel.app';


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
    <div className="home-container">
      <div className="home-content">
        <img src={'/theratio_logo.png'} alt="theRatio logo" className="logo" />
        <h1 className='header-title'>·theratio·</h1>
        <a
          href={`https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https://${REDIRECT_URL}/redirect&scope=read,activity:read_all`}
          className="strava-button"
        >          Authenticate with Strava
        </a>
      </div>
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
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
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
