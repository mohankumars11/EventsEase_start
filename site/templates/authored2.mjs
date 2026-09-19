/**
 * The rest of the hand-written pages: pricing, about, trust, FAQ, contact,
 * the two partner pages, both waitlists, the thank-you and the five legal
 * pages.
 *
 * The legal pages are the delicate ones. src/config/legal.js has legalName,
 * cin, gstin, registeredAddress and the Grievance Officer all null, and
 * isLaunchReady() is false. Publishing a statutory disclosure page full of
 * blanks is worse than not publishing one; 404ing somebody looking for a
 * grievance route is worse still. So they render the obligation, the clocks
 * that ARE set, the interim contact, and a plain "pending incorporation"
 * line — and they carry noindex until legal.json says the facts exist, at
 * which point they un-hide themselves with no code change.
 */
import { esc, list } from '../lib/html.mjs'
import { U } from '../lib/urls.mjs'
import { inr, guests, clamp, longDate, fitTitle } from '../lib/fmt.mjs'
import * as S from '../lib/schema.mjs'
import { waitlistCta } from '../lib/page.mjs'
import { COMMITMENTS, JOURNEY } from './authored.mjs'

const crumb = (...t) => [{ name: 'Home', url: U.home }, ...t]
const legalCrumb = name => crumb({ name: 'Legal' }, { name })

const simple = ({ url, title, description, eyebrow, h1, lede, body, nav = null, crumbs, lastmod, noindex = false, extra = [] }) => ({
  title, description, navCurrent: nav, crumbs, noindex,
  body: `<div class="wrap pagehead"><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(h1)}</h1>
  <p class="lede">${esc(lede)}</p></div>${body}`,
  schema: S.graph([
    S.webPage({ url, title, description, lastmod }),
    S.breadcrumbList(url, crumbs),
    ...extra,
  ]),
})

/* ══ What it costs ═════════════════════════════════════════════════════ */

export function whatItCostsPage(ctx) {
  const { brand, tiers, bespoke, lock, legal, lastmod, platformFeeRate, bundleDiscountRate } = ctx
  const low = tiers[0], high = tiers[tiers.length - 1]
  const qs = [
    { q: 'How does Sambramo make money?',
      a: `A coordination fee, stated up front and set by the size of the celebration — ${inr(low.coordinationFee)} at the smallest, ${inr(high.coordinationFee)} at the largest. It is the only thing Sambramo charges you. Vendor costs are passed through itemised, and nothing is added after you approve the plan.` },
    { q: 'Are vendor prices marked up?',
      a: 'Vendor costs appear as their own lines in the proposal, so you can see what each one is. Sambramo’s charge is the coordination fee on its own line. Nothing is folded into a vendor price where you cannot see it.' },
    { q: 'What does it cost to get a quote?',
      a: `Nothing. No card, no deposit, no account. ${inr(lock)} holds your date and price if you want it held, and that amount comes off the final bill and is refunded if you walk away.` },
    { q: 'Are the prices on this site quotes?',
      a: 'No. Every price band on this site is an indicative Bengaluru market range, and several are per plate or per seat rather than per event. Your figure is priced against your date, your venue and your guest count, and it is itemised before you approve it.' },
    { q: 'What taxes apply?',
      a: `GST applies on the coordination fee at ${Math.round((legal.tax?.gstOnCommissionRate ?? 0.18) * 100)}%. ${legal.tax?.note ?? ''}`.trim() },
  ]
  return simple({
    url: U.whatItCosts, nav: 'costs', lastmod,
    crumbs: crumb({ name: 'What it costs' }),
    title: fitTitle('What Sambramo Costs', brand.name),
    description: clamp(`Sambramo charges one coordination fee, ${inr(low.coordinationFee)} to ${inr(high.coordinationFee)} by celebration size. Vendor costs are passed through itemised. Nothing is charged to ask for a quote.`),
    eyebrow: 'Pricing',
    h1: 'What Sambramo costs, and how the number is built',
    lede: `One coordination fee, set by how many people are coming. Vendor costs itemised on top. Nothing charged to ask.`,
    extra: [S.faqPage(U.whatItCosts, qs)],
    body: `
<div class="wrap section prose">
  <p><strong>Sambramo charges a single coordination fee, and it is on the proposal before you agree to
  anything.</strong> It runs ${esc(inr(low.coordinationFee))} for ${esc(guests(low.guests))} up to
  ${esc(inr(high.coordinationFee))} at the largest size on the ladder. Everything else in your quote is a
  vendor cost, passed through as its own line.</p>
</div>

<div class="wrap section">
  <h2>How much is the coordination fee?</h2>
  <p class="lede">It is set by celebration size, and the ladder is published in full rather than
  quoted on request.</p>
  <div class="table-scroll"><table>
    <thead><tr><th scope="col">Size</th><th scope="col">Guests</th><th scope="col" class="num">Coordination fee</th></tr></thead>
    <tbody>${tiers.map(t => `<tr>
      <th scope="row" style="color:var(--ink);font-size:.9375rem;letter-spacing:0;text-transform:none"><a href="${U.size(t.slug)}">${esc(t.name)}</a></th>
      <td>${esc(guests(t.guests))}</td><td class="num money">${esc(inr(t.coordinationFee))}</td></tr>`).join('')}
      ${bespoke ? `<tr><th scope="row" style="color:var(--ink);font-size:.9375rem;letter-spacing:0;text-transform:none">${esc(bespoke.name)}</th>
        <td>Above ${esc(high.guests?.max ?? '3,500')}</td><td class="num muted">Quoted individually</td></tr>` : ''}
    </tbody>
  </table></div>
</div>

<div class="wrap section">
  <h2>What is in the price, line by line?</h2>
  <p class="lede">Four kinds of line, and every one of them is visible.</p>
  <ol class="steps prose">
    <li><h3>Vendor costs</h3><p>The venue, the caterer, the decorator, the photographer, the priest — each quoted by the supplier, negotiated by your coordinator, and shown as its own line at the figure the supplier is paid.</p></li>
    <li><h3>The coordination fee</h3><p>Sambramo's charge, from the table above. One line, stated before you agree.</p></li>
    <li><h3>Tax</h3><p>Shown against each line it applies to rather than as a lump at the bottom. GST on the coordination fee is ${esc(Math.round((legal.tax?.gstOnCommissionRate ?? 0.18) * 100))}%.</p></li>
    <li><h3>Nothing else</h3><p>There is no service charge, no convenience fee and no day-of adjustment. The price you approve is the price you pay.</p></li>
  </ol>
</div>

<div class="section section--sunk"><div class="wrap">
  <h2 style="margin-top:0">What does it cost to ask?</h2>
  <p class="lede">Nothing, and that is not a promotional offer — there is no mechanism by which asking
  costs money.</p>
  <p>No card, no deposit, no account. You can go all the way to a full priced proposal and walk away
  having paid nothing. ${esc(inr(lock))} holds your date and your quote if you want them held; it is
  adjusted against the final bill and refunded in full if you decide against it.</p>
</div></div>

<div class="wrap section">
  <h2>Why are the prices on this site ranges rather than numbers?</h2>
  <p class="lede">Because a celebration is priced against a date, a venue and a headcount, and a single
  number printed without those would be a number Sambramo could not honour.</p>
  <p>The bands on the service pages are real Bengaluru market ranges. Several are per plate or per seat
  rather than per event, which is why they are captioned rather than left bare — a "₹250" read as the
  price of catering is a worse impression than no figure at all. What you get back is one figure for
  your celebration, itemised, with everything above visible in it.</p>
</div>

<div class="wrap section">
  <h2>Questions about pricing</h2>
  <div class="qa">${qs.map(x => `<div><h3>${esc(x.q)}</h3><p>${esc(x.a)}</p></div>`).join('')}</div>
</div>

${waitlistCta({ brand, heading: 'Want a real number for your celebration?',
  blurb: 'Sambramo opens in Bengaluru soon. Leave the occasion, the date and roughly how many people, and you will be among the first called.' })}`,
  })
}

/* ══ About ═════════════════════════════════════════════════════════════ */

export function aboutPage(ctx) {
  const { brand, occasions, services, trades, lastmod } = ctx
  const live = services.filter(s => s.hasPage)
  const qs = [
    { q: 'What does "Sambramo" mean?',
      a: 'Sambrama is celebration in Kannada. The company is named in the language of the city it serves, which is Bengaluru.' },
    { q: 'Is Sambramo a marketplace?',
      a: 'No. On a marketplace you browse vendors, compare them and book one yourself. With Sambramo you describe the celebration and a coordinator does the sourcing, the negotiating and the chasing, then hands you one proposal. You never have to pick a vendor blind.' },
    { q: 'Is Sambramo open for business?',
      a: 'Not yet. Sambramo is pre-launch in Bengaluru and is building its supplier network now. Joining the list is how you hear first.' },
    { q: 'Why are there no reviews on this site?',
      a: 'Because there are no customers yet. Sambramo has published no star ratings, no vendor counts, no years-in-business and no testimonials, and will not until they are real and attributable. An invented review is the fastest possible way to lose the trust this whole model depends on.' },
  ]
  return simple({
    url: U.about, lastmod, crumbs: crumb({ name: 'About' }),
    title: fitTitle('About Sambramo', brand.name),
    description: clamp(`Sambramo is a human-assisted concierge celebration service in Bengaluru, pre-launch, building its supplier network. What it is, what it is not, and what it will not claim.`),
    eyebrow: 'About',
    h1: 'What Sambramo is, and what it is not',
    lede: brand.descriptor,
    extra: [S.faqPage(U.about, qs)],
    body: `
<div class="wrap section prose">
  <h2 style="margin-top:0">What is Sambramo?</h2>
  <p><strong>${esc(brand.descriptor)}</strong> You describe the occasion; one coordinator sources every
  vendor the day needs, negotiates each price, and brings the whole thing back as one itemised
  proposal. ${esc(occasions.length)} occasions, ${esc(live.length)} services, ${esc(trades.length)} supplier trades.</p>

  <h2>What Sambramo is not</h2>
  <p>It is not a marketplace. You do not browse vendors, compare them yourself, and make five phone
  calls hoping the decorator and the caterer agree about the timings. It is not a directory with a
  contact form, and it is not a lead-generation business that sells your phone number to six suppliers
  and leaves you to it.</p>
  <p>It is also not a national company. Sambramo operates in Bengaluru and nowhere else. A coordinator
  who knows which halls have a 10pm sound cut-off and which caterers actually turn up is worth more
  than a brand covering thirty cities badly.</p>

  <h2>Why "end to end" is the whole point</h2>
  <p>Every other service books you one vendor. The hard part of a celebration is not finding a
  photographer — it is that the photographer, the caterer, the decorator and the priest all have to
  agree about a morning, and when one of them does not turn up, somebody has to own it. On your own,
  that somebody is you, on the day. With Sambramo it is a coordinator with one number.</p>

  <h2>Where Sambramo is today</h2>
  <p><strong>Pre-launch, in Bengaluru, building the supplier network.</strong> That is stated plainly
  because the alternative is to imply otherwise, and everything else on this site would then be worth
  less. There are no customer reviews here, no borrowed logos, no vendor counts and no years in
  business. When those numbers are real they will appear, and not a day before.</p>
</div>

<div class="section section--sunk"><div class="wrap">
  <h2 style="margin-top:0">What Sambramo commits to</h2>
  <div class="grid grid--2">
    ${COMMITMENTS.map(([t, d]) => `<div class="card"><span class="card-title">${esc(t)}</span>
      <p class="card-note">${esc(d)}</p></div>`).join('')}
  </div>
</div></div>

<div class="wrap section">
  <h2>Questions about the company</h2>
  <div class="qa">${qs.map(x => `<div><h3>${esc(x.q)}</h3><p>${esc(x.a)}</p></div>`).join('')}</div>
</div>

${waitlistCta({ brand, heading: 'Be among the first',
  blurb: 'Sambramo opens in Bengaluru soon. Leave your details and you will be called before we open to everyone.' })}`,
  })
}

/* ══ Trust and safety ══════════════════════════════════════════════════ */

export function trustPage(ctx) {
  const { brand, legal, lock, lastmod } = ctx
  const terms = legal.bookingTerms
  const qs = [
    { q: 'When does Sambramo take my money?',
      a: `Not until you approve a priced plan. Asking costs nothing and being quoted costs nothing. ${inr(lock)} holds your date and price if you want that, and it is refundable and adjusted against the final bill.` },
    { q: 'What happens to my money before the event?',
      a: 'It is held. Suppliers are paid once the event is done and you have had a chance to raise anything that went wrong — which is what makes the guarantee behind it real rather than a sentence on a page.' },
    { q: 'Can Sambramo add charges after I approve?',
      a: 'No. The price shown is what is charged, and no fee, tax or charge is added later. If something beyond the agreed scope comes up on the day, it is agreed with you before any work starts.' },
    { q: 'What if I need to cancel?',
      a: 'Cancel before a supplier has accepted and you get everything back. After that, part goes to the supplier — not to Sambramo — because they cleared their day for you.' },
    { q: 'Does Sambramo use countdown timers or fake scarcity messages?',
      a: 'No. Sambramo keeps a written register of thirteen dark patterns it will not use, including false urgency and invented scarcity. Any countdown must be a real deadline and any count must be a real count.' },
  ]
  return simple({
    url: U.trust, lastmod, crumbs: crumb({ name: 'Trust and safety' }),
    title: fitTitle('Trust and Safety at Sambramo', brand.name),
    description: clamp(`Nothing booked until you approve. Money held until after the event. No hidden charges, no countdown timers, no invented scarcity. What Sambramo guarantees, and the thirteen dark patterns it has ruled out.`),
    eyebrow: 'Trust and safety',
    h1: 'What Sambramo guarantees, and what it refuses to do',
    lede: 'Mechanisms rather than promises — each one is something you can check.',
    extra: [S.faqPage(U.trust, qs)],
    body: `
<div class="wrap section">
  <h2 style="margin-top:0">What does Sambramo guarantee?</h2>
  <p class="lede">Four commitments, and each one is a mechanism you can hold Sambramo to rather than a
  sentiment.</p>
  <div class="grid grid--2">
    ${COMMITMENTS.map(([t, d]) => `<div class="card"><span class="card-title">${esc(t)}</span>
      <p class="card-note">${esc(d)}</p></div>`).join('')}
  </div>
</div>

<div class="wrap section">
  <h2>${esc(terms.heading)}</h2>
  <p class="lede">The booking terms in full, in the words they are presented in.</p>
  <ul class="prose">${terms.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
  <p class="muted" style="font-size:.8125rem">Terms version ${esc(terms.version)}.</p>
</div>

<div class="section section--sunk"><div class="wrap">
  <h2 style="margin-top:0">What Sambramo will not do</h2>
  <p class="lede">Sambramo keeps a written register of ${esc(legal.darkPatterns.length)} dark patterns and
  the rule that rules each one out. It is an internal engineering document, published here because a
  commitment nobody can check is not a commitment.</p>
  <div class="table-scroll"><table>
    <thead><tr><th scope="col">Pattern</th><th scope="col">The rule</th></tr></thead>
    <tbody>${legal.darkPatterns.map(d => `<tr>
      <th scope="row" style="color:var(--ink);font-size:.9375rem;letter-spacing:0;text-transform:none">${esc(String(d.id).replace(/_/g, ' '))}</th>
      <td>${esc(d.rule)}</td></tr>`).join('')}</tbody>
  </table></div>
</div></div>

<div class="wrap section">
  <h2>Why are there no reviews on this site?</h2>
  <p class="lede">Because Sambramo has no customers yet, and an invented review is the fastest possible
  way to lose the trust everything above is trying to earn.</p>
  <p>There are no star ratings, no vendor counts, no years in business and no testimonials anywhere on
  sambramo.com. There is no review markup in this site's structured data either — the build fails if
  any appears. When there are real, attributable, consented reviews they will be published, and not
  one day before.</p>
</div>

<div class="wrap section">
  <h2>Questions about trust and safety</h2>
  <div class="qa">${qs.map(x => `<div><h3>${esc(x.q)}</h3><p>${esc(x.a)}</p></div>`).join('')}</div>
</div>`,
  })
}

/* ══ Contact ═══════════════════════════════════════════════════════════ */

export function contactPage(ctx) {
  const { brand, lastmod } = ctx
  return simple({
    url: U.contact, nav: 'contact', lastmod, crumbs: crumb({ name: 'Contact' }),
    title: fitTitle('Contact Sambramo, Bengaluru', brand.name),
    description: clamp(`Talk to a person at Sambramo. Phone ${brand.supportPhone}, WhatsApp, or ${brand.email}. ${brand.hours}. Bengaluru, Karnataka.`),
    eyebrow: 'Contact',
    h1: 'Talk to a person',
    lede: `${brand.hours}. A coordinator, not a bot.`,
    extra: [S.contactPage(U.contact, brand)],
    body: `
<div class="wrap section">
  <div class="grid grid--2">
    <div class="card">
      <span class="card-title">Phone</span>
      <p class="card-note"><a href="tel:${esc(brand.supportPhoneDial)}">${esc(brand.supportPhone)}</a><br>${esc(brand.hours)}</p>
    </div>
    <div class="card">
      <span class="card-title">WhatsApp</span>
      <p class="card-note"><a href="https://wa.me/${esc(brand.whatsapp)}">Message Sambramo on WhatsApp</a><br>Usually the fastest way to get a straight answer.</p>
    </div>
    <div class="card">
      <span class="card-title">Email</span>
      <p class="card-note">
        General — <a href="mailto:${esc(brand.email)}">${esc(brand.email)}</a><br>
        Existing bookings — <a href="mailto:${esc(brand.emailSupport)}">${esc(brand.emailSupport)}</a><br>
        Suppliers — <a href="mailto:${esc(brand.emailPartners)}">${esc(brand.emailPartners)}</a><br>
        Complaints — <a href="mailto:${esc(brand.emailGrievance)}">${esc(brand.emailGrievance)}</a>
      </p>
    </div>
    <div class="card">
      <span class="card-title">Where Sambramo operates</span>
      <p class="card-note">Bengaluru, Karnataka, India. City-wide. No other city yet — if you are elsewhere you will be told so plainly.</p>
    </div>
  </div>
</div>

<div class="wrap section prose">
  <h2>Is Sambramo taking bookings?</h2>
  <p class="lede">Not yet. Sambramo is pre-launch in Bengaluru and is building its supplier network.</p>
  <p>The fastest way to be first in the queue is to join the list — it takes a minute, needs no account
  and costs nothing.</p>
  <div class="btn-row">
    <a class="btn btn--primary" href="${U.waitlist}">Join the customer list</a>
    <a class="btn btn--ghost" href="${U.partnerJoin}">List your business</a>
  </div>
</div>`,
  })
}

/* ══ FAQ ═══════════════════════════════════════════════════════════════ */

export function faqPage(ctx) {
  const { brand, occasions, services, tiers, trades, cities, lock, legal, lastmod } = ctx
  const live = services.filter(s => s.hasPage)
  const low = tiers[0], high = tiers[tiers.length - 1]

  const groups = [
    ['About Sambramo', [
      ['What is Sambramo?', `${brand.descriptor} You describe what you are celebrating; one coordinator sources every vendor, negotiates each price and brings back one itemised proposal. Nothing is booked until you approve it.`],
      ['What does the name mean?', 'Sambrama is celebration in Kannada. The company is named in the language of the city it serves.'],
      ['Is Sambramo a marketplace or a directory?', 'Neither. You never browse vendors or pick one blind. A coordinator does the sourcing and the negotiating, and is accountable for all of them together.'],
      ['Is Sambramo open yet?', 'Not yet. Sambramo is pre-launch in Bengaluru and is building its supplier network. Joining the list is how you hear first.'],
      ['Why are there no reviews or ratings?', 'Because there are no customers yet. No star ratings, no vendor counts, no years in business and no testimonials appear anywhere on this site, and none will until they are real and attributable.'],
    ]],
    ['Where Sambramo works', [
      ['Which cities does Sambramo cover?', `${cities[0].name} only, city-wide. ${cities[0].coverage}`],
      ['Which areas of Bengaluru?', `All of them. The areas people ask about most are ${list(cities[0].knownAreas)}, but that is orientation rather than a boundary.`],
      ['Do you work outside Bengaluru?', 'No. If you are planning elsewhere you will be told so plainly rather than strung along, and you can leave your city to hear when it opens.'],
      ['What languages does Sambramo work in?', 'English, Kannada and Hindi.'],
    ]],
    ['What Sambramo arranges', [
      ['What occasions can Sambramo arrange?', `${occasions.length}, from a naming ceremony for twenty to a wedding for several hundred — ${list(occasions.slice(0, 6).map(o => o.name.toLowerCase()))} and more.`],
      ['Can I book just one service?', `Yes. ${live.length} services can be taken one at a time. Booking only the photographer, or only the caterer, is a normal thing to do.`],
      ['Does Sambramo arrange traditional ceremonies?', 'Yes — upanayanam, seemantham, aksharabhyasa, annaprashana, griha pravesh, bhoomi pooja, mundan and half-saree ceremonies among others, with a priest matched to your tradition rather than the nearest one.'],
      ['Does Sambramo do corporate events?', 'Yes. Shop and business openings, corporate functions, AV and presentation setups, and guest transport.'],
      ['Can Sambramo handle a festival celebration?', 'Yes, and festival dates fill earliest. There are guides on this site for Diwali, Holi, Navratri, Ganesh Chaturthi, Onam, Eid, Christmas and Pongal.'],
    ]],
    ['Money', [
      ['How much does Sambramo cost?', `A single coordination fee, ${inr(low.coordinationFee)} for ${guests(low.guests)} up to ${inr(high.coordinationFee)} at the largest size. Vendor costs are quoted separately and itemised.`],
      ['What does it cost to get a quote?', 'Nothing. No card, no deposit, no account.'],
      [`What is the ${inr(lock)} hold?`, `${inr(lock)} holds your price and your date while you decide. It comes off the final bill and it is refunded in full if you walk away.`],
      ['Are the prices on this site quotes?', 'No. They are indicative Bengaluru market ranges, and several are per plate or per seat rather than per event. Your figure is priced for your date, venue and guest count.'],
      ['Can charges be added later?', 'No. The price shown is what is charged, and no fee, tax or charge is added afterwards.'],
      ['What taxes apply?', `GST at ${Math.round((legal.tax?.gstOnCommissionRate ?? 0.18) * 100)}% on the coordination fee, shown as its own line.`],
      ['How do I pay?', 'Once bookings open, by UPI or card. Money is held until 24 hours after the event, so suppliers are paid once it is done and you have had a chance to raise anything.'],
    ]],
    ['Booking and changes', [
      ['How do I start?', 'Tell Sambramo the occasion, the date and roughly how many people. About two minutes, and no account needed.'],
      ['Can I change the plan?', 'As many times as you like, at no cost. Nothing is booked until you approve it.'],
      ['How far ahead should I book?', 'As early as you can for festival season and wedding dates — good caterers and good halls go first. Shorter notice is workable for smaller celebrations.'],
      ['What if I need to cancel?', 'Cancel before a supplier accepts and you get everything back. After that, part goes to the supplier, not to Sambramo, because they cleared their day.'],
      ['Who runs the event on the day?', `Sambramo. One coordinator handles setup, vendor timings, the running order and clearing. One number — ${brand.supportPhone}.`],
    ]],
    ['For suppliers', [
      ['How do I list my business?', `Tell Sambramo what you do and where. There are ${trades.length} trades, and the listing decides which jobs reach you.`],
      ['What does it cost to join?', 'Nothing to join and nothing monthly while the Bengaluru network is being built. Sambramo’s share is taken out of the earning shown on the job, never billed to you.'],
      ['Do I see the price before accepting a job?', 'Yes, in rupees, before you accept. Nothing is added afterwards.'],
      ['Do I have to accept every job?', 'No. Block days you are busy, decline anything you do not want, no penalty.'],
      ['When am I paid?', 'Once the event is done. The customer pays up front and Sambramo holds it, so the money exists before you set out.'],
    ]],
  ]

  const flat = groups.flatMap(([, items]) => items.map(([q, a]) => ({ q, a })))
  const title = fitTitle('Frequently Asked Questions', brand.name)
  const description = clamp(`${flat.length} questions about Sambramo answered — what it is, where it works, what it arranges, what it costs, how booking works and how suppliers join.`)

  return {
    title, description, navCurrent: null, crumbs: crumb({ name: 'FAQ' }),
    body: `
<div class="wrap pagehead">
  <p class="eyebrow">FAQ</p>
  <h1>Questions about Sambramo</h1>
  <p class="lede">${esc(flat.length)} of them, answered directly. If yours is not here, ${''}
  <a href="${U.contact}">ask a person</a>.</p>
</div>
${groups.map(([name, items]) => `<div class="wrap section">
  <h2>${esc(name)}</h2>
  <div class="qa">${items.map(([q, a]) => `<div><h3>${esc(q)}</h3><p>${esc(a)}</p></div>`).join('')}</div>
</div>`).join('')}
${waitlistCta({ brand, heading: 'Still have a question?',
  blurb: 'Ask on WhatsApp and a person will answer, or join the list and be called when Sambramo opens in Bengaluru.' })}`,
    schema: S.graph([
      S.webPage({ url: U.faq, title, description, lastmod }),
      S.breadcrumbList(U.faq, crumb({ name: 'FAQ' })),
      S.faqPage(U.faq, flat),
    ]),
  }
}
