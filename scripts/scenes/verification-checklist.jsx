/**
 * The same screen, three trades, three different checklists.
 *
 * The engine is proved by `check-verification-requirements.mjs` — 55
 * assertions, no browser. What that cannot show is whether the result
 * READS as considered or as bureaucratic: whether a transport partner
 * seeing five documents feels informed or ambushed, and whether the
 * "why" line does enough work to make each row feel earned.
 *
 * Built from the real engine, so if a rule changes this picture changes
 * with it.
 *
 *   node scripts/shoot-components.mjs shots/verification-checklist.png \
 *     --scenes scripts/scenes/verification-checklist.jsx --width 390 --wait 1200
 */
import React from 'react'
import { requirementsFor } from '../../src/data/compliance'

const TONE = {
  required: 'bg-saffron-400/15 text-saffron-800 ring-saffron-300/60',
  optional: 'bg-ink/[0.05] text-ink-mute ring-ink/[0.10]',
  declinable: 'bg-plum-50 text-plum-700 ring-plum-200',
}

function Row({ r }) {
  const badge = r.required ? 'required' : r.declinable ? 'declinable' : 'optional'
  const word = r.required ? 'Required' : r.declinable ? 'You may decline' : 'Optional'

  return (
    <li className="rounded-[16px] bg-white p-3 ring-1 ring-ink/[0.06]">
      <p className="flex flex-wrap items-center gap-2 text-[13px] font-extrabold leading-tight text-ink">
        {r.label}
        <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide ring-1 ${TONE[badge]}`}>
          {word}
        </span>
      </p>
      {r.why && (
        <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">{r.why}</p>
      )}
      <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10.5px] text-ink-mute">
        <span>{r.frontRequired && r.backRequired ? 'Both sides' : 'One side'}</span>
        {r.numberRequired && <span>· Number</span>}
        {r.expiryRequired && <span>· Expiry</span>}
        {r.faceMatchRequired && <span>· Face match</span>}
        <span>· {r.verificationProvider === 'manual' ? 'Reviewed by hand' : `via ${r.verificationProvider}`}</span>
      </p>
    </li>
  )
}

function Trade({ name, answers }) {
  const reqs = requirementsFor({ trades: [name], answers })
  return (
    <section className="mb-6">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
        {name}
      </p>
      <p className="mb-2 text-[12px] text-ink-soft">
        {reqs.length} document{reqs.length === 1 ? '' : 's'} asked for
      </p>
      <ul className="space-y-1.5">
        {reqs.map(r => <Row key={r.id} r={r} />)}
      </ul>
    </section>
  )
}

export default function VerificationChecklist() {
  return (
    <div className="mx-auto max-w-[420px] bg-page p-4">
      <p className="mb-4 text-[12.5px] leading-relaxed text-ink-soft">
        Each list is generated from the trade. Nothing here is written into
        a screen — change a tier and these change.
      </p>

      <Trade name="Photography" />
      <Trade name="Catering & Food" />
      <Trade name="Transportation" />
      <Trade name="Venue" />
      <Trade name="Invitation & Printing" />
    </div>
  )
}
