/**
 * Book a service on its own — /brief/:tradeId without an occasion
 * (Mohan, 2026-11-13: "Book a service should also take over these specific
 * inputs — whenever a person books photography, the specific event he is
 * looking for, the specific number").
 *
 * First: what is the day? A photographer for a naming ceremony and one for
 * a product launch are different asks, so the occasion comes first — a
 * search over all 438, the common ones one tap away. Then the SAME
 * occasion-aware questions a celebration gets (ui/PrefPanel on
 * data/prefSpecs: the right coverage, the right counts, "let the master
 * suggest"), with the date and the headcount. Everything is saved under
 * needs['solo:<trade>'], which the masters list already reads to show who
 * fits, and travels with the request.
 */
import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CalendarDays, Check, ChevronRight, Minus, PenLine, Plus, Search, Users } from 'lucide-react'
import { OCCASION, OCCASIONS } from '../data/occasions'
import { TRADE } from '../data/trades'
import { serviceArt } from '../data/art'
import { usePlan } from '../state/PlanContext'
import { savedWhere } from '../lib/where'
import { iso } from '../lib/format'
import { peopleAsk, peopleLine } from '../data/occasionProfile'
import PrefPanel from '../ui/PrefPanel'
import { ActionBar, BackHeader } from '../ui/kit'
import { ArtFill } from '../ui/art'
import OccasionLogo from '../ui/OccasionLogo'
import OccasionPicker from '../ui/OccasionPicker'

const SUGGEST = ['birthday-party', 'wedding-ceremony', 'wedding-reception', 'engagement-ceremony', 'housewarming-ceremony', 'naming-ceremony', 'baby-shower', 'haldi-ceremony', 'wedding-anniversary', 'corporate-annual-day', 'farewell-party', 'product-launch']
const OTHER_DAY = 'friends-get-together' // the plain gathering every other day is asked as

export default function SoloBrief() {
  const { tradeId } = useParams()
  const [sp] = useSearchParams()
  const master = sp.get('master') // a master the customer was already looking at
  const dateRef = useRef(null)
  const navigate = useNavigate()
  const plan = usePlan()
  const t = TRADE[tradeId]
  const key = `solo:${tradeId}`
  const saved = plan.needsOf(null, tradeId)
  const [occId, setOccId] = useState(saved.$occasionId ?? null)
  const [named, setNamed] = useState(saved.$occasionName ?? '')
  const [q, setQ] = useState('')
  const [date, setDate] = useState(saved.$date ?? plan.event.date ?? '')
  const [guests, setGuests] = useState(Number(saved.$guests) || Number(plan.event.guests) || 50)
  const o = occId ? OCCASION[occId] : null
  const place = plan.place?.lat ? plan.place : savedWhere()
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return SUGGEST.map(id => OCCASION[id]).filter(Boolean)
    return OCCASIONS.filter(x => x.name.toLowerCase().includes(s)).slice(0, 12)
  }, [q])
  /* The panel reads and writes the solo key, never an occasion's. */
  const shim = useMemo(() => ({ needsOf: () => plan.needsOf(null, tradeId), setNeeds: (_, v) => plan.setNeeds(key, v) }), [plan, tradeId, key])
  const ev = { occasionId: occId, date: date || null, time: plan.event.time ?? '18:00', hours: plan.event.hours ?? 4, guests, company: null }
  const ask = o ? peopleAsk(o) : null
  const min = new Date(); const minIso = iso(min)

  if (!t) return null
  const pick = (id, name = '') => { setOccId(id); setNamed(name); plan.setNeeds(key, { ...plan.needsOf(null, tradeId), $occasionId: id, $occasionName: name || null }) }
  /* Venues and restaurants are chosen by looking — photos, rooms, capacity —
     so they open as a list, filtered to this date and headcount. Every
     other service is asked for live: the request goes to the masters who
     fit, and they reply with exact prices (Mohan, 2026-11-13: "we should
     ping the masters in real time, not show a vendor directory"). */
  const BROWSE = new Set(['venue', 'restaurant'])
  const done = () => {
    /* The masters are checked for a date — so the date comes first, here, never on another screen. */
    if (!date) { dateRef.current?.focus(); try { dateRef.current?.showPicker?.() } catch { /* not every browser */ } return }
    const needs = { ...plan.needsOf(null, tradeId), $occasionId: occId, $occasionName: named || null, $date: date || null, $guests: guests, $done: true }
    plan.setNeeds(key, needs)
    /* The same answers under the occasion, so the live match reads them; the
       occasion keeps its own event facts (PlanContext.events). */
    plan.setNeeds(`${occId}:${tradeId}`, needs)
    plan.setEvent({ occasionId: occId, date: date || null, guests, time: ev.time, hours: ev.hours, venue: 'have', venueChoice: plan.eventOf(occId)?.venueChoice ?? 'have' })
    plan.setPick(occId, tradeId, 'need')
    if (BROWSE.has(tradeId)) navigate(`/o/${occId}/${tradeId === 'venue' ? 'venues' : 'restaurants'}`, { replace: true })
    else navigate(`/o/${occId}/live?only=${tradeId}${master ? `&master=${master}` : ''}`, { replace: true })
  }

  return (
    <main className="cx-enter min-h-[100dvh] bg-white pb-[calc(env(safe-area-inset-bottom,0px)+110px)]" data-solo-brief={tradeId} data-solo-step={o ? 'ask' : 'occasion'}>
      <BackHeader title={t.label} sub="Book a service" onBack={() => navigate(-1)} />

      {!o ? (
        <section className="mx-3 mt-3 rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EEE8F8,0_24px_46px_-36px_rgba(58,18,144,.75)]" data-solo-occasion>
          <div className="flex items-center gap-3">
            <ArtFill art={serviceArt(tradeId)} className="h-14 w-14 shrink-0 rounded-[16px]" inset="10%" />
            <div className="min-w-0">
              <p className="text-[10.5px] font-black uppercase tracking-[0.12em] text-[var(--brand)]">First, the day</p>
              <h1 className="text-[21px] font-black leading-[1.1] tracking-[-0.035em] text-[#1C1033]">What’s the {t.label.toLowerCase()} for?</h1>
            </div>
          </div>
          <p className="mt-2 text-[12.5px] font-semibold leading-snug text-[var(--ink-2)]">The occasion decides what we ask — a naming ceremony and a product launch need different things from the same master.</p>
          {/* Every occasion, by category, with a search (Mohan, 2026-11-15). */}
          <div className="mt-3"><OccasionPicker value={occId} typed={named} tradeLabel={t.label.toLowerCase()} onPick={id => pick(id)} onType={text => pick(OTHER_DAY, text)} /></div>
          <p className="mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Or one tap</p>
          <ul className="mt-2 grid grid-cols-2 gap-2" data-solo-hits>
            {hits.slice(0, 6).map(x => (
              <li key={x.id}>
                <button type="button" onClick={() => pick(x.id)} className="cx-press flex w-full items-center gap-2.5 rounded-[16px] bg-white p-2.5 text-left shadow-[inset_0_0_0_1.5px_#ECE6F4]" data-solo-pick={x.id}>
                  <OccasionLogo occasion={x} size={36} />
                  <span className="line-clamp-2 min-w-0 flex-1 text-[13px] font-extrabold leading-tight text-[#1C1033]">{x.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          {/* The day, the date and the headcount — one strip, each a tap to change. */}
          <section className="mx-3 mt-3 rounded-[24px] bg-white p-3.5 shadow-[0_0_0_1px_#EEE8F8,0_24px_46px_-36px_rgba(58,18,144,.75)]" data-solo-facts>
            <div className="flex items-center gap-3">
              <OccasionLogo occasion={o} size={46} />
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-black uppercase tracking-[0.12em] text-[var(--brand)]">{t.label} for</p>
                <p className="truncate text-[18px] font-black leading-tight tracking-[-0.03em] text-[#1C1033]">{named || o.name}</p>
              </div>
              <button type="button" onClick={() => { setOccId(null); setQ('') }} className="cx-press shrink-0 rounded-full bg-[#F4EEFF] px-3 py-1.5 text-[12px] font-extrabold text-[#4C1D95]" data-solo-change>Change</button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="flex h-[52px] items-center gap-2 rounded-[14px] bg-[#FAF8FD] px-3 shadow-[inset_0_0_0_1px_#EEE9F5]">
                <CalendarDays size={16} className="shrink-0 text-[#7C3AED]" />
                <span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-[0.1em] text-[var(--ink-3)]">The date</span>
                  <input ref={dateRef} type="date" value={date} min={minIso} onChange={e => setDate(e.target.value)} className="w-full bg-transparent text-[13px] font-extrabold outline-none" data-solo-date /></span>
              </label>
              <div className="flex h-[52px] items-center gap-1.5 rounded-[14px] bg-[#FAF8FD] px-2 shadow-[inset_0_0_0_1px_#EEE9F5]" data-solo-guests>
                <button type="button" onClick={() => setGuests(g => Math.max(1, g - (g > 100 ? 10 : 1)))} aria-label="Fewer" className="cx-press grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-white text-[#5B21B6] shadow-[0_0_0_1px_#E9E3F2]"><Minus size={16} /></button>
                <span className="min-w-0 flex-1 text-center"><span className="block text-[10px] font-black uppercase tracking-[0.1em] text-[var(--ink-3)]">{ask?.who === 'couple' ? 'Who' : 'How many'}</span>
                  <input inputMode="numeric" value={guests} onChange={e => setGuests(Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1))} aria-label="Guests" className="cx-num w-full bg-transparent text-center text-[15px] font-black outline-none" /></span>
                <button type="button" onClick={() => setGuests(g => g + (g >= 100 ? 10 : 1))} aria-label="More" className="cx-press grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white"><Plus size={16} /></button>
              </div>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--ink-3)]"><Users size={12} />{peopleLine(o, ev)} · {date ? 'date set' : 'no date yet — masters are checked once you pick one'}</p>
          </section>

          <section className="mx-3 mt-3 rounded-[24px] bg-white p-3.5 shadow-[0_0_0_1px_#EEE8F8,0_24px_46px_-36px_rgba(58,18,144,.75)]" data-solo-prefs>
            <p className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[0.12em] text-[var(--brand)]">What fits a {(named || o.name).toLowerCase()}</p>
            <h2 className="text-[18px] font-black leading-tight tracking-[-0.03em] text-[#1C1033]">Make it yours</h2>
            <p className="mb-3 text-[11.5px] font-semibold text-[var(--ink-3)]">Only what moves the price or the match. Type your own answer anytime.</p>
            <PrefPanel o={o} t={tradeId} ev={ev} place={place} plan={shim} answers={{}} />
          </section>
        </>
      )}

      {o && (
        <ActionBar note={date ? 'Your answers travel with the request — each master confirms the price when they accept' : 'Pick the date — masters are checked for it'}>
          <button type="button" onClick={done} className="cx-press cx-cta flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] text-[15.5px] font-extrabold" data-solo-done>
            <Check size={18} strokeWidth={3} />{['venue', 'restaurant'].includes(tradeId) ? `See ${tradeId === 'venue' ? 'venues' : 'restaurants'} for this date` : tradeId === 'cake_desserts' ? 'See bakers & prices live' : 'Find my masters live'}<ChevronRight size={18} />
          </button>
        </ActionBar>
      )}
    </main>
  )
}
