import express from 'express';
import { Database } from '../database';
import axios from 'axios';
import qs from 'querystring';

const router = express.Router();
const db = new Database();

// Real Garmin OAuth2 endpoints
router.get('/garmin', (req, res) => {
  const state = `state_${Date.now()}`;
  const authorizeUrl = process.env.GARMIN_OAUTH_AUTHORIZE_URL || '';
  const clientId = process.env.GARMIN_CLIENT_ID || '';
  const redirectUri = process.env.GARMIN_REDIRECT_URI || '';
  const scope = (process.env.GARMIN_SCOPES || 'read,write').replace(/\s+/g, '');

  const url = `${authorizeUrl}?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
  res.redirect(url);
});

router.get('/garmin/callback', async (req, res) => {
  try {
    const { code } = req.query as { code?: string };
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }
    const tokenUrl = process.env.GARMIN_OAUTH_TOKEN_URL || '';
    const clientId = process.env.GARMIN_CLIENT_ID || '';
    const clientSecret = process.env.GARMIN_CLIENT_SECRET || '';
    const redirectUri = process.env.GARMIN_REDIRECT_URI || '';

    // Exchange code for tokens
    const tokenResp = await axios.post(tokenUrl, qs.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, refresh_token, expires_in } = tokenResp.data;

    // Fetch user info
    const userInfoUrl = process.env.GARMIN_USERINFO_URL || '';
    const userInfoResp = await axios.get(userInfoUrl, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const garminUserId = userInfoResp.data?.userId || userInfoResp.data?.id || `garmin_${Date.now()}`;

    let user = await db.getUserByGarminId(garminUserId);
    if (!user) {
      const userId = await db.createUser({
        garminUserId,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()
      });
      user = await db.getUserById(userId);
    } else {
      await db.updateUserTokens(
        user.id,
        access_token,
        refresh_token,
        new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()
      );
      user = await db.getUserById(user.id);
    }

    res.json({ success: true, user });

  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Token refresh endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const tokenUrl = process.env.GARMIN_OAUTH_TOKEN_URL || '';
    const clientId = process.env.GARMIN_CLIENT_ID || '';
    const clientSecret = process.env.GARMIN_CLIENT_SECRET || '';

    const tokenResp = await axios.post(tokenUrl, qs.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    res.json({ success: true, ...tokenResp.data });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

export { router as authRoutes };
