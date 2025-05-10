'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function DashboardContent() {
  const searchParams = useSearchParams();
  const [activities, setActivities] = useState([]);
  const [athleteName, setAthleteName] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryTab, setSummaryTab] = useState('30d');
  const token = searchParams.get('token');

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
    elev_high: 'Altitud máxima',
    elev_low: 'Altitud mínima',
    start_latitude: 'Latitud inicio',
    start_longitude: 'Longitud inicio',
    end_latitude: 'Latitud fin',
    end_longitude: 'Longitud fin',
    sport_type: 'Deporte',
    average_temp: 'Temperatura Media',
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
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // Helper para obtener el inicio de la semana (lunes)
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // lunes como inicio
    return new Date(d.setDate(diff));
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
    } else if (range === '30d') {
      from = new Date(now);
      from.setDate(now.getDate() - 30);
    }
    return activities.filter(a => new Date(a.start_date) >= from);
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
        setActivities(data);
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

  // Modal component
  const ActivityModal = ({ activity, onClose }) => {
    if (!activity) return null;
    // Lista de claves a ocultar
    const hiddenFields = [
      'id', 'start_date_local', 'timezone', 'utc_offset', 'location_city', 'location_state', 'location_country',
      'achievement_count', 'trainer', 'commute', 'manual', 'private', 'visibility', 'flagged', 'gear_id',
      'start_latlng', 'end_latlng', 'device_watts', 'heartrate_opt_out', 'display_hide_heartrate_option',
      'upload_id', 'upload_id_str', 'external_id', 'from_accepted_tag', 'pr_count', 'total_photo_count', 'has_kudoed',
      'resource_state', 'athlete',
      'workout_type', 'kudos_count', 'comment_count', 'athlete_count', 'photo_count', 'map',
      'type',
      'has_heartrate', 'kilojoules'
    ];
    // Helper para detectar y formatear fechas ISO
    const isIsoDate = (val) => typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val);
    const formatDateField = (val) => {
      const d = new Date(val);
      const pad = (n) => n.toString().padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    };
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
        <div
          className="bg-neutral-900 rounded-2xl shadow-2xl p-8 max-w-lg w-full relative text-white"
          onClick={e => e.stopPropagation()}
        >
          <button
            className="absolute top-4 right-4 text-2xl text-neutral-400 hover:text-white focus:outline-none"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{getIcon(activity.type)}</span>
            <h2 className="text-2xl font-bold">{activity.name}</h2>
          </div>
          <div className="text-neutral-400 text-sm mb-6">{formatDate(activity.start_date)}</div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {Object.entries(activity)
              .filter(([key]) => !hiddenFields.includes(key))
              .map(([key, value]) => (
                <div key={key} className="flex justify-between border-b border-neutral-800 py-1 text-sm">
                  <span className="capitalize text-neutral-400">{getFieldLabel(key, activity.sport_type)}</span>
                  <span className="text-white font-medium">
                    {typeof value === 'object' && value !== null
                      ? Array.isArray(value)
                        ? `Array (${value.length})`
                        : value.id
                          ? `ID: ${value.id}`
                          : 'Ver detalles'
                      : key === 'sport_type'
                        ? (sportTypeLabels[value] || value)
                        : key === 'distance'
                          ? formatDistance(value)
                          : (key === 'moving_time' || key === 'elapsed_time')
                            ? formatHMS(value)
                            : key === 'average_speed' && (activity.sport_type === 'Run' || activity.sport_type === 'TrailRun')
                              ? formatPace(value)
                              : key === 'max_speed' && (activity.sport_type === 'Run' || activity.sport_type === 'TrailRun')
                                ? formatPace(value)
                                : isIsoDate(value)
                                  ? formatDateField(value)
                                  : (value === null || value === undefined)
                                    ? '—'
                                    : value.toString()}
                  </span>
                </div>
              ))}
            
            {activity.sport_type === 'TrailRun' && (
              <div className="flex justify-between border-b border-neutral-800 py-1 text-sm">
                <span className="capitalize text-neutral-400">Ratio de desnivel</span>
                <span className="text-white font-medium">
                  {formatElevationRatio(activity.total_elevation_gain, activity.distance)} m+/km
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
        <div
          className="bg-neutral-900 rounded-2xl shadow-2xl p-8 max-w-lg w-full relative text-white max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <button
            className="absolute top-4 right-4 text-2xl text-neutral-400 hover:text-white focus:outline-none"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
          <h2 className="text-2xl font-bold mb-4">Resumen</h2>
          <div className="flex gap-2 mb-6">
            {Object.entries(ranges).map(([key, label]) => (
              <button
                key={key}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${tab === key ? 'bg-orange-500 text-white' : 'bg-white/10 text-orange-200 hover:bg-orange-600/30'}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <div><b>Resumen por deporte:</b></div>
            {Object.keys(statsBySport).length === 0 && <div className="text-neutral-400 text-sm">No hay actividades en este periodo.</div>}
            {Object.entries(statsBySport).map(([sport, stats]) => (
              <div key={sport} className="border-b border-neutral-800 py-2 text-sm">
                <div className="font-semibold mb-1">{sportTypeLabels[sport] || sport}</div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 mb-1">
                  <div><span className="text-neutral-400">Duración:</span> <span className="font-semibold">{formatHMS(stats.duration)}</span></div>
                  {sport !== 'WeightTraining' && <div><span className="text-neutral-400">Km totales:</span> <span className="font-semibold">{stats.km.toFixed(2)}</span></div>}
                  {sport !== 'WeightTraining' && <div><span className="text-neutral-400">Desnivel total:</span> <span className="font-semibold">{stats.elevation.toFixed(0)} m</span></div>}
                  <div><span className="text-neutral-400">Nº actividades:</span> <span className="font-semibold">{stats.count}</span></div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-orange-200">
                  <span className="font-semibold">Media:</span>
                  <div><span className="text-neutral-400">Duración:</span> <span className="font-semibold">{formatHMS(Math.round(stats.duration / stats.count))}</span></div>
                  {sport !== 'WeightTraining' && <div><span className="text-neutral-400">Km:</span> <span className="font-semibold">{(stats.km / stats.count).toFixed(2)}</span></div>}
                  {sport !== 'WeightTraining' && <div><span className="text-neutral-400">Desnivel:</span> <span className="font-semibold">{(stats.elevation / stats.count).toFixed(0)} m</span></div>}
                  {sport === 'Run' || sport === 'TrailRun' ? (
                    <div>
                      <span className="text-neutral-400">Ritmo medio:</span>
                      <span className="font-semibold">{formatPaceShort((stats.km * 1000) / stats.duration)} min/km</span>
                    </div>
                  ) : (
                    sport !== 'WeightTraining' && (
                      <div>
                        <span className="text-neutral-400">Vel. media:</span>
                        <span className="font-semibold">{formatSpeedShort((stats.km * 1000) / stats.duration)} km/h</span>
                      </div>
                    )
                  )}
                  {sport === 'TrailRun' && (
                    <div>
                      <span className="text-neutral-400">Ratio medio:</span>
                      <span className="font-semibold">{formatElevationRatio(stats.elevation, stats.km * 1000)} m+/km</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="mt-4 flex justify-between border-b border-neutral-800 py-1 text-sm">
              <span><b>Tiempo total entrenado:</b></span>
              <span className="font-semibold">{formatHMS(totalTime)}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-800 py-1 text-sm">
              <span><b>Desnivel positivo total:</b></span>
              <span className="font-semibold">{totalElevation.toFixed(0)} m</span>
            </div>
            <div className="flex justify-between border-b border-neutral-800 py-1 text-sm">
              <span><b>Entreno medio diario:</b></span>
              <span className="font-semibold">{formatHMS(Math.round(totalTime / days))}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Bloquear scroll del body cuando el modal de resumen está abierto
  useEffect(() => {
    if (showSummary) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSummary]);

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
          <div className="flex items-center gap-4">
            <button
              className="bg-white/10 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/20 transition-colors"
              onClick={() => setShowSummary(true)}
            >
              Resumen
            </button>
            <button
              className="bg-white/10 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/20 transition-colors"
              onClick={() => window.location.href = '/'}
            >
              Volver al inicio
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="bg-neutral-800 rounded-xl shadow-md px-6 py-3 flex items-center border border-neutral-700 hover:border-orange-400 transition-all cursor-pointer"
              onClick={() => setSelectedActivity(activity)}
            >
              <div className="flex items-center gap-3 min-w-[260px] max-w-[260px]">
                <span className="text-2xl md:text-3xl flex-shrink-0">{getIcon(activity.sport_type || activity.type)}</span>
                <div className="flex flex-col min-w-0">
                  <div
                    className="text-lg md:text-xl font-bold text-white leading-tight truncate cursor-pointer"
                    title={activity.name}
                  >
                    {activity.name.length > 28 ? activity.name.slice(0, 28) + '…' : activity.name}
                  </div>
                  <div className="text-neutral-400 text-xs md:text-sm truncate">{formatDate(activity.start_date)}</div>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-x-4 gap-y-1 items-center text-center ml-2">
                <div>
                  <span className="block text-neutral-400 text-xs">Distancia</span>
                  <span className="block text-lg font-semibold text-white">{formatDistanceShort(activity.distance)} km</span>
                </div>
                <div>
                  <span className="block text-neutral-400 text-xs">Duración</span>
                  <span className="block text-lg font-semibold text-white">{formatDuration(activity.moving_time)}</span>
                </div>
                <div>
                  <span className="block text-neutral-400 text-xs">Elevación</span>
                  <span className="block text-lg font-semibold text-white">{Math.round(activity.total_elevation_gain)}<span className="text-xs text-neutral-300"> m</span></span>
                </div>
                <div>
                  <span className="block text-neutral-400 text-xs">{activity.sport_type === 'Run' || activity.sport_type === 'TrailRun' ? 'Ritmo medio' : 'V. media'}</span>
                  <span className="block text-lg font-semibold text-white">
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
                  <span className="block text-lg font-semibold text-white">
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
                <div>
                  <span className="block text-neutral-400 text-xs">Esfuerzo Relativo</span>
                  <span className="block text-lg font-semibold text-white">{activity.suffer_score || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <ActivityModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
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