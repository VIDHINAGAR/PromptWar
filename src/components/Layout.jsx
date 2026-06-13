/**
 * Page chrome: animated background blobs, the app header (with
 * live/offline provider badge) and the footer disclaimer.
 */
import { Icon, ICONS } from './Icon.jsx'

/** Decorative, non-interactive gradient blobs behind the app. */
export function BackgroundDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-neon-violet/20 blur-3xl animate-floaty" />
      <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-neon-cyan/20 blur-3xl animate-floaty [animation-delay:1.5s]" />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-neon-pink/20 blur-3xl animate-floaty [animation-delay:3s]" />
    </div>
  )
}

export function Header({ usingLive }) {
  return (
    <header className="animate-fade-up">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-violet text-white shadow-glow">
            <Icon path={ICONS.dna} className="h-7 w-7" />
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
          title={usingLive ? 'AI provider key detected' : 'No API key — running the on-device pattern engine'}
        >
          <span className={`h-2 w-2 rounded-full ${usingLive ? 'bg-neon-emerald' : 'bg-neon-amber'} animate-pulse`} />
          {usingLive ? 'AI Live' : 'Offline Engine'}
        </span>
      </div>
      <p className="mt-4 max-w-2xl text-balance text-slate-300">
        Most apps tell you <em>how</em> you feel. StressDNA discovers{' '}
        <strong className="text-white">why</strong> you feel that way — and{' '}
        <strong className="text-white">what actually helps you recover</strong> — by decoding the
        hidden triggers and emotional patterns inside your study journals.
      </p>
    </header>
  )
}

export function Footer({ usingLive }) {
  return (
    <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
      <p>
        StressDNA AI · Built with React + Vite + Tailwind + Gemini ·{' '}
        {usingLive ? 'Live AI analysis' : 'On-device engine (add an API key for live AI)'}
      </p>
      <p className="mt-1">
        Supportive wellness tool — not a substitute for professional mental-health care. In crisis,
        reach out to someone you trust or a local helpline.
      </p>
    </footer>
  )
}
