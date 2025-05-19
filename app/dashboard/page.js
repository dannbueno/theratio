'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import html2canvas from 'html2canvas';
import dynamic from 'next/dynamic';
import ImageViewer from '../components/ImageViewer';

// Importar Chart.js para los gráficos
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

// Cargar el componente del mapa dinámicamente (sin SSR)
const MapComponent = dynamic(() => import('../components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="h-[400px] bg-neutral-800 flex items-center justify-center">Cargando mapa...</div>
});

// Componente de gráfico de altimetría
const AltimetryChart = ({ activityStreamDistance, activityStreamAltitude, activityStreamHeartRate }) => {
  if (!activityStreamDistance?.length || !activityStreamAltitude?.length) {
    return <div className="h-full w-full bg-neutral-800 flex items-center justify-center">No hay datos de altimetría disponibles</div>;
  }

  const data = {
    labels: activityStreamDistance.map(distance => (distance / 1000).toFixed(1)),
    datasets: [
      {
        label: 'Altitud (m)',
        data: activityStreamAltitude,
        borderColor: 'rgba(75,192,192,1)',
        fill: false,
        tension: 0,
        borderWidth: 1,
        pointRadius: 0,
        yAxisID: 'y1',
      },
      {
        label: 'Frecuencia cardíaca (ppm)',
        data: activityStreamHeartRate,
        borderColor: 'rgba(255,99,132,1)',
        fill: false,
        tension: 0,
        borderWidth: 1,
        pointRadius: 0,
        yAxisID: 'y2',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#fff'
        }
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Distancia (km)',
          color: '#fff'
        },
        ticks: {
          color: '#ccc'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y1: {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: 'Altitud (m)',
          color: '#fff'
        },
        beginAtZero: false,
        ticks: {
          color: '#ccc'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y2: {
        type: 'linear',
        position: 'right',
        title: {
          display: true,
          text: 'Frecuencia Cardíaca (ppm)',
          color: '#fff'
        },
        beginAtZero: false,
        ticks: {
          color: '#ccc'
        },
        grid: {
          drawOnChartArea: false,
          color: 'rgba(255, 255, 255, 0.1)'
        },
      },
    },
  };

  return (
    <div className="bg-neutral-800 p-4 rounded-lg">
      <Line data={data} options={options} />
    </div>
  );
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const [activities, setActivities] = useState([]);
  const [athleteName, setAthleteName] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryTab, setSummaryTab] = useState('week');
  const [urlToken, setUrlToken] = useState(searchParams.get('token'));
  const [apiToken, setApiToken] = useState(null);
  const [userId, setUserId] = useState(null);

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
              // Si no hay token en la API, redirigir a inicio
              window.location.href = '/';
            }
          } else {
            // Si hay error en la API, redirigir a inicio
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
  
  // En useEffect, obtener el ID de usuario al cargar
  useEffect(() => {
    // Intentar obtener el ID de usuario de la sesión o de las cookies
    async function getUserId() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.id) {
            setUserId(data.id);
          }
        }
      } catch (error) {
        console.error('Error obteniendo ID de usuario:', error);
      }
    }
    
    getUserId();
  }, []);

  // Cargar actividades cuando el token esté disponible
  useEffect(() => {
    if (!token) {
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

  // Componente de resumen
  const SummaryModal = ({ onClose, tab, setTab }) => {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
        <div className="bg-neutral-900 rounded-2xl shadow-2xl p-4 sm:p-5 w-full sm:max-w-4xl relative text-white max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Resumen de actividades</h2>
            <button className="text-2xl text-neutral-400 hover:text-white" onClick={onClose}>×</button>
          </div>
          <div className="border-b border-neutral-700 mb-4">
            <div className="flex">
              <button
                className={`px-3 py-2 text-sm font-medium mr-2 ${tab === 'week' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}
                onClick={() => setTab('week')}
              >
                Esta semana
              </button>
              <button
                className={`px-3 py-2 text-sm font-medium mr-2 ${tab === 'month' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}
                onClick={() => setTab('month')}
              >
                Este mes
              </button>
              <button
                className={`px-3 py-2 text-sm font-medium ${tab === 'year' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}
                onClick={() => setTab('year')}
              >
                Este año
              </button>
            </div>
          </div>
          <div className="py-4 text-center text-neutral-300">
            Resumen de tus actividades
          </div>
        </div>
      </div>
    );
  };

  // El componente ActivityModal corregido
  const ActivityModal = ({ activity, onClose }) => {
    const [activeTab, setActiveTab] = useState('detalles');
    const [loading, setLoading] = useState(false);
    const [photos, setPhotos] = useState([]);
    const [activityStreams, setActivityStreams] = useState({
      polyline: [],
      distance: [],
      altitude: [],
      heartrate: [],
      time: []
    });
    const modalRef = useRef(null);
    const [preciseVamData, setPreciseVamData] = useState(null);
    const [loadingVam, setLoadingVam] = useState(false);
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const modalToken = token;
    
    // Función para abrir el lightbox con una imagen específica
    const openLightbox = (index) => {
      setCurrentPhotoIndex(index);
      setLightboxOpen(true);
    };
    
    // Verificar si la actividad tiene fotos
    const hasPhotos = (activity.total_photo_count > 0 || activity.photo_count > 0);
    
    // Mapeo de tipos de deporte a etiquetas en español
    const sportTypeLabels = {
      'Run': 'Correr',
      'TrailRun': 'Trail Running',
      'Ride': 'Ciclismo',
      'Swim': 'Natación',
      'Walk': 'Caminar',
      'Hike': 'Senderismo',
      'AlpineSki': 'Esquí Alpino',
      'BackcountrySki': 'Esquí de Montaña',
      'Canoeing': 'Canoa',
      'Crossfit': 'Crossfit',
      'EBikeRide': 'Bicicleta Eléctrica',
      'Elliptical': 'Elíptica',
      'IceSkate': 'Patinaje sobre Hielo',
      'InlineSkate': 'Patinaje en Línea',
      'Kayaking': 'Kayak',
      'Kitesurf': 'Kitesurf',
      'NordicSki': 'Esquí Nórdico',
      'RockClimbing': 'Escalada',
      'RollerSki': 'Esquí sobre Ruedas',
      'Rowing': 'Remo',
      'Snowboard': 'Snowboard',
      'Snowshoe': 'Raquetas de Nieve',
      'StairStepper': 'Escaladora',
      'StandUpPaddling': 'Paddle Surf',
      'Surfing': 'Surf',
      'VirtualRide': 'Ciclismo Virtual',
      'VirtualRun': 'Carrera Virtual',
      'WeightTraining': 'Entrenamiento con Pesas',
      'Workout': 'Entrenamiento',
      'Yoga': 'Yoga'
    };
    
    // Lista de claves a ocultar
    const hiddenFields = [
      'id', 'start_date_local', 'timezone', 'utc_offset', 'location_city', 'location_state', 'location_country',
      'achievement_count', 'trainer', 'commute', 'manual', 'private', 'visibility', 'flagged', 'gear_id',
      'start_latlng', 'end_latlng', 'device_watts', 'heartrate_opt_out', 'display_hide_heartrate_option',
      'upload_id', 'upload_id_str', 'external_id', 'from_accepted_tag', 'pr_count', 'has_kudoed',
      'resource_state', 'athlete',
      'workout_type', 'kudos_count', 'comment_count', 'athlete_count', 'map',
      'name', 'start_date', 'type',
      'sport_type',
      'vam', 'climbTime', 'climbMeters',
      'photo_count', 'kilojoules', 'has_heartrate', 'total_photo_count',
      'start_latitude', 'start_longitude', 'end_latitude', 'end_longitude'
    ];
    
    // Orden preferido de los campos
    const fieldOrder = [
      'distance', 'moving_time', 'elapsed_time', 'total_elevation_gain',
      'average_speed', 'max_speed', 'average_heartrate', 'max_heartrate', 'average_cadence',
      'average_watts', 'weighted_average_watts', 'max_watts',
      'elev_high', 'elev_low', 'suffer_score', 'average_temp', 'calories',
      'start_latitude', 'start_longitude', 'end_latitude', 'end_longitude'
    ];

    if (!activity) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
        <div
          className="bg-neutral-900 rounded-2xl shadow-2xl p-4 sm:p-5 w-full sm:max-w-4xl relative text-white max-h-[95vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
          ref={modalRef}
        >
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 max-w-[80%]">
              <span className="text-xl sm:text-2xl">{getIcon(activity.type)}</span>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">{activity.name}</h2>
                <div className="flex items-center text-neutral-400 text-xs sm:text-sm gap-1">
                  <span className="truncate">{formatDate(activity.start_date)}</span>
                  <span className="text-neutral-300 mx-1 hidden sm:inline">•</span>
                  <span className="text-orange-400 font-medium truncate">{sportTypeLabels[activity.sport_type] || activity.sport_type}</span>
                </div>
              </div>
            </div>
            <button
              className="text-2xl text-neutral-400 hover:text-white focus:outline-none"
              onClick={onClose}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          
          {/* Pestañas de navegación */}
          <div className="border-b border-neutral-700 mb-4">
            <div className="flex overflow-x-auto scrollbar-hide">
              <button
                className={`px-3 py-2 text-sm font-medium mr-2 ${activeTab === 'detalles' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}
                onClick={() => setActiveTab('detalles')}
              >
                Detalles
              </button>
              {hasPhotos && (
                <button
                  className={`px-3 py-2 text-sm font-medium mr-2 ${activeTab === 'fotos' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}
                  onClick={() => setActiveTab('fotos')}
                >
                  Fotos
                </button>
              )}
              <button
                className={`px-3 py-2 text-sm font-medium mr-2 ${activeTab === 'mapa' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}
                onClick={() => setActiveTab('mapa')}
              >
                Mapa
              </button>
              <button
                className={`px-3 py-2 text-sm font-medium ${activeTab === 'graficos' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}
                onClick={() => setActiveTab('graficos')}
              >
                Gráficos
              </button>
            </div>
          </div>
          
          {/* Link a Strava */}
          <div className="mt-4 text-center">
            <a
              href={`https://www.strava.com/activities/${activity.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300"
            >
              Ver en Strava
            </a>
          </div>
        </div>
        
        {lightboxOpen && (
          <ImageViewer 
            images={photos} 
            initialIndex={currentPhotoIndex} 
            onClose={() => setLightboxOpen(false)} 
          />
        )}
      </div>
    );
  };

  // Funciones de formato
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours === 0 && minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
    const dayOfWeek = new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date);
    const formattedDate = new Intl.DateTimeFormat('es-ES', options).format(date);
    
    return `${dayOfWeek}, ${formattedDate}`;
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Run': return '🏃';
      case 'Ride': return '🚴';
      case 'Swim': return '🏊';
      case 'Walk': return '🚶';
      case 'Hike': return '🥾';
      case 'TrailRun': return '🏃';
      default: return '🏆';
    }
  };

  const formatDistance = (meters) => {
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  };

  const formatDistanceShort = (meters) => {
    const km = meters / 1000;
    return km < 10 ? `${km.toFixed(2)}` : `${Math.round(km * 100) / 100}`;
  };

  const formatElevation = (meters) => {
    return `${Math.round(meters)} m`;
  };

  const formatSpeed = (metersPerSecond) => {
    const kmPerHour = metersPerSecond * 3.6;
    return `${kmPerHour.toFixed(1)} km/h`;
  };

  const formatSpeedShort = (metersPerSecond) => {
    const kmPerHour = metersPerSecond * 3.6;
    return `${kmPerHour.toFixed(1)}`;
  };

  const formatPace = (metersPerSecond) => {
    const secondsPerKm = 1000 / metersPerSecond;
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`;
  };

  const formatPaceShort = (metersPerSecond) => {
    const secondsPerKm = 1000 / metersPerSecond;
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatElevationRatio = (elevationGain, distance) => {
    if (distance === 0) return '0';
    const ratio = elevationGain / (distance / 1000);
    return ratio.toFixed(1);
  };

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
            <button
              className="bg-white/10 text-white px-3 py-2 sm:px-4 text-sm sm:text-base rounded-lg font-medium hover:bg-white/20 transition-colors"
              onClick={() => setShowSummary(true)}
            >
              Resumen
            </button>
            <button
              className="bg-white/10 text-white px-3 py-2 sm:px-4 text-sm sm:text-base rounded-lg font-medium hover:bg-white/20 transition-colors"
              onClick={async () => {
                try {
                  // Llamar al endpoint de cierre de sesión
                  await fetch('/api/auth/logout');
                  // Redirigir a la página principal
                  window.location.href = '/';
                } catch (error) {
                  console.error('Error al cerrar sesión:', error);
                  // En caso de error, redirigir de todas formas
                  window.location.href = '/';
                }
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="bg-neutral-800 rounded-xl shadow-md px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center border border-neutral-700 hover:border-orange-400 transition-all cursor-pointer"
              onClick={() => setSelectedActivity(activity)}
            >
              {/* Sección superior (siempre visible) con icono y nombre */}
              <div className="flex items-center gap-3 w-full sm:w-auto sm:min-w-[260px] sm:max-w-[260px] mb-2 sm:mb-0">
                <span className="text-2xl md:text-3xl flex-shrink-0">{getIcon(activity.sport_type || activity.type)}</span>
                <div className="flex flex-col min-w-0 flex-1">
                  <div
                    className="text-lg md:text-xl font-bold text-white leading-tight truncate cursor-pointer"
                    title={activity.name}
                  >
                    {activity.name.length > 28 ? activity.name.slice(0, 28) + '…' : activity.name}
                  </div>
                  <div className="text-neutral-400 text-xs md:text-sm truncate">{formatDate(activity.start_date)}</div>
                </div>
              </div>
              
              {/* Sección de detalles (grid adaptativo) */}
              <div className="flex-1 w-full grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-x-2 sm:gap-x-4 gap-y-2 items-center text-center sm:ml-2">
                <div>
                  <span className="block text-neutral-400 text-xs">Distancia</span>
                  <span className="block text-base sm:text-lg font-semibold text-white">{formatDistanceShort(activity.distance)} km</span>
                </div>
                <div>
                  <span className="block text-neutral-400 text-xs">Duración</span>
                  <span className="block text-base sm:text-lg font-semibold text-white">{formatDuration(activity.moving_time)}</span>
                </div>
                <div>
                  <span className="block text-neutral-400 text-xs">Elevación</span>
                  <span className="block text-base sm:text-lg font-semibold text-white">{Math.round(activity.total_elevation_gain)}<span className="text-xs text-neutral-300"> m</span></span>
                </div>
                <div>
                  <span className="block text-neutral-400 text-xs">{activity.sport_type === 'Run' || activity.sport_type === 'TrailRun' ? 'Ritmo medio' : 'V. media'}</span>
                  <span className="block text-base sm:text-lg font-semibold text-white">
                    {activity.sport_type === 'Run' || activity.sport_type === 'TrailRun' 
                      ? formatPaceShort(activity.average_speed) 
                      : formatSpeedShort(activity.average_speed)}
                    <span className="text-xs text-neutral-300"> {activity.sport_type === 'Run' || activity.sport_type === 'TrailRun' ? 'min/km' : 'km/h'}</span>
                  </span>
                </div>
                <div>
                  <span className="block text-neutral-400 text-xs">
                    {activity.sport_type === 'TrailRun' 
                      ? 'Ratio' 
                      : activity.sport_type === 'Run' 
                        ? 'Ritmo máx' 
                        : 'V. máx'}
                  </span>
                  <span className="block text-base sm:text-lg font-semibold text-white">
                    {activity.sport_type === 'TrailRun'
                      ? formatElevationRatio(activity.total_elevation_gain, activity.distance)
                      : activity.sport_type === 'Run'
                        ? formatPaceShort(activity.max_speed)
                        : formatSpeedShort(activity.max_speed)}
                    <span className="text-xs text-neutral-300"> 
                      {activity.sport_type === 'TrailRun' 
                        ? 'm+/km' 
                        : activity.sport_type === 'Run' 
                          ? 'min/km' 
                          : 'km/h'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {selectedActivity && <ActivityModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />}
        {showSummary && <SummaryModal onClose={() => setShowSummary(false)} tab={summaryTab} setTab={setSummaryTab} />}
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