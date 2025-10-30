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
  tss?: number
}

interface FitnessChartProps {
  activities: ActivityData[]
  days?: number
}

// Simple fitness proxy: 7-day rolling sum of TSS (training load)
export function FitnessChart({ activities, days = 28 }: FitnessChartProps) {
  const daysArr = Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - 1 - i)
    const key = date.toLocaleDateString('en-CA')
    return {
      dateKey: key,
      dateLabel: format(date, 'MMM dd'),
      tss: 0,
    }
  })

  activities.forEach((a) => {
    const d = new Date(a.startTime)
    const key = isNaN(d.getTime()) ? String(a.startTime).split('T')[0] : d.toLocaleDateString('en-CA')
    const day = daysArr.find(d => d.dateKey === key)
    if (day) {
      const tss = typeof a.tss === 'number' && !isNaN(a.tss)
        ? a.tss
        : (a.duration || 0) / 36 // fallback proxy
      day.tss += tss
    }
  })

  // Compute 7-day rolling sum as fitness
  const window = 7
  const data = daysArr.map((_, idx) => {
    const start = Math.max(0, idx - window + 1)
    const slice = daysArr.slice(start, idx + 1)
    const fitness = slice.reduce((sum, d) => sum + d.tss, 0)
    return {
      date: daysArr[idx].dateLabel,
      fitness,
    }
  })

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={{ stroke: '#6b7280' }} />
          <YAxis tick={{ fontSize: 12 }} tickLine={{ stroke: '#6b7280' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
            formatter={(value: any) => [`${value} TL`, 'Fitness (7d TL)']}
          />
          <Line type="monotone" dataKey="fitness" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}


