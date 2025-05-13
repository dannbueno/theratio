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
    vam: 'VAM',
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

  // Formatear VAM para mostrar
  const formatVAM = (vam, climbTime = null, climbMeters = null) => {
    if (climbTime && climbMeters) {
      const climbTimeMinutes = Math.round(climbTime / 60);
      return `${vam} m/h (${Math.round(climbMeters)}m en ${climbTimeMinutes}min efectivos)`;
    }
    return `${vam} m/h`;
  };

  // Modal component
  const ActivityModal = ({ activity, onClose }) => {
    const modalRef = useRef(null);
    const [isTakingScreenshot, setIsTakingScreenshot] = useState(false);
    const [showCopyNotification, setShowCopyNotification] = useState(false);
    const [activeTab, setActiveTab] = useState('datos');
    const [activityStreams, setActivityStreams] = useState({
      polyline: [],
      distance: [],
      altitude: [],
      heartrate: [],
      time: []
    });
    const [loading, setLoading] = useState(false);
    const [activityMedia, setActivityMedia] = useState([]);
    const [hasMedia, setHasMedia] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const token = searchParams.get('token');
    
    // Cerrar modal con la tecla ESC
    useEffect(() => {
      const handleEscKey = (event) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };
      
      window.addEventListener('keydown', handleEscKey);
      
      return () => {
        window.removeEventListener('keydown', handleEscKey);
      };
    }, [onClose]);
    
    // Verificar si la actividad tiene fotos o videos
    useEffect(() => {
      if (activity && token) {
        console.log('Verificando media, foto_count:', activity.photo_count, 'total_photo_count:', activity.total_photo_count);
        
        // Verificar si hay fotos disponibles (photo_count o total_photo_count > 0)
        const hasPhotos = (activity.photo_count > 0 || activity.total_photo_count > 0);
        
        // Verificar si hay videos (verificando si existe la propiedad video_url)
        const hasVideos = !!activity.video_url;
        
        setHasMedia(hasPhotos || hasVideos);
        console.log('hasMedia:', hasPhotos || hasVideos, 'hasPhotos:', hasPhotos, 'hasVideos:', hasVideos);
        
        // Si tiene fotos o videos y estamos en la pestaña de media, cargarlos
        if ((hasPhotos || hasVideos) && activeTab === 'media') {
          const fetchActivityMedia = async () => {
            setLoading(true);
            try {
              let mediaItems = [];
              
              // Cargar fotos si están disponibles
              if (hasPhotos) {
                console.log('Fetching photos for activity:', activity.id);
                const response = await fetch(`https://www.strava.com/api/v3/activities/${activity.id}/photos?size=600`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                  console.error('Error fetching photos, status:', response.status);
                  throw new Error('Failed to fetch activity photos');
                }
                
                const data = await response.json();
                console.log('Photos fetched:', data.length);
                
                // Añadir tipo para diferenciar entre fotos y videos
                const photosWithType = data.map(photo => ({...photo, type: 'photo'}));
                mediaItems = [...photosWithType];
              }
              
              // Añadir videos si están disponibles
              if (hasVideos && activity.video_url) {
                console.log('Adding video:', activity.video_url);
                const videoMedia = {
                  type: 'video',
                  url: activity.video_url,
                  caption: 'Video de la actividad'
                };
                
                mediaItems = [...mediaItems, videoMedia];
              }
              
              setActivityMedia(mediaItems);
              console.log('Media items set:', mediaItems.length);
            } catch (error) {
              console.error('Error fetching activity media:', error);
              setActivityMedia([]);
            } finally {
              setLoading(false);
            }
          };
          
          fetchActivityMedia();
        }
      }
    }, [activity, token, activeTab]);
    
    // Cargar streams de datos cuando el usuario cambia a la pestaña de mapa o gráficos
    useEffect(() => {
      // Solo cargar si estamos en el cliente, en la pestaña de mapa o gráficos y no tenemos datos
      if (
        typeof window !== 'undefined' && 
        (activeTab === 'mapa' || activeTab === 'graficos') && 
        activityStreams.polyline.length === 0 && 
        !loading && 
        activity && 
        token
      ) {
        const fetchActivityStreams = async () => {
          setLoading(true);
          try {
            // Obtener datos del polilinea y otros streams
            const response = await fetch(`https://www.strava.com/api/v3/activities/${activity.id}/streams?keys=latlng,distance,altitude,heartrate,time&key_by_type=true`, {
              headers: { 'Authorization': `Bearer ${token}` }
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
    }, [activeTab, activityStreams.polyline.length, loading, activity, token]);
    
    // Cerrar visor de imágenes con tecla ESC
    useEffect(() => {
      const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
          if (selectedImage) {
            setSelectedImage(null);
          } else {
            onClose();
          }
        } else if (event.key === 'ArrowLeft' && selectedImage) {
          // Navegar a la imagen anterior
          navigateImages(-1);
        } else if (event.key === 'ArrowRight' && selectedImage) {
          // Navegar a la imagen siguiente
          navigateImages(1);
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [onClose, selectedImage, activityMedia]);
    
    // Función para navegar entre imágenes
    const navigateImages = (direction) => {
      // Filtrar solo las fotos (no los videos)
      const photoMedia = activityMedia.filter(media => media.type === 'photo');
      if (photoMedia.length <= 1) return;
      
      // Encontrar el índice actual
      let currentIndex = -1;
      
      if (selectedImageIndex >= 0 && selectedImageIndex < photoMedia.length) {
        // Usar el índice que ya teníamos guardado
        currentIndex = selectedImageIndex;
      } else {
        // Intentar encontrar la imagen por URL (método de respaldo)
        currentIndex = photoMedia.findIndex(media => {
          if (!selectedImage.urls || !media.urls) return false;
          
          // Comprobar cualquier tamaño de URL disponible
          for (const size in selectedImage.urls) {
            if (selectedImage.urls[size] === media.urls[size]) {
              return true;
            }
          }
          
          // Si no hay coincidencia por URLs, comparar por URL directa
          return selectedImage.url && media.url && selectedImage.url === media.url;
        });
      }
      
      if (currentIndex === -1) return;
      
      // Calcular nuevo índice con wrap-around
      let newIndex = (currentIndex + direction) % photoMedia.length;
      if (newIndex < 0) newIndex = photoMedia.length - 1;
      
      // Establecer nueva imagen seleccionada
      setSelectedImage(photoMedia[newIndex]);
      setSelectedImageIndex(newIndex);
      
      console.log(`Navegando de imagen ${currentIndex} a ${newIndex}. Total: ${photoMedia.length}`);
    };
    
    // Función para abrir el visor de imágenes
    const openImageViewer = (media, index) => {
      // Filtrar solo las fotos para asegurarnos de que el índice es correcto
      const photoMedia = activityMedia.filter(media => media.type === 'photo');
      
      // Si se proporciona índice, usarlo
      if (index !== undefined) {
        setSelectedImage(media);
        
        // Verificar que el índice está dentro del rango de fotos
        if (index >= 0 && index < photoMedia.length) {
          setSelectedImageIndex(index);
        } else {
          // Encontrar el índice correcto si el proporcionado no es válido
          const correctIndex = photoMedia.findIndex(m => 
            (media.urls && m.urls && Object.keys(media.urls).some(size => media.urls[size] === m.urls[size])) ||
            (media.url && m.url && media.url === m.url)
          );
          setSelectedImageIndex(correctIndex !== -1 ? correctIndex : 0);
        }
      } else {
        // Si no se proporciona índice, buscar la imagen en el array
        setSelectedImage(media);
        const mediaIndex = photoMedia.findIndex(m => 
          (media.urls && m.urls && Object.keys(media.urls).some(size => media.urls[size] === m.urls[size])) ||
          (media.url && m.url && media.url === m.url)
        );
        setSelectedImageIndex(mediaIndex !== -1 ? mediaIndex : 0);
      }
      
      console.log(`Abriendo imagen en índice ${selectedImageIndex}. Total fotos: ${photoMedia.length}`);
    };
    
    // Propiedades para VAM preciso
    const [climbData, setClimbData] = useState({
      climbTime: null,
      climbMeters: null,
      isPreciseVAM: false
    });
    
    // Función para obtener datos precisos de VAM si es posible
    const fetchPreciseVAMData = async () => {
      if (!(activity.sport_type === 'TrailRun' || activity.sport_type === 'Run') ||
          !activity.total_elevation_gain || activity.total_elevation_gain <= 0) {
        return;
      }
      
      try {
        // Intentar obtener los streams para calcular VAM preciso
        const streamsResponse = await fetch(`https://www.strava.com/api/v3/activities/${activity.id}/streams?keys=altitude,distance,time&key_by_type=true`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!streamsResponse.ok) {
          console.log('No se pudieron obtener datos de streams para VAM preciso');
          return;
        }
        
        const streams = await streamsResponse.json();
        
        // Verificar que tenemos todos los datos necesarios
        if (!streams.altitude || !streams.distance || !streams.time) {
          console.log('Faltan streams necesarios para el cálculo preciso de VAM');
          return;
        }
        
        const altitudes = streams.altitude.data;
        const distances = streams.distance.data;
        const times = streams.time.data;
        
        // Variables para acumular datos de subidas
        let totalClimbTime = 0;
        let totalClimbMeters = 0;
        let inClimbSegment = false;
        let segmentStartIndex = 0;
        let currentClimbMeters = 0;
        
        // Identificar segmentos de subida (pendiente > 2%)
        for (let i = 1; i < altitudes.length; i++) {
          const altitudeDiff = altitudes[i] - altitudes[i-1];
          const distanceDiff = distances[i] - distances[i-1];
          
          // Calcular pendiente en porcentaje
          const gradient = distanceDiff > 0 ? (altitudeDiff / distanceDiff) * 100 : 0;
          
          // Si es una subida significativa
          if (gradient >= 2 && altitudeDiff > 0) {
            if (!inClimbSegment) {
              // Inicio de un nuevo segmento de subida
              inClimbSegment = true;
              segmentStartIndex = i-1;
              currentClimbMeters = 0;
            }
            // Acumular metros ascendidos
            currentClimbMeters += altitudeDiff;
          } else if (inClimbSegment) {
            // Fin de un segmento de subida
            if (currentClimbMeters >= 10) {
              // Solo considerar segmentos con desnivel mínimo (10m)
              const segmentTime = times[i-1] - times[segmentStartIndex];
              totalClimbTime += segmentTime;
              totalClimbMeters += currentClimbMeters;
            }
            inClimbSegment = false;
          }
        }
        
        // Comprobar si estamos en un segmento de subida al final de la actividad
        if (inClimbSegment && currentClimbMeters >= 10) {
          const segmentTime = times[times.length-1] - times[segmentStartIndex];
          totalClimbTime += segmentTime;
          totalClimbMeters += currentClimbMeters;
        }
        
        // Actualizar el estado si tenemos datos válidos
        if (totalClimbTime > 0 && totalClimbMeters > 0) {
          setClimbData({
            climbTime: totalClimbTime,
            climbMeters: totalClimbMeters,
            isPreciseVAM: true
          });
          
          // Añadir datos precisos a la actividad
          activity.climbTime = totalClimbTime;
          activity.climbMeters = totalClimbMeters;
          activity.vam = calculateVAM(null, null, totalClimbTime, totalClimbMeters);
        } else {
          // Usar VAM estándar si no hay datos precisos
          activity.vam = calculateVAM(activity.total_elevation_gain, activity.moving_time);
        }
      } catch (error) {
        console.error('Error obteniendo datos precisos de VAM:', error);
      }
    };
    
    // Calcular VAM al abrir el modal
    useEffect(() => {
      if (activity && 
          (activity.sport_type === 'TrailRun' || activity.sport_type === 'Run') && 
          activity.total_elevation_gain > 0) {
        
        // Intentar obtener datos precisos
        fetchPreciseVAMData();
        
        // Mientras tanto, calcular VAM estándar
        const standardVAM = calculateVAM(activity.total_elevation_gain, activity.moving_time);
        
        // Asignar VAM estándar mientras no tengamos el preciso
        if (!activity.vam) {
          activity.vam = standardVAM;
        }
      }
    }, [activity]);
    
    if (!activity) return null;
    
    const takeScreenshot = async () => {
      if (!modalRef.current) return;
      
      try {
        setIsTakingScreenshot(true);
        
        const modalContent = modalRef.current;
        const canvas = await html2canvas(modalContent, {
          backgroundColor: '#171717', // color negro para el fondo
          scale: 2, // mejor calidad
          logging: false
        });
        
        // Preparar la imagen para descarga
        const imageData = canvas.toDataURL('image/png');
        
        try {
          // Intentar copiar al portapapeles
          if (navigator.clipboard && window.ClipboardItem) {
            // Obtener el blob para el portapapeles
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            
            try {
              await navigator.clipboard.write([
                new ClipboardItem({
                  [blob.type]: blob
                })
              ]);
              // Mostrar notificación
              setShowCopyNotification(true);
              setTimeout(() => setShowCopyNotification(false), 2000);
            } catch (clipboardError) {
              console.error('Error al copiar al portapapeles:', clipboardError);
              // Si falla la copia, ofrecer descarga
              offerDownload(imageData);
            }
          } else {
            // Si no hay soporte para clipboard API, ofrecer descarga
            offerDownload(imageData);
          }
        } catch (err) {
          console.error('Error general:', err);
          offerDownload(imageData);
        }
      } catch (error) {
        console.error('Error al capturar la pantalla:', error);
      } finally {
        setIsTakingScreenshot(false);
      }
    };
    
    // Función para ofrecer descarga cuando el portapapeles falla
    const offerDownload = (dataUrl) => {
      const fileName = `${activity.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.png`;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Mostrar mensaje
      setShowCopyNotification(true);
      setTimeout(() => setShowCopyNotification(false), 2000);
    };
    
    // Lista de claves a ocultar
    const hiddenFields = [
      'id', 'start_date_local', 'timezone', 'utc_offset', 'location_city', 'location_state', 'location_country',
      'achievement_count', 'trainer', 'commute', 'manual', 'private', 'visibility', 'flagged', 'gear_id',
      'start_latlng', 'end_latlng', 'device_watts', 'heartrate_opt_out', 'display_hide_heartrate_option',
      'upload_id', 'upload_id_str', 'external_id', 'from_accepted_tag', 'pr_count', 'has_kudoed',
      'resource_state', 'athlete',
      'workout_type', 'kudos_count', 'comment_count', 'athlete_count', 'map',
      'type',
      'has_heartrate', 'kilojoules',
      'photo_count', 'total_photo_count',
      // Ocultar campos redundantes que ya se muestran en la cabecera
      'name', 'start_date',
      // Ocultar sport_type ya que lo mostraremos en la cabecera
      'sport_type'
    ];
    
    // Orden preferido de los campos
    const fieldOrder = [
      // Datos principales (alta prioridad)
      'distance',
      'moving_time',
      'elapsed_time',
      'total_elevation_gain',
      'average_speed',
      'max_speed',
      'average_heartrate',
      'max_heartrate',
      // Datos secundarios
      'average_cadence',
      'average_watts',
      'max_watts',
      'weighted_average_watts',
      'suffer_score',
      'calories',
      'average_temp',
      'elev_high',
      'elev_low',
      // Datos menos relevantes
      'start_latitude',
      'start_longitude',
      'end_latitude',
      'end_longitude',
    ];
    
    // Agrupar campos por categorías
    const fieldGroups = {
      primary: ['distance', 'moving_time', 'elapsed_time', 'total_elevation_gain'],
      performance: ['average_speed', 'max_speed', 'average_heartrate', 'max_heartrate', 'average_cadence'],
      secondary: ['average_watts', 'weighted_average_watts', 'max_watts'],
      elevation: ['elev_high', 'elev_low', 'suffer_score', 'average_temp', 'calories'],
      coordinates: ['start_latitude', 'start_longitude', 'end_latitude', 'end_longitude']
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
        activity[key] !== undefined
      );
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
        <div
          className="bg-neutral-900 rounded-2xl shadow-2xl p-4 sm:p-5 w-full sm:max-w-4xl sm:w-[620px] relative text-white max-h-[95vh] overflow-y-auto"
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
            <div className="flex items-center gap-2">
              <button
                className="text-neutral-300 hover:text-white text-xl flex items-center justify-center focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  takeScreenshot();
                }}
                disabled={isTakingScreenshot}
                aria-label="Capturar pantalla"
              >
                {isTakingScreenshot ? '⏳' : '📷'}
              </button>
              <button
                className="text-2xl text-neutral-400 hover:text-white focus:outline-none"
                onClick={onClose}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
          </div>
          
          {showCopyNotification && (
            <div className="absolute top-12 right-4 sm:right-12 mt-1 bg-green-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
              Imagen guardada
            </div>
          )}
          
          {/* Ratio de elevación destacado para actividades TrailRun */}
          {activity.sport_type === 'TrailRun' && (
            <div className="mb-3 p-2 bg-gradient-to-r from-orange-900/40 to-transparent border border-orange-800/50 rounded-lg">
              <div className="text-xs text-neutral-300">Ratio de desnivel</div>
              <div className="text-orange-400 font-bold text-lg">
                {formatElevationRatio(activity.total_elevation_gain, activity.distance)} m+/km
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
            {hasMedia && (
              <button
                className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'media' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}
                onClick={() => setActiveTab('media')}
              >
                Fotos
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
            
            {/* Pestaña de Mapa - manteniendo el mismo ancho y altura */}
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
            
            {/* Pestaña de Gráficos - manteniendo el mismo ancho y altura */}
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
            
            {/* Pestaña de Media - fotos/videos */}
            {activeTab === 'media' && hasMedia && (
              <div className="h-full w-full">
                {loading ? (
                  <div className="h-full w-full bg-neutral-800 flex items-center justify-center">
                    <div className="text-neutral-400">Cargando contenido multimedia...</div>
                  </div>
                ) : (
                  <div className="h-full w-full overflow-y-auto">
                    {activityMedia.length === 0 ? (
                      <div className="h-full w-full bg-neutral-800 flex items-center justify-center text-neutral-400">
                        No se encontró contenido multimedia para esta actividad
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm text-neutral-400">Contenido multimedia ({activityMedia.length})</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activityMedia.map((media, index) => (
                            <div key={index} className="rounded-lg overflow-hidden bg-neutral-800 hover:brightness-110 transition-all">
                              {media.type === 'photo' ? (
                                <>
                                  <div 
                                    className="cursor-pointer h-[220px] sm:h-[320px] overflow-hidden" 
                                    onClick={() => openImageViewer(media, index)}
                                  >
                                    {/* Imagen ajustada a altura óptima */}
                                    <img 
                                      src={media.urls ? (media.urls['600'] || media.urls['1000']) : media.url} 
                                      alt={`Foto ${index + 1} de la actividad`} 
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                  {media.caption && (
                                    <div className="p-1 text-xs text-neutral-300 truncate">
                                      {media.caption}
                                    </div>
                                  )}
                                </>
                              ) : media.type === 'video' && (
                                <div className="h-[220px] sm:h-[320px] overflow-hidden">
                                  {/* Video ajustado a altura óptima */}
                                  {media.url.includes('youtube') ? (
                                    <iframe
                                      src={media.url.replace('watch?v=', 'embed/')}
                                      title="Video de la actividad"
                                      className="w-full h-full"
                                      allowFullScreen
                                      frameBorder="0"
                                    ></iframe>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-neutral-700">
                                      <a 
                                        href={media.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="px-3 py-1 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                      >
                                        Ver video
                                      </a>
                                    </div>
                                  )}
                                  {media.caption && (
                                    <div className="p-1 text-xs text-neutral-300 truncate">
                                      {media.caption}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Visor de imágenes a pantalla completa */}
          {selectedImage && (
            <div 
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-pointer"
              onClick={() => setSelectedImage(null)}
            >
              <div 
                className="relative max-w-[95vw] max-h-[95vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={selectedImage.urls ? (selectedImage.urls['1000'] || selectedImage.urls['600']) : selectedImage.url} 
                  alt="Foto de la actividad" 
                  className="max-w-full max-h-[95vh] object-contain"
                />
                {selectedImage.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-3 text-white">
                    {selectedImage.caption}
                  </div>
                )}
                <button 
                  className="absolute top-2 right-2 bg-black/60 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/80 focus:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(null);
                  }}
                >
                  <span className="text-2xl">×</span>
                </button>
                
                {/* Botones de navegación */}
                {activityMedia.filter(m => m.type === 'photo').length > 1 && (
                  <>
                    <button 
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/60 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:bg-black/80 focus:outline-none z-50 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        navigateImages(-1);
                      }}
                    >
                      <span className="text-2xl sm:text-3xl">&lsaquo;</span>
                    </button>
                    <button 
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/60 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:bg-black/80 focus:outline-none z-50 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        navigateImages(1);
                      }}
                    >
                      <span className="text-2xl sm:text-3xl">&rsaquo;</span>
                    </button>
                    
                    {/* Indicador de imagen actual */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-sm z-50">
                      {selectedImageIndex + 1} / {activityMedia.filter(m => m.type === 'photo').length}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
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
              onClick={() => window.location.href = '/'}
            >
              Volver
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
              <div className="flex-1 w-full grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-2 items-center text-center sm:ml-2">
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
                <div>
                  <span className="block text-neutral-400 text-xs">
                    {(activity.sport_type === 'TrailRun' || activity.sport_type === 'Run') && activity.total_elevation_gain > 0
                      ? 'VAM' 
                      : 'Esfuerzo'}
                  </span>
                  <span className="block text-base sm:text-lg font-semibold text-white">
                    {(activity.sport_type === 'TrailRun' || activity.sport_type === 'Run') && activity.total_elevation_gain > 0
                      ? calculateVAM(activity.total_elevation_gain, activity.moving_time, activity.climbTime, activity.climbMeters)
                      : activity.suffer_score || 'N/A'}
                    {(activity.sport_type === 'TrailRun' || activity.sport_type === 'Run') && activity.total_elevation_gain > 0 && (
                      <span className="text-xs text-neutral-300"> m/h</span>
                    )}
                    {activity.climbTime && activity.climbMeters && (
                      <span className="text-[9px] block text-green-400/80">Subida efectiva</span>
                    )}
                  </span>
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