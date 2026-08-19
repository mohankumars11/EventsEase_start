import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * Voice search over the browser's SpeechRecognition API.
 *
 * ── Why this is real and not an icon ────────────────────────────────────
 * A microphone drawn beside a search field is a promise. This app has been
 * bitten by exactly that before — home used to print the delivery city next
 * to a ChevronDown that belonged to no button, so the affordance lied and the
 * city was hardcoded anyway. A mic that opens nothing is the same mistake in
 * a more obvious place, so either the API is there and the button works, or
 * `supported` is false and the button is not drawn at all.
 *
 * `supported` is resolved in an effect rather than at module scope: this
 * bundle is server-rendered by nothing today, but a module-scope `window`
 * read is the kind of thing that only fails once the app is prerendered, and
 * by then the cause is three refactors back.
 *
 * ── The language ────────────────────────────────────────────────────────
 * 'en-IN', not 'en-US'. The queries this field takes are "rakhi", "seemantham",
 * "Mysore silk", "haldi" — an en-US recogniser transcribes those into
 * something the catalogue has never heard of, which makes the feature read as
 * broken rather than as unsupported. en-IN also handles Indian-accented
 * English digits and place names, which is most of what gets spoken here.
 *
 * Interim results are on, so the field fills as the customer speaks instead
 * of sitting empty for two seconds and then jumping — the empty pause is what
 * makes people tap the button a second time and cancel their own recording.
 */
export function useVoiceSearch(onResult) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  // The callback is held in a ref so starting a recognition session does not
  // depend on the caller memoising its handler. Without this, every keystroke
  // in the search field would tear down and rebuild the recogniser.
  const cbRef = useRef(onResult)
  useEffect(() => { cbRef.current = onResult }, [onResult])

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) return
    setSupported(true)

    const rec = new Ctor()
    rec.lang = 'en-IN'
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1

    rec.onresult = e => {
      const text = Array.from(e.results).map(r => r[0].transcript).join('').trim()
      if (text) cbRef.current?.(text)
    }
    // onend fires for every exit — a result, a timeout, a denied permission,
    // an abort. Clearing the flag here rather than in onresult is what stops
    // the button being stuck in its listening state after a silent session.
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)

    recRef.current = rec
    return () => { rec.onend = null; rec.onerror = null; try { rec.abort() } catch { /* already stopped */ } }
  }, [])

  const toggle = useCallback(() => {
    const rec = recRef.current
    if (!rec) return
    if (listening) { rec.stop(); return }
    try {
      rec.start()
      setListening(true)
    } catch {
      // start() throws if a session is already running — the recogniser and
      // our flag disagreed, so trust the recogniser.
      setListening(false)
    }
  }, [listening])

  return { supported, listening, toggle }
}
