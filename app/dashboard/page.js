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

  // Resto del código...
  
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
        {/* Resto del componente... */}
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