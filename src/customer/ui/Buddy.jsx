/**
 * Sambu — the Sambramo assistant (Mohan, 2026-10-27/28).
 *
 * A glowing orb with a face — the shell a slow swirl of amethyst, rose
 * and gold, eyes that blink, a mouth that moves while it speaks — sitting
 * in the bottom-left corner. It greets the customer the moment a "tell us
 * more" screen opens and answers every move the screen reports
 * (`sambu('Candid — lovely!')`) at once, in a bubble and, unless muted,
 * out loud (the phone's own voice, Indian English where it has one).
 * Quiet for a few seconds, it nudges with the next step and why it is
 * worth it. There is always a way out ("In a hurry? See all masters").
 *
 * Small by design: after speaking it settles into a 46 px orb so it never
 * hides what is under it. ✕ turns Sambu off for this screen; a tiny pill
 * stays in the corner to bring it back.
 *
 *   <Buddy id="brief-photography" lines={[…]} skip={{ label, onClick }} />
 *   sambu(text, { label, onClick })   // from anywhere on the screen
 */
import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX, X } from 'lucide-react'

const EVENT = 'sbm:sambu'
const VOICE = 'sbm.cx.sambu.voice'
/** Tell Sambu what just happened; it answers straight away. */
export function sambu(text, action = null) {
  try { window.dispatchEvent(new CustomEvent(EVENT, { detail: { text, action } })) } catch { /* old webview */ }
}

let voice = null
function say(text) {
  try {
    const ss = window.speechSynthesis
    if (!ss || (navigator.userActivation && !navigator.userActivation.hasBeenActive)) return
    if (!voice) voice = ss.getVoices().find(v => /en[-_]IN/i.test(v.lang)) ?? ss.getVoices().find(v => /^en/i.test(v.lang)) ?? null
    ss.cancel()
    const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '').replace(/—/g, ', '))
    if (voice) u.voice = voice
    u.lang = voice?.lang ?? 'en-IN'
    u.rate = 1.05; u.pitch = 1.15
    ss.speak(u)
  } catch { /* no speech on this phone */ }
}

export default function Buddy({ id = 'buddy', lines = [], cheer = null, action = null, skip = null, idle = 7000, bottom = 112 }) {
  const [off, setOff] = useState(() => { try { return sessionStorage.getItem(`sbm.cx.buddy.${id}`) === 'off' } catch { return false } })
  const [loud, setLoud] = useState(() => { try { return localStorage.getItem(VOICE) !== 'off' } catch { return true } })
  const [msg, setMsg] = useState(null)
  const ref = useRef(lines)
  ref.current = lines
  const st = useRef({ off, loud })
  st.current = { off, loud }
  const hideT = useRef(0)
  const speak = (text, act = null, ms = 6000) => {
    if (st.current.off) return
    setMsg({ text, act, k: Date.now() })
    if (st.current.loud) say(text)
    clearTimeout(hideT.current)
    hideT.current = setTimeout(() => setMsg(null), ms)
  }

  useEffect(() => {
    if (off) return
    let i = 0, t = 0
    const next = () => { const l = ref.current; if (l.length) speak(l[i++ % l.length], action); arm(idle + 6000) }
    const arm = ms => { clearTimeout(t); t = setTimeout(next, ms) }
    const poke = () => arm(idle)
    arm(150)
    window.addEventListener('pointerdown', poke, { passive: true })
    window.addEventListener('scroll', poke, { passive: true })
    return () => { clearTimeout(t); clearTimeout(hideT.current); window.removeEventListener('pointerdown', poke); window.removeEventListener('scroll', poke); try { window.speechSynthesis?.cancel() } catch { /* none */ } }
  }, [off, idle]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const on = e => { if (e.detail?.text) speak(e.detail.text, e.detail.action, 4200) }
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (cheer) speak(cheer, null, 4000) }, [cheer]) // eslint-disable-line react-hooks/exhaustive-deps

  const turnOff = () => { setOff(true); setMsg(null); try { window.speechSynthesis?.cancel(); sessionStorage.setItem(`sbm.cx.buddy.${id}`, 'off') } catch { /* off */ } }
  const turnOn = () => { setOff(false); try { sessionStorage.removeItem(`sbm.cx.buddy.${id}`) } catch { /* off */ } setTimeout(() => speak(ref.current[0] ?? 'I’m back — tap anything and I’ll help!', action), 60) }
  const toggleVoice = () => { const v = !loud; setLoud(v); try { localStorage.setItem(VOICE, v ? 'on' : 'off'); if (!v) window.speechSynthesis?.cancel() } catch { /* off */ } }

  if (off) return (
    <button type="button" onClick={turnOn} className="fixed left-2 z-[135] flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2.5 text-[11px] font-extrabold text-[#5B21B6] shadow-[0_6px_16px_-8px_rgba(58,18,144,.6),0_0_0_1px_#EEE6FA]" style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${bottom}px)` }} data-buddy="off">
      <Orb size={22} /> Sambu
    </button>
  )
  const talking = !!msg
  return (
    <div className="pointer-events-none fixed left-2 z-[135] flex max-w-[calc(100%-16px)] items-end gap-1.5" style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${bottom}px)` }} data-buddy="on">
      <button type="button" onClick={() => speak(ref.current[0] ?? 'I’m here to help!', action)} aria-label="Sambu, your assistant" className="cx-sambu pointer-events-auto relative shrink-0 transition-[width,height] duration-300" style={{ width: talking ? 58 : 46, height: talking ? 58 : 46 }}>
        <Orb size={talking ? 58 : 46} talking={talking} />
      </button>
      {msg && (
        <div key={msg.k} className="cx-buddy-say pointer-events-auto relative mb-3 max-w-[246px] rounded-[18px] rounded-bl-[6px] bg-white px-3.5 py-2.5 shadow-[0_16px_32px_-14px_rgba(58,18,144,.65),0_0_0_1px_#EEE6FA]" role="status" aria-live="polite" data-buddy-say>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7C3AED]">Sambu</span>
            <button type="button" onClick={toggleVoice} aria-label={loud ? 'Mute Sambu' : 'Let Sambu speak'} className="text-[#7C3AED]">{loud ? <Volume2 size={13} /> : <VolumeX size={13} />}</button>
          </span>
          <span className="block text-[13px] font-bold leading-snug text-[#1C1033]">{msg.text}</span>
          {(msg.act || skip) && (
            <span className="mt-2 flex flex-wrap items-center gap-1.5">
              {msg.act && <button type="button" onClick={() => { setMsg(null); msg.act.onClick() }} className="cx-press rounded-full bg-[#1C1033] px-3 py-1.5 text-[12px] font-extrabold text-white" data-buddy-action>{msg.act.label}</button>}
              {skip && <button type="button" onClick={() => { setMsg(null); skip.onClick() }} className="cx-press rounded-full bg-[#F3ECFF] px-3 py-1.5 text-[12px] font-extrabold text-[#5B21B6]" data-buddy-skip>{skip.label}</button>}
            </span>
          )}
          <button type="button" onClick={turnOff} aria-label="Turn Sambu off" className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-[#1C1033] text-white shadow"><X size={12} strokeWidth={3} /></button>
        </div>
      )}
    </div>
  )
}

/* The orb: a swirling glossy shell, a face that blinks and talks. */
function Orb({ size = 46, talking = false }) {
  return (
    <span className="relative block overflow-hidden rounded-full shadow-[0_10px_22px_-8px_rgba(124,58,237,.75)]" style={{ width: size, height: size }} aria-hidden>
      <span className="cx-orb2-swirl absolute -inset-1/4 block" />
      <span className="absolute inset-0 block rounded-full bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,.85)_0%,rgba(255,255,255,0)_34%)]" />
      <span className={'absolute inset-0 block rounded-full ' + (talking ? 'cx-orb2-pulse' : '')} />
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full">
        <ellipse className="cx-blink" cx="14.5" cy="18" rx="3.1" ry="3.9" fill="#fff" /><ellipse className="cx-blink" cx="25.5" cy="18" rx="3.1" ry="3.9" fill="#fff" />
        <circle className="cx-orb2-look" cx="15.2" cy="18.6" r="1.7" fill="#1C1033" /><circle className="cx-orb2-look" cx="26.2" cy="18.6" r="1.7" fill="#1C1033" />
        <circle cx="10.5" cy="24" r="2.2" fill="#FF8FB8" fillOpacity=".7" /><circle cx="29.5" cy="24" r="2.2" fill="#FF8FB8" fillOpacity=".7" />
        {talking ? <ellipse className="cx-talk" cx="20" cy="26" rx="3.4" ry="2.8" fill="#3B0F5C" /> : <path d="M16 24.8q4 3.6 8 0" stroke="#3B0F5C" strokeWidth="1.8" strokeLinecap="round" fill="none" />}
      </svg>
    </span>
  )
}
