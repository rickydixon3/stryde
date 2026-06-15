// Handling Strava Authentication
import { Router } from 'express';
import { supabase } from '../supabase';
import dotenv from 'dotenv'

dotenv.config();

const router = Router();

router.get('/strava', (req, res) => {

    // Constructing url to stravas authentification page
    const baseURL = 'https://www.strava.com/oauth/authorize';
    const clientID = process.env.STRAVA_CLIENT_ID;
    const redirectURI = 'http://localhost:3000/auth/strava/callback';
    const responseType = 'code';
    const scope =  'activity:read_all,profile:read_all'

    const authURL = `${baseURL}?client_id=${clientID}&redirect_uri=${redirectURI}&response_type=${responseType}&scope=${scope}`;

    res.redirect(authURL);

})

router.get('/strava/callback', async (req, res) => {
    const code = req.query.code;

    // Getting tokens from stravas servers
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

    console.log('Supabase URL:', process.env.SUPABASE_URL);
    // Parsing through user info via token response (json)
    const { data, error } = await supabase.from('users').insert({
        // column           value

        strava_athlete_id: tokens.athlete.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(tokens.expires_at * 1000),
        firstname: tokens.athlete.firstname,
        lastname: tokens.athlete.lastname,
        created_at: new Date()
    });

    if (error) {
        res.status(500).json({ error: error.message});
    } else {
        res.json({ message: 'success '});
    }

});

export default router;