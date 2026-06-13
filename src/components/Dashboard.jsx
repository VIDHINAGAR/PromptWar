/**
 * The results dashboard and its supporting pieces:
 *   - DashboardSkeleton: shimmer placeholder while analyzing
 *   - EmptyState:        pre-analysis call to action
 *   - Dashboard:         the full Stress DNA report
 *   - CardGroup / PatternCard: reusable card layouts
 */
import { Icon, ICONS } from './Icon.jsx'
import { Badge, SectionTitle } from './primitives.jsx'
import { BurnoutMeter } from './BurnoutMeter.jsx'

/** Shimmering placeholder shown while the AI analysis is in flight. */
export function DashboardSkeleton() {
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

/** Shown before any analysis exists; nudges the user to start. */
export function EmptyState({ onSample, hasEntries }) {
  return (
    <div className="glass grid place-items-center p-10 text-center animate-fade-up">
      <span className="mb-4 grid h-16 w-16 animate-floaty place-items-center rounded-2xl bg-gradient-to-br from-neon-violet/30 to-neon-cyan/30 text-neon-cyan">
        <Icon path={ICONS.dna} className="h-9 w-9" />
      </span>
      <h2 className="text-xl font-bold text-white">Your StressDNA hasn’t been sequenced yet</h2>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        {hasEntries
          ? 'Hit “Analyze My StressDNA” to discover your hidden triggers, emotional patterns and recovery levers.'
          : 'Log a few days of journals — or load a sample week — then let the AI decode what’s really driving your stress.'}
      </p>
      {!hasEntries && (
        <button type="button" onClick={onSample} className="btn btn-primary mt-5">
          <Icon path={ICONS.spark} className="h-4 w-4" /> Load sample week & try it
        </button>
      )}
    </div>
  )
}

const ACCENT_TEXT = {
  rose: 'text-neon-rose',
  violet: 'text-neon-violet',
  emerald: 'text-neon-emerald',
  cyan: 'text-neon-cyan',
}

/** A titled card section that lists `PatternCard`s (or an empty hint). */
function CardGroup({ icon, title, children, accent = 'violet' }) {
  const count = Array.isArray(children) ? children.length : children ? 1 : 0
  return (
    <section className="glass p-6 animate-fade-up" aria-label={title}>
      <div className="mb-4 flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10 ${ACCENT_TEXT[accent]}`}>
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

/** A single trigger / pattern / recovery card with optional badge + meta. */
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

export function Dashboard({ analysis }) {
  const {
    source,
    warning,
    stressDnaProfile,
    discoveries = [],
    hiddenTriggers = [],
    emotionalPatterns = [],
    recoveryPatterns = [],
    burnoutRisk,
    actionPlan = [],
    motivation,
  } = analysis

  return (
    <div className="space-y-6">
      {source === 'local' && (
        <p className="rounded-xl border border-neon-amber/30 bg-neon-amber/10 px-4 py-2.5 text-xs text-neon-amber" role="status">
          Showing results from the on-device pattern engine{warning ? ` (live AI unavailable: ${warning})` : ''}. Add an
          API key in <code>.env</code> for richer AI narratives.
        </p>
      )}

      {/* 1. Stress DNA Profile */}
      <section className="glass relative overflow-hidden p-6 animate-fade-up">
        <div className="absolute inset-x-0 top-0 h-1 animate-gradient-pan bg-gradient-to-r from-neon-cyan via-neon-violet to-neon-pink bg-[length:200%_100%]" />
        <SectionTitle icon={ICONS.dna} kicker="Your profile" title="Stress DNA Profile" />
        <p className="text-slate-200">{stressDnaProfile?.summary}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(stressDnaProfile?.traits || []).map((trait) => (
            <div key={trait.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">{trait.label}</p>
              <p className="mt-0.5 text-sm font-semibold text-white">{trait.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. WOW: What AI Discovered About You */}
      <section className="glass relative overflow-hidden p-6 shadow-glow animate-fade-up" aria-labelledby="discover-h">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-neon-violet/20 blur-3xl" />
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-violet/20 text-neon-violet ring-1 ring-neon-violet/30">
            <Icon path={ICONS.spark} />
          </span>
          <div>
            <p className="text-xs uppercase tracking-widest text-neon-violet">Judge-wow</p>
            <h2 id="discover-h" className="text-lg font-bold text-white">What AI Discovered About You</h2>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {discoveries.map((discovery, i) => (
            <li
              key={discovery}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-neon-cyan/15 text-neon-cyan">
                <Icon path={ICONS.spark} className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm text-slate-100">{discovery}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 3 + 4. Hidden triggers & emotional patterns */}
      <div className="grid gap-6 md:grid-cols-2">
        <CardGroup icon={ICONS.target} title="Hidden Stress Triggers" accent="rose">
          {hiddenTriggers.map((trigger, i) => (
            <PatternCard
              key={trigger.title}
              title={trigger.title}
              desc={trigger.description}
              index={i}
              badge={<Badge value={trigger.severity} />}
              meta={trigger.frequency != null ? `${trigger.frequency}× mentioned` : null}
            />
          ))}
        </CardGroup>

        <CardGroup icon={ICONS.pulse} title="Emotional Patterns" accent="violet">
          {emotionalPatterns.map((pattern, i) => (
            <PatternCard key={pattern.title} title={pattern.title} desc={pattern.description} index={i} />
          ))}
        </CardGroup>
      </div>

      {/* 5 + 6. Recovery patterns & burnout meter */}
      <div className="grid gap-6 md:grid-cols-2">
        <CardGroup icon={ICONS.heart} title="Recovery Patterns" accent="emerald">
          {recoveryPatterns.map((pattern, i) => (
            <PatternCard
              key={pattern.title}
              title={pattern.title}
              desc={pattern.description}
              index={i}
              badge={pattern.impact ? <Badge value={pattern.impact} /> : null}
            />
          ))}
        </CardGroup>

        <section className="glass p-6 animate-fade-up">
          <SectionTitle icon={ICONS.shield} kicker="Risk" title="Burnout Risk" />
          <BurnoutMeter risk={burnoutRisk} />
        </section>
      </div>

      {/* 7 + 8. Action plan & motivation */}
      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="glass p-6 animate-fade-up">
          <SectionTitle icon={ICONS.list} kicker="Do this next" title="Personalized Action Plan" />
          <ol className="space-y-3">
            {actionPlan.map((step, i) => (
              <li key={step} className="flex items-start gap-3">
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
            <SectionTitle icon={ICONS.bolt} kicker="Coach" title="Motivation" />
            <blockquote className="text-balance text-lg font-medium leading-relaxed text-white">
              “{motivation?.message}”
            </blockquote>
          </div>
        </section>
      </div>
    </div>
  )
}
