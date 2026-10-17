/**
 * Proves the "seen" tick is visible on the rail.
 *
 * It used to sit inside the inner circle, which is `overflow-hidden
 * rounded-full`, so the curve clipped a badge pinned to its
 * bottom-right corner and a partner never saw it. It now sits on the
 * outer ring.
 *
 * The driver watches the first story to the end — tapping the next
 * zone rather than waiting out the real 14s per card — then closes, so
 * the shot is the rail with that story marked as watched.
 */
import React, { useEffect, useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import PartnerStories from '../../src/components/partner/PartnerStories'

const ROW = {
  story_key: 'instant-booking', media_type: 'image',
  media_url: 'https://twpsgrmoqxemxhrzbfwd.supabase.co/storage/v1/object/public/partner-story-media/instant-booking/card-1-1792152510057.png',
}
const LIVE_ROWS = [
  { ...ROW, id: 'a', title: 'One', description: '', position: 0 },
  { ...ROW, id: 'b', title: 'Two', description: '', position: 1 },
]

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  if (u.includes('/rest/v1/partner_story_slides')) {
    return new Response(JSON.stringify(LIVE_ROWS), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  return real(input, init)
}

const q = sel => document.querySelector(sel)
const sleep = ms => new Promise(r => setTimeout(r, ms))

function Driver() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let dead = false
    ;(async () => {
      // wait for the rail
      for (let i = 0; i < 80 && !q('button[aria-label^="Watch story"]'); i++) await sleep(100)
      if (dead) return
      document.querySelectorAll('button[aria-label^="Watch story"]')[0]?.click()
      await sleep(500)
      // tap through this story's cards, then one more to leave it
      for (let i = 0; i < 3; i++) { q('button[aria-label="Next card"]')?.click(); await sleep(350) }
      await sleep(300)
      q('button[aria-label="Close stories"]')?.click()
      await sleep(600)
      if (!dead) setReady(true)
    })()
    return () => { dead = true }
  }, [])
  return ready
    ? <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 8 }}>rendered</p>
    : null
}

export default function Scene() {
  return (
    <MemoryRouter>
      <div style={{ maxWidth: 430, margin: '0 auto', padding: 10, background: '#fff' }}>
        <PartnerStories />
      </div>
      <Driver />
    </MemoryRouter>
  )
}
