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
<link rel="preload" as="font" type="font/woff2" href="/fonts/playfair-800.woff2" crossorigin>

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
      <a href="${U.privacy}">Privacy</a> · <a href="${U.refunds}">Cancellation &amp; refunds</a> ·
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
export function waitlistCta({ brand, heading, blurb, preset = null, audience = 'customer' }) {
  const label = audience === 'partner' ? 'Get listed before we open' : 'Put me on the list'
  return `<section class="section section--sunk" id="waitlist">
  <div class="wrap">
    <div class="card" style="max-width:44rem;margin-inline:auto">
      <p class="eyebrow">${audience === 'partner' ? 'For suppliers' : 'Opening soon in Bengaluru'}</p>
      <h2 style="margin-top:.4rem">${esc(heading)}</h2>
      <p class="soft">${esc(blurb)}</p>
      <div class="btn-row">
        <a class="btn btn--primary" href="${audience === 'partner' ? U.partnerJoin : U.waitlist}${preset ? `?for=${encodeURIComponent(preset)}` : ''}">${esc(label)}</a>
        <a class="btn btn--ghost" href="https://wa.me/${esc(brand.whatsapp)}">Ask on WhatsApp</a>
      </div>
      <p class="muted" style="font-size:.8125rem;margin-top:1rem">No payment, no card, no account. We will tell you when we open, and that is all.</p>
    </div>
  </div>
</section>`
}

export { ORIGIN }
