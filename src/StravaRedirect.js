import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { CLIENT_ID, CLIENT_SECRET } from './Credentials.js';

function StravaRedirect() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const code = params.get('code');

    useEffect(() => {
        const usedCode = localStorage.getItem('used_code');

        if (!code || code === usedCode) {
            return;
        }

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
            .then((response) => response.json())
            .then((data) => {
                localStorage.setItem('token_strava', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                localStorage.setItem('expires_at', data.expires_at);
                localStorage.setItem('used_code', code);
                navigate('/dashboard');
            })
            .catch((error) => console.error('Error:', error));
    }, [code, navigate]);

    return (
        <div>
            <h1>Strava Authorization Completed!</h1>
            <div>Redirecting to your dashboard...</div>
        </div>
    );
}

export default StravaRedirect;
