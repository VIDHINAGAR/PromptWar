import { useEffect, useMemo, useRef, useState } from 'react'
import { analyzeEntries, chatWithAssistant, hasApiKey } from './lib/gemini.js'
import { SAMPLE_ENTRIES } from './lib/sampleData.js'

/* ============================================================
   StressDNA AI — AI Stress Pattern Discovery System
   Single-file app. Discovers WHY exam aspirants feel stressed
   and WHAT actually helps them recover.
   ============================================================ */

const STORAGE_KEY = 'stressdna.entries.v1'
const todayISO = () => new Date().toISOString().slice(0, 10)

/* ---------- tiny inline icon set (no external deps) ---------- */
const Icon = ({ path, className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {path}
  </svg>
)
const I = {
  dna: <><path d="M7 4c0 6 10 6 10 12M17 4c0 6-10 6-10 12" /><path d="M8 7h8M8 17h8M9 11h6" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
  pulse: <path d="M3 12h4l2 6 4-12 2 6h6" />,
  shield: <><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" /><path d="M9 12l2 2 4-4" /></>,
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  list: <><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
  heart: <path d="M12 20s-7-4.6-9-9C1.5 7 4 4 7 4c2 0 3 1 5 3 2-2 3-3 5-3 3 0 5.5 3 4 7-2 4.4-9 9-9 9z" />,
  chat: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />,
  send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  book: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM19 3v18" />,
}

/* ---------- small helpers ---------- */
const SEV = {
  High: 'text-neon-rose border-neon-rose/40 bg-neon-rose/10',
  Medium: 'text-neon-amber border-neon-amber/40 bg-neon-amber/10',
  Low: 'text-neon-emerald border-neon-emerald/40 bg-neon-emerald/10',
}
const IMPACT = SEV

function Badge({ value, kind = SEV }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${kind[value] || SEV.Low}`}>
      {value}
    </span>
  )
}

function SectionTitle({ icon, kicker, title }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-neon-cyan ring-1 ring-white/10">
        <Icon path={icon} />
      </span>
      <div>
        {kicker && <p className="text-xs uppercase tracking-widest text-slate-400">{kicker}</p>}
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
    </div>
  )
}

/* ---------- animated burnout meter ---------- */
function BurnoutMeter({ risk }) {
  const score = Math.max(0, Math.min(100, risk?.score ?? 0))
  const level = risk?.level || 'Low'
  const R = 54
  const C = 2 * Math.PI * R
  const [dash, setDash] = useState(C)
  useEffect(() => {
    const id = requestAnimationFrame(() => setDash(C - (score / 100) * C))
    return () => cancelAnimationFrame(id)
  }, [score, C])
  const color = level === 'High' ? '#FB7185' : level === 'Medium' ? '#FBBF24' : '#34D399'
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative grid place-items-center" role="img" aria-label={`Burnout risk ${level}, ${score} out of 100`}>
        <svg width="140" height="140" className="-rotate-90">
          <circle cx="70" cy="70" r={R} stroke="rgba(255,255,255,0.08)" strokeWidth="12" fill="none" />
          <circle
            cx="70" cy="70" r={R} stroke={color} strokeWidth="12" fill="none"
            strokeLinecap="round" strokeDasharray={C} strokeDashoffset={dash}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        <div className="absolute text-center">
          <div className="text-3xl font-extrabold text-white">{score}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400">/ 100</div>
        </div>
      </div>
      <div className="flex-1 text-center sm:text-left">
        <div className="mb-2 inline-flex items-center gap-2">
          <span className="text-sm text-slate-400">Risk level</span>
          <Badge value={level} />
        </div>
        <p className="text-sm leading-relaxed text-slate-300">{risk?.explanation}</p>
      </div>
    </div>
  )
}

/* ---------- skeleton while analyzing ---------- */
function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Analyzing your patterns">
      <div className="glass p-6">
        <div className="skeleton mb-3 h-5 w-48" />
        <div className="skeleton h-16 w-full" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass p-6">
            <div className="skeleton mb-3 h-4 w-32" />
            <div className="skeleton mb-2 h-3 w-full" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   APP
   ============================================================ */
export default function App() {
  const [entries, setEntries] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [form, setForm] = useState({ date: todayISO(), journal: '', mood: 5, studyHours: 6, sleepHours: 7 })
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    } catch {
      /* storage may be unavailable; non-fatal */
    }
  }, [entries])

  const usingLive = hasApiKey()

  /* ----- entry management ----- */
  function addEntry(e) {
    e.preventDefault()
    if (!form.journal.trim()) {
      setError('Please write a short journal entry before adding.')
      return
    }
    setError('')
    const entry = {
      ...form,
      mood: Number(form.mood),
      studyHours: Number(form.studyHours),
      sleepHours: Number(form.sleepHours),
      id: `${form.date}-${Math.round(performance.now())}`,
    }
    setEntries((prev) => [...prev, entry])
    setForm({ date: todayISO(), journal: '', mood: 5, studyHours: 6, sleepHours: 7 })
  }

  function removeEntry(id) {
    setEntries((prev) => prev.filter((x) => x.id !== id))
  }

  function loadSample() {
    setEntries(SAMPLE_ENTRIES.map((e, i) => ({ ...e, id: `sample-${i}` })))
    setError('')
  }

  async function runAnalysis() {
    if (entries.length < 2) {
      setError('Add at least 2 entries (or load sample data) so patterns can emerge.')
      return
    }
    setError('')
    setLoading(true)
    setAnalysis(null)
    try {
      const result = await analyzeEntries(entries)
      setAnalysis(result)
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
          {/* LEFT: inputs */}
          <div className="space-y-6">
            <InputPanel
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
                  <Icon path={I.dna} /> Analyze My StressDNA
                </>
              )}
            </button>
          </div>

          {/* RIGHT: dashboard */}
          <div className="space-y-6">
            {loading && <DashboardSkeleton />}
            {!loading && !analysis && <EmptyState onSample={loadSample} hasEntries={entries.length > 0} />}
            {!loading && analysis && <Dashboard analysis={analysis} />}
          </div>
        </div>

        {analysis && !loading && <Assistant analysis={analysis} />}
        <Footer usingLive={usingLive} />
      </main>
    </div>
  )
}

/* ---------- decorative animated background ---------- */
function BackgroundDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-neon-violet/20 blur-3xl animate-floaty" />
      <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-neon-cyan/20 blur-3xl animate-floaty [animation-delay:1.5s]" />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-neon-pink/20 blur-3xl animate-floaty [animation-delay:3s]" />
    </div>
  )
}

/* ---------- header ---------- */
function Header({ usingLive }) {
  return (
    <header className="animate-fade-up">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-violet text-white shadow-glow">
            <Icon path={I.dna} className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Stress<span className="gradient-text">DNA</span> AI
            </h1>
            <p className="text-sm text-slate-400">AI Stress Pattern Discovery System</p>
          </div>
        </div>
        <span
          className={`chip ${usingLive ? 'text-neon-emerald' : 'text-neon-amber'}`}
          title={usingLive ? 'Gemini API key detected' : 'No API key — running the on-device pattern engine'}
        >
          <span className={`h-2 w-2 rounded-full ${usingLive ? 'bg-neon-emerald' : 'bg-neon-amber'} animate-pulse`} />
          {usingLive ? 'Gemini Live' : 'Offline Engine'}
        </span>
      </div>
      <p className="mt-4 max-w-2xl text-balance text-slate-300">
        Most apps tell you <em>how</em> you feel. StressDNA discovers <strong className="text-white">why</strong> you feel
        that way — and <strong className="text-white">what actually helps you recover</strong> — by decoding the hidden
        triggers and emotional patterns inside your study journals.
      </p>
    </header>
  )
}

/* ---------- input panel ---------- */
function InputPanel({ form, setForm, onSubmit, onSample, error }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <section className="glass p-5 animate-fade-up" aria-labelledby="log-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="log-heading" className="flex items-center gap-2 font-bold text-white">
          <Icon path={I.plus} className="h-5 w-5 text-neon-cyan" /> Daily Check-in
        </h2>
        <button type="button" onClick={onSample} className="text-xs font-medium text-neon-cyan hover:underline">
          Load sample week
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="date" className="label">Date</label>
          <input id="date" type="date" value={form.date} onChange={set('date')} className="field" />
        </div>

        <div>
          <label htmlFor="journal" className="label">Journal entry</label>
          <textarea
            id="journal"
            rows={4}
            value={form.journal}
            onChange={set('journal')}
            placeholder="How did today go? Mock tests, family, comparisons, what drained or recharged you…"
            className="field resize-none"
            aria-describedby="journal-hint"
          />
          <p id="journal-hint" className="mt-1 text-xs text-slate-500">
            Write naturally — the AI reads between the lines for hidden triggers.
          </p>
        </div>

        <SliderField
          id="mood" icon={I.heart} label="Mood" value={form.mood} onChange={set('mood')}
          min={1} max={10} suffix="/10"
        />
        <SliderField
          id="study" icon={I.book} label="Study hours" value={form.studyHours} onChange={set('studyHours')}
          min={0} max={16} step={0.5} suffix="h"
        />
        <SliderField
          id="sleep" icon={I.moon} label="Sleep hours" value={form.sleepHours} onChange={set('sleepHours')}
          min={0} max={12} step={0.5} suffix="h"
        />

        {error && (
          <p role="alert" className="rounded-lg border border-neon-rose/40 bg-neon-rose/10 px-3 py-2 text-sm text-neon-rose">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-ghost w-full">
          <Icon path={I.plus} className="h-4 w-4" /> Add entry
        </button>
      </form>
    </section>
  )
}

function SliderField({ id, icon, label, value, onChange, min, max, step = 1, suffix }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <Icon path={icon} className="h-4 w-4 text-neon-violet" /> {label}
        </label>
        <span className="text-sm font-semibold text-white">
          {value}
          <span className="text-slate-400">{suffix}</span>
        </span>
      </div>
      <input
        id={id} type="range" min={min} max={max} step={step} value={value} onChange={onChange}
        aria-valuetext={`${value}${suffix}`}
        className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none focus:ring-2 focus:ring-neon-violet/40"
        style={{ background: `linear-gradient(90deg,#8B5CF6 ${pct}%, rgba(255,255,255,0.1) ${pct}%)` }}
      />
    </div>
  )
}

/* ---------- entry list ---------- */
function EntryList({ entries, onRemove }) {
  if (entries.length === 0) return null
  return (
    <section className="glass p-5 animate-fade-up" aria-label="Logged entries">
      <h2 className="mb-3 flex items-center gap-2 font-bold text-white">
        <Icon path={I.list} className="h-5 w-5 text-neon-cyan" /> Your Log
        <span className="chip ml-auto">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
      </h2>
      <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {entries.map((e) => (
          <li key={e.id} className="group flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neon-violet/15 text-sm font-bold text-neon-violet">
              {e.mood}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                <span>{e.date}</span>
                <span>· {e.studyHours}h study</span>
                <span>· {e.sleepHours}h sleep</span>
              </div>
              <p className="truncate text-sm text-slate-200">{e.journal}</p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(e.id)}
              aria-label={`Delete entry from ${e.date}`}
              className="rounded-lg p-1.5 text-slate-500 opacity-0 transition hover:bg-neon-rose/10 hover:text-neon-rose group-hover:opacity-100 focus:opacity-100"
            >
              <Icon path={I.trash} className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------- empty state ---------- */
function EmptyState({ onSample, hasEntries }) {
  return (
    <div className="glass grid place-items-center p-10 text-center animate-fade-up">
      <span className="mb-4 grid h-16 w-16 animate-floaty place-items-center rounded-2xl bg-gradient-to-br from-neon-violet/30 to-neon-cyan/30 text-neon-cyan">
        <Icon path={I.dna} className="h-9 w-9" />
      </span>
      <h2 className="text-xl font-bold text-white">Your StressDNA hasn’t been sequenced yet</h2>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        {hasEntries
          ? 'Hit “Analyze My StressDNA” to discover your hidden triggers, emotional patterns and recovery levers.'
          : 'Log a few days of journals — or load a sample week — then let the AI decode what’s really driving your stress.'}
      </p>
      {!hasEntries && (
        <button type="button" onClick={onSample} className="btn btn-primary mt-5">
          <Icon path={I.spark} className="h-4 w-4" /> Load sample week & try it
        </button>
      )}
    </div>
  )
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function Dashboard({ analysis }) {
  const a = analysis
  return (
    <div className="space-y-6">
      {a.source === 'local' && (
        <p className="rounded-xl border border-neon-amber/30 bg-neon-amber/10 px-4 py-2.5 text-xs text-neon-amber" role="status">
          Showing results from the on-device pattern engine{a.warning ? ` (Gemini unavailable: ${a.warning})` : ''}. Add a
          Gemini API key in <code>.env</code> for richer AI narratives.
        </p>
      )}

      {/* 1. Stress DNA Profile */}
      <section className="glass relative overflow-hidden p-6 animate-fade-up">
        <div className="absolute inset-x-0 top-0 h-1 animate-gradient-pan bg-gradient-to-r from-neon-cyan via-neon-violet to-neon-pink bg-[length:200%_100%]" />
        <SectionTitle icon={I.dna} kicker="Your profile" title="Stress DNA Profile" />
        <p className="text-slate-200">{a.stressDnaProfile?.summary}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(a.stressDnaProfile?.traits || []).map((t, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">{t.label}</p>
              <p className="mt-0.5 text-sm font-semibold text-white">{t.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WOW: What AI Discovered */}
      <section className="glass relative overflow-hidden p-6 shadow-glow animate-fade-up" aria-labelledby="discover-h">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-neon-violet/20 blur-3xl" />
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-violet/20 text-neon-violet ring-1 ring-neon-violet/30">
            <Icon path={I.spark} />
          </span>
          <div>
            <p className="text-xs uppercase tracking-widest text-neon-violet">Judge-wow</p>
            <h2 id="discover-h" className="text-lg font-bold text-white">What AI Discovered About You</h2>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {(a.discoveries || []).map((d, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-neon-cyan/15 text-neon-cyan">
                <Icon path={I.spark} className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm text-slate-100">{d}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 2 + 3. Triggers & Emotional patterns */}
      <div className="grid gap-6 md:grid-cols-2">
        <CardGroup icon={I.target} title="Hidden Stress Triggers" accent="rose">
          {(a.hiddenTriggers || []).map((t, i) => (
            <PatternCard
              key={i} title={t.title} desc={t.description} index={i}
              badge={<Badge value={t.severity} />}
              meta={t.frequency != null ? `${t.frequency}× mentioned` : null}
            />
          ))}
        </CardGroup>

        <CardGroup icon={I.pulse} title="Emotional Patterns" accent="violet">
          {(a.emotionalPatterns || []).map((p, i) => (
            <PatternCard key={i} title={p.title} desc={p.description} index={i} />
          ))}
        </CardGroup>
      </div>

      {/* 4 + 5. Recovery + Burnout */}
      <div className="grid gap-6 md:grid-cols-2">
        <CardGroup icon={I.heart} title="Recovery Patterns" accent="emerald">
          {(a.recoveryPatterns || []).map((r, i) => (
            <PatternCard
              key={i} title={r.title} desc={r.description} index={i}
              badge={r.impact ? <Badge value={r.impact} kind={IMPACT} /> : null}
            />
          ))}
        </CardGroup>

        <section className="glass p-6 animate-fade-up">
          <SectionTitle icon={I.shield} kicker="Risk" title="Burnout Risk" />
          <BurnoutMeter risk={a.burnoutRisk} />
        </section>
      </div>

      {/* 6 + 7. Action plan + motivation */}
      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="glass p-6 animate-fade-up">
          <SectionTitle icon={I.list} kicker="Do this next" title="Personalized Action Plan" />
          <ol className="space-y-3">
            {(a.actionPlan || []).map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan text-xs font-bold text-white">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm text-slate-200">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="glass relative overflow-hidden p-6 animate-fade-up">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/15 via-transparent to-neon-violet/15" />
          <div className="relative">
            <SectionTitle icon={I.bolt} kicker="Coach" title="Motivation" />
            <blockquote className="text-balance text-lg font-medium leading-relaxed text-white">
              “{a.motivation?.message}”
            </blockquote>
          </div>
        </section>
      </div>
    </div>
  )
}

function CardGroup({ icon, title, children, accent = 'violet' }) {
  const accents = {
    rose: 'text-neon-rose', violet: 'text-neon-violet', emerald: 'text-neon-emerald', cyan: 'text-neon-cyan',
  }
  const count = Array.isArray(children) ? children.length : children ? 1 : 0
  return (
    <section className="glass p-6 animate-fade-up" aria-label={title}>
      <div className="mb-4 flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10 ${accents[accent]}`}>
          <Icon path={icon} />
        </span>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      {count === 0 ? (
        <p className="text-sm text-slate-500">No clear signals yet — keep logging.</p>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  )
}

function PatternCard({ title, desc, badge, meta, index = 0 }) {
  return (
    <article
      className="glass-hover rounded-xl border border-white/10 bg-white/[0.03] p-4 animate-fade-up"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="font-semibold text-white">{title}</h3>
        {badge}
      </div>
      <p className="text-sm leading-relaxed text-slate-300">{desc}</p>
      {meta && <p className="mt-2 text-xs font-medium text-neon-cyan">{meta}</p>}
    </article>
  )
}

/* ============================================================
   CONVERSATIONAL ASSISTANT
   ============================================================ */
const SUGGESTIONS = [
  'Why am I stressed?',
  "What should I do before tomorrow's mock test?",
  'How can I avoid burnout?',
]

function Assistant({ analysis }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "I've decoded your StressDNA. Ask me anything — I'll answer using your real patterns.",
    },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  async function ask(question) {
    const q = (question ?? input).trim()
    if (!q || thinking) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    setThinking(true)
    try {
      const reply = await chatWithAssistant(q, analysis, messages)
      setMessages((m) => [...m, { role: 'assistant', text: reply }])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: `Sorry — I hit an error answering that (${err.message}). Try rephrasing?` },
      ])
    } finally {
      setThinking(false)
    }
  }

  return (
    <section className="glass mt-6 overflow-hidden animate-fade-up" aria-labelledby="assistant-h">
      <div className="flex items-center gap-3 border-b border-white/10 p-5">
        <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-neon-cyan/15 text-neon-cyan">
          <Icon path={I.chat} />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-neon-emerald ring-2 ring-ink" />
        </span>
        <div>
          <h2 id="assistant-h" className="font-bold text-white">Conversational Wellness Assistant</h2>
          <p className="text-xs text-slate-400">Grounded in your discovered insights</p>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-80 space-y-4 overflow-y-auto p-5" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-br from-neon-indigo to-neon-violet text-white'
                  : 'border border-white/10 bg-white/5 text-slate-100'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-neon-cyan" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s} type="button" onClick={() => ask(s)} disabled={thinking}
              className="chip glass-hover hover:text-white disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); ask() }}
          className="flex items-center gap-2"
        >
          <label htmlFor="chat-input" className="sr-only">Ask the wellness assistant</label>
          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your stress, study or recovery…"
            className="field flex-1"
            autoComplete="off"
          />
          <button type="submit" disabled={thinking || !input.trim()} className="btn btn-primary px-4" aria-label="Send message">
            <Icon path={I.send} className="h-5 w-5" />
          </button>
        </form>
      </div>
    </section>
  )
}

/* ---------- footer ---------- */
function Footer({ usingLive }) {
  return (
    <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
      <p>
        StressDNA AI · Built with React + Vite + Tailwind + Gemini ·{' '}
        {usingLive ? 'Live AI analysis' : 'On-device engine (add a Gemini key for live AI)'}
      </p>
      <p className="mt-1">
        Supportive wellness tool — not a substitute for professional mental-health care. In crisis, reach out to someone
        you trust or a local helpline.
      </p>
    </footer>
  )
}
