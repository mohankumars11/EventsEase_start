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

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  if (/\/rest\/v1\/partner_story_slides/.test(u)) {
    return new Response(JSON.stringify(SLIDES), {
      status: 200,
      headers: { 'content-type': 'application/json', 'content-range': `0-${SLIDES.length}/${SLIDES.length}` },
    })
  }
  if (/\/rest\/v1\//.test(u)) {
    return new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json', 'content-range': '0-0/0' },
    })
  }
  return real(input, init)
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
      <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 8 }}>rendered</p>
    </ToastProvider></MemoryRouter>
  )
}
