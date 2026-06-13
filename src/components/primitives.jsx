/**
 * Small presentational primitives shared across the dashboard:
 * the severity/impact `Badge` and the `SectionTitle` header.
 */
import { Icon } from './Icon.jsx'

/** Tailwind classes per severity / impact level. */
export const SEVERITY_STYLES = {
  High: 'text-neon-rose border-neon-rose/40 bg-neon-rose/10',
  Medium: 'text-neon-amber border-neon-amber/40 bg-neon-amber/10',
  Low: 'text-neon-emerald border-neon-emerald/40 bg-neon-emerald/10',
}

/** A pill showing a Low / Medium / High level. */
export function Badge({ value, styles = SEVERITY_STYLES }) {
  const className = styles[value] || SEVERITY_STYLES.Low
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {value}
    </span>
  )
}

/** Icon + kicker + title block used at the top of each dashboard section. */
export function SectionTitle({ icon, kicker, title }) {
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
