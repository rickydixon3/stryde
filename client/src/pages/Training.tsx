import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import { formatEF } from '../utils/format'
import { apiFetch } from '../utils/api'

interface FeedRun {
  activityId: number
  stravaId: number
  stravaUrl: string
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
}

const linkOpenTag = "a"

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

export default function Training() {
  const [feed, setFeed] = useState<FeedRun[] | null>(null)

  useEffect(() => {
    apiFetch('/activities/feed')
      .then(res => res.json())
      .then(data => setFeed(data))
  }, [])

  if (!feed) return <p className="px-8 py-8 text-sm text-[#888888]">Loading...</p>

  const groups = groupByMonth(feed)

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-medium text-[#ededed]">Training</h1>
        <p className="text-sm text-[#888888] mt-0.5">Last 60 days · {feed.length} runs · times shown in UTC</p>
      </div>

      {groups.map(group => (
        <div key={group.label} className="mb-6">
          <p className="text-xs text-[#888888] uppercase tracking-wide mb-2">{group.label}</p>

          <div className="border border-[#1f1f1f] rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_65px_65px_60px_60px_85px_60px_130px_28px] gap-3 px-4 py-2 bg-[#111111] text-xs text-[#555555] uppercase tracking-wide">
              <span>Run</span>
              <span>Date</span>
              <span>Distance</span>
              <span>Pace</span>
              <span>HR</span>
              <span>Effort</span>
              <span>EF</span>
              <span>Cardiac Drift</span>
              <span></span>
            </div>

            {group.runs.map((run, i) => {
              const isLast = i === group.runs.length - 1
              const rowClass = isLast
                ? "grid grid-cols-[1fr_65px_65px_60px_60px_85px_60px_130px_28px] gap-3 px-4 py-3 items-center bg-[#161616]"
                : "grid grid-cols-[1fr_65px_65px_60px_60px_85px_60px_130px_28px] gap-3 px-4 py-3 items-center bg-[#161616] border-b border-[#1f1f1f]"

              const linkOpenTag = "a"

              return (
                <div key={run.activityId} className={rowClass}>
                  <span className="text-sm text-[#ededed] truncate">{run.name}</span>
                  <span className="text-sm text-[#888888]">{formatDate(run.date)}</span>
                  <span className="text-sm text-[#888888]">{formatDistance(run.distance)}</span>
                  <span className="text-sm text-[#888888]">{formatPace(run.avgPaceSeconds)}</span>
                  <span className="text-sm text-[#888888]">
                    {run.avgHeartrate ? `${Math.round(run.avgHeartrate)} bpm` : '—'}
                  </span>

                  <span>
                    {run.effortLevel ? (
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${effortBadgeClass[run.effortLevel] ?? 'bg-[#1f1f1f] text-[#888888]'}`}>
                        {run.effortLevel.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-sm text-[#555555]">—</span>
                    )}
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
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${driftBadgeClass[run.driftFlag!] ?? 'bg-[#1f1f1f] text-[#888888]'}`}>
                          {run.driftFlag}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-[#555555]">—</span>
                    )}
                  </span>

                  <a href={run.stravaUrl} target="_blank" rel="noopener noreferrer" className="text-[#555555] hover:text-[#ededed] transition-colors">
                    <ExternalLink size={14} />
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}