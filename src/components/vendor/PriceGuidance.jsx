import { IndianRupee, ShieldCheck, TrendingUp, Info } from 'lucide-react'
import { rateFactor } from '../../data/marketRates'

/**
 * A rate per menu, and the truth about who sets the customer's price.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY NOT ONE NUMBER FOR THE BUSINESS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The form asked "your price" once. A caterer does not have one price. A
 * leaf meal, a buffet with live counters and a box meal are three
 * different costs, and being asked for a single figure forces them to
 * quote either their cheapest — and lose money on the big jobs — or their
 * dearest, and never be offered the small ones.
 *
 * Both outcomes end the same way: the partner concludes the platform does
 * not understand their trade. So each menu they ticked gets its own
 * field, and all of them are optional.
 *
 * ══════════════════════════════════════════════════════════════════════
 * AND THE PART THAT IS USUALLY LEFT UNSAID
 * ══════════════════════════════════════════════════════════════════════
 *
 * The number a partner types here is NOT what the customer is shown.
 * match_partners() never reads vendor_services.price; lib/instantPricing.js
 * sets the customer figure from the catalogue and the market index.
 *
 * That is a reasonable way to run a marketplace and an unreasonable thing
 * to hide. A partner who discovers it after their first job feels
 * tricked, and rightly — they were told "your price" and it was not.
 *
 * Told up front, the same fact reads completely differently: they are
 * quoting a FLOOR, not a shelf price. What the market bears above that
 * floor is the margin that keeps them whole on the jobs where it does
 * not. That is worth saying plainly, and it is said plainly.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE MARKET LINE IS GUIDANCE, NEVER A GATE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Under market, it asks whether their own cost is covered. Over market,
 * it says they will still be put forward — fewer jobs, better margin.
 * Neither blocks the field. A partner's floor is their business; the
 * app's job is to make sure they set it knowing what the market does.
 */

/**
 * What most quote for this menu, from the catalogue and the live index.
 *
 * 'provisions', not 'catering'. There is no catering component —
 * marketRates tracks provisions, kitchen, service and decor, and
 * rateFactor resolves an unknown key to 1.00 rather than throwing. So
 * asking for 'catering' returned a number that looked right, moved
 * never, and gave no sign it was doing nothing.
 *
 * Provisions is also the correct one on the merits: it is the only
 * component with a live feed behind it (Agmarknet mandi prices), and
 * groceries are what actually moves a plate rate week to week. Cooks and
 * serving staff are wage-linked and held at baseline by design.
 */
function marketFor(menu) {
  const base = Number(menu.fromPrice ?? menu.basePlate ?? 0)
  if (!base) return null
  return Math.round((base * rateFactor('provisions')) / 10) * 10
}

export default function PriceGuidance({ menus = [], rates = {}, onChange }) {
  if (!menus.length) return null

  return (
    <div className="space-y-3">
      {/* ── What happens to these numbers ───────────────────────────── */}
      <div className="overflow-hidden rounded-[20px] bg-plum-950 text-white">
        <div className="p-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-saffron-400 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-plum-950">
            <ShieldCheck size={12} />
            Your margin
          </span>
          <p className="mt-2.5 font-display text-[19px] font-extrabold leading-tight">
            Your rate is your floor, not your ceiling
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/75">
            Tell us what you need for each menu. Sambramo sets what the
            customer pays — from your rate and what the market is doing — and
            your rate is what you are paid. When the market lets us charge
            more, that difference is what protects you on the jobs where it
            is tight.
          </p>
        </div>
        <p className="flex items-start gap-2 border-t border-white/10 bg-white/[0.06] px-4 py-3 text-[11.5px] leading-snug text-white/70">
          <Info size={13} className="mt-0.5 shrink-0" />
          You are never asked to go below the rate you put here. A job you do
          not want is one tap to decline, with no penalty.
        </p>
      </div>

      {/* ── One field per menu ──────────────────────────────────────── */}
      {menus.map(m => {
        const market = marketFor(m)
        const mine = Number(rates[m.id] ?? 0)
        const under = market && mine > 0 && mine < market * 0.85
        const over = market && mine > market * 1.15

        return (
          <div key={m.id} className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
            <p className="text-[14px] font-extrabold leading-tight text-ink">{m.name}</p>
            {market && (
              <p className="mt-0.5 text-[11.5px] text-ink-mute">
                Most caterers quote around ₹{market} a plate for this
              </p>
            )}

            <div className="mt-2.5 flex items-center gap-2">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink/[0.04] text-ink-soft">
                <IndianRupee size={17} />
              </span>
              <input
                value={rates[m.id] ?? ''}
                onChange={e => onChange({
                  ...rates,
                  [m.id]: e.target.value.replace(/\D/g, '').slice(0, 6),
                })}
                inputMode="numeric"
                placeholder={market ? String(market) : 'Your rate'}
                aria-label={`Your rate for ${m.name}`}
                className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-3 text-[16px] font-extrabold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
              />
              <span className="shrink-0 text-[12px] font-bold text-ink-mute">a plate</span>
            </div>

            {/* Guidance, never a gate. Both of these are informative and
                neither stops the number being saved. */}
            {under && (
              <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-[11.5px] leading-snug text-amber-900">
                That is well under the ₹{market} most quote. Worth checking it
                covers your own cost — we will put you forward at it either
                way.
              </p>
            )}
            {over && (
              <p className="mt-2 flex items-start gap-1.5 rounded-2xl bg-forest-50 px-3 py-2 text-[11.5px] leading-snug text-forest-800">
                <TrendingUp size={13} className="mt-0.5 shrink-0" />
                Above the ₹{market} most quote. You will be offered fewer jobs
                and keep more on each one.
              </p>
            )}
          </div>
        )
      })}

      <p className="px-1 text-[11.5px] leading-relaxed text-ink-mute">
        Leave any of them blank to quote that menu job by job. Nothing here is
        shown to a customer until somebody at Sambramo has read it.
      </p>
    </div>
  )
}
