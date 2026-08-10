import { useState, useEffect, useRef } from 'react'
import {
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
} from 'recharts'
import { formatEF } from '../../utils/format'

interface EFDataPoint {
  date: string
  efValue: number
  effortLevel: string
}

interface Props {
  data: EFDataPoint[]
  windowDays: number
  rollingWindow: number
  isMobile: boolean
  onTrendChange?: (pctChange: number | null, latestValue: number | null) => void
}

interface CardProps {
  efData: EFDataPoint[]
}

const EFFORT_COLORS = {
  easy: '#1D9E75',
  moderate: '#378ADD',
  hard: '#f59e0b',
  very_hard: '#ef4444'
}

const LINE_COLOR = '#1D9E75'

const MIN_POINTS_FOR_TREND = 5

// Below this container width, the chart switches to its compact mobile
// layout (tighter margins, thinner Y-axis, no dots, shorter header text).
// This is a container-width check via ResizeObserver, not a viewport media
// query -- the card's actual rendered width depends on where it sits in
// the page layout (e.g. sidebar present vs not), not just the screen size.
const MOBILE_BREAKPOINT_PX = 420

const WINDOW_OPTIONS = [
  { label: '2W', days: 14, rollingWindow: 1 },
  { label: '1M', days: 30, rollingWindow: 3 },
  { label: '2M', days: 60, rollingWindow: 5 },
]

const formatDaysAgo = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  return `${diffDays}d ago`
}

const CustomTooltip = ({ active, payload, isMobile }: any) => {
  if (!active || !payload?.length) return null
  const run = payload[0].payload

  const formattedDate = new Date(run.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: isMobile ? undefined : 'numeric'
  })

  return (
    <div style={{
      background: '#161616',
      border: '1px solid #1f1f1f',
      borderRadius: 6,
      padding: isMobile ? '5px 8px' : '8px 12px',
      fontSize: isMobile ? 10 : 13,
      maxWidth: isMobile ? 130 : undefined
    }}>
      <p style={{ margin: 0, color: '#999' }}>{formattedDate}</p>
      <p style={{ margin: isMobile ? '2px 0 0' : '4px 0 0', color: '#ededed' }}>EF: {formatEF(run.efValue)}</p>
      <p style={{ margin: '1px 0 0', color: EFFORT_COLORS[run.effortLevel as keyof typeof EFFORT_COLORS] }}>
        {run.effortLevel.replace('_', ' ')}
      </p>
    </div>
  )
}

const rollingAverage = (values: number[], window: number): number[] => {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = values.slice(start, i + 1)
    return slice.reduce((sum, v) => sum + v, 0) / slice.length
  })
}

const CustomDot = (props: any) => {
  const { cx, cy } = props
  return <circle cx={cx} cy={cy} r={3} fill={LINE_COLOR} stroke="#161616" strokeWidth={1} />
}

export default function EFTrendChart({ data, windowDays, rollingWindow, isMobile, onTrendChange }: Props) {
  const sorted = [...data].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const windowStart = new Date()
  windowStart.setDate(windowStart.getDate() - windowDays)
  const sliced = sorted.filter(p => new Date(p.date) >= windowStart)

  const notEnoughData = sliced.length < MIN_POINTS_FOR_TREND

  const rolling = notEnoughData ? [] : rollingAverage(sliced.map(p => p.efValue), rollingWindow)
  const chartData = notEnoughData ? [] : sliced.map((p, i) => ({ ...p, trend: rolling[i] }))

  // Derive the headline stat directly from what's on screen: how has the
  // trend line itself moved from the first visible point to the last,
  // rather than a separately-fetched, window-independent calculation.
  const pctChange = notEnoughData ? null : (() => {
    const firstTrend = chartData[0].trend
    const lastTrend = chartData[chartData.length - 1].trend
    return Math.round(((lastTrend - firstTrend) / firstTrend) * 10000) / 100
  })()

  const lastTrendValue = notEnoughData ? null : chartData[chartData.length - 1].trend

  // Notify the parent (EFTrendCard) of the derived headline stat as a
  // proper side effect, after render completes -- calling onTrendChange
  // directly in the render body triggers React's "Cannot update a
  // component while rendering a different component" warning, since it
  // synchronously calls the parent's setState from inside this
  // component's render phase.
  useEffect(() => {
    if (onTrendChange) onTrendChange(pctChange, lastTrendValue)
  }, [pctChange, lastTrendValue])

  if (notEnoughData) {
    return (
      <div style={{ width: '100%', height: isMobile ? 200 : 260 }} className="flex items-center justify-center">
        <p className="text-sm text-[#999999]">Not enough runs in this window yet</p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: isMobile ? 200 : 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={isMobile ? { top: 8, right: 6, bottom: 0, left: 0 } : { top: 10, right: 20, bottom: 1, left: 20 }}
        >
          <defs>
            <linearGradient id="efGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.45} />
              <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={formatDaysAgo}
            tick={{ fontSize: isMobile ? 10 : 11, fill: '#999' }}
            interval="preserveStartEnd"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(v) => formatEF(v)}
            tick={{ fontSize: isMobile ? 10 : 11, fill: '#999' }}
            width={isMobile ? 34 : 55}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip isMobile={isMobile} />} cursor={{ stroke: '#333', strokeWidth: 1 }} />
          <CartesianGrid
            strokeDasharray="0"
            stroke="#1f1f1f"
            vertical={false}
          />
          <Area
            dataKey="trend"
            stroke={LINE_COLOR}
            strokeWidth={2}
            dot={isMobile ? false : <CustomDot />}
            activeDot={{ r: 5, fill: LINE_COLOR, stroke: '#161616', strokeWidth: 2 }}
            fill="url(#efGradient)"
            type="monotone"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function EFTrendCard({ efData }: CardProps) {
  const [selectedIndex, setSelectedIndex] = useState(2) // default to 2M
  const selected = WINDOW_OPTIONS[selectedIndex]
  const [pctChange, setPctChange] = useState<number | null>(null)
  const [latestValue, setLatestValue] = useState<number | null>(null)

  // Track the card's own rendered width (not the viewport) so the chart
  // adapts correctly regardless of what else is on screen -- e.g. this
  // card renders narrower inside a layout with a sidebar present than one
  // without, even at the same device width.
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const isMobile = containerWidth > 0 && containerWidth < MOBILE_BREAKPOINT_PX

  const isDown = (pctChange ?? 0) < 0

  return (
    <div ref={containerRef} className="border-0 md:border md:border-[#1f1f1f] rounded-2xl md:rounded-lg p-4 sm:p-5 mb-3 bg-[#161616]">
      <p className="text-xs text-[#999999] uppercase tracking-wide mb-2">
        {isMobile ? 'Efficiency factor' : 'Efficiency factor · grade adjusted pace / Heart rate reserve'}
      </p>

      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-medium text-[#ededed]">
            {latestValue !== null ? formatEF(latestValue) : '—'}
          </span>
          {pctChange !== null && (
            <span className={`text-sm ${isDown ? 'text-[#ef4444]' : 'text-[#1D9E75]'}`}>
              {isDown ? '↓' : '↑'} {Math.abs(pctChange)}%
            </span>
          )}
        </div>

        <div className="flex gap-1 bg-[#111111] border border-[#1f1f1f] rounded-md p-1 flex-shrink-0">
          {WINDOW_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => setSelectedIndex(i)}
              className={`px-2 sm:px-2.5 py-1 text-xs rounded transition-colors ${
                selectedIndex === i
                  ? 'bg-[#1f1f1f] text-[#ededed] font-medium'
                  : 'text-[#999999] hover:text-[#ededed]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-[#999999] -mt-2 mb-2">
        {selected.label === '2W' ? 'past 2 weeks' : selected.label === '1M' ? 'past month' : 'past 2 months'}
      </p>

      {efData.length > 0 && (
        <EFTrendChart
          data={efData}
          windowDays={selected.days}
          rollingWindow={selected.rollingWindow}
          isMobile={isMobile}
          onTrendChange={(pct, latest) => {
            setPctChange(pct)
            setLatestValue(latest)
          }}
        />
      )}
      <div className="flex justify-end mt-2">
        <span className="flex items-center gap-1.5 text-xs text-[#999999]">
          <span className="w-3 h-0.5 bg-[#1D9E75] inline-block"></span>
          {selected.rollingWindow}-run rolling avg
        </span>
      </div>
    </div>
  )
}