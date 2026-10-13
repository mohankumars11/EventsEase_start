/**
 * The materials advance at every state a partner meets.
 * window.fetch is stubbed here rather than adding a preview prop: the
 * component under test is the real one, unmodified.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import MaterialsCard from '../../src/components/partner/materials/MaterialsCard'

const PHOTOS = [{ path: 'p1', at: '' }, { path: 'p2', at: '' }]

const STATES = {
  'eligible — nothing started': { eligible: true, line_status: 'paid', advance: null },
  'asked us to fund the order': { eligible: true, line_status: 'paid', advance: {
    id: 'a', status: 'requested', requested_paise: 1800000,
    request_reason: 'Flower mandi advance, order closes Tuesday' } },
  'money is with the partner': { eligible: true, line_status: 'paid', advance: {
    id: 'b', status: 'advance_approved', advance_paise: 1800000 } },
  'bill sent, under review': { eligible: true, line_status: 'paid', advance: {
    id: 'c', status: 'under_review', advance_paise: 1800000,
    bill_path: 'x', bill_amount_paise: 1742000, supplier_name: 'Sri Lakshmi Flower Mart',
    goods_photos: PHOTOS, goods_location: 'with_partner' } },
  'settled — unspent money recovered': { eligible: true, line_status: 'paid', advance: {
    id: 'd', status: 'paid', advance_paise: 1800000, approved_paise: 1742000,
    bill_path: 'x', bill_amount_paise: 1742000, supplier_name: 'Sri Lakshmi Flower Mart',
    goods_photos: PHOTOS, goods_location: 'at_venue' } },
  'sent back': { eligible: true, line_status: 'paid', advance: {
    id: 'e', status: 'rejected',
    review_note: 'The bill is for 12 Nov — this event is on 20 Dec. Send the right one.' } },
  'not an eligible trade (renders nothing)': { eligible: false, line_status: 'paid', advance: null },
}

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  if (u.includes('/rpc/my_line_advance')) {
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
          <div key={k} style={{ marginBottom: 16 }}>
            <p style={{ font: '800 11px system-ui', letterSpacing: '.09em', textTransform: 'uppercase',
              color: '#8b8299', margin: '0 4px 6px' }}>{k}</p>
            <MaterialsCard lineId={k} vendorId="v" />
          </div>
        ))}
        <p data-ready style={{ font: '700 11px system-ui', color: '#999' }}>rendered</p>
      </div>
    </ToastProvider></MemoryRouter>
  )
}
