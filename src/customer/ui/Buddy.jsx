/**
 * Sambu — the Sambramo buddy (Mohan, 2026-10-27/28).
 *
 * The "tell us more" screens are where people tire and leave, so Sambu —
 * the waving kid in the party hat, cut from our own 3D art (art/sambu) —
 * greets the customer the moment they land, and then answers every move
 * they make: a service opened, an option tapped, hours picked, something
 * removed. Screens report a move with `sambu('Candid — lovely!')`; Sambu
 * replies at once. Quiet for a few seconds? Sambu nudges, with the next
 * step and why it is worth it (the instant price, paying in one go).
 * There is always a way out — "In a hurry? See all masters" — because the
 * questions are optional.
 *
 * The ✕ only quiets Sambu (no more pop-ups on this screen this session);
 * the little avatar stays, and a tap on it brings the help back.
 *
 *   <Buddy id="brief-photography" lines={[…]} skip={{ label, onClick }} />
 *   sambu(text, { label, onClick })   // from anywhere on the screen
 */
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { artFor } from '../data/art'

const EVENT = 'sbm:sambu'
/** Tell Sambu what just happened; he answers straight away. */
export function sambu(text, action = null) {
  try { window.dispatchEvent(new CustomEvent(EVENT, { detail: { text, action } })) } catch { /* old webview */ }
}

export default function Buddy({ id = 'buddy', lines = [], cheer = null, action = null, skip = null, idle = 7000, bottom = 112 }) {
  const [quiet, setQuiet] = useState(() => { try { return sessionStorage.getItem(`sbm.cx.buddy.${id}`) === 'off' } catch { return false } })
  const [say, setSay] = useState(null)
  const ref = useRef(lines)
  ref.current = lines
  const hideT = useRef(0)
  const quietRef = useRef(quiet)
  quietRef.current = quiet
  const speak = (text, act = null, ms = 6500) => {
    setSay({ text, act, k: Date.now() })
    clearTimeout(hideT.current)
    hideT.current = setTimeout(() => setSay(null), ms)
  }

  /* Hello the moment the screen opens, then a nudge whenever things go quiet. */
  useEffect(() => {
    if (quiet) return
    let i = 0, t = 0
    const next = () => { const l = ref.current; if (l.length) speak(l[i++ % l.length], action); arm(idle + 6500) }
    const arm = ms => { clearTimeout(t); t = setTimeout(next, ms) }
    const poke = () => arm(idle)
    arm(350)
    window.addEventListener('pointerdown', poke, { passive: true })
    window.addEventListener('scroll', poke, { passive: true })
    return () => { clearTimeout(t); clearTimeout(hideT.current); window.removeEventListener('pointerdown', poke); window.removeEventListener('scroll', poke) }
  }, [quiet, idle]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Every move the screen reports, answered at once. */
  useEffect(() => {
    const on = e => { if (!quietRef.current && e.detail?.text) speak(e.detail.text, e.detail.action, 4200) }
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  useEffect(() => { if (cheer && !quiet) speak(cheer, null, 4000) }, [cheer]) // eslint-disable-line react-hooks/exhaustive-deps

  const hush = () => { setQuiet(true); setSay(null); try { sessionStorage.setItem(`sbm.cx.buddy.${id}`, 'off') } catch { /* storage off */ } }
  const wake = () => { setQuiet(false); try { sessionStorage.removeItem(`sbm.cx.buddy.${id}`) } catch { /* storage off */ } speak(ref.current[0] ?? 'I’m here — tap anything and I’ll help!', action) }
  const pic = artFor('sambu')

  return (
    <div className="pointer-events-none fixed left-2 z-[135] flex max-w-[calc(100%-16px)] items-end gap-1.5" style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${bottom}px)` }} data-buddy={quiet ? 'quiet' : 'on'}>
      <button type="button" onClick={wake} aria-label="Sambu, your helper" className={'cx-sambu pointer-events-auto relative shrink-0 ' + (quiet ? 'h-[54px] w-[46px]' : 'h-[78px] w-[64px]')}>
        <span className="cx-sambu-ring absolute -inset-[3px] rounded-[22px]" aria-hidden />
        <span className="relative block h-full w-full overflow-hidden rounded-[20px] bg-white shadow-[0_12px_24px_-10px_rgba(58,18,144,.55)] ring-[2.5px] ring-white">
          {pic ? <img src={pic} alt="" className="cx-sambu-tilt h-full w-full object-cover object-[50%_18%]" /> : <span className="grid h-full place-items-center text-[26px]">🥳</span>}
        </span>
        {!quiet && <><span className="cx-spark absolute -right-1 -top-1 text-[12px]" aria-hidden>✦</span><span className="cx-spark absolute -left-1 top-5 text-[9px]" style={{ animationDelay: '.7s' }} aria-hidden>✦</span></>}
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#DB2777] px-1.5 py-[1px] text-[8.5px] font-black uppercase tracking-[0.08em] text-white shadow">Sambu</span>
      </button>
      {say && !quiet && (
        <div key={say.k} className="cx-buddy-say pointer-events-auto relative mb-5 max-w-[244px] rounded-[18px] rounded-bl-[6px] bg-white px-3.5 py-2.5 shadow-[0_16px_32px_-14px_rgba(58,18,144,.65),0_0_0_1px_#EEE6FA]" role="status" aria-live="polite" data-buddy-say>
          <span className="block text-[13px] font-bold leading-snug text-[#1C1033]">{say.text}</span>
          {(say.act || skip) && (
            <span className="mt-2 flex flex-wrap items-center gap-1.5">
              {say.act && <button type="button" onClick={() => { setSay(null); say.act.onClick() }} className="cx-press rounded-full bg-[#1C1033] px-3 py-1.5 text-[12px] font-extrabold text-white" data-buddy-action>{say.act.label}</button>}
              {skip && <button type="button" onClick={() => { setSay(null); skip.onClick() }} className="cx-press rounded-full bg-[#F3ECFF] px-3 py-1.5 text-[12px] font-extrabold text-[#5B21B6]" data-buddy-skip>{skip.label}</button>}
            </span>
          )}
          <button type="button" onClick={hush} aria-label="Quiet Sambu" className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-[#1C1033] text-white shadow"><X size={12} strokeWidth={3} /></button>
        </div>
      )}
    </div>
  )
}
