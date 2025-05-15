'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function DashboardContent() {
  const searchParams = useSearchParams();
  const [activities, setActivities] = useState([]);
  const [athleteName, setAthleteName] = useState('');
  const [loading, setLoading] = useState(true);
  const [urlToken, setUrlToken] = useState(searchParams.get('token'));
  const [apiToken, setApiToken] = useState(null);

  // Obtener token de la API si no existe en URL
  useEffect(() => {
    async function getTokenFromApi() {
      if (!urlToken) {
        try {
          const response = await fetch('/api/auth/me');
          if (response.ok) {
            const data = await response.json();
            if (data.token) {
              setApiToken(data.token);
            } else {
              window.location.href = '/';
            }
          } else {
            window.location.href = '/';
          }
        } catch (error) {
          console.error('Error obteniendo token de API:', error);
          window.location.href = '/';
        }
      }
    }
    
    getTokenFromApi();
  }, [urlToken]);

  // Token efectivo (de URL o API)
  const token = urlToken || apiToken;

  useEffect(() => {
    if (!token) {
      window.location.href = '/';
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch athlete profile
        const athleteRes = await fetch('https://www.strava.com/api/v3/athlete', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (athleteRes.ok) {
          const athlete = await athleteRes.json();
          setAthleteName(`${athlete.firstname} ${athlete.lastname}`);
        }
        // Fetch activities
        const response = await fetch('https://www.strava.com/api/v3/athlete/activities', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }
        const data = await response.json();
        setActivities(data);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <div className="text-xl text-white font-medium">Cargando tus actividades...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-900">
      <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">TheRatio</h1>
            <p className="text-neutral-300 mt-1">Resumen de entrenos</p>
            {athleteName && (
              <p className="text-neutral-400 text-sm">de {athleteName}</p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <a 
              href="/metrics" 
              className="bg-orange-500/80 text-white px-3 py-2 sm:px-4 text-sm sm:text-base rounded-lg font-medium hover:bg-orange-600 transition-colors"
              title="Ver métricas de entrenamiento"
            >
              Métricas
            </a>
            <button 
              className="bg-white/10 text-white px-3 py-2 sm:px-4 text-sm sm:text-base rounded-lg font-medium hover:bg-white/20 transition-colors"
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout');
                  window.location.href = '/';
                } catch (error) {
                  console.error('Error al cerrar sesión:', error);
                  window.location.href = '/';
                }
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          <p className="text-white">Tienes {activities.length} actividades. Haz clic en "Métricas" para ver tus estadísticas de entrenamiento.</p>
        </div>
      </div>
    </main>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <div className="text-xl text-white font-medium">Cargando...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
} 