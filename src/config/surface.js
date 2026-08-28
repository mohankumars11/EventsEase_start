/**
 * Which app is this — the customer's or the partner's?
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE CODEBASE, TWO FRONT DOORS
 * ══════════════════════════════════════════════════════════════════════
 *
 * A master and a customer want completely different things from the same
 * deployment. A master opening the app wants today's jobs; a customer
 * wants to book a decorator. Sending both to the same landing page means
 * one of them is always on the wrong screen.
 *
 * The obvious answer is two Vercel projects, and it is the wrong one: two
 * builds, two sets of environment variables, two things to deploy, and
 * every shared component duplicated or extracted into a package. For a
 * difference that amounts to "where does `/` go", that is a great deal of
 * machinery.
 *
 * So it is one deployment behind two hostnames:
 *
 *   sambramoh.vercel.app           the customer app
 *   sambramo-partners.vercel.app   the partner app
 *
 * Both serve the same bundle. This module decides which one the visitor
 * is looking at, and the app arranges itself accordingly.
 *
 * ── It is also how the two Play Store apps work ──────────────────────
 * The TWA wrap in the plan is two Android apps built from one PWA, each
 * pinned to one of these hostnames. So this is not a development
 * convenience — it is the seam the packaged apps are built along.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE HOST DECIDES THE DEFAULT, NEVER THE PERMISSION
 * ══════════════════════════════════════════════════════════════════════
 *
 * This changes where somebody LANDS and what the chrome says. It grants
 * nothing and hides nothing that matters: a customer who types the
 * partner URL still sees only their own data, because RLS decides that
 * and a hostname cannot influence a Postgres policy.
 *
 * Which is the only safe way to do this. A surface that gated access
 * would be an authorisation check living in a string a visitor controls.
 */

/** Hostnames that mean "this is the partner app". */
const PARTNER_HOSTS = [
  'sambramo-partners.vercel.app',
  'partners.sambramo.com',
  // Vercel gives every preview its own hostname, so a partner preview is
  // matched on the branch prefix rather than listed one by one.
]

const PARTNER_HOST_PATTERNS = [
  /^sambramo-partners[-.]/,
  /^sambramoh-git-partner/,
]

export const SURFACE = { customer: 'customer', partner: 'partner' }

/**
 * Which surface is being served.
 *
 * Reads `window.location` at call time rather than caching at module
 * load, so it behaves in tests and in any renderer without a window.
 * Defaults to `customer`, which is the safe direction: an unrecognised
 * host shows the app most visitors want, rather than a partner console
 * to somebody who is not one.
 */
export function currentSurface() {
  /* ── A bundled native build has no hostname to read ──────────────
   *
   * Everything below decides the surface from `window.location.hostname`,
   * which works for two websites and not at all for two APKs: Capacitor
   * serves bundled assets from `localhost` in BOTH apps, so the partner
   * app would identify itself as the customer app and show the customer
   * home.
   *
   * So the native build stamps its identity in at compile time.
   * `VITE_SURFACE` is set by the Android workflow per flavour and is
   * constant-folded into the bundle, which makes it the one signal that
   * cannot be wrong: the partner APK is built from partner sources and
   * says so, with no runtime inference involved.
   *
   * Checked FIRST, and deliberately. On the web it is unset and the
   * hostname rules below apply exactly as before. */
  const stamped = import.meta.env?.VITE_SURFACE
  if (stamped === 'partner')  return SURFACE.partner
  if (stamped === 'customer') return SURFACE.customer

  if (typeof window === 'undefined') return SURFACE.customer

  // A local override, for working on the partner app without editing
  // your hosts file. Dev only — `import.meta.env.DEV` is constant-folded
  // out of the production bundle, so this cannot be used against the
  // live site.
  if (import.meta.env?.DEV) {
    const forced = new URLSearchParams(window.location.search).get('surface')
    if (forced === 'partner') return SURFACE.partner
    if (forced === 'customer') return SURFACE.customer
    try {
      const saved = sessionStorage.getItem('sambramo_surface')
      if (saved === 'partner') return SURFACE.partner
    } catch { /* storage off */ }
  }

  const host = window.location.hostname.toLowerCase()
  if (PARTNER_HOSTS.includes(host)) return SURFACE.partner
  if (PARTNER_HOST_PATTERNS.some(re => re.test(host))) return SURFACE.partner
  return SURFACE.customer
}

export const isPartnerSurface = () => currentSurface() === SURFACE.partner

/**
 * Where `/` goes on each surface.
 *
 * The partner app has no marketing home and should not pretend to: a
 * master who opens it wants today's jobs, and anybody not yet signed in
 * wants to sign up. Landing them on the customer home — festivals,
 * occasion tiles, the shop — is landing them in the wrong product.
 */
export function homeFor(surface = currentSurface(), { signedIn = false, role = null } = {}) {
  if (surface !== SURFACE.partner) return '/'
  if (!signedIn) return '/partner/join'
  return role === 'vendor' ? '/dashboard/vendor' : '/partner/join'
}

/** Brand wording that differs between the two. */
export const SURFACE_COPY = {
  [SURFACE.customer]: {
    name: 'Sambramo',
    tagline: 'Celebrations, arranged.',
  },
  [SURFACE.partner]: {
    name: 'Sambramo Partners',
    tagline: 'Work that comes to you.',
  },
}
