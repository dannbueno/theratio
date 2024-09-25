import './Home.css';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Dashboard } from './Dashboard';


const CLIENT_ID = '129187';
const CLIENT_SECRET = '32de5ccecc07b133839496a48020e53437dc4aa1';
//const REDIRECT_URI = 'https://theratio.vercel.app';
const REDIRECT_URI = 'http://localhost:3000';


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
          href={`https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}/redirect&scope=read,activity:read_all`}
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
    console.log('useEffect called');

    const usedCode = localStorage.getItem('used_code');

    if (!code || code === usedCode) {
      console.error('Authorization code is missing or already used');
      return;
    }

    // Solo seguir adelante si el código es válido y no se ha usado
    if (!code) return;

    localStorage.setItem('used_code', code);

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
          return response.json().then(errData => {
            throw new Error(`Error: ${response.status} - ${errData.message}`);
          });
        }
        return response.json();
      })
      .then(data => {
        console.log('Access token received:', data.access_token);
        localStorage.setItem('token_strava', data.access_token);
        localStorage.removeItem('used_code');
        navigate('/dashboard');
      })
      .catch(error => {
        console.error('Error:', error);
      });

  }, [code, navigate]);

  return (
    <div >
      <img src={'/theratio_logo.png'} alt="theRatio logo" className="logo" />
      <h1 className='header-title'>·theratio·</h1>
      <div>Strava Authorization Completed!</div>;
      <div>Redirecting to your dashboard...</div>;
    </div>
  );
}
