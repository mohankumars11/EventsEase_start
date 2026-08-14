import { useState, useEffect } from 'react'
import { fetchDecorPhotos } from '../lib/decorPhotos'

/**
 * The admin's uploaded décor photographs, laid over the ones the catalogue
 * shipped with.
 *
 * ── Why this is a module-level cache and not per-component state ─────────
 * Every occasion page mounts a décor catalogue, and a customer comparing an
 * anniversary against an engagement mounts two in ten seconds. One request per
 * mount would mean a round trip on every occasion switch to fetch a table that
 * changes when a founder uploads a photograph — which is to say, almost never.
 *
 * So the promise is cached at module scope and every mount after the first
 * resolves from memory with no request at all. The cost is that an upload made
 * in another tab is not picked up until a reload, which is the correct trade
 * for a table whose write rate is a handful of rows a month.
 *
 * ── Never throws, never blocks ───────────────────────────────────────────
 * `fetchDecorPhotos` already resolves to {} for a missing table, a failed
 * request or an empty one. The initial state is {} too, so the catalogue
 * renders its shipped photographs on the first frame and swaps in any
 * overrides when they arrive — no spinner, no layout shift, and a section that
 * works identically whether migration 044 has been applied or not.
 */

let cache = null

export function invalidateDecorPhotos() {
  cache = null
}

export default function useDecorPhotos() {
  const [photos, setPhotos] = useState(() => (cache?.value ?? {}))

  useEffect(() => {
    // Already resolved once this session — nothing to wait for.
    if (cache?.value) { setPhotos(cache.value); return }

    let live = true
    // The PROMISE is cached, not just the result, so two catalogues mounting
    // in the same frame share one request rather than racing two.
    cache ??= { promise: fetchDecorPhotos().then(value => { cache = { value }; return value }) }
    cache.promise.then(value => { if (live) setPhotos(value) })

    return () => { live = false }
  }, [])

  return photos
}
