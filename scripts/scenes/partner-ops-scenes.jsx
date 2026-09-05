/**
 * The operations screens, and the exact-number field beside the chips.
 *
 *   node scripts/shoot-components.mjs out.png --scenes scripts/scenes/partner-ops-scenes.jsx
 */
import React, { useState } from 'react'
import { OperationsStep } from '../../src/components/vendor/AddItemFlow'
import { OPERATION_SCREENS } from '../../src/data/cateringOperations'

function Scene({ title, note, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <p style={{
        font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 3px',
      }}>{title}</p>
      {note && <p style={{ font: '400 11.5px/1.4 system-ui', color: '#9a9a9a', margin: '0 0 10px' }}>{note}</p>}
      {children}
    </section>
  )
}

function Ops({ id, preset = {} }) {
  const [v, setV] = useState(preset)
  const screen = OPERATION_SCREENS.find(s => s.id === id)
  return <OperationsStep screen={screen} value={v} onChange={setV} />
}

export default function PartnerOpsScenes() {
  return (
    <div style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <Scene
        title="How big do you go"
        note="4000 guests is typed, so no chip is lit — one question, one answer."
        >
        <Ops id="scale" preset={{ guests_per_event: '4000', events_per_day: '2' }} />
      </Scene>

      <Scene title="How is it served" note="9 servers per 100 — a number the old bands could not say.">
        <Ops id="serving" preset={{ service_style: ['leaf', 'buffet'], servers_per_100: '9' }} />
      </Scene>

      <Scene title="What you will not do" note="The screen with its own hook: nothing here counts against you.">
        <Ops id="limits" />
      </Scene>
    </div>
  )
}
