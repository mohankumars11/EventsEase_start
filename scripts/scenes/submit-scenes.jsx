/**
 * The last screen: what it adds up to, and what happens next.
 */
import React from 'react'
import { ReviewStep } from '../../src/components/vendor/AddItemFlow'
import { SPECS_BY_TRADE } from '../../src/data/partnerSpecs'
import { operationScreensFor } from '../../src/data/partnerOperations'

const TRADE = 'Photography'
const groups = SPECS_BY_TRADE[TRADE] ?? []
const opsScreens = operationScreensFor(TRADE)

const detail = {
  style: ['candid', 'pre_wedding'],
  kit: ['own_light', 'drone'],
  delivery: ['soft', 'album'],
  timeline: '30',
  cameras: ['mirrorless', 'backup'],
}
for (const s of opsScreens) {
  const g = s.groups?.[0]
  if (!g) continue
  const k = g.stateKey ?? g.id
  detail[k] = g.type === 'multi' ? [g.choices[0].id] : g.choices[0].id
}

const work = [
  { kind: 'photo', path: 'p1', caption: 'Malleshwaram wedding, Jan' },
  { kind: 'photo', path: 'p2', caption: '' },
  { kind: 'video', path: 'v1', caption: 'Showreel' },
  { kind: 'testimonial', key: 't1', said_by: 'Lakshmi R', said_about: 'Reception',
    body: 'He caught my grandmother laughing and nobody else did.' },
]

export default function SubmitScenes() {
  return (
    <div id="submit" style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <ReviewStep
        trade={TRADE}
        picked={['Candid photography', 'Pre-wedding shoot']}
        detail={detail}
        groups={groups}
        opsScreens={opsScreens}
        menus={[]}
        counters={[]}
        dishes={[]}
        price="45000"
        unit="per day"
        work={work}
        cardDishes={[]}
      />
    </div>
  )
}
