/**
 * The design spotlight (Mohan, 2026-10-27, after District's "In the
 * spotlight"): every design full screen, the one in the middle large and
 * live, its neighbours peeking in at the sides, dimmed. Swipe through all
 * of them; the backdrop glows in the colours of the card in front.
 * Underneath, "Make it yours" — colours, fonts, effects — changes the big
 * card as you tap, and one button takes the design.
 *
 * Only the cards near the middle are drawn in full; the rest are their
 * background colour until they come close, so ~180 designs slide smoothly
 * on a low-end phone.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { parseTheme, themeString } from '../data/inviteTemplates'
import InviteCard from './InviteCard'
import LookPicker from './inviteLook'

const TABS = [['colours', 'Colours'], ['fonts', 'Fonts'], ['effects', 'Effects']]

export default function DesignViewer({ list, start, inv, occ, look, setLook, rec, chosenId, onIndex, onUse, onClose }) {
  const track = useRef(null)
  const raf = useRef(0)
  const [at, setAt] = useState(start)
  const [tab, setTab] = useState('colours')
  const center = (k, smooth) => {
    const el = track.current, c = el?.children[k]
    if (c) el.scrollTo({ left: c.offsetLeft - (el.clientWidth - c.clientWidth) / 2, behavior: smooth ? 'smooth' : 'auto' })
  }
  useLayoutEffect(() => { center(start, false) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onIndex?.(at) }, [at]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const k = e => e.key === 'Escape' ? onClose() : e.key === 'ArrowRight' ? center(Math.min(list.length - 1, at + 1), true) : e.key === 'ArrowLeft' ? center(Math.max(0, at - 1), true) : null
    window.addEventListener('keydown', k)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', k) }
  })
  const onScroll = () => {
    if (raf.current) return
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const el = track.current
      if (!el) return
      const mid = el.scrollLeft + el.clientWidth / 2
      let best = 0, d = Infinity
      for (let k = 0; k < el.children.length; k++) {
        const c = el.children[k], dd = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid)
        if (dd < d) { d = dd; best = k }
      }
      setAt(best)
    })
  }
  const t = list[at]
  /* The glow follows what the customer made of the card, not its original colours. */
  const glow = t ? parseTheme(themeString(t.id, look), occ).t.bg : null
  const sample = { ...inv, title: inv.title || occ?.name }

  return createPortal(
    <div className="cx">
      <div className="fixed inset-0 z-[400] flex flex-col overflow-hidden bg-[#0D0717] text-white" role="dialog" aria-modal="true" aria-label="Preview designs" data-design-viewer>
        {/* The glow behind: the card's own colours, blurred big. */}
        <div aria-hidden className="pointer-events-none absolute left-[-20%] top-[6%] h-[70%] w-[140%] opacity-40 blur-[70px] transition-[background] duration-500" style={{ background: glow }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/50" />

        <header className="cx-safe-top relative z-10 flex items-center gap-3 px-4 pb-2">
          <button type="button" onClick={onClose} aria-label="Close preview" className="cx-press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/15"><X size={20} /></button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/60">In the spotlight</p>
            <p className="cx-num text-[13px] font-extrabold text-white/90">{at + 1} of {list.length} designs</p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center">{t?.id === chosenId && <span className="grid h-8 w-8 place-items-center rounded-full bg-[#22C55E] text-white"><Check size={16} strokeWidth={3.2} /></span>}</span>
        </header>

        {/* The track: big card in the middle, the neighbours peeking in. */}
        <div className="relative z-10 flex min-h-0 flex-1 items-center">
          <div ref={track} onScroll={onScroll} className="cx-noscroll flex w-full snap-x snap-mandatory items-center gap-3 overflow-x-auto py-3"
            style={{ '--w': 'min(72vw, calc((100dvh - 400px) * .8), 380px)', paddingInline: 'calc(50% - var(--w) / 2)' }} data-viewer-track>
            {list.map((d, k) => {
              const near = Math.abs(k - at) <= 2
              const on = k === at
              return (
                <div key={d.id} className="shrink-0 snap-center transition-[transform,opacity] duration-300 ease-out" style={{ width: 'var(--w)', transform: on ? 'scale(1)' : 'scale(.86)', opacity: on ? 1 : 0.45 }} data-viewer-slide={on ? 'on' : undefined}>
                  {near
                    ? <div className="overflow-hidden rounded-[22px] shadow-[0_30px_60px_-24px_rgba(0,0,0,.9)]"><InviteCard inv={sample} occasion={occ} theme={on ? themeString(d.id, look) : themeString(d.id, { art: look.art })} size="mini" /></div>
                    : <div className="aspect-[4/5] rounded-[22px]" style={{ background: d.bg }} />}
                </div>
              )
            })}
          </div>
          {at > 0 && <button type="button" onClick={() => center(at - 1, true)} aria-label="Previous design" className="cx-press absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/20"><ChevronLeft size={20} /></button>}
          {at < list.length - 1 && <button type="button" onClick={() => center(at + 1, true)} aria-label="Next design" className="cx-press absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/20"><ChevronRight size={20} /></button>}
        </div>

        <div className="relative z-10 px-5 pb-3 text-center">
          <p key={t?.id} className="cx-rise text-[20px] font-black tracking-[-0.03em]">{t?.name}</p>
          <p className="mt-0.5 text-[12.5px] font-bold text-white/65">
            {rec?.has(t?.id) ? <span className="text-[#86EFAC]">✓ Made for {occ?.name}</span> : t?.trending ? <span className="text-[#F9A8D4]">🔥 Trending</span> : t?.vibe}
            <span className="text-white/40"> · swipe for more</span>
          </p>
          <div className="mx-auto mt-2 h-1 w-32 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-white/80 transition-[width] duration-300" style={{ width: `${((at + 1) / list.length) * 100}%` }} /></div>
        </div>

        {/* Make it yours */}
        <div className="relative z-10 rounded-t-[28px] bg-white px-5 pt-3 text-[#1C1033]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }} data-viewer-panel>
          <div className="flex items-center gap-1.5">
            <p className="mr-auto text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#DB2777]">Make it yours</p>
            {TABS.map(([id, l]) => (
              <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id} className={'rounded-full px-3 py-1.5 text-[12px] font-extrabold transition ' + (tab === id ? 'bg-[#1C1033] text-white' : 'bg-[#F6F3FA] text-[var(--ink-2)]')}>{l}</button>
            ))}
          </div>
          <div className="mt-2.5 min-h-[86px]">
            {tab === 'effects' ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[['art', 'Illustration'], ['live', '✨ Live animation']].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setLook(x => ({ ...x, [k]: !x[k] }))} aria-pressed={!!look[k]}
                    className={'cx-press flex h-12 items-center justify-center gap-1.5 rounded-[14px] text-[13.5px] font-extrabold transition ' + (look[k] ? 'bg-[#EEFAF2] text-[#0B5F33] shadow-[inset_0_0_0_1.5px_#16A34A]' : 'bg-[#F6F3FA] text-[var(--ink-2)]')}>
                    {look[k] && <Check size={14} strokeWidth={3} />}{l}
                  </button>
                ))}
              </div>
            ) : <LookPicker base={t} look={look} onChange={setLook} only={tab} />}
          </div>
          <button type="button" onClick={() => onUse(t.id)} className="cx-press cx-cta mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[16px] font-extrabold" data-use-design>
            <Check size={18} strokeWidth={3} />Use this design
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
