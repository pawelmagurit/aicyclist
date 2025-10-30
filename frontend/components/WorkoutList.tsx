'use client'

import { useState } from 'react'
import { Clock, Zap, Upload, CheckCircle, Play } from 'lucide-react'
import { format } from 'date-fns'

interface WorkoutData {
  id: string
  workoutName: string
  sportType: string
  workoutSegments: any[]
  isUploaded: boolean
  createdAt: string
}

interface WorkoutListProps {
  workouts: WorkoutData[]
  onUpload: (workoutId: string) => void
}

export function WorkoutList({ workouts, onUpload }: WorkoutListProps) {
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const getSegmentIcon = (durationType: string) => {
    switch (durationType) {
      case 'warmup':
      case 'cooldown':
        return <Play className="h-4 w-4 text-blue-500" />
      case 'interval':
        return <Zap className="h-4 w-4 text-orange-500" />
      case 'recovery':
        return <Clock className="h-4 w-4 text-green-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getSegmentColor = (durationType: string) => {
    switch (durationType) {
      case 'warmup':
      case 'cooldown':
        return 'bg-blue-100 text-blue-800'
      case 'interval':
        return 'bg-orange-100 text-orange-800'
      case 'recovery':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (workouts.length === 0) {
    return (
      <div className="text-center py-8">
        <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No workouts yet</p>
        <p className="text-sm text-gray-400">Generate a training plan to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {workouts.map((workout) => {
        const totalDuration = workout.workoutSegments.reduce((sum, segment) => sum + segment.duration, 0)
        const isExpanded = expandedWorkout === workout.id

        return (
          <div key={workout.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{workout.workoutName}</h3>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDuration(totalDuration)}
                  </div>
                  <div className="flex items-center">
                    <Zap className="h-4 w-4 mr-1" />
                    {workout.workoutSegments.length} segments
                  </div>
                  <div className="flex items-center">
                    {workout.isUploaded ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <Upload className="h-4 w-4 text-gray-400 mr-1" />
                    )}
                    {workout.isUploaded ? 'Uploaded' : 'Not uploaded'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setExpandedWorkout(isExpanded ? null : workout.id)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {isExpanded ? 'Hide' : 'Show'} segments
                </button>
                
                {!workout.isUploaded && (
                  <button
                    onClick={() => onUpload(workout.id)}
                    className="btn-primary text-sm"
                  >
                    Upload to Garmin
                  </button>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Workout Segments:</h4>
                <div className="space-y-2">
                  {workout.workoutSegments.map((segment, index) => (
                    <div key={index} className="workout-segment">
                      <div className="flex items-center space-x-3">
                        {getSegmentIcon(segment.durationType)}
                        <span className="font-medium capitalize">{segment.durationType}</span>
                        <span className="text-sm text-gray-500">
                          {formatDuration(segment.duration)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {segment.targetType === 'power' ? 'Power' : 'Heart Rate'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSegmentColor(segment.durationType)}`}>
                          {segment.targetValue > 1 ? `${segment.targetValue}W` : `${Math.round(segment.targetValue * 100)}%`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
