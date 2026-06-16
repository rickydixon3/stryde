import { Router } from 'express';
import { supabase } from '../supabase';

const router = Router();

router.get('/sync', async (req, res) => {
    const {data: user, error } = await supabase
        .from('users')
        .select('*')
        .single();

        // retrieving access token from user
        // WILL NEED TO EDIT LATER FOR JWT
        const accessToken = user.access_token;

        const response = await fetch('https://www.strava.com/api/v3/athlete/activities', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const activities = await response.json();

        // types of runs to filter
        const runningTypes = ['Run', 'TrailRun', 'VirtualRun', 'Treadmill'];

        const runs = activities.filter(activity => 
            runningTypes.includes(activity.sport_type)
        );

        for (const run of runs) {
            // inserting values into activities table

            console.log('Total activities from Strava:', activities.length);
            console.log('Runs after filter:', runs.length);
            const {error: insertError } = await supabase.from('activities').insert({
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
                start_lat: run.start_latlng[0], // lattiude, longitude so index 0
                start_lng: run.start_latlng[1], // longitude, lattiude so index 1
                device_name: run.device_name,
                sport_type: run.sport_type
            });

            if (insertError) {
                console.log('Insert error:', insertError.message);
                break;
            }
        }

        res.json( {message: 'sync complete'})
});

export default router