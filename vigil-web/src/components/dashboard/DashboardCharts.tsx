import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { DashboardStatistics, StatusCount } from '../../models/dashboard'
import { Icon } from '../Icon'
import { CategoryRadar } from './CategoryRadar'

interface ChartPanelProps {
  title: string
  className?: string
  children: ReactNode
}

interface DataTableProps {
  headers: string[]
  rows: (string | number)[][]
}

interface DashboardChartsProps {
  data: DashboardStatistics
  days: number
  onDaysChange(days: number): void
}

function ChartPanel({ title, className = '', children }: ChartPanelProps) {
  return (
    <section className={'dashboard-panel ' + className}>
      <header className="panel-heading">
        <div>
          <h2>{title}</h2>
        </div>
      </header>
      {children}
    </section>
  )
}

function DataTable({ headers, rows }: DataTableProps) {
  return (
    <details className="chart-data-disclosure">
      <summary>View chart data</summary>
      <div className="chart-data-scroll">
        <table>
          <caption className="sr-only">Chart values</caption>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="chart-empty">
      <Icon name="check-circle" size={30} />
      <p>{message}</p>
    </div>
  )
}

const tooltipStyle = {
  border: '1px solid var(--dashboard-border)',
  borderRadius: 10,
  fontSize: 13,
  boxShadow: 'var(--dashboard-shadow)',
  background: 'var(--color-white)',
  color: 'var(--color-text)',
  padding: '10px 14px'
}
const axisStyle = { fill: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)' }
function percentage(value: number, total: number): number {
  if (total === 0) {
    return 0
  }
  return Math.round((value / total) * 100)
}

function shortName(name: string): string {
  if (name.length > 13) {
    name = name.slice(0, 12) + '…'
  }
  return name.replaceAll(' ', '\u00a0')
}

export function DashboardCharts({
  data,
  days,
  onDaysChange
}: DashboardChartsProps) {
  const [showReported, setShowReported] = useState(true)
  const [showResolved, setShowResolved] = useState(true)

  const trendRows: (string | number)[][] = []
  const severityRows: (string | number)[][] = []
  const categoryRows: (string | number)[][] = []
  const workloadRows: (string | number)[][] = []
  const pieData: StatusCount[] = []
  const statusDescriptions: string[] = []
  const severityDescriptions: string[] = []
  const workloadDescriptions: string[] = []

  for (const day of data.trend) {
    trendRows.push([day.name, day.reported, day.resolved])
  }
  for (const status of data.status) {
    statusDescriptions.push(status.value + ' ' + status.name.toLowerCase())
    if (status.value > 0) {
      pieData.push(status)
    }
  }
  for (const severity of data.severity) {
    severityRows.push([severity.name, severity.value])
    severityDescriptions.push(severity.value + ' ' + severity.name.toLowerCase())
  }
  for (const category of data.categories) {
    categoryRows.push([category.name, category.active, category.completed])
  }
  for (const technician of data.workload) {
    workloadRows.push([technician.name, technician.value])
    workloadDescriptions.push(technician.name + ': ' + technician.value + ' active')
  }

  const statusSummary = data.total + ' incidents: ' + statusDescriptions.join(', ')
  const severitySummary = severityDescriptions.join(', ') + ' active incidents.'
  let workloadSummary = 'No assigned active incidents.'
  if (workloadDescriptions.length > 0) {
    workloadSummary = workloadDescriptions.join(', ')
  }

  return (
    <div className="dashboard-charts">
      <section className="dashboard-panel trend-panel">
        <header className="panel-heading trend-heading">
          <div>
            <h2>Incident activity</h2>
          </div>
          <div className="period-control" role="group" aria-label="Activity chart period">
            {[7, 30, 90].map((period) => (
              <button
                key={period}
                className={days === period ? 'is-selected' : ''}
                aria-pressed={days === period}
                type="button"
                onClick={() => onDaysChange(period)}
              >
                {period} days
              </button>
            ))}
          </div>
        </header>
        <div className="trend-summary">
          <div>
            <strong>{data.reportedInWindow.toLocaleString()}</strong>
            <span>reported in this period</span>
          </div>
          <div className="trend-summary-divider" />
          <div>
            <strong>{data.resolvedInWindow.toLocaleString()}</strong>
            <span>resolved in this period</span>
          </div>
        </div>
        <div className="chart-legend">
          <button
            type="button"
            aria-pressed={showReported}
            onClick={() => setShowReported(!showReported)}
            className={!showReported ? 'legend-muted' : ''}
          >
            <span className="legend-dot legend-blue" />
            Reported
          </button>
          <button
            type="button"
            aria-pressed={showResolved}
            onClick={() => setShowResolved(!showResolved)}
            className={!showResolved ? 'legend-muted' : ''}
          >
            <span className="legend-line legend-green" />
            Resolved
          </button>
        </div>
        <div
          className="trend-chart"
          role="img"
          aria-label={`${data.reportedInWindow} incidents reported and ${data.resolvedInWindow} resolved over ${days} days. Chart data is available below.`}
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart
              data={data.trend}
              margin={{ top: 12, right: 10, bottom: 0, left: -24 }}
              accessibilityLayer
            >
              <defs>
                <linearGradient id="reported-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-blue)" stopOpacity={0.17} />
                  <stop offset="100%" stopColor="var(--chart-blue)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="var(--dashboard-grid)"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={axisStyle}
                minTickGap={38}
                tickMargin={12}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={axisStyle}
                tickCount={5}
                domain={[0, (max: number) => Math.max(4, max)]}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'var(--dashboard-border)' }} />
              <Area
                dataKey="reported"
                name="Reported"
                hide={!showReported}
                type="monotone"
                stroke="var(--chart-blue)"
                strokeWidth={2.5}
                fill="url(#reported-fill)"
                isAnimationActive={false}
                activeDot={{ r: 5, strokeWidth: 3, stroke: 'var(--color-white)' }}
              />
              <Area
                dataKey="resolved"
                name="Resolved"
                hide={!showResolved}
                type="monotone"
                stroke="var(--chart-green)"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                fill="transparent"
                isAnimationActive={false}
                activeDot={{ r: 5, strokeWidth: 3, stroke: 'var(--color-white)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <DataTable headers={['Date', 'Reported', 'Resolved']} rows={trendRows} />
      </section>

      <ChartPanel
        title="Incident status"
        className="status-panel"
      >
        <div className="status-chart" role="img" aria-label={statusSummary}>
          {data.total ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart accessibilityLayer>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={66}
                  outerRadius={86}
                  paddingAngle={3}
                  cornerRadius={4}
                  stroke="none"
                  isAnimationActive={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-donut" />
          )}
          <div className="donut-center">
            <strong>{data.total.toLocaleString()}</strong>
            <span>total incidents</span>
          </div>
        </div>
        <div className="status-legend">
          {data.status.map((item) => (
            <div key={item.key}>
              <span className="legend-dot" style={{ background: item.fill }} />
              <span>{item.name}</span>
              <strong>{item.value.toLocaleString()}</strong>
              <span className="status-percentage">{percentage(item.value, data.total)}%</span>
            </div>
          ))}
        </div>
      </ChartPanel>

      <ChartPanel
        title="Priority breakdown"
        className="severity-panel"
      >
        <div className="small-chart" role="img" aria-label={severitySummary}>
          {data.active ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={data.severity}
                layout="vertical"
                margin={{ top: 4, right: 30, left: 0, bottom: 4 }}
                barSize={15}
                accessibilityLayer
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="var(--dashboard-grid)"
                  strokeDasharray="4 4"
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={axisStyle}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={axisStyle}
                  width={66}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-surface)' }} />
                <Bar
                  dataKey="value"
                  name="Active incidents"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="value"
                    position="right"
                    fill="var(--color-text)"
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty message="No active incidents" />
          )}
        </div>
        <DataTable headers={['Priority', 'Active incidents']} rows={severityRows} />
      </ChartPanel>

      <ChartPanel title="Incidents by category" className="category-panel">
        <CategoryRadar categories={data.categories} total={data.total} />
        <DataTable headers={['Category', 'Active', 'Completed']} rows={categoryRows} />
      </ChartPanel>

      <ChartPanel
        title="Team workload"
        className="workload-panel"
      >
        <div className="small-chart" role="img" aria-label={workloadSummary}>
          {data.workload.length ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={data.workload}
                layout="vertical"
                margin={{ top: 4, right: 28, left: 0, bottom: 4 }}
                barSize={13}
                accessibilityLayer
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="var(--dashboard-grid)"
                  strokeDasharray="4 4"
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={axisStyle}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={axisStyle}
                  tickFormatter={shortName}
                  width={100}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-surface)' }} />
                <Bar
                  dataKey="value"
                  name="Active incidents"
                  fill="var(--chart-orange-dark)"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="value"
                    position="right"
                    fill="var(--color-text)"
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty message="No active assignments" />
          )}
        </div>
        <DataTable headers={['Technician', 'Active assignments']} rows={workloadRows} />
      </ChartPanel>
    </div>
  )
}
