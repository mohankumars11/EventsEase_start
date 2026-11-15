/**
 * A light tick under the finger when a primary button is pressed, the way
 * Swiggy and Rapido answer a tap (Mohan, 2026-11-15). Only the solid,
 * do-something buttons (.cx-cta, .cx-solid, [data-haptic]) — a buzz on
 * every chip would be noise. Phones only: navigator.vibrate is a no-op or
 * missing on desktop and iOS, and the app already holds VIBRATE on Android.
 */
const PRIMARY = '.cx-cta, .cx-solid, [data-haptic]'

export function installPressHaptics() {
  if (typeof document === 'undefined' || typeof navigator?.vibrate !== 'function') return () => {}
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {}
  const on = e => {
    const el = e.target?.closest?.(PRIMARY)
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return
    try { navigator.vibrate(8) } catch { /* blocked */ }
  }
  document.addEventListener('pointerdown', on, { passive: true })
  return () => document.removeEventListener('pointerdown', on)
}
