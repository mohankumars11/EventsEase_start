import { Navigate } from 'react-router-dom'
import { usePartnerOnboarding } from '../../../hooks/usePartnerOnboarding'

/**
 * The lock, enforced in the router rather than on the screen.
 *
 * The six-step home already refuses to make a locked row tappable, but
 * that is a disabled button — it is not a rule. A typed URL, a stale
 * link in a push notification, or the Android back button landing on a
 * step whose prerequisite was later undone all reach the screen
 * directly.
 *
 * So the gate lives here, between the route and the component: a step
 * that is LOCKED sends the partner back to the home, which then shows
 * them what is actually next. Nothing renders in the meantime, so there
 * is no flash of a form they are not allowed to fill in.
 */
export default function StepGate({ stepId, children }) {
  const { loading, canOpen } = usePartnerOnboarding()
  if (loading) return null
  if (!canOpen(stepId)) return <Navigate to="/partner/setup" replace />
  return children
}
