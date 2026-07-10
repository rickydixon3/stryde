import { supabase } from '../supabase'
import { getValidAccessToken } from './strava'
import { computeRunEfficiency } from '../signals/runEfficiency';
import { computeBaselines } from './baselines';
import { computeRunDrift } from '../signals/cardiacDrift';
import { computeTrimp } from '../signals/trimp';

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
    const { data: currentUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!currentUser || currentUser.resting_hr === null || currentUser.max_hr === null) {
        console.log(`syncStreams: skipping for user ${user.id}, resting_hr/max_hr not set yet (onboarding incomplete)`);
        return;
    }

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const accessToken = await getValidAccessToken(currentUser);

    const { data: recentActivities } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('start_date', sixtyDaysAgo.toISOString());

    const { data: allActivities } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', currentUser.id);

    const baselines = computeBaselines(allActivities ?? []);

    for (const activity of recentActivities) {
        const response = await fetch(`https://www.strava.com/api/v3/activities/${activity.strava_id}/streams?keys=time,heartrate,cadence,velocity_smooth,altitude&key_by_type=true`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const streamData = await response.json();

        const activityWithStream = {
            ...activity,
            stream: {
                time: streamData.time?.data ?? null,
                heartrate: streamData.heartrate?.data ?? null,
                cadence: streamData.cadence?.data ?? null,
                velocity: streamData.velocity_smooth?.data ?? null,
                altitude: streamData.altitude?.data ?? null,
            },
        };

        const efResult = computeRunEfficiency(
            activityWithStream,
            currentUser.resting_hr,
            currentUser.max_hr,
            baselines
        );

        const driftResult = computeRunDrift(
            activityWithStream,
            currentUser.resting_hr,
            currentUser.max_hr
        );

        const trimpScore = computeTrimp(activity, currentUser.resting_hr, currentUser.max_hr);

        const updatePayload: Record<string, number | string | null> = {
            ef_value: null,
            effort_level: null,
            drift_percent: null,
            drift_flag: null,
            ef_first_half: null,
            ef_last_half: null,
            trimp_score: null,
        };

        if (efResult.viable) {
            updatePayload.ef_value = efResult.efValue;
            updatePayload.effort_level = efResult.effortLevel;
        }

        if (driftResult.viable) {
            updatePayload.drift_percent = driftResult.drift;
            updatePayload.drift_flag = driftResult.flag;
            updatePayload.ef_first_half = driftResult.efFirstHalf;
            updatePayload.ef_last_half = driftResult.efLastHalf;
        }

        if (trimpScore !== null) {
            updatePayload.trimp_score = trimpScore;
        }

        await supabase
            .from('activities')
            .update(updatePayload)
            .eq('id', activity.id);
    }
}