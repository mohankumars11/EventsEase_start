/**
 * One capture form per requirement, showing that the FIELDS differ.
 *
 * The engine is proved by check-document-capture.mjs — 40 assertions,
 * no browser. What that cannot show is whether a transport partner
 * looking at five documents feels informed or ambushed, and whether
 * "Still needs the back, the expiry date" reads as a task or a telling-off.
 *
 * Built from the real engine and the real component, so a rule change
 * moves this picture.
 *
 *   node scripts/shoot-components.mjs shots/document-capture.png \
 *     --scenes scripts/scenes/document-capture.jsx --width 390 --wait 1200
 */
import React from 'react'
import { requirementsFor } from '../../src/data/compliance'
import { evaluateRequirement } from '../../src/lib/verification/satisfaction'
import DocumentCapture from '../../src/components/partner/DocumentCapture'

const TODAY = '2026-09-22'
const reqOf = (trade, id) => requirementsFor({ trades: [trade] }).find(r => r.id === id)

function Case({ title, note, requirement, row }) {
  const verdict = evaluateRequirement(requirement, row ?? null, TODAY)
  return (
    <section className="mb-6">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
        {title}
      </p>
      {note && <p className="mb-2 text-[12px] leading-snug text-ink-soft">{note}</p>}
      <DocumentCapture
        requirement={requirement}
        verdict={verdict}
        vendorId="00000000-0000-0000-0000-000000000000"
      />
    </section>
  )
}

const aadhaar = reqOf('Photography', 'VER-ID-IDENTITY')
const pan = reqOf('Photography', 'VER-TAX-PAN')
const dl = reqOf('Transportation', 'VER-TRADE-DL')
const fssai = reqOf('Catering & Food', 'VER-TRADE-FSSAI')

export default function DocumentCaptureScene() {
  return (
    <div className="mx-auto max-w-[420px] bg-page p-4">
      <p className="mb-4 text-[12.5px] leading-relaxed text-ink-soft">
        Each form asks for exactly what its requirement declares. Nothing
        below is written into the component.
      </p>

      <Case
        title="1 · Aadhaar · nothing uploaded"
        note="Two sides, a number and the name. Face match is required for this one."
        requirement={aadhaar}
      />

      <Case
        title="2 · PAN · one side, no expiry"
        note="The same component, asking for less, because the requirement says less."
        requirement={pan}
      />

      <Case
        title="3 · Driving licence · front only so far"
        note="The missing fields are named rather than marked with a cross."
        requirement={dl}
        row={{
          requirement_id: dl.id, kind: dl.kind,
          storage_path: 'x/front.jpg', status: 'pending',
        }}
      />

      <Case
        title="4 · FSSAI · complete, and expiring"
        note="Satisfied, but close enough to its expiry to be worth saying."
        requirement={fssai}
        row={{
          requirement_id: fssai.id, kind: fssai.kind,
          storage_path: 'x/front.jpg', number_last4: '8901',
          expires_on: '2026-10-05', status: 'pending', checksum_ok: true,
        }}
      />

      <Case
        title="5 · FSSAI · expired"
        note="Not satisfied. An out-of-date licence is not a licence."
        requirement={fssai}
        row={{
          requirement_id: fssai.id, kind: fssai.kind,
          storage_path: 'x/front.jpg', number_last4: '8901',
          expires_on: '2020-01-01', status: 'pending',
        }}
      />
    </div>
  )
}
