/**
 * More → My Services, with the trades a partner actually has.
 *
 * The screen that replaced the Listings tab. Fed a stubbed vendorId and
 * a stubbed supabase read, because the point is the ROWS — one per
 * trade, with the trade's own status and a pause switch — not whether
 * PostgREST answers.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import MyServices from '../../src/components/vendor/MyServices'

const fail = m => console.error(`SVC: ${m}`)

/* Three trades in three different states — which is the whole reason
   this screen exists, and a screenshot of one live row proves none of
   it. Real trade names and real offering names from the catalogue. */
const ROWS = [
  {
    id: 'l1', trade: 'Photography', status: 'live', source: 'table',
    offerings: [
      { id: 'a', name: 'Photography', review_status: 'live', is_active: true },
      { id: 'b', name: 'Photo booth', review_status: 'live', is_active: true },
    ],
  },
  {
    id: 'l2', trade: 'Catering & Food', status: 'under_review', source: 'table',
    offerings: [
      { id: 'c', name: 'Catering', review_status: 'under_review' },
      { id: 'd', name: 'Welcome drinks', review_status: 'under_review' },
      { id: 'e', name: 'Sweets & mithai', review_status: 'under_review' },
    ],
  },
  {
    id: 'l3', trade: 'Decoration & Floral', status: 'draft', source: 'table',
    offerings: [{ id: 'f', name: 'Floral decoration', review_status: 'draft' }],
  },
]

export default function MyServicesScene() {
  React.useEffect(() => {
    let done = false
    const end = () => { if (!done) { done = true; console.error('SVC-DONE') } }
    let tries = 0
    const tick = setInterval(() => {
      if (++tries > 60) { fail('the list never rendered'); clearInterval(tick); end(); return }
      if (!document.querySelector('[data-my-service]')) return
      clearInterval(tick)
      try { assert(end) } catch (e) { fail(String(e?.message ?? e)); end() }
    }, 100)
    return () => clearInterval(tick)
  }, [])

  return (
    <MemoryRouter>
      <div className="bg-white p-4">
        <MyServices vendorId={null} initialRows={ROWS} onOpenTrade={() => {}} />
      </div>
    </MemoryRouter>
  )
}

function assert(end) {
  const rows = [...document.querySelectorAll('[data-my-service]')]
  if (rows.length !== 3) fail(`${rows.length} trades listed, expected 3`)

  const text = document.body.textContent ?? ''
  for (const t of ['Photography', 'Catering & Food', 'Decoration & Floral']) {
    if (!text.includes(t)) fail(`${t} is not on the screen`)
  }

  /* Each trade shows ITS OWN status, not one status for the partner. */
  for (const label of ['Live', 'Under review', 'Draft']) {
    if (!text.includes(label)) fail(`no trade reads "${label}"`)
  }

  /* The word that must never appear on a listing badge: it is a claim
     about the business, an operator sets it, and it lives elsewhere. */
  if (/\bVerified\b/.test(text)) fail('a listing badge reads "Verified"')

  /* One row per trade, not one per offering: Catering has three
     offerings and must still be one row. */
  if (rows.filter(r => r.dataset.myService === 'Catering & Food').length !== 1) {
    fail('Catering appears more than once')
  }
  if (!/3 offerings/.test(text)) fail('the offering count is not shown')

  if (!/Add a service/i.test(text)) fail('no way to add another trade')
  end()
}
