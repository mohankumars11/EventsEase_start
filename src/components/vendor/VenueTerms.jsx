import React from 'react'
import { Building2, AlertCircle } from 'lucide-react'

/**
 * What a hall actually costs, said before anybody books it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY ONE PRICE IS NOT A VENUE'S PRICE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The price screen asks for a number and a unit. For a photographer that
 * is the whole answer. For a hall it is the smallest part of one, and
 * every family that has booked a mantapa knows why: the rent is quoted,
 * the deposit is mentioned, and then there is electricity on actuals, a
 * kitchen royalty because you brought your own caterer, a generator
 * charge, cleaning, and ₹5,000 an hour past midnight.
 *
 * None of that is dishonest. It is how the trade works. It becomes
 * dishonest at the moment it is discovered after the advance is paid,
 * and the venue that quoted a clean number and added six lines later
 * looks worse than the one that said all seven up front — even when the
 * total is identical.
 *
 * So this asks for all of it, and says why in a sentence a venue owner
 * would agree with: a family that knows the real number does not
 * negotiate it down on the day.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BLANK IS AN ANSWER
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every field here can be left empty and empty means "we do not charge
 * this". That is a real answer and a good one — a hall with no kitchen
 * royalty should be able to say so loudly, because it is the thing that
 * wins them the booking against the hall next door.
 *
 * Nothing is a gate. A venue owner filling this in on a phone between
 * two functions has to be able to stop and come back.
 */

const RENT = [
  {
    id: 'basis',
    kind: 'choice',
    label: 'How do you charge for the hall?',
    hint: 'The rest of this screen changes meaning depending on this one.',
    options: [
      ['per_day', 'Per day'],
      ['per_slot', 'Per slot', 'Morning and evening, priced separately'],
      ['per_hour', 'Per hour'],
      ['per_plate', 'Per plate, hall included', 'A minimum spend, not a rent'],
    ],
  },
  { id: 'rent', kind: 'money', label: 'The rent itself', hint: 'For one of whatever you picked above.' },
  { id: 'deposit', kind: 'money', label: 'Refundable deposit', hint: 'Blank if you do not take one.' },
  { id: 'advance_pct', kind: 'number', label: 'Advance to hold a date', suffix: '%' },
]

const EXTRAS = [
  { id: 'kitchen_royalty', label: 'Outside caterer charge', hint: 'The royalty. Blank if outside caterers are free.' },
  { id: 'electricity', label: 'Electricity', hint: 'Blank if it is in the rent. Say “on actuals” below if it is metered.' },
  { id: 'generator', label: 'Generator', hint: 'Per event or per hour, as you charge it.' },
  { id: 'cleaning', label: 'Cleaning', hint: 'Blank if included.' },
  { id: 'overtime_hour', label: 'Every hour past your closing time', hint: 'The one families are most often surprised by.' },
  { id: 'ac_charge', label: 'Air conditioning', hint: 'Blank if the AC is in the rent.' },
]

export default function VenueTerms({ value = {}, onChange }) {
  const set = (id, v) => onChange({ ...value, [id]: v || undefined })
  const named = EXTRAS.filter(e => String(value[e.id] ?? '').trim() !== '')

  return (
    <div className="space-y-3">
      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 shrink-0 rounded-xl bg-forest-50 p-2 text-forest-700">
            <Building2 size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold leading-tight text-ink">
              What the hall costs
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">
              All of it, including the parts that are usually mentioned
              later. A family that knows the real number before they book
              does not argue about it on the day.
            </p>
          </div>
        </div>

        <div className="mt-3.5 space-y-3.5">
          {RENT.map(f => (
            <div key={f.id}>
              <p className="text-[13px] font-extrabold text-ink">{f.label}</p>
              {f.hint && (
                <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{f.hint}</p>
              )}

              {f.kind === 'choice' ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {f.options.map(([id, label, scan]) => {
                    const on = value[f.id] === id
                    return (
                      <button
                        key={id} type="button" aria-pressed={on}
                        onClick={() => set(f.id, on ? '' : id)}
                        className={`rounded-full px-3.5 py-2 text-[12.5px] font-bold transition ${
                          on ? 'bg-forest-600 text-white ring-2 ring-forest-600'
                             : 'bg-ink/[0.03] text-ink-soft ring-1 ring-ink/[0.08]'
                        }`}
                      >
                        {label}
                        {on && scan && <span className="ml-1.5 font-semibold opacity-70">{scan}</span>}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  {f.kind === 'money' && (
                    <span className="font-serif text-[18px] font-extrabold text-ink">₹</span>
                  )}
                  <input
                    value={value[f.id] ?? ''}
                    onChange={e => set(f.id, e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                    inputMode="numeric"
                    placeholder="—"
                    aria-label={f.label}
                    className="w-36 rounded-2xl bg-white px-3.5 py-2.5 text-[15px] font-extrabold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
                  />
                  {f.suffix && (
                    <span className="text-[13px] font-bold text-ink-mute">{f.suffix}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── The lines that get added later ─────────────────────────── */}
      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <p className="text-[14px] font-extrabold leading-tight text-ink">
          Anything on top of the rent
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">
          Leave a line blank and it means you do not charge it — which is
          worth saying out loud, because the hall down the road does.
        </p>

        <div className="mt-3 space-y-2.5">
          {EXTRAS.map(e => (
            <label key={e.id} className="flex items-center gap-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-extrabold leading-tight text-ink">{e.label}</span>
                <span className="block text-[11px] leading-snug text-ink-mute">{e.hint}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <span className="font-serif text-[15px] font-extrabold text-ink">₹</span>
                <input
                  value={value[e.id] ?? ''}
                  onChange={e2 => set(e.id, e2.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                  inputMode="numeric"
                  placeholder="—"
                  aria-label={e.label}
                  className="w-24 rounded-xl bg-white px-3 py-2 text-center text-[14px] font-extrabold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
                />
              </span>
            </label>
          ))}
        </div>

        <div className="relative mt-3">
          <input
            value={value.other_note ?? ''}
            onChange={e => set('other_note', e.target.value)}
            placeholder="Anything else you charge — say it your way"
            className="w-full rounded-2xl bg-ink/[0.02] py-2.5 pl-3.5 pr-3.5 text-[13px] font-semibold text-ink ring-1 ring-ink/[0.06] placeholder:font-normal placeholder:text-ink-mute"
          />
        </div>
      </div>

      {/* ── Read back, because six numbers do not add up in the head ── */}
      {named.length > 0 && (
        <div className="rounded-[20px] bg-amber-50 p-4 ring-1 ring-amber-200/70">
          <div className="flex gap-2.5">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-700" />
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-amber-900">
                A family booking you will be shown these {named.length}
                {' '}extra{named.length === 1 ? '' : 's'} up front
              </p>
              <p className="mt-1 text-[12.5px] leading-snug text-amber-800">
                {named.map(e => `${e.label.toLowerCase()} ₹${value[e.id]}`).join(' · ')}
                {value.other_note ? ` · ${value.other_note}` : ''}
              </p>
              <p className="mt-1.5 text-[11.5px] leading-snug text-amber-800/90">
                Not hidden and not held against you. A venue that lists
                them is the one nobody argues with on the day.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
