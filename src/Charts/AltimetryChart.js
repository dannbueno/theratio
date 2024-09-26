import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

function AltimetryHeartRateChart({ activityStreamDistance, activityStreamAltitude, activityStreamHeartRate }) {

    const data = {
        labels: activityStreamDistance.map(distance => (distance / 1000).toFixed(1)), // Convert distance to kilometers for the X-axis
        datasets: [
            {
                label: 'Altitude (m)',
                data: activityStreamAltitude,
                borderColor: 'rgba(75,192,192,1)', // Blue color for altimetry
                fill: false,
                tension: 0,
                borderWidth: 1,
                pointRadius: 0,
                yAxisID: 'y1', // Associate this dataset with the first Y-axis (altitude)
            },
            {
                label: 'Heart Rate (bpm)',
                data: activityStreamHeartRate,
                borderColor: 'rgba(255,99,132,1)', // Red color for heart rate
                fill: false,
                tension: 0,
                borderWidth: 1,
                pointRadius: 0,
                yAxisID: 'y2', // Associate this dataset with the second Y-axis (heart rate)
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                display: true,
                position: 'top',
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Distance (km)',
                },
            },
            y1: {
                type: 'linear',
                position: 'left',
                title: {
                    display: true,
                    text: 'Altitude (m)',
                },
                beginAtZero: true,
            },
            y2: {
                type: 'linear',
                position: 'right',
                title: {
                    display: true,
                    text: 'Heart Rate (bpm)',
                },
                beginAtZero: true,
                grid: {
                    drawOnChartArea: false, // Prevent grid lines from overlapping
                },
            },
        },
    };

    return <Line data={data} options={options} />;
}

export default AltimetryHeartRateChart;
