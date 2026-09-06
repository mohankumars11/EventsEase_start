import React from 'react'
import { Truck } from 'lucide-react'

/**
 * The four numbers a transporter actually quotes.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY ONE PRICE FIELD COULD NOT HOLD THIS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every unit in the app was per event, per day or per person. A goods
 * transporter charges base fare plus per kilometre plus waiting, and
 * asking them for one number forced them to invent an average — which
 * then had to be renegotiated on the phone for every job, which is the
 * exact argument this platform exists to remove.
 *
 * Four fields, in the order a partner says them out loud:
 *
 *   Base fare        what the meter starts at
 *   Free kilometres  what that base fare already covers
 *   Per kilometre    after those
 *   Waiting          per minute, once loading runs long
 *
 * ── Waiting is the one that gets forgotten ───────────────────────────
 * A driver sitting outside a kalyana mantapa for forty minutes while
 * somebody finds the key to the store room is doing unpaid work. Asked
 * here, it is on the job sheet; not asked, it becomes a row at the end
 * of a wedding day. Blank is allowed and means "I do not charge for it",
 * which is a real answer and not a missing one.
 *
 * ── What Sambramo does with these ────────────────────────────────────
 * The same as every other partner rate: it is a floor, not a shelf
 * price. The strip on the price screen says so, and it says it before
 * the partner types rather than after their first job.
 */

const FIELDS = [
  {
    id: 'base_fare',
    label: 'Base fare',
    hint: 'What the trip starts at, before distance.',
    presets: ['100', '150', '200', '300', '500'],
    prefix: '₹',
  },
  {
    id: 'free_km',
    label: 'Kilometres the base fare covers',
    hint: 'Leave blank if you charge per kilometre from the first one.',
    presets: ['0', '2', '3', '5', '10'],
    suffix: 'km',
  },
  {
    id: 'per_km',
    label: 'Per kilometre after that',
    hint: 'The number that decides whether a job across the city is worth it.',
    presets: ['12', '15', '18', '22', '30'],
    prefix: '₹',
  },
  {
    id: 'waiting_per_min',
    label: 'Waiting, per minute',
    hint: 'Once loading runs long. Blank means you do not charge for it.',
    presets: ['0', '1', '2', '3', '5'],
    prefix: '₹',
  },
]

export default function DistanceRates({ rates = {}, onChange }) {
  const set = (id, v) => onChange({ ...rates, [id]: v || undefined })

  return (
    <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0 rounded-xl bg-forest-50 p-2 text-forest-700">
          <Truck size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold leading-tight text-ink">
            How your fare is built
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">
            One number cannot describe a trip. Four can, and then a job
            comes to you with the fare already worked out instead of a
            phone call.
          </p>
        </div>
      </div>

      <div className="mt-3.5 space-y-3.5">
        {FIELDS.map(f => (
          <label key={f.id} className="block">
            <span className="block text-[13px] font-extrabold text-ink">{f.label}</span>
            <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">
              {f.hint}
            </span>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.presets.map(p => {
                const on = (rates[f.id] ?? '') === p
                return (
                  <button
                    key={p} type="button" aria-pressed={on}
                    onClick={() => set(f.id, on ? '' : p)}
                    className={`rounded-full px-3 py-1.5 text-[12.5px] font-bold transition ${
                      on ? 'bg-forest-600 text-white ring-2 ring-forest-600'
                         : 'bg-ink/[0.03] text-ink-soft ring-1 ring-ink/[0.08]'
                    }`}
                  >
                    {f.prefix ?? ''}{p}{f.suffix ? ' ' + f.suffix : ''}
                  </button>
                )
              })}
            </div>

            {/* The typed number and the chips are ONE value, for the same
                reason the ops screens work that way: two answers to one
                question, both lit, and no way to know which we kept. */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[12px] font-bold text-ink-mute">Or exact</span>
              {f.prefix && (
                <span className="font-serif text-[16px] font-extrabold text-ink">{f.prefix}</span>
              )}
              <input
                value={f.presets.includes(rates[f.id]) ? '' : (rates[f.id] ?? '')}
                onChange={e => set(f.id, e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="—"
                aria-label={f.label}
                className="w-24 rounded-xl bg-white px-3 py-2 text-center text-[14px] font-extrabold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
              />
              {f.suffix && (
                <span className="text-[12px] font-bold text-ink-mute">{f.suffix}</span>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Read back as a sentence, because four fields are easy to fill in
          and hard to picture. A partner who sees ₹520 for a 20 km run and
          thinks that is low has learnt something while they can still
          change it. */}
      <Example rates={rates} />
    </div>
  )
}

function Example({ rates }) {
  const n = v => {
    const x = Number(v)
    return Number.isFinite(x) && v !== '' && v !== undefined ? x : 0
  }
  const base = n(rates.base_fare)
  const free = n(rates.free_km)
  const perKm = n(rates.per_km)
  if (!base && !perKm) return null

  const KM = 20
  const total = base + Math.max(0, KM - free) * perKm
  return (
    <p className="mt-3.5 rounded-2xl bg-forest-50 px-3.5 py-3 text-[12.5px] leading-snug text-forest-800">
      <span className="font-extrabold">A 20 km run works out at ₹{total.toLocaleString('en-IN')}</span>
      {' '}— ₹{base.toLocaleString('en-IN')} to start
      {free > 0 ? `, ${free} km included` : ''}
      {perKm > 0 ? `, then ₹${perKm} a kilometre` : ''}. Waiting is on top.
    </p>
  )
}
