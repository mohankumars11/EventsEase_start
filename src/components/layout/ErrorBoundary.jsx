import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * Catches render-time errors so a single bad value can't take down the
 * whole site.
 *
 * Without this, React unmounts the entire tree on any uncaught render
 * error and the customer is left staring at a blank white page with no
 * way forward — no header, no back button, nothing. One malformed row
 * from Supabase, one `undefined.map`, and the app is simply gone until
 * they think to reload. That is the difference between a page degrading
 * and the business disappearing.
 *
 * Must be a class: React has no hook equivalent of componentDidCatch.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SECOND PRESS OF "TRY AGAIN" CANNOT BE THE SAME AS THE FIRST
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Try again" was `window.location.reload()`, and Capacitor serves deep
 * paths from index.html, so a reload re-renders the screen that just
 * failed. When the cause is deterministic -- a missing chunk, a storage
 * write that always throws -- pressing it is guaranteed to fail again.
 *
 * That is what a partner hit after the onboarding cards: crash, Try
 * again, same crash, forever, with no way to reach any other screen.
 *
 * So the button counts. The first press reloads, because a transient
 * failure is the common case and a reload genuinely fixes it. A second
 * failure at the same path means the reload is not the answer, and the
 * offer changes to one that leaves the broken screen entirely.
 */
/* Survives the remount, because the boundary itself is keyed by
   pathname in App.jsx -- a per-instance counter would reset to zero on
   exactly the navigation we are trying to count. */
const FAILURES = 'sb_boundary_fails_v1'

const recordFailure = path => {
  try {
    const raw = JSON.parse(sessionStorage.getItem(FAILURES) ?? '{}')
    const next = { ...raw, [path]: Number(raw?.[path] ?? 0) + 1 }
    sessionStorage.setItem(FAILURES, JSON.stringify(next))
    return next[path]
  } catch { return 1 }
}

export default class ErrorBoundary extends Component {
  state = { error: null, repeated: false }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Kept as console output rather than swallowed — this is the only
    // signal anyone gets that a customer hit a crash. Swap in a real
    // reporter (Sentry et al) here when one exists.
    console.error('[Sambramo] Unhandled render error:', error, info?.componentStack)
    const path = typeof window !== 'undefined' ? window.location.pathname : ''
    this.setState({ repeated: recordFailure(path) > 1 })
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  /* Leaves the screen rather than retrying it. `/` re-runs the launch
     decision in RootScreen, which for a signed-out partner is the
     onboarding cards and for a signed-in one is their dashboard —
     either way, somewhere that works.

     A hard assignment, not router navigation: the router lives inside
     this boundary and may be part of what just failed. */
  handleHome = () => {
    try { sessionStorage.removeItem(FAILURES) } catch { /* private mode */ }
    window.location.assign('/')
  }

  render() {
    if (!this.state.error) return this.props.children
    const { repeated } = this.state

    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-saffron-100 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={30} className="text-saffron-600" />
          </div>

          <h1 className="font-serif text-2xl font-bold text-gray-900 mb-2">
            {repeated ? 'This screen is still not loading' : 'Something went wrong on our side'}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-7">
            {repeated
              ? <>Reloading has not helped, so there is no point asking you to do
                  it again. Starting from the beginning will get you moving —
                  nothing you had saved has been lost.</>
              : <>Sorry about that — this one's on us, not you. Nothing you'd saved
                  has been lost. Try again, and if it keeps happening our team is a
                  message away.</>}
          </p>

          {/* The order flips deliberately. After a second failure at the same
              path, the button that has already failed twice stops being the
              one under the reader's thumb. */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {repeated ? (
              <>
                <button onClick={this.handleHome} className="btn-plum">
                  <Home size={16} /> Start again
                </button>
                <button onClick={this.handleReload} className="btn-secondary">
                  <RefreshCw size={16} /> Reload anyway
                </button>
              </>
            ) : (
              <>
                <button onClick={this.handleReload} className="btn-plum">
                  <RefreshCw size={16} /> Try again
                </button>
                <button onClick={this.handleHome} className="btn-secondary">
                  <Home size={16} /> Go home
                </button>
              </>
            )}
          </div>

          {/* Developer detail, collapsed. Real users skip past it; whoever
              is debugging gets the message and stack without a console. */}
          {import.meta.env.DEV && (
            <details className="mt-8 text-left">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-600">
                Error details
              </summary>
              <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded-xl text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                {this.state.error?.stack ?? String(this.state.error)}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}
