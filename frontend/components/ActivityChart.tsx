'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays } from 'date-fns'

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

interface ActivityChartProps {
  activities: ActivityData[]
}

export function ActivityChart({ activities }: ActivityChartProps) {
  // Process data for the last 14 days
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i)
    const key = date.toLocaleDateString('en-CA') // YYYY-MM-DD in local time
    return {
      date: format(date, 'MMM dd'),
      fullDate: key,
      tss: 0,
      power: 0,
      duration: 0
    }
  })

  // Fill in actual data
  activities.forEach(activity => {
    const d = new Date(activity.startTime)
    const activityDate = isNaN(d.getTime()) ? String(activity.startTime).split('T')[0] : d.toLocaleDateString('en-CA')
    const dayData = last14Days.find(day => day.fullDate === activityDate)
    
    if (dayData) {
      const tss = typeof activity.tss === 'number' && !isNaN(activity.tss)
        ? activity.tss
        : (activity.duration || 0) / 36 // fallback proxy ~ duration in minutes / 10
      dayData.tss += tss
      dayData.power += activity.averagePower || 0
      dayData.duration += activity.duration
    }
  })

  // Calculate average power for days with multiple activities
  last14Days.forEach(day => {
    if (day.duration > 0) {
      day.power = Math.round(day.power)
    }
  })

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={last14Days}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#6b7280' }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#6b7280' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px'
            }}
            formatter={(value: any, name: string) => [
              name === 'tss' ? `${value} TSS` : 
              name === 'power' ? `${value}W` : 
              `${Math.round(value / 60)}min`,
              name === 'tss' ? 'TSS' : 
              name === 'power' ? 'Avg Power' : 'Duration'
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Line 
            type="monotone" 
            dataKey="tss" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
