import axios, { AxiosInstance } from 'axios';

export interface GarminWorkoutSegment {
  durationType: 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'rest';
  duration: number; // seconds
  targetType: 'power' | 'heartRate' | 'cadence' | 'speed';
  targetValue: number; // percentage (0-1) or absolute
  targetZone?: number;
}

export interface GarminWorkoutPayload {
  workoutName: string;
  sportType: string;
  workoutSegments: GarminWorkoutSegment[];
  description?: string;
}

export class GarminService {
  private api: AxiosInstance;

  constructor() {
    const baseURL = process.env.GARMIN_BASE_URL || 'https://apis.garmin.com';
    this.api = axios.create({ baseURL });
  }

  getAuthorizeUrl(state: string): string {
    const authorizeUrl = process.env.GARMIN_OAUTH_AUTHORIZE_URL || '';
    const clientId = process.env.GARMIN_CLIENT_ID || '';
    const redirectUri = process.env.GARMIN_REDIRECT_URI || '';
    const scope = (process.env.GARMIN_SCOPES || 'read,write').replace(/\s+/g, '');
    return `${authorizeUrl}?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
  }

  async exchangeCodeForToken(code: string) {
    const tokenUrl = process.env.GARMIN_OAUTH_TOKEN_URL || '';
    const clientId = process.env.GARMIN_CLIENT_ID || '';
    const clientSecret = process.env.GARMIN_CLIENT_SECRET || '';
    const redirectUri = process.env.GARMIN_REDIRECT_URI || '';

    const params = new URLSearchParams();
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    params.set('redirect_uri', redirectUri);
    params.set('client_id', clientId);
    params.set('client_secret', clientSecret);

    const resp = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return resp.data;
  }

  async refreshAccessToken(refreshToken: string) {
    const tokenUrl = process.env.GARMIN_OAUTH_TOKEN_URL || '';
    const clientId = process.env.GARMIN_CLIENT_ID || '';
    const clientSecret = process.env.GARMIN_CLIENT_SECRET || '';

    const params = new URLSearchParams();
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', refreshToken);
    params.set('client_id', clientId);
    params.set('client_secret', clientSecret);

    const resp = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return resp.data;
  }

  async getUserInfo(accessToken: string) {
    const userInfoUrl = process.env.GARMIN_USERINFO_URL || '';
    const resp = await this.api.get(userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return resp.data;
  }

  async getActivities(accessToken: string, startDateIso?: string, endDateIso?: string) {
    // Endpoint path may vary based on Garmin APIs you enable
    const activitiesEndpoint = '/wellness-api/rest/activities';
    const resp = await this.api.get(activitiesEndpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        startDate: startDateIso,
        endDate: endDateIso,
      }
    });
    return resp.data;
  }

  async createWorkout(accessToken: string, workout: GarminWorkoutPayload) {
    // Convert our normalized segments into Garmin format if needed
    const endpoint = '/wellness-api/rest/workouts';
    const resp = await this.api.post(endpoint, workout, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    return resp.data; // expected to include workoutId
  }

  async scheduleWorkout(accessToken: string, garminWorkoutId: string, calendarDateIso: string) {
    const endpoint = `/wellness-api/rest/workouts/${encodeURIComponent(garminWorkoutId)}/schedule`;
    const resp = await this.api.post(endpoint, { date: calendarDateIso }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    return resp.data;
  }
}

export default new GarminService();

