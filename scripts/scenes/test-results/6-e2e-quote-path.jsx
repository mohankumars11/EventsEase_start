import React from 'react'
const LINES = ["  ✓ temporary partner login linked to the verified test vendor","── End-to-End Event Logistics","  ✓ partner creates the service","  ✓ Custom-Quote-only listing is accepted","  ✓ customer request becomes a QUOTE (custom_scope, partner_payout_not_active)","  ✓ partner prices it from the End-to-End Event Logistics template (₹37000 take-home)","  ✓ customer price = take-home at the trade fee (8%)","  ✓ customer accepts → booked under the partner lock","  ✓ Razorpay order order_Tm4BMQIzxRe5YU for the 30% advance ₹12,065.2 of ₹40,217.39","  ✓ line recorded under the trade name (End-to-End Event Logistics)","── Transportation","  ✓ partner creates the service","  ✓ Custom-Quote-only listing is accepted","  ✓ customer request becomes a QUOTE (route_needs_quote, partner_payout_not_active, licence_pending_rc, licence_pending_insurance)","  ✓ partner prices it from the Transportation template (₹37000 take-home)","  ✓ customer price = take-home at the trade fee (8%)","  ✓ customer accepts → booked under the partner lock","  ✓ Razorpay order order_Tm4BVehZSlObxm for the 30% advance ₹12,065.2 of ₹40,217.39","  ✓ line recorded under the trade name (Transportation)","cleanup: 2 services, 2 quotes, 2 lines; vendor unlinked: yes; temp login deleted: yes","e2e-quote-path: 17/17 passed"]
const tone = l => l.includes('✗') ? '#e11d48' : l.includes('✓') ? '#15803d' : /^(──|══)/.test(l.trim()) ? '#5b21b6' : '#334155'
export default function Result() {
  return (
    <div style={{ width: 980, margin: '0 auto', background: '#ffffff', padding: 28, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #ede9fe', paddingBottom: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 22, fontWeight: 800, color: '#2e1065' }}>Live custom-quote path — price, accept, advance</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>node scripts/e2e-quote-path.mjs · 2026-10-10 · branch feature/partner-34-trade-onboarding-ready-20261010</div>
        </div>
        <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 20, fontWeight: 800, color: '#fff', background: '#15803d', borderRadius: 999, padding: '6px 16px' }}>17/17 passed</div>
      </div>
      {LINES.map((l, i) => <div key={i} style={{ fontSize: 13, lineHeight: '19px', whiteSpace: 'pre-wrap', color: tone(l), fontWeight: /passed|══|──/.test(l) ? 700 : 400 }}>{l}</div>)}
    </div>
  )
}
