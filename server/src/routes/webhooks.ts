import { Router } from 'express';
import { supabase } from '../supabase';
import { syncActivities, syncStreams } from '../utils/sync';
import { purgeUserAccount } from '../utils/deleteAccount';

const router = Router();

router.get('/webhooks/strava', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === expectedToken) {
        console.log('Webhook verified successfully');
        res.json({ 'hub.challenge': challenge });
    } else {
        console.error('Webhook verification failed');
        res.sendStatus(403);
    }
});

router.post('/webhooks/strava', async (req, res) => {
    res.status(200).send('EVENT_RECEIVED');

    const { object_type, aspect_type, object_id, owner_id, updates } = req.body;

    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('strava_athlete_id', owner_id)
        .single();

    if (!user) {
        console.log(`No matching user for strava_athlete_id ${owner_id}, ignoring event`);
        return;
    }

    // Deauthorization
    if (object_type === 'athlete' && updates?.authorized === 'false') {
        console.log(`User ${user.id} deauthorized Stryde via Strava directly, purging account per API Policy §7.4`);
        const result = await purgeUserAccount(user.id);
        if (!result.success) {
            console.error(`Failed to purge user ${user.id} after deauthorization:`, result.error);
        }
        return;
    }

    if (object_type !== 'activity') {
        return;
    }

    console.log(`Webhook event: ${aspect_type} activity ${object_id} for user ${user.id}`);

    if (aspect_type === 'create' || aspect_type === 'update') {
        try {
            await syncActivities(user);
            await syncStreams(user);
            console.log(`Synced new/updated activity for user ${user.id}`);
        } catch (err) {
            console.error(`Webhook-triggered sync failed for user ${user.id}:`, err);
        }
    }

    if (aspect_type === 'delete') {
        const { error } = await supabase
            .from('activities')
            .delete()
            .eq('user_id', user.id)
            .eq('strava_id', object_id);

        if (error) {
            console.error(`Failed to delete activity ${object_id} for user ${user.id}:`, error);
        } else {
            console.log(`Deleted activity ${object_id} for user ${user.id}`);
        }
    }
});

export default router;