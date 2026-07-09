import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../utils/api'

interface SignalFact {
  type: string
  flag?: string
}

interface SynthesisResponse {
  headline: string | null
  detail: string | null
  reason?: string
  signalFacts?: SignalFact[]
  cached?: boolean
  error?: string
}

const CONCERN_FLAGS = ['elevated', 'high', 'critical', 'moderate', 'significant', 'small_spike', 'moderate_spike', 'large_spike', 'declining']

export default function AISynthesis() {
  const [headline, setHeadline] = useState<string | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [signalFacts, setSignalFacts] = useState<SignalFact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchSynthesis = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    apiFetch('/synthesis')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Synthesis request failed: ${res.status}`)
        }
        return res.json()
      })
      .then((data: SynthesisResponse) => {
        if (cancelled) return
        setHeadline(data.headline)
        setDetail(data.detail)
        setReason(data.reason ?? null)
        setSignalFacts(data.signalFacts ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const cleanup = fetchSynthesis()
    return cleanup
  }, [fetchSynthesis])

  const hasConcern = signalFacts.some(f => f.flag && CONCERN_FLAGS.includes(f.flag))
  const badgeLabel = loading ? null : hasConcern ? 'WATCH' : 'CLEAR'
  const badgeClass = hasConcern
    ? 'bg-[#2a1a00] text-[#f59e0b]'
    : 'bg-[#0a2010] text-[#4ade80]'

  return (
    <div className="border border-[#1f1f1f] rounded-lg p-5 mb-6 bg-[#161616] flex flex-col">

      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-[#888888] uppercase tracking-wide">
          Overview
        </p>
        {badgeLabel && (
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${badgeClass}`}>
            {badgeLabel}
          </span>
        )}
      </div>

      {loading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-[#1f1f1f] rounded w-2/3 mb-3" />
          <div className="h-3 bg-[#1f1f1f] rounded w-full" />
          <div className="h-3 bg-[#1f1f1f] rounded w-11/12" />
          <div className="h-3 bg-[#1f1f1f] rounded w-4/5" />
        </div>
      )}

      {!loading && error && (
        <div>
          <p className="text-sm text-[#888888] leading-relaxed mb-2">
            Couldn't load your training summary right now.
          </p>
          <button
            onClick={fetchSynthesis}
            className="text-xs px-3 py-1.5 rounded border border-[#1f1f1f] text-[#888888] hover:text-[#ededed] hover:border-[#333333] transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && headline && detail && (
        <>
          <p className="text-[17px] font-medium text-[#ededed] mb-2 leading-snug">
            {headline}
          </p>
          <p className="text-sm text-[#999999] leading-relaxed">
            {detail}
          </p>
        </>
      )}

      {!loading && !error && !headline && !detail && (
        <p className="text-sm text-[#888888] leading-relaxed">
          {reason ?? 'Not enough data yet for a training summary.'}
        </p>
      )}

      {!loading && !error && (headline || detail) && (
        <p className="text-[12px] text-[#444444] mt-3">
          Generated from your recent training
        </p>
      )}

    </div>
  )
}