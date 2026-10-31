/**
 * An occasion, asked about one thing at a time.
 *
 *   1. When       — the day (required) and the start time on the sky dial
 *   2. Guests     — how many; optional, "Decide later" is a real answer
 *   3. Venue      — only when the occasion can be anywhere: have one, or
 *                   need one, and if so what kind
 *
 * then the plan (Recommend.jsx): every service it takes, end to end.
 *
 * ── One question per screen ─────────────────────────────────────────
 * Each answer changes what follows — the day is what availability is
 * checked against, the head count is what a caterer prices — so each is
 * asked on its own, large, with nothing else competing for the thumb.
 * The step lives in the URL, so the phone's back button walks back
 * through the questions instead of leaving the occasion.
 *
 * ── No price here ───────────────────────────────────────────────────
 * The customer has told us one word ("Haldi"). The first rupee figure
 * they see is a real master's own price, after Find masters.
 */
import { useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Building, Building2, Check, ChevronRight, CircleHelp, Hotel, KeyRound, Landmark, Minus, Mountain, Plus, Search, TentTree, Trees, Utensils } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { occasionArt } from '../data/art'
import { usePlan, contextFor } from '../state/PlanContext'
import { AboutEvent } from '../ui/aboutEvent'
import { ActionBar, BackHeader, Journey } from '../ui/kit'
import { ArtFill } from '../ui/art'
import { useWhen, WhenBody } from './WhenSheet'

export const VENUE_KINDS = {
  banquet: { label: 'Banquet hall', icon: Building2 },
  lawn: { label: 'Lawn or garden', icon: Trees },
  rooftop: { label: 'Rooftop or terrace', icon: Building },
  hotel: { label: 'Hotel ballroom', icon: Hotel },
  resort: { label: 'Resort', icon: TentTree },
  farmhouse: { label: 'Farmhouse', icon: Mountain },
  dining: { label: 'Private dining', icon: Utensils },
  community: { label: 'Community hall', icon: Landmark },
  convention: { label: 'Convention centre', icon: Building2 },
  ground: { label: 'Open ground', icon: Mountain },
}
/* Only kinds that fit the size: a convention centre for twelve people is
   the impossible-option defect. */
const KINDS_BY_SCALE = {
  intimate: ['dining', 'rooftop', 'farmhouse', 'resort'],
  social: ['banquet', 'lawn', 'rooftop', 'hotel', 'resort', 'farmhouse', 'community'],
  large: ['banquet', 'convention', 'lawn', 'hotel', 'resort', 'ground'],
  massive: ['convention', 'ground', 'lawn'],
}

export default function Occasion() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const plan = usePlan()
  const mine = plan.event.occasionId === occasionId
  const w = useWhen(mine ? plan.event : {}, true)
  const [guests, setGuests] = useState(mine ? plan.event.guests : null)
  const [venue, setVenue] = useState(mine ? plan.event.venue : null)
  const [kind, setKind] = useState(mine ? plan.event.venueKind : null)
  const [about, setAbout] = useState(mine ? (plan.event.context ?? {}) : {})
  if (!o) return <Navigate to="/" replace />

  const steps = ['when', 'guests', ...(o.where === 'ask' ? ['venue'] : []), 'about']
  const step = steps.includes(params.get('step')) ? params.get('step') : 'when'
  const at = steps.indexOf(step)
  const save = patch => plan.setEvent({ occasionId: o.id, ...(mine ? {} : { guests: null, venue: 'need', venueKind: null }), ...patch })
  const next = patch => {
    save(patch)
    if (at < steps.length - 1) navigate(`/o/${o.id}?step=${steps[at + 1]}`)
    else navigate(`/o/${o.id}/plan`)
  }

  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+150px)]">
      <BackHeader title={o.name} sub={`Step ${at + 1} of ${steps.length} · ${o.categoryShort}`}
        right={<ArtFill art={occasionArt(o)} tone={o.tone} className="h-11 w-11 shrink-0 rounded-[14px]" inset="10%" />} />
      <Journey at={0} />

      {step === 'when' && (
        <section className="cx-enter px-5 pt-6" key="when">
          <Question title={`When is your ${o.name}?`} sub="The day is what every master checks their calendar against." />
          <div className="mt-5"><WhenBody w={w} /></div>
          <ActionBar>
            <button type="button" disabled={!w.d || w.bad} onClick={() => next(w.value())} className="cx-press cx-cta flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" data-next>
              {!w.d ? 'Pick the day first' : w.bad ? w.label : <>Continue · {w.label}<ChevronRight size={18} /></>}
            </button>
          </ActionBar>
        </section>
      )}

      {step === 'guests' && (
        <section className="cx-enter px-5 pt-6" key="guests">
          <Question title={`How many ${o.people.toLowerCase()}?`} sub="Optional — a rough number is enough, and you can change it at checkout." />
          <Guests occasion={o} value={guests} onChange={setGuests} />
          {o.whereLabel && (
            <p className="mt-6 flex items-center gap-2 rounded-[16px] bg-[var(--am-50)] px-3.5 py-3 text-[12.5px] font-bold text-[var(--am-ink)] ring-1 ring-[var(--am-200)]">
              <Check size={16} strokeWidth={3} className="shrink-0" />{o.whereLabel} — no venue to find.
            </p>
          )}
          <ActionBar>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setGuests(null); next({ guests: null }) }} className="cx-press cx-btn h-14 shrink-0 rounded-[18px] px-4 text-[13.5px] font-extrabold" data-skip>Decide later</button>
              <button type="button" disabled={!guests} onClick={() => next({ guests })} className="cx-press cx-cta flex h-14 flex-1 items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" data-next>
                {guests ? <>Continue · {guests.toLocaleString('en-IN')}<ChevronRight size={18} /></> : 'Pick a number'}
              </button>
            </div>
          </ActionBar>
        </section>
      )}

      {step === 'venue' && (
        <section className="cx-enter px-5 pt-6" key="venue">
          <Question title="Do you have a venue?" sub="If you need one, we will find masters with the right kind of place." />
          <div className="mt-5 grid gap-2.5">
            <Choice on={venue === 'have'} onClick={() => setVenue('have')} icon={KeyRound} title="Yes, I have a venue" sub="We plan everything else around it" />
            <Choice on={venue === 'need'} onClick={() => setVenue('need')} icon={Search} title="No, I need a venue" sub="Halls, lawns, rooftops and more" />
          </div>
          {venue === 'need' && (
            <div className="cx-enter mt-6">
              <p className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">What kind of place?</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {KINDS_BY_SCALE[o.scale].map(k => {
                  const v = VENUE_KINDS[k]
                  return (
                    <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(kind === k ? null : k)} data-kind={k}
                      className="cx-press cx-choice flex items-center gap-2.5 rounded-[16px] px-3 py-3 text-left">
                      <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-[12px] ' + (kind === k ? 'bg-[var(--brand)] text-white' : 'bg-[var(--am-100)] text-[var(--am-ink)]')}><v.icon size={18} /></span>
                      <span className="text-[13px] font-extrabold leading-tight">{v.label}</span>
                    </button>
                  )
                })}
                <button type="button" aria-pressed={kind === null} onClick={() => setKind(null)} className="cx-press cx-choice flex items-center gap-2.5 rounded-[16px] px-3 py-3 text-left">
                  <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-[12px] ' + (kind === null ? 'bg-[var(--brand)] text-white' : 'bg-[var(--am-100)] text-[var(--am-ink)]')}><CircleHelp size={18} /></span>
                  <span className="text-[13px] font-extrabold leading-tight">Not sure yet</span>
                </button>
              </div>
            </div>
          )}
          <ActionBar>
            <button type="button" disabled={!venue} onClick={() => next({ venue, venueKind: venue === 'need' ? kind : null })} className="cx-press cx-cta flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" data-next>
              {venue ? <>See what it takes<ChevronRight size={18} /></> : 'Choose one'}
            </button>
          </ActionBar>
        </section>
      )}
      {step === 'about' && (
        <section className="cx-enter px-5 pt-6" key="about">
          <Question title="Quick question" sub="Optional — tap what fits, or skip. You can add or remove any service next." />
          <div className="mt-5">
            <AboutEvent occasion={o} ctx={contextFor(o, {}, { ...(mine ? plan.event : {}), context: about })} onChange={c => setAbout(onlyAbout(c))} />
          </div>
          <ActionBar>
            <div className="flex gap-2">
              <button type="button" onClick={() => next({ context: about })} className="cx-press cx-btn h-14 shrink-0 rounded-[18px] px-4 text-[13.5px] font-extrabold" data-skip>Skip for now</button>
              <button type="button" onClick={() => next({ context: about })} className="cx-press cx-cta flex h-14 flex-1 items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" data-next>
                Build my plan<ChevronRight size={18} />
              </button>
            </div>
          </ActionBar>
        </section>
      )}
    </main>
  )
}

function Question({ title, sub }) {
  return (
    <>
      <h2 className="text-[27px] font-extrabold leading-[1.08] tracking-[-0.035em]">{title}</h2>
      <p className="mt-1.5 text-[13px] font-semibold leading-snug text-[var(--ink-3)]">{sub}</p>
    </>
  )
}

function Choice({ on, onClick, icon: Icon, title, sub }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="cx-press cx-choice flex items-center gap-3 rounded-[20px] p-4 text-left">
      <span className={'grid h-12 w-12 shrink-0 place-items-center rounded-[15px] transition ' + (on ? 'bg-[var(--brand)] text-white' : 'bg-[var(--am-100)] text-[var(--am-ink)]')}><Icon size={22} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15.5px] font-extrabold tracking-[-0.02em]">{title}</span>
        <span className="block text-[12px] font-semibold text-[var(--ink-3)]">{sub}</span>
      </span>
      <span className={'grid h-6 w-6 shrink-0 place-items-center rounded-full transition ' + (on ? 'bg-[var(--brand)] text-white' : 'ring-2 ring-[var(--am-200)]')}>{on && <Check size={14} strokeWidth={3} />}</span>
    </button>
  )
}

function Guests({ occasion, value, onChange }) {
  const n = value ?? occasion.bands[1]
  const step = n >= 1000 ? 100 : n >= 200 ? 25 : n >= 50 ? 10 : 1
  const set = x => onChange(Math.max(1, Math.min(100000, x)))
  return (
    <>
      <div className={'mt-6 flex items-center justify-between gap-4 rounded-[24px] p-3 ring-1 transition ' + (value ? 'bg-[var(--am-50)] ring-[var(--am-300)]' : 'bg-white ring-[var(--am-200)]')}>
        <button type="button" onClick={() => set(n - step)} aria-label="Fewer" className="cx-press cx-btn grid h-14 w-14 place-items-center rounded-[18px]"><Minus size={22} /></button>
        <input inputMode="numeric" value={value ?? ''} placeholder={String(n)} onChange={e => set(Number(e.target.value.replace(/\D/g, '')) || 1)}
          className="cx-num w-full bg-transparent text-center text-[44px] font-extrabold tracking-[-0.04em] outline-none placeholder:text-[#CFC6E3]" aria-label="Number of guests" />
        <button type="button" onClick={() => set(value ? n + step : n)} aria-label="More" className="cx-press cx-btn grid h-14 w-14 place-items-center rounded-[18px]"><Plus size={22} /></button>
      </div>
      <p className="mb-2.5 mt-5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">Usual for this occasion</p>
      <div className="flex flex-wrap gap-2">
        {occasion.bands.map(b => (
          <button key={b} type="button" onClick={() => onChange(b)} aria-pressed={value === b}
            className={'cx-press cx-num rounded-full px-4 py-2.5 text-[14px] font-extrabold ' + (value === b ? 'bg-[var(--brand-deep)] text-white' : 'cx-btn')}>
            {b.toLocaleString('en-IN')}
          </button>
        ))}
      </div>
    </>
  )
}

/* Only the fields the "About your event" step owns are kept in event.context. */
const ABOUT_KEYS = ['venueProvides', 'setting', 'formats', 'food', 'drinks', 'media', 'travel', 'public', 'children', 'accessibility', 'privacy', 'budget']
const onlyAbout = c => Object.fromEntries(Object.entries(c).filter(([k, v]) => ABOUT_KEYS.includes(k) && v != null && !(Array.isArray(v) && !v.length)))
