import React from 'react'
import ReactDOM from 'react-dom/client'
import ErrorBoundary from './components/layout/ErrorBoundary'
import './index.css'

const PUBLIC_SITE_PATHS = new Set(['/', '/about', '/how-it-works', '/partners', '/contact'])
const pathname = window.location.pathname.replace(/\/+$/, '') || '/'

async function boot() {
  if (PUBLIC_SITE_PATHS.has(pathname)) {
    // Keep the public marketing site completely outside the authenticated app
    // module graph. This prevents any app-only provider, dashboard, or auth
    // dependency from executing before the landing page can render.
    const { default: PublicSite } = await import('./pages/PublicSite')

    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <ErrorBoundary>
          <PublicSite />
        </ErrorBoundary>
      </React.StrictMode>,
    )
    return
  }

  const { default: App } = await import('./App')

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
}

boot().catch((error) => {
  console.error('Application boot failed', error)
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#160329;color:#fff;text-align:center"><div><h1 style="margin:0 0 10px">SAMBRAMO</h1><p style="margin:0;color:rgba(255,255,255,.72)">We are preparing the celebration experience. Please refresh once.</p></div></div>'
  }
})
