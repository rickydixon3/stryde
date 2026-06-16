import { Router } from 'express';
import { supabase } from '../supabase';

const router = Router();

// NEED TO IMPLEMENT JWT SYNCING

router.get('/sync', async (req, res) => {
    const {data: user, error } = await supabase
        .from('users')
        .select('*')
        .single();

        let accessToken = user.access_token;

        // if token expired, refresh token
        if (new Date() > new Date(user.token_expires_at)) {
            const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({
                    client_id: process.env.STRAVA_CLIENT_ID,
                    client_secret: process.env.STRAVA_CLIENT_SECRET,
                    refresh_token: user.refresh_token,
                    grant_type: 'refresh_token'
                })
            });

            const tokens = await tokenResponse.json();

            const result = await supabase
                .from('users')
                .update({
                    access_token: tokens.access_token,
                    token_expires_at: new Date(tokens.expires_at * 1000),
                    refresh_token: tokens.refresh_token
                })
                .eq('id', user.id)

            accessToken = tokens.access_token;
        }

        let page = 1;
        let activities: any[] = [];

        while (true) {
            const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
    
            activities = await response.json();
            if (activities.length == 0) break;
    
            // types of runs to filter
            // only want runs in database
            const runningTypes = ['Run', 'TrailRun', 'VirtualRun', 'Treadmill'];
    
            // pulling only running activities
            const runs = activities.filter(activity => 
                runningTypes.includes(activity.sport_type)
            );
    
            for (const run of runs) {
                // inserting values into activities table
                const {error: insertError } = await supabase.from('activities').upsert({
                    //column           //row
                    user_id: user.id,
                    strava_id: run.id,
                    name: run.name,
                    distance: run.distance,
                    duration: run.moving_time,
                    start_date: run.start_date,
                    average_speed: run.average_speed,
                    average_heartrate: run.average_heartrate,
                    average_cadence: run.average_cadence,
                    suffer_score: run.suffer_score,
                    start_lat: run.start_latlng[0] ?? null,// lattiude, longitude,index 0 = lat
                    start_lng: run.start_latlng[1] ?? null, // longitude, lattiude,index 1 = long, saftey check for treadmill
                    device_name: run.device_name,
                    sport_type: run.sport_type
                    // Skips insertion for values already in table (no duplicates)
                }, { onConflict: 'strava_id'}); // Every run has a specific id, checks if run in table
                
                if (insertError) {
                    console.log('Insert error:', insertError.message);
                }
            }
            page++;
        }

        res.json( {message: 'sync complete'})
});

export default router