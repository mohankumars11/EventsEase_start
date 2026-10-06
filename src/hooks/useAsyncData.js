import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Read something, and know which of the four states you are in.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE THING THIS FIXES
 * ══════════════════════════════════════════════════════════════════════
 *
 * Almost every screen in this app did:
 *
 *     const [rows, setRows] = useState([])
 *     useEffect(() => { supabase.from(...).then(({ data }) => setRows(data ?? [])) })
 *
 * which collapses "still loading", "loaded and empty" and "the request
 * failed" into one empty array. A partner on a bad connection was shown
 * "No jobs yet" — the app telling them their work had gone, when it had
 * simply not arrived.
 *
 * `loading` starts true and `data` starts null, so the three are
 * distinguishable by construction rather than by remembering to add a
 * flag.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A FAILED RE-READ DOES NOT WIPE WHAT IS ON SCREEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * Polling screens re-read every fifteen seconds. If one of those fails
 * — a tunnel, a lift — the rows already on screen stay, and `error` is
 * set alongside them. Clearing the list because the ninth poll timed out
 * is how a live job vanishes mid-journey, which is a bug this codebase
 * has already had once in the tracking screen.
 */
export function useAsyncData(read, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const alive = useRef(true)
  const fn = useRef(read)
  fn.current = read

  const run = useCallback(async () => {
    setState(s => ({ ...s, loading: s.data === null, error: null }))
    try {
      const data = await fn.current()
      if (alive.current) setState({ data, loading: false, error: null })
    } catch (err) {
      /* Keep whatever was there. See the note above. */
      if (alive.current) setState(s => ({ ...s, loading: false, error: err ?? new Error('failed') }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    alive.current = true
    run()
    return () => { alive.current = false }
  }, [run])

  return { ...state, retry: run }
}

export default useAsyncData
