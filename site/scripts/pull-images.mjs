/**
 * Fetch and self-host the site's photography.
 *
 * WHY STOCK, AND WHY IT IS LABELLED
 *
 * Sambramo is pre-launch and has run no events, so there are no photographs
 * of its own work to show. The choice is between an empty site, stock
 * presented as ours, or stock presented as stock. The product already
 * settled this once: migration 048 makes every shop tile say
 * "Representative image" until somebody uploads a photograph of the actual
 * piece. This follows that precedent — every image on the site carries a
 * caption saying what it is, so nobody is left with the impression that it
 * is a Sambramo event.
 *
 * WHY SELF-HOSTED AND NOT HOTLINKED
 *
 * The app hotlinks Unsplash at runtime (src/lib/unsplash.js, capped at 24
 * searches per page load). A marketing site must not: a third-party origin
 * in img-src weakens the CSP, it costs a DNS and TLS handshake against the
 * LCP budget, and a URL that 404s in eighteen months leaves a hole on a page
 * nobody is looking at. Downloaded once, committed, served from our own
 * origin with an immutable cache header.
 *
 * LICENSING
 *
 * Unsplash and Pexels both license for commercial use without attribution
 * being required. Attribution is recorded anyway in credits.json and
 * rendered in the caption, because "not required" and "not decent" are
 * different things, and because a provenance record is what lets somebody
 * swap in a paid library later without having to work out where each file
 * came from.
 *
 *   node scripts/pull-images.mjs            # only what is missing
 *   node scripts/pull-images.mjs --force    # re-fetch everything
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPO = resolve(SITE, '..')
const OUT = join(SITE, 'public', 'img')
const CREDITS = join(SITE, 'content', 'credits.json')
const force = process.argv.includes('--force')

/* Read the keys the app already holds rather than asking for new ones.
   Read by Node, not shelled out to: PowerShell on this machine reads UTF-8
   as ANSI and mangles the file. */
/* This branch is normally checked out as a git WORKTREE, so `..` is the
   worktree root and has no .env — the keys live in the main checkout, which
   is wherever the shared .git directory's parent is. Asking git is the only
   way to find it that does not hard-code somebody's folder layout. */
function mainCheckout() {
  try {
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'],
      { cwd: REPO, encoding: 'utf8' }).trim()
    return resolve(common, '..')
  } catch { return null }
}

function envKey(name) {
  if (process.env[name]) return process.env[name]
  const roots = [REPO, mainCheckout()].filter(Boolean)
  for (const root of roots) {
    for (const f of ['.env', '.env.local']) {
      try {
        const m = readFileSync(join(root, f), 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'))
        if (m?.[1]?.trim()) return m[1].trim()
      } catch { /* not there */ }
    }
  }
  return null
}

const UNSPLASH = envKey('VITE_UNSPLASH_ACCESS_KEY') ?? envKey('UNSPLASH_ACCESS_KEY')
const PEXELS = envKey('PEXELS_API_KEY')

/**
 * What to fetch.
 *
 * Queries are written for Indian celebrations specifically. "wedding
 * decoration" returns a white marquee in Surrey; "indian wedding mandap
 * marigold" returns something a Bengaluru family would recognise. Getting
 * this wrong is how a site about Indian celebrations ends up illustrated
 * with somebody else's culture, which is worse than having no pictures.
 */
const WANTED = [
  { id: 'hero',        q: 'indian wedding marigold decoration celebration', w: 1200 },
  { id: 'occasions',   q: 'indian birthday party decoration balloons', w: 900 },
  { id: 'catering',    q: 'south indian feast banana leaf meal', w: 900 },
  { id: 'decor',       q: 'marigold flower garland indian festival decoration', w: 900 },
  { id: 'photography', q: 'indian wedding photographer candid', w: 900 },
  { id: 'rituals',     q: 'indian puja ceremony lamp brass', w: 900 },
  { id: 'music',       q: 'indian dhol drummer wedding procession', w: 900 },
  { id: 'mehendi',     q: 'mehendi henna hands indian bride', w: 900 },
  { id: 'venue',       q: 'indian banquet hall decorated stage wedding', w: 900 },
  { id: 'partners',    q: 'indian caterer chef working event kitchen', w: 900 },
  { id: 'festival',    q: 'diwali diya oil lamps rangoli', w: 900 },
  { id: 'city',        q: 'bengaluru bangalore city street india', w: 900 },
]

const sleep = ms => new Promise(r => setTimeout(r, ms))

/**
 * Read a JPEG's real pixel dimensions out of its SOF marker.
 *
 * Every <img> on the site needs width and height, because without them the
 * page reflows when the image lands and CLS is no longer zero — and
 * check-html.mjs fails the build for exactly that reason. Guessing from the
 * requested width does not work: Unsplash honours `w` and lets the height
 * fall out of the crop, so the height is only knowable from the bytes.
 *
 * Walking the marker chain is about fifteen lines and avoids adding an
 * image library to a project whose whole point is having no dependencies.
 */
function jpegSize(buf) {
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) return null
  let i = 2
  while (i < buf.length) {
    if (buf[i] !== 0xFF) { i++; continue }
    const marker = buf[i + 1]
    // SOF0..SOF15, excluding DHT (c4), JPG (c8) and DAC (cc), which are not
    // frame headers despite sitting in the same range.
    if (marker >= 0xC0 && marker <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) }
    }
    i += 2 + buf.readUInt16BE(i + 2)
  }
  return null
}

async function fromUnsplash(q, w) {
  if (!UNSPLASH) return null
  const r = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=3&orientation=landscape&content_filter=high`,
    { headers: { Authorization: `Client-ID ${UNSPLASH}` } })
  if (!r.ok) { console.warn(`  unsplash ${r.status} for "${q}"`); return null }
  const p = (await r.json()).results?.[0]
  if (!p) return null
  return {
    url: `${p.urls.raw}&w=${w}&q=72&fm=jpg&fit=crop`,
    source: 'Unsplash',
    author: p.user?.name ?? null,
    authorUrl: p.user?.links?.html ?? null,
    pageUrl: p.links?.html ?? null,
    alt: p.alt_description ?? null,
  }
}

async function fromPexels(q, w) {
  if (!PEXELS) return null
  const r = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=3&orientation=landscape`,
    { headers: { Authorization: PEXELS } })
  if (!r.ok) { console.warn(`  pexels ${r.status} for "${q}"`); return null }
  const p = (await r.json()).photos?.[0]
  if (!p) return null
  return {
    url: `${p.src.original}?auto=compress&cs=tinysrgb&w=${w}`,
    source: 'Pexels',
    author: p.photographer ?? null,
    authorUrl: p.photographer_url ?? null,
    pageUrl: p.url ?? null,
    alt: p.alt ?? null,
  }
}

mkdirSync(OUT, { recursive: true })
const credits = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, 'utf8')) : {}

console.log(`\npull-images: unsplash=${UNSPLASH ? 'yes' : 'no'} pexels=${PEXELS ? 'yes' : 'no'}\n`)

for (const item of WANTED) {
  const file = join(OUT, `${item.id}.jpg`)
  if (existsSync(file) && !force) { console.log(`  = ${item.id}.jpg (have it)`); continue }

  const pick = (await fromUnsplash(item.q, item.w)) ?? (await fromPexels(item.q, item.w))
  if (!pick) { console.warn(`  ! ${item.id}: no result for "${item.q}"`); continue }

  const img = await fetch(pick.url)
  if (!img.ok) { console.warn(`  ! ${item.id}: download ${img.status}`); continue }
  const buf = Buffer.from(await img.arrayBuffer())
  writeFileSync(file, buf)

  const dim = jpegSize(buf)
  if (!dim) console.warn(`  ! ${item.id}: could not read dimensions; <img> would ship without width/height`)

  credits[item.id] = {
    ...pick, url: undefined, query: item.q,
    width: dim?.width ?? null, height: dim?.height ?? null,
    bytes: buf.length,
    sha: createHash('sha256').update(buf).digest('hex').slice(0, 12),
    fetchedAt: new Date().toISOString(),
  }
  console.log(`  + ${item.id}.jpg  ${dim ? `${dim.width}x${dim.height}` : '??'}  ${(buf.length / 1024).toFixed(0)} KB  ${pick.source} · ${pick.author ?? 'unknown'}`)
  await sleep(400)   // both APIs rate-limit; this is not a race
}

writeFileSync(CREDITS, JSON.stringify(credits, null, 2) + '\n', 'utf8')
console.log(`\npull-images: ${Object.keys(credits).length} images, credits in content/credits.json\n`)
