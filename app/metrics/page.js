'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function TrainingMetricsPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchParams = useSearchParams();
  const athleteId = searchParams.get('athleteId');

  useEffect(() => {
    async function fetchMetrics() {
      try {
        // Si no hay athleteId, intentar obtener del almacenamiento local
        const storedAthleteId = localStorage.getItem('athleteId');
        const id = athleteId || storedAthleteId;
        
        if (!id) {
          setError('No se ha encontrado un ID de atleta');
          setLoading(false);
          return;
        }
        
        // Guardar el ID en localStorage para futuras visitas
        if (athleteId) {
          localStorage.setItem('athleteId', athleteId);
        }
        
        const response = await fetch(`/api/strava/training-metrics?athleteId=${id}`);
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        setMetrics(data);
        setLoading(false);
      } catch (err) {
        console.error('Error obteniendo métricas de entrenamiento:', err);
        setError('No se pudieron cargar las métricas de entrenamiento');
        setLoading(false);
      }
    }
    
    fetchMetrics();
  }, [athleteId]);

  // Función para formatear tiempo
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  // Función para formatear distancia
  const formatDistance = (meters) => {
    return (meters / 1000).toFixed(1) + ' km';
  };
  
  // Obtener color para TSB (Training Stress Balance)
  const getTsbColor = (tsb) => {
    if (tsb > 5) return 'text-green-400'; // Forma
    if (tsb > -10) return 'text-yellow-400'; // Fatiga moderada
    return 'text-red-400'; // Fatiga alta
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="text-xl">Cargando métricas de entrenamiento...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-4">
        <div className="text-xl text-red-400 mb-4">{error}</div>
        <div className="text-neutral-400 max-w-md text-center">
          Por favor asegúrate de estar autenticado en TheRatio y tener actividades registradas en los últimos 42 días.
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="text-xl">No se encontraron métricas disponibles</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4 sm:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">Métricas de Entrenamiento</h1>
      
      {/* Métricas principales */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-neutral-800 p-4 rounded-lg shadow">
          <div className="text-neutral-400 text-sm">CTL (Carga Crónica)</div>
          <div className="text-2xl font-bold text-blue-400">{metrics.ctl.toFixed(1)}</div>
          <div className="text-xs text-neutral-300">Promedio 42 días</div>
        </div>
        
        <div className="bg-neutral-800 p-4 rounded-lg shadow">
          <div className="text-neutral-400 text-sm">ATL (Carga Aguda)</div>
          <div className="text-2xl font-bold text-orange-400">{metrics.atl.toFixed(1)}</div>
          <div className="text-xs text-neutral-300">Promedio 7 días</div>
        </div>
        
        <div className="bg-neutral-800 p-4 rounded-lg shadow">
          <div className="text-neutral-400 text-sm">TSB (Balance)</div>
          <div className={`text-2xl font-bold ${getTsbColor(metrics.tsb)}`}>
            {metrics.tsb.toFixed(1)}
          </div>
          <div className="text-xs text-neutral-300">Forma deportiva</div>
        </div>
      </div>
      
      {/* Resumen por deportes */}
      <h2 className="text-xl font-semibold mb-4">Resumen por deporte (últimos 42 días)</h2>
      
      {Object.keys(metrics.sportSummary).length === 0 ? (
        <div className="text-neutral-400">No hay actividades registradas en los últimos 42 días</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(metrics.sportSummary).map(([sport, data]) => (
            <div key={sport} className="bg-neutral-800 p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">{sport}</h3>
                <span className="text-neutral-400 text-sm">{data.count} actividades</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 mt-3">
                <div>
                  <span className="text-neutral-400 text-xs">Distancia:</span>
                  <div className="font-semibold">{formatDistance(data.distance)}</div>
                </div>
                
                <div>
                  <span className="text-neutral-400 text-xs">Tiempo:</span>
                  <div className="font-semibold">{formatTime(data.duration)}</div>
                </div>
                
                <div>
                  <span className="text-neutral-400 text-xs">Desnivel:</span>
                  <div className="font-semibold">{Math.round(data.elevation)} m</div>
                </div>
                
                {data.tss > 0 && (
                  <div>
                    <span className="text-neutral-400 text-xs">TSS total:</span>
                    <div className="font-semibold">{Math.round(data.tss)}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-8 text-center">
        <a href="/dashboard" className="text-blue-400 hover:text-blue-300 underline">
          Volver al dashboard
        </a>
      </div>
    </div>
  );
} 