import { Router } from 'express';
import { supabase } from '../supabase';
import jwt from 'jsonwebtoken';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { syncActivities, syncStreams } from '../utils/sync';
import { getValidAccessToken } from '../utils/strava';

const router = Router();

router.get('/strava', (req, res) => {
    const baseURL = 'https://www.strava.com/oauth/authorize';
    const clientID = process.env.STRAVA_CLIENT_ID;
    const redirectURI = `${process.env.BACKEND_URL}/auth/strava/callback`;
    const responseType = 'code';
    const scope =  'activity:read_all,profile:read_all'

    const authURL = `${baseURL}?client_id=${clientID}&redirect_uri=${redirectURI}&response_type=${responseType}&scope=${scope}`;

    res.redirect(authURL);
})

router.get('/strava/callback', async (req, res) => {
    const code = req.query.code;

    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code'
        })
    });

    const tokens = await tokenResponse.json();

    const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('strava_athlete_id', tokens.athlete.id);

        let data, error, userId;

    if (existingUser.length === 0) {
        const result = await supabase.from('users').insert({
            strava_athlete_id: tokens.athlete.id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: new Date(tokens.expires_at * 1000),
            firstname: tokens.athlete.firstname,
            lastname: tokens.athlete.lastname,
            profile_picture_url: tokens.athlete.profile_medium,
            created_at: new Date(),
            sync_status: 'syncing',
        }).select().single();

        data = result.data;
        error = result.error;
        userId = data?.id;

        if (data) {
            // Fire-and-forget on the HTTP response (the redirect below doesn't
            // wait for this), but the sync_status column lets the frontend
            // poll /auth/me and know when it's actually done, rather than
            // rendering the dashboard against a partially-synced account.
            syncActivities(data)
                .then(() => syncStreams(data))
                .then(() =>
                    supabase.from('users').update({ sync_status: 'idle' }).eq('id', userId)
                )
                .catch((err) => {
                    console.error('Initial sync failed:', err);
                    supabase.from('users').update({ sync_status: 'error' }).eq('id', userId);
                });
        }

    } else {
        const result = await supabase
            .from('users')
            .update({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expires_at: new Date(tokens.expires_at * 1000),
                profile_picture_url: tokens.athlete.profile_medium,
            })
            .eq('strava_athlete_id', tokens.athlete.id)
            .select()
            .single();
            data = result.data;
            error = result.error;

            if (!existingUser || existingUser.length === 0) {
                return res.status(500).json({ error: 'Expected existing user but found none' });
            }
            userId = existingUser[0].id;
    }

    if (error) {
        return res.status(500).json({ error: error.message});
    }

    const appToken = jwt.sign(
        { userId: userId },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
    );

    res.redirect(`${process.env.FRONTEND_URL}/callback?token=${appToken}`);
});

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { data: user, error } = await supabase
        .from('users')
        .select('onboarding_complete, firstname, lastname, profile_picture_url, sync_status')
        .eq('id', req.userId)
        .single();

    if (error || !user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
});

router.post('/onboarding', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { restingHr, maxHr } = req.body;

    if (!maxHr) {
        return res.status(400).json({ error: 'maxHr is required' });
    }

    const { data: user, error } = await supabase
        .from('users')
        .update({
            resting_hr: restingHr ?? null,
            max_hr: maxHr,
            onboarding_complete: true
        })
        .eq('id', req.userId)
        .select()
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    if (user) {
        syncStreams(user).catch((err) => {
            console.error('Post-onboarding syncStreams failed:', err);
        });
    }

    res.json(user);
});

router.delete('/delete-account', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.userId)
        .single();

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    try {
        const accessToken = await getValidAccessToken(user);
        await fetch('https://www.strava.com/oauth/revoke', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
    } catch (err) {
        console.log('Strava revoke error:', err);
    }

    // Step 2: delete stream data first (child rows before parent).
    const { data: activities } = await supabase
        .from('activities')
        .select('id')
        .eq('user_id', req.userId);

    const activityIds = activities?.map(a => a.id) ?? [];

    if (activityIds.length > 0) {
        await supabase
            .from('activity_streams')
            .delete()
            .in('activity_id', activityIds);
    }

    await supabase
        .from('activities')
        .delete()
        .eq('user_id', req.userId);

    const { error: userDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', req.userId);

    if (userDeleteError) {
        return res.status(500).json({ error: 'Failed to delete account', details: userDeleteError.message });
    }

    res.json({ message: 'Your account and all associated data have been permanently deleted.' });
});

router.post('/disconnect', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.userId)
        .single();

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    try {
        const accessToken = await getValidAccessToken(user);
        await fetch('https://www.strava.com/oauth/revoke', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
    } catch (err) {
        console.log('Strava revoke error:', err);
        return res.status(500).json({ error: 'Failed to disconnect from Strava' });
    }

    await supabase
        .from('users')
        .update({ access_token: null, refresh_token: null, token_expires_at: null })
        .eq('id', req.userId);

    res.json({ message: 'Disconnected from Strava. Your training history is still saved.' });
});

router.patch('/hr-settings', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { restingHr, maxHr } = req.body;

    if (!maxHr || !restingHr || restingHr >= maxHr) {
        return res.status(400).json({ error: 'Invalid resting/max heart rate values' });
    }

    const { data: user, error } = await supabase
        .from('users')
        .update({ resting_hr: restingHr, max_hr: maxHr })
        .eq('id', req.userId)
        .select()
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(user);
});

export default router;