/**
 * The e-sign gate, in the three states a partner passes through.
 *
 * Nothing typed, a name typed, and signed. The middle one is the state
 * that has to look like the button is waiting for them rather than
 * broken.
 *
 *   node scripts/shoot-components.mjs shot.png --scenes scripts/scenes/sign-scenes.jsx
 */
import React, { useState } from 'react'
import ListingSignature from '../../src/components/vendor/ListingSignature'


function Sign({ label, initialName, signedValue }) {
  const [v, setV] = useState(signedValue ?? null)
  return (
    <section style={{ marginBottom: 22 }}>
      <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>{label}</p>
      <ListingSignature
        trade="Transportation"
        claimCount={41}
        value={v}
        onChange={setV}
        key={initialName}
      />
    </section>
  )
}

export default function SignScenes() {
  return (
    <div id="sign" style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <Sign label="Nothing typed yet" />
      <Sign label="Already signed" signedValue={{
        name: 'Ramesh Gowda', signed_at: '2026-09-06T09:12:00.000Z',
        trade: 'Transportation', claims: 41, method: 'hold',
      }} />
    </div>
  )
}
