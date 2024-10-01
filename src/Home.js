// src/Home.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } from './Credentials.js';

// Función para refrescar el token de acceso
export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) throw new Error('No refresh token found');

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (data.access_token) {
    localStorage.setItem('token_strava', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('expires_at', data.expires_at);
  } else {
    throw new Error('Error refreshing access token');
  }
}

// Función para verificar si el token ha expirado
export function isTokenExpired() {
  const tokenExpiration = localStorage.getItem('expires_at');
  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime >= tokenExpiration;
}


export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAuthToken() {
      const token = localStorage.getItem('token_strava');

      if (!token) {
        return;
      }

      try {
        if (isTokenExpired()) {
          await refreshAccessToken();
        }
        navigate('/dashboard');
      } catch (error) {
        console.error('Error al renovar el token:', error);
        navigate('/');
      }
    }

    checkAuthToken();
  }, [navigate]);

  const handleLogin = () => {
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}/redirect&scope=read,activity:read_all,activity:write`;
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <img src={'/theratio_logo.png'} alt="theRatio logo" className="logo" />
        <h1>Welcome to theratio</h1>
        <button className="strava-button" onClick={handleLogin}>
          Authenticate with Strava
        </button>
        <p>Work in progress by Dan Bueno</p>
      </div>
    </div>
  );
}
