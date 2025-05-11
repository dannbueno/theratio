'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const error = searchParams.get('error');
  const code = searchParams.get('code');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Manejar código de autorización recibido de Strava
  useEffect(() => {
    // Si recibimos un código de Strava, procesarlo
    if (code) {
      const processCode = async () => {
        setLoading(true);
        try {
          console.log('Código recibido de Strava:', code);
          
          // Usar nuestro endpoint del servidor para intercambiar el código por un token
          const response = await fetch('/api/auth/strava/exchange', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          });
          
          const data = await response.json();
          console.log('Respuesta del token (status):', response.status);
          
          if (!response.ok) {
            const errorDetail = JSON.stringify(data);
            console.error('Error obteniendo token:', errorDetail);
            setErrorMessage(`Error al procesar la autorización: ${errorDetail}`);
            setLoading(false);
            return;
          }
          
          // Redirigir al dashboard con el token
          router.push(`/dashboard?token=${data.access_token}`);
        } catch (err) {
          console.error('Error procesando código:', err);
          setErrorMessage('Error al procesar el código de autorización: ' + err.message);
          setLoading(false);
        }
      };
      
      processCode();
    }
  }, [code, router]);

  useEffect(() => {
    if (error) {
      switch (error) {
        case 'authentication_failed':
          setErrorMessage('La autenticación con Strava ha fallado. Por favor, inténtalo de nuevo.');
          break;
        case 'token_exchange_failed':
          setErrorMessage('Error obteniendo permisos de Strava. Por favor, inténtalo de nuevo.');
          break;
        case 'server_error':
          setErrorMessage('Error del servidor. Por favor, inténtalo de nuevo más tarde.');
          break;
        default:
          setErrorMessage('Ha ocurrido un error. Por favor, inténtalo de nuevo.');
      }
    }
  }, [error]);

  const handleStravaAuth = () => {
    window.location.href = '/api/auth/strava';
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-800 rounded-2xl p-8 shadow-lg text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Conectando con Strava...</h1>
          <p className="text-neutral-300 mb-6">Por favor espera mientras procesamos tu autorización</p>
          <div className="w-12 h-12 border-t-2 border-orange-500 border-solid rounded-full animate-spin mx-auto"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-800 rounded-2xl p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-white text-center mb-2">TheRatio</h1>
        <p className="text-neutral-300 text-center mb-8">
          Calcula automáticamente la proporción de elevación/distancia para tus actividades de carrera por montaña
        </p>

        {errorMessage && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm">
            {errorMessage}
          </div>
        )}

        <button
          onClick={handleStravaAuth}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-xl flex items-center justify-center font-medium transition-colors"
        >
          <svg 
            className="h-5 w-5 mr-2" 
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24"
          >
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          Conectar con Strava
        </button>

        <div className="mt-6 text-neutral-400 text-sm text-center">
          <p>Conecta tu cuenta de Strava para ver tus actividades y calcular automáticamente el ratio de elevación.</p>
        </div>

        <div className="mt-8 border-t border-neutral-700 pt-6">
          <h2 className="text-white font-medium mb-2">¿Qué hace TheRatio?</h2>
          <p className="text-neutral-400 text-sm mb-3">
            TheRatio calcula automáticamente la proporción entre el desnivel positivo y la distancia (metros de elevación por kilómetro) para tus actividades de TrailRun en Strava.
          </p>
          <p className="text-neutral-400 text-sm">
            Cuando subas una nueva actividad, añadiremos automáticamente un comentario con el ratio calculado para que puedas comparar la dificultad de diferentes rutas.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
        <div className="text-white">Cargando...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}   