import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { X, ChevronLeft, ChevronRight, Pause } from 'lucide-react'

/**
 * The partner guide, played the way a status is played.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE STORY STAYS OPEN UNTIL ITS CARDS RUN OUT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Tapping a ring opens that story and it advances on its own, card by
 * card, with a progress bar per card filling in real time. That is the
 * whole point: a partner should not have to tap to learn something.
 *
 * The timer is driven by requestAnimationFrame against wall-clock time,
 * not by a CSS animation, because the bar and the advance have to agree.
 * A CSS transition and a setTimeout drift apart on a slow phone and the
 * bar finishes visibly before or after the card turns.
 *
 * Holding the screen pauses — the reflex everyone has when they want to
 * finish reading. Releasing resumes from where it paused rather than
 * restarting the card.
 *
 * A video card runs for its own duration instead of the fixed one; a
 * six-second window over a twenty-second clip would cut it off mid
 * sentence.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IT READS
 * ══════════════════════════════════════════════════════════════════════
 *
 * `partner_story_slides`, published rows only, ordered by position —
 * the same table and the same four story keys the admin console writes.
 * Nothing is hardcoded here: a story with no published slides renders
 * as a dimmed ring that cannot be opened, so an empty database is an
 * empty guide rather than a broken one.
 */

const IMAGE_MS = 6000

const KEYS = ['instant-booking', 'start-trip', 'live-tracking', 'event-complete']
const META = {
  'instant-booking': ['Instant Bookings', 'Your Interactive Partner Guide'],
  'start-trip': ['Start Your Trip', 'Keep the customer updated'],
  'live-tracking': ['Live Tracking', 'The customer sees you coming'],
  'event-complete': ['Event Done · Payment', 'Finish the job with confidence'],
}
const EMOJI = ['⚡', '🧭', '📍', '✓']

export default function PartnerStoryViewer() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(null)
  const [card, setCard] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    let live = true
    supabase
      .from('partner_story_slides')
      .select('id, story_key, title, description, media_url, media_type, position')
      .eq('is_published', true)
      .order('position')
      .then(({ data, error }) => { if (live && !error) setItems(data || []) })
    return () => { live = false }
  }, [])

  const groups = useMemo(() => items.reduce((a, x) => {
    (a[x.story_key] ||= []).push(x)
    return a
  }, {}), [items])

  const deck = open ? (groups[open] || []) : []
  const current = deck[card]

  const close = useCallback(() => { setOpen(null); setCard(0); setProgress(0) }, [])

  const next = useCallback(() => {
    setProgress(0)
    setCard(c => {
      if (c < deck.length - 1) return c + 1
      /* Last card of the story: close rather than roll into the next
         story. He asked for one story to stay open until it ends. */
      close()
      return 0
    })
  }, [deck.length, close])

  const prev = useCallback(() => {
    setProgress(0)
    setCard(c => (c > 0 ? c - 1 : c))
  }, [])

  /* The clock. Wall-clock based so the bar and the turn never drift. */
  const raf = useRef(0)
  const startedAt = useRef(0)
  const elapsed = useRef(0)
  const videoRef = useRef(null)

  useEffect(() => { elapsed.current = 0 }, [open, card])

  useEffect(() => {
    if (!current || paused) return undefined

    /* A video times itself; onEnded advances it. */
    if (current.media_type === 'video') return undefined

    startedAt.current = performance.now() - elapsed.current
    const tick = now => {
      elapsed.current = now - startedAt.current
      const p = Math.min(1, elapsed.current / IMAGE_MS)
      setProgress(p)
      if (p >= 1) { next(); return }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [current, paused, next])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (paused) v.pause(); else v.play().catch(() => {})
  }, [paused, current])

  /* Escape closes, arrows step. A partner on a tablet with a keyboard
     is rare; a developer checking this screen is not. */
  useEffect(() => {
    if (!open) return undefined
    const onKey = e => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close, next, prev])

  function begin(k) {
    if (!groups[k]?.length) return
    setOpen(k); setCard(0); setProgress(0); setPaused(false)
  }

  return (
    <>
      <section className="mb-4 rounded-2xl bg-gradient-to-r from-[#21063c] via-[#4b0082] to-[#6d28d9] p-4 text-white">
        <div className="text-[10px] font-black tracking-[.18em] text-violet-200">SAMBRAMO PARTNER</div>
        <div className="mt-1 text-lg font-black">Your Interactive Partner Guide</div>
        <p className="mt-1 text-xs text-violet-100">Quick visual guides for every stage of a booking.</p>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {KEYS.map((k, i) => {
            const n = groups[k]?.length || 0
            return (
              <button
                key={k} onClick={() => begin(k)} disabled={!n}
                className="flex min-w-[68px] flex-col items-center gap-2 disabled:opacity-40"
              >
                <span className={`h-14 w-14 rounded-full p-[2px] ${n
                  ? 'bg-gradient-to-br from-fuchsia-300 to-white' : 'bg-white/20'}`}
                >
                  <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#30065c] text-xl">
                    {/* The first card is the ring's face, the way a status
                        shows its first frame. Falls back to the glyph when
                        the story is empty or the media is a video. */}
                    {groups[k]?.[0]?.media_type === 'image'
                      ? <img src={groups[k][0].media_url} alt="" className="h-full w-full object-cover" />
                      : EMOJI[i]}
                  </span>
                </span>
                <span className="text-center text-[10px] font-bold">{META[k][0]}</span>
                <span className="text-[9px] text-violet-200">{n} cards</span>
              </button>
            )
          })}
        </div>
      </section>

      {open && current && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div
            className="relative h-full max-h-[920px] w-full max-w-lg select-none overflow-hidden bg-black text-white"
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerCancel={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
          >
            {/* One bar per card: filled behind, live on the current, empty ahead. */}
            <div className="absolute left-3 right-3 top-3 z-20 flex gap-1">
              {deck.map((it, i) => (
                <div key={it.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                  <div
                    className="h-full bg-white"
                    style={{ width: i < card ? '100%' : i === card ? `${progress * 100}%` : '0%' }}
                  />
                </div>
              ))}
            </div>

            <div className="absolute left-4 right-4 top-8 z-20 flex items-center justify-between">
              <div>
                <div className="text-xs font-black tracking-widest">SAMBRAMO PARTNER</div>
                <div className="text-[11px] text-violet-200">{META[open][1]}</div>
              </div>
              <div className="flex items-center gap-2">
                {paused && (
                  <span className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[10px] font-bold">
                    <Pause size={11} /> Paused
                  </span>
                )}
                <button onClick={close} aria-label="Close" className="rounded-full border border-white/40 bg-black/30 p-2">
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Tap zones. Left third steps back, right two-thirds forward. */}
            <button
              className="absolute bottom-24 left-0 top-20 z-10 w-1/3" aria-label="Previous card"
              onClick={prev}
            />
            <button
              className="absolute bottom-24 right-0 top-20 z-10 w-2/3" aria-label="Next card"
              onClick={next}
            />

            {/* Pinned to the overlay rather than inheriting a height
                chain: `h-full` through three wrappers collapsed the
                image to a few pixels, which read as a black screen. */}
            <div className="absolute inset-0 flex items-center justify-center">
              {current.media_type === 'video' ? (
                <video
                  ref={videoRef} key={current.id} src={current.media_url}
                  className="max-h-full max-w-full object-contain"
                  autoPlay playsInline
                  onTimeUpdate={e => {
                    const d = e.currentTarget.duration
                    if (d) setProgress(Math.min(1, e.currentTarget.currentTime / d))
                  }}
                  onEnded={next}
                />
              ) : (
                <img
                  key={current.id} src={current.media_url} alt={current.title}
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>

            <div className="absolute bottom-5 left-4 right-4 z-20 flex items-center justify-between gap-2">
              <button
                onClick={prev}
                className="rounded-full border border-white/40 bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur"
              >
                <ChevronLeft size={16} className="inline" /> Back
              </button>
              <span className="text-[10px] text-violet-200">
                {META[open][0].toUpperCase()} · {card + 1} OF {deck.length}
              </span>
              <button
                onClick={next}
                className="rounded-full bg-white px-4 py-3 text-sm font-black text-violet-900"
              >
                {card === deck.length - 1 ? 'Done' : 'Next'} <ChevronRight size={16} className="inline" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
