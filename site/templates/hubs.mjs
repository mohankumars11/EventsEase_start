/**
 * The six index hubs, the HTML sitemap and the 404.
 *
 * A hub's job is threefold: answer the "what is there" question in its own
 * right, carry an ItemList so a parser gets the inventory without inferring
 * it, and make every child page one click from the nav. They are not
 * doorways — each one leads with a real count and a real summary sentence.
 */
import { esc, list } from '../lib/html.mjs'
import { U } from '../lib/urls.mjs'
import { inr, band, guests, clamp, fitTitle } from '../lib/fmt.mjs'
import * as S from '../lib/schema.mjs'
import { waitlistCta, photo } from '../lib/page.mjs'

const crumb = (...t) => [{ name: 'Home', url: U.home }, ...t]

const hub = ({ url, title, description, eyebrow, h1, lede, body, items, nav, crumbs, lastmod, extraSchema = [] }) => ({
  title, description, navCurrent: nav, crumbs,
  body: `
<div class="wrap pagehead">
  <p class="eyebrow">${esc(eyebrow)}</p>
  <h1>${esc(h1)}</h1>
  <p class="lede">${esc(lede)}</p>
</div>
${body}`,
  schema: S.graph([
    S.webPage({ url, title, description, lastmod }),
    S.breadcrumbList(url, crumbs),
    items ? S.itemList(url, items) : null,
    ...extraSchema,
  ]),
})

/* ── Occasions ─────────────────────────────────────────────────────────── */

export function occasionsHub(ctx) {
  const { occasions, brand, lastmod } = ctx
  return hub({
    url: U.occasions, nav: 'occasions', lastmod,
    crumbs: crumb({ name: 'Occasions' }),
    title: fitTitle(`All ${occasions.length} Occasions We Arrange in Bengaluru`, brand.name),
    description: clamp(`Every occasion Sambramo arranges in Bengaluru — ${list(occasions.slice(0, 5).map(o => o.name.toLowerCase()))} and ${occasions.length - 5} more. One coordinator, one itemised price, nothing booked until you approve.`),
    eyebrow: 'Occasions · Bengaluru',
    h1: 'Every occasion Sambramo arranges',
    lede: `${occasions.length} occasions, all in Bengaluru, all arranged end to end. Pick the one you are planning and see what it includes and what it costs.`,
    items: occasions.map(o => ({ url: U.occasion(o.slug), name: o.name })),
    body: `
<div class="wrap section">
  ${photo('decor', { alt: 'Marigold and flower decoration for an Indian celebration', className: 'band' })}
  <div class="grid grid--3">
    ${occasions.map(o => `<a class="card" href="${U.occasion(o.slug)}">
      <span class="card-title">${esc(o.name)}</span>
      <p class="card-note">${esc(o.tagline)}</p>
      <p class="card-price">${esc(o.services.length)} services</p></a>`).join('')}
  </div>
</div>
${waitlistCta({ brand, heading: 'Do not see your occasion?',
  blurb: 'Tell us what you are planning anyway. The list above is what has been priced so far, not the limit of what a coordinator can arrange.' })}`,
  })
}

/* ── Services ──────────────────────────────────────────────────────────── */

export function servicesHub(ctx) {
  const { services, brand, lastmod } = ctx
  const live = services.filter(s => s.hasPage)
  const cats = [...new Set(live.map(s => s.category))].sort()
  return hub({
    url: U.services, nav: 'services', lastmod,
    crumbs: crumb({ name: 'Services' }),
    title: fitTitle(`${live.length} Event Services in Bengaluru`, brand.name),
    description: clamp(`Every service Sambramo sources in Bengaluru, across ${cats.length} categories: venue, catering, decor, photography, priests, sound, transport and more. Take the whole celebration or one piece of it.`),
    eyebrow: 'Services · Bengaluru',
    h1: 'Every service Sambramo sources',
    lede: `${live.length} services across ${cats.length} categories. You can hand over the whole day or book only the one thing you are short of.`,
    items: live.map(s => ({ url: U.service(s.slug), name: s.name })),
    body: `
<div class="wrap section">
  ${photo('catering', { alt: 'A South Indian feast served on a banana leaf', className: 'band' })}
</div>
<div class="wrap section prose">
  <p><strong>Sambramo sources ${esc(live.length)} distinct services for celebrations in Bengaluru.</strong>
  Each one is sourced from a checked supplier, negotiated on your behalf and itemised in the proposal —
  so you can see what every line costs and remove any of them.</p>
</div>
${cats.map(cat => {
  const items = live.filter(s => s.category === cat)
  return `<div class="wrap section">
  <h2 id="${esc(cat.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}">${esc(cat)}</h2>
  <p class="lede">${esc(items.length)} service${items.length === 1 ? '' : 's'} — ${esc(list(items.slice(0, 4).map(s => s.name.toLowerCase())))}${items.length > 4 ? ' and more' : ''}.</p>
  <div class="grid grid--3">
    ${items.map(s => `<a class="card" href="${U.service(s.slug)}">
      <span class="card-title">${esc(s.name)}</span>
      <p class="card-note">${esc(s.desc)}</p>
      ${band(s) ? `<p class="card-price">${esc(band(s))}</p>` : ''}</a>`).join('')}
  </div>
</div>`
}).join('')}
<div class="wrap section">
  <p class="note"><strong>Prices are indicative.</strong> They are real Bengaluru market ranges, and some
  are per plate or per seat rather than per event. None of them is a quote — your figure is priced for
  your date, venue and guest count, and asking costs nothing.</p>
</div>
${waitlistCta({ brand, heading: 'Need one of these in Bengaluru?',
  blurb: 'Sambramo is opening soon. Tell us what you need and when, and you will be among the first we call.' })}`,
  })
}

/* ── Celebration sizes ─────────────────────────────────────────────────── */

export function sizesHub(ctx) {
  const { tiers, bespoke, lock, brand, lastmod } = ctx
  const low = tiers[0], high = tiers[tiers.length - 1]
  return hub({
    url: U.sizes, nav: 'costs', lastmod,
    crumbs: crumb({ name: 'Celebration sizes' }),
    title: fitTitle('Celebration Sizes and What They Cost', brand.name),
    description: clamp(`Eight celebration sizes from ${guests(low.guests)} to ${guests(high.guests)}, with Sambramo's coordination fee for each — ${inr(low.coordinationFee)} to ${inr(high.coordinationFee)}. Vendor costs quoted separately and itemised.`),
    eyebrow: 'What it costs',
    h1: 'Eight sizes, and what each one costs to run',
    lede: `Sambramo's coordination fee is set by how many people are coming — ${inr(low.coordinationFee)} at the smallest, ${inr(high.coordinationFee)} at the largest. Vendor costs are quoted on top and itemised in full.`,
    items: tiers.map(t => ({ url: U.size(t.slug), name: t.name })),
    body: `
<div class="wrap section">
  <div class="table-scroll"><table>
    <thead><tr><th scope="col">Size</th><th scope="col">Guests</th><th scope="col" class="num">Coordination fee</th><th scope="col">What it is</th></tr></thead>
    <tbody>${tiers.map(t => `<tr>
      <th scope="row" style="color:var(--ink);font-size:.9375rem;letter-spacing:0;text-transform:none">
        <a href="${U.size(t.slug)}">${esc(t.name)}</a>${t.localName ? `<br><span class="muted" style="font-weight:400">${esc(t.localName)}</span>` : ''}</th>
      <td>${esc(guests(t.guests))}</td>
      <td class="num money">${esc(inr(t.coordinationFee))}</td>
      <td class="muted">${esc(t.tagline)}</td></tr>`).join('')}
      ${bespoke ? `<tr><th scope="row" style="color:var(--ink);font-size:.9375rem;letter-spacing:0;text-transform:none">${esc(bespoke.name)}</th>
      <td>${esc(bespoke.guests?.min ?? '3,500')}+</td><td class="num muted">Quoted</td>
      <td class="muted">${esc(bespoke.tagline ?? 'Beyond the ladder')}</td></tr>` : ''}
    </tbody>
  </table></div>
  <p class="note"><strong>The coordination fee is Sambramo's charge, and it is the only one.</strong>
  Venue, food, decor and photography are sourced, negotiated and quoted separately, then itemised line
  by line. Nothing is folded into the fee where you cannot see it, and nothing is added after you approve.</p>
  <p><a href="${U.whatItCosts}">How a Sambramo price is built →</a></p>
</div>
<div class="wrap section">
  <div class="grid grid--2">
    ${tiers.map(t => `<a class="card" href="${U.size(t.slug)}">
      <span class="card-title">${esc(t.name)}${t.localName ? ` · ${esc(t.localName)}` : ''}</span>
      <p class="card-note">${esc(t.description)}</p>
      <p class="card-price">${esc(guests(t.guests))} · ${esc(inr(t.coordinationFee))} coordination</p></a>`).join('')}
  </div>
</div>
${waitlistCta({ brand, heading: 'Know roughly how many people?',
  blurb: `That is enough to start. Sambramo is opening soon in Bengaluru — ${inr(lock)} will hold a date and a price once we are live, refundable if you walk away.` })}`,
  })
}

/* ── Festivals ─────────────────────────────────────────────────────────── */

export function festivalsHub(ctx) {
  const { festivals, upcoming, brand, lastmod } = ctx
  return hub({
    url: U.festivals, nav: null, lastmod,
    crumbs: crumb({ name: 'Festivals' }),
    title: fitTitle('Festival Guides for Bengaluru', brand.name),
    description: clamp(`Guides to ${festivals.length} festivals — the rituals, the food and what a celebration costs — plus how Sambramo arranges festival catering and decor in Bengaluru.`),
    eyebrow: 'Festivals',
    h1: 'Festivals, and how to do them properly',
    lede: `${festivals.length} guides covering what each festival is, when it falls, the rituals that mark it and the food a table is expected to carry — and how Sambramo arranges one in Bengaluru.`,
    items: festivals.map(f => ({ url: U.festival(f.slug), name: f.name })),
    body: `
<div class="wrap section">
  ${photo('festival', { alt: 'Diwali lamps and rangoli', className: 'band' })}
  <div class="grid grid--2">
    ${festivals.map(f => `<a class="card" href="${U.festival(f.slug)}">
      <span class="card-title">${esc(f.name)}</span>
      <p class="card-note">${esc(f.tagline)}</p>
      <p class="card-price">${esc(f.month)} · ${esc(f.duration)}</p></a>`).join('')}
  </div>
</div>
${upcoming?.length ? `<div class="wrap section">
  <h2>Coming up</h2>
  <p class="lede">The calendar, with enough notice to do it properly.</p>
  <ul class="chips">${upcoming.map(u => `<li><span class="chip">${esc(u.name)}</span></li>`).join('')}</ul>
</div>` : ''}
${waitlistCta({ brand, heading: 'Planning a festival celebration?',
  blurb: 'Festival dates fill early and good caterers fill earliest. Sambramo is opening soon in Bengaluru — leave your details and you will be called in time.' })}`,
  })
}

/* ── Trades ────────────────────────────────────────────────────────────── */

export function tradesHub(ctx) {
  const { trades, brand, lastmod } = ctx
  return hub({
    url: U.trades, nav: 'partners', lastmod,
    crumbs: crumb({ name: 'For partners', url: U.partners }, { name: 'Trades' }),
    title: fitTitle(`${trades.length} Event Trades in Bengaluru`, brand.name),
    description: clamp(`The ${trades.length} trades Sambramo dispatches work to in Bengaluru, from catering and photography to purohits, valet and power hire. Free to join, price on the job before you accept.`),
    eyebrow: 'For suppliers',
    h1: `${trades.length} trades, and the work each one gets`,
    lede: `Sambramo dispatches jobs to ${trades.length} separate trades in Bengaluru. Find yours and see exactly which catalogue lines would reach you.`,
    items: trades.map(t => ({ url: U.trade(t.slug), name: t.name })),
    body: `
<div class="wrap section prose">
  <p><strong>These ${esc(trades.length)} trades are the ones Sambramo's dispatch can match.</strong>
  Each is a genuinely separate business — a bar supplier holds a licence a caterer does not, a
  generator hire firm owns trucks, a purohit is not an entertainer. Folding any of them together
  would broadcast jobs to people who cannot do them, which is how suppliers learn to ignore alerts.</p>
  <p>There is no "Other" on this list, and that is deliberate: dispatch matches on the exact trade,
  so a supplier who picked a vague bucket would produce a listing no job could ever reach.</p>
</div>
<div class="wrap section">
  <div class="grid grid--3">
    ${trades.map(t => `<a class="card" href="${U.trade(t.slug)}">
      <span class="card-title">${esc(t.name)}</span>
      <p class="card-note">${t.services.length ? `${esc(t.services.length)} catalogue service${t.services.length === 1 ? '' : 's'} · ${esc(t.occasions.length)} occasions` : 'Arranged with the coordinator directly'}</p></a>`).join('')}
  </div>
</div>
${waitlistCta({ brand, audience: 'partner', heading: 'Run one of these businesses in Bengaluru?',
  blurb: 'Sambramo is building its supplier network before it opens to customers. Tell us what you do and where, and you will be listed first.' })}`,
  })
}

/* ── HTML sitemap ──────────────────────────────────────────────────────── */

export function sitemapPage(ctx, groups) {
  const { brand, lastmod } = ctx
  const title = fitTitle('Sitemap of Everything on This Site', brand.name)
  const description = `Every page on sambramo.com, grouped: occasions, services, celebration sizes, festivals, coverage, partner trades and legal.`
  return {
    title, description, navCurrent: null,
    crumbs: crumb({ name: 'Sitemap' }),
    body: `
<div class="wrap pagehead">
  <p class="eyebrow">Index</p>
  <h1>Everything on this site</h1>
  <p class="lede">Every page, grouped. Machine-readable versions: <a href="/sitemap.xml">sitemap.xml</a>,
  <a href="/llms.txt">llms.txt</a>, <a href="/llms-full.txt">llms-full.txt</a>.</p>
</div>
<div class="wrap section">
  ${groups.map(g => `<h2>${esc(g.name)} <span class="muted" style="font-size:1rem;font-weight:400">${esc(g.items.length)}</span></h2>
  <ul class="chips">${g.items.map(i => `<li><a class="chip" href="${i.url}">${esc(i.name)}</a></li>`).join('')}</ul>`).join('')}
</div>`,
    schema: S.graph([
      S.webPage({ url: U.sitemapPage, title, description, lastmod }),
      S.breadcrumbList(U.sitemapPage, crumb({ name: 'Sitemap' })),
    ]),
  }
}

/* ── 404 ───────────────────────────────────────────────────────────────── */

export function notFoundPage(ctx) {
  const { brand } = ctx
  return {
    title: fitTitle('Page Not Found', brand.name),
    description: 'That page does not exist on sambramo.com. Browse the occasions Sambramo arranges in Bengaluru, or use the sitemap to find what you were after.',
    navCurrent: null, crumbs: null, schema: null,
    body: `
<div class="wrap pagehead">
  <p class="eyebrow">404</p>
  <h1>That page is not here</h1>
  <p class="lede">It may have moved, or the link may be wrong. These are the places worth trying.</p>
  <div class="btn-row">
    <a class="btn btn--primary" href="${U.occasions}">Browse occasions</a>
    <a class="btn btn--ghost" href="${U.sitemapPage}">See every page</a>
    <a class="btn btn--ghost" href="${U.contact}">Contact us</a>
  </div>
</div>`,
  }
}
