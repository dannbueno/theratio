'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function Home() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [errorMessage, setErrorMessage] = useState('');

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