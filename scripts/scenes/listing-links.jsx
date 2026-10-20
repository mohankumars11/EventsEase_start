/**
 * The Links card on the shared profile stage, one trade per shot.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY BOTH A YES AND A NO TRADE
 * ══════════════════════════════════════════════════════════════════════
 *
 * A screenshot of Videography showing a YouTube field proves the field
 * renders. It does not prove the per-trade gate works — a component that
 * always shows every field would photograph identically. Catering is
 * here as the control: it must show exactly two rows, and no video or
 * audio link.
 *
 * `?trade=` picks which. The assertion lives in the driving script.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import { BasicsStage } from '../../src/components/vendor/listing/stages'
import { configFor } from '../../src/data/trades'

const want = new URLSearchParams(window.location.search).get('trade') || 'videography'
const config = configFor(want)

export default function Scene() {
  const [v, setV] = React.useState({
    display_name: 'Lens & Light Studio', bio: 'x'.repeat(45), legal_name: 'Lens and Light',
    instagram: 'https://instagram.com/lensandlight', catalog_url: '',
  })
  return (
    <MemoryRouter><AuthProvider><ToastProvider>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 12, background: '#fff' }}>
        <BasicsStage value={v} set={setV} vendorId={null} config={config} />
        <p data-ready data-trade={config.name} style={{ font: '700 11px system-ui', color: '#999' }}>rendered</p>
      </div>
    </ToastProvider></AuthProvider></MemoryRouter>
  )
}
