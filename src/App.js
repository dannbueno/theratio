import './Home.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home, { refreshAccessToken, isTokenExpired } from './Home.js';
import Dashboard from './Dashboard.js';
import StravaRedirect from './StravaRedirect.js';
import { useEffect, useState } from 'react';

// Componente para proteger rutas
function ProtectedRoute({ children }) {
    const [tokenValid, setTokenValid] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token_strava');
        if (!token || isTokenExpired()) {
            refreshAccessToken
                .then(() => setTokenValid(true))
                .catch(() => setTokenValid(false));
        } else {
            setTokenValid(true);
        }
    }, []);

    return tokenValid ? children : <Navigate to="/" />;
}

function App() {
    return (
        <Router>
            <Routes>
                {/* Definir rutas para Home, Dashboard y el manejo del redirect */}
                <Route path="/" element={<Home />} />
                <Route path="/redirect" element={<StravaRedirect />} />
                {/* Ruta protegida: solo muestra el Dashboard si el token es válido */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            </Routes>
        </Router>
    );
}

export default App;
