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
  lastHighLoadDay: string
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
        efFirst20: number
        efLast20: number
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

  interface EFSummary {
    currentEF: number
    pctChange: number
    totalRuns: number
    qualifyingRuns: number
    dateRange: { start: string; end: string }
    dataPoints: EFDataPoint[]
  }
  
export default function Dashboard() {

    const [chdData, setChdData] = useState<ChdData | null>(null)
    const [spikeData, setSpikeData] = useState<SessionSpikeData | null>(null)
    const [cardiacData, setCardiacData] = useState<CardiacDriftData | null>(null)
    const [loading, setLoading] = useState(true)
    const [efSummary, setEfSummary] = useState<EFSummary | null>(null)

    useEffect(() => {
        Promise.all([
          apiFetch('/activities/cardiac-drift').then(res => res.json()),
          apiFetch('/activities/chd').then(res => res.json()),
          apiFetch('/activities/spike').then(res => res.json()),
          apiFetch('/activities/ef-summary').then(res => res.json()),
        ]).then(([cardiac, chd, spike, summary]) => {
          setCardiacData(cardiac)
          setChdData(chd)
          setSpikeData(spike)
          setEfSummary(summary)
          setLoading(false)
          console.log(cardiac, chd, spike, summary)
        })
      }, [])

    if (loading) return <p className="px-8 py-8 text-sm text-[#888888]">Loading...</p>


    return (
        <div className="max-w-4xl mx-auto px-8 py-8">
          
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-lg font-medium text-[#ededed]">Running efficiency</h1>
            <p className="text-sm text-[#888888] mt-0.5">Last 60 days · {efSummary.totalRuns} runs</p>
          </div>
      
          {/* EF Chart card */}
          {efSummary && (
            <EFTrendCard
                efData={efSummary.dataPoints}
            />
            )}
        
          
      
          {/* AI card */}
          <AISynthesis />
      
          {/* Signal cards */}
          <p className="text-xs text-[#888888] uppercase tracking-wide mb-3">Signals</p>
          <div className="grid grid-cols-3 gap-3">
            {chdData && <CHDCard data={chdData}/>}
            {spikeData && <SessionSpikeCard data={spikeData}/>}
            {cardiacData && <CardiacDriftCard data={cardiacData}/>}
          </div>
      
        </div>
      )
  }