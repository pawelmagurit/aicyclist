import express from 'express';
import { Database } from '../database';
import garminService from '../services/garmin';

const router = express.Router();
const db = new Database();

// Garmin structured workout schema interface
export interface GarminWorkoutSegment {
  durationType: 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'rest';
  duration: number; // in seconds
  targetType: 'power' | 'heartRate' | 'cadence' | 'speed';
  targetValue: number; // as percentage or absolute value
  targetZone?: number; // for heart rate zones
}

export interface GarminWorkout {
  workoutName: string;
  sportType: string;
  workoutSegments: GarminWorkoutSegment[];
  description?: string;
  estimatedDuration?: number;
  estimatedCalories?: number;
}

// GET /api/workouts - Get user's workouts
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const workouts = await db.getWorkoutsByUserId(userId as string);
    
    res.json({
      workouts: workouts.map(workout => ({
        id: workout.id,
        workoutName: workout.workoutName,
        sportType: workout.sportType,
        workoutSegments: JSON.parse(workout.workoutSegments),
        garminWorkoutId: workout.garminWorkoutId,
        isUploaded: workout.isUploaded,
        createdAt: workout.createdAt,
        scheduledDate: workout.scheduledDate
      }))
    });

  } catch (error) {
    console.error('Error fetching workouts:', error);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// POST /api/workouts - Create new workout
router.post('/', async (req, res) => {
  try {
    const { userId, workout } = req.body;
    
    if (!userId || !workout) {
      return res.status(400).json({ error: 'User ID and workout data required' });
    }

    // Validate Garmin workout structure
    if (!workout.workoutName || !workout.sportType || !workout.workoutSegments) {
      return res.status(400).json({ 
        error: 'Invalid workout structure. Required: workoutName, sportType, workoutSegments' 
      });
    }

    // Validate workout segments
    for (const segment of workout.workoutSegments) {
      if (!segment.durationType || !segment.duration || !segment.targetType || segment.targetValue === undefined) {
        return res.status(400).json({ 
          error: 'Invalid workout segment. Required: durationType, duration, targetType, targetValue' 
        });
      }
    }

    // Save workout to database
    const workoutId = await db.saveWorkout({
      userId,
      workoutName: workout.workoutName,
      sportType: workout.sportType,
      workoutSegments: JSON.stringify(workout.workoutSegments),
      isUploaded: false
    });

    res.json({
      success: true,
      workoutId,
      message: 'Workout created successfully'
    });

  } catch (error) {
    console.error('Error creating workout:', error);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

// POST /api/workouts/:id/upload - Upload workout to Garmin Connect
router.post('/:id/upload', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Get workout from database
    const workouts = await db.getWorkoutsByUserId(userId);
    const workout = workouts.find(w => w.id === id);
    
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    if (workout.isUploaded) {
      return res.status(400).json({ error: 'Workout already uploaded to Garmin Connect' });
    }

    // Upload to Garmin
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const payload = {
      workoutName: workout.workoutName,
      sportType: workout.sportType,
      workoutSegments: JSON.parse(workout.workoutSegments)
    };

    const createResp = await garminService.createWorkout(user.accessToken, payload as any);
    const garminWorkoutId = createResp?.id || createResp?.workoutId || `garmin_${Date.now()}`;

    await db.updateWorkoutUploadStatus(id, garminWorkoutId);
    
    res.json({ success: true, garminWorkoutId });

  } catch (error) {
    console.error('Error uploading workout:', error);
    res.status(500).json({ error: 'Failed to upload workout to Garmin Connect' });
  }
});

// POST /api/workouts/batch-upload - Upload multiple workouts
router.post('/batch-upload', async (req, res) => {
  try {
    const { userId, workoutIds } = req.body;
    
    if (!userId || !workoutIds || !Array.isArray(workoutIds)) {
      return res.status(400).json({ error: 'User ID and workout IDs array required' });
    }

    const results = [];
    
    for (const workoutId of workoutIds) {
      try {
        // Get workout from database
        const workouts = await db.getWorkoutsByUserId(userId);
        const workout = workouts.find(w => w.id === workoutId);
        
        if (!workout) {
          results.push({ workoutId, success: false, error: 'Workout not found' });
          continue;
        }

        if (workout.isUploaded) {
          results.push({ workoutId, success: false, error: 'Already uploaded' });
          continue;
        }

        // Mock upload
        const mockGarminWorkoutId = `garmin_workout_${Date.now()}_${workoutId}`;
        await db.updateWorkoutUploadStatus(workoutId, mockGarminWorkoutId);
        
        results.push({ 
          workoutId, 
          success: true, 
          garminWorkoutId: mockGarminWorkoutId 
        });
        
      } catch (error) {
        results.push({ workoutId, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      message: `Uploaded ${successCount}/${workoutIds.length} workouts`,
      results
    });

  } catch (error) {
    console.error('Error batch uploading workouts:', error);
    res.status(500).json({ error: 'Failed to batch upload workouts' });
  }
});

// GET /api/workouts/templates - Get workout templates
router.get('/templates', (req, res) => {
  const templates = [
    {
      name: 'FTP Build - 5x8min @ 95%',
      sportType: 'cycling',
      description: 'Threshold intervals to build FTP',
      segments: [
        { durationType: 'warmup', duration: 600, targetType: 'power', targetValue: 0.55 },
        { durationType: 'interval', duration: 480, targetType: 'power', targetValue: 0.95 },
        { durationType: 'recovery', duration: 240, targetType: 'power', targetValue: 0.5 },
        { durationType: 'interval', duration: 480, targetType: 'power', targetValue: 0.95 },
        { durationType: 'recovery', duration: 240, targetType: 'power', targetValue: 0.5 },
        { durationType: 'interval', duration: 480, targetType: 'power', targetValue: 0.95 },
        { durationType: 'recovery', duration: 240, targetType: 'power', targetValue: 0.5 },
        { durationType: 'interval', duration: 480, targetType: 'power', targetValue: 0.95 },
        { durationType: 'recovery', duration: 240, targetType: 'power', targetValue: 0.5 },
        { durationType: 'interval', duration: 480, targetType: 'power', targetValue: 0.95 },
        { durationType: 'cooldown', duration: 600, targetType: 'power', targetValue: 0.4 }
      ]
    },
    {
      name: 'VO2max Intervals - 6x3min @ 120%',
      sportType: 'cycling',
      description: 'High-intensity intervals for VO2max development',
      segments: [
        { durationType: 'warmup', duration: 900, targetType: 'power', targetValue: 0.5 },
        { durationType: 'interval', duration: 180, targetType: 'power', targetValue: 1.2 },
        { durationType: 'recovery', duration: 180, targetType: 'power', targetValue: 0.4 },
        { durationType: 'interval', duration: 180, targetType: 'power', targetValue: 1.2 },
        { durationType: 'recovery', duration: 180, targetType: 'power', targetValue: 0.4 },
        { durationType: 'interval', duration: 180, targetType: 'power', targetValue: 1.2 },
        { durationType: 'recovery', duration: 180, targetType: 'power', targetValue: 0.4 },
        { durationType: 'interval', duration: 180, targetType: 'power', targetValue: 1.2 },
        { durationType: 'recovery', duration: 180, targetType: 'power', targetValue: 0.4 },
        { durationType: 'interval', duration: 180, targetType: 'power', targetValue: 1.2 },
        { durationType: 'recovery', duration: 180, targetType: 'power', targetValue: 0.4 },
        { durationType: 'interval', duration: 180, targetType: 'power', targetValue: 1.2 },
        { durationType: 'cooldown', duration: 900, targetType: 'power', targetValue: 0.4 }
      ]
    },
    {
      name: 'Endurance Ride - 3h @ 65%',
      sportType: 'cycling',
      description: 'Long steady ride for aerobic base building',
      segments: [
        { durationType: 'warmup', duration: 900, targetType: 'power', targetValue: 0.5 },
        { durationType: 'interval', duration: 9900, targetType: 'power', targetValue: 0.65 },
        { durationType: 'cooldown', duration: 900, targetType: 'power', targetValue: 0.4 }
      ]
    }
  ];

  res.json({ templates });
});

export { router as workoutsRoutes };
