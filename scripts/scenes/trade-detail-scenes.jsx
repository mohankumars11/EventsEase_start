/**
 * The detail screen for the trades a specialist pass changed.
 *
 * Adding a choice to partnerSpecs.js is one line and it is invisible
 * until somebody looks at the screen it lands on. A priest tradition
 * list of ten is a different screen from a list of six — long enough to
 * scroll, and the scan lines have to still read.
 *
 *   node scripts/shoot-components.mjs shot.png --scenes scripts/scenes/trade-detail-scenes.jsx
 */
import React, { useState } from 'react'
import { DetailStep } from '../../src/components/vendor/AddItemFlow'
import { SPECS_BY_TRADE } from '../../src/data/partnerSpecs'

function Detail({ trade, preset = {} }) {
  const groups = SPECS_BY_TRADE[trade] ?? []
  const [v, setV] = useState(preset)
  return (
    <section style={{ marginBottom: 26 }}>
      <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>
        {trade}
      </p>
      <DetailStep groups={groups} value={v} onChange={setV} />
    </section>
  )
}

export default function TradeDetailScenes() {
  return (
    <div id="detail" style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <Detail trade="Priest & Rituals"
        preset={{ tradition: ['kannada', 'smartha'], ceremonies: ['wedding', 'upanayana'] }} />
      <Detail trade="Live Entertainment" preset={{ acts: ['veeragase', 'nadaswaram'] }} />
      <Detail trade="Mehendi Artist" preset={{ cone: 'organic' }} />
      <Detail trade="Venue" preset={{ facilities: ['ac', 'kitchen'], catering_rule: 'outside_fee' }} />
      <Detail trade="Anchor & MC" preset={{ languages: ['kannada', 'malayalam'] }} />
    </div>
  )
}
