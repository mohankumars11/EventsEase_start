// The colour of each occasion, as light on a dark ground.
//
// ── Why this is not just the Tailwind gradient ──────────────────────────
// EVENT_DATA already carries `heroGradient` — "from-pink-600 via-rose-500
// to-amber-500" — and that is the right thing for a solid banner. It is the
// wrong thing for the occasion page's ground, which is three soft lights in a
// dark room rather than a painted stripe: a Tailwind class cannot be dropped
// into a radial-gradient at 40% alpha, and a page whose ground is a hard
// three-colour ramp is a poster, not a room.
//
// So each occasion gets three light colours and one accent, as real values,
// set on the page as CSS variables (--event-a/b/c/glow) that .event-canvas and
// .event-halo read. The hues are taken from the same Tailwind stops the
// occasion already used, so nothing changes identity — a birthday is still
// pink into amber, a housewarming still green into teal.
//
// ── Why every occasion needs its own ────────────────────────────────────
// This is the fix for the specific complaint that clicking "Birthday" landed
// on a page that could have been about anything. Fifteen occasions rendering
// in identical plum is a template; the same fifteen each arriving in their own
// light is fifteen pages. The cost is one table.
//
// `glow` is the single accent — the halo around a chosen scale, the underline
// on the active tab, the ring on a selected option. It is deliberately the
// warmest of the three, because it marks the thing the customer just chose and
// warmth is what a chosen thing should look like.

const THEME = {
  birthday: {
    a: 'rgba(219, 39, 119, 0.42)',  // pink-600
    b: 'rgba(245, 158, 11, 0.24)',  // amber-500
    c: 'rgba(244, 63, 94, 0.18)',   // rose-500
    glow: '#fb7185',
    ink: '#db2777',
  },
  first_birthday: {
    a: 'rgba(37, 99, 235, 0.40)',   // blue-600
    b: 'rgba(168, 85, 247, 0.24)',  // purple-500
    c: 'rgba(99, 102, 241, 0.20)',  // indigo-500
    glow: '#818cf8',
    ink: '#4f46e5',
  },
  baby_shower: {
    a: 'rgba(14, 165, 233, 0.40)',  // sky-500
    b: 'rgba(96, 165, 250, 0.24)',  // blue-400
    c: 'rgba(99, 102, 241, 0.18)',  // indigo-500
    glow: '#7dd3fc',
    ink: '#0284c7',
  },
  seemantham: {
    a: 'rgba(13, 148, 136, 0.40)',  // teal-600
    b: 'rgba(6, 182, 212, 0.24)',   // cyan-500
    c: 'rgba(52, 211, 153, 0.18)',  // emerald-400
    glow: '#5eead4',
    ink: '#0d9488',
  },
  naming_ceremony: {
    a: 'rgba(124, 58, 237, 0.42)',  // violet-600
    b: 'rgba(232, 121, 249, 0.24)', // fuchsia-400
    c: 'rgba(168, 85, 247, 0.18)',  // purple-500
    glow: '#d8b4fe',
    ink: '#7c3aed',
  },
  thread_ceremony: {
    a: 'rgba(217, 119, 6, 0.42)',   // amber-600
    b: 'rgba(250, 204, 21, 0.24)',  // yellow-400
    c: 'rgba(249, 115, 22, 0.20)',  // orange-500
    glow: '#fcd34d',
    ink: '#d97706',
  },
  housewarming: {
    a: 'rgba(22, 163, 74, 0.40)',   // green-600
    b: 'rgba(45, 212, 191, 0.24)',  // teal-400
    c: 'rgba(16, 185, 129, 0.18)',  // emerald-500
    glow: '#6ee7b7',
    ink: '#16a34a',
  },
  anniversary: {
    a: 'rgba(225, 29, 72, 0.42)',   // rose-600
    b: 'rgba(236, 72, 153, 0.24)',  // pink-500
    c: 'rgba(239, 68, 68, 0.18)',   // red-500
    glow: '#fda4af',
    ink: '#e11d48',
  },
  engagement: {
    a: 'rgba(192, 38, 211, 0.42)',  // fuchsia-600
    b: 'rgba(236, 72, 153, 0.24)',  // pink-500
    c: 'rgba(168, 85, 247, 0.18)',  // purple-500
    glow: '#f0abfc',
    ink: '#c026d3',
  },
  sangeet: {
    a: 'rgba(147, 51, 234, 0.42)',  // purple-600
    b: 'rgba(217, 70, 239, 0.26)',  // fuchsia-500
    c: 'rgba(236, 72, 153, 0.18)',  // pink-500
    glow: '#e879f9',
    ink: '#9333ea',
  },
  wedding: {
    a: 'rgba(185, 28, 28, 0.42)',   // red-700
    b: 'rgba(245, 158, 11, 0.26)',  // amber-500
    c: 'rgba(225, 29, 72, 0.18)',   // rose-600
    glow: '#fbbf24',
    ink: '#b91c1c',
  },
  get_together: {
    a: 'rgba(249, 115, 22, 0.42)',  // orange-500
    b: 'rgba(250, 204, 21, 0.26)',  // yellow-400
    c: 'rgba(245, 158, 11, 0.18)',  // amber-500
    glow: '#fdba74',
    ink: '#ea580c',
  },
  retirement: {
    a: 'rgba(59, 130, 246, 0.38)',  // blue-500
    b: 'rgba(99, 102, 241, 0.24)',  // indigo-500
    c: 'rgba(71, 85, 105, 0.20)',   // slate-600
    glow: '#93c5fd',
    ink: '#2563eb',
  },
  graduation: {
    a: 'rgba(79, 70, 229, 0.40)',   // indigo-600
    b: 'rgba(34, 211, 238, 0.24)',  // cyan-400
    c: 'rgba(59, 130, 246, 0.18)',  // blue-500
    glow: '#67e8f9',
    ink: '#4f46e5',
  },
  corporate_event: {
    a: 'rgba(71, 85, 105, 0.42)',   // slate-600
    b: 'rgba(56, 189, 248, 0.20)',  // sky-400
    c: 'rgba(113, 113, 122, 0.20)', // zinc-500
    glow: '#7dd3fc',
    ink: '#334155',
  },
}

/** The house plum, for an occasion the table has not been taught yet. */
const FALLBACK = {
  a: 'rgba(124, 58, 237, 0.40)',
  b: 'rgba(245, 158, 11, 0.20)',
  c: 'rgba(217, 70, 239, 0.16)',
  glow: '#f59e0b',
  ink: '#7c3aed',
}

export function occasionTheme(eventId) {
  return THEME[eventId] ?? FALLBACK
}

/**
 * The theme as the style object the page puts on its root element.
 *
 * Returned pre-shaped so no caller has to remember the variable names — the
 * CSS in index.css and this file are the only two places that know them, and
 * they are next to each other in the same commit.
 */
export function occasionThemeVars(eventId) {
  const t = occasionTheme(eventId)
  return {
    '--event-a': t.a,
    '--event-b': t.b,
    '--event-c': t.c,
    '--event-glow': t.glow,
    '--event-ink': t.ink,
  }
}
