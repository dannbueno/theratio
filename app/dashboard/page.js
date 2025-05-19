'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import html2canvas from 'html2canvas';
import dynamic from 'next/dynamic';

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
    labels: activityStreamDistance.map(distance => (distance / 1000).toFixed(1)), // Convertir distancia a kilómetros
    datasets: [
      {
        label: 'Altitud (m)',
        data: activityStreamAltitude,
        borderColor: 'rgba(75,192,192,1)', // Color azul para altimetría
        fill: false,
        tension: 0,
        borderWidth: 1,
        pointRadius: 0,
        yAxisID: 'y1', // Asociar con el primer eje Y (altitud)
      },
      {
        label: 'Frecuencia cardíaca (ppm)',
        data: activityStreamHeartRate,
        borderColor: 'rgba(255,99,132,1)', // Color rojo para frecuencia cardíaca
        fill: false,
        tension: 0,
        borderWidth: 1,
        pointRadius: 0,
        yAxisID: 'y2', // Asociar con el segundo eje Y (FC)
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

  // Antes de la parte del botón de comentario
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

  // Función para obtener las etiquetas de campo adecuadas según el tipo de deporte
  const getFieldLabel = (field, sportType) => {
    if ((sportType === 'Run' || sportType === 'TrailRun') && field === 'average_speed') {
      return 'Ritmo medio';
    }
    if ((sportType === 'Run' || sportType === 'TrailRun') && field === 'max_speed') {
      return 'Ritmo máximo';
    }
    if (sportType === 'TrailRun' && field === 'elevation_ratio') {
      return 'Ratio de desnivel';
    }
    if ((sportType === 'Run' || sportType === 'TrailRun') && field === 'vam') {
      return 'VAM';
    }
    return fieldLabels[field] || field.replace(/_/g, ' ');
  };

  // Diccionario de traducción de campos
  const fieldLabels = {
    name: 'Título',
    start_date: 'Fecha',
    distance: 'Distancia',
    moving_time: 'Tiempo en movimiento',
    elapsed_time: 'Tiempo transcurrido',
    total_elevation_gain: 'Desnivel positivo total',
    type: 'Tipo',
    average_speed: 'Velocidad media',
    max_speed: 'Velocidad máxima',
    calories: 'Calorías',
    suffer_score: 'Esfuerzo Relativo',
    average_heartrate: 'FC media',
    max_heartrate: 'FC máxima',
    average_cadence: 'Cadencia media',
    average_watts: 'Potencia media',
    max_watts: 'Potencia máxima',
    weighted_average_watts: 'Potencia media ponderada',
    elev_high: 'Altitud máxima',
    elev_low: 'Altitud mínima',
    start_latitude: 'Latitud inicio',
    start_longitude: 'Longitud inicio',
    end_latitude: 'Latitud fin',
    end_longitude: 'Longitud fin',
    sport_type: 'Deporte',
    average_temp: 'Temperatura Media',
    vam: 'TheVAM',
    climbTime: 'Tiempo en ascenso',
    climbMeters: 'Metros subidos',
    // Añade más traducciones si lo necesitas
  };

  // Diccionario de traducción de valores de sport_type
  const sportTypeLabels = {
    Run: 'Carrera',
    Ride: 'Ciclismo',
    Swim: 'Natación',
    Walk: 'Caminata',
    Hike: 'Senderismo',
    TrailRun: 'Carrera por montaña',
    // Añade más traducciones si lo necesitas
  };

  // Estadísticas para el resumen
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const activitiesLast30 = activities.filter(a => new Date(a.start_date) >= thirtyDaysAgo);
  const kmBySport = activitiesLast30.reduce((acc, a) => {
    acc[a.sport_type] = (acc[a.sport_type] || 0) + a.distance / 1000;
    return acc;
  }, {});
  const countBySport = activitiesLast30.reduce((acc, a) => {
    acc[a.sport_type] = (acc[a.sport_type] || 0) + 1;
    return acc;
  }, {});
  const totalTime = activitiesLast30.reduce((acc, a) => acc + a.moving_time, 0);
  const totalElevation = activitiesLast30.reduce((acc, a) => acc + (a.total_elevation_gain || 0), 0);
  const formatHMS = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n) => n.toString().padStart(2, '0');
    
    if (h === 0) {
      return `${pad(m)}:${pad(s)}`;
    }
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // Helper para obtener el inicio de la semana (lunes)
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    // Ajuste: 0 = domingo, 1 = lunes, ..., 6 = sábado
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para que el lunes sea el inicio
    d.setDate(diff);
    // Establecer a las 00:00:00.000
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Helper para filtrar actividades por rango
  const filterByRange = (range) => {
    const now = new Date();
    let from;
    if (range === 'week') {
      from = getStartOfWeek(now);
    } else if (range === '7d') {
      from = new Date(now);
      from.setDate(now.getDate() - 7);
      from.setHours(0, 0, 0, 0);
    } else if (range === '30d') {
      from = new Date(now);
      from.setDate(now.getDate() - 30);
      from.setHours(0, 0, 0, 0);
    }
    
    return activities.filter(a => {
      const activityDate = new Date(a.start_date);
      return activityDate >= from;
    });
  };

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
        
        // Set initial activities
        setActivities(data);
        
        // Now fetch precise VAM data for TrailRun activities
        const enhancedActivities = [...data];
        const trailRunActivities = data.filter(activity => 
          (activity.sport_type === 'TrailRun' || activity.sport_type === 'Run') && 
          activity.total_elevation_gain > 0
        );
        
        if (trailRunActivities.length > 0) {
          // Process each trail run activity to get precise VAM
          const userId = await getUserId();
          
          // Only proceed if we have userId
          if (userId) {
            for (const activity of trailRunActivities) {
              try {
                // Get detailed streams for the activity to calculate precise VAM
                const streamsResponse = await fetch(`https://www.strava.com/api/v3/activities/${activity.id}/streams?keys=altitude,distance,time&key_by_type=true`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (streamsResponse.ok) {
                  const streams = await streamsResponse.json();
                  
                  // If we have the necessary data, calculate precise VAM
                  if (streams.altitude && streams.distance && streams.time) {
                    // Call our backend to calculate the precise VAM
                    const vamResponse = await fetch('/api/strava/calculate-vam', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        activityId: activity.id,
                        userId
                      }),
                    });
                    
                    if (vamResponse.ok) {
                      const vamData = await vamResponse.json();
                      
                      // Update the activity with precise VAM data
                      if (vamData && vamData.vam) {
                        const activityIndex = enhancedActivities.findIndex(a => a.id === activity.id);
                        if (activityIndex >= 0) {
                          enhancedActivities[activityIndex] = {
                            ...enhancedActivities[activityIndex],
                            vam: vamData.vam,
                            climbTime: vamData.climbTime,
                            climbMeters: vamData.climbMeters
                          };
                        }
                      }
                    }
                  }
                }
              } catch (error) {
                console.error(`Error fetching precise VAM for activity ${activity.id}:`, error);
                // Continue with next activity, don't break the loop
              }
            }
            
            // Update activities with the enhanced data
            setActivities(enhancedActivities);
          }
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

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

  // Calcular VAM (Velocidad de Ascenso Media) en metros/hora
  const calculateVAM = (elevationGain, movingTime, climbTime = null, climbMeters = null) => {
    // Si tenemos datos precisos de tiempo de subida y metros, usar esos valores
    if (climbTime && climbMeters) {
      // Convertir tiempo de subida de segundos a horas
      const climbTimeHours = climbTime / 3600;
      return Math.round(climbMeters / climbTimeHours);
    }
    
    // Si no hay datos precisos, usar el cálculo estándar
    // Convertir tiempo total en segundos a horas
    const movingTimeHours = movingTime / 3600;
    if (movingTimeHours === 0 || !elevationGain) return 0;
    return Math.round(elevationGain / movingTimeHours);
  };

  // Formatear tiempo de ascenso
  const formatClimbTime = (seconds) => {
    if (!seconds) return "";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h${minutes.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}min`;
    }
  };

  // Formatear VAM para mostrar
  const formatVAM = (vam, climbTime = null, climbMeters = null) => {
    if (!vam) return "—";
    
    if (climbTime && climbMeters) {
      return `${vam} m/h (${Math.round(climbMeters)}m / ${formatClimbTime(climbTime)})`;
    }
    return `${vam} m/h`;
  };

  // Modal de resumen con tabs
  const SummaryModal = ({ onClose, tab, setTab }) => {
    const ranges = {
      week: 'Semana en curso',
      '7d': 'Últimos 7 días',
      '30d': 'Últimos 30 días',
    };
    const acts = filterByRange(tab);
    const totalTime = acts.reduce((acc, a) => acc + a.moving_time, 0);
    const totalElevation = acts.reduce((acc, a) => acc + (a.total_elevation_gain || 0), 0);
    // Agrupa estadísticas por deporte
    const statsBySport = {};
    acts.forEach(a => {
      if (!statsBySport[a.sport_type]) {
        statsBySport[a.sport_type] = {
          duration: 0,
          km: 0,
          elevation: 0,
          count: 0
        };
      }
      statsBySport[a.sport_type].duration += a.moving_time;
      statsBySport[a.sport_type].km += a.distance / 1000;
      statsBySport[a.sport_type].elevation += a.total_elevation_gain || 0;
      statsBySport[a.sport_type].count += 1;
      
      // Añadir VAM para actividades relevantes
      if ((a.sport_type === 'Run' || a.sport_type === 'TrailRun') && a.total_elevation_gain > 0) {
        if (!statsBySport[a.sport_type].vamTotal) {
          statsBySport[a.sport_type].vamTotal = 0;
          statsBySport[a.sport_type].vamCount = 0;
        }
        const vam = calculateVAM(a.total_elevation_gain, a.moving_time);
        if (vam > 0) {
          statsBySport[a.sport_type].vamTotal += vam;
          statsBySport[a.sport_type].vamCount += 1;
        }
      }
    });
    // Calcular días del rango
    let days = 1;
    if (tab === 'week') {
      const start = getStartOfWeek(new Date());
      const now = new Date();
      days = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
    } else if (tab === '7d') {
      days = 7;
    } else if (tab === '30d') {
      days = 30;
    }
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
        <div
          className="bg-neutral-900 rounded-2xl shadow-2xl p-4 sm:p-6 w-full sm:max-w-lg relative text-white max-h-[92vh] sm:max-h-[85vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <button
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-2xl text-neutral-400 hover:text-white focus:outline-none"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 pr-8">Resumen</h2>
          <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
            {Object.entries(ranges).map(([key, label]) => (
              <button
                key={key}
                className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors ${tab === key ? 'bg-orange-500 text-white' : 'bg-white/10 text-orange-200 hover:bg-orange-600/30'}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="font-bold text-sm sm:text-base">Resumen por deporte:</div>
            {Object.keys(statsBySport).length === 0 && <div className="text-neutral-400 py-2">No hay actividades en este periodo.</div>}
            {Object.entries(statsBySport).map(([sport, stats]) => (
              <div key={sport} className="border-b border-neutral-800 py-2">
                <div className="flex items-center gap-1.5 font-semibold mb-1.5">
                  <span className="text-base sm:text-lg">{getIcon(sport)}</span>
                  <span>{sportTypeLabels[sport] || sport}</span>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-2 sm:gap-x-4 gap-y-1 mb-1.5">
                  <div><span className="text-neutral-400">Duración:</span> <span className="font-semibold">{formatHMS(stats.duration)}</span></div>
                  {sport !== 'WeightTraining' && <div><span className="text-neutral-400">Km totales:</span> <span className="font-semibold">{stats.km.toFixed(2)}</span></div>}
                  {sport !== 'WeightTraining' && <div><span className="text-neutral-400">Desnivel:</span> <span className="font-semibold">{stats.elevation.toFixed(0)} m</span></div>}
                  <div><span className="text-neutral-400">Actividades:</span> <span className="font-semibold">{stats.count}</span></div>
                </div>
                <div className="mt-1 pt-1 border-t border-neutral-800/50">
                  <div className="text-orange-300/90 font-medium text-xs mb-1">Valores promedio:</div>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-2 sm:gap-x-4 gap-y-1 text-orange-200/80">
                    <div><span className="text-neutral-400">Duración:</span> <span className="font-semibold">{formatHMS(Math.round(stats.duration / stats.count))}</span></div>
                    {sport !== 'WeightTraining' && <div><span className="text-neutral-400">Km:</span> <span className="font-semibold">{(stats.km / stats.count).toFixed(2)}</span></div>}
                    {sport !== 'WeightTraining' && <div><span className="text-neutral-400">Desnivel:</span> <span className="font-semibold">{(stats.elevation / stats.count).toFixed(0)} m</span></div>}
                    {sport === 'Run' || sport === 'TrailRun' ? (
                      <div>
                        <span className="text-neutral-400">Ritmo:</span>
                        <span className="font-semibold">{formatPaceShort((stats.km * 1000) / stats.duration)} min/km</span>
                      </div>
                    ) : (
                      sport !== 'WeightTraining' && (
                        <div>
                          <span className="text-neutral-400">Vel.:</span>
                          <span className="font-semibold">{formatSpeedShort((stats.km * 1000) / stats.duration)} km/h</span>
                        </div>
                      )
                    )}
                    {sport === 'TrailRun' && (
                      <div>
                        <span className="text-neutral-400">Ratio:</span>
                        <span className="font-semibold">{formatElevationRatio(stats.elevation, stats.km * 1000)} m+/km</span>
                      </div>
                    )}
                    {(sport === 'TrailRun' || sport === 'Run') && stats.vamTotal && stats.vamCount > 0 && (
                      <div>
                        <span className="text-neutral-400">VAM:</span>
                        <span className="font-semibold">{Math.round(stats.vamTotal / stats.vamCount)} m/h</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="bg-neutral-800/60 rounded-lg p-2 sm:p-3">
                <div className="text-neutral-400 text-xs">Tiempo total</div>
                <div className="font-semibold text-base">{formatHMS(totalTime)}</div>
              </div>
              <div className="bg-neutral-800/60 rounded-lg p-2 sm:p-3">
                <div className="text-neutral-400 text-xs">Desnivel total</div>
                <div className="font-semibold text-base">{totalElevation.toFixed(0)} m</div>
              </div>
              <div className="bg-neutral-800/60 rounded-lg p-2 sm:p-3">
                <div className="text-neutral-400 text-xs">Media diaria</div>
                <div className="font-semibold text-base">{formatHMS(Math.round(totalTime / days))}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Bloquear scroll del body cuando el modal de detalle o de resumen está abierto
  useEffect(() => {
    if (selectedActivity || showSummary) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedActivity, showSummary]);

  // Modal component para mostrar los detalles de una actividad
  const ActivityModal = ({ activity, onClose }) => {
    const modalRef = useRef(null);
    const [activeTab, setActiveTab] = useState('datos');
    const [activityStreams, setActivityStreams] = useState({
      polyline: [],
      distance: [],
      altitude: [],
      heartrate: [],
      time: []
    });
    const [loading, setLoading] = useState(false);
    const [loadingVam, setLoadingVam] = useState(false);
    const [preciseVamData, setPreciseVamData] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [segments, setSegments] = useState([]);
    const [loadingSegments, setLoadingSegments] = useState(false);
    const modalToken = token; // Usar el token efectivo del componente padre
    
    // Cargar VAM preciso al abrir el modal si no está disponible
    useEffect(() => {
      const fetchPreciseVAM = async () => {
        // Solo intentar calcular el VAM preciso si no existe ya y es una actividad elegible
        if (
          !activity.vam && 
          (activity.sport_type === 'TrailRun' || activity.sport_type === 'Run') && 
          activity.total_elevation_gain > 0 &&
          userId
        ) {
          setLoadingVam(true);
          try {
            const vamResponse = await fetch('/api/strava/calculate-vam', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                activityId: activity.id,
                userId
              }),
            });
            
            if (vamResponse.ok) {
              const vamData = await vamResponse.json();
              if (vamData && vamData.vam) {
                setPreciseVamData(vamData);
              }
            }
          } catch (error) {
            console.error('Error obteniendo VAM preciso:', error);
          } finally {
            setLoadingVam(false);
          }
        }
      };
      
      fetchPreciseVAM();
    }, [activity, userId]);
    
    // Determinar qué VAM mostrar (del objeto actividad o del cálculo al vuelo)
    const displayVam = activity.vam || (preciseVamData && preciseVamData.vam);
    const displayClimbTime = activity.climbTime || (preciseVamData && preciseVamData.climbTime);
    const displayClimbMeters = activity.climbMeters || (preciseVamData && preciseVamData.climbMeters);
    
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
    
    // Cargar fotos de la actividad si tiene
    useEffect(() => {
      const fetchPhotos = async () => {
        // Solo cargar si estamos en la pestaña de fotos y no tenemos datos
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
            
            // Obtener fotos de la actividad
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
    }, [activeTab, activity, modalToken, photos.length, loadingPhotos]);

    // Cargar segmentos de la actividad
    useEffect(() => {
      const fetchSegments = async () => {
        // Solo cargar si estamos en la pestaña de segmentos y no tenemos datos
        if (
          activeTab === 'segmentos' && 
          segments.length === 0 && 
          !loadingSegments && 
          activity && 
          modalToken
        ) {
          setLoadingSegments(true);
          try {
            console.log(`Cargando segmentos para actividad ${activity.id}`);
            
            // Obtener detalles completos de la actividad con los segmentos
            const response = await fetch(`https://www.strava.com/api/v3/activities/${activity.id}?include_all_efforts=true`, {
              headers: { 'Authorization': `Bearer ${modalToken}` }
            });
            
            if (!response.ok) {
              throw new Error('Error al obtener segmentos de la actividad');
            }
            
            const data = await response.json();
            
            if (data.segment_efforts && Array.isArray(data.segment_efforts)) {
              console.log(`Encontrados ${data.segment_efforts.length} segmentos`);
              setSegments(data.segment_efforts);
            } else {
              console.log('No se encontraron segmentos en esta actividad');
              setSegments([]);
            }
          } catch (error) {
            console.error('Error obteniendo segmentos:', error);
            setSegments([]);
          } finally {
            setLoadingSegments(false);
          }
        }
      };
      
      fetchSegments();
    }, [activeTab, segments.length, loadingSegments, activity, modalToken]);
    
    // Verificar si la actividad tiene fotos
    const hasPhotos = (activity.total_photo_count > 0 || activity.photo_count > 0);
    
    // Lista de claves a ocultar
    const hiddenFields = [
      'id', 'start_date_local', 'timezone', 'utc_offset', 'location_city', 'location_state', 'location_country',
      'achievement_count', 'trainer', 'commute', 'manual', 'private', 'visibility', 'flagged', 'gear_id',
      'start_latlng', 'end_latlng', 'device_watts', 'heartrate_opt_out', 'display_hide_heartrate_option',
      'upload_id', 'upload_id_str', 'external_id', 'from_accepted_tag', 'pr_count', 'has_kudoed',
      'resource_state', 'athlete',
      'workout_type', 'kudos_count', 'comment_count', 'athlete_count', 'map',
      // Ocultar campos redundantes que ya se muestran en la cabecera
      'name', 'start_date', 'type',
      // Ocultar sport_type ya que lo mostraremos en la cabecera
      'sport_type',
      // Ocultar VAM, Tiempo en ascenso y Metros subidos (ya mostrados en la sección superior)
      'vam', 'climbTime', 'climbMeters',
      // Campos innecesarios adicionales
      'photo_count', 'kilojoules', 'has_heartrate', 'total_photo_count',
      // Campos de coordenadas
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
      primary: ['distance', 'moving_time', 'total_elevation_gain', 'average_speed'],
      cardio: ['average_heartrate', 'max_heartrate', 'average_cadence', 'calories'],
      secondary: ['average_watts', 'weighted_average_watts', 'max_watts'],
      others: ['elapsed_time', 'elev_high', 'elev_low', 'suffer_score', 'average_temp', 'max_speed']
    };
    
    // Diccionario de unidades por campo
    const fieldUnits = {
      total_elevation_gain: 'm',
      average_watts: 'W',
      weighted_average_watts: 'W',
      max_watts: 'W',
      calories: 'kcal',
      average_heartrate: 'ppm',
      max_heartrate: 'ppm',
      average_cadence: 'rpm',
      average_temp: '°C',
      elev_high: 'm',
      elev_low: 'm',
      suffer_score: 'pts',
      start_latitude: '°',
      start_longitude: '°',
      end_latitude: '°',
      end_longitude: '°'
    };
    
    // Helper para detectar y formatear fechas ISO
    const isIsoDate = (val) => typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val);
    const formatDateField = (val) => {
      const d = new Date(val);
      const pad = (n) => n.toString().padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    };
    
    // Función para formatear valor con unidades
    const formatValueWithUnit = (key, value) => {
      if (value === null || value === undefined) return '—';
      
      if (key === 'sport_type') return sportTypeLabels[value] || value;
      if (key === 'distance') return formatDistance(value);
      if (key === 'moving_time' || key === 'elapsed_time') return formatHMS(value);
      
      if (key === 'average_speed' && (activity.sport_type === 'Run' || activity.sport_type === 'TrailRun')) {
        return formatPace(value);
      }
      if (key === 'max_speed' && (activity.sport_type === 'Run' || activity.sport_type === 'TrailRun')) {
        return formatPace(value);
      }
      if (key === 'average_speed' && !(activity.sport_type === 'Run' || activity.sport_type === 'TrailRun')) {
        return `${formatSpeedShort(value)} km/h`;
      }
      if (key === 'max_speed' && !(activity.sport_type === 'Run' || activity.sport_type === 'TrailRun')) {
        return `${formatSpeedShort(value)} km/h`;
      }
      
      // Formatear VAM con unidades y datos de subida
      if (key === 'vam') {
        return formatVAM(value, activity.climbTime, activity.climbMeters);
      }
      
      // Formatear tiempo de ascenso
      if (key === 'climbTime') {
        return formatClimbTime(value);
      }
      
      // Formatear metros de subida (sin decimales)
      if (key === 'climbMeters') {
        return `${Math.round(value)} m`;
      }
      
      if (isIsoDate(value)) return formatDateField(value);
      
      // Añadir unidades para valores numéricos
      if (typeof value === 'number' && fieldUnits[key]) {
        // Valores que se muestran sin decimales (números enteros)
        if ([
          'average_heartrate', 
          'max_heartrate', 
          'suffer_score', 
          'calories',
          'average_cadence',
          'total_elevation_gain',
          'average_watts',
          'weighted_average_watts',
          'max_watts',
          'elev_high',
          'elev_low',
          'average_temp'
        ].includes(key)) {
          return `${Math.round(value)} ${fieldUnits[key]}`;
        }
        
        // Por defecto, mostrar con 1 decimal para otros valores numéricos
        return `${value.toFixed(1)} ${fieldUnits[key]}`;
      }
      
      // Para otros valores
      if (typeof value === 'object' && value !== null) {
        return Array.isArray(value) 
          ? `Array (${value.length})`
          : value.id 
            ? `ID: ${value.id}` 
            : 'Ver detalles';
      }
      
      return value.toString();
    };
    
    // Renderizar un campo individual
    const renderField = (key) => {
      if (!activity[key] && activity[key] !== 0) return null;
      return (
        <div key={key} className="border border-neutral-800 rounded-lg py-1.5 px-2 sm:px-3 inline-flex flex-col">
          <span className="text-neutral-400 text-xs">{getFieldLabel(key, activity.sport_type)}</span>
          <span className="text-white font-semibold mt-0.5 text-sm sm:text-base">
            {formatValueWithUnit(key, activity[key])}
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
        activity[key] !== undefined &&
        activity[key] !== null &&
        activity[key] !== '' &&
        // Ignorar campos con valor 0 a menos que sean clave
        (activity[key] !== 0 || key === 'distance' || key === 'moving_time' || key === 'elapsed_time')
      );
    
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
                    <div className="text-xs text-neutral-300 flex items-center">
                      ⬆️ TheVAM
                      <span 
                        className="ml-1 text-neutral-400 cursor-help"
                        title="TheVAM (Velocidad de Ascenso Media) puede calcularse de dos formas: 
1) Simple: utiliza el desnivel total y tiempo total
2) Preciso: solo considera segmentos de subida significativa"
                      >
                        ⓘ
                      </span>
                    </div>
                    <div className="text-orange-400 font-bold text-lg">
                      {loadingVam ? (
                        <span className="text-neutral-300">Calculando...</span>
                      ) : displayVam ? (
                        <>
                          <span>{formatVAM(displayVam, displayClimbTime, displayClimbMeters)}</span>
                          <span className="ml-1 text-xs bg-green-600/20 text-green-400 px-1 py-0.5 rounded">Preciso</span>
                        </>
                      ) : (
                        <>
                          <span>{calculateVAM(activity.total_elevation_gain, activity.moving_time)} m/h</span>
                          <span className="ml-1 text-xs bg-neutral-700/40 text-neutral-400 px-1 py-0.5 rounded">Simple</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Botón para añadir comentario */}
                <div className="ml-auto">
                  <button
                    className={`px-3 py-1.5 rounded text-sm font-medium ${
                      loadingVam || (!displayVam && activity.sport_type === 'TrailRun')
                        ? 'bg-neutral-600 cursor-not-allowed'
                        : 'bg-orange-600 hover:bg-orange-700'
                    } text-white transition-colors`}
                    disabled={loadingVam || (!displayVam && activity.sport_type === 'TrailRun')}
                    onClick={async (e) => {
                      e.stopPropagation();
                      
                      // Si estamos cargando o no tenemos VAM preciso para Trail Run, no permitir el comentario
                      if (loadingVam || (!displayVam && activity.sport_type === 'TrailRun')) {
                        alert('Por favor espera a que se calcule el VAM preciso antes de añadir un comentario.');
                        return;
                      }
                      
                      try {
                        // Llamar al endpoint para añadir comentario
                        const response = await fetch('/api/strava/add-comment', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            activityId: activity.id,
                            userId: userId || (activity.athlete?.id)
                          }),
                        });
                        
                        const result = await response.json();
                        
                        if (result.updated) {
                          // Si tenemos datos actualizados de VAM, actualizar el estado local
                          if (result.vam && result.climbTime && result.climbMeters) {
                            setPreciseVamData({
                              vam: result.vam,
                              climbTime: result.climbTime,
                              climbMeters: result.climbMeters
                            });
                          }
                          
                          alert(
                            'Comentario añadido correctamente.\n\n' +
                            `TheVAM usado: ${result.vam} m/h (cálculo preciso que solo considera segmentos de subida).`
                          );
                        } else {
                          alert('Error al añadir comentario: ' + (result.reason || result.error || 'Error desconocido'));
                        }
                        
                        console.log('Resultado de añadir comentario:', result);
                      } catch (error) {
                        console.error('Error al añadir comentario:', error);
                        alert('Error al añadir comentario: ' + error.message);
                      }
                    }}
                  >
                    💬 Añadir comentario
                  </button>
                </div>
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
            <button
              className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'segmentos' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}
              onClick={() => setActiveTab('segmentos')}
            >
              Segmentos
            </button>
            {hasPhotos && (
              <button
                className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'fotos' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}
                onClick={() => setActiveTab('fotos')}
              >
                Imágenes/Videos
              </button>
            )}
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
                
                {/* Estadísticas cardíacas */}
                <div className="mb-4">
                  <h3 className="text-sm text-neutral-400 mb-1">Frecuencia Cardíaca</h3>
                  <div className="flex flex-wrap gap-2">
                    {fieldGroups.cardio.filter(key => availableFields.includes(key)).map(key => renderField(key))}
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
                
                {/* Otros datos */}
                {fieldGroups.others.some(key => availableFields.includes(key)) && (
                  <div className="mb-4">
                    <h3 className="text-sm text-neutral-400 mb-1">Datos adicionales</h3>
                    <div className="flex flex-wrap gap-2">
                      {fieldGroups.others.filter(key => availableFields.includes(key)).map(key => renderField(key))}
                    </div>
                  </div>
                )}
                
                {/* Campos adicionales que no están en ningún grupo */}
                {extraFields.length > 0 && (
                  <div>
                    <h3 className="text-sm text-neutral-400 mb-1">Otros datos</h3>
                    <div className="flex flex-wrap gap-2">
                      {extraFields.map(key => renderField(key))}
                    </div>
                  </div>
                )}
              </>
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
                              className="w-full h-auto object-cover"
                            />
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
                  <div className="h-full w-full bg-neutral-800 flex items-center justify-center">
                    <div className="text-neutral-400">
                      La actividad indica que tiene fotos, pero no pudimos obtenerlas.
                      Puedes verlas directamente en Strava.
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Pestaña de Segmentos */}
            {activeTab === 'segmentos' && (
              <div className="h-full w-full">
                {loadingSegments ? (
                  <div className="h-full w-full bg-neutral-800 flex items-center justify-center">
                    <div className="text-neutral-400">Cargando segmentos...</div>
                  </div>
                ) : segments.length > 0 ? (
                  <div className="p-2">
                    <h3 className="text-sm text-neutral-400 mb-2">Segmentos completados en esta actividad</h3>
                    <div className="space-y-3">
                      {segments.map((segment, index) => (
                        <div key={index} className="bg-neutral-800 border border-neutral-700 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-white">{segment.segment.name}</h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-1 text-sm">
                                <div>
                                  <span className="text-neutral-400">Distancia:</span>{' '}
                                  <span className="text-white">{formatDistance(segment.segment.distance)}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-400">Desnivel:</span>{' '}
                                  <span className="text-white">
                                    {formatElevation(segment.segment.elevation_high - segment.segment.elevation_low)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-neutral-400">Tiempo:</span>{' '}
                                  <span className="text-white">{formatDuration(segment.elapsed_time)}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-400">
                                    {activity.sport_type === 'Run' || activity.sport_type === 'TrailRun' ? 'Ritmo:' : 'Velocidad:'}
                                  </span>{' '}
                                  <span className="text-white">
                                    {activity.sport_type === 'Run' || activity.sport_type === 'TrailRun' 
                                      ? formatPace(segment.segment.distance / segment.elapsed_time) 
                                      : formatSpeed(segment.segment.distance / segment.elapsed_time)}
                                  </span>
                                </div>
                                {segment.segment.average_grade && (
                                  <div>
                                    <span className="text-neutral-400">Pendiente:</span>{' '}
                                    <span className="text-white">{segment.segment.average_grade.toFixed(1)}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="ml-2 text-right">
                              {segment.pr_rank === 1 && (
                                <div className="text-yellow-400 font-bold flex items-center">
                                  <span className="mr-1">🏆</span> PR
                                </div>
                              )}
                              {segment.achievements && segment.achievements.length > 0 && segment.pr_rank !== 1 && (
                                <div className="text-orange-400 font-medium">
                                  {segment.pr_rank ? `#${segment.pr_rank}` : '🏅'}
                                </div>
                              )}
                            </div>
                          </div>
                          {segment.segment.activity_type && (
                            <div className="text-xs text-neutral-500 mt-1">
                              Tipo: {segment.segment.activity_type}
                              {segment.segment.city && ` • ${segment.segment.city}`}
                              {segment.segment.state && `, ${segment.segment.state}`}
                            </div>
                          )}
                          <div className="text-xs mt-2">
                            <a 
                              href={`https://www.strava.com/segments/${segment.segment.id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-orange-400 hover:underline"
                            >
                              Ver segmento en Strava →
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full bg-neutral-800 flex items-center justify-center">
                    <div className="text-neutral-400 p-4 text-center">
                      No hay segmentos en esta actividad o no tienes permisos para verlos.
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