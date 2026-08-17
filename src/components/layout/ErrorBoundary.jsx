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
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Kept as console output rather than swallowed — this is the only
    // signal anyone gets that a customer hit a crash. Swap in a real
    // reporter (Sentry et al) here when one exists.
    console.error('[Sambramo] Unhandled render error:', error, info?.componentStack)
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  handleHome = () => {
    // A hard assignment, not router navigation: the router lives inside
    // this boundary and may be part of what just failed.
    window.location.assign('/')
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-saffron-100 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={30} className="text-saffron-600" />
          </div>

          <h1 className="font-serif text-2xl font-bold text-gray-900 mb-2">
            Something went wrong on our side
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-7">
            Sorry about that — this one's on us, not you. Nothing you'd saved
            has been lost. Try again, and if it keeps happening our team is a
            message away.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={this.handleReload} className="btn-plum">
              <RefreshCw size={16} /> Try again
            </button>
            <button onClick={this.handleHome} className="btn-secondary">
              <Home size={16} /> Go home
            </button>
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
