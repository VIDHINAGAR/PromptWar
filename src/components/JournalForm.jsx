/**
 * Left-column input area: the daily check-in form (`JournalForm`),
 * its labelled `SliderField` inputs, and the scrollable `EntryList`.
 */
import { Icon, ICONS } from './Icon.jsx'

/** A labelled range slider with a live value readout and filled track. */
function SliderField({ id, icon, label, value, onChange, min, max, step = 1, suffix }) {
  const filledPct = ((value - min) / (max - min)) * 100
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
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        aria-valuetext={`${value}${suffix}`}
        className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none focus:ring-2 focus:ring-neon-violet/40"
        style={{ background: `linear-gradient(90deg,#8B5CF6 ${filledPct}%, rgba(255,255,255,0.1) ${filledPct}%)` }}
      />
    </div>
  )
}

export function JournalForm({ form, setForm, onSubmit, onSample, error }) {
  const updateField = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  return (
    <section className="glass p-5 animate-fade-up" aria-labelledby="log-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="log-heading" className="flex items-center gap-2 font-bold text-white">
          <Icon path={ICONS.plus} className="h-5 w-5 text-neon-cyan" /> Daily Check-in
        </h2>
        <button type="button" onClick={onSample} className="text-xs font-medium text-neon-cyan hover:underline">
          Load sample week
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="date" className="label">Date</label>
          <input id="date" type="date" value={form.date} onChange={updateField('date')} className="field" />
        </div>

        <div>
          <label htmlFor="journal" className="label">Journal entry</label>
          <textarea
            id="journal"
            rows={4}
            value={form.journal}
            onChange={updateField('journal')}
            placeholder="How did today go? Mock tests, family, comparisons, what drained or recharged you…"
            className="field resize-none"
            aria-describedby="journal-hint"
          />
          <p id="journal-hint" className="mt-1 text-xs text-slate-500">
            Write naturally — the AI reads between the lines for hidden triggers.
          </p>
        </div>

        <SliderField
          id="mood" icon={ICONS.heart} label="Mood" value={form.mood} onChange={updateField('mood')}
          min={1} max={10} suffix="/10"
        />
        <SliderField
          id="study" icon={ICONS.book} label="Study hours" value={form.studyHours} onChange={updateField('studyHours')}
          min={0} max={16} step={0.5} suffix="h"
        />
        <SliderField
          id="sleep" icon={ICONS.moon} label="Sleep hours" value={form.sleepHours} onChange={updateField('sleepHours')}
          min={0} max={12} step={0.5} suffix="h"
        />

        {error && (
          <p role="alert" className="rounded-lg border border-neon-rose/40 bg-neon-rose/10 px-3 py-2 text-sm text-neon-rose">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-ghost w-full">
          <Icon path={ICONS.plus} className="h-4 w-4" /> Add entry
        </button>
      </form>
    </section>
  )
}

export function EntryList({ entries, onRemove }) {
  if (entries.length === 0) return null

  return (
    <section className="glass p-5 animate-fade-up" aria-label="Logged entries">
      <h2 className="mb-3 flex items-center gap-2 font-bold text-white">
        <Icon path={ICONS.list} className="h-5 w-5 text-neon-cyan" /> Your Log
        <span className="chip ml-auto">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </h2>
      <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {entries.map((entry) => (
          <li key={entry.id} className="group flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neon-violet/15 text-sm font-bold text-neon-violet">
              {entry.mood}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                <span>{entry.date}</span>
                <span>· {entry.studyHours}h study</span>
                <span>· {entry.sleepHours}h sleep</span>
              </div>
              <p className="truncate text-sm text-slate-200">{entry.journal}</p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(entry.id)}
              aria-label={`Delete entry from ${entry.date}`}
              className="rounded-lg p-1.5 text-slate-500 opacity-0 transition hover:bg-neon-rose/10 hover:text-neon-rose group-hover:opacity-100 focus:opacity-100"
            >
              <Icon path={ICONS.trash} className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
