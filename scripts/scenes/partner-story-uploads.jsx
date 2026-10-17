/**
 * The partner story upload screen, inside the real AdminShell.
 *
 * PostgREST is stubbed at the scene level so the component under test
 * is the real PartnerStoryUploads, unmodified. Two slides, both on
 * `instant-bookings`, one published and one draft — enough to show the
 * card, the badge and the publish/delete controls without inventing a
 * library of content that does not exist.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import AdminShell from '../../src/components/admin/AdminShell'
import PartnerStoryUploads from '../../src/components/admin/PartnerStoryUploads'

const SLIDES = [
  {
    id: 's1', story_key: 'instant-booking', position: 0,
    title: 'A new job just arrived!', description: 'The booking lands in your Jobs tab the moment a customer pays.',
    media_url: 'demo-1.jpg', media_type: 'image',
    is_published: true, deleted_at: null, created_at: new Date().toISOString(),
  },
  {
    id: 's2', story_key: 'instant-booking', position: 1,
    title: 'Open your Jobs tab', description: 'Date, venue and package value, all on one screen.',
    media_url: 'demo-2.mp4', media_type: 'video',
    is_published: false, deleted_at: null, created_at: new Date().toISOString(),
  },
  {
    id: 's3', story_key: 'instant-booking', position: 2,
    title: 'An older card', description: 'Archived last week.',
    media_url: 'demo-3.jpg', media_type: 'image',
    is_published: false, deleted_at: new Date().toISOString(), created_at: new Date().toISOString(),
  },
]

const STORY_ROWS = [
  { key: 'instant-booking', label: 'Instant bookings', blurb: 'From discovery to booking', position: 0, deleted_at: null },
  { key: 'live-tracking', label: 'Jobs received', blurb: 'Every detail in one place', position: 1, deleted_at: null },
  { key: 'start-trip', label: 'Start your trip', blurb: 'Keep the customer in the loop', position: 2, deleted_at: null },
  { key: 'event-complete', label: 'Event done · Payment', blurb: 'Wrap up with confidence', position: 3, deleted_at: null },
  { key: 'old-promo', label: 'Festival promo', blurb: null, position: 4, deleted_at: new Date().toISOString() },
]

const real = window.fetch.bind(window)
/* Dispatch on the table name rather than a list of regexes: an earlier
   pattern silently shadowed `partner_stories` and the panel rendered
   with an empty list. */
const TABLES = { partner_stories: STORY_ROWS, partner_story_slides: SLIDES }
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  const m = /\/rest\/v1\/([a-z_]+)/.exec(u)
  if (m) {
    const rows = TABLES[m[1]] ?? []
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'content-type': 'application/json', 'content-range': `0-${rows.length}/${rows.length}` },
    })
  }
  return real(input, init)
}


function Driver() {
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    let dead = false
    const t = setInterval(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => /Manage stories/.test(b.textContent || ''))
      if (!btn) return
      clearInterval(t)
      btn.click()
      setTimeout(() => { if (!dead) setReady(true) }, 500)
    }, 120)
    return () => { dead = true; clearInterval(t) }
  }, [])
  return ready
    ? <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 8 }}>rendered</p>
    : null
}

export default function PartnerStoryUploadsScene() {
  return (
    <MemoryRouter><ToastProvider>
      <AdminShell
        activeNav="story-uploads"
        onNavigate={() => {}}
        badges={{ vendors: 2, pricing: 3 }}
        profile={{ full_name: 'Mohan', role: 'admin' }}
        onRefresh={() => {}}
        refreshing={false}
      >
        <PartnerStoryUploads />
      </AdminShell>
      <Driver />
    </ToastProvider></MemoryRouter>
  )
}
