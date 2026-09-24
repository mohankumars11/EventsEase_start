import { useEffect, useState } from 'react'

/**
 * Which build is this, actually?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY AN APP NEEDS TO BE ABLE TO ANSWER THIS
 * ══════════════════════════════════════════════════════════════════════
 *
 * "The apk is old, none of the new screens are there" and "the apk is
 * current and that screen only appears under a condition you have not
 * hit" look identical from the outside, and there was no way to tell
 * them apart without unzipping the file on a laptop.
 *
 * `version.json` is written by scripts/write-version.mjs at build time
 * and copied into the apk beside index.html, so it is a fact about THIS
 * install rather than anything the running code asserts about itself.
 * Two taps, and the argument is over.
 *
 * Deliberately not a card, not a banner, and not on the Jobs tab. It is
 * the last line on the More tab, where a version string belongs.
 */
export default function BuildStamp() {
  const [v, setV] = useState(null)

  useEffect(() => {
    let alive = true
    /* Relative, and that is correct here: version.json is served from
       the apk's own asset directory alongside index.html, not from the
       API. `apiUrl()` would point it at the deploy. */
    fetch('/version.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (alive) setV(j) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (!v) return null

  const when = v.builtAt
    ? new Date(v.builtAt).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
      })
    : 'unknown'

  return (
    <p className="px-1 pt-1 text-[11px] leading-snug text-ink-mute">
      Sambramo Partner · {v.surface ?? 'unknown'} build · {when}
    </p>
  )
}
