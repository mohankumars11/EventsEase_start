/**
 * The catering menus screen, after it stopped showing "Option 1".
 *
 * Photographed in the two states that matter: nothing ticked, and a
 * kitchen that has ticked enough to cover a card.
 */
import React, { useState } from 'react'
import MenuDishStep from '../../src/components/vendor/MenuDishStep'
import { menusFor, menuLines, FOOD_COUNTERS } from '../../src/data/cateringMenus'
import { menuDishGroups } from '../../src/lib/menuCoverage'

const MENUS = menusFor(['karnataka'], { diet: 'veg' }) ?? []

function Screen({ label, preset = [] }) {
  const [picked, setPicked] = useState(preset)
  const [menus, setMenus] = useState([])
  const [counters, setCounters] = useState([])
  return (
    <section style={{ marginBottom: 24 }}>
      <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>
        {label} · covers {menus.length} card(s)
      </p>
      <MenuDishStep
        menus={MENUS}
        picked={picked}
        onChange={setPicked}
        onMenusChange={setMenus}
        linesOf={menuLines}
        counters={FOOD_COUNTERS}
        chosenCounters={counters}
        onToggleCounter={id => setCounters(c =>
          c.includes(id) ? c.filter(x => x !== id) : [...c, id])}
      />
    </section>
  )
}

export default function MenuDishScenes() {
  const all = menuDishGroups(MENUS, menuLines).flatMap(g => g.dishes.map(d => d.id))
  return (
    <div id="menus" style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <Screen label="Nothing ticked yet" />
      <Screen label="A kitchen that cooks everything" preset={all} />
    </div>
  )
}
