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

function CardiacDriftCard({ data }: Props) {
  const badgeConfig = {
    stable: { label: 'GOOD', class: 'bg-[#0a2010] text-[#4ade80]' },
    moderate: { label: 'WATCH', class: 'bg-[#2a1a00] text-[#f59e0b]' },
    significant: { label: 'HIGH', class: 'bg-[#2a0a0a] text-[#f87171]' }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (!data.viable) {
    return (
      <div className="border border-[#1f1f1f] rounded-lg p-4 md:p-5 bg-[#161616] flex flex-col h-full">
        <div className="flex justify-between items-start mb-3 md:mb-4 gap-2">
          <p className="text-xs text-[#999999] uppercase tracking-wide">
            Cardiac drift · last run
          </p>
        </div>
        <div className="mb-3">
          <span className="text-2xl font-medium text-[#ededed]">—</span>
          <p className="text-sm text-[#999999] mt-1">
            {data.reason ?? 'Not enough data yet'}
          </p>
        </div>
      </div>
    )
  }

  const badge = badgeConfig[data.flag as keyof typeof badgeConfig]
    ?? { label: 'WATCH', class: 'bg-[#2a1a00] text-[#f59e0b]' }

  return (
    <div className="border border-[#1f1f1f] rounded-lg p-4 md:p-5 bg-[#161616] flex flex-col h-full">

      <div className="flex justify-between items-start mb-3 md:mb-4 gap-2">
        <p className="text-xs text-[#999999] uppercase tracking-wide">
          Cardiac drift
        </p>
        <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${badge.class}`}>
          {badge.label}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-medium text-[#ededed]">
            {Math.round(data.averageDrift! * 10) / 10}%
          </span>
          <span className="text-sm text-[#999999]">drift</span>
        </div>
        <p className="text-sm text-[#999999] mt-1">
          {data.flag} · 7-day average
        </p>
      </div>

      {data.mostRecentRun && (
        <div className="mb-2 pt-2 md:mb-3 md:pt-3 border-t border-[#1f1f1f]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-medium text-[#ededed]">
              {Math.round(data.mostRecentRun.drift * 10) / 10}%
            </span>
            <span className="text-xs text-[#999999]">drift</span>
          </div>
          <p className="text-xs text-[#999999] mt-0.5">
            Most recent · {formatDate(data.mostRecentRun.date)}
          </p>
        </div>
      )}

      <p className="text-xs text-[#999999] mt-auto">
        {data.worstRun ? `${Math.round(data.worstRun.drift * 10) / 10}% worst this week (${formatDate(data.worstRun.date)})` : ''}
      </p>
      <p className="text-[12px] text-[#999999] mt-1">
        Based on velocity + HR stream
      </p>

    </div>
  )
}

export default CardiacDriftCard