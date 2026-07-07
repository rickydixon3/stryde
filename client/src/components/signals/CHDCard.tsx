interface ChdData {
  severity: number
  flag: string
  highLoadDayCount: number
  consecutiveCount: number
  isActive: boolean
  lastHighLoadDay: string
  lastHighLoadDayISO: string | null
  pattern: string
  recentDays: string[]
}

interface Props {
  data: ChdData
}

function CHDCard({ data }: Props) {
  const hasStreak = data.consecutiveCount >= 2
  const isActive = data.isActive

  const daysSinceLastHighLoad = data.lastHighLoadDayISO
    ? Math.floor((new Date().getTime() - new Date(data.lastHighLoadDayISO).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const badgeLabel = hasStreak && isActive ? 'WATCH' : 'CLEAR'
  const badgeClass = hasStreak && isActive
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
        {data.consecutiveCount === 0 ? (
          <span className="text-2xl font-medium text-[#ededed]">—</span>
        ) : isActive ? (
          <span className="text-2xl font-medium text-[#ededed]">
            {data.consecutiveCount} high-load days in{'\u00A0'}a{'\u00A0'}row
          </span>
        ) : (
          <span className="text-2xl font-medium text-[#ededed]">All clear</span>
        )}

        <p className="text-sm text-[#888888] mt-1">
          {data.consecutiveCount === 0
            ? 'No high-load days in a row'
            : isActive
              ? `Last high-load day · ${data.lastHighLoadDay}`
              : `Recovered from a ${data.consecutiveCount}-day high load streak, ${daysSinceLastHighLoad} days ago (${data.lastHighLoadDay})`}
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