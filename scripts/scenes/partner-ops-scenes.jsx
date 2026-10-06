/**
 * The operations screens, and the exact-number field beside the chips.
 *
 *   node scripts/shoot-components.mjs out.png --scenes scripts/scenes/partner-ops-scenes.jsx
 */
import React, { useState } from 'react'
import { OperationsStep } from '../../src/components/vendor/AddItemFlow'
import { operationScreensFor } from '../../src/data/partnerOperations'

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

/* Through operationScreensFor, not the raw OPERATION_SCREENS: catering
   reaches these screens the same way every other trade does, and the raw
   array has no stateKeys. Photographing the raw shape would prove a
   screen the app never renders. */
const SCREENS = operationScreensFor('Catering & Food')

/* Presets name a group by its bare id, which is how a human thinks
   about them; the screen keys answers by stateKey. Without translating,
   every preset below photographs as untouched. */
function keyed(screen, preset) {
  const out = {}
  for (const [id, v] of Object.entries(preset)) {
    const g = (screen?.groups ?? []).find(x => x.id === id)
    out[g?.stateKey ?? id] = v
  }
  return out
}

function Ops({ id, preset = {} }) {
  const screen = SCREENS.find(s => s.id === id)
  const [v, setV] = useState(() => keyed(screen, preset))
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
