// Handling Strava Authentication
import { Router } from 'express';

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
    res.json(tokens);

})

export default router;