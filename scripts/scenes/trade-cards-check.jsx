/**
 * The last eight trade cards at the size the partner sees them.
 *
 * Renders the real SambramoTradePictogram at `md` — the size TradeGrid
 * uses — in the same two-column grid, so the four replaced cells can be
 * judged beside four that were already right. A sprite edit that looks
 * fine at 192px can still be unreadable at 82px, which is the only size
 * that matters.
 */
import React from 'react'
import SambramoTradePictogram from '../../src/components/vendor/SambramoTradePictogram'

const TAIL = [
  'Tent & Furniture', 'Transportation', 'Trousseau & Gift Packing', 'Valet Parking',
  'Venue', 'Videography', 'Warehouse / Storage', 'Wedding Planning',
]

export default function Scene() {
  return (
    <div style={{ maxWidth: 390, margin: '0 auto', padding: 16, background: '#fff' }}>
      <p style={{ font: '700 11px system-ui', color: '#6b7280', margin: '0 0 10px' }}>
        AT CARD SIZE — md, two columns
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {TAIL.map(t => (
          <div key={t}>
            <SambramoTradePictogram trade={t} size="md" showSparkle={false} title={false} />
            <p style={{ font: '700 13px system-ui', color: '#2a085c', margin: '6px 0 0' }}>{t}</p>
          </div>
        ))}
      </div>

      <p style={{ font: '700 11px system-ui', color: '#6b7280', margin: '18px 0 8px' }}>
        AT sm (64×52) AND xs (40×40)
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {TAIL.slice(4).map(t => (
          <SambramoTradePictogram key={`s${t}`} trade={t} size="sm" showSparkle={false} title={false} />
        ))}
        {TAIL.slice(4).map(t => (
          <SambramoTradePictogram key={`x${t}`} trade={t} size="xs" showSparkle={false} title={false} />
        ))}
      </div>
      <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 8 }}>rendered</p>
    </div>
  )
}
