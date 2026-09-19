/**
 * The hand-written pages.
 *
 * These are functions rather than Markdown files with a parser. The plan
 * called for pages/*.md plus a small md.mjs; writing them as functions
 * removes a parser I would have to test and lets every number interpolate
 * straight out of content/*.json, which is the property that matters. The
 * prose is still prose — it just lives next to the data it quotes.
 *
 * WHERE THIS COPY COMES FROM
 *
 * Most of it is adapted from the product's own surfaces, which are better
 * written than anything invented for a marketing site would be:
 * EventFooter.jsx (the four commitments and the five-step journey),
 * DoorstepFilm.jsx (the ₹1,000 hold story), PromiseTicker.jsx, the two-door
 * comparison in ChooseLane.jsx, PartnerLanding.jsx and config/membership.js.
 *
 * Every one of them was EDITED, not pasted. The app says "Bengaluru &
 * Mysore" in three places and Sambramo serves Bengaluru only; the app links
 * to flows that have not shipped. check-claims.mjs fails the build if a
 * second city or an unverifiable superlative survives.
 */
import { esc, list } from '../lib/html.mjs'
import { U } from '../lib/urls.mjs'
import { inr, guests, clamp, fitTitle } from '../lib/fmt.mjs'
import * as S from '../lib/schema.mjs'
import { waitlistCta, photo } from '../lib/page.mjs'

const crumb = (...t) => [{ name: 'Home', url: U.home }, ...t]

/* The four commitments, from EventFooter.jsx. */
export const COMMITMENTS = [
  ['Nothing is booked until you approve it',
   'You see the priced plan first. No vendor is held, and no money moves, before you say yes.'],
  ['One coordinator, first call to last guest',
   'The same person throughout — not a ticket queue and not a different name every week.'],
  ['One number when something goes wrong',
   'Whoever we booked, you call us. Chasing the decorator is our job, not your family’s.'],
  ['The price you approve is the price you pay',
   'Every line itemised — food, decor, coordination, our fee and the tax on each. No day-of surprises.'],
]

/* The five steps, from EventFooter.jsx's JOURNEY. */
export const JOURNEY = [
  ['You tell us the shape of it', 'Occasion, date, rough headcount. Two minutes, and no account needed.'],
  ['A coordinator calls you back', 'A real person, to hear what you actually want before anything is priced.'],
  ['One plan, one price', 'Every line laid out. Change anything, as many times as you like.'],
  ['Hold it if you want to', 'A refundable deposit holds your quote and your date. It is adjusted against the final bill, and it comes back if you walk away.'],
  ['We run the day', 'Setup, vendors, timings and clearing. You are a guest at your own celebration.'],
]

/* ══ Home ══════════════════════════════════════════════════════════════ */

export function homePage(ctx) {
  const { brand, occasions, services, tiers, festivals, trades, lock, lastmod } = ctx
  const live = services.filter(s => s.hasPage)
  const low = tiers[0], high = tiers[tiers.length - 1]

  const title = `${brand.name} — Celebrations Arranged, in Bengaluru`
  const description = clamp(`${brand.descriptor} ${occasions.length} occasions, ${live.length} services, one coordinator and one itemised price. Nothing is booked until you approve it.`)

  const qs = [
    { q: 'What is Sambramo?',
      a: `${brand.descriptor} You describe what you are celebrating; one coordinator sources every vendor the day needs, negotiates each price, and brings the whole thing back as a single itemised proposal. It is not a directory you have to phone yourself, and it is not a marketplace where you pick vendors blind.` },
    { q: 'Where does Sambramo operate?',
      a: 'Bengaluru, Karnataka, and no other city yet. Coverage is city-wide. If you are planning somewhere else you will be told so plainly rather than strung along.' },
    { q: 'What can Sambramo arrange?',
      a: `${occasions.length} occasions and ${live.length} individual services — from a purohit for a Thursday morning to a wedding for several hundred people. You can hand over the whole day or book the single piece you are short of.` },
    { q: 'How much does Sambramo cost?',
      a: `Sambramo's coordination fee runs ${inr(low.coordinationFee)} for ${guests(low.guests)} up to ${inr(high.coordinationFee)} at the largest size. Vendor costs are sourced, negotiated and quoted separately, then itemised line by line. Asking for a price costs nothing and needs no account.` },
    { q: 'Is Sambramo open yet?',
      a: 'Not yet. Sambramo is pre-launch in Bengaluru and is building its supplier network now. There are no customer reviews on this site because there are no customers yet — publishing invented ones would be the fastest way to lose the trust the whole model depends on. You can join the list and be among the first called.' },
  ]

  const body = `
<section class="hero">
  <div class="wrap hero-split">
    <div>
      <p class="eyebrow">${esc(brand.categoryLine)} · Bengaluru</p>
      <h1>${esc(brand.taglineParts[0])}.<br>${esc(brand.taglineParts[1])}.</h1>
      <p class="lede" style="margin-top:1rem">${esc(brand.descriptor)}
      One coordinator sources every vendor, negotiates, and brings back one clear price.</p>
      <div class="btn-row">
        <a class="btn btn--primary" href="${U.waitlist}">Put me on the list</a>
        <a class="btn btn--ghost" style="color:#fff;box-shadow:inset 0 0 0 1.5px rgb(255 255 255/.28)" href="${U.howItWorks}">How it works</a>
      </div>
    </div>
    ${photo('hero', { alt: 'A marigold-decorated Indian wedding celebration', priority: true })}
  </div>
</section>

<div class="wrap section prose">
  <h2 style="margin-top:0">What is Sambramo?</h2>
  <p class="lede">${esc(brand.descriptor)}</p>
  <p>Every other service books you one vendor. Sambramo books the day. You describe the occasion —
  the date, roughly how many people, what matters to you — and a real coordinator sources the venue,
  the caterer, the decorator, the photographer and the priest, negotiates each one, and comes back with
  a single proposal where every line is priced. You change what you want. Then, and only then,
  anything is booked.</p>
  <p><strong>Sambramo is pre-launch.</strong> The supplier network in Bengaluru is being built now.
  There are no reviews, no vendor counts and no years-in-business on this site, because none of those
  numbers exist yet and inventing them is how a new company loses the only thing it has.</p>
</div>

<div class="wrap section">
  <h2>What does Sambramo arrange?</h2>
  <p class="lede">${esc(occasions.length)} occasions and ${esc(live.length)} services, across
  ${esc(trades.length)} supplier trades. Take the whole celebration or one piece of it.</p>
  ${photo('occasions', { alt: 'A decorated Indian birthday celebration', className: 'band' })}
  <div class="grid grid--4">
    ${occasions.slice(0, 12).map(o => `<a class="card" href="${U.occasion(o.slug)}">
      <span class="card-title">${esc(o.name)}</span>
      <p class="card-note">${esc(o.tagline)}</p></a>`).join('')}
  </div>
  <div class="btn-row">
    <a class="btn btn--ghost" href="${U.occasions}">All ${esc(occasions.length)} occasions</a>
    <a class="btn btn--ghost" href="${U.services}">All ${esc(live.length)} services</a>
  </div>
</div>

<div class="section section--sunk">
  <div class="wrap">
    <h2 style="margin-top:0">What does Sambramo promise?</h2>
    <p class="lede">Four things, and each one is a mechanism rather than a slogan.</p>
    <div class="grid grid--2">
      ${COMMITMENTS.map(([t, d]) => `<div class="card">
        <span class="card-title">${esc(t)}</span><p class="card-note">${esc(d)}</p></div>`).join('')}
    </div>
    <p style="margin-top:1.2rem"><a href="${U.trust}">What Sambramo will and will not do →</a></p>
  </div>
</div>

<div class="wrap section">
  <h2>How does it work?</h2>
  <p class="lede">Five steps. You can stop at any of them and owe nothing.</p>
  <ol class="steps prose">
    ${JOURNEY.map(([t, d]) => `<li><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}
  </ol>
  <p><a href="${U.howItWorks}">The longer version →</a></p>
</div>

<div class="wrap section">
  <h2>What does a celebration cost?</h2>
  <p class="lede">It is almost entirely a question of how many people are coming. Sambramo's
  coordination fee runs ${esc(inr(low.coordinationFee))} to ${esc(inr(high.coordinationFee))}; vendor costs
  are quoted separately and itemised in full.</p>
  <div class="grid grid--2">
    ${tiers.slice(0, 4).map(t => `<a class="card" href="${U.size(t.slug)}">
      <span class="card-title">${esc(t.name)}${t.localName ? ` · ${esc(t.localName)}` : ''}</span>
      <p class="card-note">${esc(t.tagline)}</p>
      <p class="card-price">${esc(guests(t.guests))} · ${esc(inr(t.coordinationFee))} coordination</p></a>`).join('')}
  </div>
  <div class="btn-row"><a class="btn btn--ghost" href="${U.whatItCosts}">How the price is built</a>
  <a class="btn btn--ghost" href="${U.sizes}">All ${esc(tiers.length)} sizes</a></div>
</div>

<div class="wrap section">
  <h2>Questions about Sambramo</h2>
  <div class="qa">${qs.map(x => `<div><h3>${esc(x.q)}</h3><p>${esc(x.a)}</p></div>`).join('')}</div>
  <p style="margin-top:1.2rem"><a href="${U.faq}">All questions →</a></p>
</div>

${waitlistCta({ brand, heading: 'Sambramo opens in Bengaluru soon',
  blurb: `Tell us what you are planning and roughly when. You will be among the first we call — with a real price, not a brochure. ${inr(lock)} will hold a date and a price once we are live, and it is refundable.` })}

<div class="wrap section">
  <h2>Festival guides</h2>
  <p class="lede">What each festival is, when it falls, the rituals and the food.</p>
  <ul class="chips">${festivals.map(f => `<li><a class="chip" href="${U.festival(f.slug)}">${esc(f.name)}</a></li>`).join('')}</ul>
  <h2>For suppliers</h2>
  <p class="lede">${esc(trades.length)} trades, jobs near you, the price on the job before you accept.</p>
  <div class="btn-row"><a class="btn btn--dark" href="${U.partners}">Work with Sambramo</a></div>
</div>`

  return {
    title, description, body, navCurrent: null, crumbs: null,
    schema: S.graph([
      S.organization(brand, ctx.legal),
      S.webSite(brand),
      S.webPage({ url: U.home, title, description, lastmod }),
      S.breadcrumbList(U.home, [{ name: 'Home' }]),
      S.itemList(U.home, [
        { url: U.occasions, name: 'Occasions' }, { url: U.services, name: 'Services' },
        { url: U.sizes, name: 'Celebration sizes' }, { url: U.festivals, name: 'Festivals' },
        { url: U.city('bengaluru'), name: 'Bengaluru' }, { url: U.trades, name: 'Partner trades' },
      ]),
      S.faqPage(U.home, qs),
    ]),
  }
}

/* ══ How it works ══════════════════════════════════════════════════════ */

export function howItWorksPage(ctx) {
  const { brand, lock, lastmod, occasions, services } = ctx
  const title = fitTitle('How Sambramo Works, Step by Step', brand.name)
  const description = clamp(`The five steps from telling Sambramo what you are celebrating to the day being run for you in Bengaluru. Nothing is booked until you approve the priced plan.`)

  const qs = [
    { q: 'How do I start?',
      a: 'You tell Sambramo the occasion, the date and roughly how many people are coming. It takes about two minutes, needs no account and costs nothing. A coordinator reads it and calls you back.' },
    { q: 'Does a real person handle my celebration?',
      a: 'Yes. One named coordinator handles it from the first call to the last guest — not a ticket queue and not a different name each week. Sambramo is human-assisted by design; the software is how you watch it happen, not who does the work.' },
    { q: 'When do I pay?',
      a: `Nothing is charged to ask, and nothing is charged to be quoted. If you want to hold your date and your price while you think, that is ${inr(lock)} — it comes off the final bill and it comes back if you walk away. Everything else is paid once you approve the plan.` },
    { q: 'Can I change the plan?',
      a: 'As many times as you like, and at no cost. The proposal is a list with every line priced. Swap the menu, move the stage, cut a line you do not want. No vendor is held and no money moves until you say yes.' },
    { q: 'What happens on the day?',
      a: 'Sambramo runs it. Setup, vendor arrival times, the running order and the clearing afterwards. If a vendor is late, chasing them is Sambramo’s job. You are a guest at your own celebration.' },
    { q: 'What if something goes wrong?',
      a: `One number, ${brand.supportPhone}, ${brand.hours.toLowerCase()}. Whoever was booked, you call Sambramo and Sambramo deals with them.` },
  ]

  const body = `
<div class="wrap pagehead">
  <p class="eyebrow">How it works</p>
  <h1>From "we are thinking about it" to the day itself</h1>
  <p class="lede">Five steps. You can stop at any of them and owe nothing.</p>
</div>

<div class="wrap section prose">
  <p><strong>Sambramo is a human-assisted concierge service, not a directory.</strong> You do not browse
  vendors, compare them yourself and make five phone calls. You describe the celebration once, and a
  coordinator does the sourcing, the negotiating and the chasing — then hands you one proposal with
  every line priced.</p>
</div>

<div class="wrap section">
  <h2>What are the five steps?</h2>
  <p class="lede">Telling us, being called, being quoted, holding it if you want to, and the day itself.</p>
  <ol class="steps prose">
    ${JOURNEY.map(([t, d]) => `<li><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}
  </ol>
</div>

<div class="section section--sunk"><div class="wrap">
  <h2 style="margin-top:0">What is the ${esc(inr(lock))} hold?</h2>
  <p class="lede">${esc(inr(lock))} holds your price and your date while you decide. It comes off the
  final bill, and it comes back in full if you walk away.</p>
  <div class="grid grid--2" style="margin-top:1.2rem">
    <div class="card"><span class="card-title">It holds the price</span>
      <p class="card-note">Vendor rates move with the season. The hold fixes the figure you were quoted so it is still there when you come back to it.</p></div>
    <div class="card"><span class="card-title">It holds the date</span>
      <p class="card-note">Good caterers and good halls go early, particularly in festival season. The hold takes your date off the table.</p></div>
    <div class="card"><span class="card-title">A coordinator comes to you</span>
      <p class="card-note">Your home, your time, your family in the room. The proposal is read through at your table, line by line, and changed there if it does not fit.</p></div>
    <div class="card"><span class="card-title">Nothing is booked until you say yes</span>
      <p class="card-note">Say no and the ${esc(inr(lock))} comes back. That is the whole risk.</p></div>
  </div>
</div></div>

<div class="wrap section">
  <h2>What does Sambramo actually do that I could not do myself?</h2>
  <p class="lede">Source more options than you have time to, price them against each other, and be
  accountable for all of them at once.</p>
  <p>Three kitchens quoted instead of the one your cousin recommends, with a tasting before you commit
  to a plate rate. A priest matched to your tradition rather than the nearest one. A sound rig sized to
  your hall, so nobody sells you a wedding PA for sixty guests. Three decorators working to the same
  brief, so you compare looks at one price rather than comparing prices at different looks.</p>
  <p>And then one number to call. That is the part that is hard to do yourself: when the decorator is
  late and the caterer has the wrong headcount, somebody has to own both, and on your own that
  somebody is you, on the morning of your daughter's wedding.</p>
</div>

<div class="wrap section">
  <h2>Questions about how Sambramo works</h2>
  <div class="qa">${qs.map(x => `<div><h3>${esc(x.q)}</h3><p>${esc(x.a)}</p></div>`).join('')}</div>
</div>

${waitlistCta({ brand, heading: 'Ready when you are',
  blurb: `Sambramo opens in Bengaluru soon. Leave the occasion and the date and you will be among the first called.` })}`

  return {
    title, description, body, navCurrent: 'how',
    crumbs: crumb({ name: 'How it works' }),
    schema: S.graph([
      S.webPage({ url: U.howItWorks, title, description, lastmod }),
      S.breadcrumbList(U.howItWorks, crumb({ name: 'How it works' })),
      S.howTo(U.howItWorks, 'How to arrange a celebration with Sambramo',
        'The five steps from first enquiry to the day being run for you in Bengaluru.',
        JOURNEY.map(([title, body]) => ({ title, body }))),
      S.faqPage(U.howItWorks, qs),
    ]),
  }
}
