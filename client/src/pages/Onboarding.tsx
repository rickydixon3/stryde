import { useState } from 'react'
import { apiFetch } from '../utils/api'

const estimateMaxHr = (age: number) => Math.round(208 - 0.7 * age)

export default function Onboarding() {
  const [age, setAge] = useState('')
  const [maxHr, setMaxHr] = useState('')
  const [maxHrTouched, setMaxHrTouched] = useState(false)
  const [restingHr, setRestingHr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleAgeChange = (value: string) => {
    setAge(value)

    if (!maxHrTouched) {
      const parsedAge = parseInt(value)
      setMaxHr(!isNaN(parsedAge) && parsedAge > 0 ? String(estimateMaxHr(parsedAge)) : '')
    }
  }

  const handleMaxHrChange = (value: string) => {
    setMaxHrTouched(true)
    setMaxHr(value)
  }

  const resetToEstimate = () => {
    setMaxHrTouched(false)
    const parsedAge = parseInt(age)
    setMaxHr(!isNaN(parsedAge) && parsedAge > 0 ? String(estimateMaxHr(parsedAge)) : '')
  }

  const handleSubmit = async () => {
    setError('')

    const parsedMaxHr = parseInt(maxHr)
    const parsedRestingHr = parseInt(restingHr)

    if (!maxHr || isNaN(parsedMaxHr) || parsedMaxHr <= 0) {
      setError('Enter your max heart rate, or your age for an estimate')
      return
    }

    if (!restingHr || isNaN(parsedRestingHr) || parsedRestingHr <= 0) {
      setError('Enter your resting heart rate')
      return
    }

    if (parsedRestingHr >= parsedMaxHr) {
      setError('Resting heart rate should be lower than max heart rate')
      return
    }

    setSubmitting(true)

    const res = await apiFetch('/auth/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maxHr: parsedMaxHr,
        restingHr: parsedRestingHr
      })
    })

    if (res.ok) {
      window.location.href = '/'
    } else {
      setSubmitting(false)
      setError('Something went wrong. Try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
      <div className="max-w-sm w-full">

        <div className="mb-8">
          <h1 className="text-lg font-medium text-[#ededed] mb-1">A couple quick numbers</h1>
          <p className="text-sm text-[#999999]">
            We use these to measure your training effort more accurately.
          </p>
        </div>

        <div className="mb-5">
          <label className="text-xs text-[#999999] uppercase tracking-wide block mb-2">
            Age <span className="text-[#999999] normal-case">(for an estimate)</span>
          </label>
          <input
            type="number"
            value={age}
            onChange={(e) => handleAgeChange(e.target.value)}
            placeholder="28"
            className="w-full bg-[#161616] border border-[#1f1f1f] rounded-md px-3 py-2 text-sm text-[#ededed] placeholder-[#999999] outline-none focus:border-[#378ADD]"
          />
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-[#999999] uppercase tracking-wide">
              Max heart rate
            </label>
            {maxHrTouched && age && (
              <button
                onClick={resetToEstimate}
                className="text-xs text-[#378ADD] hover:text-[#5ba3e8] transition-colors"
              >
                Use age estimate
              </button>
            )}
          </div>
          <input
            type="number"
            value={maxHr}
            onChange={(e) => handleMaxHrChange(e.target.value)}
            placeholder="190"
            className="w-full bg-[#161616] border border-[#1f1f1f] rounded-md px-3 py-2 text-sm text-[#ededed] placeholder-[#999999] outline-none focus:border-[#378ADD]"
          />
          <p className="text-xs text-[#999999] mt-1.5">
            {!maxHrTouched && age
              ? 'Estimated from your age — edit if you know your real number'
              : 'Know your real max HR? Enter it directly for a more accurate number'}
          </p>
        </div>

        <div className="mb-6">
          <label className="text-xs text-[#999999] uppercase tracking-wide block mb-2">
            Resting heart rate
          </label>
          <input
            type="number"
            value={restingHr}
            onChange={(e) => setRestingHr(e.target.value)}
            placeholder="58"
            className="w-full bg-[#161616] border border-[#1f1f1f] rounded-md px-3 py-2 text-sm text-[#ededed] placeholder-[#999999] outline-none focus:border-[#378ADD]"
          />
          <p className="text-xs text-[#999999] mt-1.5">
            Check your fitness watch, or take your pulse for 60 seconds right after waking up
          </p>
        </div>

        {error && (
          <p className="text-xs text-[#ef4444] mb-4">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-[#1D9E75] hover:bg-[#178a64] disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-md transition-colors"
        >
          {submitting ? 'Saving...' : 'Continue'}
        </button>

      </div>
    </div>
  )
}