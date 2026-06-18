import { Router } from 'express';
import { supabase } from '../supabase';
import { getValidAccessToken } from '../utils/strava';
import { computeACWR } from "../signals/acwr";
import { computeConsecutiveHardDays } from '../signals/consecutiveHardDays';
import { checkCalibration, computeBaselines } from '../signals/../utils/baselines';

const router = Router();

// NEED TO IMPLEMENT JWT SYNCING

// SYNCING ACTIVITIES
router.get('/sync', async (req, res) => {
    const {data: user, error } = await supabase
        .from('users')
        .select('*')
        .single();

        const accessToken = await getValidAccessToken(user);

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

// SYNCING ACTIVITY STREAMS

// gets array of activities within 60 days
router.get('/sync-streams', async (req, res) => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60); // 60 days ago

    const {data: user} = await supabase
        .from('users')
        .select('*')
        .single();

    const accessToken = await getValidAccessToken(user);

    const { data: recentActivities, error } = await supabase
        .from('activities')
        .select('*')
        .gte('start_date', sixtyDaysAgo.toISOString());

        for (const activity of recentActivities) {

            const response = await fetch(`https://www.strava.com/api/v3/activities/${activity.strava_id}/streams?keys=heartrate,cadence,velocity_smooth,altitude&key_by_type=true`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            const streamData = await response.json();

            const { data: stream } = await supabase.from('activity_streams').upsert({
                // row        column
                activity_id: activity.id,
                heartrate: streamData.heartrate?.data ?? null,
                cadence: streamData.cadence?.data ?? null,
                velocity: streamData.velocity_smooth?.data ?? null,
                altitude: streamData.altitude?.data ?? null
            },  { onConflict: 'activity_id'});
        }
        res.json({ message: 'streams synced' })
});

// Route to test Acute Chronic Workload Ratio algoritihmn
router.get('/test-acwr', async (req, res) => {
    const { data: activities } = await supabase
        .from('activities')
        .select('*');
    
    const result = computeACWR(activities);
    res.json(result);
});

// Route to test Consecutive Hard Day Detection
router.get('/test-chdd', async (req, res) => {
    const { data: activities } = await supabase
        .from('activities')
        .select('*');
    
    const result = computeConsecutiveHardDays(activities);
    res.json(result);
});

// Route to test calibrations and baselines
router.get('/test-baselines', async (req, res) => {
    const { data: activities } = await supabase.from('activities').select('*');
    const calibration = checkCalibration(activities);
    const baselines = computeBaselines(activities);
    res.json({ calibration, baselines });
});

// Route to test Single Session Spike
import { computeSingleSessionSpike } from '../signals/singleSessionSpike';

router.get('/test-spike', async (req, res) => {
    const { data: activities } = await supabase
        .from('activities')
        .select('*');
    
    const result = computeSingleSessionSpike(activities);
    res.json(result);
});

export default router