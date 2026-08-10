import { useState } from 'react'
import { Heart, Zap, TrendingUp, ChevronDown } from 'lucide-react'

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

interface SessionSpikeData {
  viable: boolean
  reason?: string
  flag?: string
  spikePercentage?: number
  spikeRun?: { name: string; distance: number; date: string }
  baselineRun?: { name: string; distance: number; date: string }
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const STATUS_COLOR = {
  good: '#4ade80',
  watch: '#f59e0b',
  high: '#f87171',
}

const STATUS_BADGE_CLASS = {
  good: 'bg-[#0a2010] text-[#4ade80]',
  watch: 'bg-[#2a1a00] text-[#f59e0b]',
  high: 'bg-[#2a0a0a] text-[#f87171]',
}

interface CardData {
  key: string
  icon: typeof Heart
  title: string
  primary: string
  unit: string
  status: 'good' | 'watch' | 'high'
  badgeLabel: string
  subtitle: string
  detailBody: string
  detailFootnote?: string
}

function SignalCard({ card, isOpen, onToggle }: { card: CardData; isOpen: boolean; onToggle: () => void }) {
  const Icon = card.icon

  return (
    <button onClick={onToggle} className="w-full text-left rounded-2xl bg-[#161616] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${STATUS_COLOR[card.status]}1a` }}
          >
            <Icon size={15} style={{ color: STATUS_COLOR[card.status] }} />
          </div>
          <span className="text-sm font-medium text-[#ededed]">{card.title}</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-[#555555] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-2xl font-medium text-[#ededed] leading-none">{card.primary}</span>
        <span className="text-sm text-[#999999]">{card.unit}</span>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-[13px] text-[#999999]">{card.subtitle}</p>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_BADGE_CLASS[card.status]}`}>
          {card.badgeLabel}
        </span>
      </div>

      <div
        className={`transition-all duration-200 ease-out overflow-hidden ${
          isOpen ? 'max-h-24 opacity-100 mt-3 pt-3 border-t border-[#1f1f1f]' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-[13px] text-[#999999] mb-1">{card.detailBody}</p>
        {card.detailFootnote && (
          <p className="text-[11px] text-[#999999]">{card.detailFootnote}</p>
        )}
      </div>
    </button>
  )
}

export function SignalCards({
  cardiac,
  trainingLoad,
  spike,
}: {
  cardiac: CardiacDriftData | null
  trainingLoad: TrainingLoadData | null
  spike: SessionSpikeData | null
}) {
  const [openKey, setOpenKey] = useState<string | null>(null)

  const cards: CardData[] = []

  if (cardiac?.viable) {
    const status = cardiac.flag === 'stable' ? 'good' : cardiac.flag === 'significant' ? 'high' : 'watch'
    cards.push({
      key: 'drift',
      icon: Heart,
      title: 'Cardiac drift',
      primary: `${Math.round(cardiac.averageDrift! * 10) / 10}%`,
      unit: 'drift',
      status,
      badgeLabel: status === 'good' ? 'GOOD' : status === 'high' ? 'HIGH' : 'WATCH',
      subtitle: `${cardiac.flag}, 7-day average`,
      detailBody: cardiac.mostRecentRun
        ? `${Math.round(cardiac.mostRecentRun.drift * 10) / 10}% drift · most recent, ${formatDate(cardiac.mostRecentRun.date)}`
        : 'No recent run data',
      detailFootnote: cardiac.worstRun
        ? `${Math.round(cardiac.worstRun.drift * 10) / 10}% worst this week (${formatDate(cardiac.worstRun.date)}) · Based on velocity + HR stream`
        : 'Based on velocity + HR stream',
    })
  }

  if (trainingLoad) {
    const status = trainingLoad.highVolume ? 'watch' : 'good'
    cards.push({
      key: 'load',
      icon: Zap,
      title: 'Training load',
      primary: `${Math.round(trainingLoad.sevenDayTotalTrimp)}`,
      unit: 'TRIMP',
      status,
      badgeLabel: status === 'good' ? 'CLEAR' : 'WATCH',
      subtitle: '7-day total',
      detailBody: `${trainingLoad.elevatedDaysThisWeek} of 7 days elevated effort or higher`,
      detailFootnote: `${trainingLoad.highLoadDayCount} high-load days in last 10 · Based on heart-rate-derived TRIMP`,
    })
  }

  if (spike?.viable) {
    const isClear = spike.flag === 'safe'
    cards.push({
      key: 'spike',
      icon: TrendingUp,
      title: 'Session spike',
      primary: isClear ? '—' : `${Math.round(spike.spikePercentage!)}%`,
      unit: isClear ? '' : 'above baseline',
      status: isClear ? 'good' : 'watch',
      badgeLabel: isClear ? 'CLEAR' : 'WATCH',
      subtitle: isClear ? 'No outlier sessions' : `${spike.spikeRun!.name} · ${spike.spikeRun!.distance}mi`,
      detailBody: isClear
        ? 'Based on your trailing 30-day longest run'
        : `${Math.round(spike.spikePercentage!)}% above your 30-day baseline`,
      detailFootnote: isClear
        ? undefined
        : `Compared to your ${spike.baselineRun!.distance}mi longest run in the prior 30 days`,
    })
  }

  return (
    <div className="flex flex-col gap-2.5">
      {cards.map(card => (
        <SignalCard
          key={card.key}
          card={card}
          isOpen={openKey === card.key}
          onToggle={() => setOpenKey(openKey === card.key ? null : card.key)}
        />
      ))}
    </div>
  )
}