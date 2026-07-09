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
      <div className="border border-[#1f1f1f] rounded-lg p-5 bg-[#161616] flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs text-[#888888] uppercase tracking-wide">
            Cardiac drift · last run
          </p>
        </div>
        <div className="mb-3">
          <span className="text-2xl font-medium text-[#ededed]">—</span>
          <p className="3text-sm text-[#888888] mt-1">
            {data.reason ?? 'Not enough data yet'}
          </p>
        </div>
      </div>
    )
  }

  const badge = badgeConfig[data.flag as keyof typeof badgeConfig]
    ?? { label: 'WATCH', class: 'bg-[#2a1a00] text-[#f59e0b]' }

  const detailParts: string[] = []
  if (data.mostRecentRun) {
    detailParts.push(`${data.mostRecentRun.drift}% most recent (${formatDate(data.mostRecentRun.date)})`)
  }
  if (data.worstRun) {
    detailParts.push(`${data.worstRun.drift}% worst this week (${formatDate(data.worstRun.date)})`)
  }

  return (
    <div className="border border-[#1f1f1f] rounded-lg p-5 bg-[#161616] flex flex-col h-full">

      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-[#888888] uppercase tracking-wide">
          Cardiac drift
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

      {detailParts.length > 0 && (
        <p className="text-xs text-[#555555] mt-auto">
          {detailParts.join(' · ')}
        </p>
      )}

    </div>
  )
}

export default CardiacDriftCard