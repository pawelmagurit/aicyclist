import express from 'express';
import { Database } from '../database';

const router = express.Router();
const db = new Database();

// MCP Manifest endpoint
router.get('/manifest', (req, res) => {
  const manifest = {
    name: process.env.MCP_SERVER_NAME || 'ai-coach',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
    description: 'AI Coach MCP Server - Garmin Connect integration for intelligent training',
    resources: [
      {
        name: 'activities',
        description: 'User activity data from Garmin Connect',
        endpoint: '/api/activities',
        methods: ['GET'],
        parameters: {
          userId: { type: 'string', required: true, description: 'User ID' },
          limit: { type: 'number', required: false, description: 'Number of activities to fetch (default: 50)' },
          sportType: { type: 'string', required: false, description: 'Filter by sport type (cycling, running, swimming)' }
        }
      },
      {
        name: 'workouts',
        description: 'Structured workouts for Garmin Connect',
        endpoint: '/api/workouts',
        methods: ['GET', 'POST'],
        parameters: {
          userId: { type: 'string', required: true, description: 'User ID' }
        }
      },
      {
        name: 'plans',
        description: 'AI-generated training plans',
        endpoint: '/api/plans',
        methods: ['GET', 'POST'],
        parameters: {
          userId: { type: 'string', required: true, description: 'User ID' }
        }
      }
    ],
    tools: [
      {
        name: 'analyze_activities',
        description: 'Analyze user activities to determine fitness level and training zones',
        parameters: {
          userId: { type: 'string', required: true, description: 'User ID' },
          period: { type: 'string', required: false, description: 'Analysis period (2w, 4w, 8w)' }
        }
      },
      {
        name: 'generate_workout',
        description: 'Generate a structured workout based on training goals',
        parameters: {
          userId: { type: 'string', required: true, description: 'User ID' },
          goal: { type: 'string', required: true, description: 'Training goal (ftp, vo2max, endurance)' },
          focus: { type: 'string', required: true, description: 'Training focus' },
          duration: { type: 'number', required: false, description: 'Workout duration in minutes' }
        }
      },
      {
        name: 'generate_plan',
        description: 'Generate a complete training plan',
        parameters: {
          userId: { type: 'string', required: true, description: 'User ID' },
          goal: { type: 'string', required: true, description: 'Training goal' },
          focus: { type: 'string', required: true, description: 'Training focus' },
          duration: { type: 'number', required: false, description: 'Plan duration in weeks (default: 4)' }
        }
      },
      {
        name: 'upload_workout',
        description: 'Upload a workout to Garmin Connect',
        parameters: {
          userId: { type: 'string', required: true, description: 'User ID' },
          workoutId: { type: 'string', required: true, description: 'Workout ID to upload' }
        }
      }
    ],
    capabilities: {
      data_fetching: true,
      workout_generation: true,
      garmin_integration: true,
      ai_analysis: true
    }
  };

  res.json(manifest);
});

// MCP Resource endpoints
router.get('/resources/:resource', async (req, res) => {
  try {
    const { resource } = req.params;
    const { userId, ...queryParams } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    switch (resource) {
      case 'activities':
        const activities = await db.getActivitiesByUserId(userId as string, 50);
        res.json({
          resource: 'activities',
          data: activities.map(activity => ({
            id: activity.id,
            activityName: activity.activityName,
            sportType: activity.sportType,
            startTime: activity.startTime,
            duration: activity.duration,
            distance: activity.distance,
            averagePower: activity.averagePower,
            averageHeartRate: activity.averageHeartRate,
            tss: activity.tss
          })),
          metadata: {
            count: activities.length,
            lastSync: activities[0]?.createdAt
          }
        });
        break;

      case 'workouts':
        const workouts = await db.getWorkoutsByUserId(userId as string);
        res.json({
          resource: 'workouts',
          data: workouts.map(workout => ({
            id: workout.id,
            workoutName: workout.workoutName,
            sportType: workout.sportType,
            workoutSegments: JSON.parse(workout.workoutSegments),
            isUploaded: workout.isUploaded,
            createdAt: workout.createdAt
          })),
          metadata: {
            count: workouts.length,
            uploaded: workouts.filter(w => w.isUploaded).length
          }
        });
        break;

      case 'plans':
        const activePlan = await db.getActiveTrainingPlan(userId as string);
        res.json({
          resource: 'plans',
          data: activePlan ? {
            id: activePlan.id,
            planName: activePlan.planName,
            goal: activePlan.goal,
            focus: activePlan.focus,
            duration: activePlan.duration,
            sessions: JSON.parse(activePlan.sessions),
            isActive: activePlan.isActive
          } : null,
          metadata: {
            hasActivePlan: !!activePlan
          }
        });
        break;

      default:
        res.status(404).json({ error: 'Resource not found' });
    }

  } catch (error) {
    console.error('Error fetching MCP resource:', error);
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
});

// MCP Tool endpoints
router.post('/tools/:tool', async (req, res) => {
  try {
    const { tool } = req.params;
    const { userId, ...params } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    switch (tool) {
      case 'analyze_activities':
        const activities = await db.getActivitiesByUserId(userId, 50);
        const cyclingActivities = activities.filter(a => a.sportType === 'cycling');
        
        if (cyclingActivities.length === 0) {
          return res.json({
            tool: 'analyze_activities',
            result: { error: 'No cycling activities found' }
          });
        }

        // Analyze activities
        const analysis = analyzeActivities(cyclingActivities);
        
        res.json({
          tool: 'analyze_activities',
          result: {
            fitnessLevel: analysis.estimatedFTP > 250 ? 'Advanced' : analysis.estimatedFTP > 200 ? 'Intermediate' : 'Beginner',
            estimatedFTP: analysis.estimatedFTP,
            averagePower: analysis.averagePower,
            averageTSS: analysis.averageTSS,
            trainingZones: analysis.zones,
            recommendations: generateRecommendations(analysis)
          }
        });
        break;

      case 'generate_workout':
        const { goal, focus, duration = 60 } = params;
        
        if (!goal || !focus) {
          return res.status(400).json({ error: 'Goal and focus required' });
        }

        const workout = generateWorkout(goal, focus, duration);
        
        res.json({
          tool: 'generate_workout',
          result: {
            workout,
            message: 'Workout generated successfully'
          }
        });
        break;

      case 'generate_plan':
        const { goal: planGoal, focus: planFocus, duration: planDuration = 4 } = params;
        
        if (!planGoal || !planFocus) {
          return res.status(400).json({ error: 'Goal and focus required' });
        }

        // Get activities for analysis
        const planActivities = await db.getActivitiesByUserId(userId, 50);
        const planCyclingActivities = planActivities.filter(a => a.sportType === 'cycling');
        
        if (planCyclingActivities.length === 0) {
          return res.json({
            tool: 'generate_plan',
            result: { error: 'No cycling activities found for analysis' }
          });
        }

        const planAnalysis = analyzeActivities(planCyclingActivities);
        const trainingPlan = generateTrainingPlan(planGoal, planFocus, planDuration, planAnalysis);
        
        res.json({
          tool: 'generate_plan',
          result: {
            plan: trainingPlan,
            analysis: planAnalysis,
            message: 'Training plan generated successfully'
          }
        });
        break;

      case 'upload_workout':
        const { workoutId } = params;
        
        if (!workoutId) {
          return res.status(400).json({ error: 'Workout ID required' });
        }

        // Mock upload to Garmin
        const mockGarminId = `garmin_workout_${Date.now()}`;
        await db.updateWorkoutUploadStatus(workoutId, mockGarminId);
        
        res.json({
          tool: 'upload_workout',
          result: {
            success: true,
            garminWorkoutId: mockGarminId,
            message: 'Workout uploaded to Garmin Connect'
          }
        });
        break;

      default:
        res.status(404).json({ error: 'Tool not found' });
    }

  } catch (error) {
    console.error('Error executing MCP tool:', error);
    res.status(500).json({ error: 'Failed to execute tool' });
  }
});

// Helper functions (simplified versions from plans.ts)
function analyzeActivities(activities: any[]) {
  const recentActivities = activities.slice(0, 14);
  const avgPower = recentActivities.reduce((sum, a) => sum + (a.averagePower || 0), 0) / recentActivities.length;
  const estimatedFTP = avgPower * 0.95;
  
  return {
    estimatedFTP: Math.round(estimatedFTP),
    averagePower: Math.round(avgPower),
    averageTSS: Math.round(recentActivities.reduce((sum, a) => sum + (a.tss || 0), 0) / recentActivities.length),
    zones: {
      recovery: Math.round(estimatedFTP * 0.55),
      endurance: Math.round(estimatedFTP * 0.75),
      tempo: Math.round(estimatedFTP * 0.90),
      threshold: Math.round(estimatedFTP * 1.05),
      vo2max: Math.round(estimatedFTP * 1.20)
    }
  };
}

function generateRecommendations(analysis: any) {
  const recommendations = [];
  
  if (analysis.estimatedFTP < 200) {
    recommendations.push('Focus on building aerobic base with longer endurance rides');
  } else if (analysis.estimatedFTP > 300) {
    recommendations.push('Consider high-intensity intervals for further gains');
  }
  
  if (analysis.averageTSS < 50) {
    recommendations.push('Increase training volume gradually');
  } else if (analysis.averageTSS > 100) {
    recommendations.push('Ensure adequate recovery between sessions');
  }
  
  return recommendations;
}

function generateWorkout(goal: string, focus: string, duration: number) {
  // Simplified workout generation
  const baseSegments = [
    { durationType: 'warmup', duration: 600, targetType: 'power', targetValue: 0.5 },
    { durationType: 'cooldown', duration: 600, targetType: 'power', targetValue: 0.4 }
  ];
  
  const workDuration = duration * 60 - 1200; // Subtract warmup/cooldown
  
  if (goal.toLowerCase().includes('ftp')) {
    baseSegments.splice(1, 0, {
      durationType: 'interval',
      duration: workDuration,
      targetType: 'power',
      targetValue: 0.95
    });
  } else if (goal.toLowerCase().includes('vo2')) {
    const intervalDuration = 180;
    const recoveryDuration = 180;
    const intervals = Math.floor(workDuration / (intervalDuration + recoveryDuration));
    
    for (let i = 0; i < intervals; i++) {
      baseSegments.splice(-1, 0, {
        durationType: 'interval',
        duration: intervalDuration,
        targetType: 'power',
        targetValue: 1.2
      });
      if (i < intervals - 1) {
        baseSegments.splice(-1, 0, {
          durationType: 'recovery',
          duration: recoveryDuration,
          targetType: 'power',
          targetValue: 0.4
        });
      }
    }
  } else {
    baseSegments.splice(1, 0, {
      durationType: 'interval',
      duration: workDuration,
      targetType: 'power',
      targetValue: 0.65
    });
  }
  
  return {
    workoutName: `${focus} - ${duration}min`,
    sportType: 'cycling',
    workoutSegments: baseSegments,
    estimatedDuration: duration * 60
  };
}

function generateTrainingPlan(goal: string, focus: string, duration: number, analysis: any) {
  // Simplified plan generation
  return {
    planName: `${focus} Training Plan - ${duration} weeks`,
    goal,
    focus,
    duration,
    estimatedFTP: analysis.estimatedFTP,
    sessions: Array.from({ length: duration }, (_, week) => ({
      week: week + 1,
      sessions: [
        { name: 'Endurance Ride', type: 'endurance' },
        { name: 'Interval Workout', type: 'intervals' },
        { name: 'Recovery Ride', type: 'recovery' }
      ]
    }))
  };
}

export { router as mcpRoutes };
