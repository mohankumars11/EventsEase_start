/**
 * The experience, as three level cards (Mohan, 2026-11-11/12: one word,
 * no duration, no deliverables, a soft tinted card — "I want this design
 * only" — and a price line a customer feels safe with).
 *
 *   Essential · Signature · VIP
 *
 * Each level is a tinted card in its own metal — peach, lavender, gold —
 * with a level meter, the word, the tier's own name (migration 208) in
 * small type, one plain line on what it covers, and the footer all three
 * share: the final price is shown at the end, before anything is paid.
 * Hours and inclusions still drive the match — they are just not printed.
 */
import { Check, ShieldCheck } from 'lucide-react'

const TIER = {
  ESSENTIAL: { tag: 'Essential', level: 1, card: 'linear-gradient(160deg, #FFF7EE 0%, #F7DFC3 100%)', bar: '#C47A3A', ink: '#6B3A12', sub: '#9A6336' },
  SIGNATURE: { tag: 'Signature', level: 2, card: 'linear-gradient(160deg, #F4EDFF 0%, #DCCBFF 100%)', bar: '#7C3AED', ink: '#3B1670', sub: '#6B4FA0', ribbon: 'Most chosen' },
  VIP: { tag: 'VIP', level: 3, card: 'linear-gradient(160deg, #FFF8DF 0%, #F6DD8A 100%)', bar: '#C9960F', ink: '#6B4A00', sub: '#8A6A2A' },
}
/* What a level covers, in one plain line — by the tier, never by its hours. */
const LINE = {
  PARTNER_PACKAGE: { ESSENTIAL: 'The key moments, covered', SIGNATURE: 'Start to finish, nothing missed', VIP: 'Everything, with the extras included' },
  VISUAL_SPECIFICATION: { ESSENTIAL: 'The key spots, dressed', SIGNATURE: 'Stage and entrance, styled to your theme', VIP: 'The whole venue, transformed' },
  LEVEL: { ESSENTIAL: 'The essentials, done well', SIGNATURE: 'The full service, nothing missed', VIP: 'Everything, with the extras included' },
  PLANNER: { ESSENTIAL: 'The plan and the right vendors — you run the day', SIGNATURE: 'Plan, vendors arranged, someone runs the day', VIP: 'Everything, from the first idea to the last guest' },
}

/* Every service gets the three levels (Mohan, 2026-11-12: "it should happen
   everywhere"). A trade with its own experience rows (migration 208) uses
   them — hours and inclusions then drive the match; any other trade gets
   these, which travel to the master as the level asked for. */
export const GENERIC_TIERS = [
  { tier: 'ESSENTIAL', name: 'Essentials', model: 'LEVEL' }, { tier: 'SIGNATURE', name: 'Signature service', model: 'LEVEL' }, { tier: 'VIP', name: 'VIP service', model: 'LEVEL' },
]

export default function TierCards({ tiers, value, onPick, lines = null }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" data-tiers="experience">
      {tiers.map(x => {
        const key = String(x.tier).toUpperCase()
        const t = TIER[key] ?? TIER.ESSENTIAL
        const on = value === x.tier
        const line = lines?.[key] ?? LINE[x.model]?.[key] ?? LINE.PARTNER_PACKAGE[key] ?? ''
        return (
          <button key={x.tier} type="button" role="radio" aria-checked={on} onClick={() => onPick(on ? null : x)} data-tier={x.tier}
            className={'cx-press relative flex min-h-[160px] flex-col overflow-hidden rounded-[18px] p-2.5 text-left transition-[box-shadow,transform] duration-200 ' + (on ? '-translate-y-0.5 shadow-[0_0_0_2.5px_#7C3AED,0_16px_28px_-16px_rgba(91,33,182,.9)]' : 'shadow-[0_0_0_1px_rgba(28,16,51,.06),0_8px_18px_-16px_rgba(58,18,144,.5)]')}
            style={{ background: t.card, color: t.ink }}>
            {t.ribbon && <span className="absolute -right-9 top-[18px] rotate-45 bg-[#16A34A] px-9 py-[2px] text-[7.5px] font-black uppercase tracking-[0.12em] text-white">{t.ribbon}</span>}
            <span className="flex items-end gap-[3px]" aria-hidden>
              {[1, 2, 3].map(n => <span key={n} className="w-[7px] rounded-[2px]" style={{ height: 6 + n * 4, background: n <= t.level ? t.bar : 'rgba(28,16,51,.12)' }} />)}
            </span>
            <span className="mt-2 block text-[15px] font-black leading-tight tracking-[-0.02em]">{t.tag}</span>
            <span className="block text-[10.5px] font-bold leading-tight" style={{ color: t.sub }}>{x.name}</span>
            <span className="mt-2 block text-[11px] font-semibold leading-snug"><span className="opacity-60">e.g. </span>{line}<span className="block pt-0.5 text-[10px] font-extrabold opacity-70">+ much more</span></span>
            <span className="mt-auto flex items-center gap-1 pt-2 text-[9.5px] font-extrabold leading-tight text-[#0B7A45]"><ShieldCheck size={11} className="shrink-0" />Customise with your master</span>
            {on && <span className="cx-pop absolute right-1.5 top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-[#7C3AED] text-white"><Check size={11} strokeWidth={3.4} /></span>}
          </button>
        )
      })}
    </div>
  )
}
