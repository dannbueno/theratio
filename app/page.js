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
        <div className="max-w-md w-full bg-neutral-800 rounded-2xl p-6 sm:p-8 shadow-lg text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-4">Conectando con Strava...</h1>
          <p className="text-neutral-300 mb-6">Por favor espera mientras procesamos tu autorización</p>
          <div className="w-10 sm:w-12 h-10 sm:h-12 border-t-2 border-orange-500 border-solid rounded-full animate-spin mx-auto"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-800 rounded-2xl p-5 sm:p-8 shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">TheRatio</h1>
        <p className="text-neutral-300 text-center mb-2">
          by Dan Bueno
        </p>
        <p className="text-neutral-300 text-center mb-6 sm:mb-8 text-sm sm:text-base">
          Calcula automáticamente la proporción de desnivel/distancia para tus actividades de carrera por montaña
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

        <div className="mt-4 sm:mt-6 text-neutral-400 text-xs sm:text-sm text-center">
          <p>Conecta tu cuenta de Strava para ver tus actividades y todos sus datos</p>
        </div>

        <div className="mt-6 sm:mt-8 border-t border-neutral-700 pt-4 sm:pt-6">
          <h2 className="text-white font-medium text-sm sm:text-base mb-2">¿Qué hace TheRatio?</h2>
          <p className="text-neutral-400 text-xs sm:text-sm mb-3">
            TheRatio muestra tus últimas actividades y sus detalles. Además calcula automáticamente la proporción entre el desnivel positivo y la distancia (metros de desnivel por kilómetro) para tus actividades de TrailRun en Strava.
          </p>
          <p className="text-neutral-400 text-xs sm:text-sm">
            Cuando subas una nueva actividad, añadiremos automáticamente un comentario con el ratio calculado para que puedas comparar la dificultad de diferentes rutas.
          </p>
        </div>
        
        <div className="mt-6 sm:mt-8 border-t border-neutral-700 pt-4 sm:pt-6 flex justify-center space-x-6">
          <a 
            href="https://www.instagram.com/dannbueno" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-pink-500 transition-colors"
            aria-label="Instagram de Dan Bueno"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
          <a 
            href="https://www.strava.com/athletes/7349882" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-orange-500 transition-colors"
            aria-label="Strava de Dan Bueno"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
            </svg>
          </a>
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