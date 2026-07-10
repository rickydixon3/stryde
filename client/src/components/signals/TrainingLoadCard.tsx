interface TrainingLoadData {
  severity: number
  flag: string
  highLoadDayCount: number
  consecutiveCount: number
  isActive: boolean
  lastHighLoadDay: string
  lastHighLoadDayISO: string | null
  pattern: string
  recentDays: string[]
  sevenDayTotalTrimp: number
  mostRecentTrimp: number
  elevatedDaysThisWeek: number
  weeklyWatchThreshold: number
  highVolume: boolean
}

interface Props {
  data: TrainingLoadData
}

function TrainingLoadCard({ data }: Props) {
  const badgeLabel = data.highVolume ? 'WATCH' : 'CLEAR'
  const badgeClass = data.highVolume
    ? 'bg-[#2a1a00] text-[#f59e0b]'
    : 'bg-[#0a2010] text-[#4ade80]'

  return (
    <div className="border border-[#1f1f1f] rounded-lg p-5 bg-[#161616] flex flex-col h-full">

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
          {data.sevenDayTotalTrimp} TRIMP
        </span>
        <p className="text-sm text-[#888888] mt-1">
          7-day total
        </p>
      </div>

      <div className="mb-3 pt-3 border-t border-[#1f1f1f]">
        <span className="text-lg font-medium text-[#ededed]">
          {data.elevatedDaysThisWeek} of 7 days
        </span>
        <p className="text-xs text-[#888888] mt-0.5">
          Elevated effort or higher
        </p>
      </div>

      <p className="text-xs text-[#555555] mt-auto">
        {data.highLoadDayCount} high-load days in last 10
      </p>
      <p className="text-[12px] text-[#444444] mt-1">
        Based on heart-rate-derived training impulse (TRIMP)
      </p>

    </div>
  )
}

export default TrainingLoadCard