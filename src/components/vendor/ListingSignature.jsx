import React, { useEffect, useRef, useState } from 'react'
import { Check, ShieldCheck } from 'lucide-react'

/**
 * The partner signs what they just said they can do.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A LISTING NEEDS A SIGNATURE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Everything before this screen is a claim. A caterer ticks 312 dishes,
 * a transporter ticks a 32-foot container, a venue ticks step-free
 * access — and dispatch then sends real jobs on the strength of it. When
 * one of those turns out not to be true, a family is standing in a hall
 * at 6pm and the only record is a checkbox nobody attested to.
 *
 * So the last thing before Submit is the partner putting their name to
 * it. Not a terms-and-conditions tick, which everybody scrolls past and
 * which is about OUR liability — a short, plain declaration about THEIR
 * claims, in words a person actually reads.
 *
 * ── Why hold, and not tap ────────────────────────────────────────────
 * A tap is indistinguishable from a mis-tap. Holding for a second is a
 * deliberate act, it cannot happen in a pocket, and on a phone it feels
 * like signing rather than like dismissing. The bar filling is the whole
 * interface: no keyboard, no scroll, nothing to read twice.
 *
 * ── What is kept ─────────────────────────────────────────────────────
 * The typed name, the moment, and the count of what was claimed. Not a
 * drawn image: a scribble on a canvas proves nothing about who held the
 * phone and costs a hundred kilobytes in every listing row. A name, a
 * timestamp and the exact claim is what an operator can actually use.
 *
 * The partner can still change anything — Back works, and a listing is
 * reviewed by a person before it goes live. This is a record of what was
 * asserted, not a lock.
 */

const HOLD_MS = 1100

export default function ListingSignature({ trade, claimCount, value, onChange }) {
  const [name, setName] = useState(value?.name ?? '')
  const [progress, setProgress] = useState(0)
  const timer = useRef(null)
  const started = useRef(0)

  const signed = !!value?.signed_at
  const ready = name.trim().length >= 2

  /* Editing the name after signing un-signs it — otherwise a partner
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
        trade,
        claims: claimCount,
        method: 'hold',
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

  return (
    <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0 rounded-xl bg-forest-50 p-2 text-forest-700">
          <ShieldCheck size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold leading-tight text-ink">
            Put your name to it
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">
            Jobs are sent to you on the strength of what is above. Sign it
            and an operator checks it before anything goes live.
          </p>
        </div>
      </div>

      {/* The declaration. Four lines, in the second person, about what
          THEY claimed — not a licence agreement about what we may do. */}
      <ul className="mt-3 space-y-1.5 rounded-2xl bg-ink/[0.02] p-3.5">
        {[
          `Everything ticked here is work you can actually do${trade ? ` as ${trade}` : ''}.`,
          'You will say no to a job you cannot take, rather than take it and hope.',
          'What you cannot do, you have said so, and nothing is held against you for it.',
          'You can change any of this afterwards, at any time.',
        ].map(line => (
          <li key={line} className="flex gap-2">
            <Check size={13} className="mt-[3px] shrink-0 text-forest-600" />
            <span className="text-[12.5px] leading-snug text-ink-soft">{line}</span>
          </li>
        ))}
      </ul>

      <label className="mt-3.5 block">
        <span className="block text-[12.5px] font-extrabold text-ink">Your full name</span>
        <input
          value={name}
          onChange={e => setName(e.target.value.slice(0, 80))}
          placeholder="As it should appear on the agreement"
          autoComplete="name"
          className="mt-1.5 w-full rounded-2xl bg-white px-3.5 py-3 text-[15px] font-bold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
        />
      </label>

      {signed ? (
        <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-forest-50 px-3.5 py-3">
          <Check size={16} className="shrink-0 text-forest-700" />
          <p className="text-[12.5px] font-semibold leading-snug text-forest-800">
            Signed by <span className="font-extrabold">{value.name}</span> on{' '}
            {new Date(value.signed_at).toLocaleString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })}
            {typeof value.claims === 'number' && value.claims > 0 && (
              <> · {value.claims} things claimed</>
            )}
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
              ready ? 'bg-forest-600 text-white' : 'bg-ink/[0.05] text-ink-mute'
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
