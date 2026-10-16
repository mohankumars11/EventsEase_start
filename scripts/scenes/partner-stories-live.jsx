/**
 * #755's own story rail, fed by the admin uploads.
 *
 * The shoot harness points VITE_SUPABASE_URL at a dead port, so the
 * PostgREST reply is replayed from rows read AS ANON at shoot time.
 * The images still load from the real public bucket.
 */
import React, { useEffect, useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import PartnerStories from '../../src/components/partner/PartnerStories'

const LIVE_ROWS = [
  {
    "id": "7d436530-7545-4b52-91b1-0e6e4eaa3b1b",
    "story_key": "instant-booking",
    "title": "A new job just arrived!",
    "media_url": "https://twpsgrmoqxemxhrzbfwd.supabase.co/storage/v1/object/public/partner-story-media/instant-booking/card-1-1792152510057.png",
    "media_type": "image",
    "position": 0
  },
  {
    "id": "f3112e00-8726-4929-932a-ee2c32dca5b7",
    "story_key": "instant-booking",
    "title": "Open your Jobs tab",
    "media_url": "https://twpsgrmoqxemxhrzbfwd.supabase.co/storage/v1/object/public/partner-story-media/instant-booking/card-2-1792152513030.png",
    "media_type": "image",
    "position": 1
  },
  {
    "id": "1398ca88-0e80-4ba4-9c37-a52bfee9bc07",
    "story_key": "instant-booking",
    "title": "Choose your response",
    "media_url": "https://twpsgrmoqxemxhrzbfwd.supabase.co/storage/v1/object/public/partner-story-media/instant-booking/card-3-1792152515256.png",
    "media_type": "image",
    "position": 2
  }
]
const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  if (u.includes('/rest/v1/partner_story_slides')) {
    return new Response(JSON.stringify(LIVE_ROWS), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  return real(input, init)
}

function AutoOpen() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setInterval(() => {
      const ring = Array.from(document.querySelectorAll('button'))
        .find(b => /Instant bookings/i.test(b.getAttribute('aria-label') || ''))
      if (!ring) return
      clearInterval(t)
      ring.click()
      setTimeout(() => setReady(true), 1200)
    }, 150)
    return () => clearInterval(t)
  }, [])
  return ready ? <p data-ready style={{font:'700 11px system-ui',color:'#999',padding:8}}>rendered</p> : null
}

export default function Scene() {
  return (
    <MemoryRouter>
      <div style={{ maxWidth: 430, margin: '0 auto', padding: 10, background: '#fff', minHeight: 760 }}>
        <PartnerStories />
      </div>
      <AutoOpen />
    </MemoryRouter>
  )
}
