/**
 * A tiny dependency-free icon system.
 *
 * `Icon` renders a 24×24 stroked SVG; `ICONS` holds the path
 * geometry for every glyph used across the app. Keeping icons
 * inline avoids shipping an icon library for ~14 shapes.
 */

export function Icon({ path, className = 'w-5 h-5' }) {
  return (
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
}

export const ICONS = {
  dna: (
    <>
      <path d="M7 4c0 6 10 6 10 12M17 4c0 6-10 6-10 12" />
      <path d="M8 7h8M8 17h8M9 11h6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  pulse: <path d="M3 12h4l2 6 4-12 2 6h6" />,
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  list: (
    <>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </>
  ),
  heart: <path d="M12 20s-7-4.6-9-9C1.5 7 4 4 7 4c2 0 3 1 5 3 2-2 3-3 5-3 3 0 5.5 3 4 7-2 4.4-9 9-9 9z" />,
  chat: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />,
  send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  book: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM19 3v18" />,
}
