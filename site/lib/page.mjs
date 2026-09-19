/**
 * The document shell: <head>, masthead, breadcrumbs, footer.
 *
 * Every page on the site is this function with a different `body`. There is
 * no <script> tag anywhere in what it emits — that is not an accident or a
 * nice-to-have, it is the thing the whole site rests on. GPTBot,
 * OAI-SearchBot, ClaudeBot, PerplexityBot and CCBot do not run JavaScript;
 * they fetch bytes and parse them. check-html.mjs fails the build if a
 * <script> other than application/ld+json ever appears, which is what makes
 * `script-src 'none'` safe to ship in the CSP.
 */
import { h, raw, esc, jsonld } from './html.mjs'
import { U, abs, ORIGIN } from './urls.mjs'
import { longDate, isoDay } from './fmt.mjs'

const CSS = raw(`<link rel="stylesheet" href="/assets/site.css">`)

/**
 * Critical CSS is inlined by build.mjs, which reads tokens.css + the first
 * part of site.css and passes it here. Doing it at build time rather than
 * hand-maintaining a duplicate copy means it cannot go stale.
 */
export function shell({
  url, title, description, body,
  lastmod = null, noindex = false, schema = null,
  crumbs = null, ogType = 'website', ogImage = '/og/default.png',
  brand, criticalCss = '', navCurrent = null,
}) {
  const canonical = abs(url)
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${noindex
  ? `<meta name="robots" content="noindex,follow">`
  : `<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1">`}
<meta name="theme-color" content="#2A085C">

<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/og/logo-512.png">

<link rel="preload" as="font" type="font/woff2" href="/fonts/manrope-400.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/fonts/manrope-800.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/fonts/outfit-800.woff2" crossorigin>

<meta property="og:type" content="${esc(ogType)}">
<meta property="og:site_name" content="${esc(brand.name)}">
<meta property="og:locale" content="en_IN">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(abs(ogImage))}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(brand.name)} — ${esc(brand.categoryLine)}">
<meta name="twitter:card" content="summary_large_image">

<style>${criticalCss}</style>
${CSS}
${schema ? `<script type="application/ld+json">${jsonld(schema)}</script>` : ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${masthead(brand, navCurrent)}
${crumbs ? breadcrumbs(crumbs) : ''}
<main id="main">
${body}
</main>
${stickyBar()}
${footer(brand, lastmod)}
</body>
</html>
`
}

/* ── Masthead ────────────────────────────────────────────────────────────
   Six links, real anchors, no JavaScript. On a narrow screen they wrap
   instead of collapsing into a menu, because a CSS-only disclosure is a
   worse experience than two rows of text and a JS one is not available. */

const NAV = [
  ['occasions', U.occasions, 'Occasions'],
  ['services', U.services, 'Services'],
  ['how', U.howItWorks, 'How it works'],
  ['costs', U.whatItCosts, 'What it costs'],
  ['partners', U.partners, 'For partners'],
  ['contact', U.contact, 'Contact'],
]

function masthead(brand, current) {
  return `<header class="masthead">
  <div class="wrap masthead-inner">
    <a class="wordmark" href="/">${esc(brand.name)}<small>${esc(brand.categoryLine)}</small></a>
    <nav class="nav" aria-label="Main">
      <ul>${NAV.map(([k, href, label]) =>
        `<li><a href="${href}"${k === current ? ' aria-current="page"' : ''}>${esc(label)}</a></li>`).join('')}</ul>
      <a class="nav-cta" href="${U.customerApp}">Open App</a>
    </nav>
  </div>
  <div class="hero-aurora" role="presentation"></div>
</header>`
}

function breadcrumbs(trail) {
  return `<nav class="wrap crumbs" aria-label="Breadcrumb"><ol>${
    trail.map(t => `<li>${t.url ? `<a href="${t.url}">${esc(t.name)}</a>` : `<span>${esc(t.name)}</span>`}</li>`).join('')
  }</ol></nav>`
}

/* ── Footer ──────────────────────────────────────────────────────────────
   Deliberately large. It is the crawl backbone: it puts every hub two
   clicks from every page, so one crawl pass reaches the whole site. The
   per-section link lists are injected by build.mjs, which has the content.
   NAP is here on every page, byte-identical, because that consistency is
   what lets a model resolve "Sambramo" to one entity. */

let FOOTER_LINKS = ''
export const setFooterLinks = html => { FOOTER_LINKS = html }

function footer(brand, lastmod) {
  return `<footer class="footer">
  <div class="wrap">
    <div class="footer-cols">
      ${FOOTER_LINKS}
      <div>
        <h2>Talk to a person</h2>
        <ul>
          <li class="footer-nap">${esc(brand.name)}</li>
          <li>Bengaluru, Karnataka, India</li>
          <li><a href="tel:${esc(brand.supportPhoneDial)}">${esc(brand.supportPhone)}</a></li>
          <li><a href="https://wa.me/${esc(brand.whatsapp)}">WhatsApp</a></li>
          <li><a href="mailto:${esc(brand.email)}">${esc(brand.email)}</a></li>
          <li>${esc(brand.hours)}</li>
        </ul>
      </div>
    </div>
    <div class="footer-legal">
      <p>© ${new Date().getFullYear()} ${esc(brand.name)}. ${esc(brand.tagline)}</p>
      <p>Prices shown on this site are indicative, not quotes. Sambramo arranges celebrations in Bengaluru only.
      <a href="${U.entity}">Entity disclosure</a> · <a href="${U.terms}">Terms</a> ·
      <a href="${U.privacy}">Privacy</a> · <a href="${U.cookies}">Cookies</a> ·
      <a href="${U.refunds}">Cancellation &amp; refunds</a> ·
      <a href="${U.grievance}">Grievance redressal</a></p>
      ${lastmod ? `<p>This page last updated <time datetime="${esc(isoDay(lastmod))}">${esc(longDate(lastmod))}</time>.</p>` : ''}
    </div>
  </div>
</footer>`
}

/* ── Shared blocks ─────────────────────────────────────────────────────── */

/**
 * The anticipation button.
 *
 * Neither app has shipped, so nothing on this site links to one. Every CTA
 * is this: a plain form that posts to a function and redirects. It works
 * with JavaScript disabled, which is the only reason the no-JS guarantee
 * above survives having a form at all.
 *
 * `preset` records which page the person came from, so you learn which of
 * the 25 occasions and 26 trades actually pull demand before you build for
 * them.
 */
/**
 * The two doors.
 *
 * Every page ends here, and it is the one component that decides what this
 * website is FOR. The website explains Sambramo; the app is Sambramo. So
 * the job of the last thing on every page is to hand the reader to
 * whichever product is theirs, and there are exactly two:
 *
 *   customer → /app          the booking experience
 *   partner  → /partners/    the supplier side, which explains before it
 *                            asks, because a supplier is being recruited
 *                            rather than served
 *
 * `preset` carries which page the reader came from into the waitlist,
 * which is how you learn which of the 25 occasions and 26 trades pull
 * demand. It rides on the secondary CTA, not the primary one — the app
 * has its own analytics and does not need a query string from us.
 */
export function twoDoors({ brand, heading, blurb, preset = null, lean = 'customer' }) {
  const wl = U.waitlist + (preset ? `?for=${encodeURIComponent(preset)}` : '')
  const customerFirst = lean !== 'partner'
  const customer = `<a class="btn btn--primary" href="${U.customerApp}">Open Customer App</a>`
  const partner = `<a class="btn btn--dark" href="${U.partners}">Partner With Sambramo</a>`
  return `<section class="section section--sunk" id="get-started">
  <div class="wrap">
    <div class="doors">
      <p class="eyebrow">Bengaluru</p>
      <h2 style="margin-top:.4rem">${esc(heading)}</h2>
      <p class="lede">${esc(blurb)}</p>
      <div class="btn-row">
        ${customerFirst ? customer + partner : partner + customer}
      </div>
      <p class="doors-alt">
        Not ready yet? <a href="${wl}">Tell us what you are planning</a>
        and a coordinator will call you — or
        <a href="https://wa.me/${esc(brand.whatsapp)}">ask on WhatsApp</a>.
      </p>
    </div>
  </div>
</section>`
}

/* The old name, kept so the 150 call sites did not all have to change in
   one commit. Same two doors underneath. */
export const waitlistCta = ({ brand, heading, blurb, preset = null, audience = 'customer' }) =>
  twoDoors({ brand, heading, blurb, preset, lean: audience })

/**
 * Sticky call to action, phones only.
 *
 * A reader on a phone is three screens deep in an occasion page with the
 * nav long gone. CSS-only: position:fixed and a media query, no scroll
 * listener, so it costs nothing and survives `script-src 'none'`.
 * Hidden above 820px, where the masthead is still in view.
 */
export function stickyBar() {
  return `<div class="sticky-cta" role="complementary" aria-label="Get started">
  <a class="btn btn--primary" href="${U.customerApp}">Open App</a>
  <a class="btn btn--ghost" href="${U.partners}">For partners</a>
</div>`
}

export { ORIGIN }

/* ── Photography ─────────────────────────────────────────────────────────
 *
 * Every photograph on this site is licensed stock, and every one says so.
 *
 * Sambramo is pre-launch and has run no events, so there is nothing of its
 * own to show. The product already settled how to handle that: migration 048
 * makes every shop tile read "Representative image" until somebody uploads a
 * photograph of the actual piece. A caption naming the source is the
 * difference between illustrating a page and implying you did the work in
 * the picture — and on a site with no reviews, that distinction is most of
 * what the visitor has to go on.
 *
 * width and height are mandatory and come from the file's own JPEG header
 * (see scripts/pull-images.mjs), so the page never reflows when the image
 * lands. check-html.mjs fails the build on an <img> without them.
 */
let CREDITS = {}
export const setCredits = c => { CREDITS = c }

export function photo(id, { alt, caption = null, priority = false, className = '' } = {}) {
  const c = CREDITS[id]
  if (!c) return ''
  const by = c.author ? `${c.source} · ${c.author}` : c.source
  return `<figure${className ? ` class="${esc(className)}"` : ''}>
  <img src="/img/${esc(id)}.jpg" alt="${esc(alt)}"
       width="${esc(c.width)}" height="${esc(c.height)}"
       ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
  <figcaption>${caption ? `${esc(caption)} · ` : ''}Representative image, not a Sambramo event. ${esc(by)}.</figcaption>
</figure>`
}
