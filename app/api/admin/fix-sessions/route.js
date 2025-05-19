import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import postgres from '../../../../lib/postgres';

// Asegurar que se ejecuta dinámicamente para cada solicitud
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const athleteId = cookieStore.get('strava_athlete_id')?.value;
    const token = cookieStore.get('strava_access_token')?.value;
    
    // Si no hay ID de atleta o token, no podemos continuar
    if (!athleteId || !token) {
      return NextResponse.json({ 
        error: 'No hay sesión activa', 
        success: false 
      }, { status: 401 });
    }
    
    // Obtener datos del atleta desde Strava
    const stravaResponse = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!stravaResponse.ok) {
      return NextResponse.json({ 
        error: 'Error obteniendo datos del atleta desde Strava', 
        success: false,
        status: stravaResponse.status
      }, { status: 500 });
    }
    
    const athlete = await stravaResponse.json();
    
    // Actualizar directamente en la tabla sessions sin usar la función savePgSession
    try {
      const currentTime = new Date();
      const query = `
        INSERT INTO sessions (id, name, profile, timestamp)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) 
        DO UPDATE SET name = $2, profile = $3, timestamp = $4
        RETURNING *;
      `;
      
      const params = [
        athlete.id,
        `${athlete.firstname} ${athlete.lastname}`,
        athlete.profile || '',
        currentTime
      ];
      
      console.log('Forzando actualización para:', params);
      
      const result = await postgres.query(query, params);
      
      // Verificar si la inserción/actualización fue exitosa
      if (result.rows && result.rows.length > 0) {
        // También actualizar tabla strava_tokens para mantener last_auth
        try {
          const tokenQuery = `
            UPDATE strava_tokens 
            SET updated_at = NOW() 
            WHERE athlete_id = $1
            RETURNING athlete_id, updated_at;
          `;
          
          const tokenResult = await postgres.query(tokenQuery, [athlete.id]);
          console.log('Token actualizado:', tokenResult.rows[0]);
        } catch (tokenError) {
          console.error('Error actualizando token:', tokenError);
        }
        
        // Comprobar datos actualizados
        const checkQuery = `SELECT * FROM sessions WHERE id = $1`;
        const checkResult = await postgres.query(checkQuery, [athlete.id]);
        
        return NextResponse.json({
          success: true,
          message: 'Sesión actualizada correctamente',
          timestamp: currentTime,
          updated: result.rows[0],
          verification: checkResult.rows[0]
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'No se pudo actualizar la sesión',
          query: { text: query, params }
        }, { status: 500 });
      }
    } catch (dbError) {
      console.error('Error en la base de datos:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Error en la base de datos',
        message: dbError.message,
        stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error general:', error);
    return NextResponse.json({
      success: false,
      error: 'Error general',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 