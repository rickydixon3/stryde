interface CardiacDriftData {
  viable: boolean
  reason?: string
  averageDrift?: number
  flag?: string
  worstRun?: {
    name: string
    date: string
    drift: number
  }
  mostRecentRun?: {
    name: string
    date: string
    drift: number
    efFirstHalf: number
    efLastHalf: number
  } | null
}

interface Props {
  data: CardiacDriftData
}

const DriftSparkline = ({ efFirstHalf, efLastHalf, flag }: { efFirstHalf: number, efLastHalf: number, flag: string }) => {
  const severityColor = {
    stable: '#555555',
    moderate: '#888888',
    significant: '#ef4444'
  }[flag] ?? '#555555'

  // Y positions flipped (SVG y grows downward): higher EF sits higher on
  // screen, so we invert relative to the two values' own range.
  const max = Math.max(efFirstHalf, efLastHalf)
  const min = Math.min(efFirstHalf, efLastHalf)
  const range = max - min || 1
  const yFor = (v: number) => 34 - ((v - min) / range) * 26

  const y1 = yFor(efFirstHalf)
  const y2 = yFor(efLastHalf)

  return (
    <div className="mt-2">
      <svg className="w-full h-11 block" viewBox="0 0 260 44" preserveAspectRatio="none">
        <line x1="0" y1="34" x2="260" y2="34" stroke="#1f1f1f" strokeWidth="1" />
        <line x1="16" y1={y1} x2="244" y2={y2} stroke={severityColor} strokeWidth="2" />
        <circle cx="16" cy={y1} r="4" fill="#161616" stroke={severityColor} strokeWidth="2" />
        <circle cx="244" cy={y2} r="4" fill={severityColor} stroke="#161616" strokeWidth="1" />
      </svg>
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-[#555555]">first half</span>
        <span className="text-[10px] text-[#555555]">last half</span>
      </div>
    </div>
  )
}

function CardiacDriftCard({ data }: Props) {
  const badgeConfig = {
    stable: { label: 'GOOD', class: 'bg-[#0a2010] text-[#4ade80]' },
    moderate: { label: 'WATCH', class: 'bg-[#2a1a00] text-[#f59e0b]' },
    significant: { label: 'HIGH', class: 'bg-[#2a0a0a] text-[#f87171]' }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (!data.viable) {
    return (
      <div className="border border-[#1f1f1f] rounded-lg p-5 bg-[#161616] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs text-[#888888] uppercase tracking-wide">
            Cardiac drift · last run
          </p>
        </div>
        <div className="mb-3">
          <span className="text-2xl font-medium text-[#ededed]">—</span>
          <p className="text-sm text-[#888888] mt-1">
            {data.reason ?? 'Not enough data yet'}
          </p>
        </div>
      </div>
    )
  }

  const badge = badgeConfig[data.flag as keyof typeof badgeConfig]
    ?? { label: 'WATCH', class: 'bg-[#2a1a00] text-[#f59e0b]' }

  return (
    <div className="border border-[#1f1f1f] rounded-lg p-5 bg-[#161616] flex flex-col">

      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-[#888888] uppercase tracking-wide">
          Cardiac drift · last run
        </p>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${badge.class}`}>
          {badge.label}
        </span>
      </div>

      <div className="mb-3">
        <span className="text-2xl font-medium text-[#ededed]">
          {data.averageDrift}% drift
        </span>
        <p className="text-sm text-[#888888] mt-1">
          {data.flag} · 7-day average
        </p>
      </div>

      {data.mostRecentRun && (
        <div className="mb-2">
          <p className="text-xs text-[#555555] uppercase tracking-wide mb-1">Most recent</p>
          <p className="text-sm text-[#888888]">
            {data.mostRecentRun.name} · {formatDate(data.mostRecentRun.date)}
          </p>
          <p className="text-sm text-[#ededed] font-medium">{data.mostRecentRun.drift}% drift</p>
          <DriftSparkline
            efFirstHalf={data.mostRecentRun.efFirstHalf}
            efLastHalf={data.mostRecentRun.efLastHalf}
            flag={data.flag}
          />
        </div>
      )}

      {data.worstRun && (
        <div className="mb-3">
          <p className="text-xs text-[#555555] uppercase tracking-wide mb-1">Worst this week</p>
          <p className="text-sm text-[#888888]">
            {data.worstRun.name} · {formatDate(data.worstRun.date)}
          </p>
          <p className="text-sm text-[#ededed] font-medium">{data.worstRun.drift}% drift</p>
        </div>
      )}

      <p className="text-xs text-[#555555] mt-auto">
        Based on velocity + HR stream
      </p>

    </div>
  )
}

export default CardiacDriftCard