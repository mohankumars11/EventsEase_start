/**
 * "About your event" — the context the 360° engine needs, asked only where
 * it changes this occasion's plan (bundle README §3.2, progressive
 * disclosure). Every question is optional; "Skip for now" is always there,
 * and the plan works on partial answers — unanswered fields never trigger
 * a rule, they only raise a follow-up on the plan screen.
 *
 * A question is shown when one of the occasion's CONDITIONAL services is
 * waiting on that field (the engine's followUps), or when it is a fact the
 * engine uses to cover / suppress (venue facilities, media, food).
 */
import { Check } from 'lucide-react'
import { recommend } from '../lib/recommend360'
import { VENUE_FACILITIES } from '../data/rules360'

const Q = {
  setting: { title: 'Inside or outside?', kind: 'single', options: [['indoor', 'Indoors'], ['outdoor', 'Outdoors'], ['mixed', 'Both']] },
  formats: { title: 'What will happen at your event?', sub: 'Tap everything that applies — we suggest the right people for it', kind: 'multi', options: [['ceremony', 'A ceremony'], ['rituals', 'Rituals / pooja'], ['meal', 'A meal'], ['speeches', 'Speeches'], ['stage', 'Stage programme'], ['performance', 'Performances'], ['dancing', 'Dancing'], ['concert', 'Concert'], ['workshop', 'Talks / workshop'], ['procession', 'Procession'], ['sports', 'Sports'], ['livestream', 'Livestream']] },
  food: { title: 'Will you serve food?', kind: 'single', options: [['meal', 'A full meal'], ['snacks', 'Snacks'], ['none', 'No food']] },
  drinks: { title: 'A drinks counter?', kind: 'single', options: [['soft', 'Juices & mocktails'], ['alcohol', 'Bar (licensed)'], ['none', 'No']] },
  media: { title: 'Photos and video?', kind: 'single', options: [['both', 'Photos & video'], ['photo', 'Photos only'], ['video', 'Video only'], ['none', 'Neither']] },
  travel: { title: 'Where are guests coming from?', kind: 'single', options: [['local', 'Same city'], ['outstation', 'Some from out of town'], ['destination', 'Everyone travels']] },
  public: { title: 'Open to the public?', kind: 'bool' },
  children: { title: 'Children attending?', kind: 'bool' },
  accessibility: { title: 'Elders or guests who need access help?', kind: 'bool' },
  privacy: { title: 'Keep it private — ask before photos of guests?', kind: 'bool' },
  budget: { title: 'Budget feel', sub: 'Optional — helps us suggest the right add-ons', kind: 'single', options: [['tight', 'Keep it lean'], ['moderate', 'Balanced'], ['premium', 'Go all out']] },
}

/** Which questions matter for this occasion and what is already known. */
export function aboutQuestions(occasion, ctx) {
  const r = recommend(occasion.id, ctx)
  const waiting = new Set(r.followUps.map(f => f.field))
  const virtual = ctx.venueType === 'virtual' || occasion.where === 'online'
  /* Three plain questions, no more (Mohan, 2026-10-31: "do not make a customer
     answer multiple questions … use very easy English"). Everything else the
     plan needs comes from sensible defaults, and the customer can still add
     or remove any service on the next screen. */
  const out = ['formats']
  if (!virtual) out.push('food')
  if (!virtual && !['home', 'campus'].includes(ctx.venueType)) out.push('setting')
  return out
}

export function AboutEvent({ occasion, ctx, onChange }) {
  const keys = aboutQuestions(occasion, ctx)
  const set = (k, v) => onChange({ ...ctx, [k]: v })
  return (
    <div className="space-y-3" data-about>
      {keys.map(k => k === 'venueProvides' ? (
        <Block key={k} title="What does your venue already provide?" sub="We won’t suggest what you already have">
          <Chips multi value={ctx.venueProvides ?? []} options={VENUE_FACILITIES.map(v => [v.id, v.label])} onChange={v => set('venueProvides', v)} />
        </Block>
      ) : Q[k].kind === 'bool' ? (
        <button key={k} type="button" onClick={() => set(k, ctx[k] === true ? false : true)} aria-pressed={ctx[k] === true}
          className="flex w-full items-center gap-3 rounded-[20px] bg-white p-3.5 text-left shadow-[0_0_0_1px_#EEE6FA]" data-about-q={k}>
          <span className="min-w-0 flex-1 text-[14px] font-extrabold tracking-[-0.01em]">{Q[k].title}</span>
          <span className={'relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors ' + (ctx[k] === true ? 'bg-[#0C831F]' : 'bg-[#E5E0EA]')}>
            <span className={'absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ' + (ctx[k] === true ? 'left-[21px]' : 'left-[3px]')} />
          </span>
        </button>
      ) : (
        <Block key={k} title={Q[k].title} sub={Q[k].sub} id={k}>
          <Chips multi={Q[k].kind === 'multi'} value={Q[k].kind === 'multi' ? (ctx[k] ?? []) : ctx[k] != null ? [ctx[k]] : []} options={Q[k].options}
            onChange={v => set(k, Q[k].kind === 'multi' ? v : v[0])} />
        </Block>
      ))}
    </div>
  )
}

function Block({ title, sub, id, children }) {
  return (
    <section className="rounded-[20px] bg-white p-3.5 shadow-[0_0_0_1px_#EEE6FA]" data-about-q={id}>
      <p className="text-[14.5px] font-extrabold tracking-[-0.02em]">{title}</p>
      {sub && <p className="text-[11.5px] font-semibold text-[var(--ink-3)]">{sub}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  )
}

function Chips({ options, value, onChange, multi }) {
  const tap = id => onChange(multi ? (value.includes(id) ? value.filter(x => x !== id) : [...value, id]) : value[0] === id ? [] : [id])
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([id, label]) => {
        const on = value.includes(id)
        return (
          <button key={id} type="button" onClick={() => tap(id)} aria-pressed={on}
            className={'cx-press flex min-h-[38px] items-center gap-1 rounded-full px-3.5 text-[13px] font-bold transition ' + (on ? 'bg-[#F3ECFF] text-[var(--am-ink)] shadow-[inset_0_0_0_1.5px_#7C3AED]' : 'bg-[#FAF8FD] text-[var(--ink-2)] shadow-[inset_0_0_0_1px_#E7E1F0]')}>
            {on && <Check size={13} strokeWidth={3} />}{label}
          </button>
        )
      })}
    </div>
  )
}
