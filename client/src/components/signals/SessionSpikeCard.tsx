interface SessionSpikeData {
  viable: boolean
  reason?: string
  flag?: string
  spikePercentage?: number
  longestWeekRun?: { name: string; distance: number; date: string }
  longestMonthRun?: { name: string; distance: number; date: string }
}

interface Props {
  data: SessionSpikeData
}

function SessionSpikeCard({ data }: Props) {
  const isClear = data.flag === 'safe'
  const badgeClass = isClear
    ? 'bg-[#0a2010] text-[#4ade80]'
    : 'bg-[#2a1a00] text-[#f59e0b]'
  const badgeLabel = isClear ? 'CLEAR' : 'WATCH'

  if (!data.viable) {
    return (
      <div className="border border-[#1f1f1f] rounded-lg p-5 bg-[#161616] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs text-[#888888] uppercase tracking-wide">
            Session spike
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

  return (
    <div className="border border-[#1f1f1f] rounded-lg p-5 bg-[#161616] flex flex-col">

      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-[#888888] uppercase tracking-wide">
          Session spike
        </p>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="mb-3">
        <span className="text-2xl font-medium text-[#ededed]">
          {isClear ? '—' : `${data.spikePercentage}% above baseline`}
        </span>
        <p className="text-sm text-[#888888] mt-1">
          {isClear
            ? 'No outlier sessions detected'
            : `${data.longestWeekRun!.name} · ${data.longestWeekRun!.distance}mi`}
        </p>
      </div>

      <p className="text-xs text-[#555555] mt-auto">
        Longest this week: {data.longestWeekRun!.distance}mi · monthly baseline: {data.longestMonthRun!.distance}mi
      </p>

    </div>
  )
}

export default SessionSpikeCard