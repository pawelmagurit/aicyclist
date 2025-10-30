import express from 'express';
import { Database } from '../database';

const router = express.Router();
const db = new Database();

// GET /api/plans - Get user's training plans
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const activePlan = await db.getActiveTrainingPlan(userId as string);
    
    if (!activePlan) {
      return res.json({ 
        plan: null, 
        message: 'No active training plan found' 
      });
    }

    res.json({
      plan: {
        id: activePlan.id,
        planName: activePlan.planName,
        goal: activePlan.goal,
        focus: activePlan.focus,
        duration: activePlan.duration,
        sessions: JSON.parse(activePlan.sessions),
        createdAt: activePlan.createdAt,
        isActive: activePlan.isActive
      }
    });

  } catch (error) {
    console.error('Error fetching training plan:', error);
    res.status(500).json({ error: 'Failed to fetch training plan' });
  }
});

// POST /api/plans - Create new training plan
router.post('/', async (req, res) => {
  try {
    const { userId, plan } = req.body;
    
    if (!userId || !plan) {
      return res.status(400).json({ error: 'User ID and plan data required' });
    }

    // Validate plan structure
    if (!plan.planName || !plan.goal || !plan.focus || !plan.duration || !plan.sessions) {
      return res.status(400).json({ 
        error: 'Invalid plan structure. Required: planName, goal, focus, duration, sessions' 
      });
    }

    // Deactivate any existing active plan
    const existingPlan = await db.getActiveTrainingPlan(userId);
    if (existingPlan) {
      // In a real implementation, you'd update the is_active flag
      console.log('Deactivating existing plan:', existingPlan.id);
    }

    // Save new training plan
    const planId = await db.saveTrainingPlan({
      userId,
      planName: plan.planName,
      goal: plan.goal,
      focus: plan.focus,
      duration: plan.duration,
      sessions: JSON.stringify(plan.sessions),
      isActive: true
    });

    res.json({
      success: true,
      planId,
      message: 'Training plan created successfully'
    });

  } catch (error) {
    console.error('Error creating training plan:', error);
    res.status(500).json({ error: 'Failed to create training plan' });
  }
});

// POST /api/plans/generate - Generate AI-powered training plan
router.post('/generate', async (req, res) => {
  try {
    const { userId, goal, focus, duration = 4 } = req.body;
    
    if (!userId || !goal || !focus) {
      return res.status(400).json({ 
        error: 'User ID, goal, and focus are required' 
      });
    }

    // Get user's recent activities for analysis
    const activities = await db.getActivitiesByUserId(userId, 50);
    const cyclingActivities = activities.filter(a => a.sportType === 'cycling');
    
    if (cyclingActivities.length === 0) {
      return res.status(400).json({ 
        error: 'No cycling activities found. Please sync your activities first.' 
      });
    }

    // Analyze activities to determine current fitness level
    const analysis = analyzeActivities(cyclingActivities);
    
    // Generate AI-powered training plan
    const plan = generateTrainingPlan(goal, focus, duration, analysis);
    
    // Save the generated plan
    const planId = await db.saveTrainingPlan({
      userId,
      planName: plan.planName,
      goal: plan.goal,
      focus: plan.focus,
      duration: plan.duration,
      sessions: JSON.stringify(plan.sessions),
      isActive: true
    });

    res.json({
      success: true,
      planId,
      plan,
      analysis,
      message: 'AI training plan generated successfully'
    });

  } catch (error) {
    console.error('Error generating training plan:', error);
    res.status(500).json({ error: 'Failed to generate training plan' });
  }
});

// Helper function to analyze activities
function analyzeActivities(activities: any[]) {
  const recentActivities = activities.slice(0, 14); // Last 2 weeks
  
  const avgPower = recentActivities.reduce((sum, a) => sum + (a.averagePower || 0), 0) / recentActivities.length;
  const avgTSS = recentActivities.reduce((sum, a) => sum + (a.tss || 0), 0) / recentActivities.length;
  const totalDuration = recentActivities.reduce((sum, a) => sum + a.duration, 0);
  const avgDuration = totalDuration / recentActivities.length;
  
  // Estimate FTP (simplified calculation)
  const estimatedFTP = avgPower * 0.95;
  
  // Determine training zones
  const zones = {
    recovery: estimatedFTP * 0.55,
    endurance: estimatedFTP * 0.75,
    tempo: estimatedFTP * 0.90,
    threshold: estimatedFTP * 1.05,
    vo2max: estimatedFTP * 1.20
  };
  
  return {
    estimatedFTP: Math.round(estimatedFTP),
    averagePower: Math.round(avgPower),
    averageTSS: Math.round(avgTSS),
    averageDuration: Math.round(avgDuration),
    totalDuration: Math.round(totalDuration),
    activityCount: recentActivities.length,
    zones
  };
}

// Helper function to generate training plan
function generateTrainingPlan(goal: string, focus: string, duration: number, analysis: any) {
  const planName = `${focus} Training Plan - ${duration} weeks`;
  const sessions = [];
  
  // Generate weekly structure based on focus
  for (let week = 1; week <= duration; week++) {
    const weekSessions = [];
    
    if (focus.toLowerCase().includes('ftp') || focus.toLowerCase().includes('threshold')) {
      // FTP/Threshold focused plan
      weekSessions.push(
        generateWorkout('Endurance Ride', 'cycling', [
          { durationType: 'warmup', duration: 900, targetType: 'power', targetValue: 0.5 },
          { durationType: 'interval', duration: 3600, targetType: 'power', targetValue: 0.75 },
          { durationType: 'cooldown', duration: 900, targetType: 'power', targetValue: 0.4 }
        ]),
        generateWorkout('FTP Intervals', 'cycling', [
          { durationType: 'warmup', duration: 600, targetType: 'power', targetValue: 0.55 },
          { durationType: 'interval', duration: 480, targetType: 'power', targetValue: 0.95 },
          { durationType: 'recovery', duration: 240, targetType: 'power', targetValue: 0.5 },
          { durationType: 'interval', duration: 480, targetType: 'power', targetValue: 0.95 },
          { durationType: 'recovery', duration: 240, targetType: 'power', targetValue: 0.5 },
          { durationType: 'interval', duration: 480, targetType: 'power', targetValue: 0.95 },
          { durationType: 'cooldown', duration: 600, targetType: 'power', targetValue: 0.4 }
        ]),
        generateWorkout('Recovery Ride', 'cycling', [
          { durationType: 'warmup', duration: 300, targetType: 'power', targetValue: 0.4 },
          { durationType: 'interval', duration: 1800, targetType: 'power', targetValue: 0.55 },
          { durationType: 'cooldown', duration: 300, targetType: 'power', targetValue: 0.4 }
        ])
      );
    } else if (focus.toLowerCase().includes('vo2') || focus.toLowerCase().includes('max')) {
      // VO2max focused plan
      weekSessions.push(
        generateWorkout('Endurance Base', 'cycling', [
          { durationType: 'warmup', duration: 900, targetType: 'power', targetValue: 0.5 },
          { durationType: 'interval', duration: 3600, targetType: 'power', targetValue: 0.7 },
          { durationType: 'cooldown', duration: 900, targetType: 'power', targetValue: 0.4 }
        ]),
        generateWorkout('VO2max Intervals', 'cycling', [
          { durationType: 'warmup', duration: 900, targetType: 'power', targetValue: 0.5 },
          { durationType: 'interval', duration: 180, targetType: 'power', targetValue: 1.2 },
          { durationType: 'recovery', duration: 180, targetType: 'power', targetValue: 0.4 },
          { durationType: 'interval', duration: 180, targetType: 'power', targetValue: 1.2 },
          { durationType: 'recovery', duration: 180, targetType: 'power', targetValue: 0.4 },
          { durationType: 'interval', duration: 180, targetType: 'power', targetValue: 1.2 },
          { durationType: 'recovery', duration: 180, targetType: 'power', targetValue: 0.4 },
          { durationType: 'interval', duration: 180, targetType: 'power', targetValue: 1.2 },
          { durationType: 'cooldown', duration: 900, targetType: 'power', targetValue: 0.4 }
        ]),
        generateWorkout('Recovery Spin', 'cycling', [
          { durationType: 'warmup', duration: 300, targetType: 'power', targetValue: 0.4 },
          { durationType: 'interval', duration: 1200, targetType: 'power', targetValue: 0.5 },
          { durationType: 'cooldown', duration: 300, targetType: 'power', targetValue: 0.4 }
        ])
      );
    } else {
      // General endurance plan
      weekSessions.push(
        generateWorkout('Long Endurance', 'cycling', [
          { durationType: 'warmup', duration: 900, targetType: 'power', targetValue: 0.5 },
          { durationType: 'interval', duration: 5400, targetType: 'power', targetValue: 0.65 },
          { durationType: 'cooldown', duration: 900, targetType: 'power', targetValue: 0.4 }
        ]),
        generateWorkout('Tempo Ride', 'cycling', [
          { durationType: 'warmup', duration: 600, targetType: 'power', targetValue: 0.5 },
          { durationType: 'interval', duration: 1800, targetType: 'power', targetValue: 0.85 },
          { durationType: 'recovery', duration: 300, targetType: 'power', targetValue: 0.5 },
          { durationType: 'interval', duration: 1800, targetType: 'power', targetValue: 0.85 },
          { durationType: 'cooldown', duration: 600, targetType: 'power', targetValue: 0.4 }
        ]),
        generateWorkout('Easy Recovery', 'cycling', [
          { durationType: 'warmup', duration: 300, targetType: 'power', targetValue: 0.4 },
          { durationType: 'interval', duration: 1800, targetType: 'power', targetValue: 0.55 },
          { durationType: 'cooldown', duration: 300, targetType: 'power', targetValue: 0.4 }
        ])
      );
    }
    
    sessions.push({
      week,
      sessions: weekSessions
    });
  }
  
  return {
    planName,
    goal,
    focus,
    duration,
    sessions,
    estimatedFTP: analysis.estimatedFTP,
    targetZones: analysis.zones
  };
}

// Helper function to generate individual workout
function generateWorkout(name: string, sportType: string, segments: any[]) {
  return {
    workoutName: name,
    sportType,
    workoutSegments: segments,
    estimatedDuration: segments.reduce((sum, s) => sum + s.duration, 0),
    description: `Generated ${name} workout`
  };
}

export { router as plansRoutes };
