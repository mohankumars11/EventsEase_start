/**
 * The operations screens for a trade that is not catering.
 *
 * Photography had one question before this — what they shoot — and a
 * price box. These are the six screens every trade now gets.
 */
import React, { useState } from 'react'
import { OperationsStep } from '../../src/components/vendor/AddItemFlow'
import { operationScreensFor } from '../../src/data/partnerOperations'

function Ops({ trade, screenId, preset = {} }) {
  const [v, setV] = useState(preset)
  const screen = operationScreensFor(trade).find(s => s.id === screenId)
  return (
    <section style={{ marginBottom: 26 }}>
      <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>
        {trade} · {screen?.title}
      </p>
      <OperationsStep screen={screen} value={v} onChange={setV} />
    </section>
  )
}

export default function TradeOpsScenes() {
  return (
    <div id="ops" style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <Ops trade="Photography" screenId="scale" preset={{ shoot_hours: '12', events_per_day: '2' }} />
      <Ops trade="Photography" screenId="brings" preset={{ kit: ['second_shooter', 'lighting'] }} />
      <Ops trade="Photography" screenId="limits" preset={{ time_limits: ['early'] }} />
      <Ops trade="Tent & Furniture" screenId="scale" preset={{ tent_area: '5000', chairs: '750' }} />
      <Ops trade="Priest & Rituals" screenId="limits" preset={{ traditions: ['madhwa'] }} />
    </div>
  )
}
