import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CLIENT_ID, REDIRECT_URI } from './Credentials.js';

export default function Home() {
  const navigate = useNavigate();

  // Verificar si ya hay un token para redirigir directamente al Dashboard
  useEffect(() => {
    const token = localStorage.getItem('token_strava');
    if (token) {
      navigate('/dashboard'); // Si ya está autenticado, redirigimos al Dashboard
    }
  }, [navigate]);

  const handleLogin = () => {
    // Redirecciona a la página de autenticación de Strava
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=read,activity:read_all`;
  };

  return (
    <div>
      <h1>Welcome to theRatio</h1>
      <button onClick={handleLogin}>Authenticate with Strava</button>
    </div>
  );
}
