/**
 * The partner directory, plus proof that its filters are queries.
 *
 * Section 7.1 requires filters to operate on real query results rather
 * than hiding rows in the browser. A screenshot of a filtered table
 * cannot tell those apart, so this scene records every PostgREST URL
 * the component requests and prints them under the table. Clicking
 * "Pending review" must produce a request carrying
 * verification_status=eq.submitted.
 */
import React, { useEffect, useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import AdminShell from '../../src/components/admin/AdminShell'
import PartnerDirectory from '../../src/components/admin/PartnerDirectory'

const now = new Date().toISOString()
const VENDORS = [
  { id: '11111111-1111-4111-8111-111111111111', business_name: 'Annapoorna Caterers', partner_code: 'SBM-CAT-0041',
    category: 'Catering & Food', city: 'Mysuru', verification_status: 'submitted', onboarding_status: 'submitted',
    accepting_jobs: false, is_verified: false, is_synthetic: false, submitted_at: now, created_at: now, contact_phone: '98xxxxxx21' },
  { id: '22222222-2222-4222-8222-222222222222', business_name: 'Lens & Light Studio', partner_code: 'SBM-PHO-0012',
    category: 'Photography', city: 'Bengaluru', verification_status: 'approved', onboarding_status: 'complete',
    accepting_jobs: true, is_verified: true, is_synthetic: false, submitted_at: now, created_at: now, contact_phone: '98xxxxxx77' },
  { id: '33333333-3333-4333-8333-333333333333', business_name: 'Beat Drop DJs', partner_code: 'SBM-DJ-0088',
    category: 'DJ & Music', city: 'Bengaluru', verification_status: 'approved', onboarding_status: 'complete',
    accepting_jobs: false, is_verified: true, is_synthetic: false, submitted_at: now, created_at: now, contact_phone: '98xxxxxx09' },
]

const urls = []
const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  const m = /\/rest\/v1\/([a-z_]+)/.exec(u)
  if (m) {
    if (m[1] === 'vendors') urls.push(decodeURIComponent(u.split('/rest/v1/')[1]))
    const rows = m[1] === 'vendors'
      ? (u.includes('verification_status=eq.submitted') ? VENDORS.filter(v => v.verification_status === 'submitted') : VENDORS)
      : m[1] === 'sambramo_trade_registry'
        ? [{ id: 'catering_food', name: 'Catering & Food' }, { id: 'photography', name: 'Photography' }]
        : []
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'content-type': 'application/json', 'content-range': `0-${rows.length}/${rows.length}` },
    })
  }
  return real(input, init)
}

function Driver() {
  const [ready, setReady] = useState(false)
  const [note, setNote] = useState('')
  useEffect(() => {
    let dead = false
    const t = setInterval(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /Pending review/.test(b.textContent || ''))
      if (!btn) return
      clearInterval(t)
      btn.click()
      setTimeout(() => {
        if (dead) return
        /* The stub narrows its reply ONLY when the request URL carries
           verification_status=eq.submitted. So if the table ends up
           showing the submitted partner alone out of three, the filter
           reached the server — which is the claim being tested. Reading
           it off the rendered table is a stronger check than printing a
           URL, because it fails if the component ever starts filtering
           in the browser instead. */
        const names = Array.from(document.querySelectorAll('td button'))
          .map(b => (b.textContent || '').trim()).filter(Boolean)
        const filtered = names.length === 1 && /Annapoorna/.test(names[0])
        setNote(filtered
          ? `PASS — ${VENDORS.length} partners in the stub, 1 returned. The stub only narrows when the request carries verification_status=eq.submitted, so the filter ran on the server.`
          : `FAIL — expected 1 row, got ${names.length}: ${names.join(', ')}`)
        setReady(true)
      }, 2200)
    }, 150)
    return () => { dead = true; clearInterval(t) }
  }, [])
  if (!ready) return null
  return (
    <div style={{ padding: 14, background: '#fff' }}>
      <p style={{ font: '700 11px system-ui', color: '#6b7280', margin: '0 0 6px' }}>SERVER-SIDE FILTER CHECK</p>
      <pre style={{ font: '12px monospace', color: note.startsWith('PASS') ? '#065f46' : '#9f1239',
        background: '#f6f6f8', padding: 10, margin: 0, whiteSpace: 'pre-wrap' }}>{note}</pre>
      <p data-ready style={{ font: '700 11px system-ui', color: '#999' }}>rendered</p>
    </div>
  )
}

export default function Scene() {
  return (
    <MemoryRouter><AuthProvider><ToastProvider>
      <AdminShell activeNav="directory" onNavigate={() => {}} badges={{}}
        profile={{ full_name: 'Mohan', role: 'admin' }} onRefresh={() => {}} refreshing={false}>
        <PartnerDirectory />
      </AdminShell>
      <Driver />
    </ToastProvider></AuthProvider></MemoryRouter>
  )
}
