/**
 * The one URL table.
 *
 * Every href, every canonical, every sitemap <loc> and every llms.txt line
 * resolves through this file. Nothing anywhere else types a path as a string
 * literal. That is what makes it structurally impossible for the sitemap to
 * list a URL the site does not serve, or for an internal link to 404 — the
 * two failures that quietly waste most of a new site's crawl budget.
 *
 * Trailing slash on everything except the root, matching vercel.json's
 * `trailingSlash: true`. The canonical, the href, the <loc> and the served
 * URL all agree, so no link ever costs a 308 hop.
 */

export const ORIGIN = 'https://sambramo.com'

/** Absolute URL for a site-relative path. */
export const abs = path => ORIGIN + path

const dir = (...parts) => '/' + parts.filter(Boolean).join('/') + '/'

export const U = {
  home: '/',

  howItWorks:     '/how-it-works/',
  whatItCosts:    '/what-it-costs/',
  about:          '/about/',
  trust:          '/trust-and-safety/',
  contact:        '/contact/',
  faq:            '/faq/',
  waitlist:       '/waitlist/',
  thankYou:       '/thank-you/',
  sitemapPage:    '/sitemap/',
  notFound:       '/404/',

  occasions:      '/occasions/',
  occasion:       id => dir('occasions', id),

  services:       '/services/',
  service:        id => dir('services', id),

  sizes:          '/celebration-sizes/',
  size:           id => dir('celebration-sizes', id),

  festivals:      '/festivals/',
  festival:       id => dir('festivals', id),

  /* The city page sits at the root: /bengaluru/, not /cities/bengaluru/.
     With one city a /cities/ hub is a thin duplicate of the only page under
     it — two URLs competing for one intent, which is the doorway pattern in
     miniature. The short URL is also the one somebody would guess and the
     one that reads well in a search result. A second city gets /mysuru/ at
     the same level; a hub only earns its place at four or five. */
  city:           slug => dir(slug),

  partners:       '/partners/',
  partnerJoin:    '/partners/join/',
  bandhu:         '/partners/bandhu/',
  trades:         '/partners/trades/',
  trade:          slug => dir('partners/trades', slug),

  terms:          '/legal/terms/',
  privacy:        '/legal/privacy/',
  refunds:        '/legal/cancellation-and-refunds/',
  grievance:      '/legal/grievance-redressal/',
  entity:         '/legal/entity-disclosure/',
  cookies:        '/legal/cookies/',

  /* The two doors into the product. Both are 308s defined in vercel.json,
     so the destination moves in one place when the apps get their own
     subdomains. Everything on the site links to these, never to a
     vercel.app hostname. */
  customerApp:    '/app',
  partnerApp:     '/partner-app',
}

/**
 * Build the complete route table from the content snapshot.
 *
 * Returns one record per emitted page. `noindex` keeps a page out of the
 * sitemap and puts a robots meta on it; `lastmod` feeds <lastmod> and the
 * visible "last updated" line.
 */
export function routes(content) {
  const { occasions, services, tiers, festivals, cities, trades, legal, stamp } = content
  const mod = f => stamp?.sources?.[f]?.lastmod ?? stamp?.generatedAt ?? null

  const M = {
    occ:   mod('src/data/eventServicesData.js'),
    tier:  mod('src/data/celebrationTiers.js'),
    fest:  mod('src/data/festivals.js'),
    city:  mod('src/config/cities.js'),
    trade: mod('src/config/vendor.js'),
    legal: mod('src/config/legal.js'),
    brand: mod('src/config/sambramo.js'),
  }

  const r = []
  const add = (path, kind, data, lastmod, opts = {}) =>
    r.push({ path, kind, data, lastmod, noindex: false, ...opts })

  // ── hand-authored ─────────────────────────────────────────────────────
  add(U.home,        'home',    null, M.brand)
  add(U.howItWorks,  'page',    'how-it-works', M.brand)
  add(U.whatItCosts, 'page',    'what-it-costs', M.tier)
  add(U.about,       'page',    'about', M.brand)
  add(U.trust,       'page',    'trust-and-safety', M.legal)
  add(U.faq,         'faq',     null, M.brand)
  add(U.contact,     'page',    'contact', M.brand)
  add(U.waitlist,    'waitlist', 'customer', M.brand)
  add(U.partners,    'page',    'for-partners', M.trade)
  add(U.partnerJoin, 'waitlist', 'partner', M.trade)
  add(U.bandhu,      'page',    'bandhu', M.brand)

  // A thank-you page is a dead end for a crawler and a duplicate-intent
  // page for a ranking one. Reachable only by a form redirect.
  add(U.thankYou,    'page', 'thank-you', M.brand, { noindex: true })
  add(U.notFound,    'notfound', null, M.brand, { noindex: true })
  add(U.sitemapPage, 'sitemap-page', null, M.brand)

  // ── legal ─────────────────────────────────────────────────────────────
  add(U.terms,    'page', 'legal/terms', M.legal)
  add(U.privacy,  'page', 'legal/privacy', M.legal)
  add(U.refunds,  'page', 'legal/cancellation-and-refunds', M.legal)
  add(U.cookies,  'page', 'legal/cookies', M.legal)
  // These two make statutory disclosures the company cannot yet make. They
  // are published (saying plainly what is coming is better than a 404 for
  // someone looking for a grievance route) but kept out of the index until
  // legal.js has the facts. The flag comes from the data, so they un-hide
  // themselves and nobody has to remember.
  add(U.grievance, 'page', 'legal/grievance-redressal', M.legal, { noindex: !legal.launchReady })
  add(U.entity,    'page', 'legal/entity-disclosure',   M.legal, { noindex: !legal.launchReady })

  // ── hubs ──────────────────────────────────────────────────────────────
  add(U.occasions, 'index-occasions', null, M.occ)
  add(U.services,  'index-services',  null, M.occ)
  add(U.sizes,     'index-sizes',     null, M.tier)
  add(U.festivals, 'index-festivals', null, M.fest)
  add(U.trades,    'index-trades',    null, M.trade)

  // ── generated ─────────────────────────────────────────────────────────
  for (const o of occasions)                    add(U.occasion(o.slug), 'occasion', o, M.occ)
  for (const s of services.filter(s => s.hasPage)) add(U.service(s.slug),  'service',  s, M.occ)
  for (const t of tiers.tiers)                  add(U.size(t.slug),     'size',     t, M.tier)
  for (const f of festivals.festivals)          add(U.festival(f.slug), 'festival', f, M.fest)
  for (const c of cities)                       add(U.city(c.slug),   'city',     c, M.city)
  for (const t of trades)                       add(U.trade(t.slug),  'trade',    t, M.trade)

  return r
}
