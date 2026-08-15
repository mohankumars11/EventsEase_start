import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * What happens after you book — the six beats, drawn.
 *
 * ── Why this exists at all ────────────────────────────────────────────────
 * The Track tab only appears once somebody has ordered, so it cannot itself
 * persuade anybody to order. The awareness has to live where the decision is
 * made: the builder's review step, the checkout, and this screen's own empty
 * state. Somebody deciding whether to hand a wedding to a brand with no
 * ratings needs to see the machine that runs behind the booking — the
 * sourcing, the staged money, the coordinator on the ground — before they
 * commit, not after.
 *
 * ── Why it is drawn rather than filmed ────────────────────────────────────
 * The same reasoning as `components/home/BrandFilm.jsx`, which this reuses the
 * CSS of: Sambramo is pre-launch with no supplier, so real footage would be
 * stock video of somebody else's warehouse. Drawing it costs no bytes, never
 * loses the autoplay roulette against data-saver, and is retimed by one
 * constant.
 *
 * ── The beats are the tracker's own stages ────────────────────────────────
 * Deliberately. Every beat here is a step the Track screen later shows for
 * real, in the same order and the same words, so the film is a promise the
 * product then keeps rather than a separate marketing story. Beat 4 shows the
 * staged-payment mechanic, and beat 6 names the tab — which is what stops
 * somebody tapping it blind and wondering what it is.
 */

const BEAT_MS = 3000

const BEATS = [
  {
    key: 'tell',
    chapter: 'You tell us',
    line: 'One form. No calls yet.',
    sub: 'The occasion, the date, roughly how many people.',
    ground: 'radial-gradient(120% 100% at 30% 0%, #f3ecff 0%, #e7dcfb 50%, #d6c6f2 100%)',
    Art: TellArt,
  },
  {
    key: 'masters',
    chapter: 'We arrange the masters',
    line: 'Cooks, decorators, priests.',
    sub: 'Sourced, negotiated and checked for your date.',
    ground: 'radial-gradient(120% 100% at 70% 5%, #fff4e4 0%, #f7e2c4 52%, #e6cba4 100%)',
    Art: MastersArt,
  },
  {
    key: 'plan',
    chapter: 'Your plan, priced',
    line: 'One number, before anything is booked.',
    sub: 'You approve it. Nothing is committed until you do.',
    ground: 'radial-gradient(120% 100% at 40% 0%, #eaf6f0 0%, #d3ebe0 52%, #b3dcc9 100%)',
    Art: PlanArt,
  },
  {
    key: 'stages',
    chapter: 'Paid in stages',
    line: 'Never all at once.',
    sub: 'Each payment releases the next piece of work.',
    ground: 'radial-gradient(120% 100% at 60% 8%, #fff0f2 0%, #fbdde2 50%, #f0c2cb 100%)',
    Art: StagesArt,
  },
  {
    key: 'day',
    chapter: 'The day itself',
    line: 'One coordinator on the ground.',
    sub: 'From the morning setup to the last guest.',
    ground: 'radial-gradient(105% 95% at 50% 45%, #fff6dc 0%, #fbe6b4 40%, #eecf9e 100%)',
    Art: DayArt,
  },
  {
    key: 'track',
    chapter: 'And you watch it happen',
    line: 'Every step, in Track.',
    sub: 'Where your celebration is, and what your money just started.',
    ground: 'radial-gradient(120% 100% at 35% 5%, #f0edff 0%, #ded6fb 52%, #c5b6f0 100%)',
    Art: TrackArt,
  },
]

export default function FulfilmentFilm({ className = '', to = '/plan' }) {
  const reduced = useReducedMotion()
  const [beat, setBeat] = useState(0)
  const [held, setHeld] = useState(false)
  const [onScreen, setOnScreen] = useState(true)
  const stage = useRef(null)

  // Don't run the projector for a card nobody is looking at — and start from
  // beat one when it comes back, so the story is never joined halfway.
  useEffect(() => {
    const el = stage.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const running = !reduced && onScreen && !held

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setBeat(n => (n + 1) % BEATS.length), BEAT_MS)
    return () => clearInterval(id)
  }, [running])

  if (reduced) return <Storyboard className={className} />

  const current = BEATS[beat]
  const { Art } = current

  return (
    <section className={className} aria-label="How a Sambramo celebration is arranged">
      <Link
        ref={stage}
        to={to}
        aria-label={`${current.chapter} — ${current.line}`}
        className="group relative block h-[248px] overflow-hidden rounded-3xl ring-1 ring-hairline/10 shadow-[0_18px_44px_-24px_rgba(43,15,82,0.55)] sm:h-[276px]"
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
        onPointerDown={() => setHeld(true)}
      >
        <FilmDefs />

        {/* Grounds stay mounted and cross-fade. The art cuts — a film cuts —
            but a hard cut on a full-bleed colour reads as a flicker. */}
        {BEATS.map((b, i) => (
          <span
            key={b.key}
            aria-hidden="true"
            className="absolute inset-0 transition-opacity duration-[800ms] ease-out"
            style={{ background: b.ground, opacity: i === beat ? 1 : 0 }}
          />
        ))}

        <span aria-hidden="true" className="film-vignette absolute inset-0" />

        <span
          key={current.key}
          aria-hidden="true"
          className="absolute right-[-22px] top-1/2 -translate-y-1/2 sm:right-[-6px]"
        >
          <Art />
        </span>

        <span aria-hidden="true" className="film-grain absolute inset-0" />

        {/* The legibility ramp: opaque where the words are, clear over the
            drawing, so the art can run underneath without ever fighting it. */}
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(253,251,247,0.97) 0%, rgba(253,251,247,0.93) 34%, rgba(253,251,247,0.55) 58%, rgba(253,251,247,0.1) 76%, rgba(253,251,247,0) 88%)',
          }}
        />

        <span
          key={`cap-${current.key}`}
          className="absolute inset-y-0 left-0 flex w-[58%] flex-col justify-center p-4"
        >
          <span className="film-line block text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#7c3aed]">
            {current.chapter}
          </span>
          <span className="film-line film-line-2 mt-1.5 block font-serif text-[20px] font-extrabold leading-[1.06] text-[#2b0f52] sm:text-[25px]">
            {current.line}
          </span>
          <span className="film-line film-line-3 mt-1.5 block text-[11px] font-medium leading-snug text-[#5b4a70] sm:text-[12px]">
            {current.sub}
          </span>
          <span className="film-line film-line-3 mt-3">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-plum-900 px-3.5 py-2 text-[12px] font-extrabold text-white shadow-[0_8px_20px_-6px_rgba(43,15,82,0.8)]">
              Plan a celebration <ArrowRight size={13} strokeWidth={3} />
            </span>
          </span>
        </span>

        {/* Reel ticks — story-app convention, so one look says this is six
            short beats and not a carousel you have to drive. */}
        <span aria-hidden="true" className="absolute inset-x-3 top-3 flex gap-1.5">
          {BEATS.map((b, i) => (
            <span key={b.key} className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#2b0f52]/15">
              <span
                key={`${b.key}-${beat}`}
                className="block h-full rounded-full bg-[#2b0f52]/70"
                style={
                  i < beat ? { width: '100%' }
                  : i > beat ? { width: '0%' }
                  : {
                      animationName: 'deck-tick',
                      animationDuration: `${BEAT_MS}ms`,
                      animationTimingFunction: 'linear',
                      animationFillMode: 'forwards',
                      animationPlayState: running ? 'running' : 'paused',
                    }
                }
              />
            </span>
          ))}
        </span>
      </Link>
    </section>
  )
}

/* ── Shared paint ─────────────────────────────────────────────────────── */

function FilmDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute" focusable="false">
      <defs>
        <linearGradient id="ff-plum" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="60%" stopColor="#4c1d95" />
          <stop offset="100%" stopColor="#2e1065" />
        </linearGradient>
        <linearGradient id="ff-gold" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#fff3cd" />
          <stop offset="45%" stopColor="#f5c542" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
        <linearGradient id="ff-paper" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#fffdf8" />
          <stop offset="100%" stopColor="#ece0cc" />
        </linearGradient>
        <linearGradient id="ff-green" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#38a47b" />
          <stop offset="100%" stopColor="#0b3d2e" />
        </linearGradient>
        <linearGradient id="ff-skin" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#e0a877" />
          <stop offset="100%" stopColor="#a06a3c" />
        </linearGradient>
        <filter id="ff-shadow" x="-40%" y="-40%" width="180%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="ff-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
    </svg>
  )
}

const ART = 'h-[176px] w-[264px] sm:h-[206px] sm:w-[310px]'
const Shadow = ({ cx, cy, rx, ry = 4 }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#2b0f52" opacity="0.35" filter="url(#ff-shadow)" />
)

/**
 * The entrance, staggered per element.
 *
 * `index.css` carries the `film-item-in` keyframes but binds them to five
 * numbered classes (`.film-item-1` … `-5`) with the delay baked in, and
 * `.film-item` on its own sets only `transform-box`. These drawings stagger
 * across a variable number of pieces, so the animation is driven by longhands
 * here instead — reusing the same keyframes rather than adding a sixth class
 * to the stylesheet, and avoiding the React warning that comes from setting a
 * shorthand beside a longhand.
 */
const rise = (delay = 0) => ({
  animationName: 'film-item-in',
  animationDuration: '600ms',
  animationTimingFunction: 'cubic-bezier(0.34,1.3,0.5,1)',
  animationDelay: `${delay}s`,
  animationFillMode: 'both',
})

/* Beat 1 — the form. A phone with three answered lines and nothing else. */
function TellArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <Shadow cx="104" cy="110" rx="42" />
      <rect x="66" y="14" width="76" height="94" rx="11" fill="url(#ff-plum)" />
      <rect x="70" y="19" width="68" height="84" rx="8" fill="url(#ff-paper)" />
      {[
        { y: 30, w: 30, on: true },
        { y: 46, w: 44, on: true },
        { y: 62, w: 24, on: true },
        { y: 78, w: 38, on: false },
      ].map((r, i) => (
        <g key={i} className="film-item" style={rise(i * 0.12)}>
          <rect x="77" y={r.y} width={r.w} height="5" rx="2.5" fill={r.on ? '#4c1d95' : '#c9bfd8'} opacity={r.on ? 0.75 : 0.5} />
          {r.on && <circle cx="128" cy={r.y + 2.5} r="4" fill="#38a47b" />}
          {r.on && <path d={`M126 ${r.y + 2.5} l1.5 1.7 l3 -3.4`} stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />}
        </g>
      ))}
      {[[34, 34], [168, 28], [40, 88], [172, 92]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#a56eff" opacity="0.5" />
      ))}
    </svg>
  )
}

/* Beat 2 — the masters. Three trades, connected to one coordinator. */
function MastersArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <Shadow cx="100" cy="112" rx="56" />
      {/* the lines out to each trade, drawn first so the discs sit on them */}
      <path d="M100 62 L46 34 M100 62 L154 32 M100 62 L52 94 M100 62 L156 92"
            stroke="#b8860b" strokeWidth="1.4" opacity="0.5" strokeDasharray="3 4" />
      {/* the coordinator at the centre */}
      <circle cx="100" cy="62" r="21" fill="url(#ff-plum)" />
      <circle cx="100" cy="55" r="7" fill="url(#ff-skin)" />
      <path d="M88 74 q12 -13 24 0 q-12 6 -24 0 Z" fill="#fbbf24" />
      {/* the trades */}
      {[
        { x: 46, y: 34, e: '👨‍🍳', d: 0 },
        { x: 154, y: 32, e: '🎨', d: 0.15 },
        { x: 52, y: 94, e: '🪔', d: 0.3 },
        { x: 156, y: 92, e: '📷', d: 0.45 },
      ].map(m => (
        <g key={m.e} className="film-item" style={rise(m.d)}>
          <circle cx={m.x} cy={m.y} r="15" fill="#fffdf8" stroke="#e6cba4" strokeWidth="1.4" />
          <text x={m.x} y={m.y + 6} textAnchor="middle" fontSize="16">{m.e}</text>
          <circle cx={m.x + 11} cy={m.y - 10} r="5" fill="#38a47b" />
          <path d={`M${m.x + 8.6} ${m.y - 10} l1.7 1.9 l3.2 -3.7`} stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  )
}

/* Beat 3 — the plan. One sheet, one total, an approve stamp. */
function PlanArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <Shadow cx="100" cy="110" rx="46" />
      <g transform="rotate(-3 100 60)">
        <rect x="58" y="14" width="84" height="92" rx="6" fill="url(#ff-paper)" stroke="#d6c8b0" strokeWidth="1" />
        <rect x="58" y="14" width="84" height="14" rx="6" fill="url(#ff-plum)" />
        <rect x="58" y="22" width="84" height="6" fill="url(#ff-plum)" />
        {[38, 48, 58, 68].map((y, i) => (
          <g key={y} className="film-item" style={rise(i * 0.1)}>
            <rect x="66" y={y} width={i === 3 ? 26 : 40} height="4" rx="2" fill="#9c8fb0" opacity="0.55" />
            <rect x="112" y={y} width="22" height="4" rx="2" fill="#4c1d95" opacity="0.55" />
          </g>
        ))}
        <path d="M66 80 h68" stroke="#4c1d95" strokeWidth="1" opacity="0.3" />
        <rect x="66" y="86" width="30" height="7" rx="3" fill="#2e1065" opacity="0.8" />
        <rect x="108" y="85" width="26" height="9" rx="3" fill="url(#ff-gold)" />
      </g>
      {/* the approve stamp, arriving */}
      <g className="film-item" style={rise(0.5)}>
        <circle cx="150" cy="88" r="19" fill="none" stroke="#0b3d2e" strokeWidth="2.6" opacity="0.85" />
        <path d="M141 88 l6 6 l13 -14" stroke="#0b3d2e" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

/* Beat 4 — the ladder. Four rungs, the paid ones open, the rest padlocked. */
function StagesArt() {
  const rungs = [
    { y: 20, w: 34, paid: true },
    { y: 44, w: 56, paid: true },
    { y: 68, w: 72, paid: false },
    { y: 92, w: 62, paid: false },
  ]
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      {rungs.map((r, i) => (
        <g key={i} className="film-item" style={rise(i * 0.13)}>
          <rect x="40" y={r.y} width={r.w} height="16" rx="8"
                fill={r.paid ? 'url(#ff-green)' : '#fffdf8'}
                stroke={r.paid ? 'none' : '#e0c9cf'} strokeWidth="1.3" />
          <circle cx={40 + r.w + 14} cy={r.y + 8} r="9"
                  fill={r.paid ? '#0b3d2e' : '#f0c2cb'} opacity={r.paid ? 1 : 0.9} />
          {r.paid ? (
            <path d={`M${40 + r.w + 10} ${r.y + 8} l2.8 3 l5.4 -6`} stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          ) : (
            <>
              <rect x={40 + r.w + 10.5} y={r.y + 6.5} width="7" height="6" rx="1.4" fill="#7f1d1d" opacity="0.8" />
              <path d={`M${40 + r.w + 12} ${r.y + 6.5} v-2 a2 2 0 0 1 4 0 v2`} stroke="#7f1d1d" strokeWidth="1.3" fill="none" opacity="0.8" />
            </>
          )}
        </g>
      ))}
      <path d="M32 20 v88" stroke="#c98878" strokeWidth="1.6" opacity="0.45" strokeLinecap="round" />
    </svg>
  )
}

/* Beat 5 — the day. A lit stage, and one person with a headset in front. */
function DayArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <circle cx="104" cy="52" r="46" fill="#f5c542" opacity="0.28" filter="url(#ff-soft)" />
      <Shadow cx="104" cy="112" rx="58" />
      {/* the stage */}
      <path d="M52 92 h104 v10 a4 4 0 0 1 -4 4 h-96 a4 4 0 0 1 -4 -4 Z" fill="url(#ff-plum)" />
      <path d="M62 60 q42 -30 84 0 v32 h-84 Z" fill="#fffdf8" opacity="0.55" />
      {/* bunting */}
      <path d="M50 34 q54 16 108 -4" stroke="#b8860b" strokeWidth="1.3" fill="none" opacity="0.7" />
      {[62, 80, 98, 116, 134].map((x, i) => (
        <path key={x} d={`M${x} ${37 + Math.sin(i) * 2} l5 9 l5 -9 Z`} fill={i % 2 ? '#f5c542' : '#a56eff'} opacity="0.9" />
      ))}
      {/* the coordinator, front of house */}
      <g className="film-item" style={rise(0.25)}>
        <ellipse cx="104" cy="106" rx="12" ry="3" fill="#2b0f52" opacity="0.25" />
        <path d="M96 104 q0 -20 8 -20 q8 0 8 20 Z" fill="#4c1d95" />
        <circle cx="104" cy="78" r="7.5" fill="url(#ff-skin)" />
        <path d="M96.5 76 a7.5 7.5 0 0 1 15 0" stroke="#2b0f52" strokeWidth="2.4" fill="none" />
        <path d="M111 79 q4 1 4 4" stroke="#2b0f52" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <circle cx="115" cy="84" r="1.8" fill="#2b0f52" />
      </g>
      {[[36, 26], [166, 22], [30, 70], [172, 66]].map(([x, y], i) => (
        <path key={i} d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z"
              transform={`translate(${x} ${y})`} fill="#d9962a" opacity="0.8" />
      ))}
    </svg>
  )
}

/* Beat 6 — the tab. A phone showing the tracker, with the rail lit. */
function TrackArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <Shadow cx="104" cy="110" rx="42" />
      <rect x="66" y="10" width="76" height="100" rx="11" fill="url(#ff-plum)" />
      <rect x="70" y="15" width="68" height="84" rx="7" fill="url(#ff-paper)" />
      {/* the rail inside the phone */}
      {[24, 40, 56, 72].map((y, i) => {
        const done = i < 2
        return (
          <g key={y} className="film-item" style={rise(i * 0.14)}>
            <circle cx="82" cy={y} r="5.5" fill={done ? '#7c3aed' : '#d8cfe8'} />
            {done && <path d={`M79.6 ${y} l1.8 2 l3.4 -4`} stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" />}
            {i < 3 && <rect x="81" y={y + 6} width="2" height="10" fill={i < 1 ? '#7c3aed' : '#d8cfe8'} opacity="0.7" />}
            <rect x="93" y={y - 3.5} width={done ? 36 : 28} height="4" rx="2" fill={done ? '#4c1d95' : '#bdb2ce'} opacity="0.7" />
            <rect x="93" y={y + 2.5} width={done ? 22 : 16} height="3" rx="1.5" fill="#bdb2ce" opacity="0.55" />
          </g>
        )
      })}
      {/* the tab bar, with Track lit */}
      <rect x="70" y="86" width="68" height="13" rx="4" fill="#efe8fb" />
      {[78, 92, 106, 120, 132].map((x, i) => (
        <circle key={x} cx={x} cy="92.5" r={i === 2 ? 4 : 2.6} fill={i === 2 ? '#7c3aed' : '#c3b6dc'} />
      ))}
      <circle cx="110" cy="88" r="2.6" fill="#c62828" />
    </svg>
  )
}

/* ── Reduced motion ───────────────────────────────────────────────────────
   Not the film frozen — that is one frame and five captions nobody sees. The
   whole sequence at once, still legible as a sequence. */
function Storyboard({ className = '' }) {
  return (
    <section className={className} aria-label="How a Sambramo celebration is arranged">
      <FilmDefs />
      <ol className="grid grid-cols-2 gap-2.5">
        {BEATS.map((b, i) => {
          const { Art } = b
          return (
            <li key={b.key}>
              <Link
                to="/plan"
                className="block overflow-hidden rounded-2xl ring-1 ring-hairline/10"
                style={{ background: b.ground }}
              >
                <span aria-hidden="true" className="flex h-[74px] items-center justify-center [&>svg]:h-[66px] [&>svg]:w-[110px]">
                  <Art />
                </span>
                <span className="block bg-plum-950/80 p-2.5">
                  <span className="block text-[9px] font-extrabold uppercase tracking-[0.14em] text-saffron-300">
                    {i + 1} · {b.chapter}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] font-extrabold leading-tight text-white">{b.line}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
