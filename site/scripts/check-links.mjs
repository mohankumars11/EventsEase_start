/**
 * Link graph gate.
 *
 * Which of the 153 pages a crawler — or a model — ever sees is decided by
 * the link graph, not by the sitemap. So: no internal 404s, no orphans, and
 * the sitemap set must equal the indexable set exactly.
 *
 * The orphan check is the one that earns its keep. A page with no inbound
 * link is a page Google finds once via the sitemap, ranks poorly because
 * nothing on the site votes for it, and eventually drops.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DIST, SITE, htmlFiles, pathOf, fail, report } from './_lib.mjs'

const ORIGIN = 'https://sambramo.com'

/* Paths that vercel.json redirects.
 *
 * /app and /partner-app are the two doors into the product. They are not
 * pages in dist/ — they are 308s to the application's own origin — so
 * without this the checker reports every link to them as a 404 and as a
 * missing trailing slash, which is 448 failures and no signal.
 *
 * Reading the real config rather than hardcoding a list means deleting a
 * redirect starts failing the links that depended on it, which is the
 * behaviour you actually want from a link checker. */
const redirectSources = (() => {
  try {
    const cfg = JSON.parse(readFileSync(join(SITE, 'vercel.json'), 'utf8'))
    return (cfg.redirects ?? []).map(r => {
      // Vercel's :param and :path* segments, as a matcher. Split on the
      // params first and escape only the literal parts, so escaping cannot
      // mangle the very syntax the next step is looking for.
      const re = String(r.source)
        .split(/(:[a-zA-Z]+\*?)/)
        .map(part => part.startsWith(':')
          ? (part.endsWith('*') ? '.*' : '[^/]+')
          : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('')
      return new RegExp(`^${re}$`)
    })
  } catch { return [] }
})()

const isRedirected = p => redirectSources.some(re => re.test(p))
const files = htmlFiles()
const pages = new Set(files.map(pathOf))
const inbound = new Map([...pages].map(p => [p, 0]))
let links = 0

for (const f of files) {
  const html = readFileSync(f, 'utf8')
  const from = pathOf(f)

  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+)"([^>]*)>/gi)) {
    const [, href, rest] = m
    links++

    if (/^(tel:|mailto:|#)/.test(href)) continue

    if (/^https?:\/\//.test(href)) {
      if (href.startsWith(ORIGIN)) {
        fail(`${from} — absolute internal link "${href}"; use a site-relative path so the link survives a domain change`)
      } else if (!/rel="[^"]*noopener/.test(rest) && /target="_blank"/.test(rest)) {
        fail(`${from} — external target=_blank without rel=noopener: ${href}`)
      }
      continue
    }

    const clean = href.split('#')[0].split('?')[0]
    if (!clean) continue

    if (!clean.startsWith('/')) { fail(`${from} — relative href "${href}"; every internal link is absolute-from-root`); continue }
    // A redirect source is a real destination, just not a file in dist/.
    if (isRedirected(clean)) continue
    if (!clean.endsWith('/') && !/\.[a-z0-9]{2,5}$/i.test(clean)) {
      fail(`${from} — "${clean}" has no trailing slash; it would 308 and waste the hop`)
      continue
    }

    if (/\.[a-z0-9]{2,5}$/i.test(clean)) {
      if (!existsSync(join(DIST, clean))) fail(`${from} — asset 404: ${clean}`)
      continue
    }

    if (!pages.has(clean)) { fail(`${from} — internal 404: ${clean}`); continue }
    if (clean !== from) inbound.set(clean, inbound.get(clean) + 1)
  }
}

/* 404 is reached by the server, not by a link. thank-you is reached by a
   form redirect. Both are legitimately orphaned and both are noindex. */
const ALLOWED_ORPHANS = new Set(['/404/', '/thank-you/'])
for (const [p, n] of inbound) {
  if (n === 0 && !ALLOWED_ORPHANS.has(p)) fail(`${p} — orphan: no other page links to it`)
}

/* Sitemap must equal the indexable set. */
const sm = readFileSync(join(DIST, 'sitemap.xml'), 'utf8')
const listed = new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(ORIGIN, '')))
const noindexed = new Set(files.filter(f => /content="noindex/.test(readFileSync(f, 'utf8'))).map(pathOf))

for (const p of listed) if (!pages.has(p)) fail(`sitemap lists ${p}, which is not built`)
for (const p of listed) if (noindexed.has(p)) fail(`sitemap lists ${p}, which is noindex`)
for (const p of pages) {
  if (!listed.has(p) && !noindexed.has(p)) fail(`${p} is indexable but missing from sitemap.xml`)
}

console.log(`  ${links} links · ${listed.size} in sitemap · ${noindexed.size} noindex`)
report('check-links', files.length)
