/**
 * The catering funnel's first two slides, photographed without a login.
 *
 * These are the real KitchenStep and CuisineStep, driven by useState the
 * way AddItemFlow drives them. Slide 2 is shown with South Indian already
 * open and two kitchens ticked, because the empty state of an accordion
 * says nothing about whether the thing inside it is any good.
 *
 *   node scripts/shoot-components.mjs out.png --scenes scripts/scenes/catering-funnel-scenes.jsx
 */
import React, { useState } from 'react'
import { KitchenStep, CuisineStep, CuisineDishStep } from '../../src/components/vendor/CateringFunnel'

function Scene({ title, note, children }) {
  return (
    <section style={{ marginBottom: 30 }}>
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

function Dishes({ cuisine = 'karnataka', kitchen = 'both', id = 'dishes' }) {
  const [d, setD] = useState([])
  const [note, setNote] = useState('')
  const [up, setUp] = useState([])
  return (
    <div id={id}>
      <CuisineDishStep
        cuisineId={cuisine} kitchen={kitchen}
        chosen={d} onChange={setD}
        note={note} onNote={setNote}
        uploads={up} onUploads={setUp}
      />
    </div>
  )
}

/* CuisineStep keeps which regions are open in its own state, so the only
   way to photograph it opened is to click it. Rendered twice: once shut,
   once with South Indian opened by a click the harness fires. */
function OpenedSouth({ kitchen, preselect = [] }) {
  const [v, setV] = useState(preselect)
  return (
    <div id="south-open">
      <CuisineStep kitchen={kitchen} value={v} onChange={setV} />
    </div>
  )
}

export default function CateringFunnelScenes() {
  const [kitchen, setKitchen] = useState('both')
  const [closed, setClosed] = useState([])

  return (
    <div style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>

      <Scene
        title="Slide 1 · what kind of kitchen"
        note="Three cards, single select. 'Both' is chosen here."
      >
        <KitchenStep value={kitchen} onChange={setKitchen} />
      </Scene>

      <Scene
        title="Slide 2 · the regions, all shut"
        note="Nine full-width cards. The line under each is built from the cuisines actually inside it."
      >
        <CuisineStep kitchen="both" value={closed} onChange={setClosed} />
      </Scene>

      <Scene
        title="Slide 2 · South Indian opened"
        note="The harness clicks it open. Karnataka and Kerala ticked."
      >
        <OpenedSouth kitchen="both" preselect={['karnataka', 'kerala']} />
      </Scene>

      <Scene
        title="Slide 3 · the dishes for one cuisine"
        note="Tick-everything sits under the count it changes. Then the text box and the menu card."
      >
        <Dishes />
      </Scene>

      <Scene
        title="Slide 3 · Tamil Nadu, from the registry"
        note="Every dish carries an id, a line of what it is, and its own diet flag."
      >
        <Dishes cuisine="tamil" id="tamil-dishes" />
      </Scene>
    </div>
  )
}
