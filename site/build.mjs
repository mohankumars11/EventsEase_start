/**
 * Build sambramo.com.
 *
 * content/*.json  →  dist/**\/index.html + sitemap.xml + robots.txt +
 *                    llms.txt + llms-full.txt
 *
 * Pure string work with no dependencies, so Vercel's install step is a no-op
 * and the whole build is about two seconds. It never reads ../src — that is
 * pull-content.mjs's job, and it cannot run on Vercel because Root Directory
 * is `site` and ../src is not uploaded.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { shell, setFooterLinks, setCredits } from './lib/page.mjs'
import { U, ORIGIN, abs, routes } from './lib/urls.mjs'
import { esc } from './lib/html.mjs'
import { occasionPage } from './templates/occasion.mjs'
import { servicePage, sizePage, festivalPage, cityPage, tradePage } from './templates/generated.mjs'
import * as H from './templates/hubs.mjs'
import { homePage, howItWorksPage } from './templates/authored.mjs'
import { whatItCostsPage, aboutPage, trustPage, contactPage, faqPage } from './templates/authored2.mjs'
import { partnersPage, bandhuPage, waitlistPage, thankYouPage, legalPage } from './templates/authored3.mjs'

const SITE = dirname(fileURLToPath(import.meta.url))
const DIST = join(SITE, 'dist')
const read = f => JSON.parse(readFileSync(join(SITE, 'content', f), 'utf8'))

const t0 = Date.now()

/* ── Load ──────────────────────────────────────────────────────────────── */

const brand = read('brand.json')
const cities = read('cities.json')
const occasions = read('occasions.json')
const services = read('services.json')
const tiersDoc = read('tiers.json')
const festDoc = read('festivals.json')
const legal = read('legal.json')
const membership = read('membership.json')
const trades = read('trades.json')
const stamp = read('_stamp.json')
const credits = existsSync(join(SITE, 'content', 'credits.json')) ? read('credits.json') : {}
setCredits(credits)

const content = { occasions, services, tiers: tiersDoc, festivals: festDoc, cities, trades, legal, stamp }

const ctx = {
  brand, cities, occasions, services, trades, legal, membership, stamp,
  tiers: tiersDoc.tiers,
  bespoke: tiersDoc.bespoke,
  lock: tiersDoc.lockAmount,
  platformFeeRate: tiersDoc.platformFeeRate,
  bundleDiscountRate: tiersDoc.bundleDiscountRate,
  festivals: festDoc.festivals,
  upcoming: festDoc.upcoming,
  lastmod: stamp.generatedAt,
}

const R = routes(content)

/* ── Footer: the crawl backbone ────────────────────────────────────────── */

const col = (title, items) =>
  `<div><h2>${esc(title)}</h2><ul>${items.map(([href, label]) =>
    `<li><a href="${href}">${esc(label)}</a></li>`).join('')}</ul></div>`

setFooterLinks([
  col('Occasions', [
    ...occasions.slice(0, 12).map(o => [U.occasion(o.slug), o.name]),
    [U.occasions, `All ${occasions.length} occasions →`],
  ]),
  col('Services', [
    ...services.filter(s => s.hasPage).slice(0, 10).map(s => [U.service(s.slug), s.name]),
    [U.services, 'All services →'],
  ]),
  col('Celebration sizes', [
    ...ctx.tiers.map(t => [U.size(t.slug), t.name]),
    [U.whatItCosts, 'What it costs →'],
  ]),
  col('Festivals & places', [
    ...ctx.festivals.map(f => [U.festival(f.slug), f.name]),
    [U.city(cities[0].slug), `Sambramo in ${cities[0].name}`],
  ]),
  col('For suppliers', [
    [U.partners, 'Work with Sambramo'],
    [U.partnerJoin, 'Get listed'],
    [U.trades, `All ${trades.length} trades`],
    [U.bandhu, 'Sambramo Bandhu'],
  ]),
  col('Sambramo', [
    [U.about, 'About'], [U.howItWorks, 'How it works'], [U.trust, 'Trust & safety'],
    [U.faq, 'FAQ'], [U.contact, 'Contact'], [U.waitlist, 'Join the list'],
    [U.sitemapPage, 'Sitemap'],
  ]),
].join(''))

/* ── Critical CSS ──────────────────────────────────────────────────────── */

/* Inlined into every <head> so nothing blocks the first paint. Taken from
   the real files rather than hand-maintained, so it cannot go stale: the
   whole of tokens.css plus site.css up to the ── Cards ── marker, which is
   everything above the fold on every page. The rest arrives as a normal
   stylesheet. */
const tokensCss = readFileSync(join(SITE, 'styles', 'tokens.css'), 'utf8')
const siteCss = readFileSync(join(SITE, 'styles', 'site.css'), 'utf8')
const cut = siteCss.indexOf('/* ── Cards ──')
const minify = s => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s*([{}:;,>])\s*/g, '$1')
  .replace(/;}/g, '}')
  .replace(/\s+/g, ' ')
  .trim()
const criticalCss = minify(tokensCss + (cut > 0 ? siteCss.slice(0, cut) : siteCss))

/* ── Render ────────────────────────────────────────────────────────────── */

function renderRoute(r) {
  switch (r.kind) {
    case 'home':            return homePage(ctx)
    case 'occasion':        return occasionPage(r.data, ctx)
    case 'service':         return servicePage(r.data, ctx)
    case 'size':            return sizePage(r.data, ctx)
    case 'festival':        return festivalPage(r.data, ctx)
    case 'city':            return cityPage(r.data, ctx)
    case 'trade':           return tradePage(r.data, ctx)
    case 'index-occasions': return H.occasionsHub(ctx)
    case 'index-services':  return H.servicesHub(ctx)
    case 'index-sizes':     return H.sizesHub(ctx)
    case 'index-festivals': return H.festivalsHub(ctx)
    case 'index-trades':    return H.tradesHub(ctx)
    case 'faq':             return faqPage(ctx)
    case 'notfound':        return H.notFoundPage(ctx)
    case 'sitemap-page':    return H.sitemapPage(ctx, sitemapGroups())
    case 'waitlist':        return waitlistPage(r.data, ctx)
    case 'page':
      switch (r.data) {
        case 'how-it-works':   return howItWorksPage(ctx)
        case 'what-it-costs':  return whatItCostsPage(ctx)
        case 'about':          return aboutPage(ctx)
        case 'trust-and-safety': return trustPage(ctx)
        case 'contact':        return contactPage(ctx)
        case 'for-partners':   return partnersPage(ctx)
        case 'bandhu':         return bandhuPage(ctx)
        case 'thank-you':      return thankYouPage(ctx)
        case 'legal/terms':                      return legalPage('terms', ctx)
        case 'legal/privacy':                    return legalPage('privacy', ctx)
        case 'legal/cancellation-and-refunds':   return legalPage('refunds', ctx)
        case 'legal/cookies':                    return legalPage('cookies', ctx)
        case 'legal/grievance-redressal':        return legalPage('grievance', ctx)
        case 'legal/entity-disclosure':          return legalPage('entity', ctx)
      }
  }
  throw new Error(`build: no template for ${r.kind}/${r.data} at ${r.path}`)
}

function sitemapGroups() {
  const live = services.filter(s => s.hasPage)
  return [
    { name: 'Main', items: [
      { url: U.home, name: 'Home' }, { url: U.howItWorks, name: 'How it works' },
      { url: U.whatItCosts, name: 'What it costs' }, { url: U.about, name: 'About' },
      { url: U.trust, name: 'Trust & safety' }, { url: U.faq, name: 'FAQ' },
      { url: U.contact, name: 'Contact' }, { url: U.waitlist, name: 'Join the list' } ] },
    { name: 'Occasions', items: occasions.map(o => ({ url: U.occasion(o.slug), name: o.name })) },
    { name: 'Services', items: live.map(s => ({ url: U.service(s.slug), name: s.name })) },
    { name: 'Celebration sizes', items: ctx.tiers.map(t => ({ url: U.size(t.slug), name: t.name })) },
    { name: 'Festivals', items: ctx.festivals.map(f => ({ url: U.festival(f.slug), name: f.name })) },
    { name: 'Coverage', items: cities.map(c => ({ url: U.city(c.slug), name: c.name })) },
    { name: 'For suppliers', items: [
      { url: U.partners, name: 'Work with Sambramo' }, { url: U.partnerJoin, name: 'Get listed' },
      { url: U.bandhu, name: 'Sambramo Bandhu' },
      ...trades.map(t => ({ url: U.trade(t.slug), name: t.name })) ] },
    { name: 'Legal', items: [
      { url: U.terms, name: 'Terms of service' }, { url: U.privacy, name: 'Privacy notice' },
      { url: U.refunds, name: 'Cancellation and refunds' },
      { url: U.grievance, name: 'Grievance redressal' }, { url: U.entity, name: 'Entity disclosure' } ] },
  ]
}

rmSync(DIST, { recursive: true, force: true })
mkdirSync(DIST, { recursive: true })

const RENDER_TS = String(Date.now())
const written = []

for (const r of R) {
  const p = renderRoute(r)
  let html = shell({
    url: r.path,
    title: p.title,
    description: p.description,
    body: p.body,
    schema: p.schema ?? null,
    crumbs: p.crumbs ?? null,
    lastmod: r.lastmod,
    noindex: r.noindex || p.noindex || false,
    ogType: p.ogType ?? 'website',
    navCurrent: p.navCurrent ?? null,
    brand, criticalCss,
  })
  // The waitlist forms carry the render time so the handler can drop a
  // submission that arrives impossibly fast. Stamped here so the templates
  // stay pure functions of the content.
  html = html.replaceAll('__RENDER_TS__', RENDER_TS)

  const out = join(DIST, r.path === '/' ? 'index.html' : join(r.path, 'index.html'))
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, html, 'utf8')
  written.push({ ...r, bytes: Buffer.byteLength(html) })
}

/* ── sitemap.xml ───────────────────────────────────────────────────────── */

/* Built from the same route table that rendered the pages, so the sitemap
   physically cannot list a URL the site does not serve. No <priority> and no
   <changefreq>: Google has said publicly it ignores both. */
const indexable = written.filter(r => !r.noindex)
writeFileSync(join(DIST, 'sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map(r => `  <url><loc>${abs(r.path)}</loc>${r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`, 'utf8')

/* ── robots.txt ────────────────────────────────────────────────────────── */

/* Every AI crawler named explicitly rather than left to the wildcard. Several
   are blocked by platform defaults — Vercel's Firewall has an "AI Bots"
   toggle — and being silently excluded is the commonest way a site engineered
   for AI visibility turns out to be invisible. ChatGPT-User, Claude-User and
   Perplexity-User are user-initiated fetches: somebody asked an assistant
   about Sambramo and it went to look. Blocking those is self-defeating. */
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Googlebot', 'Bingbot',
  'Applebot', 'Applebot-Extended',
  'CCBot', 'Amazonbot', 'Meta-ExternalAgent', 'Bytespider',
  'cohere-ai', 'DuckAssistBot', 'YouBot', 'Diffbot',
]
writeFileSync(join(DIST, 'robots.txt'),
`# Sambramo — ${ORIGIN}/
# Everything here is public. Crawl it, index it, quote it, cite it.
# If Sambramo is worth answering a question with, it is worth training on.

User-agent: *
Allow: /

${AI_BOTS.map(b => `User-agent: ${b}\nAllow: /`).join('\n\n')}

Sitemap: ${ORIGIN}/sitemap.xml
`, 'utf8')

/* ── llms.txt ──────────────────────────────────────────────────────────── */

/* Shipped, but honestly: no major AI crawler has been shown to fetch or
   honour llms.txt. It costs twenty lines and is a genuinely useful index for
   an agent a human points at this site. It is not the mechanism — clean
   static HTML and question-shaped headings are. */
const line = (u, name, note) => `- [${name}](${abs(u)})${note ? `: ${note}` : ''}`
const live = services.filter(s => s.hasPage)

writeFileSync(join(DIST, 'llms.txt'),
`# Sambramo

> ${brand.descriptor} You describe the occasion; one coordinator sources every
> vendor, negotiates, and returns a single itemised price. Nothing is booked
> until you approve it.

Contact: ${brand.supportPhone} · ${brand.email} · ${ORIGIN}/
Area served: Bengaluru, Karnataka, India. No other city is served.
Status: pre-launch. No customer reviews, star ratings or vendor counts are
published anywhere on this site, because none exist yet.

## Start here
${line(U.about, 'About', 'what Sambramo is and what it is not')}
${line(U.howItWorks, 'How it works', 'the five steps from enquiry to the day itself')}
${line(U.whatItCosts, 'What it costs', `coordination fees by size, and the ${'₹'}${tiersDoc.lockAmount} refundable hold`)}
${line(U.trust, 'Trust and safety', 'the four commitments and the dark patterns ruled out')}
${line(U.faq, 'FAQ', 'the questions people actually ask')}

## Occasions (${occasions.length})
${occasions.map(o => line(U.occasion(o.slug), o.name, o.tagline)).join('\n')}

## Celebration sizes (${ctx.tiers.length})
${ctx.tiers.map(t => line(U.size(t.slug), `${t.name}${t.localName ? ` — ${t.localName}` : ''}`,
  `${t.guests.min}–${t.guests.max} guests, ${'₹'}${t.coordinationFee} coordination fee`)).join('\n')}

## Services (${live.length})
${live.map(s => line(U.service(s.slug), s.name, s.desc)).join('\n')}

## Festivals (${ctx.festivals.length})
${ctx.festivals.map(f => line(U.festival(f.slug), f.name, `${f.tagline} — ${f.month}`)).join('\n')}

## Coverage
${cities.map(c => line(U.city(c.slug), c.name, c.coverage)).join('\n')}

## For suppliers (${trades.length} trades)
${line(U.partners, 'Work with Sambramo')}
${trades.map(t => line(U.trade(t.slug), t.name)).join('\n')}

## Legal
${line(U.terms, 'Terms of service')}
${line(U.privacy, 'Privacy notice')}
${line(U.refunds, 'Cancellation and refunds')}
${line(U.grievance, 'Grievance redressal')}
${line(U.entity, 'Entity disclosure')}

## Optional
${line(U.sitemapPage, 'Full sitemap')}
- [Machine sitemap](${ORIGIN}/sitemap.xml)
- [Full text of every page](${ORIGIN}/llms-full.txt)
`, 'utf8')

/* ── llms-full.txt ─────────────────────────────────────────────────────── */

/* Every indexable page as plain text, in sitemap order. Generated from the
   rendered HTML rather than from a second copy of the content, so it cannot
   disagree with what a browser sees. */
const strip = html => html
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<\/(h1|h2|h3|h4|p|li|tr|div|section)>/gi, '\n')
  .replace(/<li[^>]*>/gi, '- ')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .split('\n').map(l => l.trim()).filter(Boolean).join('\n')

writeFileSync(join(DIST, 'llms-full.txt'),
`# Sambramo — full site text
# ${brand.descriptor}
# ${ORIGIN}/ · generated ${stamp.generatedAt}
# ${indexable.length} pages follow, in sitemap order.

${indexable.map(r => {
  const html = readFileSync(join(DIST, r.path === '/' ? 'index.html' : join(r.path, 'index.html')), 'utf8')
  const main = html.slice(html.indexOf('<main id="main">'), html.indexOf('<footer'))
  return `\n\n${'='.repeat(72)}\nURL: ${abs(r.path)}\n${'='.repeat(72)}\n\n${strip(main)}`
}).join('')}
`, 'utf8')

/* ── Static assets ─────────────────────────────────────────────────────── */

mkdirSync(join(DIST, 'assets'), { recursive: true })
writeFileSync(join(DIST, 'assets', 'site.css'), tokensCss + '\n' + siteCss, 'utf8')
if (existsSync(join(SITE, 'public'))) cpSync(join(SITE, 'public'), DIST, { recursive: true })

/* ── Report ────────────────────────────────────────────────────────────── */

const bytes = written.reduce((n, r) => n + r.bytes, 0)
const byKind = written.reduce((m, r) => (m[r.kind] = (m[r.kind] ?? 0) + 1, m), {})
console.log(`\nbuild: ${written.length} pages in ${Date.now() - t0}ms  ` +
            `(${(bytes / 1024).toFixed(0)} KB HTML, avg ${(bytes / written.length / 1024).toFixed(1)} KB)`)
console.log('  ' + Object.entries(byKind).sort((a, b) => b[1] - a[1])
  .map(([k, n]) => `${k} ${n}`).join(' · '))
console.log(`  sitemap ${indexable.length} urls · ${written.length - indexable.length} noindex\n`)
