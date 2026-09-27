import './DoorstepFilm.css'
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { LOCK_AMOUNT } from '../../data/celebrationTiers'
import { formatINR } from '../../utils/format'

/**
 * What the price lock actually buys — the six beats, drawn.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * The lock is the single most unusual thing this business does and it was
 * stated nowhere a browsing customer would meet it: one line at the foot of
 * TierRail, one row in EventFooter's reassurance strip. Both of them describe
 * it as a payment ("₹1,000 holds your quote and your date"), which is the
 * mechanic and not the offer. The offer is that somebody then travels to your
 * house with the proposal in their hands and changes it at your table.
 *
 * Nobody pays ₹1,000 to a pre-launch brand for a line of copy. They might pay
 * it to watch the visit happen first, which is what this is for.
 *
 * ── Why it is drawn rather than filmed ────────────────────────────────────
 * Same reasoning FulfilmentFilm sets out and the same reasoning the visual
 * direction has carried since: Sambramo is pre-launch with no supplier, so
 * real footage would be stock video of somebody else's coordinator on
 * somebody else's doorstep — the exact borrowed-brand problem the Bandhu name
 * was chosen to avoid. Drawing it costs no bytes, never loses the autoplay
 * roulette against data-saver, and is retimed by one constant.
 *
 * ── Every beat is a promise the product already keeps ─────────────────────
 * Deliberately, and this is the constraint to hold on to when editing the
 * copy. The amount is LOCK_AMOUNT, not a typed number. Refundable and
 * adjusted-against-the-bill are the terms EventFooter and LockPayment already
 * state. "Nothing is booked until you approve" is what quote.js is built
 * around. The one genuinely new claim is the visit itself, and it is stated
 * as included rather than priced, because it is.
 *
 * ── On the name ───────────────────────────────────────────────────────────
 * `MEMBERSHIP.name` is already "Sambramo Bandhu" — kin, the one who handles
 * it for you — and its first stated benefit is a named coordinator who knows
 * your family. So the person who arrives is the Bandhu, and the membership is
 * named after the role rather than the other way round. Keeping one word for
 * both is what stops this reading as a second brand bolted on.
 */

const BEAT_MS = 3400

const BEATS = [
  {
    key: 'lock',
    chapter: 'Step one',
    line: `${formatINR(LOCK_AMOUNT)} holds the price.`,
    sub: 'And your date. It comes off the final bill, and it comes back if you walk away.',
    ground: 'radial-gradient(120% 100% at 32% 0%, #fff4e4 0%, #f8e3c6 52%, #e8cca4 100%)',
    Art: LockArt,
  },
  {
    key: 'sets-out',
    chapter: 'Then we come to you',
    line: 'A Bandhu sets out.',
    sub: 'Not a call centre and not a sales visit — the coordinator who will run your day.',
    ground: 'radial-gradient(120% 100% at 68% 6%, #eaf6f0 0%, #d1ebdf 52%, #aedcc7 100%)',
    Art: RideArt,
  },
  {
    key: 'doorstep',
    chapter: 'At your door',
    line: 'The proposal, on your table.',
    sub: 'Your home, your time, your family in the room. No office to visit.',
    ground: 'radial-gradient(120% 100% at 40% 0%, #f3ecff 0%, #e5daf9 52%, #d0bff0 100%)',
    Art: DoorArt,
  },
  {
    key: 'read',
    chapter: 'Read together',
    line: 'Every line, out loud.',
    sub: 'The menu, the decor, the numbers. Ask anything — that is what the visit is for.',
    ground: 'radial-gradient(120% 100% at 60% 8%, #fffaf0 0%, #f7ead1 50%, #e9d3ac 100%)',
    Art: ReadArt,
  },
  {
    key: 'change',
    chapter: 'Does it fit?',
    line: 'Changed at the table.',
    sub: 'Swap the menu, move the stage, cut a line you do not want. Then and there.',
    ground: 'radial-gradient(120% 100% at 36% 4%, #fff0f2 0%, #fadce1 50%, #efc0c9 100%)',
    Art: ChangeArt,
  },
  {
    key: 'yes',
    chapter: 'Only then',
    line: 'Nothing is booked until you say yes.',
    sub: `Say no and the ${formatINR(LOCK_AMOUNT)} comes back. That is the whole risk.`,
    ground: 'radial-gradient(105% 95% at 50% 45%, #f0edff 0%, #ddd5fb 45%, #c3b4f0 100%)',
    Art: SealArt,
  },
]

export default function DoorstepFilm({ className = '', to = '/plan/build' }) {
  const reduced = useReducedMotion()
  const [beat, setBeat] = useState(0)
  const [held, setHeld] = useState(false)
  const [onScreen, setOnScreen] = useState(false)
  const stage = useRef(null)

  // Don't run the projector for a card nobody is looking at — and start from
  // beat one when it comes back, so the story is never joined halfway. This
  // one starts false rather than true because it sits mid-page: on Home it is
  // below the fold on every phone, so the honest default is "not yet".
  useEffect(() => {
    const el = stage.current
    if (!el || typeof IntersectionObserver === 'undefined') { setOnScreen(true); return }
    const io = new IntersectionObserver(([e]) => {
      setOnScreen(e.isIntersecting)
      if (!e.isIntersecting) setBeat(0)
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const running = !reduced && onScreen && !held

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setBeat(n => (n + 1) % BEATS.length), BEAT_MS)
    return () => clearInterval(id)
  }, [running])

  if (reduced) return <Storyboard className={className} to={to} />

  const current = BEATS[beat]
  const { Art } = current

  return (
    <section className={className} aria-label={`What ${formatINR(LOCK_AMOUNT)} holds, and the visit that follows`}>
      <div className="px-5">
        <h2 className="text-[19px] font-extrabold leading-tight tracking-tight text-ink">
          Hold the price. We bring the proposal to your door.
        </h2>
        <p className="mt-0.5 text-[12px] text-ink-mute">
          {formatINR(LOCK_AMOUNT)}, refundable — and a Bandhu at your doorstep, included.
        </p>
      </div>

      <div className="mt-3 px-4">
        <Link
          ref={stage}
          to={to}
          aria-label={`${current.chapter} — ${current.line}`}
          className="group relative block h-[252px] overflow-hidden rounded-3xl ring-1 ring-hairline/10 shadow-[0_18px_44px_-24px_rgba(43,15,82,0.55)] sm:h-[280px]"
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

          <span aria-hidden="true" className="df-vignette absolute inset-0" />

          {/* Motes drift across every beat, so the panel is never fully still
              even in the settled third. Positions are hand-placed rather than
              random: a random scatter re-rolls on every render. */}
          {[
            { left: '18%', dur: '9s',    delay: '0s',   size: 5, o: 0.18 },
            { left: '46%', dur: '11.5s', delay: '2.4s', size: 4, o: 0.14 },
            { left: '71%', dur: '10s',   delay: '1.2s', size: 6, o: 0.16 },
            { left: '88%', dur: '12.5s', delay: '3.6s', size: 4, o: 0.12 },
          ].map((m, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="df-mote pointer-events-none absolute rounded-full bg-white"
              style={{
                left: m.left,
                width: m.size, height: m.size,
                animationDuration: m.dur,
                animationDelay: m.delay,
                '--mote-o': m.o,
              }}
            />
          ))}

          <span
            key={current.key}
            aria-hidden="true"
            className="absolute right-[-24px] top-1/2 -translate-y-1/2 sm:right-[-8px]"
          >
            <Art />
          </span>

          <span aria-hidden="true" className="df-grain absolute inset-0" />

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
            className="absolute inset-y-0 left-0 flex w-[60%] flex-col justify-center p-4"
          >
            <span className="df-line block text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#7c3aed]">
              {current.chapter}
            </span>
            <span className="df-line df-line-2 mt-1.5 block font-serif text-[20px] font-extrabold leading-[1.06] text-[#2b0f52] sm:text-[24px]">
              {current.line}
            </span>
            <span className="df-line df-line-3 mt-1.5 block text-[11px] font-medium leading-snug text-[#5b4a70] sm:text-[12px]">
              {current.sub}
            </span>
            <span className="df-line df-line-3 mt-3">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-plum-900 px-3.5 py-2 text-[12px] font-extrabold text-white shadow-[0_8px_20px_-6px_rgba(43,15,82,0.8)]">
                Build it and hold it <ArrowRight size={13} strokeWidth={3} />
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
      </div>
    </section>
  )
}

/* ── Shared paint ─────────────────────────────────────────────────────── */

/* Ids are `df-` prefixed because FulfilmentFilm's defs use `ff-` and both
   films can be mounted in the same document — SVG gradient ids are global,
   and a collision silently repaints one film with the other's palette. */
function FilmDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute" focusable="false">
      <defs>
        <linearGradient id="df-plum" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="60%" stopColor="#4c1d95" />
          <stop offset="100%" stopColor="#2e1065" />
        </linearGradient>
        <linearGradient id="df-gold" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#fff3cd" />
          <stop offset="45%" stopColor="#f5c542" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
        <linearGradient id="df-paper" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#fffdf8" />
          <stop offset="100%" stopColor="#ebdfca" />
        </linearGradient>
        <linearGradient id="df-green" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#38a47b" />
          <stop offset="100%" stopColor="#0b3d2e" />
        </linearGradient>
        <linearGradient id="df-skin" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#e0a877" />
          <stop offset="100%" stopColor="#a06a3c" />
        </linearGradient>
        <linearGradient id="df-brick" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#f0e2d2" />
          <stop offset="100%" stopColor="#d4bda3" />
        </linearGradient>
        <filter id="df-shadow" x="-40%" y="-40%" width="180%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="df-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
    </svg>
  )
}

const ART = 'h-[178px] w-[268px] sm:h-[208px] sm:w-[314px]'

const Shadow = ({ cx, cy, rx, ry = 4 }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#2b0f52" opacity="0.32" filter="url(#df-shadow)" />
)

/**
 * The entrance, staggered per element.
 *
 * Driven by longhands rather than a numbered class per step: these drawings
 * stagger across a variable number of pieces, and setting the `animation`
 * shorthand beside a longhand is the React warning FulfilmentFilm documents.
 */
const rise = (delay = 0) => ({
  animationName: 'df-rise',
  animationDuration: '600ms',
  animationTimingFunction: 'cubic-bezier(0.34,1.3,0.5,1)',
  animationDelay: `${delay}s`,
  animationFillMode: 'both',
  transformBox: 'fill-box',
})

/* Beat 1 — the lock. A priced sheet, and a padlock closing over the total. */
function LockArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <Shadow cx="100" cy="110" rx="46" />

      {/* The quote, tilted just off square so it reads as paper on a table. */}
      <g transform="rotate(-4 100 62)">
        <rect x="56" y="16" width="88" height="92" rx="7" fill="url(#df-paper)" />
        <rect x="56" y="16" width="88" height="12" rx="7" fill="#4c1d95" opacity="0.85" />
        {[38, 50, 62, 74].map((y, i) => (
          <g key={y} style={rise(i * 0.1)}>
            <rect x="64" y={y} width={[42, 34, 48, 30][i]} height="4" rx="2" fill="#5b4a70" opacity="0.45" />
            <rect x="118" y={y} width="18" height="4" rx="2" fill="#5b4a70" opacity="0.3" />
          </g>
        ))}
        {/* The total rule, and the total. */}
        <rect x="64" y="86" width="72" height="1.5" rx="0.75" fill="#2b0f52" opacity="0.25" />
        <rect x="64" y="93" width="30" height="6" rx="3" fill="#2b0f52" opacity="0.6" style={rise(0.42)} />
        <rect x="106" y="93" width="30" height="6" rx="3" fill="#b8860b" opacity="0.85" style={rise(0.5)} />
      </g>

      {/* The padlock, closing on top of it. */}
      <g>
        <path
          className="df-shackle"
          d="M126 58 v-9 a11 11 0 0 1 22 0 v9"
          fill="none" stroke="#b8860b" strokeWidth="6.5" strokeLinecap="round"
        />
        <rect x="118" y="56" width="38" height="30" rx="7" fill="url(#df-gold)" style={rise(0.3)} />
        <circle cx="137" cy="68" r="4.2" fill="#7a5a06" />
        <rect x="135.4" y="70" width="3.2" height="8" rx="1.6" fill="#7a5a06" />
        <rect className="df-clack" x="112" y="50" width="50" height="42" rx="12" fill="none" stroke="#b8860b" strokeWidth="2" />
      </g>

      {/* The held amount, tagged to the lock. */}
      <g style={rise(0.55)}>
        <rect x="30" y="72" width="42" height="19" rx="9.5" fill="url(#df-green)" />
        <text x="51" y="85.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="#ffffff" fontFamily="system-ui, sans-serif">
          ₹1,000
        </text>
      </g>
      <path d="M72 81 h40" stroke="#0b3d2e" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" style={rise(0.65)} />
    </svg>
  )
}

/* Beat 2 — the journey. A rider crossing, folder under the arm. */
function RideArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <Shadow cx="104" cy="104" rx="48" ry="5" />

      {/* Road. Two dash runs, each 28 wide, so the loop seam is invisible. */}
      <rect x="0" y="98" width="200" height="3" rx="1.5" fill="#0b3d2e" opacity="0.18" />
      <g className="df-road">
        {[-28, 0, 28, 56, 84, 112, 140, 168, 196].map(x => (
          <rect key={x} x={x} y="99" width="16" height="2" rx="1" fill="#0b3d2e" opacity="0.35" />
        ))}
      </g>

      {/* Skyline behind, receding — it is why the ride reads as travel and not
          as a scooter idling on the spot. */}
      {[[24, 62, 18, 36], [50, 54, 14, 44], [150, 58, 16, 40], [174, 50, 18, 48]].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill="#0b3d2e" opacity="0.09" />
      ))}

      <g className="df-ride">
        {/* Scooter */}
        <path d="M74 92 q4 -18 20 -18 h14 l6 -12 h10" fill="none" stroke="#4c1d95" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M92 92 h26 q10 0 12 -10 l2 -8" fill="none" stroke="#4c1d95" strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="104" cy="70" rx="15" ry="5.5" fill="#2e1065" />
        <circle className="df-wheel" cx="80" cy="92" r="9" fill="none" stroke="#2b0f52" strokeWidth="3.5" strokeDasharray="4 4" />
        <circle className="df-wheel" cx="126" cy="92" r="9" fill="none" stroke="#2b0f52" strokeWidth="3.5" strokeDasharray="4 4" />

        {/* Rider */}
        <circle cx="100" cy="46" r="10" fill="url(#df-skin)" />
        <path d="M90 44 a10 10 0 0 1 20 0 z" fill="#2b0f52" />
        <path d="M100 56 q-10 4 -10 14 h20 q0 -10 -10 -14 z" fill="url(#df-green)" />
        <path d="M104 62 l16 -6" stroke="url(#df-skin)" strokeWidth="5" strokeLinecap="round" />

        {/* The folder — the whole point of the journey. */}
        <g transform="rotate(-10 82 66)">
          <rect x="70" y="58" width="22" height="17" rx="2.5" fill="url(#df-paper)" stroke="#b8860b" strokeWidth="1.5" />
          <rect x="74" y="63" width="12" height="2" rx="1" fill="#5b4a70" opacity="0.5" />
          <rect x="74" y="68" width="8" height="2" rx="1" fill="#5b4a70" opacity="0.35" />
        </g>
      </g>
    </svg>
  )
}

/* Beat 3 — the doorstep. The door swings, the light spills, a Bandhu waits. */
function DoorArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <Shadow cx="102" cy="110" rx="50" />

      <rect x="46" y="8" width="108" height="102" rx="5" fill="url(#df-brick)" />
      {/* Course lines, so the wall is a wall and not a panel. */}
      {[26, 44, 62, 80, 98].map(y => (
        <rect key={y} x="46" y={y} width="108" height="1" fill="#a98c6c" opacity="0.28" />
      ))}

      {/* Doorway, then the light out of it, then the door across it. Painting
          order is the depth: whatever is drawn last is nearest the viewer. */}
      <rect x="70" y="24" width="46" height="86" rx="3" fill="#2e1065" />
      <path className="df-spill" d="M70 24 L70 110 L150 110 L124 24 Z" fill="url(#df-gold)" opacity="0.55" />
      <g className="df-door">
        <rect x="70" y="24" width="46" height="86" rx="3" fill="url(#df-plum)" />
        <rect x="77" y="32" width="32" height="30" rx="2" fill="#ffffff" opacity="0.1" />
        <rect x="77" y="70" width="32" height="30" rx="2" fill="#ffffff" opacity="0.07" />
        <circle cx="110" cy="68" r="2.6" fill="url(#df-gold)" />
      </g>

      {/* The Bandhu on the step, folder in hand. */}
      <g style={rise(0.95)}>
        <circle cx="140" cy="52" r="10" fill="url(#df-skin)" />
        <path d="M130 50 a10 10 0 0 1 20 0 z" fill="#2b0f52" />
        <path d="M140 62 q-12 5 -12 20 v28 h24 v-28 q0 -15 -12 -20 z" fill="url(#df-green)" />
        <rect x="150" y="74" width="20" height="15" rx="2.5" fill="url(#df-paper)" stroke="#b8860b" strokeWidth="1.4" />
        <path d="M148 72 l6 4" stroke="url(#df-skin)" strokeWidth="4.5" strokeLinecap="round" />
      </g>

      {/* Marigold string over the door — the one detail that makes this an
          Indian doorway rather than a generic one. */}
      <g style={rise(0.2)}>
        <path d="M64 22 q38 12 76 0" fill="none" stroke="#0b3d2e" strokeWidth="1.2" opacity="0.5" />
        {[0, 1, 2, 3, 4, 5, 6].map(i => {
          const t = i / 6
          const x = 64 + 76 * t
          const y = 22 + 12 * (1 - Math.abs(2 * t - 1) ** 2) * 0.86
          return <circle key={i} cx={x} cy={y} r="3.2" fill={i % 2 ? '#f5c542' : '#e8720c'} opacity="0.9" />
        })}
      </g>
    </svg>
  )
}

/* Beat 4 — read together. Two people, one document, a finger down the lines. */
function ReadArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <Shadow cx="102" cy="108" rx="52" />

      {/* Table */}
      <rect x="34" y="84" width="140" height="7" rx="3.5" fill="#8b5e34" />
      <rect x="34" y="91" width="140" height="4" rx="2" fill="#6b451f" opacity="0.6" />

      {/* The two at it. The customer on the left is drawn slightly larger —
          the near side of the table, and the side the story is told from. */}
      <g style={rise(0)}>
        <circle cx="48" cy="46" r="11.5" fill="url(#df-skin)" />
        <path d="M36.5 45 a11.5 11.5 0 0 1 23 0 z" fill="#3b1f02" />
        <path d="M48 57 q-14 5 -14 22 v5 h28 v-5 q0 -17 -14 -22 z" fill="#c62828" />
      </g>
      <g style={rise(0.14)}>
        <circle cx="156" cy="50" r="10" fill="url(#df-skin)" />
        <path d="M146 49 a10 10 0 0 1 20 0 z" fill="#2b0f52" />
        <path d="M156 60 q-12 4 -12 19 v5 h24 v-5 q0 -15 -12 -19 z" fill="url(#df-green)" />
      </g>

      {/* The proposal spread between them. */}
      <g style={rise(0.28)}>
        <rect x="72" y="40" width="60" height="48" rx="4" fill="url(#df-paper)" transform="rotate(-3 102 64)" />
        <g transform="rotate(-3 102 64)">
          <rect x="78" y="46" width="26" height="4" rx="2" fill="#4c1d95" opacity="0.7" />
          {[56, 64, 72, 80].map((y, i) => (
            <g key={y}>
              <rect x="78" y={y} width={[34, 28, 38, 24][i]} height="3" rx="1.5" fill="#5b4a70" opacity="0.4" />
              <rect x="118" y={y} width="8" height="3" rx="1.5" fill="#b8860b" opacity="0.6" />
            </g>
          ))}
        </g>
      </g>

      {/* The finger, working down the lines in four steps. */}
      <g className="df-trace">
        <path d="M70 54 l9 3 l-2 5 l-9 -3 z" fill="url(#df-skin)" />
        <circle cx="66" cy="56" r="4.5" fill="url(#df-skin)" />
      </g>
    </svg>
  )
}

/* Beat 5 — changed at the table. A line struck, a better one put in its place. */
function ChangeArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <Shadow cx="100" cy="108" rx="46" />

      <rect x="46" y="14" width="108" height="92" rx="6" fill="url(#df-paper)" />
      <rect x="56" y="24" width="34" height="5" rx="2.5" fill="#4c1d95" opacity="0.7" />

      {/* Untouched lines above and below, so the changed one is obviously the
          exception rather than the whole document being rewritten. */}
      {[40, 50].map((y, i) => (
        <g key={y} style={rise(i * 0.1)}>
          <rect x="56" y={y} width={[52, 44][i]} height="4" rx="2" fill="#5b4a70" opacity="0.35" />
          <rect x="122" y={y} width="20" height="4" rx="2" fill="#5b4a70" opacity="0.25" />
        </g>
      ))}

      {/* The line that goes. */}
      <g style={rise(0.2)}>
        <rect x="56" y="62" width="58" height="4.5" rx="2.25" fill="#5b4a70" opacity="0.4" />
        <rect x="122" y="62" width="22" height="4.5" rx="2.25" fill="#5b4a70" opacity="0.3" />
        <rect className="df-strike" x="54" y="63.4" width="92" height="2.2" rx="1.1" fill="#c62828" />
      </g>

      {/* And the one that replaces it, in the margin, in the same hand. */}
      <g className="df-swap">
        <rect x="56" y="76" width="48" height="4.5" rx="2.25" fill="#0b3d2e" opacity="0.55" />
        <rect x="112" y="76" width="26" height="4.5" rx="2.25" fill="#38a47b" />
        <path d="M50 78.2 l4 -4 l0 8 z" fill="#38a47b" />
      </g>

      {/* Two more untouched lines, then the pen that did it. */}
      <g style={rise(0.34)}>
        <rect x="56" y="90" width="40" height="4" rx="2" fill="#5b4a70" opacity="0.3" />
        <rect x="122" y="90" width="20" height="4" rx="2" fill="#5b4a70" opacity="0.22" />
      </g>

      <g className="df-pen" transform="rotate(38 150 70)">
        <rect x="144" y="34" width="9" height="46" rx="2" fill="url(#df-plum)" />
        <path d="M144 80 h9 l-4.5 11 z" fill="#2b0f52" />
        <path d="M146.6 88 h3.8 l-1.9 4 z" fill="#f5c542" />
        <rect x="144" y="42" width="9" height="4" fill="url(#df-gold)" />
      </g>
    </svg>
  )
}

/* Beat 6 — only then. The approval seal, and the money going back if not. */
function SealArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <Shadow cx="100" cy="108" rx="44" />

      {/* The agreed proposal, now quiet — it has done its job. */}
      <g transform="rotate(-5 96 60)">
        <rect x="52" y="18" width="88" height="84" rx="6" fill="url(#df-paper)" />
        {[30, 40, 50, 60, 70].map((y, i) => (
          <rect key={y} x="62" y={y} width={[46, 38, 52, 34, 44][i]} height="3.5" rx="1.75"
                fill="#5b4a70" opacity="0.28" style={rise(i * 0.07)} />
        ))}
        <rect x="62" y="84" width="34" height="5" rx="2.5" fill="#2b0f52" opacity="0.45" style={rise(0.4)} />
      </g>

      {/* The seal, landing on it. */}
      <g className="df-seal">
        <circle cx="130" cy="74" r="24" fill="url(#df-green)" />
        <circle cx="130" cy="74" r="19.5" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.5" strokeDasharray="3 3" />
        <path
          className="df-tick"
          d="M120 74.5 l7 7.5 l14 -16"
          fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
        />
      </g>

      {/* …or it comes back. The arc is the refund, drawn leaving the frame the
          way it came in, because "refundable" is the sentence that actually
          removes the risk. */}
      <g className="df-return">
        <circle cx="62" cy="30" r="11" fill="url(#df-gold)" />
        <text x="62" y="34.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="#7a5a06" fontFamily="system-ui, sans-serif">
          ₹
        </text>
      </g>
      <path d="M56 42 q-16 8 -18 24" fill="none" stroke="#b8860b" strokeWidth="1.6"
            strokeDasharray="3 3" opacity="0.45" style={rise(1.2)} />
    </svg>
  )
}

/**
 * Reduced motion: the same six beats, all at once, none of them moving.
 *
 * A film whose whole argument is a sequence cannot degrade to its first frame
 * — somebody who has asked the OS for less motion would get "₹1,000 holds the
 * price" and never learn what the ₹1,000 is for, which is the one thing this
 * panel exists to say.
 */
function Storyboard({ className = '', to }) {
  return (
    <section className={className} aria-label={`What ${formatINR(LOCK_AMOUNT)} holds, and the visit that follows`}>
      <div className="px-5">
        <h2 className="text-[19px] font-extrabold leading-tight tracking-tight text-ink">
          Hold the price. We bring the proposal to your door.
        </h2>
        <p className="mt-0.5 text-[12px] text-ink-mute">
          {formatINR(LOCK_AMOUNT)}, refundable — and a Bandhu at your doorstep, included.
        </p>
      </div>

      <FilmDefs />
      <ol className="mt-3 grid grid-cols-2 gap-2.5 px-4">
        {BEATS.map((b, i) => {
          const { Art } = b
          return (
            <li key={b.key}>
              <Link
                to={to}
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
