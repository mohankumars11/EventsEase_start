import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onNativePushAction } from '../../lib/nativePush'
import { registerReturnListener } from '../../lib/googleAuth'

/**
 * Take the master to the job they just tapped.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * `onNativePushAction` was written, exported, documented — and never
 * called. Nothing in the app registered a tap listener, so a partner who
 * tapped "New job near you" got the app reopened on whatever screen it
 * was last on, with no navigation and no refresh.
 *
 * Reported exactly as it behaves: "notification is coming like a pop up
 * but when clicked on it it's not showing under jobs, it's disappearing."
 * Nothing was disappearing. Nothing was ever arriving.
 *
 * This is the worst possible place to drop a tap. A job offer is live for
 * a matter of minutes; the notification is the only thing that reaches a
 * partner who is not holding the phone, and the tap is the entire point
 * of sending it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT LISTENS FOR TWO EVENTS, NOT ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 *   tapped     the partner chose this job. Navigate.
 *
 *   received   a push landed while the app was already open. Do NOT
 *              navigate — yanking somebody off the screen they are
 *              reading because a second job arrived is worse than the
 *              silence. Fire a refresh instead, so the list they are
 *              looking at grows a row on its own.
 *
 * ── Where it goes ───────────────────────────────────────────────────
 * `data.url` from the payload, which api/_lib/fcm.js already sets to
 * /dashboard/vendor. Read from the message rather than hardcoded so a
 * future push can point somewhere else without shipping a new APK, and
 * defaulted so a malformed payload still lands somewhere useful.
 *
 * Only relative paths are followed. A `url` that arrived as
 * https://somewhere-else is not navigation, it is an open redirect with
 * a notification for a delivery mechanism.
 */
export default function PushRouter() {
  const navigate = useNavigate()

  /* Google sign-in comes home through a deep link, and it has to be
     listened for from boot rather than from the moment somebody taps the
     button.

     Android may kill a backgrounded app while a Custom Tab is in front of
     it. When Google then redirects, the app is relaunched cold and
     `appUrlOpen` fires during startup — before any button handler has run.
     A listener registered only by the button would miss it, and the
     partner would come back to a signed-out app with no idea why.

     Cheap to do here: the module no-ops on the web, and this component
     already mounts exactly once for the same reason. */
  useEffect(() => { registerReturnListener() }, [])

  useEffect(() => {
    let stop = () => {}
    let dead = false

    onNativePushAction(({ tapped, data }) => {
      if (tapped) {
        const to = typeof data?.url === 'string' && data.url.startsWith('/')
          ? data.url
          : '/dashboard/vendor'
        navigate(to)
        return
      }

      /* Arrived while the app was open. The dashboard polls and
         subscribes already, so this only shortens the wait — and it is
         a plain event rather than a prop so nothing has to be threaded
         through four components to hear it. */
      window.dispatchEvent(new CustomEvent('sambramo:push', { detail: data }))
    }).then(off => {
      // Resolved after an unmount: tear down immediately rather than
      // leaking a listener into the next mount.
      if (dead) off()
      else stop = off
    }).catch(() => { /* no bridge, or the plugin is absent. Web handles itself. */ })

    return () => { dead = true; stop() }
  }, [navigate])

  return null
}
