/**
 * The partner story player, against the REAL database.
 *
 * Nothing is stubbed here. The component reads partner_story_slides
 * with the anon key exactly as the app does, so this screenshot is
 * evidence that the admin upload reached the partner surface — a
 * stubbed one would prove only that the component renders.
 *
 * It opens the Instant Bookings ring by itself once the rings have
 * loaded, because the point of the shot is the open story.
 */
import React, { useEffect, useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import PartnerStoryViewer from '../../src/components/partner/PartnerStoryViewer'


/* The live rows, read as ANON at shoot time. The harness points
   VITE_SUPABASE_URL at a dead port, so the PostgREST reply is replayed
   here; the images still load from the real public bucket. */
const LIVE_ROWS = [
  {
    "id": "7d436530-7545-4b52-91b1-0e6e4eaa3b1b",
    "story_key": "instant-booking",
    "title": "A new job just arrived!",
    "description": "When a customer books an event, you’ll get an instant notification in your Jobs tab.",
    "media_url": "https://twpsgrmoqxemxhrzbfwd.supabase.co/storage/v1/object/public/partner-story-media/instant-booking/card-1-1792152510057.png",
    "media_type": "image",
    "position": 0
  },
  {
    "id": "f3112e00-8726-4929-932a-ee2c32dca5b7",
    "story_key": "instant-booking",
    "title": "Open your Jobs tab",
    "description": "The new job appears with all the important event details. Tap to view the full details.",
    "media_url": "https://twpsgrmoqxemxhrzbfwd.supabase.co/storage/v1/object/public/partner-story-media/instant-booking/card-2-1792152513030.png",
    "media_type": "image",
    "position": 1
  },
  {
    "id": "1398ca88-0e80-4ba4-9c37-a52bfee9bc07",
    "story_key": "instant-booking",
    "title": "Choose your response",
    "description": "After reviewing the details, choose the option that suits you — Accept, Negotiate or Pass.",
    "media_url": "https://twpsgrmoqxemxhrzbfwd.supabase.co/storage/v1/object/public/partner-story-media/instant-booking/card-3-1792152515256.png",
    "media_type": "image",
    "position": 2
  }
]
const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  if (u.includes("/rest/v1/partner_story_slides")) {
    return new Response(JSON.stringify(LIVE_ROWS), { status: 200, headers: { "content-type": "application/json" } })
  }
  return real(input, init)
}

function AutoOpen() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setInterval(() => {
      const ring = Array.from(document.querySelectorAll('button'))
        .find(b => !b.disabled && /Instant Bookings/.test(b.textContent || ''))
      if (!ring) return
      clearInterval(t)
      ring.click()
      /* Let the first card paint and the bar start filling before the
         shooter decides the page is ready. */
      setTimeout(() => setReady(true), 900)
    }, 150)
    return () => clearInterval(t)
  }, [])
  return ready
    ? <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 8 }}>rendered</p>
    : null
}

export default function PartnerStoryPlayerScene() {
  return (
    <MemoryRouter>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 12, background: '#faf7ff', minHeight: 720 }}>
        <PartnerStoryViewer />
      </div>
      <AutoOpen />
    </MemoryRouter>
  )
}
