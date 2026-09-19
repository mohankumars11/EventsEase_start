/**
 * One page per occasion. 25 of them, and they are the commercial spine of
 * the site.
 *
 * WHY THERE IS NO /occasions/<id>/bengaluru/
 *
 * Bengaluru is the only market, so the occasion page IS the Bengaluru page.
 * The h1, the title, the first sentence and the FAQs all name the city, and
 * Service.areaServed is a single City. Splitting that into a second URL
 * would give two near-identical pages competing for one intent — and
 * retrieval systems deduplicate near-identical passages before ranking
 * them, so you would pay twice and get cited once, worse.
 *
 * THE H2 RULE
 *
 * Every h2 below is a question somebody types, and the sentence directly
 * under it answers that question completely — naming Sambramo, the category
 * and the city — without needing anything else on the page. That is what a
 * passage-level retriever can lift and quote. It is the single highest
 * leverage thing on this entire site.
 */
import { h, esc, raw, list } from '../lib/html.mjs'
import { U, abs } from '../lib/urls.mjs'
import { inr, band, guests, siblings, clamp, fitTitle, article, plural, short } from '../lib/fmt.mjs'
import * as S from '../lib/schema.mjs'
import { waitlistCta, photo } from '../lib/page.mjs'

/** Services grouped by their catalogue category, in catalogue order. */
function grouped(ids, byId) {
  const out = new Map()
  for (const id of ids) {
    const s = byId.get(id)
    if (!s) continue
    if (!out.has(s.category)) out.set(s.category, [])
    out.get(s.category).push(s)
  }
  return [...out.entries()]
}

/**
 * Five to seven questions per occasion, all answerable from real data.
 *
 * Nothing here is invented. Counts come from the occasion's own service
 * list, money from celebrationTiers.js, the ₹1,000 hold from LOCK_AMOUNT,
 * and the "nothing is booked until you approve" promise from the product's
 * own commitments. If a question could only be answered by making something
 * up, it is not asked.
 */
function faqs(o, svc, tiers, lock, brand, N) {
  const cheapest = tiers[0]
  const mid = tiers.find(t => t.popular) ?? tiers[2] ?? tiers[0]
  const names = svc.slice(0, 6).map(s => s.name.toLowerCase())
  const q = []

  q.push({
    q: `Who arranges ${N.one} in Bengaluru?`,
    a: `Sambramo arranges ${N.bare} celebrations in Bengaluru end to end. One coordinator sources every vendor you need — ${list(names.slice(0, 4))} — negotiates each price, and brings the whole thing back to you as one itemised proposal. You are not handed a directory and left to make the calls yourself.`,
  })

  q.push({
    q: `What does Sambramo arrange for ${N.one}?`,
    a: `${svc.length} services, and you can take all of them or one. For ${N.one} in Bengaluru that covers ${list(names)}, among others. Booking only the photographer, or only the caterer, is a normal thing to do — Sambramo sources each one separately and quotes it at what it actually costs.`,
  })

  q.push({
    q: `How much does ${N.one} cost in Bengaluru?`,
    a: `It depends almost entirely on how many people are coming and what you want on the day. Sambramo charges one coordination fee and every vendor cost — venue, food, decor, photography — is quoted separately and itemised in full before you approve anything, so the number you approve is the number you pay. The app returns a real figure for your date, and asking costs nothing.`,
  })

  q.push({
    q: `Do I have to pay anything to get ${N.one} quote?`,
    a: `No. Asking Sambramo to price ${N.one} costs nothing and needs no card and no account. If you want to hold your date and your price while you decide, that is ${inr(lock)}, it comes off the final bill, and it comes back if you walk away.`,
  })

  q.push({
    q: `Can I change the plan after Sambramo sends it?`,
    a: `Yes, as many times as you like, and nothing is booked until you say yes. The proposal arrives as a list with every line priced — swap the menu, move the stage, cut anything you do not want. No vendor is held and no money moves before you approve it.`,
  })

  q.push({
    q: `Who do I call if something goes wrong on the day?`,
    a: `Sambramo. One coordinator handles your ${N.bare} from the first call to the last guest, and whoever was booked, chasing them is Sambramo's job rather than your family's. The number is ${brand.supportPhone}, ${brand.hours.toLowerCase()}.`,
  })

  if (mid && mid.includedServices?.length) {
    q.push({
      q: `What is included at ${mid.name} size?`,
      a: `${mid.name}${mid.localName ? ` (${mid.localName})` : ''} is built for ${guests(mid.guests)} and includes ${list(mid.includedServices.map(id => (svc.find(s => s.id === id)?.name ?? id).toLowerCase()))}. ${mid.coordination}.`,
    })
  }

  return q
}

/* Which photograph an occasion page gets.
 *
 * Chosen from the occasion's own service list rather than assigned by hand,
 * so a page about a thread ceremony shows a ritual and a page about a
 * reception shows a hall — and adding a 26th occasion does not mean
 * remembering to add a 26th line to a lookup table. First match wins, and
 * the order is deliberate: a ritual is more distinctive than catering, and
 * catering is more distinctive than a venue. */
const PICTURE_FOR = [
  ['rituals', ['pandit', 'priest', 'pooja']],
  ['mehendi', ['mehendi']],
  ['music', ['drum', 'live_music', 'folk', 'baraat']],
  ['photography', ['photography', 'videography', 'drone']],
  ['decor', ['mandap', 'floral', 'stage']],
  ['catering', ['catering', 'cooks', 'live_counters']],
  ['venue', ['venue']],
]
const pictureFor = o => (PICTURE_FOR.find(([, ids]) => ids.some(id => o.services.includes(id))) ?? ['decor'])[0]

export function occasionPage(o, ctx) {
  const { brand, services, tiers, lock, occasions, cities } = ctx
  const byId = new Map(services.map(s => [s.id, s]))
  const svc = o.services.map(id => byId.get(id)).filter(Boolean)
  const groups = grouped(o.services, byId)
  const city = cities[0]
  /* The occasion name three ways. `full` is the label, for the h1 and the
     title, where both halves of "Aksharabhyasa / Vidyarambham" belong
     because somebody searches for either. `one` and `many` are the prose
     forms — a slash inside a sentence reads as a typo, and "a" before a
     vowel or a bare +s plural is what shipped the first time round. */
  const nm = short(o.name).toLowerCase()
  const N = { full: o.name, one: `${article(nm)} ${nm}`, bare: nm, many: plural(nm).toLowerCase() }
  const qs = faqs(o, svc, tiers, lock, brand, N)
  const also = siblings(occasions, o.id, 6)
  const low = tiers[0], high = tiers[tiers.length - 1]

  const title = fitTitle(`${o.name} Planning in Bengaluru`, brand.name)
  const description = clamp(
    `${N.full} celebrations in Bengaluru, arranged end to end. One coordinator sources ${svc.length} services, negotiates every price, and brings back one itemised quote. Nothing booked until you approve it.`)

  const body = `
<div class="wrap pagehead">
  <p class="eyebrow">Occasion · Bengaluru</p>
  <h1>${esc(o.name)} planning in Bengaluru</h1>
  <p class="lede">${esc(o.tagline)}.</p>
</div>

<div class="wrap section prose">
  <p><strong>Sambramo arranges ${esc(N.bare)} celebrations in Bengaluru, end to end.</strong>
  ${esc(o.description)} You describe what you are planning; one coordinator sources every vendor,
  negotiates each price and brings the whole thing back as a single itemised proposal. Nothing is
  booked and nothing is charged until you approve it.</p>
</div>

<div class="wrap section">
  ${photo(pictureFor(o), { alt: `${N.full} in Bengaluru, arranged end to end`, className: 'band' })}
  <h2 id="what">What does Sambramo arrange for ${esc(N.one)}?</h2>
  <p class="lede">${esc(svc.length)} services, across ${esc(groups.length)} categories — and you can take
  all of them or just one.</p>

  ${groups.map(([cat, items]) => `
  <h3>${esc(cat)}</h3>
  <div class="grid grid--3">
    ${items.map(s => s.hasPage
      ? `<a class="card" href="${U.service(s.slug)}">
           <span class="card-title">${esc(s.name)}</span>
           <p class="card-note">${esc(s.desc)}</p>
         </a>`
      : `<div class="card">
           <span class="card-title">${esc(s.name)}</span>
           <p class="card-note">${esc(s.desc)}</p>
         </div>`).join('')}
  </div>`).join('')}

  <p class="note" style="margin-top:1.5rem"><strong>Take all of it, or one piece.</strong>
  Booking only the photographer, or only the caterer, is a normal thing to do here.
  <a href="${U.customerApp}">Explore these in the Sambramo app</a>.</p>
</div>

<div class="wrap section">
  <h2 id="cost">How much does ${esc(N.one)} cost in Bengaluru?</h2>
  <p class="lede">It depends almost entirely on how many people are coming. Sambramo charges one
  coordination fee, and every vendor cost is quoted separately and itemised before you approve it.</p>
  <p>There is no single figure worth printing here — a ${esc(N.bare)} for twenty and one for three
  hundred are different jobs. <a href="${U.whatItCosts}">How a Sambramo price is built</a> sets out
  the model, and the app returns a real number for your date and your guest count. Nothing is charged
  to ask for it.</p>
  <div class="btn-row">
    <a class="btn btn--primary" href="${U.customerApp}">Get a price in the app</a>
    <a class="btn btn--ghost" href="${U.whatItCosts}">How pricing works</a>
  </div>
</div>

<div class="wrap section">
  <h2 id="where">Where in Bengaluru does Sambramo run ${esc(N.many)}?</h2>
  <p class="lede">Across the whole city. ${esc(city.coverage)}</p>
  <p>The areas people ask about most are ${esc(list(city.knownAreas))} — but coverage is city-wide,
  and those are orientation rather than a whitelist. Bengaluru is the only city Sambramo serves today.
  If you are somewhere else, say so and you will get a straight answer rather than a maybe.</p>
  <p><a href="${U.city(city.slug)}">Everything Sambramo does in Bengaluru →</a></p>
</div>

<div class="wrap section">
  <h2 id="faq">Questions people ask about ${esc(N.many)}</h2>
  <div class="qa">
    ${qs.map(x => `<div><h3>${esc(x.q)}</h3><p>${esc(x.a)}</p></div>`).join('')}
  </div>
</div>

${waitlistCta({
  brand,
  heading: `Planning ${N.one} in Bengaluru?`,
  blurb: `Sambramo is opening soon. Tell us the date and roughly how many people, and you will be among the first we call — with a real price, not a brochure.`,
  preset: o.id,
})}

<div class="wrap section">
  <h2>Other occasions Sambramo arranges</h2>
  <div class="grid grid--3">
    ${also.map(x => `<a class="card" href="${U.occasion(x.slug)}">
      <span class="card-title">${esc(x.name)}</span>
      <p class="card-note">${esc(x.tagline)}</p></a>`).join('')}
  </div>
  <p style="margin-top:1rem"><a href="${U.occasions}">All 25 occasions →</a></p>
</div>`

  const schema = S.graph([
    S.webPage({ url: U.occasion(o.slug), title, description, lastmod: ctx.lastmod }),
    S.breadcrumbList(U.occasion(o.slug), [
      { name: 'Home', url: U.home },
      { name: 'Occasions', url: U.occasions },
      { name: o.name },
    ]),
    S.service({
      url: U.occasion(o.slug),
      name: `${o.name} planning in Bengaluru`,
      description: o.description,
      serviceType: `${o.name} planning`,
    }),
    S.faqPage(U.occasion(o.slug), qs),
  ])

  return {
    title, description, body, schema,
    navCurrent: 'occasions',
    crumbs: [{ name: 'Home', url: U.home }, { name: 'Occasions', url: U.occasions }, { name: o.name }],
  }
}
