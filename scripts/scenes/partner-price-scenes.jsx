/**
 * The rate-per-menu screen and the hook cards, without a login.
 *
 * Three rates are pre-filled deliberately: one under market, one at it and
 * one over, because the guidance lines only exist in those states and an
 * empty form would photograph none of them.
 *
 *   node scripts/shoot-components.mjs out.png --scenes scripts/scenes/partner-price-scenes.jsx
 */
import React, { useState } from 'react'
import PriceGuidance from '../../src/components/vendor/PriceGuidance'
import HookCard, { PromiseStrip } from '../../src/components/vendor/HookCard'
import { HOOKS } from '../../src/data/partnerHooks'

const MENUS = [
  { id: 'leaf', name: 'Traditional leaf meal', fromPrice: 420 },
  { id: 'buffet', name: 'Buffet with live counters', fromPrice: 650 },
  { id: 'box', name: 'Box meals', fromPrice: 180 },
]

function Scene({ title, note, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <p style={{
        font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 3px',
      }}>{title}</p>
      {note && (
        <p style={{ font: '400 11.5px/1.4 system-ui', color: '#9a9a9a', margin: '0 0 10px' }}>
          {note}
        </p>
      )}
      {children}
    </section>
  )
}

function Rates() {
  /* 300 is under the ~420 market, 650 is at it, 900 is over — one card
     each for the two guidance lines and one with neither. */
  const [rates, setRates] = useState({ leaf: '300', buffet: '650', box: '900' })
  return <PriceGuidance menus={MENUS} rates={rates} onChange={setRates} />
}

export default function PartnerPriceScenes() {
  return (
    <div style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <Scene
        title="Your rate · per menu, and who sets the customer price"
        note="Under market, at market, over market — all three guidance states."
      >
        <Rates />
      </Scene>

      <Scene title="The three promises" note="Shown here and on the empty listing. Nowhere else.">
        <PromiseStrip />
      </Scene>

      <Scene title="Every hook, on the screen it belongs to">
        <div style={{ display: 'grid', gap: 10 }}>
          {Object.keys(HOOKS).map(id => (
            <div key={id}>
              <p style={{
                font: '700 9.5px/1.2 system-ui', letterSpacing: '.1em',
                textTransform: 'uppercase', color: '#b0b0b0', margin: '0 0 4px',
              }}>{id}</p>
              <HookCard id={id} />
            </div>
          ))}
        </div>
      </Scene>
    </div>
  )
}
