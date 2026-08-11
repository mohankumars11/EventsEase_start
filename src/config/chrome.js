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
  '/plan/confirmation',
  '/login',
  '/signup',
  '/auth/callback',
  '/onboarding',
]

export function isFocusedRoute(pathname) {
  return FOCUSED_ROUTES.some(p => pathname === p || pathname.startsWith(p + '/'))
}
