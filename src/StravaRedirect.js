import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } from './Credentials';

export default function StravaRedirect() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const code = params.get('code');

    useEffect(() => {
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
                localStorage.setItem('token_strava', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                localStorage.setItem('expires_at', data.expires_at);
                localStorage.setItem('used_code', code);
                navigate('/dashboard');
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }, [code, navigate]);

    return (
        <div>
            <img src={'/theratio_logo.png'} alt="theRatio logo" className="logo" />
            <h1 className='header-title'>·theratio·</h1>
            <div>Strava Authorization Completed!</div>
            <div>Redirecting to your dashboard...</div>
        </div>
    );
}
