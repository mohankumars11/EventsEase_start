/**
 * Routes that own the whole screen.
 *
 * A checkout, a six-step wizard and a login are single-decision screens: the
 * tab bar and the chat entry both disappear there, because anything in the
 * bottom strip on those pages is an invitation to abandon halfway.
 *
 * This lives in one file because two components have to agree on the list.
 * They did not before — the nav hid itself on the wizard while the chat
 * bubble stayed floating over it — and a list copied into two files is a list
 * that drifts.
 */
export const FOCUSED_ROUTES = [
  '/plan/custom',
  // The guided journey. One question per screen for up to thirty screens —
  // a tab bar under that is a permanent offer to give up, and the chat
  // bubble sits exactly where its Continue button is.
  '/celebrate',
  // Instant booking, for the same two reasons and one more. Its pinned
  // action bar occupies exactly the strip the tab bar wants, so both
  // render and the lower one is unreachable — and on the matching screen
  // that lower control is "Pay for 3 · ₹31,200".
  '/book',
  '/plan/confirmation',
  '/login',
  '/signup',
  '/auth/callback',
  '/onboarding',
  // The two operator consoles. BottomNav already hides itself for the vendor
  // and admin roles ("who work inside dedicated dashboards"); the chat bubble
  // did not, so a customer-support launcher floated over an internal tool and
  // sat on top of the numbers — on the admin Area Demand screen it covered a
  // category's revenue figure outright. Same reasoning, same list.
  '/dashboard/admin',
  '/dashboard/vendor',
]

export function isFocusedRoute(pathname) {
  return FOCUSED_ROUTES.some(p => pathname === p || pathname.startsWith(p + '/'))
}
