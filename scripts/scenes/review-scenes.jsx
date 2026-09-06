/**
 * The review screen, for a trade that is not catering.
 *
 * It used to walk `groups` alone — the detail-screen questions — so the
 * operations answers never appeared on it. A photographer answered
 * fifteen questions about how they work, reached the summary headed
 * "what you are listing", and none of it was there.
 */
import React from 'react'
import { ReviewStep } from '../../src/components/vendor/AddItemFlow'
import { operationScreensFor } from '../../src/data/partnerOperations'
import { specsForTrade } from '../../src/data/partnerSpecs'
import { specsForServices } from '../../src/data/partnerServiceSpecs'
import { offeringsForTrade } from '../../src/data/partnerCatalogue'

function Review({ trade }) {
  const offerings = offeringsForTrade(trade)
  const picked = offerings.map(o => o.serviceId)
  const groups = specsForServices(picked, specsForTrade(trade))
  const opsScreens = operationScreensFor(trade)

  /* Answered the way the screens write it: detail groups by id, ops
     groups by stateKey. Preset with bare ids here would render an empty
     summary and quietly pass for a correct one. */
  const detail = {}
  for (const g of groups) {
    detail[g.id] = g.type === 'multi'
      ? (g.choices ?? []).slice(0, 2).map(c => c.id)
      : g.choices?.[0]?.id
  }
  for (const s of opsScreens) {
    for (const g of s.groups ?? []) {
      detail[g.stateKey] = g.type === 'multi'
        ? (g.choices ?? []).slice(0, 2).map(c => c.id)
        : g.choices?.[0]?.id
    }
  }
  /* One typed number that matches no chip, because that is the answer
     most likely to render as nothing. */
  const hours = opsScreens.flatMap(s => s.groups ?? []).find(g => g.exact)
  if (hours) detail[hours.stateKey] = '9'

  return (
    <section style={{ marginBottom: 26 }}>
      <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>
        {trade} · review
      </p>
      <ReviewStep
        trade={trade} picked={offerings.map(o => o.name)} detail={detail}
        groups={groups} opsScreens={opsScreens}
        menus={[]} counters={[]} dishes={[]}
        price="12000" unit="per event"
      />
    </section>
  )
}

export default function ReviewScenes() {
  return (
    <div id="review" style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <Review trade="Photography" />
    </div>
  )
}
