/**
 * "Even if I upload a laptop image it is also taking it."
 *
 * This is the answer to that, photographed. The top half is what the
 * classifier says back for each kind of photograph; the bottom half is
 * the consent panel that has to be answered before a selfie is taken.
 *
 * The verdicts come from `judgeReading` itself — real readings through
 * the real function — rather than from hand-written strings, so a
 * change to the wording shows up here rather than only in the guard.
 *
 *   node scripts/shoot-components.mjs shots/document-checked.png \
 *     --scenes scripts/scenes/document-checked.jsx --width 430
 */
import React from 'react'
import { ReadingVerdict } from '../../src/components/partner/DocumentCapture'
import BiometricConsent from '../../src/components/partner/BiometricConsent'
import { judgeReading } from '../../src/lib/verification/providers/vision'

const AADHAAR = { id: 'VER-ID-IDENTITY', label: 'Aadhaar', detectAs: ['aadhaar'] }
const FSSAI = { id: 'VER-TRADE-FSSAI', label: 'FSSAI licence', detectAs: ['fssai_licence'] }

/* A well-formed reading, so each case below differs in exactly the one
   field it is demonstrating. */
const reading = o => ({
  providerStatus: 'checked', isDocument: true, legible: true, confidence: 0.92, ...o,
})

const CASES = [
  ['A photograph of a laptop, filed as Aadhaar',
   judgeReading(reading({
     documentType: 'not_a_document', isDocument: false, whatYouSee: 'a laptop on a desk',
   }), AADHAAR)],

  ['A PAN card, filed as Aadhaar',
   judgeReading(reading({ documentType: 'pan' }), AADHAAR)],

  ['An Aadhaar card, filed as an FSSAI licence',
   judgeReading(reading({ documentType: 'aadhaar' }), FSSAI)],

  ['Too dark to read',
   judgeReading(reading({ documentType: 'aadhaar', legible: false }), AADHAAR)],

  ['A real Aadhaar card, photographed badly',
   judgeReading(reading({ documentType: 'aadhaar', confidence: 0.31 }), AADHAAR)],

  ['A real Aadhaar card',
   judgeReading(reading({ documentType: 'aadhaar' }), AADHAAR)],

  ['The checker itself was unreachable',
   judgeReading(
     { providerStatus: 'unavailable', says: 'We could not check that just now. A person will look at it instead.' },
     AADHAAR)],
]

function Scene({ title, note, children }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <p style={{
        font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 3px',
      }}>{title}</p>
      {note && (
        <p style={{ font: '400 11.5px/1.4 system-ui', color: '#9a9a9a', margin: '0 0 8px' }}>
          {note}
        </p>
      )}
      {children}
    </section>
  )
}

export default function DocumentCheckedScenes() {
  return (
    <div style={{ width: 430, margin: '0 auto', padding: 16, background: '#fff' }}>

      <Scene
        title="What the partner is told"
        note="Amber refuses and names what it saw. Grey could not tell, which is not a failure. Green was read. Nothing anywhere says verified."
      >
        {CASES.map(([label, judged]) => (
          <div key={label} style={{ marginBottom: 6 }}>
            <p style={{ font: '400 10.5px/1.3 system-ui', color: '#b0aeb4', margin: '0 0 3px' }}>
              {label}
              {judged.fatal ? ' — nothing is uploaded' : ' — the upload continues'}
            </p>
            <ReadingVerdict judged={judged} />
          </div>
        ))}
      </Scene>

      <Scene
        title="Before a selfie is taken"
        note="Free, specific, informed, withdrawable. The refusal is the same size and weight as the agreement, in the same row."
      >
        <BiometricConsent vendorId="demo" granted={false} onChanged={() => {}} />
      </Scene>

      <Scene
        title="And afterwards"
        note="Withdrawal sits exactly where the grant did. DPDP 2023 asks that it be as easy as giving it was."
      >
        <BiometricConsent vendorId="demo" granted onChanged={() => {}} />
      </Scene>
    </div>
  )
}
