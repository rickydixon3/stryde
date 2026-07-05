interface ChdData {
  severity: number
  flag: string
  highLoadDayCount: number
  consecutiveCount: number
  lastHighLoadDay: string
  pattern: string
  recentDays: string[]
}

interface Props {
  data: ChdData
}

function CHDCard({ data }: Props) {
  const isWatch = data.consecutiveCount >= 2
  const badgeLabel = isWatch ? 'WATCH' : 'CLEAR'
  const badgeClass = isWatch
    ? 'bg-[#2a1a00] text-[#f59e0b]'
    : 'bg-[#0a2010] text-[#4ade80]'

  return (
    <div className="border border-[#1f1f1f] rounded-lg p-5 bg-[#161616] flex flex-col">
      
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-[#888888] uppercase tracking-wide">
          Training load
        </p>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="mb-3">
      <span className="text-2xl font-medium text-[#ededed]">
      {data.consecutiveCount === 0 ? '—' : `${data.consecutiveCount} high-load days in\u00A0a\u00A0row`}
        </span>
        <p className="text-sm text-[#888888] mt-1">
          {data.consecutiveCount === 0
            ? 'No high-load days in a row'
            : `Last high-load day · ${data.lastHighLoadDay}`}
        </p>
      </div>

      <p className="text-xs text-[#555555] mt-auto">
        {data.highLoadDayCount} high-load days in last 10 · flag: {data.flag}
      </p>
      <p className="text-[12px] text-[#444444] mt-1">
        Based on Strava suffer score
      </p>

      

    </div>
  )
}

export default CHDCard