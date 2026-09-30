import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/layout/ErrorBoundary'
import { evictAndRefresh, handleChunkFailures, clearReloadFlag } from './lib/nativeBoot'
import './index.css'

/* A missing code chunk becomes one reload rather than the error screen.
   Registered before anything can import lazily. See lib/nativeBoot.js. */
handleChunkFailures()

/* Every apk built before scripts/build-native.mjs existed shipped a
   service worker, and a WebView's worker survives installing a new apk
   over the old one. Evicting it is the only thing that rescues a phone
   that already ran one of those builds. Native only, and a no-op on the
   web where the worker is wanted. */
/* ...and RELOADS if it found one. Unregistering a worker does not
   un-serve the page it already served: without the reload the partner
   spends the whole session looking at the previous build while the new
   one sits in the apk, unused. */
evictAndRefresh().catch(() => {})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Outermost net. App has per-route boundaries too, which keep the
        header and navigation alive when a single page fails; this one
        only catches failures in the providers or the router itself. */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

/* The app rendered, so whatever the last reload was for is behind us and
   the next missing chunk deserves its own retry. Deferred past the first
   paint so a boot that crashes does not clear the flag and re-arm the
   loop it was there to stop. */
requestAnimationFrame(() => setTimeout(clearReloadFlag, 4000))
