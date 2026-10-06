/**
 * The trades that were added or rebuilt, and the fare block that made
 * Transportation listable at all.
 *
 *   node scripts/shoot-components.mjs shot.png --scenes scripts/scenes/new-trade-scenes.jsx
 */
import React, { useState } from 'react'
import { DetailStep } from '../../src/components/vendor/AddItemFlow'
import { SPECS_BY_TRADE } from '../../src/data/partnerSpecs'
import DistanceRates from '../../src/components/vendor/DistanceRates'

function Label({ children }) {
  return (
    <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
      textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>{children}</p>
  )
}

function Detail({ trade, preset = {} }) {
  const [v, setV] = useState(preset)
  return (
    <section style={{ marginBottom: 24 }}>
      <Label>{trade}</Label>
      <DetailStep groups={SPECS_BY_TRADE[trade] ?? []} value={v} onChange={setV} />
    </section>
  )
}

function Fare() {
  const [r, setR] = useState({ base_fare: '150', free_km: '3', per_km: '18', waiting_per_min: '2' })
  return (
    <section style={{ marginBottom: 24 }}>
      <Label>Transportation · the fare</Label>
      <DistanceRates rates={r} onChange={setR} />
    </section>
  )
}

export default function NewTradeScenes() {
  return (
    <div id="trades" style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <Detail trade="Transportation" preset={{
        fleet: ['tata_ace', 'truck_14', 'bike'], moves: ['equipment', 'flowers'],
        charge_metric: 'per_km', helpers: 'crew_2',
      }} />
      <Fare />
      <Detail trade="Wedding Planning" preset={{
        execution_scope: 'turnkey', permits: ['liquor_cl5', 'music'],
      }} />
      <Detail trade="Trousseau & Gift Packing" preset={{
        packing: ['potli', 'saree_fold'], turnaround: '7_10',
      }} />
      <Detail trade="Bridal Makeup & Hair" preset={{
        business_scale: 'studio', capacity: '12', products: 'organic',
      }} />
    </div>
  )
}
