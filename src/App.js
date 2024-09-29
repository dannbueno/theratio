import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home.js';
import Dashboard from './Dashboard.js';
import StravaRedirect from './StravaRedirect.js';

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/redirect" element={<StravaRedirect />} />
            </Routes>
        </Router>
    );
}
