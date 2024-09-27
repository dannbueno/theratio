export function metersToKm(meters) {
    let km = meters / 1000;

    // Redondear si está cerca del entero (0.01 de diferencia)
    if (Math.abs(km - Math.round(km)) <= 0.01) {
        return Math.round(km).toString(); // Devolver el entero redondeado
    } else {
        return km.toFixed(2); // Devolver con dos decimales si no está cerca de un entero
    }
}

export function secondsToTime(seconds) {
    let hours = Math.floor(seconds / 3600);
    let minutes = Math.floor((seconds % 3600) / 60);
    let remainingSeconds = seconds % 60;

    let timeString = '';

    if (hours > 0) {
        timeString += `${hours}h `;
    }

    if (minutes > 0) {
        timeString += `${minutes}m `;
    }

    if (remainingSeconds > 0) {
        timeString += `${remainingSeconds}s`;
    }

    // If none of the above conditions are met, it's 0 seconds
    if (timeString === '') {
        timeString = '0s';
    }

    return timeString.trim(); // Removes any trailing spaces
}

export function metersPerSecondToKmPerHour(mps) {
    const kmPerHour = mps * 3.6; // 1 metro por segundo es igual a 3.6 km/h
    return kmPerHour.toFixed(2); // Redondea a 2 decimales
}

export function metersPerSecondToPace(mps) {
    const secondsPerKm = 1000 / mps; // Tiempo en segundos por cada kilómetro
    const minutes = Math.floor(secondsPerKm / 60); // Minutos completos
    const seconds = Math.floor(secondsPerKm % 60); // Segundos restantes

    return `${minutes}:${seconds.toString().padStart(2, '0')}`; // Formato min:seg
}

export function calculateElevationRatio(elevationGain, distance) {
    if (distance === 0) return 0;
    const ratio = elevationGain / metersToKm(distance);
    return ratio.toFixed(1);
}

export function formatDate(dateString) {
    const date = new Date(dateString); // Convierte la cadena de fecha a un objeto Date

    const day = String(date.getDate()).padStart(2, '0'); // Día con 2 dígitos
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Mes con 2 dígitos (los meses en JS van de 0 a 11)
    const year = date.getFullYear(); // Año con 4 dígitos

    const hours = String(date.getHours()).padStart(2, '0'); // Horas con 2 dígitos
    const minutes = String(date.getMinutes()).padStart(2, '0'); // Minutos con 2 dígitos

    return `${day}/${month}/${year} ${hours}:${minutes}`; // Formato estándar DD/MM/YYYY HH:mm
}

export async function getLocationDetails(latlng) {
    const lat = latlng[0];
    const lon = latlng[1];

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=ca`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        let villageOrTown = null;
        let state = data.address.state || 'State not available';
        let county = data.address.county || '';
        let locationString = '';

        // Identificar el pueblo, ciudad o villa
        if (data && data.address) {
            if (data.address.village) {
                villageOrTown = data.address.village;
            } else if (data.address.town) {
                villageOrTown = data.address.town;
            } else if (data.address.city) {
                villageOrTown = data.address.city;
            }

            // Construir la cadena de ubicación
            locationString = villageOrTown ? villageOrTown : 'Unknown location';

            // Incluir el condado si está disponible
            if (county) {
                locationString += `, ${county}`;
            }

            // Añadir el estado (o región)
            locationString += `, ${state}`;
        }

        return locationString.trim();

    } catch (error) {
        console.error('Error fetching location details:', error);
        return "Location not available";
    }
}
