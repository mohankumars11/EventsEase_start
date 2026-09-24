import { useEffect, useState } from 'react'

/**
 * Which build is this, actually — and is anything serving it stale?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY AN APP NEEDS TO BE ABLE TO ANSWER THIS
 * ══════════════════════════════════════════════════════════════════════
 *
 * "The apk is old, none of the new screens are there" and "the apk is
 * current and that screen needs a condition you have not hit" look
 * identical from the outside. Two days went into that gap.
 *
 * Three facts, each from a different layer, so a single line says which
 * layer is wrong:
 *
 *   built at     version.json, written at web build time and copied
 *                into the apk. A fact about the INSTALL.
 *   bundle       the hashed entry filename actually executing. If this
 *                disagrees with the apk's index.html, something is
 *                serving a cached shell.
 *   cleared      set when a stale precaching worker was found and
 *                removed. If this ever appears, a previous build was
 *                being served and now is not.
 */
export default function BuildStamp() {
  const [v, setV] = useState(null)
  const [entry, setEntry] = useState(null)
  const [evicted, setEvicted] = useState(null)

  useEffect(() => {
    let alive = true

    /* Relative on purpose: version.json sits in the apk's own asset
       directory beside index.html, not behind the API. */
    fetch('/version.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (alive) setV(j) })
      .catch(() => {})

    /* The script tag the page is actually running, read from the DOM
       rather than from anything the bundle asserts about itself. */
    try {
      const src = [...document.querySelectorAll('script[type="module"][src]')]
        .map(s => s.getAttribute('src'))
        .find(s => /index-[A-Za-z0-9_-]+\.js$/.test(s ?? ''))
      if (src) setEntry(src.split('/').pop().replace(/\.js$/, ''))
    } catch { /* nothing to show */ }

    try {
      const at = localStorage.getItem('sb_evicted_at')
      if (at) setEvicted(at)
    } catch { /* blocked storage */ }

    return () => { alive = false }
  }, [])

  if (!v && !entry) return null

  const when = v?.builtAt
    ? new Date(v.builtAt).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
      })
    : 'unknown'

  return (
    <div className="px-1 pt-1">
      <p className="text-[11px] leading-snug text-ink-mute">
        Sambramo Partner · {v?.surface ?? 'unknown'} · built {when}
      </p>
      {entry && (
        <p className="text-[11px] leading-snug text-ink-mute">
          bundle {entry}
        </p>
      )}
      {evicted && (
        /* Said out loud. It means a previous build WAS being served,
           which is the single most useful thing this component can
           report. */
        <p className="mt-0.5 text-[11px] font-semibold leading-snug text-saffron-800">
          A stale cached build was found and cleared on{' '}
          {new Date(evicted).toLocaleString('en-IN',
            { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}.
        </p>
      )}
    </div>
  )
}
