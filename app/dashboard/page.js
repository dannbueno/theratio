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
    const [activeTab, setActiveTab] = useState('datos');
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
    
    // Cargar fotos de la actividad cuando se selecciona la pestaña de fotos
    useEffect(() => {
      const fetchPhotos = async () => {
        if (
          activeTab === 'fotos' && 
          photos.length === 0 && 
          !loadingPhotos && 
          activity && 
          modalToken && 
          (activity.total_photo_count > 0 || activity.photo_count > 0)
        ) {
          setLoadingPhotos(true);
          try {
            console.log(`Cargando fotos para actividad ${activity.id}`);
            
            // Obtener fotos de la actividad con los detalles completos
            const response = await fetch(`https://www.strava.com/api/v3/activities/${activity.id}?include_all_efforts=false`, {
              headers: { 'Authorization': `Bearer ${modalToken}` }
            });
            
            if (!response.ok) {
              throw new Error('Failed to fetch activity photos');
            }
            
            const data = await response.json();
            console.log('Datos recibidos de la actividad:', data.photos);
            
            const photoUrls = [];
            
            // Manejar los diferentes formatos en que pueden venir las fotos
            if (data.photos) {
              // Caso 1: Objeto photos con una foto primary
              if (data.photos.primary && data.photos.primary.urls) {
                const primaryPhoto = {
                  id: data.photos.primary.id,
                  url: data.photos.primary.urls['600'] || data.photos.primary.urls['1024'] || data.photos.primary.urls[0],
                  caption: data.photos.primary.caption || '',
                  type: 'photo'
                };
                photoUrls.push(primaryPhoto);
                console.log('Añadida foto principal:', primaryPhoto);
              }
              
              // Caso 2: Array de fotos
              if (Array.isArray(data.photos)) {
                data.photos.forEach(photo => {
                  if (photo && photo.urls) {
                    photoUrls.push({
                      id: photo.id,
                      url: photo.urls['600'] || photo.urls['1024'] || photo.urls[0],
                      caption: photo.caption || '',
                      type: 'photo'
                    });
                  }
                });
                console.log(`Añadidas ${data.photos.length} fotos de array`);
              }
              
              // Caso 3: Array count_by_type e items para categoría "photos"
              if (data.photos.count_by_type && data.photos.items) {
                const photos = data.photos.items.filter(item => item.type === 'photo');
                photos.forEach(photo => {
                  if (photo && photo.urls) {
                    photoUrls.push({
                      id: photo.id,
                      url: photo.urls['600'] || photo.urls['1024'] || photo.urls[0],
                      caption: photo.caption || '',
                      type: 'photo'
                    });
                  }
                });
                console.log(`Añadidas ${photos.length} fotos de items`);
                
                // Videos
                const videos = data.photos.items.filter(item => item.type === 'video');
                videos.forEach(video => {
                  if (video && video.urls) {
                    photoUrls.push({
                      id: video.id,
                      url: video.urls.poster || video.urls['600'] || video.urls[0],
                      videoUrl: video.urls.video || '',
                      caption: video.caption || '',
                      type: 'video'
                    });
                  }
                });
                console.log(`Añadidos ${videos.length} videos`);
              }
            }
            
            setPhotos(photoUrls);
            console.log(`Total de fotos/videos cargados: ${photoUrls.length}`);
          } catch (error) {
            console.error('Error fetching activity photos:', error);
            setPhotos([]);
          } finally {
            setLoadingPhotos(false);
          }
        }
      };
      
      fetchPhotos();
    }, [activeTab, photos.length, loadingPhotos, activity, modalToken]);
    
    // Cargar streams de datos cuando el usuario cambia a la pestaña de mapa o gráficos
    useEffect(() => {
      // Solo cargar si estamos en el cliente, en la pestaña de mapa o gráficos y no tenemos datos
      if (
        typeof window !== 'undefined' && 
        (activeTab === 'mapa' || activeTab === 'graficos') && 
        activityStreams.polyline.length === 0 && 
        !loading && 
        activity && 
        modalToken
      ) {
        const fetchActivityStreams = async () => {
          setLoading(true);
          try {
            // Obtener datos del polilinea y otros streams
            const response = await fetch(`https://www.strava.com/api/v3/activities/${activity.id}/streams?keys=latlng,distance,altitude,heartrate,time&key_by_type=true`, {
              headers: { 'Authorization': `Bearer ${modalToken}` }
            });
            
            if (!response.ok) {
              throw new Error('Failed to fetch activity streams');
            }
            
            const data = await response.json();
            
            // Preparar los datos para el mapa y los gráficos
            setActivityStreams({
              polyline: data.latlng ? data.latlng.data : [],
              distance: data.distance ? data.distance.data : [],
              altitude: data.altitude ? data.altitude.data : [],
              heartrate: data.heartrate ? data.heartrate.data : [],
              time: data.time ? data.time.data : []
            });
          } catch (error) {
            console.error('Error fetching activity streams:', error);
            // Establecer un array vacío en caso de error
            setActivityStreams({
              polyline: [],
              distance: [],
              altitude: [],
              heartrate: [],
              time: []
            });
          } finally {
            setLoading(false);
          }
        };
        
        fetchActivityStreams();
      }
    }, [activeTab, activityStreams.polyline.length, loading, activity, modalToken]);
    
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
    
    // Grupos de campos para organizar la visualización
    const fieldGroups = {
      primary: ['distance', 'moving_time', 'elapsed_time', 'total_elevation_gain'],
      performance: ['average_speed', 'max_speed', 'average_heartrate', 'max_heartrate', 'average_cadence'],
      secondary: ['average_watts', 'weighted_average_watts', 'max_watts'],
      elevation: ['elev_high', 'elev_low', 'suffer_score', 'average_temp', 'calories'],
      coordinates: ['start_latitude', 'start_longitude', 'end_latitude', 'end_longitude']
    };

    // Formatear nombre de campo para visualización
    const formatFieldName = (key) => {
      const fieldMap = {
        'distance': 'Distancia',
        'moving_time': 'Tiempo en movimiento',
        'elapsed_time': 'Tiempo total',
        'total_elevation_gain': 'Desnivel positivo',
        'average_speed': activity.sport_type === 'Run' || activity.sport_type === 'TrailRun' ? 'Ritmo medio' : 'Velocidad media',
        'max_speed': activity.sport_type === 'Run' || activity.sport_type === 'TrailRun' ? 'Ritmo máximo' : 'Velocidad máxima',
        'average_heartrate': 'FC media',
        'max_heartrate': 'FC máxima',
        'average_cadence': 'Cadencia media',
        'average_watts': 'Potencia media',
        'weighted_average_watts': 'Potencia media ponderada',
        'max_watts': 'Potencia máxima',
        'calories': 'Calorías',
        'elev_high': 'Altitud máxima',
        'elev_low': 'Altitud mínima',
        'suffer_score': 'Suffer Score',
        'average_temp': 'Temperatura media',
        'start_latitude': 'Latitud inicial',
        'start_longitude': 'Longitud inicial',
        'end_latitude': 'Latitud final',
        'end_longitude': 'Longitud final'
      };
      return fieldMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };
    
    // Formatear valor de campo para visualización
    const formatFieldValue = (key, value) => {
      switch(key) {
        case 'distance':
          return formatDistance(value);
        case 'moving_time':
        case 'elapsed_time':
          return formatDuration(value);
        case 'average_speed':
          return activity.sport_type === 'Run' || activity.sport_type === 'TrailRun' 
            ? formatPace(value) 
            : formatSpeed(value);
        case 'max_speed':
          return activity.sport_type === 'Run' || activity.sport_type === 'TrailRun' 
            ? formatPace(value) 
            : formatSpeed(value);
        case 'total_elevation_gain':
        case 'elev_high':
        case 'elev_low':
          return formatElevation(value);
        case 'average_heartrate':
        case 'max_heartrate':
          return `${Math.round(value)} ppm`;
        case 'average_cadence':
          return `${Math.round(value)} rpm`;
        case 'average_watts':
        case 'weighted_average_watts':
        case 'max_watts':
          return `${Math.round(value)} W`;
        case 'average_temp':
          return `${value}°C`;
        case 'calories':
          return `${Math.round(value)} kcal`;
        default:
          return typeof value === 'number' ? value.toString() : value;
      }
    };

    // Renderizar un campo individual
    const renderField = (key) => {
      if (!activity[key] && activity[key] !== 0) return null;
      return (
        <div key={key} className="border border-neutral-800 rounded-lg py-1.5 px-2 sm:px-3 inline-flex flex-col">
          <span className="text-neutral-400 text-xs">{formatFieldName(key)}</span>
          <span className="text-white font-semibold mt-0.5 text-sm sm:text-base">
            {formatFieldValue(key, activity[key])}
          </span>
        </div>
      );
    };
    
    // Organizar campos en las secciones disponibles
    const availableFields = fieldOrder.filter(key => 
      activity[key] !== undefined && 
      !hiddenFields.includes(key)
    );
    
    // Campos adicionales que no están en el orden predefinido
    const extraFields = Object.keys(activity)
      .filter(key => 
        !hiddenFields.includes(key) && 
        !fieldOrder.includes(key) && 
        activity[key] !== undefined
      );

    // Calcular VAM (Velocidad de Ascenso Media) en metros/hora
    const calculateVAM = (elevationGain, movingTime) => {
      // Convertir tiempo total en segundos a horas
      const movingTimeHours = movingTime / 3600;
      if (movingTimeHours === 0 || !elevationGain) return 0;
      return Math.round(elevationGain / movingTimeHours);
    };

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
          
          {/* Sección para TheRatio y TheVAM en actividades de montaña */}
          {activity.sport_type === 'TrailRun' && (
            <div className="mb-4 p-3 bg-neutral-800 border border-neutral-700 rounded-lg">
              <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                <div>
                  <div className="text-xs text-neutral-300">🏔️ TheRatio</div>
                  <div className="text-orange-400 font-bold text-lg">
                    {formatElevationRatio(activity.total_elevation_gain, activity.distance)} m/km
                  </div>
                </div>
                {activity.total_elevation_gain > 0 && (
                  <div>
                    <div className="text-xs text-neutral-300">⬆️ TheVAM</div>
                    <div className="text-orange-400 font-bold text-lg">
                      {calculateVAM(activity.total_elevation_gain, activity.moving_time)} m/h
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Pestañas de navegación */}
          <div className="flex border-b border-neutral-700 mb-4 overflow-x-auto">
            <button
              className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'datos' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}
              onClick={() => setActiveTab('datos')}
            >
              Datos
            </button>
            {hasPhotos && (
              <button
                className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'fotos' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}
                onClick={() => setActiveTab('fotos')}
              >
                Fotos
              </button>
            )}
            <button
              className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'mapa' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}
              onClick={() => setActiveTab('mapa')}
            >
              Mapa
            </button>
            <button
              className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'graficos' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}
              onClick={() => setActiveTab('graficos')}
            >
              Gráficos
            </button>
          </div>
          
          {/* Contenido de las pestañas con ancho y altura fijos */}
          <div className="h-[300px] sm:h-[360px] w-full overflow-y-auto">
            {/* Pestaña de Datos */}
            {activeTab === 'datos' && (
              <>
                {/* Estadísticas principales */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {fieldGroups.primary.map(key => renderField(key))}
                  </div>
                </div>
                
                {/* Estadísticas de rendimiento */}
                <div className="mb-4">
                  <h3 className="text-sm text-neutral-400 mb-1">Rendimiento</h3>
                  <div className="flex flex-wrap gap-2">
                    {fieldGroups.performance.filter(key => availableFields.includes(key)).map(key => renderField(key))}
                  </div>
                </div>
                
                {/* Estadísticas secundarias */}
                {fieldGroups.secondary.some(key => availableFields.includes(key)) && (
                  <div className="mb-4">
                    <h3 className="text-sm text-neutral-400 mb-1">Potencia</h3>
                    <div className="flex flex-wrap gap-2">
                      {fieldGroups.secondary.filter(key => availableFields.includes(key)).map(key => renderField(key))}
                    </div>
                  </div>
                )}
                
                {/* Altitud */}
                {fieldGroups.elevation.some(key => availableFields.includes(key)) && (
                  <div className="mb-4">
                    <h3 className="text-sm text-neutral-400 mb-1">Otros</h3>
                    <div className="flex flex-wrap gap-2">
                      {fieldGroups.elevation.filter(key => availableFields.includes(key)).map(key => renderField(key))}
                    </div>
                  </div>
                )}
                
                {/* Coordenadas */}
                {fieldGroups.coordinates.some(key => availableFields.includes(key)) && (
                  <div className="mb-4">
                    <h3 className="text-sm text-neutral-400 mb-1">Coordenadas</h3>
                    <div className="flex flex-wrap gap-2">
                      {fieldGroups.coordinates.filter(key => availableFields.includes(key)).map(key => renderField(key))}
                    </div>
                  </div>
                )}
                
                {/* Campos adicionales que no están en ningún grupo */}
                {extraFields.length > 0 && (
                  <div>
                    <h3 className="text-sm text-neutral-400 mb-1">Datos adicionales</h3>
                    <div className="flex flex-wrap gap-2">
                      {extraFields.map(key => renderField(key))}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Pestaña de Fotos */}
            {activeTab === 'fotos' && (
              <div className="h-full w-full">
                {loadingPhotos ? (
                  <div className="h-full w-full bg-neutral-800 flex items-center justify-center">
                    <div className="text-neutral-400">Cargando imágenes...</div>
                  </div>
                ) : photos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                    {photos.map((media, index) => (
                      <div key={index} className="rounded-lg overflow-hidden bg-neutral-800 mb-4">
                        {media.type === 'video' && media.videoUrl ? (
                          <div className="relative">
                            <video 
                              controls 
                              poster={media.url}
                              className="w-full h-auto"
                            >
                              <source src={media.videoUrl} type="video/mp4" />
                              Tu navegador no soporta el elemento de video.
                            </video>
                            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 text-xs rounded-full">
                              VIDEO
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <img 
                              src={media.url} 
                              alt={media.caption || `Foto ${index + 1}`}
                              className="w-full h-auto object-cover cursor-pointer"
                              onClick={() => openLightbox(index)}
                            />
                            <div 
                              className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 text-xs rounded-full opacity-50 hover:opacity-100"
                              onClick={() => openLightbox(index)}
                            >
                              🔍 Ampliar
                            </div>
                          </div>
                        )}
                        {media.caption && (
                          <div className="p-2 text-sm text-neutral-300">
                            {media.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full w-full bg-neutral-800 flex items-center justify-center p-4">
                    <div className="text-neutral-400">
                      La actividad indica que tiene fotos, pero no pudimos obtenerlas.
                      Puedes verlas directamente en Strava.
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Pestaña de Mapa */}
            {activeTab === 'mapa' && (
              <div className="h-full w-full">
                {loading ? (
                  <div className="h-full w-full bg-neutral-800 flex items-center justify-center">
                    <div className="text-neutral-400">Cargando mapa...</div>
                  </div>
                ) : (
                  <MapComponent polyline={activityStreams.polyline} />
                )}
              </div>
            )}
            
            {/* Pestaña de Gráficos */}
            {activeTab === 'graficos' && (
              <div className="h-full w-full">
                {loading ? (
                  <div className="h-full w-full bg-neutral-800 flex items-center justify-center">
                    <div className="text-neutral-400">Cargando gráficos...</div>
                  </div>
                ) : (
                  <div className="h-full w-full">
                    <h3 className="text-sm text-neutral-400 mb-2">Perfil de altitud</h3>
                    <div className="h-[calc(100%-30px)] w-full">
                      <AltimetryChart 
                        activityStreamDistance={activityStreams.distance} 
                        activityStreamAltitude={activityStreams.altitude} 
                        activityStreamHeartRate={activityStreams.heartrate} 
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
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
        
        {/* Lightbox para visualizar imágenes a pantalla completa */}
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