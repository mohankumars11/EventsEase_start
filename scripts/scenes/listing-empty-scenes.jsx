/**
 * The Listing tab, which is now the trades themselves.
 *
 * It was a full-bleed red card with one button, and the twenty-six
 * things this platform can list were behind it. Photographed in the two
 * states a partner arrives in: nothing listed, and something listed.
 */
import React, { useState } from 'react'
import TradeGrid from '../../src/components/vendor/TradeGrid'
import ListingPitch from '../../src/components/vendor/ListingPitch'

function Tab({ label, empty }) {
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState(null)
  return (
    <section style={{ marginBottom: 26 }}>
      <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>{label}</p>
      <div className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-display font-bold text-gray-900">What you offer</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {empty ? 'What you list is what you get offered.' : '2 live'}
            </p>
          </div>
        </header>
        <ListingPitch empty={empty} />
        <TradeGrid
          q={q} setQ={setQ} onPick={setPicked}
          placeholder="Search 26 trades — catering, generator, mehendi…"
          heading={!empty ? (
            <p className="mb-2 mt-1 text-[12px] font-extrabold uppercase tracking-[0.06em] text-ink-mute">
              Add something else
            </p>
          ) : null}
        />
      </div>
      <p style={{ font: '600 11px system-ui', color: '#777', marginTop: 6 }}>
        tapped → {picked ?? 'nothing yet'}
      </p>
    </section>
  )
}

export default function ListingTabScenes() {
  return (
    <div id="listing" style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <Tab label="Nothing listed yet" empty />
      <Tab label="Already has a listing" empty={false} />
    </div>
  )
}
