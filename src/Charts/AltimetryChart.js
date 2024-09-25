import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

function AltimetryChart({ activityStreamDistance, activityStreamAltitude }) {
    const altimetryData = {
        labels: activityStreamDistance.map(distance => (distance / 1000).toFixed(1)),
        datasets: [
            {
                data: activityStreamAltitude,
                borderColor: 'rgba(75,192,192,1)',
                fill: false,
                tension: 0,
                borderWidth: 1,
                pointRadius: 0,
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
