import { supabase } from '../supabase'
import { getValidAccessToken } from './strava'

export const syncActivities = async (user: any) => {
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

        const runningTypes = ['Run', 'TrailRun', 'VirtualRun', 'Treadmill'];
        const runs = activities.filter(activity =>
            runningTypes.includes(activity.sport_type)
        );

        for (const run of runs) {
            const { error: insertError } = await supabase.from('activities').upsert({
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
                start_lat: run.start_latlng[0] ?? null,
                start_lng: run.start_latlng[1] ?? null,
                device_name: run.device_name,
                sport_type: run.sport_type
            }, { onConflict: 'strava_id' });

            if (insertError) {
                console.log('Insert error:', insertError.message);
            }
        }
        page++;
    }
}

export const syncStreams = async (user: any) => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const accessToken = await getValidAccessToken(user);

    const { data: recentActivities } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_date', sixtyDaysAgo.toISOString());

    for (const activity of recentActivities) {
        const response = await fetch(`https://www.strava.com/api/v3/activities/${activity.strava_id}/streams?keys=time,heartrate,cadence,velocity_smooth,altitude&key_by_type=true`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const streamData = await response.json();
        
        await supabase.from('activity_streams').upsert({
            activity_id: activity.id,
            time: streamData.time?.data ?? null,
            heartrate: streamData.heartrate?.data ?? null,
            cadence: streamData.cadence?.data ?? null,
            velocity: streamData.velocity_smooth?.data ?? null,
            altitude: streamData.altitude?.data ?? null
        }, { onConflict: 'activity_id' });
    }

    const { data: staleActivities } = await supabase
        .from('activities')
        .select('id')
        .eq('user_id', user.id)
        .lt('start_date', sixtyDaysAgo.toISOString());

    const staleActivityIds = staleActivities.map(a => a.id);

    if (staleActivityIds.length > 0) {
        const { error: deleteError } = await supabase
            .from('activity_streams')
            .delete()
            .in('activity_id', staleActivityIds);

        if (deleteError) {
            console.log('Prune error:', deleteError.message);
        }
    }
}