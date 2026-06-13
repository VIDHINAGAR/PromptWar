/**
 * StressDNA AI — AI Stress Pattern Discovery System
 *
 * Root component. Owns the entry log + analysis state and composes
 * the input, dashboard and assistant sections. All presentation
 * lives in ./components; all AI/analysis logic lives in ./lib.
 */
import { useEffect, useState } from 'react'
import { analyzeEntries, hasApiKey } from './lib/gemini.js'
import { SAMPLE_ENTRIES } from './lib/sampleData.js'
import { MIN_ENTRIES_FOR_ANALYSIS, STORAGE_KEY, makeDefaultForm } from './constants.js'
import { Icon, ICONS } from './components/Icon.jsx'
import { BackgroundDecor, Footer, Header } from './components/Layout.jsx'
import { EntryList, JournalForm } from './components/JournalForm.jsx'
import { Dashboard, DashboardSkeleton, EmptyState } from './components/Dashboard.jsx'
import { Assistant } from './components/Assistant.jsx'

/** Reads persisted entries from localStorage, tolerating bad/missing data. */
function loadStoredEntries() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export default function App() {
  const [entries, setEntries] = useState(loadStoredEntries)
  const [form, setForm] = useState(makeDefaultForm)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Persist entries so the log survives refreshes.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    } catch {
      /* storage may be unavailable (private mode); non-fatal */
    }
  }, [entries])

  const usingLive = hasApiKey()

  function addEntry(event) {
    event.preventDefault()
    if (!form.journal.trim()) {
      setError('Please write a short journal entry before adding.')
      return
    }
    setError('')
    setEntries((prev) => [
      ...prev,
      {
        ...form,
        mood: Number(form.mood),
        studyHours: Number(form.studyHours),
        sleepHours: Number(form.sleepHours),
        id: `${form.date}-${Math.round(performance.now())}`,
      },
    ])
    setForm(makeDefaultForm())
  }

  function removeEntry(id) {
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  function loadSample() {
    setEntries(SAMPLE_ENTRIES.map((entry, i) => ({ ...entry, id: `sample-${i}` })))
    setError('')
  }

  async function runAnalysis() {
    if (entries.length < MIN_ENTRIES_FOR_ANALYSIS) {
      setError('Add at least 2 entries (or load sample data) so patterns can emerge.')
      return
    }
    setError('')
    setLoading(true)
    setAnalysis(null)
    try {
      setAnalysis(await analyzeEntries(entries))
    } catch (err) {
      setError(`Analysis failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <BackgroundDecor />
      <main className="relative mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
        <Header usingLive={usingLive} />

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Left: inputs */}
          <div className="space-y-6">
            <JournalForm
              form={form}
              setForm={setForm}
              onSubmit={addEntry}
              onSample={loadSample}
              error={error}
            />
            <EntryList entries={entries} onRemove={removeEntry} />
            <button
              type="button"
              onClick={runAnalysis}
              disabled={loading}
              className="btn btn-primary w-full text-base"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-white/40 border-t-white" />
                  Sequencing your StressDNA…
                </>
              ) : (
                <>
                  <Icon path={ICONS.dna} /> Analyze My StressDNA
                </>
              )}
            </button>
          </div>

          {/* Right: dashboard */}
          <div className="space-y-6">
            {loading && <DashboardSkeleton />}
            {!loading && !analysis && (
              <EmptyState onSample={loadSample} hasEntries={entries.length > 0} />
            )}
            {!loading && analysis && <Dashboard analysis={analysis} />}
          </div>
        </div>

        {analysis && !loading && <Assistant analysis={analysis} />}
        <Footer usingLive={usingLive} />
      </main>
    </div>
  )
}
