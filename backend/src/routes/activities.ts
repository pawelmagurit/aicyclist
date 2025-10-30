import express from 'express';
import { Database } from '../database';
import garminService from '../services/garmin';

const router = express.Router();
const db = new Database();

// Mock Garmin activities data generator
function generateMockActivities(userId: string, count: number = 20) {
  const activities = [];
  const sportTypes = ['cycling'];
  const baseDate = new Date();
  
  for (let i = 0; i < count; i++) {
    const activityDate = new Date(baseDate.getTime() - (i * 24 * 60 * 60 * 1000));
    const sportType = 'cycling';
    
    // Generate realistic cycling data
    const duration = 1800 + Math.random() * 7200; // 30-150 minutes
    const distance = sportType === 'cycling' ? duration * 0.4 : duration * 0.15; // km
    const avgPower = sportType === 'cycling' ? 150 + Math.random() * 100 : undefined;
    const avgHR = 120 + Math.random() * 60;
    const tss = sportType === 'cycling' ? Math.max(10, Math.round(((duration / 3600) * ((avgPower || 160) / 200) * 100))) : 0;
    
    activities.push({
      id: `activity_${i}`,
      userId,
      activityId: `garmin_${Date.now()}_${i}`,
      activityName: `${sportType.charAt(0).toUpperCase() + sportType.slice(1)} Workout ${i + 1}`,
      sportType,
      startTime: activityDate.toISOString(),
      duration: Math.round(duration),
      distance: Math.round(distance * 100) / 100,
      calories: Math.round(200 + Math.random() * 800),
      averagePower: avgPower ? Math.round(avgPower) : undefined,
      normalizedPower: avgPower ? Math.round(avgPower * (0.95 + Math.random() * 0.1)) : undefined,
      averageHeartRate: Math.round(avgHR),
      maxHeartRate: Math.round(avgHR + 20 + Math.random() * 30),
      averageCadence: sportType === 'cycling' ? Math.round(80 + Math.random() * 20) : undefined,
      tss: tss,
      intensityFactor: Math.round(((tss / 100) / (duration / 3600)) * 100) / 100,
      rawData: JSON.stringify({
        activityId: `garmin_${Date.now()}_${i}`,
        activityName: `${sportType.charAt(0).toUpperCase() + sportType.slice(1)} Workout ${i + 1}`,
        sportType,
        startTime: activityDate.toISOString(),
        duration: Math.round(duration),
        distance: Math.round(distance * 100) / 100,
        calories: Math.round(200 + Math.random() * 800),
        metrics: {
          averagePower: avgPower ? Math.round(avgPower) : undefined,
          normalizedPower: avgPower ? Math.round(avgPower * (0.95 + Math.random() * 0.1)) : undefined,
          averageHeartRate: Math.round(avgHR),
          maxHeartRate: Math.round(avgHR + 20 + Math.random() * 30),
          averageCadence: sportType === 'cycling' ? Math.round(80 + Math.random() * 20) : undefined,
          tss: tss,
          intensityFactor: Math.round(((tss / 100) / (duration / 3600)) * 100) / 100
        }
      })
    });
  }
  
  return activities;
}

// GET /api/activities - Fetch user activities
router.get('/', async (req, res) => {
  try {
    const { userId, limit = '50', sportType } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    let activities: any[] = await db.getActivitiesByUserId(userId as string, parseInt(limit as string));

    if (activities.length === 0) {
      // Development fallback: return mock activities without persisting
      activities = generateMockActivities(userId as string, parseInt(limit as string));
    }

    // Normalize DB rows (snake_case) to API (camelCase)
    const normalized = activities.map((a: any) => ({
      id: a.id,
      userId: a.userId || a.user_id,
      activityId: a.activityId || a.activity_id,
      activityName: a.activityName || a.activity_name,
      sportType: (a.sportType || a.sport_type || 'cycling').toLowerCase(),
      startTime: a.startTime || a.start_time,
      duration: a.duration ?? 0,
      distance: a.distance ?? 0,
      calories: a.calories ?? 0,
      averagePower: a.averagePower ?? a.average_power ?? null,
      normalizedPower: a.normalizedPower ?? a.normalized_power ?? null,
      averageHeartRate: a.averageHeartRate ?? a.average_heart_rate ?? null,
      maxHeartRate: a.maxHeartRate ?? a.max_heart_rate ?? null,
      averageCadence: a.averageCadence ?? a.average_cadence ?? null,
      tss: a.tss ?? null,
      intensityFactor: a.intensityFactor ?? a.intensity_factor ?? null
    }));

    // Filter by sport type if specified
    let filtered = normalized;
    if (sportType) {
      filtered = normalized.filter(activity => activity.sportType === sportType);
    }

    // Calculate summary statistics
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const within7d = filtered.filter(a => {
      const d = new Date(a.startTime);
      return !isNaN(d.valueOf()) && d >= sevenDaysAgo && d <= now;
    });
    const cyclingActivities = filtered.filter(a => a.sportType === 'cycling');
    const summary = {
      totalActivities: filtered.length,
      cyclingActivities: cyclingActivities.length,
      totalDuration: filtered.reduce((sum, a) => sum + (a.duration || 0), 0),
      totalDistance: filtered.reduce((sum, a) => sum + (a.distance || 0), 0),
      totalCalories: filtered.reduce((sum, a) => sum + (a.calories || 0), 0),
      averagePower: cyclingActivities.length > 0 
        ? Math.round(cyclingActivities.reduce((sum, a) => sum + (a.averagePower || a.normalizedPower || 0), 0) / cyclingActivities.length)
        : null,
      averageHeartRate: filtered.length > 0
        ? Math.round(filtered.reduce((sum, a) => sum + (a.averageHeartRate || 0), 0) / filtered.length)
        : null,
      totalTSS7d: Math.round(within7d.reduce((sum, a) => sum + (typeof a.tss === 'number' ? a.tss : (a.duration || 0) / 36), 0))
    };

    res.json({
      activities: filtered,
      summary,
      pagination: {
        limit: parseInt(limit as string),
        total: filtered.length
      }
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// GET /api/activities/:id - Get specific activity details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // In a real implementation, you'd fetch from database
    // For now, return mock detailed data
    const mockActivity = {
      id,
      activityId: `garmin_${id}`,
      activityName: 'Mock Cycling Workout',
      sportType: 'cycling',
      startTime: new Date().toISOString(),
      duration: 3600,
      distance: 40.5,
      calories: 1200,
      averagePower: 180,
      normalizedPower: 185,
      averageHeartRate: 145,
      maxHeartRate: 175,
      averageCadence: 85,
      tss: 85,
      intensityFactor: 0.85,
      rawData: {
        // Detailed activity data would go here
        powerData: [],
        heartRateData: [],
        cadenceData: [],
        elevationData: []
      }
    };

    res.json(mockActivity);

  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// POST /api/activities/sync - Sync activities from Garmin
router.post('/sync', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Fetch user tokens
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine sync window: last 14 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Fetch activities from Garmin
    const garminActivities = await garminService.getActivities(
      user.accessToken,
      startDate.toISOString().slice(0, 10),
      endDate.toISOString().slice(0, 10)
    );

    const savedActivities: any[] = [];

    for (const ga of garminActivities) {
      // Map Garmin fields to our schema as best as possible
      const activity = {
        userId,
        activityId: String(ga.activityId || ga.id || ga.uuid || Date.now()),
        activityName: ga.activityName || ga.name || 'Activity',
        sportType: (ga.sportType || ga.sport || 'cycling').toLowerCase(),
        startTime: ga.startTime || ga.startTimeLocal || new Date().toISOString(),
        duration: Math.round(ga.duration || ga.elapsedTime || 0),
        distance: Number(ga.distance || 0),
        calories: Math.round(ga.calories || 0),
        averagePower: ga.averagePower || ga.avgPower,
        normalizedPower: ga.normalizedPower || ga.normPower,
        averageHeartRate: ga.averageHeartRate || ga.avgHr,
        maxHeartRate: ga.maxHeartRate || ga.maxHr,
        averageCadence: ga.averageCadence || ga.avgCadence,
        tss: ga.tss,
        intensityFactor: ga.intensityFactor,
        rawData: JSON.stringify(ga)
      };

      const activityId = await db.saveActivity(activity as any);
      savedActivities.push({ ...activity, id: activityId });
    }

    await db.updateUserLastSync(userId, new Date().toISOString());

    res.json({ success: true, count: savedActivities.length, activities: savedActivities });

  } catch (error) {
    console.error('Error syncing activities:', error);
    res.status(500).json({ error: 'Failed to sync activities' });
  }
});

export { router as activitiesRoutes };
