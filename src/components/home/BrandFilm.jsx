import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * BrandFilm — the gifting film that runs on Home.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * Everything else above the fold is a *proposition*: a tier, a price, a
 * coupon, a countdown. All of it argues, and none of it shows the product,
 * because the product isn't a box — it's the moment somebody opens one. A
 * pre-launch brand with no ratings and no order count loses on the argument
 * and can still win on the feeling.
 *
 * Five beats, in the order it actually happens:
 *
 *   the occasion → the picking → the packing → the handover → the opening
 *
 * The tap target follows the story. Beat one sells the planner; by beat five
 * it sells a hamper you can send tonight. One panel, five pitches.
 *
 * ── Pacing ────────────────────────────────────────────────────────────────
 * The first cut ran a beat a second and read as a flicker — you registered
 * that something moved without ever reading it. Retail heroes (Myntra, Ajio,
 * Nykaa, Amazon) dwell four to six seconds a slide for a reason: a person
 * scrolling gives a panel one glance, and a glance is about a second and a
 * half before the eye decides. So BEAT_MS is 2400: roughly 900ms of entrance
 * and 1500ms of settled frame you can actually look at.
 *
 * Slower does NOT mean stiller, which was the other half of the problem.
 * Every beat now runs a second layer of motion through its dwell — satin
 * catching light, a lid breathing, petals drifting — so the frame is alive
 * for the whole 2.4s rather than arriving and freezing.
 *
 * ── Why it is drawn, and how it avoids looking drawn ──────────────────────
 * There is no footage to cut: Sambramo is pre-launch with no supplier, so a
 * "real" product video would be stock footage of someone else's warehouse or
 * a claim we can't keep. Drawing it costs zero bytes, never loses the
 * autoplay roulette against data-saver and low-power modes, and is retimed by
 * changing one constant.
 *
 * The first cut looked cartoonish, and that was flat fills. What reads as
 * photographic here instead:
 *   — no flat colour anywhere. Every surface is a gradient with a light
 *     source agreed across all five beats (upper-left).
 *   — contact shadows. A box with a soft blurred shadow under it sits ON
 *     something; without one it floats, which is the cartoon tell.
 *   — satin, not ribbon-shaped-rectangles: a highlight band that travels.
 *   — film grain over the whole card, at 3% opacity. It is the single
 *     cheapest cue that something is a photograph and not a diagram.
 *   — restrained palette. Deep plum and near-black, one gold, one blush.
 *
 * ── The packaging is ours ─────────────────────────────────────────────────
 * The reference photography (black box / champagne bow, navy corporate
 * hamper, kraft dry-fruit boxes) sets the standard, not the design. Nothing
 * copies a competitor's colourway: the boxes are Sambramo plum and near-black
 * with a saffron-gold foil, and the lid carries our wordmark, because a
 * hamper with somebody else's brand on it is an advert for them.
 *
 * ── The copy is deliberately unexciting ───────────────────────────────────
 * Beat four is FULFILMENT.short verbatim and beat two reuses the Gifts &
 * Hampers tagline. Nothing claims a rating, a customer count, a delivery time
 * or a kitchen we don't have. The motion is allowed to be theatrical; the
 * sentences are not.
 */

const BEAT_MS = 2400

/**
 * The grounds are LIGHT, and that is the single most important decision in
 * this file.
 *
 * The first cut put deep-plum packaging on a deep-plum ground and the boxes
 * simply disappeared — a dark object on a dark field has no edges, so the eye
 * reads it as a smudge and the brain reads the whole panel as a cartoon. Look
 * at how premium gifting is actually photographed: black box on cream linen,
 * navy hamper on a pale desk, kraft boxes on white. It is always dark product
 * on a light surface, because that is what gives the packaging its edge, its
 * shadow and its weight.
 *
 * So each beat is a lit surface — warm linen, oat, blush, pale sage — and the
 * boxes stay near-black plum with gold foil. It also gives the panel somewhere
 * to cast a real contact shadow, which is most of what sells "photograph".
 *
 * Consequence: the copy on top has to be dark, the CTA has to be a dark pill,
 * and the reel ticks have to be dark. All of that is handled at the card.
 */
const BEATS = [
  {
    key: 'occasion',
    chapter: 'Every celebration',
    line: 'Whatever you’re celebrating',
    sub: 'Birthdays, weddings, housewarmings, Diwali.',
    cta: 'Plan a celebration',
    to: '/plan',
    ground: 'radial-gradient(125% 105% at 62% 108%, #fff7e9 0%, #f8e7cd 46%, #e6cfae 100%)',
    Art: OccasionArt,
  },
  {
    key: 'chosen',
    chapter: 'The hamper',
    line: 'Chosen piece by piece',
    sub: 'One gift or a whole hamper — you pick what goes in.',
    cta: 'Shop hampers',
    to: '/shop/Gifts',
    ground: 'radial-gradient(120% 100% at 74% 4%, #fdfbf7 0%, #f1e8dc 52%, #dccfbe 100%)',
    Art: ChosenArt,
  },
  {
    key: 'wrap',
    chapter: 'Packed with emotion',
    line: 'Wrapped, carded, ribboned',
    sub: 'Sealed with their name on it, not a barcode.',
    cta: 'See the range',
    to: '/shop/Gifts',
    ground: 'radial-gradient(118% 100% at 72% 6%, #fffaf7 0%, #f7e6df 50%, #e5cbc2 100%)',
    Art: WrapArt,
  },
  {
    key: 'handover',
    chapter: 'The handover',
    line: 'Delivered by Sambramo',
    sub: 'Carried to the door and handed over, not left at it.',
    cta: 'See the shop',
    to: '/shop',
    ground: 'radial-gradient(120% 105% at 30% 6%, #f7fbf7 0%, #e4efe6 52%, #c9dccd 100%)',
    Art: HandoverArt,
  },
  {
    key: 'moment',
    chapter: 'The moment',
    line: 'Then you watch them open it',
    sub: 'The bit the whole thing is actually for.',
    cta: 'Send one tonight',
    to: '/shop/Gifts',
    ground: 'radial-gradient(95% 88% at 66% 54%, #fff4d4 0%, #fbe3ae 30%, #f0d3ab 64%, #dfc09a 100%)',
    Art: MomentArt,
  },
]

/* The lit-surface palette, shared by the card chrome so the ramp, the
   vignette and the motes agree with whichever ground is showing. */
const PAPER = '253, 249, 242'

export default function BrandFilm() {
  const reduced = useReducedMotion()
  const [beat, setBeat] = useState(0)
  const [held, setHeld] = useState(false)
  const [onScreen, setOnScreen] = useState(true)
  const stage = useRef(null)

  // Don't run the projector for a card nobody is looking at. Also why the
  // film is always at beat one when you scroll back to it — you get the
  // story from the start rather than joining it halfway.
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

  if (reduced) return <Storyboard />

  const current = BEATS[beat]
  const { Art } = current

  return (
    <section className="px-4" aria-label="How Sambramo gifting works">
      <Link
        ref={stage}
        to={current.to}
        aria-label={`${current.line} — ${current.cta}`}
        className="group relative block h-[226px] overflow-hidden rounded-3xl ring-1 ring-white/12 shadow-[0_22px_50px_-26px_rgba(0,0,0,0.95)] sm:h-[268px]"
        /* Hold on hover AND on pointer-down. The second matters most: the
           href changes every beat and a thumb takes ~200ms to land, so
           freezing at touch-start is what makes the beat you aimed at the
           beat you get. */
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
        onPointerDown={() => setHeld(true)}
      >
        {/* Gradients and filters live once, at the card, so the beats can
            share them by id and nothing is redefined four times a cycle. */}
        <FilmDefs />

        {/* All five grounds stay mounted and cross-fade. The art cuts — a
            film cuts — but a hard cut on a full-bleed colour reads as a
            flicker, so colour is the one thing that eases. */}
        {BEATS.map((b, i) => (
          <span
            key={b.key}
            aria-hidden="true"
            className="absolute inset-0 transition-opacity duration-[900ms] ease-out"
            style={{ background: b.ground, opacity: i === beat ? 1 : 0 }}
          />
        ))}

        <Bokeh />
        <span aria-hidden="true" className="film-vignette absolute inset-0" />

        {/* ── Composition ──────────────────────────────────────────────
            Product right, words left — the layout every retail hero banner
            uses, and it was worth the rewrite. Stacked (art above, caption
            below) the art got half the card's width and the caption sat
            underneath it, so a 380px-wide panel showed a 200px drawing and
            three lines crammed into the bottom third. Side by side, the
            drawing gets the full height, the copy gets a column that never
            collides with it, and the whole thing is 76px shorter.

            The art bleeds off the right edge deliberately: a product shot
            that stops politely inside a border reads as clip-art, one that
            runs past the frame reads as a photograph that was cropped.

            Keyed on the beat so every entrance keyframe replays on the cut. */}
        <span
          key={current.key}
          aria-hidden="true"
          /* Pushed well off the right edge on purpose. The drawing kept its
             new size; it just had to sit where the words are not, or its left
             third straddled the copy column and the headline read over a box.
             More bleed, not less product. */
          className="absolute right-[-30px] top-1/2 -translate-y-1/2 sm:right-[-16px]"
        >
          <Art />
        </span>

        {/* Grain over everything including the art — grain under the subject
            is a texture, grain over it is a photograph. */}
        <span aria-hidden="true" className="film-grain absolute inset-0" />

        {/* The legibility ramp. Horizontal now, not a bottom scrim: it has to
            darken the half the words sit on while leaving the product side
            clear, and it is what lets the art run underneath the text
            without ever fighting it. */}
        <span
          aria-hidden="true"
          className="absolute inset-0"
          /* Explicit stops rather than Tailwind's from/via/to, because `via`
             sits at 50% and 82% opacity at the halfway mark put the darkest
             part of the ramp straight over the product. The copy column ends
             at 64%, so the ramp is opaque to 34%, gives way through the
             middle, and is fully clear by 82% — text legible, product lit. */
          style={{
            background:
              `linear-gradient(90deg, rgba(${PAPER},0.98) 0%, rgba(${PAPER},0.95) 34%, rgba(${PAPER},0.6) 56%, rgba(${PAPER},0.14) 74%, rgba(${PAPER},0) 88%)`,
          }}
        />

        <span
          key={`cap-${current.key}`}
          className="absolute inset-y-0 left-0 flex w-[56%] flex-col justify-center p-4 sm:w-[57%]"
        >
          {/* Dark type on a lit surface. The eyebrow is a burnt amber rather
              than the saffron used elsewhere on Home: saffron-300 is tuned to
              carry on plum and turns to mud on cream. */}
          <span className="film-line block text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#a15c11] sm:text-[11px] sm:tracking-[0.2em]">
            {current.chapter}
          </span>
          {/* 23px broke "Wrapped, carded, ribboned" over three lines in a
              200px column and shoved the button into the product. */}
          <span className="film-line film-line-2 mt-1.5 block font-serif text-[21px] font-extrabold leading-[1.04] text-[#2b0f52] sm:text-[29px]">
            {current.line}
          </span>
          {/* The supporting line is the first thing to go when the column is
              narrow — the headline and the button are the payload. */}
          <span className="film-line film-line-3 mt-1.5 block text-[11px] font-medium leading-snug text-[#6b5b4a] sm:text-[12px]">
            {current.sub}
          </span>
          <span className="film-line film-line-3 mt-2.5">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-plum-900 px-3.5 py-2 text-[12px] font-extrabold text-white shadow-[0_8px_20px_-6px_rgba(43,15,82,0.85)]">
              {current.cta} <ArrowRight size={13} strokeWidth={3} />
            </span>
          </span>
        </span>

        {/* Reel ticks — story-app convention, so one look tells you this is
            five short beats and not a carousel you have to drive. Reuses
            .deck-tick so the fill and BEAT_MS cannot drift apart. */}
        <span aria-hidden="true" className="absolute inset-x-3 top-3 flex gap-1.5">
          {BEATS.map((b, i) => (
            <span key={b.key} className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#2b0f52]/20">
              <span
                key={`${b.key}-${beat}`}
                className="block h-full rounded-full bg-[#2b0f52]/75"
                style={
                  i < beat  ? { width: '100%' }
                  : i > beat ? { width: '0%' }
                  /* Longhands, not the `animation` shorthand: React warns when
                     a shorthand and one of its longhands are both set, and the
                     play state has to be a longhand because it changes. */
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

/* ── Shared paint ─────────────────────────────────────────────────────────
   One light source for the whole film — upper left — and every gradient
   below agrees with it. That agreement is most of why five separately drawn
   scenes read as one piece of photography rather than five illustrations. */
function FilmDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute" focusable="false">
      <defs>
        {/* Satin: a dark fold, a bright specular band, a dark fold. Flat gold
            is the single biggest reason a drawn ribbon looks drawn. */}
        <linearGradient id="sf-satin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#8a5a0b" />
          <stop offset="28%"  stopColor="#f0b429" />
          <stop offset="46%"  stopColor="#fff3cd" />
          <stop offset="62%"  stopColor="#f0b429" />
          <stop offset="100%" stopColor="#7c4f08" />
        </linearGradient>
        <linearGradient id="sf-satin-v" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#7c4f08" />
          <stop offset="30%"  stopColor="#f0b429" />
          <stop offset="50%"  stopColor="#fff3cd" />
          <stop offset="70%"  stopColor="#e0a020" />
          <stop offset="100%" stopColor="#6d4406" />
        </linearGradient>
        {/* Gold foil, for the wordmark. Brighter and tighter than satin. */}
        <linearGradient id="sf-foil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fff6d8" />
          <stop offset="45%"  stopColor="#f5c542" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
        {/* Lid and body: same hue, different value, so the box has planes. */}
        <linearGradient id="sf-lid" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%"   stopColor="#4b1d8f" />
          <stop offset="55%"  stopColor="#33125f" />
          <stop offset="100%" stopColor="#230b45" />
        </linearGradient>
        <linearGradient id="sf-body" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%"   stopColor="#331060" />
          <stop offset="60%"  stopColor="#22093f" />
          <stop offset="100%" stopColor="#160527" />
        </linearGradient>
        <linearGradient id="sf-inner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0d0318" />
          <stop offset="100%" stopColor="#1d0836" />
        </linearGradient>
        <linearGradient id="sf-blush" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%"   stopColor="#f7d9d2" />
          <stop offset="55%"  stopColor="#e8b3a8" />
          <stop offset="100%" stopColor="#c98878" />
        </linearGradient>
        <linearGradient id="sf-card" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%"   stopColor="#fffaf2" />
          <stop offset="100%" stopColor="#e8dcc8" />
        </linearGradient>
        {/* Dark ganache. The cake used to be cream, which was invisible the
            moment the grounds became cream — and a dark cake with a gold
            drip is the more premium object anyway. */}
        <linearGradient id="sf-cocoa" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%"   stopColor="#5a3423" />
          <stop offset="55%"  stopColor="#3a2015" />
          <stop offset="100%" stopColor="#24120b" />
        </linearGradient>
        <linearGradient id="sf-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#2b1147" />
          <stop offset="35%"  stopColor="#6f4fa8" />
          <stop offset="55%"  stopColor="#cbb6e8" />
          <stop offset="100%" stopColor="#2b1147" />
        </linearGradient>
        <linearGradient id="sf-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#3c3f47" />
          <stop offset="38%"  stopColor="#9aa1ad" />
          <stop offset="58%"  stopColor="#e6ebf2" />
          <stop offset="100%" stopColor="#41454d" />
        </linearGradient>
        <linearGradient id="sf-skin" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%"   stopColor="#e0a877" />
          <stop offset="60%"  stopColor="#c98a55" />
          <stop offset="100%" stopColor="#a06a3c" />
        </linearGradient>

        <radialGradient id="sf-warm">
          <stop offset="0%"   stopColor="#f0b429" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f0b429" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sf-burst">
          <stop offset="0%"   stopColor="#fffdf5" stopOpacity="1" />
          <stop offset="38%"  stopColor="#f7c33f" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#e8a11c" stopOpacity="0" />
        </radialGradient>

        {/* The contact shadow. Without one every box floats, and floating is
            the cartoon tell more than any colour choice. */}
        <filter id="sf-shadow" x="-40%" y="-40%" width="180%" height="200%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
        <filter id="sf-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
    </svg>
  )
}

/* ── Ambient ──────────────────────────────────────────────────────────────
   Motes at three depths, never remounted, so they carry across the cuts.
   That continuity is most of what separates "a film" from "five slides". */
const MOTES = [
  { l: '7%',  d: '0s',    s: 5, o: 0.26 }, { l: '17%', d: '-3.4s', s: 3, o: 0.18 },
  { l: '29%', d: '-6.1s', s: 7, o: 0.13 }, { l: '41%', d: '-1.7s', s: 4, o: 0.22 },
  { l: '53%', d: '-8.3s', s: 6, o: 0.15 }, { l: '65%', d: '-4.0s', s: 3, o: 0.26 },
  { l: '76%', d: '-9.2s', s: 8, o: 0.10 }, { l: '86%', d: '-2.2s', s: 4, o: 0.20 },
  { l: '94%', d: '-6.7s', s: 5, o: 0.15 },
]
function Bokeh() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {MOTES.map(m => (
        <span
          key={m.l}
          /* Warm dust in a light room, not glitter in a dark one — pale motes
             that read on plum are invisible on cream. */
          className="film-mote absolute rounded-full bg-[#b98a4e]"
          style={{
            left: m.l, width: m.s, height: m.s,
            '--mote-o': m.o,
            animationDelay: m.d,
            animationDuration: `${13 + m.s}s`,
          }}
        />
      ))}
    </span>
  )
}

/* ── Beat art ─────────────────────────────────────────────────────────────
   One 200×120 canvas each. Everything animated is a transform or an opacity,
   so the whole film stays on the compositor. Groups that rotate or scale
   about a named point carry `film-pivot` (transform-box: view-box) and set
   the point in canvas coordinates; groups that pivot about themselves set
   `transform-box: fill-box` in their own CSS rule. */

// Sized against what is actually LEFT after the copy column, not against the
// card. At 390px the card is ~358 wide and the copy takes 54%, so a 250px
// drawing put its subject under the text and showed only its right edge. 214
// keeps the whole subject in the clear zone on a phone; sm+ has the room to
// go big. It still overhangs the right edge on purpose — a product shot that
// stops politely inside a border reads as clip-art.
const ART = 'h-[172px] w-[287px] sm:h-[210px] sm:w-[350px]'
const HEART = 'M6 11 C-1 6.6 0 1.5 3 1.5 C4.6 1.5 5.6 2.6 6 3.4 C6.4 2.6 7.4 1.5 9 1.5 C12 1.5 13 6.6 6 11 Z'
const STAR  = 'M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z'

/** The lid wordmark. Small, gold, letter-spaced — a foil block, not a logo. */
function Wordmark({ x, y, size = 5.4, opacity = 1, className = '' }) {
  return (
    <text
      x={x} y={y} className={className}
      textAnchor="middle" fill="url(#sf-foil)" opacity={opacity}
      fontSize={size} fontWeight="700" letterSpacing="1.6"
      fontFamily="Playfair Display, Georgia, serif"
    >SAMBRAMO</text>
  )
}

/** A soft contact shadow. Every object that sits on something gets one. */
function Shadow({ cx, cy, rx, ry = 4.5, opacity = 0.55 }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#08020f" opacity={opacity} filter="url(#sf-shadow)" />
}

/* Beat 1 — the occasion. A tiered cake with a live flame, and the other
   celebrations orbiting it, because the platform is not a birthday shop. */
function OccasionArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <circle className="film-bloom" cx="100" cy="58" r="56" fill="url(#sf-warm)" />
      <Shadow cx="100" cy="104" rx="46" />

      <g className="film-land">
        {/* stand */}
        <path d="M74 100 h52 a3 3 0 0 1 0 6 h-52 a3 3 0 0 1 0 -6 Z" fill="url(#sf-body)" />
        {/* lower tier, dark, with a gold drip over it */}
        <path d="M66 78 h68 v18 a4 4 0 0 1 -4 4 h-60 a4 4 0 0 1 -4 -4 Z" fill="url(#sf-cocoa)" />
        <path d="M66 78 q6 8 12 0 q6 8 12 0 q6 8 12 0 q6 8 12 0 q6 8 12 0 q6 8 8 0 v-3 h-68 Z" fill="url(#sf-satin)" />
        <path d="M66 90 h68 v4 h-68 Z" fill="#f0b429" opacity="0.28" />
        {/* upper tier */}
        <path d="M80 60 h40 v16 a3 3 0 0 1 -3 3 h-34 a3 3 0 0 1 -3 -3 Z" fill="url(#sf-cocoa)" />
        <path d="M80 60 q5 7 10 0 q5 7 10 0 q5 7 10 0 q5 7 10 0 v-2 h-40 Z" fill="url(#sf-satin)" />
        {/* a few berries, so the top tier is not a bare slab */}
        {[[88, 58], [100, 56], [112, 58]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill={i === 1 ? '#c0392b' : '#9b1a2a'} />
        ))}
        {/* candle */}
        <rect x="98.2" y="43" width="3.6" height="15" rx="1.8" fill="#fffaf2" />
        <rect x="98.2" y="43" width="1.4" height="15" rx="0.7" fill="#e0d3bd" />
      </g>

      <g className="film-pivot film-flame" style={{ transformOrigin: '100px 43px' }}>
        <path d="M100 29 C104.6 34.4 106.2 37.4 106.2 40 C106.2 43.6 103.4 46.2 100 46.2 C96.6 46.2 93.8 43.6 93.8 40 C93.8 37.4 95.4 34.4 100 29 Z" fill="#f59e0b" filter="url(#sf-soft)" />
        <path d="M100 35 C102.5 38.1 103.1 39.6 103.1 41 C103.1 42.9 101.7 44.3 100 44.3 C98.3 44.3 96.9 42.9 96.9 41 C96.9 39.6 97.5 38.1 100 35 Z" fill="#fff3cd" />
      </g>

      {/* The rest of the calendar, orbiting. Each drifts on its own timing so
          the group never pulses as one block. */}
      <g className="film-orbit-1">
        {/* diya */}
        <path d="M26 74 q10 8 20 0 q-10 5 -20 0 Z" fill="url(#sf-blush)" />
        <path d="M36 66 c2.4 2.6 3.2 4 3.2 5.2 0 1.9 -1.5 3.2 -3.4 3.2 -1.9 0 -3.2 -1.4 -3.2 -3.2 0 -1.3 0.9 -2.7 3.4 -5.2 Z" fill="#fbbf24" />
      </g>
      <g className="film-orbit-2">
        {/* balloon pair */}
        <ellipse cx="168" cy="34" rx="8" ry="10" fill="url(#sf-blush)" />
        <ellipse cx="165.4" cy="31" rx="2.4" ry="3.2" fill="#fffaf2" opacity="0.55" />
        <path d="M168 44 q3 7 -1 13" stroke="#f5c542" strokeWidth="1" fill="none" opacity="0.7" />
        <ellipse cx="181" cy="44" rx="6" ry="7.6" fill="#a56eff" />
        <ellipse cx="179" cy="41.8" rx="1.8" ry="2.4" fill="#fffaf2" opacity="0.45" />
      </g>
      <g className="film-orbit-3">
        {/* marigold garland corner */}
        {[[18, 34], [26, 30], [34, 28], [42, 30]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4.2" fill={i % 2 ? '#f59e0b' : '#fbbf24'} />
        ))}
        <path d="M18 34 q12 -8 24 -4" stroke="#b45309" strokeWidth="0.9" fill="none" opacity="0.6" />
      </g>

      {[
        { x: 52, y: 22, d: '0.5s' }, { x: 146, y: 18, d: '0.9s' },
        { x: 158, y: 76, d: '0.7s' }, { x: 40,  y: 56, d: '1.1s' },
      ].map(s => (
        <g key={s.d} className="film-pivot film-twinkle" style={{ animationDelay: s.d, transformOrigin: `${s.x + 5}px ${s.y + 5}px` }}>
          <path d={STAR} transform={`translate(${s.x} ${s.y})`} fill="#d9962a" />
        </g>
      ))}
    </svg>
  )
}

/* Beat 2 — the picking. Real hamper contents arriving one at a time into an
   open box: a scent, a flask, sweets, a bouquet, a card. Modelled on the
   reference hampers, in our colours and with our name on the box. */
function ChosenArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <Shadow cx="100" cy="106" rx="52" />

      {/* the open box, seen slightly from above */}
      <path d="M50 58 h100 l-6 46 a4 4 0 0 1 -4 3.4 h-80 a4 4 0 0 1 -4 -3.4 Z" fill="url(#sf-body)" />
      <path d="M50 58 h100 l-2.6 20 h-94.8 Z" fill="url(#sf-inner)" />
      {/* crinkle filler */}
      {[[58, 74], [70, 71], [84, 75], [98, 70], [112, 74], [126, 71], [138, 75]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} l4 -3 l3 4`} stroke="#4b1d8f" strokeWidth="1.4" fill="none" opacity="0.55" strokeLinecap="round" />
      ))}

      {/* contents, each dropping in on its own beat */}
      <g className="film-item film-item-1">
        {/* scent bottle */}
        <rect x="62" y="52" width="15" height="22" rx="2.5" fill="url(#sf-glass)" />
        <rect x="64" y="56" width="4" height="14" rx="2" fill="#fffaf2" opacity="0.25" />
        <rect x="66.5" y="46" width="6" height="7" rx="1.4" fill="url(#sf-foil)" />
      </g>
      <g className="film-item film-item-2">
        {/* flask */}
        <rect x="84" y="46" width="14" height="30" rx="6" fill="url(#sf-steel)" />
        <rect x="86" y="50" width="3" height="20" rx="1.5" fill="#fffaf2" opacity="0.4" />
        <rect x="86.5" y="42" width="9" height="6" rx="2" fill="#2b1147" />
        <Wordmark x={91} y={64} size={3.1} opacity={0.9} />
      </g>
      <g className="film-item film-item-3">
        {/* sweets / laddus in a tray */}
        <path d="M104 62 h24 v12 a3 3 0 0 1 -3 3 h-18 a3 3 0 0 1 -3 -3 Z" fill="url(#sf-card)" />
        {[[110, 60], [116, 58], [122, 60]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="5" fill="#e8a33d" />
            <circle cx={x - 1.6} cy={y - 1.8} r="1.5" fill="#f7d9a0" opacity="0.8" />
          </g>
        ))}
      </g>
      <g className="film-item film-item-4">
        {/* dried bouquet, the reference's signature */}
        <path d="M140 76 l-4 -26" stroke="#8a6b45" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M140 76 l2 -24" stroke="#8a6b45" strokeWidth="1.4" strokeLinecap="round" />
        {[[134, 48, '#e8b3a8'], [139, 44, '#f7d9d2'], [144, 49, '#d9a9c9'], [136, 54, '#c98878'], [143, 55, '#e8c9a0']].map(([x, y, c], i) => (
          <ellipse key={i} cx={x} cy={y} rx="3.4" ry="4.6" fill={c} transform={`rotate(${i * 26 - 40} ${x} ${y})`} />
        ))}
        <path d="M137 68 q4 3 6 0" stroke="url(#sf-satin)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
      <g className="film-item film-item-5">
        {/* the card that goes with it */}
        <g transform="rotate(-7 166 62)">
          <rect x="152" y="50" width="28" height="21" rx="2.5" fill="url(#sf-card)" />
          <path d="M157 57 h18 M157 61 h13 M157 65 h9" stroke="#b9a98f" strokeWidth="1.5" strokeLinecap="round" />
          <path d={HEART} transform="translate(170 51) scale(0.5)" fill="#c98878" />
        </g>
      </g>

      {/* front wall drawn over the contents, so they sit IN the box */}
      <path d="M52.6 78 h94.8 l-3.4 26 a4 4 0 0 1 -4 3.4 h-80 a4 4 0 0 1 -4 -3.4 Z" fill="url(#sf-lid)" />
      <path d="M52.6 78 h94.8 l-0.6 4.5 h-93.6 Z" fill="#fffaf2" opacity="0.07" />
      <Wordmark x={100} y={96} size={5.6} />
    </svg>
  )
}

/* Beat 3 — the packing. Lid on, satin cross drawn, bow tied, tag hung.
   The satin keeps catching light for the whole dwell. */
function WrapArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <Shadow cx="100" cy="106" rx="48" />

      {/* body */}
      <path d="M56 62 h88 v38 a5 5 0 0 1 -5 5 h-78 a5 5 0 0 1 -5 -5 Z" fill="url(#sf-body)" />
      {/* lid, arriving */}
      <g className="film-lid">
        <path d="M50 48 h100 v17 a3 3 0 0 1 -3 3 h-94 a3 3 0 0 1 -3 -3 Z" fill="url(#sf-lid)" />
        <path d="M50 48 h100 v3.5 h-100 Z" fill="#fffaf2" opacity="0.10" />
        <Wordmark x={100} y={61} size={5.8} className="film-foil" />
      </g>

      {/* satin: drawn once, then catching light for the rest of the dwell */}
      <path className="film-ribbon" d="M100 48 L100 105" stroke="url(#sf-satin-v)" strokeWidth="11" fill="none" pathLength="100" />
      <path className="film-ribbon film-ribbon-2" d="M56 86 L144 86" stroke="url(#sf-satin)" strokeWidth="10" fill="none" pathLength="100" />
      <path className="film-sheen-band" d="M100 48 L100 105" stroke="#fffaf0" strokeWidth="2.4" opacity="0.55" fill="none" />

      {/* bow */}
      <g className="film-pivot film-bow" style={{ transformOrigin: '100px 44px' }}>
        <path d="M100 44 C88 30 72 30 72 40 C72 49 88 49 100 44 Z" fill="url(#sf-satin)" />
        <path d="M100 44 C112 30 128 30 128 40 C128 49 112 49 100 44 Z" fill="url(#sf-satin)" />
        <path d="M100 44 C92 36 82 34 76 38" stroke="#8a5a0b" strokeWidth="0.8" fill="none" opacity="0.5" />
        <path d="M100 44 C108 36 118 34 124 38" stroke="#8a5a0b" strokeWidth="0.8" fill="none" opacity="0.5" />
        {/* tails */}
        <path d="M97 46 q-8 10 -14 12 l5 -13 Z" fill="url(#sf-satin)" opacity="0.92" />
        <path d="M103 46 q8 10 14 12 l-5 -13 Z" fill="url(#sf-satin)" opacity="0.92" />
        <ellipse cx="100" cy="44" rx="6.4" ry="5.6" fill="url(#sf-satin-v)" />
      </g>

      {/* the tag — "Especially for you", the reference's one true detail */}
      <g className="film-tag">
        <path d="M144 78 C152 74 158 72 163 71" stroke="#f0b429" strokeWidth="1.3" fill="none" />
        <g transform="rotate(-11 174 78)">
          <rect x="161" y="68" width="26" height="19" rx="3" fill="url(#sf-card)" />
          <circle cx="164.5" cy="71.5" r="1.3" fill="#b9a98f" />
          <path d="M166 78 h16 M166 82 h11" stroke="#b9a98f" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  )
}

/* Beat 4 — the handover. Two hands, the box passing between them. This is
   the beat the brief asked for and the one the reference photography does
   best: a gift is not a parcel left on a step, it is given to somebody. */
function HandoverArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      {/* the run in, behind the hands */}
      <path
        className="film-route"
        d="M6 96 Q52 62 96 78"
        stroke="#2f8f68" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="1 8"
        fill="none" pathLength="100"
      />

      {/* giving hand, from the left */}
      <g className="film-hand-give">
        <path
          d="M2 86 C14 84 26 80 36 76 C42 73.6 48 72 53 72 L53 92 C46 93 38 95 30 97 C20 99.4 10 100 2 100 Z"
          fill="url(#sf-skin)"
        />
        {/* fingers curling under the box */}
        {[0, 1, 2, 3].map(i => (
          <path key={i} d={`M${47 - i * 0.5} ${71 + i * 5} q9 -1.6 13 1.6 q-5 3.4 -13 2.6 Z`} fill="#d69a68" opacity={0.95 - i * 0.08} />
        ))}
        <path d="M2 86 C14 84 26 80 36 76" stroke="#f0c79a" strokeWidth="1.2" fill="none" opacity="0.5" />
        {/* cuff */}
        <path d="M2 84 l7 -2 v22 l-7 1 Z" fill="#0b3d2e" />
      </g>

      {/* the box, mid-pass */}
      <g className="film-pass">
        <Shadow cx="100" cy="98" rx="24" ry="3.4" opacity={0.5} />
        <path d="M78 58 h44 v30 a4 4 0 0 1 -4 4 h-36 a4 4 0 0 1 -4 -4 Z" fill="url(#sf-body)" />
        <path d="M74 50 h52 v11 a2.5 2.5 0 0 1 -2.5 2.5 h-47 a2.5 2.5 0 0 1 -2.5 -2.5 Z" fill="url(#sf-lid)" />
        <path d="M74 50 h52 v2.6 h-52 Z" fill="#fffaf2" opacity="0.11" />
        <path d="M100 50 L100 92" stroke="url(#sf-satin-v)" strokeWidth="7" />
        <path d="M78 76 L122 76" stroke="url(#sf-satin)" strokeWidth="6" />
        <ellipse cx="100" cy="48" rx="5.2" ry="4.4" fill="url(#sf-satin-v)" />
        <Wordmark x={100} y={59} size={4.4} />
      </g>

      {/* receiving hand, from the right, opening to take it */}
      <g className="film-hand-take">
        <path
          d="M198 82 C186 81 174 78 164 74 C158 71.6 152 70 147 70 L147 90 C154 91 162 93 170 95 C180 97.4 190 98 198 98 Z"
          fill="url(#sf-skin)"
        />
        {[0, 1, 2, 3].map(i => (
          <path key={i} d={`M${153 + i * 0.5} ${69 + i * 5} q-9 -1.6 -13 1.6 q5 3.4 13 2.6 Z`} fill="#d69a68" opacity={0.95 - i * 0.08} />
        ))}
        <path d="M198 80 C186 79 174 76 164 72" stroke="#f0c79a" strokeWidth="1.2" fill="none" opacity="0.5" />
        <path d="M198 80 l-7 -2 v22 l7 1 Z" fill="#3b1181" />
      </g>

      {/* the exchange registering */}
      {[
        { x: 60, y: 26, d: '1.0s' }, { x: 132, y: 22, d: '1.25s' }, { x: 96, y: 14, d: '1.45s' },
      ].map(s => (
        <g key={s.d} className="film-pivot film-twinkle" style={{ animationDelay: s.d, transformOrigin: `${s.x + 5}px ${s.y + 5}px` }}>
          <path d={STAR} transform={`translate(${s.x} ${s.y})`} fill="#2f8f68" />
        </g>
      ))}
    </svg>
  )
}

/* Beat 5 — the opening. Ribbon pulls off, lid lifts and tilts, light comes
   out, and what comes out of the box is not product — it is the reaction. */
function MomentArt() {
  return (
    <svg viewBox="0 0 200 120" className={ART} role="presentation">
      <g className="film-pivot film-rays" style={{ transformOrigin: '100px 68px' }}>
        {[-70, -47, -24, 0, 24, 47, 70].map(a => (
          <path key={a} d="M100 68 L93 -8 L107 -8 Z" fill="#e8a11c" opacity="0.34" transform={`rotate(${a} 100 68)`} />
        ))}
      </g>
      <circle className="film-burst" cx="100" cy="66" r="50" fill="url(#sf-burst)" />

      {/* lid, leaving with the bow still on it */}
      <g className="film-pivot film-lid-off" style={{ transformOrigin: '100px 54px' }}>
        <path d="M54 48 h92 v15 a3 3 0 0 1 -3 3 h-86 a3 3 0 0 1 -3 -3 Z" fill="url(#sf-lid)" />
        <path d="M100 48 L100 66" stroke="url(#sf-satin-v)" strokeWidth="9" />
        <ellipse cx="100" cy="46" rx="7" ry="5.6" fill="url(#sf-satin-v)" />
        <Wordmark x={100} y={60} size={5} />
      </g>

      <Shadow cx="100" cy="108" rx="44" />
      {/* the open box */}
      <path d="M60 66 h80 v34 a5 5 0 0 1 -5 5 h-70 a5 5 0 0 1 -5 -5 Z" fill="url(#sf-body)" />
      <path d="M60 66 h80 v7 h-80 Z" fill="url(#sf-inner)" />
      <path d="M60 84 L140 84" stroke="url(#sf-satin)" strokeWidth="7" />
      <Wordmark x={100} y={99} size={5} />

      {/* what actually comes out of it */}
      {[
        { x: 68,  y: 62, d: '0.55s', f: '#fb7185', s: 1.3 },
        { x: 122, y: 56, d: '0.85s', f: '#fda4af', s: 1.0 },
        { x: 94,  y: 46, d: '1.15s', f: '#f43f5e', s: 1.6 },
        { x: 110, y: 40, d: '1.45s', f: '#fecdd3', s: 0.9 },
      ].map(h => (
        <g key={h.d} className="film-lift" style={{ animationDelay: h.d }}>
          <path d={HEART} transform={`translate(${h.x} ${h.y}) scale(${h.s})`} fill={h.f} />
        </g>
      ))}
      {[
        { x: 42, y: 40, d: '0.7s' }, { x: 148, y: 32, d: '1.0s' },
        { x: 58, y: 18, d: '1.3s' }, { x: 136, y: 62, d: '0.9s' },
      ].map(s => (
        <g key={s.d} className="film-pivot film-twinkle" style={{ animationDelay: s.d, transformOrigin: `${s.x + 5}px ${s.y + 5}px` }}>
          <path d={STAR} transform={`translate(${s.x} ${s.y})`} fill="#c9821f" />
        </g>
      ))}
    </svg>
  )
}

/* ── Reduced motion ───────────────────────────────────────────────────────
   Not the film with the animation switched off — that is one frozen frame
   and four captions nobody sees. It becomes the storyboard: all five beats
   at once, in order, still legible as a sequence. The CSS pins every drawing
   to its resting state, since several start at opacity 0. */
function Storyboard() {
  return (
    <section className="px-4" aria-label="How Sambramo gifting works">
      <FilmDefs />
      <ol className="grid grid-cols-2 gap-3">
        {BEATS.map((b, i) => {
          const { Art } = b
          const wide = i === BEATS.length - 1
          return (
            <li key={b.key} className={wide ? 'col-span-2' : undefined}>
              <Link
                to={b.to}
                className="block overflow-hidden rounded-2xl ring-1 ring-white/10"
                style={{ background: b.ground }}
              >
                <span aria-hidden="true" className="flex h-[88px] items-center justify-center [&>svg]:h-[78px] [&>svg]:w-[130px]">
                  <Art />
                </span>
                <span className="block bg-[#12071f]/60 p-2.5">
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
