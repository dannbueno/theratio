import { Line } from "react-chartjs-2";

function PowerHeartRateChart({ activityStreamPower, activityStreamHeartRate, activityStreamTime }) {

    // Ensure we have valid numerical data and ignore zeros
    const validData = activityStreamPower.reduce((acc, power, index) => {
        const heartRate = activityStreamHeartRate[index];
        const time = activityStreamTime[index];

        if (power > 0 && heartRate > 0) {
            acc.power.push(power);
            acc.heartRate.push(heartRate);
            acc.time.push(time);
        }
        return acc;
    }, { power: [], heartRate: [], time: [] });

    // Ensure the streams have the same length
    const minLength = Math.min(validData.power.length, validData.heartRate.length, validData.time.length);

    const truncatedPowerStream = validData.power.slice(0, minLength);
    const truncatedHeartRateStream = validData.heartRate.slice(0, minLength);
    const truncatedTimeStream = validData.time.slice(0, minLength);

    // Split the data into two halves
    const halfwayIndex = Math.floor(minLength / 2);

    const firstHalfPower = truncatedPowerStream.slice(0, halfwayIndex);
    const secondHalfPower = truncatedPowerStream.slice(halfwayIndex);

    const firstHalfHeartRate = truncatedHeartRateStream.slice(0, halfwayIndex);
    const secondHalfHeartRate = truncatedHeartRateStream.slice(halfwayIndex);

    // Calculate average power and heart rate for each half
    const averagePowerFirstHalf = firstHalfPower.reduce((sum, p) => sum + p, 0) / firstHalfPower.length;
    const averagePowerSecondHalf = secondHalfPower.reduce((sum, p) => sum + p, 0) / secondHalfPower.length;

    const averageHeartRateFirstHalf = firstHalfHeartRate.reduce((sum, hr) => sum + hr, 0) / firstHalfHeartRate.length;
    const averageHeartRateSecondHalf = secondHalfHeartRate.reduce((sum, hr) => sum + hr, 0) / secondHalfHeartRate.length;

    // Calculate Pw:Hr ratio for both halves
    const pwHrRatioFirstHalf = averagePowerFirstHalf / averageHeartRateFirstHalf;
    const pwHrRatioSecondHalf = averagePowerSecondHalf / averageHeartRateSecondHalf;

    // Calculate aerobic decoupling
    const decouplingPercentage = ((pwHrRatioFirstHalf - pwHrRatioSecondHalf) / pwHrRatioFirstHalf) * 100;

    // Compute PW:HR ratio for each time point
    const pwHrRatio = truncatedPowerStream.map((power, index) => {
        const heartRate = truncatedHeartRateStream[index];
        return heartRate > 0 ? power / heartRate : 0;
    });

    const data = {
        labels: truncatedTimeStream, // Eje X with time values
        datasets: [
            {
                data: pwHrRatio,
                borderColor: 'rgba(75, 192, 192, 1)', // Greenish color for PW:HR
                fill: false,
                yAxisID: 'y', // Y axis for PW:HR
            },
        ],
    };

    const options = {
        responsive: true,
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Time',
                },
            },
            y: {
                title: {
                    display: true,
                    text: 'PW:HR Ratio',
                },
                position: 'left',
                beginAtZero: true,
            },
        },
        plugins: {
            legend: {
                display: false,
                position: 'top',
            },
        }
    };

    return (
        <div>
            <h4>Aerobic Decoupling: {decouplingPercentage.toFixed(2)}%</h4>
            <Line data={data} options={options} />
        </div>
    );
}

export default PowerHeartRateChart;
