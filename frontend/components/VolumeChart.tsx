'use client'

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, subDays } from 'date-fns'

interface ActivityData {
  id: string
  sportType: string
  startTime: string
  distance: number
  duration: number
}

interface VolumeChartProps {
  activities: ActivityData[]
  days?: number
}

export function VolumeChart({ activities, days = 28 }: VolumeChartProps) {
  const daysArr = Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - 1 - i)
    const key = date.toLocaleDateString('en-CA')
    return {
      dateKey: key,
      dateLabel: format(date, 'MMM dd'),
      km: 0,
      hours: 0,
    }
  })

  activities.forEach((a) => {
    const d = new Date(a.startTime)
    const key = isNaN(d.getTime()) ? String(a.startTime).split('T')[0] : d.toLocaleDateString('en-CA')
    const day = daysArr.find(d => d.dateKey === key)
    if (day) {
      const rawDist = Number(a.distance || 0)
      const km = rawDist > 1000 ? rawDist / 1000 : rawDist // auto-convert meters->km
      day.km += km
      day.hours += (a.duration || 0) / 3600
    }
  })

  const data = daysArr.map(d => ({
    date: d.dateLabel,
    km: Math.round(d.km * 10) / 10,
    hours: Math.round(d.hours * 10) / 10,
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={{ stroke: '#6b7280' }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickLine={{ stroke: '#6b7280' }} label={{ value: 'km', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickLine={{ stroke: '#6b7280' }} label={{ value: 'h', angle: 90, position: 'insideRight' }} />
          <Tooltip contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }} />
          <Legend />
          <Bar yAxisId="left" dataKey="km" name="Distance (km)" fill="#3b82f6" radius={[4,4,0,0]} />
          <Line yAxisId="right" type="monotone" dataKey="hours" name="Duration (h)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}


