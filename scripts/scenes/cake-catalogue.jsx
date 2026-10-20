/**
 * The Cake & Desserts product editor.
 *
 * Part I turned flavour, size and allergens from free text into
 * selections, and made the product name optional. A screenshot shows
 * chips; only reading the DOM shows there is no text input left where
 * one used to be, which is the whole claim.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import CatalogueEditor from '../../src/components/vendor/listing/CatalogueEditor'
import { configFor } from '../../src/data/trades'

const config = configFor(new URLSearchParams(window.location.search).get('trade') || 'cake_desserts')

export default function Scene() {
  const [items, setItems] = React.useState([])
  return (
    <MemoryRouter><AuthProvider><ToastProvider>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 12, background: '#fff' }}>
        <CatalogueEditor cat={config.catalogue} items={items} set={setItems} trade={config.name} tried={false} />
        <p data-ready data-trade={config.name} style={{ font: '700 11px system-ui', color: '#999' }}>rendered</p>
      </div>
    </ToastProvider></AuthProvider></MemoryRouter>
  )
}
