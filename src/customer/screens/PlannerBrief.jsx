/**
 * "Let a planner do it all" — the planning brief (Mode B, migration 210),
 * as ONE card (Mohan, 2026-11-12: "do not take multiple inputs for the
 * planners — very simple, a premium VIP card; we are targeting everyone
 * from ₹1,000 to a crorepati").
 *
 * The event is already known, so the card shows it and asks two things:
 * the level (Essential · Signature · VIP — the same three cards every
 * service uses, here meaning how much the planner takes on) and a budget
 * band, typeable. One optional line for anything the planner must know.
 * Signature is pre-chosen, so one tap on "Find my planner" is enough.
 * The brief then goes to every planner near the event who can take it
 * (lib/planner), and PlannerProposals tracks each reply.
 */
import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, CalendarDays, Loader2, MapPin, PenLine, Send, Users, Wallet } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { usePlan, needsFor } from '../state/PlanContext'
import { savedWhere } from '../lib/where'
import { dayLabel, timeLabel } from '../lib/format'
import { PLANNER_TRADE, saveBrief, sendBrief, eligiblePlanners } from '../lib/planner'
import { ActionBar, BackHeader } from '../ui/kit'
import { IconTiles, isOther, otherText } from '../ui/choiceTiles'
import TierCards from '../ui/TierCards'
import Glyph3D from '../ui/Glyph3D'
import { peopleLine } from '../data/occasionProfile'
import SignInSheet from './SignInSheet'
import { useAuth } from '../../context/AuthContext'

/* The three levels, as what a planner takes on (lib/planner SCOPES ids). */
const LEVELS = [
  { tier: 'ESSENTIAL', scope: 'plan', name: 'Plan my event', model: 'PLANNER' },
  { tier: 'SIGNATURE', scope: 'plan_coordinate', name: 'Plan & coordinate', model: 'PLANNER' },
  { tier: 'VIP', scope: 'full', name: 'Complete management', model: 'PLANNER' },
]
/* Budget bands in paise — from a small family lunch to a grand wedding. */
const BANDS = [
  { id: 'u50k', label: 'Under ₹50,000', lo: 0, hi: 5000000 }, { id: '50k1l', label: '₹50,000 – 1 L', lo: 5000000, hi: 10000000 }, { id: '1l3l', label: '₹1 – 3 L', lo: 10000000, hi: 30000000 },
  { id: '3l7l', label: '₹3 – 7.5 L', lo: 30000000, hi: 75000000 }, { id: '7l20l', label: '₹7.5 – 20 L', lo: 75000000, hi: 200000000 }, { id: '20l40l', label: '₹20 – 40 L', lo: 200000000, hi: 400000000 }, { id: '40l+', label: '₹40 L and above', lo: 400000000, hi: null },
]
/* The band the event-details budget already implied, so nothing is asked twice. */
const FROM_EVENT = { lt50k: 'u50k', '50k-1l': '50k1l', '1l-1.5l': '1l3l', '1.5l-3l': '1l3l', '3l-5l': '3l7l', '5l+': '7l20l', '5l-10l': '7l20l', '10l-20l': '7l20l', '20l-40l': '20l40l', '40l+': '40l+' }
const typedPaise = v => { const n = Number(String(otherText(v)).replace(/[^\d.]/g, '')); const lakh = /l|lakh/i.test(otherText(v)); return n > 0 ? Math.round(n * (lakh ? 100000 : 1) * 100) : null }

export default function PlannerBrief() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const { user } = useAuth()
  const ev = plan.event
  const place = plan.place?.lat ? plan.place : savedWhere()
  const services = useMemo(() => (o && ev.occasionId === o.id ? needsFor(o, plan.picks[o.id] ?? {}, ev).needed.filter(t => t !== PLANNER_TRADE) : []), [o, plan.picks, ev])
  const [level, setLevel] = useState('SIGNATURE')
  const [band, setBand] = useState(() => FROM_EVENT[ev.budget] ?? null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('')
  const [err, setErr] = useState('')
  const [signIn, setSignIn] = useState(false)

  if (!o) return <Navigate to="/" replace />
  if (ev.occasionId !== o.id || !ev.date) return <Navigate to={`/o/${o.id}`} replace />
  const scope = LEVELS.find(l => l.tier === level)?.scope ?? 'plan_coordinate'
  const money = isOther(band) ? [typedPaise(band), null] : band ? [BANDS.find(b => b.id === band)?.lo ?? null, BANDS.find(b => b.id === band)?.hi ?? null] : [null, null]

  async function send() {
    if (!user) { setSignIn(true); return }
    setBusy(true); setErr(''); setStage('Saving your brief…')
    try {
      const saved = await saveBrief({ userId: user.id, occasionId: o.id, context: { ...ev, place: place ?? null }, brief: {
        scope, budgetMin: money[0], budgetMax: money[1], arranged: [], plannerTrades: services, priorities: [], theme: '', mustNotChange: '', special: note.trim(), contact: 'app' } })
      if (!saved.ok) throw new Error(saved.reason === 'not-migrated' ? 'Planning Master requests open soon.' : saved.reason)
      if (saved.sent) { navigate(`/o/${o.id}/planners`); return }
      setStage('Finding Planning Masters near you…')
      const planners = await eligiblePlanners({ event: ev, place, needs: plan.needsOf(o.id, PLANNER_TRADE) })
      if (!planners.length) throw new Error('No Planning Master near you can take this yet — we will tell you when one can.')
      const venue = { address: place?.address || `${place?.area ?? ''}, Bengaluru`, area: place?.area ?? null, city: 'Bengaluru' }
      setStage(`Asking ${planners.length} Planning ${planners.length === 1 ? 'Master' : 'Masters'}…`)
      const r = await sendBrief({ brief: saved.brief, planners, occasionId: o.id, event: ev, place, venue, occasionName: o.name })
      if (!r.ok) throw new Error(r.reason ?? r.sent?.find(x => x.reason)?.reason ?? 'Could not reach the Planning Masters.')
      navigate(`/o/${o.id}/planners`)
    } catch (e) { setErr(e.message) } finally { setBusy(false); setStage('') }
  }

  return (
    <main className="cx-enter min-h-[100dvh] bg-white pb-[calc(env(safe-area-inset-bottom,0px)+120px)]" data-planner-brief>
      <BackHeader title="Your Planning Master" sub={o.name} onBack={() => navigate(`/o/${o.id}/plan`)} />

      {/* The card: the event as the planner will read it. */}
      <section className="mx-3 mt-3 overflow-hidden rounded-[26px] text-white shadow-[0_26px_50px_-28px_rgba(28,16,51,.85)]" style={{ background: 'linear-gradient(160deg, #1B1333 0%, #4C1D95 60%, #7C3AED 100%)' }} data-planner-card>
        <div className="relative p-4">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
          <span aria-hidden className="pointer-events-none absolute -bottom-16 left-10 h-36 w-36 rounded-full bg-[#FFD84A]/10" />
          <div className="relative flex items-center gap-3">
            <Glyph3D id="svc:plan" size={54} lift />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#FFE071]"><BadgeCheck size={12} />One Planning Master · every detail</span>
              <span className="block text-[22px] font-black leading-tight tracking-[-0.03em]">{o.name}</span>
              <span className="block text-[12px] font-semibold text-white/80">Your Planning Master reads this card and takes it from here.</span>
            </span>
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-2 text-[12px] font-extrabold">
            {[[CalendarDays, dayLabel(ev.date), ev.time ? timeLabel(ev.time) : ''], [Users, peopleLine(o, ev), ''], [MapPin, place?.area ?? 'Location', place?.city ?? '']].map(([Icon, a, b]) => (
              <span key={a} className="rounded-[14px] bg-white/12 p-2.5"><Icon size={14} className="text-[#FFE071]" /><span className="mt-1 block truncate">{a}</span>{b && <span className="block truncate text-[10.5px] font-semibold text-white/70">{b}</span>}</span>
            ))}
          </div>
          {services.length > 0 && (
            <p className="relative mt-3 text-[11.5px] font-semibold leading-snug text-white/85">
              <span className="font-black text-[#FFE071]">Arranges for you: </span>{services.map(t => TRADE[t]?.label ?? t).join(' · ')}
            </p>
          )}
        </div>
      </section>

      {/* Level: the same three cards every service uses. */}
      <section className="mx-4 mt-5" data-planner-level>
        <p className="text-[16px] font-black tracking-[-0.02em]">How much should your Planning Master do?</p>
        <p className="text-[12px] font-semibold text-[var(--ink-3)]">Three levels, priced apart — you see the final fee at the end, before you pay</p>
        <div className="mt-2.5"><TierCards tiers={LEVELS} value={level} onPick={x => x && setLevel(x.tier)} /></div>
      </section>

      {/* Budget: one tap, or typed. */}
      <section className="mx-4 mt-5" data-planner-budget>
        <p className="flex items-center gap-1.5 text-[16px] font-black tracking-[-0.02em]"><Wallet size={16} className="text-[#7C3AED]" />Your total budget</p>
        <p className="text-[12px] font-semibold text-[var(--ink-3)]">{FROM_EVENT[ev.budget] ? 'From your event details — change it if you like.' : 'Every budget has a Planning Master — skipping it never hides one.'}</p>
        <div className="mt-2.5"><IconTiles data="planner-budget" cols={3} compact value={band} items={BANDS.map(b => ({ id: b.id, label: b.label, icon: Wallet }))} other="Type an amount, e.g. 2.5 lakh" onChange={setBand} /></div>
      </section>

      <section className="mx-4 mt-5" data-planner-note>
        <label className="block">
          <span className="flex items-center gap-1.5 text-[16px] font-black tracking-[-0.02em]"><PenLine size={16} className="text-[#7C3AED]" />Anything your Planning Master must know <span className="text-[11px] font-bold text-[var(--ink-3)]">optional</span></span>
          <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 1000))} rows={3} placeholder="A theme, the muhurtha time, elderly guests, a surprise…" data-special
            className="mt-2 w-full rounded-[16px] bg-[#FAF8FD] p-3.5 text-[14px] font-semibold shadow-[inset_0_0_0_1.5px_#EEE9F5] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]" />
        </label>
        <p className="mt-1.5 text-[11px] font-semibold text-[var(--ink-3)]">Your number is shared only after you choose a Planning Master and pay.</p>
      </section>

      <ActionBar>
        {err && <p className="mb-2 rounded-[12px] bg-[#FFF1F0] px-3 py-1.5 text-[12px] font-bold text-[#B42318]" data-brief-error>{err}</p>}
        <button type="button" onClick={send} disabled={busy} className="cx-press cx-cta flex h-[56px] w-full items-center justify-center gap-2.5 rounded-[18px] text-[16px] font-extrabold" data-send-brief>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}{busy ? stage || 'Finding…' : 'Find my Planning Master'}
        </button>
      </ActionBar>
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={() => setSignIn(false)} why="to send your brief" />
    </main>
  )
}
