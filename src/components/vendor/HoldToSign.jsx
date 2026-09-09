import React, { useEffect, useRef, useState } from 'react'

/**
 * Hold for a second to sign. The mechanic, on its own.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY HOLD, AND NOT TAP
 * ══════════════════════════════════════════════════════════════════════
 *
 * A tap is indistinguishable from a mis-tap. Holding for a second is a
 * deliberate act, it cannot happen in a pocket, and on a phone it feels
 * like signing rather than like dismissing. The bar filling is the whole
 * interface: no keyboard, no scroll, nothing to read twice.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY IT IS ITS OWN FILE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Two things are signed in this app now — the listing, at the end of the
 * add-item flow, and the partner agreement, during onboarding — and they
 * must feel identical, because a partner who signed one and then meets a
 * different gesture for the other has to work out whether the second one
 * is the same kind of act. It is.
 *
 * The rAF loop, the pointer-cancel handling and the "editing the name
 * un-signs it" rule are the parts that are easy to get subtly wrong, so
 * they live once. What differs between the two — the declaration above,
 * and what is stored — stays with the caller.
 *
 * ── The signature this produces ─────────────────────────────────────
 * A typed name, the moment, and whatever `extra` the caller wants kept
 * with it. Not a drawn image: a scribble on a canvas proves nothing
 * about who held the phone and costs a hundred kilobytes in every row.
 */

const HOLD_MS = 1100

export default function HoldToSign({
  value,
  onChange,
  extra,
  label = 'Your full name',
  placeholder = 'As it should appear on the agreement',
  tone = 'forest',
}) {
  const [name, setName] = useState(value?.name ?? '')
  const [progress, setProgress] = useState(0)
  const timer = useRef(null)
  const started = useRef(0)

  const signed = !!value?.signed_at
  const ready = name.trim().length >= 2

  /* Editing the name after signing un-signs it — otherwise somebody
     could sign as one person and submit as another, which is the one
     thing a signature is supposed to prevent. */
  useEffect(() => {
    if (signed && name !== value.name) onChange(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  function stop() {
    if (timer.current) cancelAnimationFrame(timer.current)
    timer.current = null
    setProgress(0)
  }

  function tick() {
    const p = Math.min(1, (Date.now() - started.current) / HOLD_MS)
    setProgress(p)
    if (p >= 1) {
      stop()
      onChange({
        name: name.trim(),
        signed_at: new Date().toISOString(),
        method: 'hold',
        ...(extra ?? {}),
      })
      return
    }
    timer.current = requestAnimationFrame(tick)
  }

  function begin() {
    if (!ready || signed) return
    started.current = Date.now()
    timer.current = requestAnimationFrame(tick)
  }

  useEffect(() => stop, [])

  const fill = tone === 'saffron' ? 'bg-saffron-400 text-plum-950' : 'bg-forest-600 text-white'
  const done = tone === 'saffron' ? 'bg-saffron-400/20 text-plum-950' : 'bg-forest-50 text-forest-800'

  return (
    <div data-hold-to-sign>
      <label className="block">
        <span className="block text-[12.5px] font-extrabold text-ink">{label}</span>
        <input
          value={name}
          onChange={e => setName(e.target.value.slice(0, 80))}
          placeholder={placeholder}
          autoComplete="name"
          className="mt-1.5 w-full rounded-2xl bg-white px-3.5 py-3 text-[15px] font-bold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
        />
      </label>

      {signed ? (
        <div className={`mt-3 flex items-center gap-2.5 rounded-2xl px-3.5 py-3 ${done}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <p className="text-[12.5px] font-semibold leading-snug">
            Signed by <span className="font-extrabold">{value.name}</span> on{' '}
            {new Date(value.signed_at).toLocaleString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })}
          </p>
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={!ready}
            onPointerDown={begin}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            onContextMenu={e => e.preventDefault()}
            aria-label="Hold to sign"
            className={`relative mt-3 w-full select-none overflow-hidden rounded-2xl py-3.5 text-[15px] font-extrabold transition ${
              ready ? fill : 'bg-ink/[0.05] text-ink-mute'
            }`}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 bg-white/25"
              style={{ width: `${progress * 100}%` }}
            />
            <span className="relative">
              {progress > 0 ? 'Keep holding…' : 'Hold to sign'}
            </span>
          </button>
          <p className="mt-1.5 text-center text-[11.5px] text-ink-mute">
            {ready ? 'Press and hold for a second.' : 'Type your name to sign.'}
          </p>
        </>
      )}
    </div>
  )
}
