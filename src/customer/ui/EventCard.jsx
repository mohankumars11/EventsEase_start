/**
 * The event card — everything the customer told us, set like an
 * invitation in the occasion's own colours (Mohan, 2026-11-11: "an amazing
 * invitation kind of card with warm, emotional colour … a contrasting
 * colour for every occasion"; the picks "should not be displayed like
 * radio buttons — show that this is what you have selected, like a
 * complete invitation, and provide the edit options").
 *
 * Three parts: the band (name in script, the day and time), the details
 * (guests, place, venue, budget), and "what you've chosen" — every answer
 * as a line with the theme's check, each one a tap away from changing it.
 * Typed answers (ui/choiceTiles `other:`) print as the customer's own
 * words. Colours come from ui/cardTheme; nothing here names a colour.
 */
import { useMemo } from 'react'
import { Building2, CalendarDays, Clock3, ListChecks, MapPin, PartyPopper, Pencil, Users, Wallet } from 'lucide-react'
import { timeLabel } from '../lib/format'
import { optionIcon } from '../lib/optionIcon'
import { isOther, otherText } from './choiceTiles'
import { occasionIcon } from './OccasionLogo'
import { cardTheme } from './cardTheme'
import { peopleLine, peopleWord } from '../data/occasionProfile'

const HOURS = [[1, '1 hour'], [2, '2 hours'], [3, '3 hours'], [4, '4 hours'], [5, '5 hours'], [6, '6 hours'], [8, '8 hours'], [10, '10 hours'], [12, 'Full day'], [24, '2 days'], [48, '3 days']]
export const hoursLabel = h => HOURS.find(([n]) => n === h)?.[1] ?? (h ? `${h} hours` : 'Not sure')
export const longDate = d => { if (!d) return ''; const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) }
const answered = v => !(v == null || v === '' || (Array.isArray(v) && !v.length))

/**
 * @param venues  [[id, label]] the venue choices, for the venue line
 * @param budgets [[id, label]] the budget bands
 */
export default function EventCard({ o, f, place, qs, answers, first, venues, budgets, onEdit }) {
  const th = cardTheme(o)
  const Mark = occasionIcon(o)
  const budget = budgets.find(([k]) => k === f.budget)?.[1]
  const venueWord = venues.find(([k]) => k === f.venueChoice)?.[1] ?? 'Not chosen'
  const venue = f.venueOther && !['home', 'need', 'bookvenue'].includes(f.venueChoice) ? `${f.venueOther}${f.venueChoice === 'other' ? '' : ` · ${venueWord}`}` : venueWord
  const rows = [
    [Users, peopleWord(o), peopleLine(o, f), 'guests'],
    [MapPin, 'Location', place?.area ? `${place.area}${place.city ? `, ${place.city}` : ''}` : 'Not set', 'where'],
    [Building2, 'Venue', venue, 'where'],
    [Wallet, 'Budget', budget ?? 'Not sure yet', 'budget'],
  ]
  /* The occasion's own answers, as the words of the chosen options — or the customer's own words. */
  const picks = useMemo(() => qs.flatMap(q => {
    const v = answers[q.k]
    if (!answered(v)) return []
    const label = x => (isOther(x) ? otherText(x).trim() || null : q.options?.find(([k]) => k === x)?.[1] ?? null)
    const ask = q.label.replace(/\?$/, '')
    /* The question rides along in small caps: "Adult" alone says nothing;
       "Age group · Adult" is a line of the invitation. */
    if (q.type === 'yesno') return v === 'yes' ? [{ k: q.k, q: ask, t: 'Yes', at: `q:${q.k}` }] : []
    if (q.type === 'number' || q.type === 'text') return [{ k: q.k, q: ask, t: String(v), at: `q:${q.k}` }]
    return (Array.isArray(v) ? v : [v]).map(label).filter(Boolean).map(t => ({ k: `${q.k}:${t}`, q: ask, t, at: `q:${q.k}` }))
  }).slice(0, 12), [qs, answers])
  const frame = `linear-gradient(135deg, ${th.frame[0]} 0%, ${th.frame[1]} 35%, ${th.frame[2]} 55%, ${th.frame[3]} 100%)`
  const band = `linear-gradient(160deg, ${th.band[0]} 0%, ${th.band[1]} 100%)`

  return (
    <section className="cx-slide-in relative mx-4 mt-3" data-event-ready data-card-theme={th.key}>
      <Confetti colours={[th.band[0], th.accent, th.band[1], '#FFFFFF']} />
      <p className="relative flex items-center gap-1.5 text-[11.5px] font-black uppercase tracking-[0.14em] text-[#0B7A45]"><PartyPopper size={15} />Your event card is ready</p>
      <h2 className="relative mt-1 text-[24px] font-black leading-[1.1] tracking-[-0.04em] text-[#1C1033]">Wow{first ? `, ${first}` : ''}! Your {o.name} is almost done</h2>
      <p className="relative mt-1.5 text-[13px] font-semibold leading-snug text-[var(--ink-2)]">Everything you told us, in one card — tap any line to change it. Next: everything your {o.name.toLowerCase()} needs, ready to book.</p>

      <article className="relative mt-4 rounded-[26px] p-[3px]" style={{ background: frame, boxShadow: `0 28px 54px -30px ${th.band[1]}` }} data-event-card>
        <div className="relative overflow-hidden rounded-[23px]" style={{ background: th.paper }}>
          {/* The band: the name in script on the occasion's colour. */}
          <div className="relative px-4 pb-5 pt-5 text-center text-white" style={{ background: band }}>
            <Flourish className="absolute left-2 top-2" colour={th.accent} /><Flourish className="absolute right-2 top-2 -scale-x-100" colour={th.accent} />
            <Flourish className="absolute bottom-2 left-2 -scale-y-100" colour={th.accent} /><Flourish className="absolute bottom-2 right-2 -scale-x-100 -scale-y-100" colour={th.accent} />
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
            <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-white/[.07]" />
            <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/15 ring-2 ring-white/40"><Mark size={27} strokeWidth={2} /></span>
            {/* The host's own card, not an invitation to themselves (Mohan, 2026-11-11). */}
            <p className="relative mt-2.5 text-[10px] font-black uppercase tracking-[0.26em] text-white/80">{first ? `${first}’s event card` : 'Your event card'}</p>
            <p className="relative mt-0.5 px-2 text-[36px] leading-[1.05]" style={{ fontFamily: `'${th.script}', 'Dancing Script', cursive`, textShadow: '0 2px 10px rgba(0,0,0,.25)' }}>{o.name}</p>
            <button type="button" onClick={() => onEdit('date')} className="cx-press relative mt-2 block w-full text-[13.5px] font-extrabold" data-card-row="Date"><CalendarDays size={13} className="mr-1 inline -translate-y-px" />{longDate(f.date)}</button>
            <button type="button" onClick={() => onEdit('time')} className="cx-press relative block w-full text-[12px] font-bold text-white/85" data-card-row="Time"><Clock3 size={12} className="mr-1 inline -translate-y-px" />{timeLabel(f.time)} onwards · {hoursLabel(f.hours)}</button>
          </div>
          <div className="mx-auto flex w-40 items-center gap-2 pt-3" aria-hidden><span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${th.accent})` }} /><span className="h-2 w-2 rotate-45" style={{ background: th.accent }} /><span className="h-px flex-1" style={{ background: `linear-gradient(270deg, transparent, ${th.accent})` }} /></div>

          {/* The details. */}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-3 px-4 pb-3 pt-3">
            {rows.map(([Icon, label, value, key]) => (
              <button key={label} type="button" onClick={() => onEdit(key)} className="cx-press min-w-0 rounded-[14px] p-2 text-left" style={{ background: th.soft }} data-card-row={label}>
                <dt className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-[0.12em]" style={{ color: th.band[1] }}><Icon size={12} />{label}</dt>
                <dd className="mt-0.5 line-clamp-2 text-[13px] font-extrabold leading-snug" style={{ color: th.ink }}>{value}</dd>
              </button>
            ))}
          </dl>

          {/* What you've chosen: each answer a line of the invitation, not a chip. */}
          {picks.length > 0 && (
            <div className="px-4 pb-2" data-card-picks>
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: th.band[1] }}><ListChecks size={12} />What you’ve chosen</p>
              <ul className="mt-1.5 divide-y" style={{ borderColor: th.soft }}>
                {picks.map(p => { const Icon = optionIcon(`${p.t} ${p.q}`); return (
                  <li key={p.k}>
                    <button type="button" onClick={() => onEdit(p.at)} className="cx-press flex w-full items-center gap-2.5 py-2 text-left" data-card-pick>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ background: th.soft, color: th.band[1] }}><Icon size={16} strokeWidth={2.2} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[9.5px] font-black uppercase tracking-[0.12em] opacity-60" style={{ color: th.ink }}>{p.q}</span>
                        <span className="block text-[13px] font-extrabold leading-snug" style={{ color: th.ink }}>{p.t}</span>
                      </span>
                      <Pencil size={12} className="shrink-0 opacity-50" style={{ color: th.ink }} />
                    </button>
                  </li>
                ) })}
              </ul>
            </div>
          )}
          <button type="button" onClick={() => onEdit('date')} className="cx-press flex w-full items-center justify-center gap-1.5 py-3 text-[12.5px] font-extrabold text-white" style={{ background: band }} data-card-edit><Pencil size={13} />Edit details</button>
        </div>
      </article>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] font-bold text-[var(--ink-3)]"><Pencil size={13} className="text-[#7C3AED]" />Tap any line to change it</p>
    </section>
  )
}

/* A corner flourish for the band, in the theme's metal. */
function Flourish({ className = '', colour }) {
  return (
    <svg viewBox="0 0 40 40" className={'h-9 w-9 ' + className} aria-hidden>
      <path d="M3 37V12C3 7 7 3 12 3h25" fill="none" stroke={colour} strokeWidth="1.4" opacity=".9" />
      <path d="M8 37V16c0-4.4 3.6-8 8-8h21" fill="none" stroke={colour} strokeWidth=".9" opacity=".6" />
      <circle cx="12" cy="12" r="2.2" fill={colour} />
      <path d="M12 6c2 2 2 4 0 6-2-2-2-4 0-6zM6 12c2-2 4-2 6 0-2 2-4 2-6 0z" fill={colour} opacity=".8" />
    </svg>
  )
}

/* A burst of paper the moment the card appears — once, then gone. */
export function Confetti({ colours = ['#7C3AED', '#F59E0B', '#EC4899', '#16A34A', '#3B82F6', '#FACC15'] }) {
  const key = colours.join()
  const bits = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    left: (i * 37) % 100, delay: (i % 7) * 0.08, dx: ((i * 53) % 60) - 30, rot: (i * 47) % 360,
    c: colours[i % colours.length], w: i % 3 ? 7 : 5, h: i % 3 ? 4 : 9,
  })), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-2 h-0">
      {bits.map((b, i) => <span key={i} className="cx-confetti absolute top-0 rounded-[2px]" style={{ left: `${b.left}%`, width: b.w, height: b.h, background: b.c, animationDelay: `${b.delay}s`, '--dx': `${b.dx}px`, '--rot': `${b.rot}deg` }} />)}
    </span>
  )
}
