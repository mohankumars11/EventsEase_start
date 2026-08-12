import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * BrandFilm — a four-second loop of the thing we actually sell.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * Everything else on Home is a *proposition*: a tier, a price, a coupon, a
 * countdown. All of it argues. None of it shows the product, because the
 * product isn't a gift box — it's the four seconds where somebody opens one.
 * A pre-launch brand nobody has heard of loses on the argument (no ratings,
 * no order count, no reviews to point at) and can still win on the feeling,
 * and the feeling is the one asset we own outright today.
 *
 * So this is the story, in the order it actually happens, one beat a second:
 *
 *   the occasion  →  the wrap  →  the run  →  the moment they open it
 *
 * The tap target follows the story. On beat one you are being sold the
 * planner; by beat four you are being sold a gift you can send tonight. One
 * panel, four different pitches, no extra pixels — which is the only reason
 * it earns a slot this far above the fold.
 *
 * ── Why it is drawn and not filmed ────────────────────────────────────────
 * There is no footage to cut. Sambramo is pre-launch, there is no supplier,
 * and every hamper in the catalogue is a thing we would source rather than a
 * thing sitting on a shelf — so a "real" product video would be either stock
 * footage of someone else's warehouse or a claim we can't keep. Drawing it
 * is the honest option and, on a phone in Mysuru, the better one:
 *
 *   — zero bytes. No MP4, no poster frame, no CDN. The whole film is one
 *     component and a block of keyframes, so it costs nothing on a 3G first
 *     paint, which is where this page is actually judged.
 *   — no autoplay roulette. Muted-inline autoplay is still refused by data
 *     saver modes and low-power mode; a hero that silently shows a black
 *     rectangle to some fraction of visitors is worse than no hero.
 *   — vector. Crisp at any density, retimed by changing one constant, and
 *     recoloured by editing a hex — not by re-rendering and re-uploading.
 *
 * When there is real product photography, the art layer is the only part
 * that has to change; the beats, the timing and the copy stay.
 *
 * ── The copy is deliberately unexciting ───────────────────────────────────
 * Beat three says "Delivered by Sambramo" because that is FULFILMENT.short
 * verbatim, and beat two says "wrapped, carded, ribboned" because that is
 * already the Gifts & Hampers tagline. Nothing here claims a rating, a
 * customer count, a delivery time or a kitchen we don't have. The motion is
 * allowed to be theatrical; the sentences are not.
 *
 * ── Restraint ─────────────────────────────────────────────────────────────
 *   — Pauses when scrolled out of view, so it isn't burning battery for a
 *     card nobody is looking at.
 *   — Pauses on hover and, critically, on pointer-down: the destination
 *     changes every second, so the beat you were looking at when your thumb
 *     landed is the beat you navigate to. Without that, a tap on "send one"
 *     could land on the planner.
 *   — Under prefers-reduced-motion it stops being a film and becomes a
 *     storyboard: four still frames, all four captions, same story, no
 *     movement. Nothing is lost, which is the test.
 */

const BEAT_MS = 1000   // one second a beat; four beats is the whole film

/* ── The film ─────────────────────────────────────────────────────────────
   Each beat carries its own ground, its own art, its own line and its own
   destination. Order is the story and is not sorted or shuffled. */
const BEATS = [
  {
    key: 'occasion',
    chapter: 'The occasion',
    line: 'Something worth celebrating',
    sub: 'A birthday, a festival, a just-because.',
    cta: 'Plan a celebration',
    to: '/plan',
    ground: 'radial-gradient(120% 95% at 50% 115%, #7c3aed 0%, #4c1d95 46%, #2e1065 100%)',
    Art: OccasionArt,
  },
  {
    key: 'wrap',
    chapter: 'The wrap',
    line: 'Wrapped, carded, ribboned',
    sub: 'Packed to be handed over, not just posted.',
    cta: 'Browse gifts & hampers',
    to: '/shop/Gifts',
    ground: 'radial-gradient(120% 95% at 25% 0%, #a21caf 0%, #6d28d9 52%, #2e1065 100%)',
    Art: WrapArt,
  },
  {
    key: 'run',
    chapter: 'The run',
    line: 'Delivered by Sambramo',
    sub: 'One number to call, whoever made it.',
    cta: 'See what we deliver',
    to: '/shop',
    ground: 'radial-gradient(125% 100% at 18% 8%, #12694c 0%, #0b3d2e 52%, #2e1065 100%)',
    Art: RunArt,
  },
  {
    key: 'moment',
    chapter: 'The moment',
    line: 'Then you watch them open it',
    sub: 'The four seconds the whole thing is for.',
    cta: 'Send one tonight',
    to: '/shop/Gifts',
    ground: 'radial-gradient(88% 82% at 50% 60%, #fbbf24 0%, #b45309 26%, #7c3aed 66%, #2e1065 100%)',
    Art: MomentArt,
  },
]

export default function BrandFilm() {
  const reduced = useReducedMotion()
  const [beat, setBeat] = useState(0)
  const [held, setHeld] = useState(false)
  const [onScreen, setOnScreen] = useState(true)
  const stage = useRef(null)

  // Don't run the projector for a card that is off screen. Also the reason
  // the film is always at beat one when you scroll back up to it — you get
  // the story from the start rather than joining it halfway.
  useEffect(() => {
    const el = stage.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([e]) => setOnScreen(e.isIntersecting),
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const running = !reduced && onScreen && !held

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setBeat(n => (n + 1) % BEATS.length), BEAT_MS)
    return () => clearInterval(id)
  }, [running])

  if (reduced) return <Storyboard />

  const current = BEATS[beat]
  const { Art } = current

  return (
    <section className="px-4" aria-labelledby="film-heading">
      <div className="mb-2.5">
        <h2 id="film-heading" className="text-[15px] font-extrabold text-white">
          The four seconds it's all for
        </h2>
        <p className="mt-0.5 text-[11px] text-white/50">
          Chosen, wrapped, delivered, opened — the whole job, on a loop.
        </p>
      </div>

      <Link
        ref={stage}
        to={current.to}
        aria-label={`${current.line} — ${current.cta}`}
        className="group relative block h-[212px] overflow-hidden rounded-3xl ring-1 ring-white/10 sm:h-[248px]"
        /* Hold on hover AND on pointer-down. The second one is the important
           one: the href changes every second, and a thumb takes ~200ms to
           land. Freezing at touch-start is what makes the beat you aimed at
           the beat you get. */
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
        onPointerDown={() => setHeld(true)}
      >
        {/* ── Ground ──────────────────────────────────────────────────────
            All four grounds stay mounted and cross-fade. The art cuts hard
            between beats — a film cuts, it doesn't dissolve — but a hard cut
            on a full-bleed colour reads as a flicker, so the colour is the
            one thing that eases. */}
        {BEATS.map((b, i) => (
          <span
            key={b.key}
            aria-hidden="true"
            className="absolute inset-0 transition-opacity duration-700 ease-out"
            style={{ background: b.ground, opacity: i === beat ? 1 : 0 }}
          />
        ))}

        {/* Grain and bokeh sit above every ground and never remount, so they
            carry across the cuts. That continuity is most of what separates
            "a film" from "four slides". */}
        <Bokeh />
        <span aria-hidden="true" className="film-vignette absolute inset-0" />

        {/* ── Art ──────────────────────────────────────────────────────────
            Keyed on the beat so every entrance keyframe replays on the cut.
            Nudged above centre to leave the lower third to the caption. */}
        <span
          key={current.key}
          aria-hidden="true"
          className="absolute inset-x-0 top-[6px] flex justify-center sm:top-[14px]"
        >
          <Art />
        </span>

        {/* ── Caption ─────────────────────────────────────────────────────── */}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-plum-950 via-plum-950/70 to-transparent" />

        <span key={`cap-${current.key}`} className="absolute inset-x-0 bottom-0 p-4">
          <span className="film-line block text-[10px] font-extrabold uppercase tracking-[0.16em] text-saffron-300">
            {current.chapter}
          </span>
          <span className="film-line film-line-2 mt-1 block font-serif text-[22px] font-extrabold leading-[1.1] text-white drop-shadow sm:text-[26px]">
            {current.line}
          </span>
          <span className="film-line film-line-3 mt-1 flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-[11px] font-medium text-white/60">{current.sub}</span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-[11px] font-extrabold text-plum-900 shadow-sm">
              {current.cta} <ArrowRight size={12} strokeWidth={3} />
            </span>
          </span>
        </span>

        {/* ── Reel ticks ──────────────────────────────────────────────────
            Top edge, story-app convention, because it tells you in one look
            that this is four short beats and not a carousel you have to
            drive. Reuses .deck-tick so the fill and BEAT_MS can't drift. */}
        <span aria-hidden="true" className="absolute inset-x-3 top-3 flex gap-1.5">
          {BEATS.map((b, i) => (
            <span key={b.key} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
              <span
                key={`${b.key}-${beat}`}
                className="block h-full rounded-full bg-white"
                style={
                  i < beat  ? { width: '100%' }
                  : i > beat ? { width: '0%' }
                  /* Longhands, not the `animation` shorthand: React warns
                     when a shorthand and one of its longhands are both set
                     on the same element, and the play state has to be a
                     longhand because it changes between renders. */
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

/* ── Ambient ──────────────────────────────────────────────────────────────
   Nine drifting motes at three depths. Cheap (transform and opacity only),
   never remounted, and the only thing on the card that ignores the cuts. */
const MOTES = [
  { l: '8%',  d: '0s',    s: 5, o: 0.30 }, { l: '19%', d: '-2.4s', s: 3, o: 0.20 },
  { l: '31%', d: '-4.1s', s: 7, o: 0.16 }, { l: '43%', d: '-1.2s', s: 4, o: 0.26 },
  { l: '56%', d: '-5.3s', s: 6, o: 0.18 }, { l: '68%', d: '-3.0s', s: 3, o: 0.30 },
  { l: '79%', d: '-6.2s', s: 8, o: 0.12 }, { l: '88%', d: '-0.8s', s: 4, o: 0.24 },
  { l: '95%', d: '-4.7s', s: 5, o: 0.18 },
]
function Bokeh() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {MOTES.map(m => (
        <span
          key={m.l}
          className="film-mote absolute rounded-full bg-saffron-200"
          style={{
            left: m.l,
            width: m.s,
            height: m.s,
            // Peak opacity, read by the film-mote keyframe — which owns
            // opacity outright so it can fade the dot in and out at the
            // two ends of its run.
            '--mote-o': m.o,
            animationDelay: m.d,
            animationDuration: `${9 + m.s}s`,
          }}
        />
      ))}
    </span>
  )
}

/* ── Beat art ─────────────────────────────────────────────────────────────
   One 200×120 canvas each, scaled by the wrapper. Everything animated is a
   transform or an opacity, and every group that rotates or scales carries
   `film-pivot` (transform-box: fill-box) so its origin is its own centre
   rather than the top-left of the SVG. */

const ART = 'h-[118px] w-[196px] sm:h-[140px] sm:w-[234px]'
const HEART = 'M6 11 C-1 6.6 0 1.5 3 1.5 C4.6 1.5 5.6 2.6 6 3.4 C6.4 2.6 7.4 1.5 9 1.5 C12 1.5 13 6.6 6 11 Z'
const STAR  = 'M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z'

/* Beat 1 — the cake lands, the candle catches, the room warms up. */
function OccasionArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <defs>
        <radialGradient id="fg-warm">
          <stop offset="0%"   stopColor="#fbbf24" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle className="film-bloom" cx="100" cy="58" r="54" fill="url(#fg-warm)" />
      <ellipse cx="100" cy="103" rx="54" ry="5" fill="#2e1065" opacity="0.45" />

      <g className="film-land">
        {/* two tiers, cream on rose, with a saffron band */}
        <rect x="62" y="74" width="76" height="26" rx="7" fill="#FFF8F0" />
        <rect x="62" y="86" width="76" height="7"  fill="#fb7185" opacity="0.85" />
        <rect x="78" y="56" width="44" height="20" rx="6" fill="#FFF1DC" />
        <rect x="78" y="64" width="44" height="5"  fill="#f59e0b" opacity="0.8" />
        {/* frosting */}
        {[80, 90, 100, 110, 120].map(x => <circle key={x} cx={x} cy="56" r="4" fill="#FFF8F0" />)}
        {[64, 76, 88, 100, 112, 124, 136].map(x => <circle key={x} cx={x} cy="74" r="4.5" fill="#FFF1DC" />)}

        <rect x="98" y="40" width="4" height="17" rx="2" fill="#fb7185" />
      </g>

      <g className="film-pivot film-flame" style={{ transformOrigin: '100px 40px' }}>
        <path d="M100 27 C104.5 32 106 35 106 37.5 C106 41 103.3 43.5 100 43.5 C96.7 43.5 94 41 94 37.5 C94 35 95.5 32 100 27 Z" fill="#fcd34d" />
        <path d="M100 33 C102.4 36 103 37.5 103 38.8 C103 40.6 101.7 42 100 42 C98.3 42 97 40.6 97 38.8 C97 37.5 97.6 36 100 33 Z" fill="#fff8f0" />
      </g>

      {/* the room noticing */}
      {[
        { x: 44, y: 30, d: '0.35s' }, { x: 148, y: 24, d: '0.55s' },
        { x: 34, y: 68, d: '0.7s'  }, { x: 160, y: 62, d: '0.5s'  },
      ].map(s => (
        <g key={`${s.x}-${s.y}`} className="film-pivot film-twinkle" style={{ animationDelay: s.d, transformOrigin: `${s.x + 5}px ${s.y + 5}px` }}>
          <path d={STAR} transform={`translate(${s.x} ${s.y})`} fill="#fde68a" />
        </g>
      ))}
    </svg>
  )
}

/* Beat 2 — two things go in, the lid comes down, the ribbon draws itself.
   Paint order is the whole trick here and it is easy to get wrong twice:

     1. the well      a dark interior, so there is somewhere to drop into
     2. the contents  falling in, visible against that dark
     3. the walls     drawn OVER the contents, which is what makes them
                      read as being inside the box rather than in front
                      of it
     4. the lid, then the ribbon, then the bow

   Painted contents-first (the obvious order) the box covers them and the
   drop animation plays entirely behind an opaque rectangle. */
function WrapArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <ellipse cx="100" cy="105" rx="50" ry="5" fill="#1c0733" opacity="0.5" />

      {/* 1 — the well. Near-black, not plum: this beat's ground is violet
             going magenta, and a plum-800 box on it was invisible. */}
      <rect x="58" y="54" width="84" height="48" rx="8" fill="#1c0733" />

      {/* 2 — what goes in the hamper */}
      <g className="film-drop-1">
        <circle cx="82" cy="70" r="9" fill="#f59e0b" />
        <circle cx="79" cy="67" r="2.6" fill="#fde68a" opacity="0.85" />
      </g>
      <g className="film-drop-2">
        {[[0, -6], [6, -2], [4, 5], [-4, 5], [-6, -2]].map(([dx, dy]) => (
          <circle key={`${dx}${dy}`} cx={118 + dx} cy={70 + dy} r="4.6" fill="#fb7185" />
        ))}
        <circle cx="118" cy="70" r="3" fill="#fde68a" />
      </g>

      {/* 3 — the walls, over the contents */}
      <path d="M58 78 h84 v16 a8 8 0 0 1 -8 8 h-68 a8 8 0 0 1 -8 -8 Z" fill="#4c1d95" />
      <path d="M58 62 a8 8 0 0 1 8 -8 h6 v48 h-14 Z" fill="#3b1181" />
      <path d="M142 62 a8 8 0 0 0 -8 -8 h-6 v48 h14 Z" fill="#3b1181" />

      {/* 4 — the lid */}
      <rect className="film-lid" x="52" y="44" width="96" height="18" rx="6" fill="#6d28d9" />

      {/* ribbon, drawn */}
      <path className="film-ribbon" d="M100 44 L100 102" stroke="#fbbf24" strokeWidth="8" strokeLinecap="round" fill="none" pathLength="100" />
      <path className="film-ribbon film-ribbon-2" d="M58 88 L142 88" stroke="#fbbf24" strokeWidth="7" strokeLinecap="round" fill="none" pathLength="100" />

      {/* bow */}
      <g className="film-pivot film-bow" style={{ transformOrigin: '100px 40px' }}>
        <path d="M100 40 C90 28 78 28 78 36 C78 43 90 43 100 40 Z" fill="#fcd34d" />
        <path d="M100 40 C110 28 122 28 122 36 C122 43 110 43 100 40 Z" fill="#fcd34d" />
        <circle cx="100" cy="40" r="6" fill="#f59e0b" />
      </g>

      {/* the card that goes with it */}
      <g className="film-tag">
        <path d="M142 76 L154 70" stroke="#fde68a" strokeWidth="1.6" fill="none" />
        <g transform="rotate(-9 164 78)">
          <rect x="151" y="69" width="26" height="18" rx="4" fill="#FFF8F0" />
          <path d="M156 75 h14 M156 80 h10" stroke="#a56eff" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      </g>

      {/* the light that says "this was wrapped for you", not "this was boxed" */}
      <rect className="film-sheen-sweep" x="-40" y="26" width="24" height="92" fill="#ffffff" opacity="0.16" />
    </svg>
  )
}

/* Beat 3 — the route draws, the parcel rides it, it lands on a doorstep. */
function RunArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      {/* The door is drawn first so the parcel arrives in FRONT of it.
          Painted after, the door swallowed the parcel at exactly the
          frame the beat exists to show. */}
      <g className="film-door">
        <rect x="148" y="50" width="38" height="56" rx="5" fill="#0b3d2e" stroke="#6cc39e" strokeWidth="2" />
        <circle cx="180" cy="80" r="2.4" fill="#fcd34d" />
        <rect x="142" y="104" width="50" height="4" rx="2" fill="#6cc39e" opacity="0.5" />
      </g>

      {/* the address */}
      <g className="film-pin">
        <path d="M167 6 C158.7 6 152 12.8 152 21.2 C152 31.6 167 48 167 48 C167 48 182 31.6 182 21.2 C182 12.8 175.3 6 167 6 Z" fill="#fbbf24" />
        <circle cx="167" cy="21.2" r="5.4" fill="#2e1065" />
      </g>

      {/* the run */}
      <path
        className="film-route"
        d="M18 94 Q84 38 128 78"
        stroke="#6cc39e" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 7"
        fill="none" pathLength="100"
      />

      {/* the parcel, riding the same curve the dashes describe */}
      <g className="film-travel">
        {/* Lighter than the boxes in the other beats, and with a lid face
            picked out on top. plum-800 on this green ground left only the
            gold cross legible, so the parcel read as a floating plus sign. */}
        <g transform="translate(18 94)">
          <rect x="-13" y="-13" width="26" height="26" rx="5" fill="#7c3aed" />
          <rect x="-13" y="-13" width="26" height="9"  rx="5" fill="#a56eff" />
          <rect x="-13" y="-3"  width="26" height="5"  fill="#fbbf24" />
          <rect x="-2.5" y="-13" width="5" height="26" fill="#fbbf24" />
          <circle cx="0" cy="-13" r="3.4" fill="#fcd34d" />
        </g>
      </g>

      {/* it lands */}
      <ellipse className="film-ripple" cx="128" cy="92" rx="14" ry="4" fill="none" stroke="#fcd34d" strokeWidth="2" />

      {/* and somebody is told it's here */}
      {[0, 1].map(i => (
        <circle
          key={i}
          className="film-ring"
          cx="180" cy="80" r="9"
          fill="none" stroke="#a4dcc2" strokeWidth="1.5"
          style={{ animationDelay: `${0.62 + i * 0.16}s` }}
        />
      ))}
    </svg>
  )
}

/* Beat 4 — the lid goes, the light comes out, and that's the product. */
function MomentArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <defs>
        <radialGradient id="fg-burst">
          <stop offset="0%"   stopColor="#fff8f0" stopOpacity="0.9" />
          <stop offset="45%"  stopColor="#fbbf24" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* the light that was in the box */}
      <g className="film-pivot film-rays" style={{ transformOrigin: '100px 66px' }}>
        {[-64, -42, -20, 0, 20, 42, 64].map(a => (
          <path key={a} d="M100 66 L94 -2 L106 -2 Z" fill="#fde68a" opacity="0.28" transform={`rotate(${a} 100 66)`} />
        ))}
      </g>
      <circle className="film-burst" cx="100" cy="64" r="46" fill="url(#fg-burst)" />

      {/* lid, leaving */}
      <g className="film-pivot film-lid-off" style={{ transformOrigin: '100px 54px' }}>
        <rect x="56" y="46" width="88" height="17" rx="6" fill="#6d28d9" />
        <rect x="94" y="46" width="12" height="17" fill="#fbbf24" />
      </g>

      {/* box */}
      <ellipse cx="100" cy="106" rx="46" ry="5" fill="#2e1065" opacity="0.45" />
      <rect x="64" y="66" width="72" height="38" rx="7" fill="#5b21b6" />
      <rect x="64" y="82" width="72" height="6" fill="#fbbf24" />
      <rect x="94" y="66" width="12" height="38" fill="#fbbf24" />

      {/* what actually comes out of it */}
      {[
        { x: 72,  y: 62, d: '0.30s', f: '#fb7185', s: 1.25 },
        { x: 118, y: 58, d: '0.46s', f: '#fda4af', s: 1.0  },
        { x: 96,  y: 50, d: '0.62s', f: '#f43f5e', s: 1.5  },
      ].map(h => (
        <g key={h.d} className="film-lift" style={{ animationDelay: h.d }}>
          <path d={HEART} transform={`translate(${h.x} ${h.y}) scale(${h.s})`} fill={h.f} />
        </g>
      ))}
      {[
        { x: 46, y: 40, d: '0.40s' }, { x: 146, y: 34, d: '0.58s' },
        { x: 60, y: 20, d: '0.70s' }, { x: 132, y: 66, d: '0.52s' },
      ].map(s => (
        <g key={s.d} className="film-pivot film-twinkle" style={{ animationDelay: s.d, transformOrigin: `${s.x + 5}px ${s.y + 5}px` }}>
          <path d={STAR} transform={`translate(${s.x} ${s.y})`} fill="#fff8f0" />
        </g>
      ))}
    </svg>
  )
}

/* ── Reduced motion ───────────────────────────────────────────────────────
   Not the film with the animation switched off — that would be one frozen
   frame and three captions nobody ever sees. It becomes the storyboard: all
   four beats at once, in order, still legible as a sequence. The lower CSS
   kills every keyframe inside the art, so the drawings render at their
   resting state. */
function Storyboard() {
  return (
    <section className="px-4" aria-labelledby="film-heading">
      <div className="mb-2.5">
        <h2 id="film-heading" className="text-[15px] font-extrabold text-white">
          The four seconds it's all for
        </h2>
        <p className="mt-0.5 text-[11px] text-white/50">
          Chosen, wrapped, delivered, opened — the whole job.
        </p>
      </div>

      <ol className="grid grid-cols-2 gap-3">
        {BEATS.map((b, i) => {
          const { Art } = b
          return (
            <li key={b.key}>
              <Link
                to={b.to}
                className="block overflow-hidden rounded-2xl ring-1 ring-white/10"
                style={{ background: b.ground }}
              >
                <span aria-hidden="true" className="flex h-[86px] items-center justify-center [&>svg]:h-[74px] [&>svg]:w-[124px]">
                  <Art />
                </span>
                <span className="block bg-plum-950/55 p-2.5">
                  <span className="block text-[9px] font-extrabold uppercase tracking-[0.14em] text-saffron-300">
                    {i + 1} · {b.chapter}
                  </span>
                  <span className="mt-0.5 block text-[12px] font-extrabold leading-tight text-white">{b.line}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
