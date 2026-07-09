import { supabase } from '../supabase';

// Gets a valid token whether access token is expired or not
export const getValidAccessToken = async (user) => {
    if (!user.access_token || !user.refresh_token) {
        throw new Error('User has no Strava connection (disconnected or never connected)');
    }

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

        return tokens.access_token;
    }
    return user.access_token;
}
