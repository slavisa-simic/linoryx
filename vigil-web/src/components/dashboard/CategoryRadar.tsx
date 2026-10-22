import { useState } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import type { CategoryCount } from '../../models/dashboard'

interface CategoryRadarProps {
  categories: CategoryCount[]
  total: number
}

export function CategoryRadar({ categories, total }: CategoryRadarProps) {
  const [showActive, setShowActive] = useState(true)
  const [showCompleted, setShowCompleted] = useState(true)
  let maximum = 1

  for (const category of categories) {
    if (category.active > maximum) {
      maximum = category.active
    }
    if (category.completed > maximum) {
      maximum = category.completed
    }
  }

  return (
    <div className="small-chart category-chart">
      <div className="category-plot" role="img" aria-label="Active and completed incidents by category">
        {total > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <RadarChart data={categories} outerRadius="80%" accessibilityLayer>
              <PolarGrid stroke="var(--dashboard-border)" gridType="polygon" />
              <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, maximum]} tick={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--dashboard-border)', fontSize: 12 }} />
              <Radar
                name="Active"
                dataKey="active"
                stroke="var(--chart-blue)"
                fill="var(--chart-blue)"
                fillOpacity={0.16}
                strokeWidth={2}
                hide={!showActive}
                isAnimationActive={false}
              />
              <Radar
                name="Completed"
                dataKey="completed"
                stroke="var(--chart-indigo)"
                fill="var(--chart-indigo)"
                fillOpacity={0.06}
                strokeDasharray="4 3"
                strokeWidth={2}
                hide={!showCompleted}
                isAnimationActive={false}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">No incidents</div>
        )}
      </div>
      <div className="chart-legend">
        <button type="button" aria-pressed={showActive} onClick={() => setShowActive(!showActive)}>
          <span className="legend-dot legend-blue" />
          Active
        </button>
        <button type="button" aria-pressed={showCompleted} onClick={() => setShowCompleted(!showCompleted)}>
          <span className="legend-dot legend-indigo" />
          Completed
        </button>
      </div>
    </div>
  )
}
