/**
 * Voice search. In the apk it is the phone's own speech recogniser
 * (@capacitor-community/speech-recognition, Google's "Speak now" popup,
 * Indian English); in a browser it is the Web Speech API where the
 * browser has one. `canListen()` hides the mic where neither exists, so
 * it is never a button that does nothing.
 */
const NATIVE = () => typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()
const WebSR = () => (typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null)

export const canListen = () => NATIVE() || !!WebSR()

/** Resolves the words heard, or null if nothing was said or it was refused. */
export async function listen() {
  if (NATIVE()) {
    const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
    const { available } = await SpeechRecognition.available()
    if (!available) return null
    const perm = await SpeechRecognition.requestPermissions()
    if (perm?.speechRecognition !== 'granted') return null
    const r = await SpeechRecognition.start({ language: 'en-IN', maxResults: 1, prompt: 'Say an occasion or a service', partialResults: false, popup: true })
    return r?.matches?.[0]?.trim() || null
  }
  const SR = WebSR()
  if (!SR) return null
  return new Promise(resolve => {
    const r = new SR()
    r.lang = 'en-IN'; r.interimResults = false; r.maxAlternatives = 1
    r.onresult = e => resolve(e.results?.[0]?.[0]?.transcript?.trim() || null)
    r.onerror = () => resolve(null)
    r.onend = () => resolve(null)
    r.start()
  })
}
