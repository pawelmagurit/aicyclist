'use client'

import { useState } from 'react'
import { Calendar, Target, Zap, Clock, ChevronDown, ChevronRight } from 'lucide-react'

interface TrainingPlanData {
  id: string
  planName: string
  goal: string
  focus: string
  duration: number
  sessions: any[]
  isActive: boolean
}

interface TrainingPlanProps {
  plan: TrainingPlanData
  onGenerate: () => void
}

export function TrainingPlan({ plan, onGenerate }: TrainingPlanProps) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null)

  const getWeekColor = (week: number) => {
    const colors = [
      'bg-blue-50 border-blue-200',
      'bg-green-50 border-green-200',
      'bg-yellow-50 border-yellow-200',
      'bg-purple-50 border-purple-200'
    ]
    return colors[(week - 1) % colors.length]
  }

  const getSessionIcon = (sessionType: string) => {
    switch (sessionType) {
      case 'endurance':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'intervals':
        return <Zap className="h-4 w-4 text-orange-500" />
      case 'recovery':
        return <Target className="h-4 w-4 text-green-500" />
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />
    }
  }

  const getSessionColor = (sessionType: string) => {
    switch (sessionType) {
      case 'endurance':
        return 'bg-blue-100 text-blue-800'
      case 'intervals':
        return 'bg-orange-100 text-orange-800'
      case 'recovery':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Training Plan</h2>
        <button
          onClick={onGenerate}
          className="btn-secondary text-sm"
        >
          Generate New
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900">{plan.planName}</h3>
          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
            <div className="flex items-center">
              <Target className="h-4 w-4 mr-1" />
              {plan.goal}
            </div>
            <div className="flex items-center">
              <Zap className="h-4 w-4 mr-1" />
              {plan.focus}
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {plan.duration} weeks
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {plan.sessions.map((week, weekIndex) => {
            const isExpanded = expandedWeek === week.week
            
            return (
              <div key={week.week} className={`border rounded-lg p-3 ${getWeekColor(week.week)}`}>
                <button
                  onClick={() => setExpandedWeek(isExpanded ? null : week.week)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div className="flex items-center space-x-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="font-medium">Week {week.week}</span>
                    <span className="text-sm text-gray-600">
                      {week.sessions.length} sessions
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-2">
                    {week.sessions.map((session: any, sessionIndex: number) => (
                      <div key={sessionIndex} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex items-center space-x-2">
                          {getSessionIcon(session.type)}
                          <span className="text-sm font-medium">{session.name}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSessionColor(session.type)}`}>
                          {session.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Status</span>
            <span className="flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
