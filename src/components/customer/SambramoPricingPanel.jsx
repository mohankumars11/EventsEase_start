import { useMemo } from 'react'
import { BadgeCheck, Calculator, ChevronRight, Clock3, FileCheck2, ShieldCheck, Sparkles } from 'lucide-react'
import { formatINR } from '../../utils/format'
import { PRICING_STATES, stateCopy, pricingPolicyFor } from '../../data/sambramoPricingPolicy'

function stateTone(state) {
  return ({
    [PRICING_STATES.INSTANT_BOOK]: 'bg-forest-50 text-forest-700 ring-forest-500/15',
    [PRICING_STATES.INSTANT_QUOTE]: 'bg-violet-50 text-violet-700 ring-violet-500/15',
    [PRICING_STATES.PROVISIONAL_QUOTE]: 'bg-amber-50 text-amber-800 ring-amber-500/15',
    [PRICING_STATES.VENDOR_QUOTE]: 'bg-plum-50 text-plum-700 ring-plum-500/15',
    [PRICING_STATES.QUOTE_ACTION_REQUIRED]: 'bg-rose-50 text-rose-700 ring-rose-500/15',
    [PRICING_STATES.UNAVAILABLE]: 'bg-gray-100 text-gray-600 ring-gray-400/15',
  })[state] ?? 'bg-surface text-ink-soft ring-hairline/10'
}

export default function SambramoPricingPanel({
  tradeId,
  state = PRICING_STATES.INSTANT_BOOK,
  price = null,
  priceLabel = null,
  detail = null,
  expiresAt = null,
  onAction = null,
  customAction = null,
  compact = false,
}) {
  const copy = stateCopy(state)
  const policy = pricingPolicyFor(tradeId)
  const mins = useMemo(
    () => expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60000)) : null,
    [expiresAt],
  )
  const instant = state === PRICING_STATES.INSTANT_BOOK || state === PRICING_STATES.INSTANT_QUOTE

  return (
    <section className={compact ? 'rounded-3xl bg-white p-4 ring-1 ring-hairline/10' : 'overflow-hidden rounded-[28px] bg-white shadow-[var(--shadow-1)] ring-1 ring-hairline/10'}>
      <div className={compact ? 'p-0' : 'bg-gradient-to-br from-plum-950 via-plum-800 to-violet-700 p-5 text-white'}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Calculator size={21} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={compact ? 'text-[10px] font-extrabold uppercase tracking-[0.14em] text-plum-700' : 'text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/70'}>
              {copy.eyebrow}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className={compact ? 'text-[17px] font-extrabold text-ink' : 'text-[21px] font-extrabold'}>
                {copy.title}
              </h2>
              <span className={'rounded-full px-2 py-0.5 text-[9.5px] font-extrabold ring-1 ' + stateTone(state)}>
                {state.replaceAll('_', ' ')}
              </span>
            </div>
            <p className={compact ? 'mt-1 text-[11.5px] leading-relaxed text-ink-mute' : 'mt-1 text-[11.5px] leading-relaxed text-white/80'}>
              {copy.body}
            </p>
          </div>
        </div>

        {price != null && (
          <div className={compact ? 'mt-4 rounded-2xl bg-plum-50 p-3' : 'mt-4 rounded-2xl bg-white/10 p-3'}>
            <p className={compact ? 'text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-plum-700' : 'text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-white/65'}>
              {priceLabel ?? 'Sambramo price'}
            </p>
            <p className={compact ? 'mt-1 text-[27px] font-extrabold tabular-nums text-ink' : 'mt-1 text-[29px] font-extrabold tabular-nums'}>
              {formatINR(price)}
            </p>
          </div>
        )}

        {detail && <p className={compact ? 'mt-2 text-[11px] leading-relaxed text-ink-mute' : 'mt-2 text-[10.5px] leading-relaxed text-white/70'}>{detail}</p>}
      </div>

      <div className={compact ? 'p-0 pt-3' : 'p-4'}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            [ShieldCheck, 'Verified supply', 'Capability + eligibility checked'],
            [BadgeCheck, 'One Sambramo decision', instant ? 'No partner price negotiation' : 'Partner quote stays inside Sambramo'],
            [Clock3, mins != null ? String(mins) + ' min left' : policy?.customFirst ? 'Quote lane' : 'Always on'],
          ].map(([Icon, title, body]) => (
            <div key={title} className="rounded-2xl bg-surface p-3 ring-1 ring-hairline/[0.08]">
              <Icon size={15} className="text-plum-600" />
              <p className="mt-1.5 text-[11px] font-extrabold text-ink">{title}</p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-ink-mute">{body}</p>
            </div>
          ))}
        </div>

        {onAction && (
          <button type="button" onClick={onAction} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-saffron-400 py-3 text-[13px] font-extrabold text-plum-950">
            {copy.cta} <ChevronRight size={14} />
          </button>
        )}

        {customAction && state !== PRICING_STATES.VENDOR_QUOTE && (
          <button type="button" onClick={customAction} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-plum-50 py-2.5 text-[12px] font-extrabold text-plum-700 ring-1 ring-plum-200">
            <Sparkles size={14} /> Make it custom — Sambramo handles the quote
          </button>
        )}

        <div className="mt-3 flex items-center gap-2 text-[10.5px] text-ink-mute">
          <FileCheck2 size={13} className="shrink-0" />
          {instant ? 'The partner sees the same agreed service scope.' : 'Quotes, scope, revisions and payment stay inside Sambramo.'}
        </div>
      </div>
    </section>
  )
}
