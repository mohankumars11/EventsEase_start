/**
 * "How would you like us to make it happen?" — the one decision that
 * shapes everything after it.
 *
 * ── Why this is a gate and not two chips ────────────────────────────
 * It used to be a pair of chips reading "I'll organise" / "One planner",
 * sitting above the service grid. Two problems with that, both of which
 * cost bookings:
 *
 *   · The grid was already there, so the chips read as a filter on it.
 *     A customer who wanted somebody else to do the work still saw 20
 *     things to choose from, which is the opposite of the offer.
 *   · "One planner" sounds like a shortcut to booking. It is a
 *     professional service with a fee, a scope and a proposal, and
 *     describing it in two words is why nobody picked it.
 *
 * So: nothing else is on screen until this is answered, and each option
 * gets the room to say what it actually is. Once answered it collapses to
 * a line the customer can tap to change — the choice is never locked,
 * because what actually governs a service is who owns it, not this.
 */
import { useState } from 'react'
import { ClipboardList, LayoutGrid, Check, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ensureEvent, setFulfilmentMode } from '../lib/eventSpine'
import { Sheet } from './kit'
import Glyph3D from './Glyph3D'

const OPTIONS = [
  {
    k: 'each', icon: LayoutGrid, tag: 'SELF-ORGANISED',
    title: 'I’ll choose what I need',
    line: 'Explore services, compare professionals and book everything at your own pace. Sambramo finds the right people for your celebration.',
    short: 'You choose, we match',
  },
  {
    k: 'planner', icon: ClipboardList, tag: 'FULL-SERVICE PLANNING',
    title: 'Arrange everything for me',
    line: 'Get a dedicated Planning Master to organise vendors, coordinate arrangements and manage your celebration.',
    note: 'Already arranged some things? No problem — your Planning Master handles only what’s left.',
    short: 'A Planning Master runs it',
  },
]

/** The full decision, shown once. `onPick` gets 'each' | 'planner'. */
export function HowChoice({ onPick }) {
  return (
    <section className="mx-4 mt-5" data-how-choice>
      <h2 className="text-[21px] font-black leading-[1.12] tracking-[-0.035em]">How would you like us to make it happen?</h2>
      <p className="mt-1.5 text-[13px] font-semibold leading-snug text-[var(--ink-2)]">
        Choose the level of help you want. You can change this anytime.
      </p>

      <div className="mt-4 grid gap-3">
        {OPTIONS.map(({ k, icon: Icon, tag, title, line, note }) => (
          <button key={k} type="button" onClick={() => onPick(k)} data-how-pick={k}
            className="cx-press group relative overflow-hidden rounded-[22px] bg-white p-4 text-left shadow-[0_0_0_1.5px_#EDE3FB,0_18px_30px_-26px_rgba(106,43,217,.5)] transition-shadow active:shadow-[0_0_0_2px_var(--brand)]">
            <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-[#F6F0FF] to-transparent" />
            <span className="relative flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand)]"><Icon size={21} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10.5px] font-black tracking-[0.1em] text-[var(--ink-3)]">{tag}</span>
                <span className="mt-0.5 block text-[16.5px] font-black leading-tight tracking-[-0.025em]">{title}</span>
                <span className="mt-1.5 block text-[12.5px] font-semibold leading-[1.45] text-[var(--ink-2)]">{line}</span>
                {note && <span className="mt-2 block rounded-[12px] bg-[#F7F4FF] px-2.5 py-2 text-[11.5px] font-bold leading-snug text-[#4C1D95]">{note}</span>}
              </span>
              <ChevronRight size={18} className="mt-3 shrink-0 text-[var(--ink-3)]" />
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

/** The collapsed line, once chosen. Tapping it reopens the choice. */
export function HowChosen({ how, onChange, saved }) {
  const o = OPTIONS.find(x => x.k === how) ?? OPTIONS[0]
  const Icon = o.icon
  return (
    <button type="button" onClick={onChange} data-how-chosen={how}
      className="cx-press mx-4 mt-4 flex w-[calc(100%-2rem)] items-center gap-2.5 rounded-[16px] bg-[#F7F4FF] p-2.5 text-left">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-white"><Icon size={17} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-extrabold">{o.title}</span>
        <span className="block truncate text-[11px] font-semibold text-[var(--ink-3)]">{o.short} · Tap to change</span>
      </span>
      {/* Only ever shown when the server actually took it — never as decoration. */}
      {saved && <span className="flex shrink-0 items-center gap-1 text-[10.5px] font-extrabold text-[#0B6B3D]"><Check size={12} />Saved</span>}
    </button>
  )
}

/* ── The choice as a dialog (Mohan, 2026-11-10) ─────────────────────────
   After the event card, not on the plan: the plan is for the plan. Two
   cards, each saying in plain words who does the work, with the three
   things that follow from it, so nobody has to know what "full-service
   planning" means to pick the right one. */
const WAYS = [
  {
    k: 'each', mark: 'all', tag: 'You choose', title: 'I’ll pick what I need',
    line: 'Choose food, décor, photos and more. We show verified masters with their prices — you book the ones you like.',
    points: ['See real prices up front', 'Book each master in minutes', 'Pay only after a master accepts'],
  },
  {
    k: 'planner', mark: 'svc:plan', tag: 'Done for you', title: 'Let a Planning Master do it all',
    line: 'One expert Planning Master arranges everything for you, start to finish. You just approve.',
    points: ['One person in charge of the day', 'Planning Masters near you send proposals', 'Already sorted some things? They do only the rest'],
  },
]

export function HowSheet({ open, onClose, current = null, onPick }) {
  return (
    <Sheet open={open} onClose={onClose} title="How should we arrange it?">
      <p className="-mt-1 text-[13px] font-semibold text-[var(--ink-2)]">Pick one — you can switch any time.</p>
      <div className="mt-3.5 grid gap-3 pb-3" data-how-sheet>
        {WAYS.map(w => (
          <button key={w.k} type="button" onClick={() => onPick(w.k)} data-how-pick={w.k}
            className={'cx-press relative overflow-hidden rounded-[22px] p-3.5 text-left transition-shadow ' + (current === w.k ? 'bg-[#F7F2FF] shadow-[0_0_0_2px_#7C3AED]' : 'bg-white shadow-[0_0_0_1.4px_#ECE4FA,0_16px_30px_-26px_rgba(58,18,144,.7)]')}>
            <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#F3ECFF]" />
            <span className="relative flex items-start gap-3">
              <Glyph3D id={w.mark} size={54} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="rounded-full bg-[#EDE4FF] px-2 py-[2px] text-[9.5px] font-black uppercase tracking-[0.1em] text-[#5B21B6]">{w.tag}</span>
                  {current === w.k && <span className="flex items-center gap-0.5 text-[10px] font-black text-[#0B7A45]"><Check size={11} strokeWidth={3} />Your choice</span>}
                </span>
                <span className="mt-1 block text-[17px] font-black leading-tight tracking-[-0.03em] text-[#1C1033]">{w.title}</span>
                <span className="mt-1 block text-[12.5px] font-semibold leading-snug text-[var(--ink-2)]">{w.line}</span>
              </span>
            </span>
            <span className="relative mt-2.5 grid gap-1">
              {w.points.map(p => <span key={p} className="flex items-center gap-1.5 text-[12px] font-bold text-[#2E1A4F]"><Check size={13} strokeWidth={3} className="shrink-0 text-[#16A34A]" />{p}</span>)}
            </span>
            <span className="relative mt-3 flex h-10 items-center justify-center gap-1 rounded-[13px] bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] text-[13.5px] font-extrabold text-white">
              {w.k === 'planner' ? 'Get a Planning Master' : 'Pick my services'}<ChevronRight size={16} />
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

/**
 * The choice, kept three ways in order of how far each can be trusted:
 * this render, the phone, and — signed in, with 202 applied — the event
 * itself. `saved` is set from the server's answer only, so a "Saved" tick
 * can never lie.
 */
export function useHow(occasionId) {
  const { user } = useAuth()
  const KEY = `sbm.cx.how.${occasionId}`
  const [how, setHow] = useState(() => { try { return localStorage.getItem(KEY) } catch { return null } })
  const [saved, setSaved] = useState(false)
  const choose = async (k, { ev = {}, place = null } = {}) => {
    setHow(k); setSaved(false)
    try { localStorage.setItem(KEY, k) } catch { /* storage off */ }
    if (!user?.id || !occasionId) return
    const ev2 = await ensureEvent({ userId: user.id, occasionId, context: { ...ev, place } }).catch(() => ({ ok: false }))
    if (!ev2.ok) return
    const r = await setFulfilmentMode(ev2.id, k === 'planner' ? 'planner' : 'self').catch(() => ({ ok: false }))
    setSaved(!!r.ok)
  }
  return { how, saved, choose }
}
