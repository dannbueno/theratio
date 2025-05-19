import { NextResponse } from 'next/server';
import { getValidAccessToken, calculatePreciseVAM } from '../../../../lib/strava.js';

// Mark as dynamic to avoid caching
export const dynamic = 'force-dynamic';

// Endpoint to calculate precise VAM without adding a comment
export async function POST(request) {
  try {
    console.log('Iniciando cálculo de VAM preciso');
    // Get request data
    const data = await request.json();
    const { activityId, userId } = data;
    
    if (!activityId || !userId) {
      console.log('Faltan parámetros: activityId o userId');
      return NextResponse.json({ 
        error: 'activityId and userId are required' 
      }, { status: 400 });
    }

    console.log(`Calculando VAM preciso para actividad ${activityId} del usuario ${userId}`);

    // Get valid access token for the user
    const accessToken = await getValidAccessToken(userId);

    // If no token, we can't proceed
    if (!accessToken) {
      console.error('No access token found for user:', userId);
      return NextResponse.json({ error: 'Token not found' }, { status: 400 });
    }

    // Get activity details
    console.log(`Obteniendo detalles de la actividad ${activityId}`);
    const activityResponse = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!activityResponse.ok) {
      console.error('Error fetching activity details:', await activityResponse.text());
      return NextResponse.json({ error: 'Error fetching activity' }, { status: 500 });
    }

    const activityDetails = await activityResponse.json();
    
    // Only process Trail Run or Run activities with elevation
    if ((activityDetails.sport_type === 'TrailRun' || activityDetails.sport_type === 'Run') && 
        activityDetails.total_elevation_gain > 0) {
      
      console.log(`Actividad elegible para VAM preciso: ${activityDetails.name} (${activityDetails.sport_type})`);
      console.log(`Elevación total: ${activityDetails.total_elevation_gain}m`);
      
      // Calculate precise VAM
      console.log('Obteniendo streams y calculando VAM preciso...');
      const vamData = await calculatePreciseVAM(activityId, accessToken);
      
      if (vamData && vamData.vam) {
        console.log(`VAM preciso calculado: ${vamData.vam} m/h (${Math.round(vamData.climbMeters)}m / ${vamData.climbTime}s)`);
        // Return the VAM data
        return NextResponse.json(vamData);
      } else {
        console.log('No se pudo calcular el VAM preciso');
        return NextResponse.json({ 
          vam: null, 
          reason: 'Could not calculate precise VAM' 
        });
      }
    } else {
      console.log(`Actividad no elegible para VAM preciso: ${activityDetails.name} (${activityDetails.sport_type})`);
      console.log(`Elevación total: ${activityDetails.total_elevation_gain}m`);
      
      return NextResponse.json({ 
        vam: null, 
        reason: 'Activity type not processable or has no elevation' 
      });
    }
  } catch (error) {
    console.error('Error calculating VAM:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
} 