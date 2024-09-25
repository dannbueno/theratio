import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend } from 'chart.js';

// Registrar los elementos de ChartJS
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

function AltimetryChart({ activityStreamDistance, activityStreamAltitude }) {
    const altimetryData = {
        labels: activityStreamDistance.map(distance => (distance / 1000).toFixed(1)), // Convertimos la distancia a kilómetros
        datasets: [
            {
                data: activityStreamAltitude,
                borderColor: 'rgba(75,192,192,1)',
                fill: false, // Asegúrate de que no haya relleno
                tension: 0, // Línea recta sin curvatura
                borderWidth: 1, // Línea muy fina
                pointRadius: 0, // Sin puntos
            },
        ],
    };

    const altimetryOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: false,
                position: 'top',
            },
        },
    };

    return <Line data={altimetryData} options={altimetryOptions} />;
}

export default AltimetryChart;
