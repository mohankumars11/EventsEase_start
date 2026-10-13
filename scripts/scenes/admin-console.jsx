/**
 * The two new money screens, with PostgREST stubbed at the scene level.
 * The components under test are the real ones, unmodified.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import MaterialsAdvances from '../../src/components/admin/MaterialsAdvances'

const V = n => ({ business_name: n, city: 'Mysuru' })
const ROWS = [
  { id: '1', status: 'requested', trade_id: 'decoration_floral', created_at: new Date(Date.now() - 36e5 * 3).toISOString(),
    requested_paise: 1800000, request_reason: 'Flower mandi advance, order closes Tuesday',
    vendors: V('Jai Decor & Florals'), booking_lines: { service_name: 'Themed setup' }, goods_photos: [] },
  { id: '2', status: 'under_review', trade_id: 'catering_food', created_at: new Date(Date.now() - 36e5 * 9).toISOString(),
    advance_paise: 4000000, bill_amount_paise: 3864000, supplier_name: 'MGR Provisions',
    vendors: V('Annapoorna Caterers'), booking_lines: { service_name: 'Lunch, 300 guests' },
    goods_photos: [{ path: 'a' }, { path: 'b' }], goods_location: 'with_partner', bill_path: 'x' },
  { id: '3', status: 'advance_approved', trade_id: 'cake_desserts', created_at: new Date(Date.now() - 36e5 * 26).toISOString(),
    advance_paise: 600000, vendors: V('Sugar & Spice'), booking_lines: { service_name: '3-tier cake' }, goods_photos: [] },
  { id: '4', status: 'paid', trade_id: 'decoration_floral', created_at: new Date(Date.now() - 36e5 * 70).toISOString(),
    advance_paise: 1800000, approved_paise: 1742000, bill_amount_paise: 1742000, supplier_name: 'Sri Lakshmi Flower Mart',
    vendors: V('Jai Decor & Florals'), booking_lines: { service_name: 'Mandap florals' },
    goods_photos: [{ path: 'c' }], goods_location: 'at_venue', bill_path: 'y' },
]

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  if (u.includes('/rest/v1/materials_advances')) {
    return new Response(JSON.stringify(ROWS), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  if (u.includes('/rest/v1/')) {
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
  }
  return real(input, init)
}

export default function AdminConsoleScene() {
  return (
    <MemoryRouter>
      <div style={{ width: 1180, margin: '0 auto', padding: 20, background: '#FCFAFF' }}>
        <MaterialsAdvances />
        <p data-ready style={{ font: '700 11px system-ui', color: '#999', paddingTop: 10 }}>rendered</p>
      </div>
    </MemoryRouter>
  )
}
