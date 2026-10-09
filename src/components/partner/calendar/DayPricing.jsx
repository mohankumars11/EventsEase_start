/**
 * "Bookable this day", inside the Calendar's own day sheet.
 *
 * Read from the PUBLISHED pricing for the date (seasonal if the date falls
 * in an approved window). The calendar never stores or edits a price: an
 * open day with no live package shows nothing bookable, and a live package
 * does not make a blocked day bookable.
 */
import { Sparkles, Lock } from 'lucide-react'
import { rupees } from '../../../lib/tierPackages'

export default function DayPricing({ info }) {
  if (!info) return null
  return (
    <div className="rounded-[18px] bg-white p-3.5 ring-1 ring-ink/[0.07]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/45">Bookable this day</p>
        {info.seasonal && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-extrabold text-amber-800">
            <Sparkles size={11} /> {info.seasonal}
          </span>
        )}
      </div>
      {info.prices.length === 0
        ? <p className="mt-2 text-[12.5px] font-semibold text-ink/55">{info.empty ?? 'No live packages yet. They appear here once approved.'}</p>
        : (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {info.prices.map(p => (
              <div key={p.name} className={`rounded-2xl p-2.5 text-center ${p.bookable ? 'bg-plum-50 ring-1 ring-plum-200' : 'bg-ink/[0.04] opacity-60'}`}>
                <p className="text-[10.5px] font-extrabold uppercase text-ink/50">{p.name}</p>
                <p className="text-[14px] font-extrabold text-ink">{rupees(p.paise)}</p>
                <p className="text-[10.5px] font-bold text-ink/45">{p.bookable ? `${p.hours} hrs` : p.why}</p>
              </div>
            ))}
          </div>
        )}
      <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-snug text-ink/45">
        <Lock size={11} className="mt-0.5 shrink-0" />Prices come from your published packages. Change them in Pricing.
      </p>
    </div>
  )
}
