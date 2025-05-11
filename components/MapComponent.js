'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Importar el CSS de Leaflet globalmente
import 'leaflet/dist/leaflet.css';

// Separando el contenido del mapa para la carga dinámica
const MapContent = ({ polyline }) => {
  // Importación de leaflet solo en el cliente
  const { MapContainer, TileLayer, Polyline, Marker, useMap } = require('react-leaflet');
  const L = require('leaflet');
  
  // Corregir el problema de los íconos de Leaflet en Next.js
  const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
  const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

  // Define iconos personalizados para inicio y fin
  const startIcon = new L.Icon({
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'start-icon',
  });

  const endIcon = new L.Icon({
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'end-icon',
  });

  // Componente para ajustar la vista del mapa a la ruta
  const SetBoundsToRoute = ({ polyline }) => {
    const map = useMap();
    
    useEffect(() => {
      if (polyline && polyline.length > 0) {
        const bounds = L.latLngBounds(polyline);
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    }, [map, polyline]);
    
    return null;
  };

  // Si no hay datos de ruta, mostrar mensaje
  if (!polyline || polyline.length === 0) {
    return (
      <div className="h-full bg-neutral-800 flex items-center justify-center text-neutral-400">
        No hay datos de ruta disponibles para esta actividad
      </div>
    );
  }

  // Punto inicial y final de la ruta
  const startPoint = polyline[0];
  const endPoint = polyline[polyline.length - 1];
  
  // Calcular centro inicial (se ajustará automáticamente)
  const initialCenter = [
    (startPoint[0] + endPoint[0]) / 2,
    (startPoint[1] + endPoint[1]) / 2
  ];

  return (
    <div className="h-full w-full rounded-lg overflow-hidden">
      <MapContainer
        center={initialCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline 
          positions={polyline}
          pathOptions={{ color: 'orange', weight: 5 }}
        />
        <Marker position={startPoint} icon={startIcon}>
        </Marker>
        <Marker position={endPoint} icon={endIcon}>
        </Marker>
        <SetBoundsToRoute polyline={polyline} />
      </MapContainer>
    </div>
  );
};

// Crear un componente dinámico para cargar solo en el cliente
const MapComponentWithNoSSR = dynamic(() => Promise.resolve(MapContent), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-neutral-800 flex items-center justify-center text-neutral-400">
      Cargando mapa...
    </div>
  ),
});

// Exportar un componente que se cargará solo en el cliente
export default function MapComponent({ polyline }) {
  return <MapComponentWithNoSSR polyline={polyline} />;
} 