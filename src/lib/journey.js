import { useSyncExternalStore } from 'react'

/**
 * Where the customer has been, and the one place worth putting them back.
 *
 * ── The gap this closes ─────────────────────────────────────────────────
 * Every deep flow in this app already saves its own draft — the wizard writes
 * `sambramo_wizard_draft`, the builder writes its state, the cart persists to
 * localStorage and Supabase, the picked date lives in hooks/useEventDate. What
 * none of them had was a way to be *found again*.
 *
 * The observable failure: somebody four steps into the celebration wizard taps
 * the Home tab — to check a price, to look at a festival, because a phone
 * back-gesture fired — and home is a clean marketing screen with no trace of
 * what they were doing. The draft is still on disk. Nothing on any screen
 * mentions it. To get back they have to remember the URL, and they do not, so
 * a four-minute build becomes a bounce. That is the single most expensive
 * silent failure in the funnel, and it costs one component to fix.
 *
 * So this records every navigation and answers one question: "is there
 * unfinished work, and where is it?" ResumePrompt asks that on the home screen
 * and offers the way back.
 *
 * ── Client-side only, deliberately ──────────────────────────────────────
 * No table, no migration, no write on the critical path. Migrations here are
 * applied by hand (see PROJECT_SUMMARY) and code that depends on an unapplied
 * one breaks in production only — a resume prompt is not worth that risk, and
 * the thing it points at (the draft) is local anyway. If this ever needs to
 * follow a customer across devices it becomes a table then, not now.
 *
 * ── sessionStorage, matching the drafts it points at ────────────────────
 * This is the important decision. localStorage would outlive the drafts, which
 * are sessionStorage — so next week the app would offer to resume a wedding
 * plan and land the customer on step 1 of an empty form. An offer to restore
 * work that no longer exists is worse than no offer: it is the app claiming to
 * have remembered something it threw away. Same lifetime as the work, or no
 * offer.
 *
 * ── A store, not a context ──────────────────────────────────────────────
 * Same reasoning as hooks/useEventDate, which this sits beside: a provider
 * would have to wrap the router, and every consumer would stop being mountable
 * on its own. `useSyncExternalStore` gives the shared value with no wiring.
 */

export const JOURNEY_KEY = 'sambramo_journey'

/** Trail length. Twenty is far more than any prompt shows — it is kept because
 *  "the last few places you were" is the thing a resume decision is made from,
 *  and an unbounded array in storage is a leak with a slow fuse. */
const TRAIL_MAX = 20

/**
 * How much a page is worth coming back to.
 *
 *   2 — real work in progress. A part-built celebration, a full cart, a
 *       checkout. Losing this loses money and the customer's time.
 *   1 — a considered choice. A specific service, a product, one occasion.
 *       Worth restoring, but nobody has invested minutes in it.
 *   0 — browsing. Home, the shop front, the plan hub. Recorded in the trail
 *       because "where did they go" is the whole point, never offered as a
 *       resume: "would you like to return to the home page" is a joke.
 */
export const WEIGHT = { WORK: 2, CHOICE: 1, BROWSE: 0 }

/**
 * The map of the product, as data.
 *
 * One table rather than conditionals scattered through a tracker component,
 * for the same reason `config/adminNav` is data: the sidebar, the palette and
 * the page header cannot drift when they read one list. First match wins, so
 * the specific patterns are listed above the general ones.
 *
 * `label` is what a customer is shown — written as the thing they were doing,
 * not as the route. "Your celebration plan", never "/plan/custom".
 */
const ROUTES = [
  // ── Real work ──────────────────────────────────────────────────────
  { test: p => p === '/plan/custom',            label: 'Your celebration request', weight: WEIGHT.WORK,   verb: 'Finish' },
  { test: p => p.startsWith('/plan/build'),     label: 'Your celebration plan',    weight: WEIGHT.WORK,   verb: 'Finish' },
  { test: p => p === '/shop/cart',              label: 'Your shopping basket',     weight: WEIGHT.WORK,   verb: 'Check out' },
  { test: p => p === '/dashboard/customer/cart',label: 'Your celebration cart',    weight: WEIGHT.WORK,   verb: 'Review' },

  // ── A considered choice ────────────────────────────────────────────
  { test: p => p.startsWith('/shop/product/'),  label: 'A product you were viewing', weight: WEIGHT.CHOICE, verb: 'Back to' },
  { test: p => p.startsWith('/service/'),       label: 'A service you were viewing', weight: WEIGHT.CHOICE, verb: 'Back to' },
  { test: p => p.startsWith('/services/'),      label: 'An occasion you opened',     weight: WEIGHT.CHOICE, verb: 'Back to' },
  { test: p => p.startsWith('/festivals/'),     label: 'A festival you opened',      weight: WEIGHT.CHOICE, verb: 'Back to' },

  // ── Browsing ───────────────────────────────────────────────────────
  { test: p => p === '/plan',                   label: 'Planning',        weight: WEIGHT.BROWSE },
  { test: p => p === '/services',               label: 'Occasions',       weight: WEIGHT.BROWSE },
  { test: p => p.startsWith('/shop'),           label: 'The shop',        weight: WEIGHT.BROWSE },
  { test: p => p.startsWith('/dashboard/customer/orders'),   label: 'Your orders',       weight: WEIGHT.BROWSE },
  { test: p => p.startsWith('/dashboard/customer/requests'), label: 'Your requests',     weight: WEIGHT.BROWSE },
  { test: p => p.startsWith('/dashboard/customer/events'),   label: 'Your celebrations', weight: WEIGHT.BROWSE },
]

/**
 * Screens that are never recorded at all.
 *
 * The auth screens and the operator consoles. A resume prompt that says "carry
 * on where you left off — the sign-in page" is noise, and an admin working a
 * console is not on the customer journey this describes.
 */
const IGNORED = ['/login', '/signup', '/auth/callback', '/dashboard/admin', '/dashboard/vendor', '/onboarding']

/** Home, in both its forms. The prompt only ever appears here — see below. */
export const HOME_PATHS = ['/', '/dashboard/customer']

export function isHomePath(pathname) {
  return HOME_PATHS.includes(pathname)
}

function classify(pathname) {
  if (IGNORED.some(p => pathname === p || pathname.startsWith(p + '/'))) return null
  if (isHomePath(pathname)) return { label: 'Home', weight: WEIGHT.BROWSE }
  const hit = ROUTES.find(r => r.test(pathname))
  if (!hit) return null
  return { label: hit.label, weight: hit.weight, verb: hit.verb }
}

// ── The store ─────────────────────────────────────────────────────────

const EMPTY = { trail: [], dismissed: [] }

function read() {
  try {
    const raw = sessionStorage.getItem(JOURNEY_KEY)
    if (!raw) return EMPTY
    const value = JSON.parse(raw)
    if (!Array.isArray(value?.trail)) return EMPTY
    return { trail: value.trail, dismissed: Array.isArray(value.dismissed) ? value.dismissed : [] }
  } catch {
    return EMPTY            // storage off, private mode, or SSR. Not an error.
  }
}

let snapshot = read()
const listeners = new Set()

function commit(next) {
  snapshot = next
  try { sessionStorage.setItem(JOURNEY_KEY, JSON.stringify(snapshot)) }
  catch { /* storage off; the in-memory value still works for this page */ }
  listeners.forEach(fn => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function getSnapshot() {
  return snapshot
}

/** The journey right now, outside a component. */
export function getJourney() {
  return snapshot
}

/**
 * Record a navigation.
 *
 * Re-entering the page you are already on updates its timestamp instead of
 * pushing a duplicate — otherwise a page that re-renders with a changed query
 * string (the shop's category chips, the cake occasion filter) would fill the
 * whole trail with itself and push every other place out.
 */
export function recordVisit(pathname, search = '') {
  const meta = classify(pathname)
  if (!meta) return

  const href = pathname + (search || '')
  const at = Date.now()
  const head = snapshot.trail[0]

  if (head?.path === pathname) {
    // Same page, newer moment — and keep whatever detail the page reported.
    const trail = [{ ...head, href, at }, ...snapshot.trail.slice(1)]
    commit({ ...snapshot, trail })
    return
  }

  const entry = { path: pathname, href, label: meta.label, weight: meta.weight, verb: meta.verb ?? 'Back to', at }
  commit({ ...snapshot, trail: [entry, ...snapshot.trail].slice(0, TRAIL_MAX) })
}

/**
 * Let a page say what the customer had actually got to.
 *
 * "Your celebration request" is true but thin; "Step 4 of 6 · Wedding" is the
 * thing that makes somebody tap Resume, because it proves the work is still
 * there. Only pages that know something the URL does not should call this.
 */
export function noteDetail(detail) {
  const head = snapshot.trail[0]
  if (!head || head.detail === detail) return
  commit({ ...snapshot, trail: [{ ...head, detail: detail || undefined }, ...snapshot.trail.slice(1)] })
}

/**
 * The one place worth going back to, or null.
 *
 * Not simply "the last resumable page". Consider: wizard → a product → home.
 * The most recent resumable page is the product, but the work is the wizard —
 * four minutes of answers against ten seconds of a glance. So the strongest
 * entry wins and recency only breaks ties, which is what makes the prompt
 * offer the thing a person would actually have wanted back.
 *
 * `now` is injectable so the staleness rule can be tested without waiting.
 */
export function resumeTargetOf(journey, { currentPath, now = Date.now() } = {}) {
  const best = (journey?.trail ?? [])
    .filter(e => e.weight >= WEIGHT.CHOICE)
    .filter(e => e.path !== currentPath)
    .filter(e => !(journey.dismissed ?? []).includes(e.href))
    // Half an hour. Past that the "work in progress" claim stops being true —
    // a tab left open over lunch is not somebody mid-decision, and a prompt
    // that fires anyway is the app guessing loudly.
    .filter(e => now - e.at < 30 * 60 * 1000)
    .sort((a, b) => (b.weight - a.weight) || (b.at - a.at))[0]

  return best ?? null
}

/** Stop offering this one. Keyed on the href, so a *different* piece of
 *  unfinished work still gets its own offer rather than inheriting a "no". */
export function dismissResume(href) {
  if (!href || (snapshot.dismissed ?? []).includes(href)) return
  commit({ ...snapshot, dismissed: [...(snapshot.dismissed ?? []), href] })
}

/** After a send, an order, a sign-out — the journey is finished, not paused. */
export function clearJourney() {
  commit(EMPTY)
}

/** Subscribe a component to the journey. */
export function useJourney() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
