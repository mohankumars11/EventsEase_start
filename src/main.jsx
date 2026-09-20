import React from 'react'
import ReactDOM from 'react-dom/client'
import ErrorBoundary from './components/layout/ErrorBoundary'
import PublicSite from './pages/PublicSite'
import './index.css'

const PUBLIC_SITE_PATHS = new Set(['/', '/about', '/how-it-works', '/partners', '/contact'])
const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
const root = document.getElementById('root')

function renderPublicSite() {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <PublicSite />
      </ErrorBoundary>
    </React.StrictMode>,
  )
}

async function bootApp() {
  const { default: App } = await import('./App')
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
}

if (PUBLIC_SITE_PATHS.has(pathname)) {
  // Public marketing pages must never depend on the authenticated app bundle.
  // Unregister any stale PWA worker from an older app deployment, then render
  // the public site from the main bundle immediately.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister())
    }).catch(() => {})
  }
  renderPublicSite()
} else {
  bootApp().catch((error) => {
    console.error('Application boot failed', error)
    if (root) root.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#160329;color:#fff;text-align:center"><div><h1 style="margin:0 0 10px">SAMBRAMO</h1><p style="margin:0;color:rgba(255,255,255,.72)">We are preparing the celebration experience. Please refresh once.</p></div></div>'
  })
}
