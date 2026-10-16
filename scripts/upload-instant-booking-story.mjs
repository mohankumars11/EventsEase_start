/**
 * Publish the three Instant Bookings guide cards.
 *
 * The files are ordered by the numeral printed on the card (1, 2, 3),
 * not by the order they were handed over — the second image supplied
 * carries the "1" badge. Position follows that numeral so the story
 * plays in the sequence the artwork claims.
 *
 * Re-runnable: it deletes the story's existing slides and their objects
 * first, so running it twice does not produce six cards.
 *
 *   node scripts/upload-instant-booking-story.mjs
 */
import { readFileSync } from 'fs'
import { basename } from 'path'

const env = Object.fromEntries(
  ['.env', '.env.local']
    .flatMap(f => { try { return readFileSync(f, 'utf8').split('\n') } catch { return [] } })
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)

const URL = env.VITE_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const BUCKET = 'partner-story-media'
const STORY = 'instant-booking'
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const UP = 'C:/Users/user/.claude/uploads/0d903199-7752-44a5-b4ff-bbd695ffcc40'
const CARDS = [
  { n: 1, file: `${UP}/f7afb963-image.png`, title: 'A new job just arrived!',
    description: 'When a customer books an event, you’ll get an instant notification in your Jobs tab.' },
  { n: 2, file: `${UP}/e4533fd4-image.png`, title: 'Open your Jobs tab',
    description: 'The new job appears with all the important event details. Tap to view the full details.' },
  { n: 3, file: `${UP}/9371a106-image.png`, title: 'Choose your response',
    description: 'After reviewing the details, choose the option that suits you — Accept, Negotiate or Pass.' },
]

const j = async r => { const t = await r.text(); try { return JSON.parse(t) } catch { return t } }

// ── Clear what is there, objects included ────────────────────────────
const existing = await j(await fetch(
  `${URL}/rest/v1/partner_story_slides?story_key=eq.${STORY}&select=id,media_url`, { headers: H }))

if (Array.isArray(existing) && existing.length) {
  const marker = `/${BUCKET}/`
  const keys = existing
    .map(r => String(r.media_url || ''))
    .filter(u => u.includes(marker))
    .map(u => u.slice(u.indexOf(marker) + marker.length))
  if (keys.length) {
    await fetch(`${URL}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE', headers: { ...H, 'content-type': 'application/json' },
      body: JSON.stringify({ prefixes: keys }),
    })
  }
  await fetch(`${URL}/rest/v1/partner_story_slides?story_key=eq.${STORY}`, { method: 'DELETE', headers: H })
  console.log(`cleared ${existing.length} existing slide(s)`)
}

// ── Upload and publish, in badge order ───────────────────────────────
for (const c of CARDS) {
  const bytes = readFileSync(c.file)
  const path = `${STORY}/card-${c.n}-${Date.now()}.png`

  const put = await fetch(`${URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST', headers: { ...H, 'content-type': 'image/png' }, body: bytes,
  })
  if (!put.ok) { console.error(`card ${c.n}: upload failed`, await j(put)); process.exit(1) }

  const media_url = `${URL}/storage/v1/object/public/${BUCKET}/${path}`
  const row = await fetch(`${URL}/rest/v1/partner_story_slides`, {
    method: 'POST', headers: { ...H, 'content-type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      story_key: STORY, title: c.title, description: c.description,
      media_url, media_type: 'image', position: c.n - 1, is_published: true,
    }),
  })
  if (!row.ok) { console.error(`card ${c.n}: insert failed`, await j(row)); process.exit(1) }

  console.log(`card ${c.n}  position ${c.n - 1}  ${basename(c.file)}  ${(bytes.length / 1024 | 0)} KB  published`)
}

const final = await j(await fetch(
  `${URL}/rest/v1/partner_story_slides?story_key=eq.${STORY}&select=position,title,is_published&order=position`,
  { headers: H }))
console.log('\nstory now reads:')
for (const r of final) console.log(`  #${r.position}  ${r.title}  ${r.is_published ? 'published' : 'draft'}`)
