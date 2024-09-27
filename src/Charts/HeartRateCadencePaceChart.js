import { Line } from 'react-chartjs-2';
import { metersPerSecondToKmPerHour, metersPerSecondToPace } from '../utils';
import ActivityDetails from '../ActivityDetail/ActivityDetails';

function HeartRateCadencePaceChart({ activityStreamHeartRate, activityStreamCadence, activityStreamTime, activityStreamDistance, sportType }) {

    // Ensure we have valid numerical data for heart rate, cadence, and distance
    const validData = activityStreamHeartRate.reduce((acc, heartRate, index) => {
        const cadence = activityStreamCadence[index];
        const time = activityStreamTime[index];
        const distance = activityStreamDistance[index];

        // Ignore cadences < 40 or > 125, and filter out speeds > 90 km/h
        if (heartRate > 45 && time > 0 && distance > 0 && cadence >= 40 && cadence <= 125) {
            const deltaDistance = index > 0 ? activityStreamDistance[index] - activityStreamDistance[index - 1] : 0;
            const deltaTime = index > 0 ? activityStreamTime[index] - activityStreamTime[index - 1] : 1;
            const speed = deltaDistance / deltaTime; // Speed in m/s

            if (sportType === 'Ride' && metersPerSecondToKmPerHour(speed) <= 90) {
                acc.heartRate.push(heartRate);
                acc.cadence.push(cadence);
                acc.time.push(time);
                acc.distance.push(distance);
            } else if (sportType === 'Run') {
                acc.heartRate.push(heartRate);
                acc.cadence.push(cadence);
                acc.time.push(time);
                acc.distance.push(distance);
            }
        }
        return acc;
    }, { heartRate: [], cadence: [], time: [], distance: [] });

    const minLength = Math.min(validData.heartRate.length, validData.cadence.length, validData.time.length, validData.distance.length);

    const truncatedHeartRateStream = validData.heartRate.slice(0, minLength);
    const truncatedCadenceStream = validData.cadence.slice(0, minLength);
    const truncatedTimeStream = validData.time.slice(0, minLength);
    const truncatedDistanceStream = validData.distance.slice(0, minLength);

    // Compute either speed (cycling) or pace (running)
    const speedOrPaceStream = truncatedDistanceStream.map((distance, index) => {
        if (index > 0) {
            const deltaDistance = truncatedDistanceStream[index] - truncatedDistanceStream[index - 1];
            const deltaTime = truncatedTimeStream[index] - truncatedTimeStream[index - 1];
            const speed = deltaDistance / deltaTime; // Speed in m/s

            // Conditional check for sport type
            if (sportType === 'Ride') {
                return metersPerSecondToKmPerHour(speed); // Speed in km/h for cycling
            } else if (sportType === 'Run') {
                return metersPerSecondToPace(speed); // Pace in min/km for running
            }
        }
        return 0;
    });

    const data = {
        labels: truncatedTimeStream, // X-axis with time values
        datasets: [
            {
                label: 'Heart Rate (BPM)',
                data: truncatedHeartRateStream,
                borderColor: 'rgba(255, 99, 132, 1)', // Red color for heart rate
                fill: false,
                yAxisID: 'y1', // Y-axis for heart rate
                tension: 0,
                borderWidth: 1,
                pointRadius: 0,
            },
            {
                label: 'Cadence (RPM)',
                data: truncatedCadenceStream,
                borderColor: 'rgba(54, 162, 235, 1)', // Blue color for cadence
                fill: false,
                yAxisID: 'y1', // Y-axis for cadence
                tension: 0,
                borderWidth: 1,
                pointRadius: 0,
            },
            {
                label: sportType === 'Ride' ? 'Speed (km/h)' : 'Pace (min/km)', // Conditional label
                data: speedOrPaceStream,
                borderColor: 'rgba(75, 192, 192, 1)', // Green color for speed/pace
                fill: false,
                yAxisID: 'y2', // Y-axis for speed or pace
                tension: 0,
                borderWidth: 1,
                pointRadius: 0,
            },
        ],
    };

    const options = {
        responsive: true,
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Time (s)',
                },
            },
            y1: {
                title: {
                    display: true,
                    text: 'Heart Rate (BPM) / Cadence (RPM)',
                },
                position: 'left',
                beginAtZero: true,
            },
            y2: {
                title: {
                    display: true,
                    text: sportType === 'Ride' ? 'Speed (km/h)' : 'Pace (min/km)', // Conditional Y-axis title
                },
                position: 'right',
                beginAtZero: true,
                grid: {
                    drawOnChartArea: false, // Prevent grid lines from overlapping
                },
            },
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
            },
        },
    };

    return <Line data={data} options={options} />;
}

export default HeartRateCadencePaceChart;
