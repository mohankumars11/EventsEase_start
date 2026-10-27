/**
 * Sambu — the little Sambramo buddy (Mohan, 2026-10-27).
 *
 * The "tell us more" screens are where people get tired and leave, so a
 * cheerful kid in a party hat pops up from the bottom corner: on arrival,
 * again whenever the customer goes quiet for a few seconds, and right
 * after they answer something ("6 hours — great choice!"). Every line is
 * about the next tap and why it is worth it (the price, paying
 * instantly) — never a lecture. Touching the screen hides the bubble;
 * the ✕ sends Sambu away for the rest of the session.
 *
 *   <Buddy id="brief" lines={[…]} cheer={text} action={{ label, onClick }} />
 */
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

export default function Buddy({ id = 'buddy', lines = [], cheer = null, action = null, idle = 8000, bottom = 112 }) {
  const [off, setOff] = useState(() => { try { return sessionStorage.getItem(`sbm.cx.buddy.${id}`) === 'off' } catch { return false } })
  const [say, setSay] = useState(null)
  const ref = useRef(lines)
  ref.current = lines
  const hideT = useRef(0)
  const speak = (text, ms = 7000) => { setSay(text); clearTimeout(hideT.current); hideT.current = setTimeout(() => setSay(null), ms) }

  useEffect(() => {
    if (off) return
    let i = 0, t = 0
    const next = () => { const l = ref.current; if (l.length) speak(l[i++ % l.length]); arm(idle + 7000) }
    const arm = ms => { clearTimeout(t); t = setTimeout(next, ms) }
    const poke = () => arm(idle)
    arm(1100)
    window.addEventListener('pointerdown', poke, { passive: true })
    window.addEventListener('scroll', poke, { passive: true })
    return () => { clearTimeout(t); clearTimeout(hideT.current); window.removeEventListener('pointerdown', poke); window.removeEventListener('scroll', poke) }
  }, [off, idle])

  useEffect(() => { if (cheer && !off) speak(cheer, 3800) }, [cheer]) // eslint-disable-line react-hooks/exhaustive-deps

  if (off) return null
  const dismiss = () => { setOff(true); try { sessionStorage.setItem(`sbm.cx.buddy.${id}`, 'off') } catch { /* storage off */ } }
  return (
    <div className="pointer-events-none fixed left-2 z-[135] flex max-w-[calc(100%-16px)] items-end gap-1" style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${bottom}px)` }} data-buddy>
      <button type="button" onClick={() => speak(ref.current[0] ?? 'I’m here to help!')} aria-label="Sambu, your helper" className="cx-buddy pointer-events-auto relative h-[70px] w-[60px] shrink-0">
        <Kid talking={!!say} />
      </button>
      {say && (
        <div key={say} className="cx-buddy-say pointer-events-auto relative mb-7 max-w-[236px] rounded-[18px] rounded-bl-[6px] bg-white px-3.5 py-2.5 shadow-[0_16px_32px_-14px_rgba(58,18,144,.65),0_0_0_1px_#EEE6FA]" role="status" aria-live="polite" data-buddy-say>
          <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[#DB2777]">Sambu</span>
          <span className="block text-[13px] font-bold leading-snug text-[#1C1033]">{say}</span>
          {action && <button type="button" onClick={() => { setSay(null); action.onClick() }} className="cx-press mt-2 rounded-full bg-[#1C1033] px-3 py-1.5 text-[12px] font-extrabold text-white" data-buddy-action>{action.label}</button>}
          <button type="button" onClick={dismiss} aria-label="Hide Sambu" className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-[#1C1033] text-white shadow"><X size={12} strokeWidth={3} /></button>
        </div>
      )}
    </div>
  )
}

/* A kid in a party hat: blinks, waves, and talks while the bubble is open. */
function Kid({ talking }) {
  return (
    <svg viewBox="0 0 60 70" className="h-full w-full drop-shadow-[0_8px_10px_rgba(58,18,144,.35)]" aria-hidden>
      <defs>
        <linearGradient id="bd-shirt" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8B5CF6" /><stop offset="1" stopColor="#5B21B6" /></linearGradient>
        <linearGradient id="bd-hat" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#FF8A1F" /><stop offset="1" stopColor="#E8430F" /></linearGradient>
      </defs>
      {/* body */}
      <path d="M14 70v-9c0-8 7-13 16-13s16 5 16 13v9Z" fill="url(#bd-shirt)" />
      <text x="30" y="65" textAnchor="middle" fontSize="9" fontWeight="900" fill="#fff" fontFamily="Manrope, sans-serif">S</text>
      <path d="M16 56q-5 4-4 11" stroke="#F6C29B" strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* the waving arm */}
      <g className="cx-buddy-wave"><path d="M44 54q8-4 9-14" stroke="#F6C29B" strokeWidth="5" strokeLinecap="round" fill="none" /><circle cx="53" cy="38" r="4" fill="#F6C29B" /></g>
      {/* head */}
      <circle cx="13.5" cy="30" r="3.4" fill="#EDB58C" /><circle cx="46.5" cy="30" r="3.4" fill="#EDB58C" />
      <circle cx="30" cy="30" r="17" fill="#F6C29B" />
      <path d="M13.5 28C13 15 23 10 31 11c9 1 16 7 15.5 17-3-6-9-9-15-9-7 0-13 3-18 9Z" fill="#2B1B12" />
      <path d="M26 12q3-6 9-4-4 1-5 5Z" fill="#2B1B12" />
      {/* party hat */}
      <g transform="rotate(14 38 12)"><path d="M31 15 38-6 45 15Z" fill="url(#bd-hat)" /><path d="M33 9h10M35 3h6" stroke="#FFE7A3" strokeWidth="2" /><circle cx="38" cy="-6" r="3" fill="#FFD23F" /></g>
      {/* face */}
      <ellipse className="cx-blink" cx="24" cy="30" rx="2.3" ry="3" fill="#1C1033" />
      <ellipse className="cx-blink" cx="36" cy="30" rx="2.3" ry="3" fill="#1C1033" />
      <circle cx="24.8" cy="29" r=".8" fill="#fff" /><circle cx="36.8" cy="29" r=".8" fill="#fff" />
      <circle cx="19.5" cy="36" r="2.6" fill="#FF8FA3" fillOpacity=".55" /><circle cx="40.5" cy="36" r="2.6" fill="#FF8FA3" fillOpacity=".55" />
      {talking ? <ellipse className="cx-talk" cx="30" cy="39" rx="3.6" ry="3" fill="#7A1F3D" /> : <path d="M25 37.5q5 4.5 10 0" stroke="#7A1F3D" strokeWidth="1.8" strokeLinecap="round" fill="none" />}
    </svg>
  )
}
