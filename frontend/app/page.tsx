'use client'

import { useState, useEffect } from 'react'
import { Activity, TrendingUp, Calendar, Zap, Heart, Clock, Target } from 'lucide-react'
import { ActivityChart } from '@/components/ActivityChart'
import { WorkoutList } from '@/components/WorkoutList'
import { TrainingPlan } from '@/components/TrainingPlan'
import { AIChat } from '@/components/AIChat'

interface ActivityData {
  id: string
  activityName: string
  sportType: string
  startTime: string
  duration: number
  distance: number
  averagePower?: number
  averageHeartRate?: number
  tss?: number
}

interface WorkoutData {
  id: string
  workoutName: string
  sportType: string
  workoutSegments: any[]
  isUploaded: boolean
  createdAt: string
}

interface TrainingPlanData {
  id: string
  planName: string
  goal: string
  focus: string
  duration: number
  sessions: any[]
  isActive: boolean
}

export default function Dashboard() {
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [workouts, setWorkouts] = useState<WorkoutData[]>([])
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId] = useState('mock_user_123') // In production, get from auth

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch activities
      const activitiesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/activities?userId=${userId}`)
      const activitiesData = await activitiesRes.json()
      setActivities(activitiesData.activities || [])

      // Fetch workouts
      const workoutsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workouts?userId=${userId}`)
      const workoutsData = await workoutsRes.json()
      setWorkouts(workoutsData.workouts || [])

      // Fetch training plan
      const planRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/plans?userId=${userId}`)
      const planData = await planRes.json()
      setTrainingPlan(planData.plan)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateTrainingPlan = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/plans/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          goal: 'Increase FTP',
          focus: 'Threshold training',
          duration: 4
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setTrainingPlan(data.plan)
      }
    } catch (error) {
      console.error('Error generating training plan:', error)
    }
  }

  const uploadWorkout = async (workoutId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workouts/${workoutId}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      })
      
      const data = await response.json()
      if (data.success) {
        // Refresh workouts
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error uploading workout:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const cyclingActivities = activities.filter(a => a.sportType === 'cycling')
  const totalDistance = activities.reduce((sum, a) => sum + (a.distance || 0), 0)
  const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0)
  const avgPower = cyclingActivities.length > 0 
    ? Math.round(cyclingActivities.reduce((sum, a) => sum + (a.averagePower || 0), 0) / cyclingActivities.length)
    : 0
  const totalTSS = cyclingActivities.reduce((sum, a) => sum + (a.tss || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-primary-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">AI Coach</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="btn-primary">
                Connect Garmin
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="metric-card">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-primary-600" />
                  <span className="ml-2 text-sm font-medium text-gray-600">FTP</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{avgPower}W</p>
              </div>
              
              <div className="metric-card">
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-primary-600" />
                  <span className="ml-2 text-sm font-medium text-gray-600">Distance</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalDistance.toFixed(1)}km</p>
              </div>
              
              <div className="metric-card">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-primary-600" />
                  <span className="ml-2 text-sm font-medium text-gray-600">Time</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{Math.round(totalDuration / 3600)}h</p>
              </div>
              
              <div className="metric-card">
                <div className="flex items-center">
                  <Target className="h-5 w-5 text-primary-600" />
                  <span className="ml-2 text-sm font-medium text-gray-600">TSS</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalTSS}</p>
              </div>
            </div>

            {/* Activity Chart */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Training Load (Last 14 Days)</h2>
              <ActivityChart activities={cyclingActivities} />
            </div>

            {/* Workouts */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Workouts</h2>
                <button 
                  onClick={generateTrainingPlan}
                  className="btn-primary"
                >
                  Generate Plan
                </button>
              </div>
              <WorkoutList 
                workouts={workouts} 
                onUpload={uploadWorkout}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Training Plan */}
            {trainingPlan && (
              <TrainingPlan 
                plan={trainingPlan}
                onGenerate={generateTrainingPlan}
              />
            )}

            {/* AI Chat */}
            <AIChat userId={userId} />
          </div>
        </div>
      </div>
    </div>
  )
}
