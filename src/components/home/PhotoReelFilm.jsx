import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Store } from 'lucide-react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { REEL_BEATS } from '../../config/homeReel'
import ImageSourceBadge from '../shop/ImageSourceBadge'

/**
 * The photographic film on Home. Real HD frames, one changing button.
 *
 * config/homeReel.js carries the reasoning about WHAT is in the reel and why
 * there are two films on this page. This file is about how it plays, and there
 * are five decisions in it worth keeping.
 *
 * ── Every frame stays mounted ─────────────────────────────────────────────
 * All seven photographs are in the DOM from the first render and cross-fade on
 * opacity. Swapping one `<img src>` would mean a decode on every beat — the
 * frame goes blank for 100–300ms on a mid-range Android, which reads as the reel
 * stuttering. Mounted and faded, only the compositor is involved.
 *
 * The cost is seven images instead of one, so frames after the first are `lazy`
 * and low priority. The first is `eager`: it is what somebody actually sees.
 *
 * ── The projector stops when nobody is watching ───────────────────────────
 * An IntersectionObserver pauses the whole thing off-screen. This sits below the
 * mosaic, which is most of a phone-screen tall, so on arrival it is almost never
 * visible — without this it would be advancing through its beats, and burning a
 * timer and seven Ken Burns transforms, before anyone had scrolled to it.
 *
 * It also resets to beat one, so you get the reel from the start rather than
 * joining it halfway. Same contract as BrandFilm.
 *
 * ── The button is the beat's, not the reel's ──────────────────────────────
 * The whole panel is one `<Link>` whose `to` changes with the frame, and it
 * freezes on pointer-down. That second part is not a nicety: the href changes
 * every 4.2 seconds and a thumb takes ~200ms to land, so without the freeze a
 * customer aiming at "Order a cake" can be sent to the carving shelf. Holding at
 * touch-start is what makes the beat you aimed at the beat you get.
 *
 * The persistent "Everything in the shop" button is deliberately a SIBLING of
 * that link rather than inside it — nested interactive elements are invalid
 * markup and, in practice, a tap lands on whichever the browser feels like.
 *
 * ── Reduced motion gets a contact sheet, not a frozen frame ───────────────
 * Switching the animation off leaves one photograph and six captions nobody can
 * reach. So it becomes a grid of every beat at once, each with its own link —
 * the same information, none of the movement, and every destination still one
 * tap away.
 */

const BEAT_MS = 4200

export default function PhotoReelFilm() {
  const reduced = useReducedMotion()
  const [beat, setBeat] = useState(0)
  const [held, setHeld] = useState(false)
  const [onScreen, setOnScreen] = useState(false)
  const stage = useRef(null)

  useEffect(() => {
    const el = stage.current
    if (!el || typeof IntersectionObserver === 'undefined') { setOnScreen(true); return }
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const running = !reduced && onScreen && !held

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setBeat(n => (n + 1) % REEL_BEATS.length), BEAT_MS)
    return () => clearInterval(id)
  }, [running])

  // Back to the top of the reel whenever it leaves the screen.
  useEffect(() => { if (!onScreen) setBeat(0) }, [onScreen])

  if (REEL_BEATS.length === 0) return null
  if (reduced) return <ContactSheet />

  const current = REEL_BEATS[beat]

  return (
    /* ── Full-bleed ───────────────────────────────────────────────────
       No horizontal padding on the section, and no rounded corners on the
       stage. Both films used to sit in the page's 16px gutter as rounded
       cards, which is right for a card and wrong for a film: a cinematic
       panel inset from both edges is a picture ON a page, and the thing it
       is competing with — the hero banner in every retail app this audience
       uses — runs to the glass.

       Running to the edge also buys back 32px of image width on a 390px
       phone, which at this height is most of a face.

       The rounded corner goes with the margin rather than as a separate
       decision: a radius needs a gap to sit in, and against the screen edge
       it reads as a seam where the render failed. The heading and the shop
       button below keep `px-4`, because they are page furniture and have to
       line up with every other heading on the screen. */
    <section aria-label="What Sambramo sells">
      <div className="mb-2.5 flex items-baseline justify-between gap-3 px-4">
        <h2 className="text-[15px] font-extrabold text-ink">See it for real</h2>
        <span className="shrink-0 text-[11px] text-ink-mute">{REEL_BEATS.length} shelves</span>
      </div>

      <div ref={stage} className="relative">
        <Link
          to={current.to}
          aria-label={`${current.line} — ${current.cta}`}
          className="group relative block h-[290px] overflow-hidden ring-1 ring-hairline/10 sm:h-[340px]"
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
          onPointerDown={() => setHeld(true)}
        >
          {/* The accent plate, under everything. It is what shows for the one
              frame before the first photograph decodes — a tile in the beat's own
              colour rather than a grey rectangle. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 transition-colors duration-700"
            style={{ backgroundColor: current.accent }}
          />

          {REEL_BEATS.map((b, i) => (
            <img
              key={b.key}
              src={b.src}
              alt={i === beat ? b.alt : ''}
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchpriority={i === 0 ? 'high' : 'low'}
              decoding="async"
              /* Ken Burns only on the frame that is showing. Seven simultaneous
                 scale transforms is seven composited layers being animated for
                 six frames nobody can see. */
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1100ms] ease-in-out ${
                i === beat ? 'opacity-100' : 'opacity-0'
              } ${i === beat && running ? 'ken-burns' : ''}`}
            />
          ))}

          {/* Legibility. Two layers for the same reason the mosaic tiles have
              two: the reel runs from a near-white plant shot to a near-black
              carving, and one ramp cannot serve both. The lower layer is tinted
              with the beat's accent so the panel changes character with the
              frame rather than just changing picture. */}
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-plum-950/92 via-plum-950/35 to-plum-950/10" />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-2/3 transition-[background] duration-700"
            style={{ background: `linear-gradient(to top, ${current.accent}e6 0%, ${current.accent}66 50%, transparent 100%)` }}
          />

          {/* Grain, over the photograph. It is the cheapest cue that a panel is
              a photographic surface rather than a coloured div with an image in
              it, and it ties this film to the drawn one above, which uses the
              same texture for the opposite reason. */}
          <span aria-hidden="true" className="film-grain absolute inset-0" />

          {/* Representative-image disclosure, on the film as well as on the
              product tiles. Nothing in this reel is a photograph of something
              Sambramo has sourced, and a full-bleed cinematic panel is the most
              persuasive place in the app to imply otherwise — so it is exactly
              the place the badge has to appear. */}
          <span className="absolute right-3 top-3">
            <ImageSourceBadge source="stock" size="sm" />
          </span>

          {/* Keyed on the beat so the entrance keyframes replay on every cut. */}
          <span key={current.key} className="absolute inset-x-0 bottom-0 p-4">
            <span className="film-line block text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/85">
              {current.chapter}
            </span>
            <span className="film-line film-line-2 mt-1.5 block font-serif text-[25px] font-extrabold leading-[1.05] text-white sm:text-[31px]">
              {current.line}
            </span>
            <span className="film-line film-line-3 mt-1.5 block text-[12px] font-medium leading-snug text-white/85">
              {current.sub}
            </span>
            <span className="film-line film-line-3 mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-white px-4 py-2.5 text-[12px] font-extrabold text-plum-950 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.6)]">
              {current.cta}
              <ArrowRight size={13} strokeWidth={3} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </span>

          {/* Story-app ticks, so one look says "seven short beats" rather than
              "a carousel you have to drive". Reuses .deck-tick, so the fill and
              BEAT_MS cannot drift apart. */}
          <span aria-hidden="true" className="absolute inset-x-3 top-3 flex gap-1.5 pr-24">
            {REEL_BEATS.map((b, i) => (
              <span key={b.key} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                <span
                  key={`${b.key}-${beat}`}
                  className="block h-full rounded-full bg-white"
                  style={
                    i < beat  ? { width: '100%' }
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

        {/* A sibling of the panel, never a child of it — see the header on why
            nesting this inside the Link would make both taps unpredictable. */}
        <Link
          to="/shop"
          className="mx-4 mt-2.5 flex items-center justify-center gap-2 rounded-2xl bg-plum-900 py-3.5 text-[13px] font-extrabold text-white transition-transform active:scale-[0.98]"
        >
          <Store size={15} strokeWidth={2.6} />
          Everything in the shop
          <ArrowRight size={14} strokeWidth={3} />
        </Link>
      </div>
    </section>
  )
}

/* ── Reduced motion ───────────────────────────────────────────────────────
   Every beat at once, each still a link to its own shelf. A contact sheet is
   the honest still version of a reel — a frozen single frame would hide six of
   the seven destinations behind a preference somebody set for their eyes. */
function ContactSheet() {
  return (
    <section className="px-4" aria-label="What Sambramo sells">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-extrabold text-ink">See it for real</h2>
        <span className="shrink-0 text-[11px] text-ink-mute">{REEL_BEATS.length} shelves</span>
      </div>

      <ul className="grid grid-cols-2 gap-2.5">
        {REEL_BEATS.map((b, i) => (
          // With an odd count the last frame spans both columns rather than
          // leaving a hole in the grid.
          <li key={b.key} className={i === REEL_BEATS.length - 1 && REEL_BEATS.length % 2 === 1 ? 'col-span-2' : undefined}>
            <Link
              to={b.to}
              className="relative block h-[132px] overflow-hidden rounded-2xl ring-1 ring-hairline/10"
              style={{ backgroundColor: b.accent }}
            >
              <img src={b.src} alt={b.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-plum-950/90 via-plum-950/25 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-2.5">
                <span className="block text-[9px] font-extrabold uppercase tracking-[0.12em] text-white/80">{b.chapter}</span>
                <span className="mt-0.5 block font-serif text-[14px] font-bold leading-tight text-white">{b.line}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold text-white">
                  {b.cta} <ArrowRight size={10} strokeWidth={3} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        to="/shop"
        className="mt-2.5 flex items-center justify-center gap-2 rounded-2xl bg-plum-900 py-3.5 text-[13px] font-extrabold text-white"
      >
        <Store size={15} strokeWidth={2.6} />
        Everything in the shop
        <ArrowRight size={14} strokeWidth={3} />
      </Link>
    </section>
  )
}
