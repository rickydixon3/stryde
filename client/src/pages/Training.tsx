import { useState, useEffect } from 'react'
import { ExternalLink, ChevronDown } from 'lucide-react'
import { formatEF } from '../utils/format'
import { apiFetch } from '../utils/api'

interface FeedRun {
  activityId: number
  stravaId: number
  stravaUrl: string | null
  name: string
  date: string
  distance: number
  duration: number
  efValue: number | null
  effortLevel: string
  drift: number | null
  driftFlag: string | null
  avgPaceSeconds: number | null
  avgHeartrate: number | null
  trimpScore: number | null
}

const effortBadgeClass: Record<string, string> = {
  easy: 'bg-[#0a2010] text-[#4ade80]',
  moderate: 'bg-[#0a1a2a] text-[#38bdf8]',
  hard: 'bg-[#2a1a00] text-[#f59e0b]',
  very_hard: 'bg-[#2a0a0a] text-[#ef4444]',
}

const driftBadgeClass: Record<string, string> = {
  stable: 'bg-[#0a2010] text-[#4ade80]',
  moderate: 'bg-[#2a1a00] text-[#f59e0b]',
  significant: 'bg-[#2a0a0a] text-[#ef4444]',
}

const formatPace = (seconds: number | null) => {
  if (seconds === null) return '—'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}/mi`
}

const formatDistance = (meters: number) => `${(meters / 1609.34).toFixed(1)} mi`

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const monthLabel = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

const groupByMonth = (runs: FeedRun[]) => {
  const groups: { label: string; runs: FeedRun[] }[] = []
  for (const run of runs) {
    const label = monthLabel(run.date)
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.label === label) {
      lastGroup.runs.push(run)
    } else {
      groups.push({ label, runs: [run] })
    }
  }
  return groups
}

const GRID_COLUMNS = "grid-cols-[1fr_65px_65px_60px_60px_85px_65px_60px_130px_28px]"

function RunCard({ run }: { run: FeedRun }) {
  const [showHr, setShowHr] = useState(false)

  return (
    <div className="rounded-2xl bg-[#161616] p-3.5">
      <div className="flex items-baseline justify-between mb-0.5">
        <span className="text-[18px] font-medium text-[#ededed]">{run.name}</span>
        <span className="text-xs text-[#666666] flex-shrink-0 ml-2">{formatDate(run.date)}</span>
      </div>
      <p className="text-[13px] text-[#999999] mb-2.5">
        {formatDistance(run.distance)} · {formatPace(run.avgPaceSeconds)}
      </p>

      <div className="flex items-baseline gap-[18px] mb-2">
        <p className="text-xl font-medium text-[#ededed]">
          {run.efValue !== null ? Math.round(run.efValue * 100) : '—'}
          <span className="text-[11px] text-[#666666] font-normal ml-1">EF</span>
        </p>
        <p className="text-xl font-medium text-[#ededed]">
          {run.trimpScore !== null ? run.trimpScore.toFixed(0) : '—'}
          <span className="text-[11px] text-[#666666] font-normal ml-1">TRIMP</span>
        </p>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        {run.effortLevel && (
          <span className={`text-[11px] px-2 py-1 rounded-md font-medium ${effortBadgeClass[run.effortLevel] ?? 'bg-[#1f1f1f] text-[#999999]'}`}>
            {run.effortLevel.replace('_', ' ')} effort
          </span>
        )}
        {run.drift !== null && run.driftFlag && (
          <span className={`text-[11px] px-2 py-1 rounded-md font-medium ${driftBadgeClass[run.driftFlag] ?? 'bg-[#1f1f1f] text-[#999999]'}`}>
            {run.drift > 0 ? '+' : ''}{run.drift.toFixed(1)}% drift
          </span>
        )}
      </div>

      {showHr && (
        <div className="mb-2 pt-2 border-t border-[#1f1f1f]">
          <p className="text-[11px] text-[#666666] mb-0.5">Heart rate</p>
          <p className="text-sm font-medium text-[#ededed]">
            {run.avgHeartrate ? `${Math.round(run.avgHeartrate)} bpm avg` : '—'}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3.5">
        <button
          onClick={() => setShowHr(!showHr)}
          className="flex items-center gap-1 py-1"
        >
          <span className="text-xs text-[#666666]">Heart rate</span>
          <ChevronDown size={11} className={`text-[#666666] transition-transform ${showHr ? 'rotate-180' : ''}`} />
        </button>

        {run.stravaUrl ? (
          <a
            href={run.stravaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 py-1"
          >
            <ExternalLink size={10} className="text-[#666666]" />
            <span className="text-xs text-[#666666]">Strava</span>
          </a>
        ) : (
          <span className="flex items-center gap-1 py-1 opacity-50">
            <ExternalLink size={10} className="text-[#666666]" />
            <span className="text-xs text-[#666666]">Strava</span>
          </span>
        )}
      </div>
    </div>
  )
}

export default function Training() {
  const [feed, setFeed] = useState<FeedRun[] | null>(null)

  useEffect(() => {
    apiFetch('/activities/feed')
      .then(res => res.json())
      .then(data => setFeed(data))
  }, [])

  if (!feed) return <p className="px-4 sm:px-8 py-8 text-sm text-[#999999]">Loading...</p>

  const groups = groupByMonth(feed)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-xl md:text-lg font-medium text-[#ededed]">Training</h1>
        <p className="text-sm text-[#999999] mt-0.5">Last 60 days · {feed.length} runs · times shown in UTC</p>
      </div>

      {groups.map(group => (
        <div key={group.label} className="mb-6">
          <p className="text-[15px] md:text-xs font-medium md:font-normal text-[#ededed] md:text-[#999999] md:uppercase md:tracking-wide mb-2.5 md:mb-2">
            {group.label}
          </p>

          {/* Mobile: one card per run */}
          <div className="md:hidden flex flex-col gap-2">
            {group.runs.map(run => (
              <RunCard key={run.activityId} run={run} />
            ))}
          </div>

          {/* Desktop/tablet: table, unchanged */}
          <div className="hidden md:block border border-[#1f1f1f] rounded-lg overflow-x-auto">
            <div className="min-w-[900px]">
              <div className={`grid ${GRID_COLUMNS} gap-3 px-4 py-2 bg-[#111111] text-xs text-[#999999] uppercase tracking-wide`}>
                <span>Run</span>
                <span>Date</span>
                <span>Distance</span>
                <span>Pace</span>
                <span>HR</span>
                <span>Effort</span>
                <span>TRIMP</span>
                <span>EF</span>
                <span>Cardiac Drift</span>
                <span></span>
              </div>

              {group.runs.map((run, i) => {
                const isLast = i === group.runs.length - 1
                const rowClass = isLast
                  ? `grid ${GRID_COLUMNS} gap-3 px-4 py-3 items-center bg-[#161616]`
                  : `grid ${GRID_COLUMNS} gap-3 px-4 py-3 items-center bg-[#161616] border-b border-[#1f1f1f]`


                return (
                  <div key={run.activityId} className={rowClass}>
                    <span className="text-sm text-[#ededed] truncate">{run.name}</span>
                    <span className="text-sm text-[#999999]">{formatDate(run.date)}</span>
                    <span className="text-sm text-[#999999]">{formatDistance(run.distance)}</span>
                    <span className="text-sm text-[#999999]">{formatPace(run.avgPaceSeconds)}</span>
                    <span className="text-sm text-[#999999]">
                      {run.avgHeartrate ? `${Math.round(run.avgHeartrate)} bpm` : '—'}
                    </span>

                    <span>
                      {run.effortLevel ? (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${effortBadgeClass[run.effortLevel] ?? 'bg-[#1f1f1f] text-[#999999]'}`}>
                          {run.effortLevel.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-sm text-[#999999]">—</span>
                      )}
                    </span>

                    <span className="text-sm text-[#ededed]">
                      {run.trimpScore !== null ? run.trimpScore.toFixed(0) : '—'}
                    </span>

                    <span className="text-sm text-[#ededed]">
                      {run.efValue !== null ? formatEF(run.efValue) : '—'}
                    </span>

                    <span className="flex items-center gap-1.5">
                      {run.drift !== null ? (
                        <>
                          <span className="text-sm text-[#ededed]">
                            {run.drift > 0 ? '+' : ''}{run.drift.toFixed(1)}%
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${driftBadgeClass[run.driftFlag!] ?? 'bg-[#1f1f1f] text-[#999999]'}`}>
                            {run.driftFlag}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-[#999999]">—</span>
                      )}
                    </span>

                    {run.stravaUrl ? (
                      <a href={run.stravaUrl} target="_blank" rel="noopener noreferrer" className="text-[#555555] hover:text-[#ededed] transition-colors">
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <ExternalLink size={14} className="text-[#2a2a2a]" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}