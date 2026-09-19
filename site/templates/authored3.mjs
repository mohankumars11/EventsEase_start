/**
 * Partner pages, both waitlists, the thank-you and the legal set.
 */
import { esc, list } from '../lib/html.mjs'
import { U } from '../lib/urls.mjs'
import { inr, clamp, longDate, fitTitle } from '../lib/fmt.mjs'
import * as S from '../lib/schema.mjs'
import { waitlistCta, photo } from '../lib/page.mjs'

const crumb = (...t) => [{ name: 'Home', url: U.home }, ...t]

/* The six partner benefits, from PartnerLanding.jsx. Edited: the app says
   "across Bengaluru" in the first one, which is right, and nothing here
   claims a second city. No volume promises and no earnings figure beyond
   the real median — that file's own rule, and it is a good one. */
const FACES = [
  ['Jobs near you, not across the city',
   'We only send work within the distance you set. You will never be asked to drive across Bengaluru for one setup.'],
  ['The price is on the job before you accept',
   'You see exactly what you earn, in rupees, before you say yes. Nothing is added afterwards and nothing is billed to you.'],
  ['Your calendar stays yours',
   'Block the days you are busy and we will not offer you anything on them. Decline anything you do not want, no penalty.'],
  ['Paid once the event is done',
   'The customer pays up front and Sambramo holds it, so the money exists before you set out. It reaches you once the event is completed.'],
  ['Free to join, free to stay',
   'No joining fee and no monthly charge while we build the Bengaluru network. Sambramo’s share is already taken out of the earning you see — never billed to you, and set out in full in the terms you sign.'],
  ['Ten minutes to be listed',
   'Tell us what you do and where. Somebody at Sambramo reads every application, and you are told the moment you are live.'],
]

/* ══ For partners ══════════════════════════════════════════════════════ */

export function partnersPage(ctx) {
  const { brand, trades, occasions, lastmod } = ctx
  const qs = [
    { q: 'What kind of businesses does Sambramo work with?',
      a: `${trades.length} separate trades in Bengaluru — caterers, photographers, decorators, purohits, DJs, mehendi artists, tent and furniture hire, valet, security, power hire and more. Each is treated as its own trade, because a bar supplier holds a licence a caterer does not and a purohit is not an entertainer.` },
    { q: 'What does it cost to join Sambramo?',
      a: 'Nothing to join and nothing monthly while the Bengaluru network is being built. Sambramo’s share is already taken out of the earning shown on the job — it is never billed to you, and it is set out in full in the terms you sign.' },
    { q: 'How do jobs reach me?',
      a: 'Within the distance you set, with the price on the job in rupees before you accept it. You decline anything you do not want, and blocked days are never offered.' },
    { q: 'When does Sambramo pay?',
      a: 'Once the event is completed. The customer pays up front and Sambramo holds the money, so it exists before you set out rather than sitting on an invoice you have to chase.' },
    { q: 'Is Sambramo taking suppliers now?',
      a: 'Yes — the supplier network is being built before Sambramo opens to customers, so joining now means being listed from day one rather than joining a queue later.' },
  ]
  return {
    title: fitTitle('Event Suppliers in Bengaluru', brand.name),
    description: clamp(`Get event work in Bengaluru. Jobs near you with the price on them before you accept, your calendar stays yours, and you are paid once the event is done. Free to join, ${trades.length} trades.`),
    navCurrent: 'partners', crumbs: crumb({ name: 'For partners' }),
    body: `
<section class="hero">
  <div class="wrap">
    <p class="eyebrow">For suppliers · Bengaluru</p>
    <h1>More work, and the price on it before you accept</h1>
    <p class="lede" style="max-width:34rem;margin-top:1rem">Sambramo arranges whole celebrations and
    dispatches the pieces to suppliers across ${esc(trades.length)} trades. Free to join, free to stay.</p>
    <div class="btn-row">
      <a class="btn btn--primary" href="${U.partnerJoin}">Get listed before we open</a>
      <a class="btn btn--ghost" style="color:#fff;box-shadow:inset 0 0 0 1.5px rgb(255 255 255/.28)" href="${U.trades}">Find your trade</a>
    </div>
  </div>
</section>

<div class="wrap section prose">
  <p><strong>Sambramo is pre-launch and is building its Bengaluru supplier network now.</strong>
  That is said plainly rather than dressed up: there is no customer volume to promise you yet and no
  earnings figure that would mean anything. What there is, is the chance to be listed before the doors
  open rather than after.</p>
</div>

<div class="wrap section">
  ${photo('partners', { alt: 'An event supplier at work in Bengaluru', className: 'band' })}
  <h2>Why work through Sambramo?</h2>
  <p class="lede">Six things, and all six are how the system actually works rather than what it intends.</p>
  <div class="grid grid--2">
    ${FACES.map(([t, d]) => `<div class="card"><span class="card-title">${esc(t)}</span>
      <p class="card-note">${esc(d)}</p></div>`).join('')}
  </div>
</div>

<div class="wrap section">
  <h2>Which trade are you?</h2>
  <p class="lede">${esc(trades.length)} trades, each with its own page showing exactly which catalogue
  services would reach you and which of the ${esc(occasions.length)} occasions need them.</p>
  <ul class="chips">${trades.map(t => `<li><a class="chip" href="${U.trade(t.slug)}">${esc(t.name)}</a></li>`).join('')}</ul>
</div>

<div class="wrap section">
  <h2>Questions from suppliers</h2>
  <div class="qa">${qs.map(x => `<div><h3>${esc(x.q)}</h3><p>${esc(x.a)}</p></div>`).join('')}</div>
</div>

${waitlistCta({ brand, audience: 'partner', heading: 'Get listed before Sambramo opens',
  blurb: 'Tell us what you do and where you work. Every application is read by a person, and you will be told the moment you are live.' })}`,
    schema: S.graph([
      S.webPage({ url: U.partners, title: fitTitle('Event Suppliers in Bengaluru', brand.name), description: 'Event supplier opportunities in Bengaluru.', lastmod }),
      S.breadcrumbList(U.partners, crumb({ name: 'For partners' })),
      S.itemList(U.partners, trades.map(t => ({ url: U.trade(t.slug), name: t.name }))),
      S.faqPage(U.partners, qs),
    ]),
  }
}

/* ══ Bandhu ════════════════════════════════════════════════════════════ */

export function bandhuPage(ctx) {
  const { brand, membership, lastmod } = ctx
  /* The shop benefit is dropped: the storefront was removed from the
     product, so "priority on the shop" is a benefit that does not exist. */
  const benefits = (membership.benefits ?? []).filter(b => !/\bshop\b/i.test(b))
  const qs = [
    { q: 'What is Sambramo Bandhu?', a: `${membership.name} is Sambramo's founding-member circle. ${membership.pitch}` },
    { q: 'What does it cost?', a: `Nothing. ${membership.disclaimer}` },
    { q: 'What does the word mean?', a: `${membership.meaning}. It is the relative who turns up the day before the wedding and stays until the hall is cleared.` },
  ]
  return {
    title: fitTitle('Sambramo Bandhu, Founding Members', brand.name),
    description: clamp(`${membership.pitch} No fee, no card, no auto-renewal.`),
    navCurrent: 'partners', crumbs: crumb({ name: 'For partners', url: U.partners }, { name: 'Bandhu' }),
    body: `
<div class="wrap pagehead">
  <p class="eyebrow">${esc(membership.status)}</p>
  <h1>${esc(membership.name)}</h1>
  <p class="lede">${esc(membership.meaning)}.</p>
</div>
<div class="wrap section prose">
  <p><strong>${esc(membership.pitch)}</strong></p>
</div>
<div class="wrap section">
  <h2>What do founding members get?</h2>
  <p class="lede">${esc(benefits.length)} things, and none of them is a discount code.</p>
  <div class="grid grid--2">
    ${benefits.map(b => `<div class="card"><p class="card-note" style="color:var(--ink)">${esc(b)}</p></div>`).join('')}
  </div>
  <p class="note" style="margin-top:1.2rem"><strong>${esc(membership.disclaimer)}</strong></p>
</div>
<div class="wrap section">
  <h2>Questions about Bandhu</h2>
  <div class="qa">${qs.map(x => `<div><h3>${esc(x.q)}</h3><p>${esc(x.a)}</p></div>`).join('')}</div>
</div>
${waitlistCta({ brand, preset: 'bandhu', heading: 'Ask about Bandhu',
  blurb: 'The first circle is small and it is being put together now. Leave your details, or message on WhatsApp and talk to a person.' })}`,
    schema: S.graph([
      S.webPage({ url: U.bandhu, title: fitTitle('Sambramo Bandhu, Founding Members', brand.name), description: membership.pitch, lastmod }),
      S.breadcrumbList(U.bandhu, crumb({ name: 'For partners', url: U.partners }, { name: 'Bandhu' })),
      S.faqPage(U.bandhu, qs),
    ]),
  }
}

/* ══ Waitlists ═════════════════════════════════════════════════════════
 *
 * The anticipation button, and the only place on this site that collects
 * anything. A plain <form method="post"> to a function — no fetch, no JS, so
 * it works with scripting disabled and `script-src 'none'` stays in the CSP.
 *
 * The honeypot is a real named field a person never sees. Bots fill every
 * input they find; the function rejects any submission where it is non-empty.
 * `t` carries the render time so a submission that arrives implausibly fast
 * can be dropped too.
 */

function form({ audience, options, optionLabel, presetNote }) {
  const isPartner = audience === 'partner'
  return `
<form class="form" method="post" action="/api/interest">
  <input type="hidden" name="audience" value="${esc(audience)}">
  <input type="hidden" name="t" value="__RENDER_TS__">
  <p class="hp" aria-hidden="true">
    <label for="company-website-${esc(audience)}">Leave this empty</label>
    <input id="company-website-${esc(audience)}" type="text" name="company_website" tabindex="-1" autocomplete="off">
  </p>

  <div class="field">
    <label for="name-${esc(audience)}">Your name</label>
    <input id="name-${esc(audience)}" name="name" type="text" required autocomplete="name" maxlength="80">
  </div>

  <div class="field">
    <label for="contact-${esc(audience)}">Phone or email
      <span class="hint">Whichever you would rather be reached on. One is enough.</span></label>
    <input id="contact-${esc(audience)}" name="contact" type="text" required autocomplete="tel" maxlength="120">
  </div>

  <div class="field">
    <label for="topic-${esc(audience)}">${esc(optionLabel)}</label>
    <select id="topic-${esc(audience)}" name="topic">
      <option value="">${isPartner ? 'Select your trade' : 'Select an occasion'}</option>
      ${options.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}
      ${isPartner ? '' : '<option value="other">Something else</option>'}
    </select>
    ${presetNote ? `<span class="hint">${esc(presetNote)}</span>` : ''}
  </div>

  ${isPartner ? `
  <div class="field">
    <label for="area-partner">Areas you cover
      <span class="hint">For example: Indiranagar, Koramangala, HSR Layout — or "all Bengaluru".</span></label>
    <input id="area-partner" name="area" type="text" maxlength="160">
  </div>` : `
  <div class="field">
    <label for="date-customer">Roughly when? <span class="hint">An approximate date is fine. Leave it blank if you do not know yet.</span></label>
    <input id="date-customer" name="event_date" type="date">
  </div>
  <div class="field">
    <label for="area-customer">Which part of Bengaluru? <span class="hint">Optional.</span></label>
    <input id="area-customer" name="area" type="text" maxlength="160">
  </div>`}

  <div class="btn-row">
    <button class="btn btn--primary" type="submit">${isPartner ? 'Get listed' : 'Put me on the list'}</button>
  </div>
  <p class="muted" style="font-size:.8125rem;margin-top:.8rem">
    No payment, no card, no account. Your details are used to contact you about Sambramo opening in
    Bengaluru and for nothing else. See the <a href="${U.privacy}">privacy notice</a>.
  </p>
</form>`
}

export function waitlistPage(audience, ctx) {
  const { brand, occasions, trades, lock, lastmod } = ctx
  const isPartner = audience === 'partner'
  const url = isPartner ? U.partnerJoin : U.waitlist

  const title = isPartner
    ? fitTitle('List Your Business in Bengaluru', brand.name)
    : fitTitle('Join the Sambramo Waiting List', brand.name)
  const description = isPartner
    ? clamp(`Get listed as an event supplier in Bengaluru before Sambramo opens. Free to join, price on the job before you accept, paid once the event is done.`)
    : clamp(`Sambramo opens in Bengaluru soon. Tell us what you are planning and roughly when, and you will be among the first called. No payment, no card, no account.`)

  const body = `
<div class="wrap pagehead">
  <p class="eyebrow">${isPartner ? 'For suppliers' : 'Opening soon in Bengaluru'}</p>
  <h1>${isPartner ? 'Get listed before we open' : 'Be among the first we call'}</h1>
  <p class="lede">${isPartner
    ? 'Sambramo is building its Bengaluru supplier network now, before it opens to customers. Tell us what you do and where.'
    : 'Sambramo is pre-launch. Leave the occasion and roughly when, and a coordinator will call you with a real price when we open.'}</p>
</div>

<div class="wrap section">
  <div class="grid grid--2">
    <div>${form({
      audience,
      optionLabel: isPartner ? 'What do you do?' : 'What are you planning?',
      options: isPartner
        ? trades.map(t => ({ value: t.slug, label: t.name }))
        : occasions.map(o => ({ value: o.id, label: o.name })),
      presetNote: isPartner
        ? 'The trade decides which jobs reach you, so pick the closest one.'
        : null,
    })}</div>
    <div>
      <div class="card">
        <span class="card-title">What happens next</span>
        <p class="card-note">${isPartner
          ? 'A person reads every application. You will be told when Sambramo opens in Bengaluru and what listing involves — about ten minutes, and no documents to post.'
          : `A coordinator calls you when Sambramo opens in Bengaluru, hears what you actually want, and comes back with one itemised price. Nothing is charged to ask. ${inr(lock)} will hold a date and a price once we are live, and it is refundable.`}</p>
      </div>
      <div class="card" style="margin-top:1rem">
        <span class="card-title">Rather talk to a person?</span>
        <p class="card-note">
          <a href="https://wa.me/${esc(brand.whatsapp)}">WhatsApp</a> ·
          <a href="tel:${esc(brand.supportPhoneDial)}">${esc(brand.supportPhone)}</a><br>${esc(brand.hours)}</p>
      </div>
      <div class="card" style="margin-top:1rem">
        <span class="card-title">Bengaluru only</span>
        <p class="card-note">Sambramo serves Bengaluru and no other city yet. If you are elsewhere, say so in the form and you will be told honestly rather than strung along.</p>
      </div>
    </div>
  </div>
</div>`

  return {
    title, description, body,
    navCurrent: isPartner ? 'partners' : null,
    crumbs: isPartner
      ? crumb({ name: 'For partners', url: U.partners }, { name: 'Get listed' })
      : crumb({ name: 'Join the list' }),
    schema: S.graph([
      S.webPage({ url, title, description, lastmod }),
      S.breadcrumbList(url, isPartner
        ? crumb({ name: 'For partners', url: U.partners }, { name: 'Get listed' })
        : crumb({ name: 'Join the list' })),
    ]),
  }
}

export function thankYouPage(ctx) {
  const { brand } = ctx
  return {
    title: `Thank you | ${brand.name}`,
    description: 'Your details have reached Sambramo. A coordinator will be in touch when we open in Bengaluru. Nothing has been charged and nothing else is needed from you.',
    noindex: true, navCurrent: null, crumbs: null, schema: null,
    body: `
<div class="wrap pagehead">
  <p class="eyebrow">Received</p>
  <h1>That has reached us</h1>
  <p class="lede">A person will be in touch when Sambramo opens in Bengaluru. Nothing else is needed
  from you, and nothing has been charged.</p>
  <div class="btn-row">
    <a class="btn btn--ghost" href="${U.occasions}">Browse occasions</a>
    <a class="btn btn--ghost" href="${U.howItWorks}">How it works</a>
    <a class="btn btn--ghost" href="https://wa.me/${esc(brand.whatsapp)}">Message on WhatsApp</a>
  </div>
</div>`,
  }
}

/* ══ Legal ═════════════════════════════════════════════════════════════ */

const PENDING = (legal) => `
<div class="note note--warn">
  <p><strong>Sambramo is being incorporated.</strong> The registered legal name, CIN, GSTIN and
  registered office are not yet available, so they are not stated here rather than being approximated.
  They will be published on this page as soon as incorporation completes.</p>
  <p style="margin-bottom:0">Outstanding at the time of writing: ${esc(list(legal.complianceGaps.map(g => g.toLowerCase())))}.</p>
</div>`

export function legalPage(which, ctx) {
  const { brand, legal, lock, lastmod } = ctx
  const gr = legal.grievance ?? {}
  const noindex = !legal.launchReady

  const pages = {
    'terms': {
      url: U.terms, h1: 'Terms of service', eyebrow: 'Legal',
      lede: 'The terms on which Sambramo arranges a celebration for you.',
      title: fitTitle('Terms of Service', brand.name),
      description: 'The terms on which Sambramo arranges celebrations in Bengaluru — booking, approval, payment, cancellation and liability.',
      noindex: false,
      body: `
<div class="wrap section prose">
  ${PENDING(legal)}
  <h2>Who you are contracting with</h2>
  <p>Sambramo is being incorporated as a private limited company under the Companies Act 2013. Until
  that completes, you are contracting with the promoters of Sambramo, and nothing in these terms limits
  any right you have against them personally. The registered legal name, CIN and GSTIN will be
  published on the <a href="${U.entity}">entity disclosure page</a> and these terms reissued at that point.</p>

  <h2>What Sambramo does</h2>
  <p>Sambramo arranges celebrations in Bengaluru. It sources independent suppliers, negotiates on your
  behalf, holds payment and stands behind the arrangement. The suppliers perform the service; Sambramo
  arranges it and is accountable to you for it.</p>

  <h2>${esc(legal.bookingTerms.heading)}</h2>
  <ul>${legal.bookingTerms.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
  <p class="muted">Booking terms version ${esc(legal.bookingTerms.version)}.</p>

  <h2>Prices on this website</h2>
  <p>Every price shown on sambramo.com is indicative and is not an offer. Service price bands are
  Bengaluru market ranges, and some are stated per plate, per seat or per head rather than per event.
  Your quote is priced against your date, venue and guest count, and is itemised in full before you
  approve it. Nothing is charged to request one.</p>

  <h2>Tax</h2>
  <p>GST applies on the coordination fee at ${esc(Math.round((legal.tax?.gstOnCommissionRate ?? 0.18) * 100))}%.
  ${esc(legal.tax?.note ?? '')}</p>

  <h2>Complaints</h2>
  <p>Raise anything within 24 hours of the event and payment stays held until it is settled. The
  grievance route is set out on the <a href="${U.grievance}">grievance redressal page</a>.</p>` },

    'privacy': {
      url: U.privacy, h1: 'Privacy notice', eyebrow: 'Legal',
      lede: 'What Sambramo collects, why, and what it does not do with it.',
      title: fitTitle('Privacy Notice', brand.name),
      description: 'What personal data Sambramo collects in Bengaluru, why it collects it, how long it is kept and how to have it deleted. Written to the DPDP Act 2023.',
      noindex: false,
      body: `
<div class="wrap section prose">
  <h2>What this site collects</h2>
  <p><strong>Only what you type into a form.</strong> sambramo.com serves static pages, runs no
  JavaScript, sets no cookies, and carries no analytics, no advertising pixels and no third-party
  trackers of any kind. If you do not submit a form, this site collects nothing about you beyond the
  server request logs our hosting provider keeps.</p>

  <h2>What happens when you join the list</h2>
  <p>The waiting-list form collects your name, a phone number or email address, what you are planning
  or what trade you work in, an approximate date and optionally your area of Bengaluru. That is used to
  contact you about Sambramo opening, and for nothing else.</p>
  <ul>
    <li>It is not sold, rented or shared with suppliers or any other third party.</li>
    <li>It is stored in Sambramo's own database, not with a third-party form service.</li>
    <li>It is deleted on request, and deleted anyway if Sambramo does not open in your city.</li>
  </ul>

  <h2>Your rights</h2>
  <p>Under the Digital Personal Data Protection Act 2023 you may ask what Sambramo holds about you,
  ask for it to be corrected, ask for it to be erased, and withdraw consent at any time. Write to
  <a href="mailto:${esc(brand.emailGrievance)}">${esc(brand.emailGrievance)}</a> and it will be
  acknowledged within ${esc(gr.acknowledgeWithinHours ?? 48)} hours.</p>

  <h2>Cookies</h2>
  <p>This website sets no cookies. There is no consent banner because there is nothing to consent to.</p>

  <h2>Who to contact</h2>
  <p><a href="mailto:${esc(brand.emailGrievance)}">${esc(brand.emailGrievance)}</a> ·
  <a href="tel:${esc(brand.supportPhoneDial)}">${esc(brand.supportPhone)}</a> · ${esc(brand.hours)}.
  A named Data Protection Officer will be published once incorporation completes.</p>` },

    'refunds': {
      url: U.refunds, h1: 'Cancellation and refunds', eyebrow: 'Legal',
      lede: 'When you get everything back, when you do not, and why.',
      title: fitTitle('Cancellation and Refunds', brand.name),
      description: 'Sambramo cancellation and refund terms: full refund before a supplier accepts, part to the supplier afterwards, and the refundable date hold explained.',
      noindex: false,
      body: `
<div class="wrap section prose">
  <h2>What does it cost to cancel?</h2>
  <p><strong>Nothing, up to the point a supplier accepts your job.</strong> Before that, no supplier has
  cleared a day for you and there is nothing to compensate, so you get everything back.</p>

  <h2>After a supplier has accepted</h2>
  <p>Part of what you paid goes to the supplier — not to Sambramo — because they turned other work away
  for your date. The proportion depends on how close to the event you cancel, and it is shown to you
  before you confirm the cancellation, never discovered afterwards.</p>

  <h2>The ${esc(inr(lock))} hold</h2>
  <p>${esc(inr(lock))} holds your quoted price and your date while you decide. It is adjusted against the
  final bill if you go ahead, and refunded in full if you do not. That is the entire risk of asking
  Sambramo to price a celebration.</p>

  <h2>If something goes wrong on the day</h2>
  <p>Your money is held until 24 hours after the event. Raise anything within that window and the
  payment stays held until it is settled. Suppliers are paid once the event is done and you have had a
  chance to speak.</p>

  <h2>How refunds are paid</h2>
  <p>To the method you paid with. Timelines depend on your bank and are stated when the refund is
  raised rather than estimated optimistically here.</p>
  <p class="muted">Booking terms version ${esc(legal.bookingTerms.version)}.</p>` },

    'grievance': {
      url: U.grievance, h1: 'Grievance redressal', eyebrow: 'Legal · Pending incorporation',
      lede: 'How to complain, and what Sambramo has to do about it.',
      title: fitTitle('Grievance Redressal', brand.name),
      description: 'How to raise a complaint with Sambramo, the statutory acknowledgement and resolution windows, and the interim contact route while incorporation completes.',
      noindex,
      body: `
<div class="wrap section prose">
  ${PENDING(legal)}
  <h2>How do I raise a complaint?</h2>
  <p><strong>Email <a href="mailto:${esc(brand.emailGrievance)}">${esc(brand.emailGrievance)}</a> or call
  <a href="tel:${esc(brand.supportPhoneDial)}">${esc(brand.supportPhone)}</a>, ${esc(brand.hours.toLowerCase())}.</strong>
  Describe what happened and include your booking reference if you have one.</p>

  <h2>How quickly must Sambramo respond?</h2>
  <p>Consumer Protection (E-Commerce) Rules 2020, rule 4(5) requires acknowledgement within
  <strong>${esc(gr.acknowledgeWithinHours ?? 48)} hours</strong> of receipt and resolution within
  <strong>${esc(gr.resolveWithinDays ?? 30)} days</strong>. Sambramo holds itself to both.</p>

  <h2>Who is the Grievance Officer?</h2>
  <p>A named officer, with their own direct contact details, is required by rule 4(5) and will be
  published here the moment incorporation completes. Until then complaints go to the address and number
  above and are handled by the promoters of Sambramo directly. Naming a placeholder would be worse than
  saying this plainly.</p>

  <h2>If you are not satisfied</h2>
  <p>You may escalate to the National Consumer Helpline (1915) or file with the appropriate Consumer
  Disputes Redressal Commission. Nothing on this page limits any statutory right you have.</p>` },

    'entity': {
      url: U.entity, h1: 'Entity disclosure', eyebrow: 'Legal · Pending incorporation',
      lede: 'Who Sambramo is, legally, as required by the Consumer Protection (E-Commerce) Rules 2020.',
      title: fitTitle('Entity Disclosure', brand.name),
      description: 'Statutory entity disclosure for Sambramo under the Consumer Protection (E-Commerce) Rules 2020, and what is still outstanding while incorporation completes.',
      noindex,
      body: `
<div class="wrap section prose">
  ${PENDING(legal)}
  <h2>What is disclosed today</h2>
  <div class="table-scroll"><table>
    <tbody>
      <tr><th scope="row">Brand name</th><td>${esc(legal.entity.brandName ?? brand.name)}</td></tr>
      <tr><th scope="row">Registered legal name</th><td class="muted">${legal.entity.legalName ? esc(legal.entity.legalName) : 'Pending incorporation'}</td></tr>
      <tr><th scope="row">CIN</th><td class="muted">${legal.entity.cin ? esc(legal.entity.cin) : 'Pending incorporation'}</td></tr>
      <tr><th scope="row">GSTIN</th><td class="muted">${legal.entity.gstin ? esc(legal.entity.gstin) : 'Pending registration'}</td></tr>
      <tr><th scope="row">Registered office</th><td class="muted">${legal.entity.registeredAddress ? esc(legal.entity.registeredAddress) : 'Pending incorporation'}</td></tr>
      <tr><th scope="row">Customer care email</th><td><a href="mailto:${esc(brand.emailSupport)}">${esc(brand.emailSupport)}</a></td></tr>
      <tr><th scope="row">Customer care phone</th><td><a href="tel:${esc(brand.supportPhoneDial)}">${esc(brand.supportPhone)}</a></td></tr>
      <tr><th scope="row">Grievance contact</th><td><a href="mailto:${esc(brand.emailGrievance)}">${esc(brand.emailGrievance)}</a></td></tr>
      <tr><th scope="row">Area of operation</th><td>Bengaluru, Karnataka, India</td></tr>
    </tbody>
  </table></div>

  <h2>Why this page exists</h2>
  <p>Rules 4(2) and 5 of the Consumer Protection (E-Commerce) Rules 2020 require an e-commerce entity to
  publish its legal name, registered address, customer care details and grievance officer. Sambramo is
  not yet incorporated, so some of those facts do not exist. They are shown as pending rather than
  filled with something approximate, and this page is kept out of search results until they are real.</p>

  <h2>Who you are contracting with in the meantime</h2>
  <p>The promoters of Sambramo, personally. Nothing in any agreement limits a right you have against
  them. See the <a href="${U.terms}">terms of service</a>.</p>` },
  }

  const p = pages[which]
  return {
    title: p.title, description: clamp(p.description), noindex: p.noindex,
    navCurrent: null,
    crumbs: crumb({ name: 'Legal' }, { name: p.h1 }),
    body: `<div class="wrap pagehead"><p class="eyebrow">${esc(p.eyebrow)}</p>
      <h1>${esc(p.h1)}</h1><p class="lede">${esc(p.lede)}</p></div>${p.body}`,
    schema: S.graph([
      S.webPage({ url: p.url, title: p.title, description: clamp(p.description), lastmod }),
      S.breadcrumbList(p.url, crumb({ name: 'Legal' }, { name: p.h1 })),
    ]),
  }
}
