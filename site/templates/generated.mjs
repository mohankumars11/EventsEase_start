/**
 * Service, celebration-size, festival, city and trade pages.
 *
 * All five families follow the occasion page's rule: question-shaped h2s,
 * with the sentence underneath answering the question on its own. They also
 * share its refusal to invent — every count, price and list here is read
 * from content/*.json, which came from the product's own source files.
 */
import { esc, list } from '../lib/html.mjs'
import { U } from '../lib/urls.mjs'
import { inr, band, guests, siblings, clamp, fitTitle } from '../lib/fmt.mjs'
import * as S from '../lib/schema.mjs'
import { waitlistCta } from '../lib/page.mjs'

const crumb = (...t) => [{ name: 'Home', url: U.home }, ...t]

/* ══ Service ═══════════════════════════════════════════════════════════ */

export function servicePage(s, ctx) {
  const { brand, occasions, services, lock } = ctx
  const occ = s.occasions.map(id => occasions.find(o => o.id === id)).filter(Boolean)
  const kin = services.filter(x => x.hasPage && x.category === s.category && x.id !== s.id).slice(0, 6)
  const priced = band(s)
  const perUnit = /\/(plate|seat|head|person|unit|kg|hour|day)/i.test(s.priceHint ?? '')

  const title = fitTitle(`${s.name} in Bengaluru`, brand.name)
  const description = clamp(`${s.name} for celebrations in Bengaluru. ${s.desc}. Sambramo sources it, negotiates the price and coordinates it on the day — as part of a full celebration or on its own.`)

  const qs = [
    { q: `Can I book ${s.name.toLowerCase()} on its own?`,
      a: `Yes. Sambramo arranges ${s.name.toLowerCase()} in Bengaluru as a standalone booking — you do not have to hand over the whole celebration to get it. Booking only the piece you are short of is a normal thing to do here.` },
    { q: `How much does ${s.name.toLowerCase()} cost in Bengaluru?`,
      a: priced
        ? `Indicatively ${priced}${perUnit ? '' : ' for the job'}. That is a real Bengaluru market range rather than a teaser, but it is not a quote — the figure you get back is priced for your date, your venue and your guest count, and it is itemised before you approve anything.`
        : `It depends on the scale of the event. Sambramo prices ${s.name.toLowerCase()} against your date, venue and guest count and itemises it in the proposal, with nothing charged to ask.` },
    { q: `Which occasions include ${s.name.toLowerCase()}?`,
      a: `${occ.length} of the 25 occasions Sambramo arranges include ${s.name.toLowerCase()}${occ.length ? `, among them ${list(occ.slice(0, 5).map(o => o.name.toLowerCase()))}` : ''}. It can be added to any of them.` },
    { q: `Who actually does the work?`,
      a: `A Bengaluru supplier Sambramo has sourced and checked for your date, not a subcontractor you have never heard of. You get one coordinator and one number for the whole celebration; chasing the supplier is Sambramo's job rather than yours.` },
    { q: `Do I pay before ${s.name.toLowerCase()} is confirmed?`,
      a: `No. Nothing is booked and no money moves until you approve the priced plan. Asking costs nothing, needs no card and needs no account. Holding your date and price is ${inr(lock)}, refundable, and it comes off the final bill.` },
  ]

  const body = `
<div class="wrap pagehead">
  <p class="eyebrow">${esc(s.category)} · Bengaluru</p>
  <h1>${esc(s.name)} in Bengaluru</h1>
  <p class="lede">${esc(s.desc)}.</p>
</div>

<div class="wrap section prose">
  <p><strong>Sambramo sources, prices and coordinates ${esc(s.name.toLowerCase())} for celebrations in
  Bengaluru.</strong> ${esc(s.desc)} — sourced from suppliers checked for your date, negotiated on your
  behalf, and itemised in one proposal alongside anything else you need. You can take it on its own
  or as part of a whole celebration.</p>

  ${priced ? `<p class="note"><strong>Indicative price: ${esc(priced)}.</strong>
  ${perUnit ? 'That is a per-unit rate, so the total depends on numbers.' : 'That is a Bengaluru market range for the job.'}
  It is not a quote. Your figure is priced for your date, venue and guest count, and nothing is
  charged to ask for it.</p>` : ''}
</div>

<div class="wrap section">
  <h2>Which celebrations include ${esc(s.name.toLowerCase())}?</h2>
  <p class="lede">${esc(occ.length)} of the 25 occasions Sambramo arranges include ${esc(s.name.toLowerCase())}.
  It can be added to any of the others too.</p>
  <ul class="chips">
    ${occ.map(o => `<li><a class="chip" href="${U.occasion(o.slug)}">${esc(o.name)}</a></li>`).join('')}
  </ul>
</div>

<div class="wrap section">
  <h2>Questions about booking ${esc(s.name.toLowerCase())}</h2>
  <div class="qa">${qs.map(x => `<div><h3>${esc(x.q)}</h3><p>${esc(x.a)}</p></div>`).join('')}</div>
</div>

${waitlistCta({ brand, preset: s.id,
  heading: `Need ${s.name.toLowerCase()} in Bengaluru?`,
  blurb: `Sambramo is opening soon. Tell us the date and what you are planning, and you will be among the first we call.` })}

${kin.length ? `<div class="wrap section">
  <h2>Other ${esc(s.category.toLowerCase())} services</h2>
  <div class="grid grid--3">
    ${kin.map(x => `<a class="card" href="${U.service(x.slug)}">
      <span class="card-title">${esc(x.name)}</span>
      <p class="card-note">${esc(x.desc)}</p></a>`).join('')}
  </div>
  <p style="margin-top:1rem"><a href="${U.services}">All services →</a></p>
</div>` : ''}`

  return {
    title, description, body, navCurrent: 'services',
    crumbs: crumb({ name: 'Services', url: U.services }, { name: s.name }),
    schema: S.graph([
      S.webPage({ url: U.service(s.slug), title, description, lastmod: ctx.lastmod }),
      S.breadcrumbList(U.service(s.slug), crumb({ name: 'Services', url: U.services }, { name: s.name })),
      // No Offer/AggregateOffer: the price bands are internal estimates.
      // See the header of lib/schema.mjs.
      S.service({ url: U.service(s.slug), name: `${s.name} in Bengaluru`, description: s.desc, serviceType: s.category }),
      S.faqPage(U.service(s.slug), qs),
    ]),
  }
}

/* ══ Celebration size ══════════════════════════════════════════════════ */

export function sizePage(t, ctx) {
  const { brand, tiers, services, lock } = ctx
  const byId = new Map(services.map(s => [s.id, s]))
  const inc = (t.includedServices ?? []).map(id => byId.get(id)).filter(Boolean)
  const also = siblings(tiers, t.id, 4)
  const m = t.menuAllowance

  const title = fitTitle(`${t.name} — a ${guests(t.guests)} celebration`, brand.name)
  const description = clamp(`${t.name}: a ${guests(t.guests)} celebration in Bengaluru. ${t.tagline}. Coordination fee ${inr(t.coordinationFee)}, with vendor costs quoted separately and itemised before you approve.`)

  const qs = [
    { q: `How many guests is ${t.name} for?`,
      a: `${t.name}${t.localName ? `, or ${t.localName},` : ''} is built for ${guests(t.guests)}, and typically lands around ${t.guests?.typical ?? t.guests?.min}. If your number sits between two sizes, Sambramo prices the one your celebration actually needs rather than rounding you up.` },
    { q: `What does the ${inr(t.coordinationFee)} coordination fee cover?`,
      a: `${t.coordination}. It is what Sambramo charges to run a celebration of this size — sourcing every vendor, negotiating each price, and being the single number you call. Vendor costs are quoted on top and itemised line by line, so nothing is folded into the fee where you cannot see it.` },
    inc.length ? { q: `What is included at ${t.name}?`,
      a: `${list(inc.map(s => s.name.toLowerCase()))} are part of this size. ${t.onSiteManager ? 'An on-site manager runs the day itself.' : 'Anything else you want is added as a priced line you can remove.'}` } : null,
    { q: `Can I change the plan once it is priced?`,
      a: `Yes, and as many times as you like. Nothing is booked until you approve it, and no vendor is held before then. Holding your date and price while you decide is ${inr(lock)}, refundable, and it comes off the final bill.` },
  ].filter(Boolean)

  const body = `
<div class="wrap pagehead">
  <p class="eyebrow">Celebration size · Bengaluru</p>
  <h1>${esc(t.name)}${t.localName ? ` <span class="muted" style="font-weight:600">· ${esc(t.localName)}</span>` : ''}</h1>
  <p class="lede">${esc(t.tagline)} — ${esc(guests(t.guests))}.</p>
</div>

<div class="wrap section prose">
  <p><strong>${esc(t.name)} is Sambramo's ${esc(guests(t.guests))} celebration size in Bengaluru, with a
  coordination fee of ${esc(inr(t.coordinationFee))}.</strong> ${esc(t.description)}</p>
  <p>${esc(t.coordination)}. Vendor costs — venue, food, decor, photography — are sourced, negotiated
  and quoted separately, then itemised in one proposal you approve before anything is booked.</p>
</div>

${inc.length ? `<div class="wrap section">
  <h2>What is included at ${esc(t.name)}?</h2>
  <p class="lede">${esc(list(inc.map(s => s.name)))} are part of this size.</p>
  <div class="grid grid--3">
    ${inc.map(s => s.hasPage
      ? `<a class="card" href="${U.service(s.slug)}"><span class="card-title">${esc(s.name)}</span><p class="card-note">${esc(s.desc)}</p></a>`
      : `<div class="card"><span class="card-title">${esc(s.name)}</span><p class="card-note">${esc(s.desc)}</p></div>`).join('')}
  </div>
</div>` : ''}

${m ? `<div class="wrap section">
  <h2>How big is the menu at ${esc(t.name)}?</h2>
  <p class="lede">The menu allowance at this size is set out below, and it is a floor rather than a
  cap — you can add to it, and the added lines are priced where you can see them.</p>
  <div class="table-scroll"><table>
    <thead><tr><th scope="col">Course</th><th scope="col" class="num">Choices</th></tr></thead>
    <tbody>${Object.entries(m).map(([k, v]) =>
      `<tr><th scope="row" style="text-transform:capitalize;color:var(--ink);font-size:.9375rem;letter-spacing:0">${esc(k)}</th><td class="num">${esc(v)}</td></tr>`).join('')}</tbody>
  </table></div>
</div>` : ''}

${t.highlights?.length ? `<div class="wrap section">
  <h2>What makes ${esc(t.name)} different</h2>
  <ul class="prose">${t.highlights.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
</div>` : ''}

<div class="wrap section">
  <h2>Questions about ${esc(t.name)}</h2>
  <div class="qa">${qs.map(x => `<div><h3>${esc(x.q)}</h3><p>${esc(x.a)}</p></div>`).join('')}</div>
</div>

${waitlistCta({ brand, preset: t.id,
  heading: `Planning something around ${guests(t.guests).replace(' guests', ' people')}?`,
  blurb: `Sambramo is opening soon in Bengaluru. Tell us the date and the occasion and you will be among the first we call.` })}

<div class="wrap section">
  <h2>Other celebration sizes</h2>
  <div class="grid grid--2">
    ${also.map(x => `<a class="card" href="${U.size(x.slug)}">
      <span class="card-title">${esc(x.name)}${x.localName ? ` · ${esc(x.localName)}` : ''}</span>
      <p class="card-note">${esc(x.tagline)} — ${esc(guests(x.guests))}</p>
      <p class="card-price">${esc(inr(x.coordinationFee))} coordination</p></a>`).join('')}
  </div>
  <p style="margin-top:1rem"><a href="${U.sizes}">Compare all sizes →</a></p>
</div>`

  return {
    title, description, body, navCurrent: 'costs',
    crumbs: crumb({ name: 'Celebration sizes', url: U.sizes }, { name: t.name }),
    schema: S.graph([
      S.webPage({ url: U.size(t.slug), title, description, lastmod: ctx.lastmod }),
      S.breadcrumbList(U.size(t.slug), crumb({ name: 'Celebration sizes', url: U.sizes }, { name: t.name })),
      S.service({ url: U.size(t.slug), name: t.name, description: t.description, serviceType: 'Event planning',
                  offers: S.tierCatalog([t]) }),
      S.faqPage(U.size(t.slug), qs),
    ]),
  }
}

/* ══ Festival ══════════════════════════════════════════════════════════ */

export function festivalPage(f, ctx) {
  const { brand, festivals } = ctx
  const also = siblings(festivals, f.id, 4)

  const title = fitTitle(`${f.name} in Bengaluru`, brand.name)
  const description = clamp(`${f.name}: ${f.tagline}. What it is, when it falls, the rituals and the food — and how Sambramo arranges a ${f.name} celebration in Bengaluru, end to end.`)

  const qs = [
    { q: `When is ${f.name} celebrated?`, a: `${f.name} falls in ${f.month} and runs ${f.duration}. ${f.emotionalHook}` },
    { q: `What happens at ${f.name}?`, a: `${f.description}` },
    { q: `Can Sambramo arrange a ${f.name} celebration in Bengaluru?`,
      a: `Yes. Sambramo arranges ${f.name} celebrations in Bengaluru end to end — one coordinator sources the catering, the decor, the priest and anything else the day needs, negotiates each price, and brings it back as one itemised proposal. Nothing is booked until you approve it.` },
  ]

  const body = `
<div class="wrap pagehead">
  <p class="eyebrow">Festival · ${esc(f.month)} · ${esc(f.duration)}</p>
  <h1>${esc(f.name)}</h1>
  <p class="lede">${esc(f.tagline)}.</p>
</div>

<div class="wrap section prose">
  <p>${esc(f.description)}</p>
  <p class="soft">${esc(f.emotionalHook)}</p>
  <p class="muted" style="font-size:.875rem">Celebrated: ${esc(f.region)} · Falls in ${esc(f.month)} · Lasts ${esc(f.duration)}</p>
</div>

${f.rituals?.length ? `<div class="wrap section">
  <h2>What are the rituals of ${esc(f.name)}?</h2>
  <p class="lede">${esc(f.name)} is marked by ${esc(f.rituals.length)} main observances, set out below.</p>
  <div class="grid grid--2">
    ${f.rituals.map(r => `<div class="card">
      <span class="card-title">${esc(r.name)}</span>
      ${r.timing ? `<p class="card-note"><strong>${esc(r.timing)}</strong></p>` : ''}
      <p class="card-note">${esc(r.description)}</p></div>`).join('')}
  </div>
</div>` : ''}

${f.foods?.length ? `<div class="wrap section">
  <h2>What food is made at ${esc(f.name)}?</h2>
  <p class="lede">${esc(list(f.foods.slice(0, 5).map(x => x.name)))}${f.foods.length > 5 ? ', among others' : ''} — the dishes a ${esc(f.name)} table is expected to carry.</p>
  <div class="grid grid--3">
    ${f.foods.map(x => `<div class="card">
      <span class="card-title">${esc(x.name)}</span>
      ${x.category ? `<p class="card-note"><span class="badge">${esc(x.category)}</span></p>` : ''}
      <p class="card-note">${esc(x.description)}</p></div>`).join('')}
  </div>
</div>` : ''}

${f.menuPackages?.length ? `<div class="wrap section">
  <h2>What does ${esc(f.name)} catering cost in Bengaluru?</h2>
  <p class="lede">Three spreads, priced indicatively. Your figure comes back priced for your date and
  your numbers, and nothing is charged to ask.</p>
  <div class="grid grid--3">
    ${f.menuPackages.map(p => `<div class="card">
      <span class="card-title">${esc(p.name)}</span>
      <p class="card-price">${esc(p.price)}</p>
      ${p.items?.length ? `<p class="card-note">${esc(list(p.items))}</p>` : ''}</div>`).join('')}
  </div>
  <p class="note" style="margin-top:1rem">Indicative ranges, not quotes.</p>
</div>` : ''}

${f.services?.length ? `<div class="wrap section">
  <h2>What does Sambramo arrange for ${esc(f.name)}?</h2>
  <p class="lede">For a ${esc(f.name)} celebration in Bengaluru, Sambramo sources and coordinates the following.</p>
  <ul class="chips">${f.services.map(x => `<li><span class="chip">${esc(x)}</span></li>`).join('')}</ul>
</div>` : ''}

${f.customizationOptions?.length ? `<div class="wrap section">
  <h2>What can be changed?</h2>
  <ul class="prose">${f.customizationOptions.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
</div>` : ''}

<div class="wrap section">
  <h2>Questions about ${esc(f.name)}</h2>
  <div class="qa">${qs.map(x => `<div><h3>${esc(x.q)}</h3><p>${esc(x.a)}</p></div>`).join('')}</div>
</div>

${waitlistCta({ brand, preset: `festival-${f.id}`,
  heading: `Planning ${f.name} in Bengaluru?`,
  blurb: `Sambramo is opening soon. Tell us what you are planning and you will be among the first we call — with time to do it properly.` })}

<div class="wrap section">
  <h2>Other festivals</h2>
  <div class="grid grid--2">
    ${also.map(x => `<a class="card" href="${U.festival(x.slug)}">
      <span class="card-title">${esc(x.name)}</span>
      <p class="card-note">${esc(x.tagline)}</p></a>`).join('')}
  </div>
  <p style="margin-top:1rem"><a href="${U.festivals}">All festivals →</a></p>
</div>`

  return {
    title, description, body, ogType: 'article', navCurrent: null,
    crumbs: crumb({ name: 'Festivals', url: U.festivals }, { name: f.name }),
    schema: S.graph([
      S.webPage({ url: U.festival(f.slug), title, description, lastmod: ctx.lastmod }),
      S.breadcrumbList(U.festival(f.slug), crumb({ name: 'Festivals', url: U.festivals }, { name: f.name })),
      S.article({ url: U.festival(f.slug), name: `${f.name} — rituals, food and celebration`, description, lastmod: ctx.lastmod }),
      S.faqPage(U.festival(f.slug), qs),
    ]),
  }
}

/* ══ City ══════════════════════════════════════════════════════════════ */

export function cityPage(c, ctx) {
  const { brand, occasions, tiers, services, legal, lock } = ctx
  const low = tiers[0], high = tiers[tiers.length - 1]

  const title = fitTitle(`Event Planning in ${c.name}`, brand.name)
  const description = clamp(`Sambramo arranges celebrations across ${c.name}: ${occasions.length} occasions, ${services.length} services, one coordinator and one itemised price. Nothing booked until you approve it.`)

  const qs = [
    { q: `Does Sambramo cover the whole of ${c.name}?`,
      a: `Yes. ${c.coverage} The areas people ask about most are ${list(c.knownAreas)}, but coverage is city-wide and that list is orientation rather than a boundary.` },
    { q: `Is Sambramo available outside ${c.name}?`,
      a: `Not yet. ${c.name} is the only city Sambramo serves. If you are planning somewhere else you will be told so plainly rather than strung along, and you can leave your city so you hear first when it opens.` },
    { q: `What can Sambramo arrange in ${c.name}?`,
      a: `${occasions.length} occasions and ${services.length} individual services, from a purohit for a Thursday morning to a wedding for several hundred. You can hand over the whole day or book the single piece you are short of.` },
    { q: `How much does a celebration in ${c.name} cost?`,
      a: `Sambramo's coordination fee runs ${inr(low.coordinationFee)} for ${guests(low.guests)} up to ${inr(high.coordinationFee)} at the largest size. Vendor costs are sourced, negotiated and itemised separately, and the total you approve is the total you pay. Asking costs nothing.` },
    { q: `Do you speak Kannada?`,
      a: `Yes — English, Kannada and Hindi. Coordination happens in whichever of those you would rather use.` },
  ]

  const body = `
<div class="wrap pagehead">
  <p class="eyebrow">${esc(c.state)}, India</p>
  <h1>Event planning in ${esc(c.name)}</h1>
  <p class="lede">${esc(c.coverage)}</p>
</div>

<div class="wrap section prose">
  <p><strong>Sambramo arranges complete celebrations across ${esc(c.name)}.</strong> You describe the
  occasion; one coordinator sources every vendor, negotiates each price and brings the whole thing
  back as a single itemised proposal. ${esc(occasions.length)} occasions, ${esc(services.length)} services,
  and nothing booked until you approve it.</p>
  <p>${esc(c.name)} is the only city Sambramo serves today${c.aliases?.length ? ` — also spelt ${esc(list(c.aliases.filter(a => a !== c.name), 'or'))}` : ''}.
  That is deliberate: a coordinator who knows which halls in ${esc(c.name)} have a sound cut-off, and
  which caterers actually turn up, is worth more than a directory covering thirty cities badly.</p>
</div>

<div class="wrap section">
  <h2>Which areas of ${esc(c.name)} does Sambramo cover?</h2>
  <p class="lede">The whole city. ${esc(c.coverage)}</p>
  <p>The neighbourhoods people ask about most are ${esc(list(c.knownAreas))} — that is orientation, not
  a whitelist. If your venue is somewhere not on that list, it is still covered.</p>
</div>

<div class="wrap section">
  <h2>What occasions does Sambramo arrange in ${esc(c.name)}?</h2>
  <p class="lede">All ${esc(occasions.length)}, from a naming ceremony for twenty to a wedding for several hundred.</p>
  <div class="grid grid--4">
    ${occasions.map(o => `<a class="card" href="${U.occasion(o.slug)}">
      <span class="card-title">${esc(o.name)}</span>
      <p class="card-note">${esc(o.tagline)}</p></a>`).join('')}
  </div>
</div>

<div class="wrap section">
  <h2>What does a celebration in ${esc(c.name)} cost?</h2>
  <p class="lede">Sambramo's coordination fee runs ${esc(inr(low.coordinationFee))} to ${esc(inr(high.coordinationFee))}
  depending on size. Vendor costs are quoted on top, itemised, and approved by you before anything is booked.</p>
  <div class="table-scroll"><table>
    <thead><tr><th scope="col">Size</th><th scope="col">Guests</th><th scope="col" class="num">Coordination fee</th></tr></thead>
    <tbody>${tiers.map(t => `<tr>
      <th scope="row" style="color:var(--ink);font-size:.9375rem;letter-spacing:0;text-transform:none"><a href="${U.size(t.slug)}">${esc(t.name)}</a></th>
      <td>${esc(guests(t.guests))}</td><td class="num money">${esc(inr(t.coordinationFee))}</td></tr>`).join('')}</tbody>
  </table></div>
  <p><a href="${U.whatItCosts}">How Sambramo prices a celebration →</a></p>
</div>

<div class="wrap section">
  <h2>Questions about Sambramo in ${esc(c.name)}</h2>
  <div class="qa">${qs.map(x => `<div><h3>${esc(x.q)}</h3><p>${esc(x.a)}</p></div>`).join('')}</div>
</div>

${waitlistCta({ brand, preset: c.slug,
  heading: `Planning something in ${c.name}?`,
  blurb: `Sambramo is opening soon. Leave the date and the occasion and you will be among the first we call — ${inr(lock)} holds a date and a price once we are live, and it is refundable.` })}`

  return {
    title, description, body, navCurrent: null,
    crumbs: crumb({ name: 'Cities', url: U.cities }, { name: c.name }),
    schema: S.graph([
      S.webPage({ url: U.city(c.slug), title, description, lastmod: ctx.lastmod }),
      S.breadcrumbList(U.city(c.slug), crumb({ name: 'Cities', url: U.cities }, { name: c.name })),
      S.professionalService(brand, c, legal),
      S.itemList(U.city(c.slug), occasions.map(o => ({ url: U.occasion(o.slug), name: o.name }))),
      S.faqPage(U.city(c.slug), qs),
    ]),
  }
}

/* ══ Partner trade ═════════════════════════════════════════════════════ */

export function tradePage(t, ctx) {
  const { brand, services, occasions, trades } = ctx
  const byId = new Map(services.map(s => [s.id, s]))
  const own = t.services.map(id => byId.get(id)).filter(Boolean)
  const occ = t.occasions.map(id => occasions.find(o => o.id === id)).filter(Boolean)
  const also = siblings(trades, t.slug, 6, 'slug')

  const title = fitTitle(`${t.name} Work in Bengaluru`, brand.name)
  const description = clamp(`Work as a ${t.name.toLowerCase()} supplier in Bengaluru. Sambramo sends jobs near you with the price on them before you accept, and pays once the event is done. Free to join.`)

  const qs = [
    { q: `How does Sambramo send ${t.name.toLowerCase()} work?`,
      a: `Jobs are dispatched to suppliers within the distance you set, with the price on the job before you accept it. You see exactly what you earn, in rupees, and nothing is added afterwards or billed to you.` },
    own.length ? { q: `What ${t.name.toLowerCase()} services does Sambramo book?`,
      a: `${own.length} in this trade: ${list(own.map(s => s.name.toLowerCase()))}. Those are the catalogue lines dispatch will match you to, so listing accurately is what decides which jobs reach you.` } : null,
    occ.length ? { q: `Which celebrations would I get work from?`,
      a: `${occ.length} of the 25 occasions Sambramo arranges need a ${t.name.toLowerCase()} — among them ${list(occ.slice(0, 5).map(o => o.name.toLowerCase()))}.` } : null,
    { q: `What does it cost to join?`,
      a: `Nothing to join and nothing monthly while the Bengaluru network is being built. Sambramo's share is already taken out of the earning shown on the job — never billed to you, and set out in full in the terms you sign.` },
    { q: `Do I have to accept every job?`,
      a: `No. Block the days you are busy and nothing is offered on them; decline anything you do not want, with no penalty. Your calendar stays yours.` },
    { q: `When do I get paid?`,
      a: `Once the event is done. The customer pays up front and Sambramo holds it, so the money exists before you set out.` },
  ].filter(Boolean)

  const body = `
<div class="wrap pagehead">
  <p class="eyebrow">For suppliers · Bengaluru</p>
  <h1>${esc(t.name)} work in Bengaluru</h1>
  <p class="lede">Jobs near you, with the price on them before you accept.</p>
</div>

<div class="wrap section prose">
  <p><strong>Sambramo sends ${esc(t.name.toLowerCase())} jobs to suppliers in Bengaluru, with the earning
  shown in rupees before you accept.</strong> We only dispatch within the distance you set, your calendar
  stays yours, and payment reaches you once the event is completed. Free to join, free to stay while
  the Bengaluru network is being built.</p>
  <div class="btn-row">
    <a class="btn btn--primary" href="${U.partnerJoin}?for=${esc(t.slug)}">Get listed before we open</a>
    <a class="btn btn--ghost" href="https://wa.me/${esc(brand.whatsapp)}">Ask on WhatsApp</a>
  </div>
</div>

${own.length ? `<div class="wrap section">
  <h2>What ${esc(t.name.toLowerCase())} services does Sambramo book?</h2>
  <p class="lede">${esc(own.length)} catalogue lines sit under this trade. These are exactly what dispatch will match you to.</p>
  <div class="grid grid--3">
    ${own.map(s => s.hasPage
      ? `<a class="card" href="${U.service(s.slug)}"><span class="card-title">${esc(s.name)}</span><p class="card-note">${esc(s.desc)}</p>${band(s) ? `<p class="card-price">${esc(band(s))}</p>` : ''}</a>`
      : `<div class="card"><span class="card-title">${esc(s.name)}</span><p class="card-note">${esc(s.desc)}</p></div>`).join('')}
  </div>
</div>` : `<div class="wrap section">
  <h2>How ${esc(t.name.toLowerCase())} fits in</h2>
  <p class="lede">${esc(t.name)} work is arranged directly with the coordinator rather than dispatched
  as a single catalogue line, because it spans the whole celebration rather than one part of it.</p>
</div>`}

${occ.length ? `<div class="wrap section">
  <h2>Which celebrations need a ${esc(t.name.toLowerCase())}?</h2>
  <p class="lede">${esc(occ.length)} of the 25 occasions Sambramo arranges.</p>
  <ul class="chips">${occ.map(o => `<li><a class="chip" href="${U.occasion(o.slug)}">${esc(o.name)}</a></li>`).join('')}</ul>
</div>` : ''}

<div class="wrap section">
  <h2>Questions from ${esc(t.name.toLowerCase())} suppliers</h2>
  <div class="qa">${qs.map(x => `<div><h3>${esc(x.q)}</h3><p>${esc(x.a)}</p></div>`).join('')}</div>
</div>

${waitlistCta({ brand, preset: t.slug, audience: 'partner',
  heading: `Do ${t.name.toLowerCase()} work in Bengaluru?`,
  blurb: `Sambramo is building its supplier network now. Tell us what you do and where, and you will be listed before we open to customers.` })}

<div class="wrap section">
  <h2>Other trades</h2>
  <ul class="chips">${also.map(x => `<li><a class="chip" href="${U.trade(x.slug)}">${esc(x.name)}</a></li>`).join('')}</ul>
  <p style="margin-top:1rem"><a href="${U.trades}">All 26 trades →</a></p>
</div>`

  return {
    title, description, body, navCurrent: 'partners',
    crumbs: crumb({ name: 'For partners', url: U.partners }, { name: 'Trades', url: U.trades }, { name: t.name }),
    schema: S.graph([
      S.webPage({ url: U.trade(t.slug), title, description, lastmod: ctx.lastmod }),
      S.breadcrumbList(U.trade(t.slug), crumb({ name: 'For partners', url: U.partners }, { name: 'Trades', url: U.trades }, { name: t.name })),
      // Deliberately not JobPosting: this is a supplier invitation, not
      // employment, and bogus JobPosting markup is a manual-action risk.
      S.faqPage(U.trade(t.slug), qs),
    ]),
  }
}
