import { useState, useEffect } from 'react'
import { apiFetch } from '../utils/api'

export default function Settings() {
  // HR SETTINGS
  const [restingHr, setRestingHr] = useState('')
  const [maxHr, setMaxHr] = useState('')
  const [hrSaved, setHrSaved] = useState(false)
  const [hrError, setHrError] = useState('')
  const [savingHr, setSavingHr] = useState(false)

  // DISCONNECTING STRAVA 
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectError, setDisconnectError] = useState('')

  // DELETING ACCOUNT
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState(false)

  const [recomputing, setRecomputing] = useState(false)
  const [recomputeError, setRecomputeError] = useState<string | null>(null)
  const [recomputeSuccess, setRecomputeSuccess] = useState(false)
  const [correctingHr, setCorrectingHr] = useState(false)


  useEffect(() => {
    apiFetch('/auth/me')
      .then(res => res.json())
      .then(data => {
        setRestingHr(data.resting_hr?.toString() ?? '')
        setMaxHr(data.max_hr?.toString() ?? '')
      })
  }, [])

  const handleSaveHr = async () => {
    setHrError('')
    setHrSaved(false)

    const parsedResting = parseInt(restingHr)
    const parsedMax = parseInt(maxHr)

    if (!restingHr || isNaN(parsedResting) || parsedResting <= 0) {
      setHrError('Enter a valid resting heart rate')
      return
    }
    if (!maxHr || isNaN(parsedMax) || parsedMax <= 0) {
      setHrError('Enter a valid max heart rate')
      return
    }
    if (parsedResting >= parsedMax) {
      setHrError('Resting heart rate should be lower than max heart rate')
      return
    }

    setSavingHr(true)
    const res = await apiFetch('/auth/hr-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restingHr: parsedResting, maxHr: parsedMax })
    })

    setSavingHr(false)
    if (res.ok) {
      setHrSaved(true)
    } else {
      setHrError('Something went wrong. Try again.')
    }
  }

  const handleSaveAndRecompute = async () => {
    setHrError('')
    setHrSaved(false)
    setRecomputeError(null)
    setRecomputeSuccess(false)
  
    const parsedResting = parseInt(restingHr)
    const parsedMax = parseInt(maxHr)
  
    if (!restingHr || isNaN(parsedResting) || parsedResting <= 0) {
      setHrError('Enter a valid resting heart rate')
      return
    }
    if (!maxHr || isNaN(parsedMax) || parsedMax <= 0) {
      setHrError('Enter a valid max heart rate')
      return
    }
    if (parsedResting >= parsedMax) {
      setHrError('Resting heart rate should be lower than max heart rate')
      return
    }
  
    setSavingHr(true)
    const saveRes = await apiFetch('/auth/hr-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restingHr: parsedResting, maxHr: parsedMax })
    })
    setSavingHr(false)
  
    if (!saveRes.ok) {
      setHrError('Something went wrong saving. Try again.')
      return
    }
    setHrSaved(true)
  
    setRecomputing(true)
    const recomputeRes = await apiFetch('/activities/recompute-history', { method: 'POST' })
    setRecomputing(false)
  
    if (recomputeRes.status === 429) {
      const data = await recomputeRes.json()
      setRecomputeError(`Please wait ${data.hoursRemaining}h before recomputing again`)
      return
    }
    if (!recomputeRes.ok) {
      setRecomputeError('History recompute failed, please try again')
      return
    }
  
    setRecomputeSuccess(true)
    setCorrectingHr(false)
  }

  const handleDisconnect = async () => {
    setDisconnectError('')
    setDisconnecting(true)

    const res = await apiFetch('/auth/disconnect', { method: 'POST' })

    setDisconnecting(false)
    if (res.ok) {
      localStorage.removeItem('token')
      window.location.href = '/landing'
    } else {
      setDisconnectError('Something went wrong disconnecting from Strava. Try again.')
    }
  }

  const handleDelete = async () => {
    setDeleteError('')

    if (confirmText !== 'DELETE') {
      setDeleteError('Type DELETE exactly to confirm')
      return
    }

    setDeleting(true)

    try {
      const res = await apiFetch('/auth/delete-account', { method: 'DELETE' })

      if (res.ok) {
        localStorage.removeItem('token')
        window.location.href = '/landing'
      } else {
        setDeleteError('Something went wrong. Please try again.')
        setDeleting(false)
      }
    } catch (err) {
      setDeleteError('Something went wrong. Please try again.')
      setDeleting(false)
    }
  }

  const handleSyncNow = () => {
    setSyncing(true)
    setSyncError(null)
    setSyncSuccess(false)
  
    apiFetch('/activities/sync-now', { method: 'POST' })
      .then(async res => {
        if (res.status === 429) {
          const data = await res.json()
          setSyncError(`Please wait ${data.secondsRemaining}s before syncing again`)
          return
        }
        if (!res.ok) {
          setSyncError('Sync failed, please try again')
          return
        }
        setSyncSuccess(true)
      })
      .catch(() => setSyncError('Sync failed, please try again'))
      .finally(() => setSyncing(false))
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-8 flex flex-col gap-6">

      <div>
        <h1 className="text-lg font-medium text-[#ededed]">Settings</h1>
      </div>

    {/* Manual Sync w/ Strava */}
      <div className="border border-[#1f1f1f] rounded-lg p-5 bg-[#161616]">
        <p className="text-sm font-medium text-[#ededed] mb-1">Sync your Strava data</p>
        <p className="text-sm text-[#888888] mb-4">
          Pull in any new runs from Strava right now, instead of waiting.
        </p>

        {syncError && <p className="text-xs text-[#ef4444] mb-3">{syncError}</p>}
        {syncSuccess && !syncError && (
          <p className="text-xs text-[#1D9E75] mb-3">
            Your latest runs have been pulled in from Strava.
          </p>
        )}

        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className="bg-[#1f1f1f] hover:bg-[#2a2a2a] disabled:opacity-50 text-[#ededed] text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          {syncing ? 'Syncing...' : syncSuccess ? 'Synced' : 'Sync from Strava'}
        </button>
      </div>

{/* Heart rate settings */}
<div className="border border-[#1f1f1f] rounded-lg p-5 bg-[#161616]">
  <p className="text-sm font-medium text-[#ededed] mb-1">Heart rate</p>
  <p className="text-sm text-[#888888] mb-4">
    Used to calculate efficiency, drift, training load, and effort across your runs.
  </p>

  {correctingHr && (
  <p className="text-xs text-[#f59e0b] mb-3 bg-[#2a1a00] border border-[#3a2500] rounded-md px-3 py-2">
    Editing these values now will recalculate your entire training history
    once saved — this can{' '}
    <span className="underline">only be done once every 24 hours</span>,
    so make sure your corrected values are right before saving. Only use
    this if your heart rate was entered incorrectly, not if it genuinely
    changed.
  </p>
)}

  <label className="text-xs text-[#888888] uppercase tracking-wide block mb-2">
    Resting heart rate
  </label>
  <input
    type="number"
    value={restingHr}
    onChange={(e) => setRestingHr(e.target.value)}
    className={`w-full bg-[#0a0a0a] border rounded-md px-3 py-2 text-sm text-[#ededed] outline-none mb-4 ${
      correctingHr ? 'border-[#f59e0b] focus:border-[#f59e0b]' : 'border-[#1f1f1f] focus:border-[#378ADD]'
    }`}
  />

  <label className="text-xs text-[#888888] uppercase tracking-wide block mb-2">
    Max heart rate
  </label>
  <input
    type="number"
    value={maxHr}
    onChange={(e) => setMaxHr(e.target.value)}
    className={`w-full bg-[#0a0a0a] border rounded-md px-3 py-2 text-sm text-[#ededed] outline-none mb-3 ${
      correctingHr ? 'border-[#f59e0b] focus:border-[#f59e0b]' : 'border-[#1f1f1f] focus:border-[#378ADD]'
    }`}
  />

  {hrError && <p className="text-xs text-[#ef4444] mb-3">{hrError}</p>}
  {hrSaved && <p className="text-xs text-[#1D9E75] mb-3">Saved</p>}
  {recomputeError && <p className="text-xs text-[#ef4444] mb-3">{recomputeError}</p>}
  {recomputeSuccess && <p className="text-xs text-[#1D9E75] mb-3">Your training history has been recalculated.</p>}

  <div className="flex gap-2 items-center">
    <button
      onClick={correctingHr ? handleSaveAndRecompute : handleSaveHr}
      disabled={savingHr || recomputing}
      className="bg-[#1D9E75] hover:bg-[#178a64] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
    >
      {savingHr || recomputing ? 'Saving...' : correctingHr ? 'Save and recalculate history' : 'Save'}
    </button>

    {!correctingHr ? (
      <button
        onClick={() => setCorrectingHr(true)}
        className="text-xs text-[#888888] hover:text-[#ededed] transition-colors"
      >
        My heart rate was entered incorrectly
      </button>
    ) : (
      <button
        onClick={() => setCorrectingHr(false)}
        className="text-xs text-[#888888] hover:text-[#ededed] transition-colors"
      >
        Cancel
      </button>
    )}
  </div>
</div>

      {/* Disconnect */}
      <div className="border border-[#1f1f1f] rounded-lg p-5 bg-[#161616]">
        <p className="text-sm font-medium text-[#ededed] mb-1">Disconnect Strava</p>
        <p className="text-sm text-[#888888] mb-4">
          Revokes Stryde's access to your Strava account. Your training history stays saved,
          and you can reconnect anytime.
        </p>

        {disconnectError && <p className="text-xs text-[#ef4444] mb-3">{disconnectError}</p>}

        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="bg-[#1f1f1f] hover:bg-[#2a2a2a] disabled:opacity-50 text-[#ededed] text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          {disconnecting ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>

      {/* Danger zone */}
      <div className="border border-[#ef4444]/30 rounded-lg p-5 bg-[#161616]">
        <p className="text-sm font-medium text-[#ef4444] mb-1">Delete account</p>
        <p className="text-sm text-[#888888] mb-4">
          This permanently deletes your account, revokes Stryde's access to your Strava data,
          and removes all activities, streams, and settings we've stored. This cannot be undone.
        </p>

        <label className="text-xs text-[#888888] uppercase tracking-wide block mb-2">
          Type DELETE to confirm
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-md px-3 py-2 text-sm text-[#ededed] placeholder-[#555555] outline-none focus:border-[#ef4444] mb-3"
        />

        {deleteError && <p className="text-xs text-[#ef4444] mb-3">{deleteError}</p>}

        <button
          onClick={handleDelete}
          disabled={deleting || confirmText !== 'DELETE'}
          className="w-full bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-md transition-colors"
        >
          {deleting ? 'Deleting...' : 'Permanently delete my account'}
        </button>
      </div>

      {/* Footer links */}
      <p className="text-xs text-[#555555] text-center mt-2">
        <a href="/privacy" className="hover:underline">Privacy Policy</a>
        {' · '}
        <a href="mailto:awesomericky8@gmail.com" className="hover:underline">Contact support</a>
      </p>

    </div>
  )
}