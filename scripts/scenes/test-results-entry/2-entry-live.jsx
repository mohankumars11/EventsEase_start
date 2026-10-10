import React from 'react'
const LINES = ["── A new partner signs up","  ✓ no vendor row → lands on /partner/setup (the service selector)","  ✓ the selector creates the partner row through RLS","  ✓ vendor row but no services → still the selector (/partner/setup)","── Picks Catering & Food and Bar & Beverages (Continue tapped twice)","  ✓ one container per trade, never two (Bar & Beverages, Catering & Food)","  ✓ Bar & Beverages left as a draft, synced, resumes at its saved step","  ✓ nobody else can read that draft","── Submits Catering & Food","  ✓ the server accepts the submission","  ✓ the Jobs confirmation can read its real status: UNDER_REVIEW","── A failed submission changes nothing","  ✓ refused with a reason (\"Answer \"display name\" before submitting.…\")","  ✓ no version written for it, account status untouched","── After the successful submit: account review, then Jobs","  ✓ account queued for an operator (submitted, due 2026-10-11T11:17)","  ✓ calling it again keeps the same clock (idempotent)","  ✓ a partner cannot approve themselves","  ✓ with a submitted listing, login lands on Jobs (/dashboard/vendor)","── Each trade keeps its own state","  ✓ Catering & Food submitted, Bar & Beverages still a draft (Catering & Food=under_review)","── Payout: saved once, shared, and not \"active\" until Razorpay says so","  ✓ bank details saved once for the account","  ✓ the app calls that \"details_saved\", not active","  ✓ one payout record per partner, whatever the number of trades","  ✓ no one else can read the bank details","  ✓ identity: nothing uploaded → not started; a trade licence never counts","── The server's instant-booking gate (verified seeded vendor)","  ✓ no payout account → QUOTE (partner_payout_not_active)","  ✓ Razorpay account CREATED (not activated) → QUOTE (partner_payout_not_active)","  ✓ Razorpay says ACTIVATED → INSTANT","cleanup: temp partner + vendor removed, 2 services, seeded vendor unlinked: yes, payout gate restored: yes","e2e-partner-entry-live: 23/23 passed"]
const tone = l => l.includes('✗') ? '#e11d48' : l.includes('✓') ? '#15803d' : /^(──|══|d ·)/.test(l.trim()) ? '#5b21b6' : '#334155'
export default function Result() {
  return (
    <div style={{ width: 980, margin: '0 auto', background: '#ffffff', padding: 28, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, borderBottom: '2px solid #ede9fe', paddingBottom: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 22, fontWeight: 800, color: '#2e1065' }}>Partner entry against the live database (RLS, migration 15 gate)</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>node --env-file=.env scripts/e2e-partner-entry-live.mjs · 2026-10-10 · branch feature/partner-34-trade-onboarding-ready-20261010</div>
        </div>
        <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 20, fontWeight: 800, color: '#fff', background: '#15803d', borderRadius: 999, padding: '6px 16px', whiteSpace: 'nowrap' }}>23/23 passed</div>
      </div>
      {LINES.map((l, i) => <div key={i} style={{ fontSize: 13, lineHeight: '19px', whiteSpace: 'pre-wrap', color: tone(l), fontWeight: /passed|══|──|^d ·/.test(l) ? 700 : 400 }}>{l}</div>)}
    </div>
  )
}
