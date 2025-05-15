'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const MapComponent = ({ polyline }) => {
  const [mapReady, setMapReady] = useState(false);

  // Verificar que los datos de polyline sean válidos
  const hasValidPolyline = Array.isArray(polyline) && polyline.length > 0 && Array.isArray(polyline[0]) && polyline[0].length === 2;

  // Preparar datos para el mapa cuando se monta
  useEffect(() => {
    // Marcar el mapa como listo
    setMapReady(true);
  }, []);

  // Si no hay datos de polyline válidos
  if (!hasValidPolyline) {
    return (
      <div className="h-[320px] w-full bg-neutral-800 flex items-center justify-center text-neutral-400">
        No hay datos de ruta disponibles
      </div>
    );
  }

  // Calcular centro y límites del mapa
  const getCenter = () => {
    // Calcular el centro del polyline
    const latSum = polyline.reduce((sum, point) => sum + point[0], 0);
    const lngSum = polyline.reduce((sum, point) => sum + point[1], 0);
    return [latSum / polyline.length, lngSum / polyline.length];
  };

  return (
    <div className="h-full w-full">
      {mapReady && (
        <MapContainer
          center={getCenter()}
          zoom={13}
          style={{ height: '100%', width: '100%', borderRadius: '8px' }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {polyline.length > 0 && (
            <Polyline
              positions={polyline}
              color="#fe5000"
              weight={4}
              opacity={0.9}
            />
          )}
        </MapContainer>
      )}
    </div>
  );
};

export default MapComponent; 