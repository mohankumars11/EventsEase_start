/**
 * The materials lifecycle, at the three states a partner actually meets.
 * window.fetch is stubbed here rather than adding a preview prop to the
 * component: the component under test is the real one, unmodified.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import MaterialsCard from '../../src/components/partner/materials/MaterialsCard'

const ITEMS = [
  { id: '1', name: 'Marigold (loose)', unit: 'kg', qty_suggested: 42, qty_partner: null, reusable: false, source: 'bom' },
  { id: '2', name: 'Rose garland', unit: 'piece', qty_suggested: 18, qty_partner: 12, reusable: false, source: 'bom' },
  { id: '3', name: 'Floral foam block', unit: 'piece', qty_suggested: 24, qty_partner: null, reusable: false, source: 'bom' },
  { id: '4', name: 'Backdrop frame', unit: 'set', qty_suggested: 1, qty_partner: null, reusable: true, source: 'bom' },
]

const STATES = {
  'ready to review': {
    requirement_id: 'r1', decision: 'MATERIALS_INCREMENTAL', status: 'partner_review',
    reasons: ['materials_not_included_in_listing', 'needs_customer_approval'],
    method: 'partner_supplier', method_blockers: [], partner_reviewed_at: null,
    items: ITEMS, quote: null, funded_paise: 0, remaining_paise: 0,
  },
  'sent — waiting on the customer': {
    requirement_id: 'r2', decision: 'MATERIALS_INCREMENTAL', status: 'quoted',
    reasons: [], method: 'partner_supplier', method_blockers: [],
    partner_reviewed_at: new Date().toISOString(), items: ITEMS,
    quote: { id: 'q2', status: 'sent', version: 1, total_paise: 1842000,
      expires_at: new Date(Date.now() + 36e5 * 40).toISOString() },
    funded_paise: 0, remaining_paise: 0,
  },
  'customer paid': {
    requirement_id: 'r3', decision: 'MATERIALS_INCREMENTAL', status: 'funded',
    reasons: [], method: 'partner_supplier', method_blockers: [],
    partner_reviewed_at: new Date().toISOString(), items: ITEMS,
    quote: { id: 'q3', status: 'funded', version: 1, total_paise: 1842000 },
    funded_paise: 1842000, remaining_paise: 1842000,
  },
  'a person is checking it': {
    requirement_id: 'r4', decision: 'MANUAL_REVIEW', status: 'open',
    reasons: ['materials_not_included_in_listing', 'no_payment_path_for_materials'],
    method: null, method_blockers: ['supplier_payment_rail_unavailable', 'partner_has_no_payout_account'],
    partner_reviewed_at: null, items: ITEMS, quote: null, funded_paise: 0, remaining_paise: 0,
  },
}

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  if (u.includes('/rpc/my_line_materials')) {
    const key = JSON.parse(init?.body ?? '{}').p_line_id
    return new Response(JSON.stringify(STATES[key] ?? null),
      { status: 200, headers: { 'content-type': 'application/json' } })
  }
  return real(input, init)
}

export default function ProcurementLifecycle() {
  return (
    <MemoryRouter><ToastProvider>
      <div style={{ width: 390, margin: '0 auto', padding: 12, background: '#fbfaff' }}>
        {Object.keys(STATES).map(k => (
          <div key={k} style={{ marginBottom: 18 }}>
            <p style={{ font: '800 11px system-ui', letterSpacing: '.1em', textTransform: 'uppercase',
              color: '#8b8299', margin: '0 4px 6px' }}>{k}</p>
            <MaterialsCard lineId={k} />
          </div>
        ))}
        <p data-ready style={{ font: '700 11px system-ui', color: '#999' }}>rendered</p>
      </div>
    </ToastProvider></MemoryRouter>
  )
}
