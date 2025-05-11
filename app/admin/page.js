'use client';

import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/sessions');
        
        if (!response.ok) {
          throw new Error('Error al cargar las sesiones');
        }
        
        const data = await response.json();
        setSessions(data.sessions);
        setStats(data.stats);
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessions();
  }, []);
  
  // Formateador de fechas
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };
  
  return (
    <main className="min-h-screen bg-neutral-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Panel de Administración</h1>
        <p className="text-neutral-400 mb-8">Registro de sesiones de usuarios</p>
        
        {loading ? (
          <div className="bg-neutral-800 rounded-xl p-8 text-center text-white">
            Cargando datos...
          </div>
        ) : error ? (
          <div className="bg-red-900/30 border border-red-700 text-red-200 p-6 rounded-xl">
            {error}
          </div>
        ) : (
          <>
            {/* Estadísticas */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-neutral-800 p-6 rounded-xl">
                  <h2 className="text-lg font-medium text-white mb-2">Total de usuarios</h2>
                  <p className="text-3xl font-bold text-orange-400">{stats.totalUsers}</p>
                </div>
                
                {stats.lastLogin && (
                  <div className="bg-neutral-800 p-6 rounded-xl">
                    <h2 className="text-lg font-medium text-white mb-2">Último login</h2>
                    <p className="text-xl font-medium text-orange-400">{stats.lastLogin.name}</p>
                    <p className="text-neutral-400 text-sm">{formatDate(stats.lastLogin.timestamp)}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Tabla de sesiones */}
            <div className="bg-neutral-800 rounded-xl overflow-hidden">
              <h2 className="text-xl font-medium text-white p-6 border-b border-neutral-700">
                Sesiones de usuario
              </h2>
              
              {sessions.length === 0 ? (
                <div className="p-6 text-center text-neutral-400">
                  No hay sesiones registradas
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-neutral-700/50">
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">
                          Usuario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">
                          Fecha
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-700">
                      {sessions.map((session) => (
                        <tr key={session.id} className="hover:bg-neutral-700/30">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {session.profile && (
                                <img
                                  src={session.profile}
                                  alt={session.name}
                                  className="h-8 w-8 rounded-full mr-3"
                                />
                              )}
                              <div className="text-sm font-medium text-white">
                                {session.name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-400">
                            {session.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-400">
                            {formatDate(session.timestamp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
        
        <div className="mt-8 text-center">
          <a href="/" className="text-orange-400 hover:text-orange-300">
            Volver a la página principal
          </a>
        </div>
      </div>
    </main>
  );
} 