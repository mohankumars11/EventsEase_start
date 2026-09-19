/**
 * Structural gate over dist/.
 *
 * The most important assertion here is the one about <script>. This site's
 * entire SEO and AI-visibility argument rests on the pages being readable
 * without JavaScript, and `script-src 'none'` in vercel.json is only safe
 * to ship because this check guarantees there is nothing to run. If that
 * assertion ever fails, the CSP breaks the site — which is the correct,
 * loud failure rather than a quiet regression into a client-rendered page
 * no crawler can read.
 */
import { readFileSync } from 'node:fs'
import { htmlFiles, pathOf, fail, report } from './_lib.mjs'

const files = htmlFiles()
const canonicalSeen = new Map()

for (const f of files) {
  const html = readFileSync(f, 'utf8')
  const url = pathOf(f)
  const at = m => `${url} — ${m}`

  /* ── Zero JavaScript ─────────────────────────────────────────────── */
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)]
  const runnable = scripts.filter(m => !/type=["']application\/ld\+json["']/i.test(m[1]))
  if (runnable.length) fail(at(`${runnable.length} runnable <script> tag(s) — the CSP sets script-src 'none', so this page would break. Found: ${runnable[0][0]}`))
  if (/\son[a-z]+\s*=\s*["']/i.test(html)) fail(at('inline event handler attribute (onclick=, onload=…) — blocked by the CSP'))

  /* ── One h1 ──────────────────────────────────────────────────────── */
  const h1s = (html.match(/<h1\b/gi) ?? []).length
  if (h1s !== 1) fail(at(`${h1s} <h1> elements, expected exactly 1`))

  /* ── Canonical ───────────────────────────────────────────────────── */
  const canon = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
  if (!canon) fail(at('no canonical'))
  else {
    const expect = `https://sambramo.com${url}`
    if (canon !== expect) fail(at(`canonical is ${canon}, expected ${expect}`))
    if (canonicalSeen.has(canon)) fail(at(`canonical collides with ${canonicalSeen.get(canon)}`))
    canonicalSeen.set(canon, url)
  }

  /* ── Title and description ───────────────────────────────────────── */
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''
  if (!title) fail(at('no <title>'))
  else if (title.length < 15 || title.length > 70) fail(at(`title is ${title.length} chars (want 15–70): ${title}`))

  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''
  if (!desc) fail(at('no meta description'))
  else if (desc.length < 70 || desc.length > 165) fail(at(`description is ${desc.length} chars (want 70–165)`))

  /* ── Language and OG ─────────────────────────────────────────────── */
  if (!/<html lang="en-IN">/.test(html)) fail(at('missing lang="en-IN"'))
  const ogUrl = html.match(/property="og:url" content="([^"]+)"/)?.[1]
  if (canon && ogUrl !== canon) fail(at(`og:url (${ogUrl}) does not match canonical`))
  if (!/property="og:image" content="https:\/\//.test(html)) fail(at('og:image missing or not absolute'))

  /* ── Images ──────────────────────────────────────────────────────── */
  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    const tag = m[1]
    if (!/\balt=/.test(tag)) fail(at(`<img> without alt: ${m[0].slice(0, 90)}`))
    if (!/\bwidth=/.test(tag) || !/\bheight=/.test(tag)) fail(at(`<img> without width/height (causes CLS): ${m[0].slice(0, 90)}`))
  }

  /* ── The two gated legal pages ───────────────────────────────────────
     They make statutory disclosures the company cannot yet make, so they
     stay out of the index until legal.js has the facts — and must come
     back INTO it the moment it does. Both directions are asserted, because
     a flag that never flips off is the same bug as one that never flips on. */
  const gated = url === '/legal/grievance-redressal/' || url === '/legal/entity-disclosure/'
  const launchReady = JSON.parse(readFileSync(new URL('../content/legal.json', import.meta.url), 'utf8')).launchReady
  const noindexed = /content="noindex/.test(html)
  if (gated && !launchReady && !noindexed) fail(at('statutory page is indexable while legal.js still has open compliance gaps'))
  if (gated && launchReady && noindexed) fail(at('legal.js is complete but this page is still noindex — remove the gate'))
}

report('check-html', files.length)
