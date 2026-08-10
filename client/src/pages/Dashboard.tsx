import { useState } from 'react'
import { useEffect } from 'react'
import TrainingLoadCard from '../components/signals/TrainingLoadCard'
import SessionSpikeCard from '../components/signals/SessionSpikeCard'
import CardiacDriftCard from '../components/signals/CardiacDriftCard'
import { SignalCards } from '../components/signals/SignalCards'
import { EFTrendCard } from '../components/charts/EFTrendChart'
import { apiFetch } from '../utils/api'

interface EFDataPoint {
    viable: boolean
    efValue: number
    sampleSize: number
    date: string
    activityId: number
    effortLevel: string
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

  interface CardiacDriftData {
    viable: boolean
    averageDrift: number
    flag: string
    worstRun: {
        name: string
        date: string
        drift: number
    }
    mostRecentRun: {
        name: string
        date: string
        drift: number
        efFirstHalf: number
        efLastHalf: number
    } | null
  }
  
  interface SessionSpikeData {
    viable: boolean
    reason?: string
    flag?: string
    spikePercentage?: number
    riskMultiplier?: number
    longestWeekRun?: {
      name: string
      distance: number
      date: string
    }
    longestMonthRun?: {
      name: string
      distance: number
      date: string
    }
  }

const SYNC_POLL_INTERVAL_MS = 3000

export default function Dashboard() {

    const [trainingLoadData, setTrainingLoadData] = useState<TrainingLoadData | null>(null)
    const [spikeData, setSpikeData] = useState<SessionSpikeData | null>(null)
    const [cardiacData, setCardiacData] = useState<CardiacDriftData | null>(null)
    const [loading, setLoading] = useState(true)
    const [efData, setEfData] = useState<EFDataPoint[]>([])
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | null>(null)

    useEffect(() => {
        let cancelled = false
        let pollTimer: ReturnType<typeof setTimeout>

        const checkSyncStatus = () => {
            apiFetch('/auth/me')
                .then(res => {
                    if (res.status === 404) {
                        localStorage.removeItem('token')
                        window.location.href = '/'
                        return null
                    }
                    return res.json()
                })
                .then(user => {
                    if (cancelled || !user) return
                    setSyncStatus(user.sync_status)

                    if (user.sync_status === 'syncing') {
                        pollTimer = setTimeout(checkSyncStatus, SYNC_POLL_INTERVAL_MS)
                    }
                })
        }

        checkSyncStatus()

        return () => {
            cancelled = true
            clearTimeout(pollTimer)
        }
    }, [])

    useEffect(() => {
        if (syncStatus !== 'idle') return

        Promise.all([
          apiFetch('/activities/cardiac-drift').then(res => res.json()),
          apiFetch('/activities/training-load').then(res => res.json()),
          apiFetch('/activities/spike').then(res => res.json()),
          apiFetch('/activities/efficiency-trend').then(res => res.json()),
        ]).then(([cardiac, trainingLoad, spike, trend]) => {
          setCardiacData(cardiac)
          setTrainingLoadData(trainingLoad)
          setSpikeData(spike)
          setEfData(trend)
          setLoading(false)
        })
      }, [syncStatus])

    if (syncStatus === 'syncing') {
      return (
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-[#1f1f1f] border-t-[#1D9E75] rounded-full animate-spin mb-4" />
            <p className="text-sm text-[#ededed] font-medium">Syncing your training history</p>
            <p className="text-xs text-[#999999] mt-1">This can take a minute for accounts with a lot of history.</p>
          </div>
        </div>
      )
    }

    if (loading) return <p className="px-4 sm:px-8 py-8 text-sm text-[#999999]">Loading...</p>


    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
          
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-xl font-medium text-[#ededed]">Running efficiency</h1>
            <p className="text-sm text-[#999999] mt-0.5">Last 60 days · {efData.length} runs</p>
          </div>

          {/* Trend section -- full-width, untouched */}
          {efData.length > 0 && (
            <EFTrendCard
                efData={efData}
            />
            )}

          <div className="h-3" />

          {/* Signals -- compact tap-to-expand rows on mobile, full cards at md and above */}
          <p className="hidden md:block text-xs text-[#999999] uppercase tracking-wide mb-3">Signals</p>
          <h2 className="md:hidden text-[15px] font-medium text-[#ededed] mb-2.5">Signals</h2>

          <div className="md:hidden">
            <SignalCards cardiac={cardiacData} trainingLoad={trainingLoadData} spike={spikeData} />
          </div>

          <div className="hidden md:grid md:grid-cols-3 gap-3">
            {cardiacData && <CardiacDriftCard data={cardiacData} />}
            {trainingLoadData && <TrainingLoadCard data={trainingLoadData} />}
            {spikeData && <SessionSpikeCard data={spikeData} />}
          </div>

        </div>
      )
  }