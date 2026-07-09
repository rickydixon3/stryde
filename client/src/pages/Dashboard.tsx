import { useState } from 'react'
import { useEffect } from 'react'
import CHDCard from '../components/signals/CHDCard'
import SessionSpikeCard from '../components/signals/SessionSpikeCard'
import CardiacDriftCard from '../components/signals/CardiacDriftCard'
import { EFTrendCard } from '../components/charts/EFTrendChart'
import AISynthesis from '../components/AISynthesis'
import { apiFetch } from '../utils/api'

interface EFDataPoint {
    viable: boolean
    efValue: number
    sampleSize: number
    date: string
    activityId: number
    effortLevel: string
}

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

    const [chdData, setChdData] = useState<ChdData | null>(null)
    const [spikeData, setSpikeData] = useState<SessionSpikeData | null>(null)
    const [cardiacData, setCardiacData] = useState<CardiacDriftData | null>(null)
    const [loading, setLoading] = useState(true)
    const [efData, setEfData] = useState<EFDataPoint[]>([])
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | null>(null)

    // Poll sync_status before loading signal data. New/reconnected accounts
    // can have sync_status='syncing' immediately after OAuth, since the
    // initial syncActivities/syncStreams chain runs in the background and
    // the callback route redirects before it finishes -- without this
    // check, the dashboard would render with incomplete data (blank chart,
    // sparse AI synthesis) and no explanation why.
    useEffect(() => {
        let cancelled = false
        let pollTimer: ReturnType<typeof setTimeout>

        const checkSyncStatus = () => {
          apiFetch('/auth/me')
              .then(res => {
                  if (res.status === 404) {
                      console.log('>>> 404 REDIRECT LOGIC FIRING <<<')
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

    // Only fetch signal data once sync is confirmed complete (or if we
    // couldn't determine status at all, fail open rather than block forever).
    useEffect(() => {
        if (syncStatus !== 'idle') return

        Promise.all([
          apiFetch('/activities/cardiac-drift').then(res => res.json()),
          apiFetch('/activities/chd').then(res => res.json()),
          apiFetch('/activities/spike').then(res => res.json()),
          apiFetch('/activities/efficiency-trend').then(res => res.json()),
        ]).then(([cardiac, chd, spike, trend]) => {
          setCardiacData(cardiac)
          setChdData(chd)
          setSpikeData(spike)
          setEfData(trend)
          setLoading(false)
        })
      }, [syncStatus])

    if (syncStatus === 'syncing') {
      return (
        <div className="max-w-4xl mx-auto px-8 py-8">
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-[#1f1f1f] border-t-[#1D9E75] rounded-full animate-spin mb-4" />
            <p className="text-sm text-[#ededed] font-medium">Syncing your training history</p>
            <p className="text-xs text-[#888888] mt-1">This can take a minute for accounts with a lot of history.</p>
          </div>
        </div>
      )
    }

    if (loading) return <p className="px-8 py-8 text-sm text-[#888888]">Loading...</p>


    return (
        <div className="max-w-4xl mx-auto px-8 py-8">
          
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-lg font-medium text-[#ededed]">Running efficiency</h1>
            <p className="text-sm text-[#888888] mt-0.5">Last 60 days · {efData.length} runs</p>
          </div>

          {/* Trend section -- full-width, untouched */}
          {efData.length > 0 && (
            <EFTrendCard
                efData={efData}
            />
            )}

          <div className="h-3" />

          {/* AI card -- directly below the chart, own independent card */}
          {import.meta.env.VITE_ENABLE_AI_SYNTHESIS === 'true' && <AISynthesis />}

          {/* Signal cards -- equal width, own independent cards */}
          <p className="text-xs text-[#888888] uppercase tracking-wide mb-3">Signals</p>
          <div className="grid grid-cols-3 gap-3">
            {cardiacData && <CardiacDriftCard data={cardiacData} />}
            {chdData && <CHDCard data={chdData} />}
            {spikeData && <SessionSpikeCard data={spikeData} />}
          </div>

        </div>
      )
  }