/**
 * 2–4 offers side by side (lib/offerBoard compareRows). Rows where the offers
 * differ are highlighted and the best value in each is marked; rows where
 * they are the same are muted, so the eye goes to what actually separates
 * them. Scrolls sideways — the row names stay pinned, as CompareSheet does.
 */
import { Check } from 'lucide-react'
import { compareRows } from '../lib/offerBoard'
import { Sheet } from './kit'

const COL = 128

export default function OfferCompare({ open, onClose, items, onChoose }) {
  const rows = items.length > 1 ? compareRows(items) : []
  return (
    <Sheet open={open} onClose={onClose} title="Compare offers">
      <div className="cx-noscroll -mx-4 overflow-x-auto pb-2" data-offer-compare>
        <table className="border-separate border-spacing-0 text-[12.5px]" style={{ minWidth: 112 + COL * items.length }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-[112px] bg-white" />
              {items.map(x => (
                <th key={`${x.offer.serviceId}:${x.offer.packageId}`} style={{ width: COL }} className="px-2 pb-2 text-left align-bottom">
                  <span className="block truncate text-[13px] font-black">{x.partner.name}</span>
                  <span className="block truncate text-[11px] font-bold text-[var(--ink-3)]">{x.offer.kind === 'rate' ? 'By the hour' : `“${x.offer.label}”`}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label} className={r.differs ? 'bg-[#FFF8E6]' : ''} data-row={r.label} data-differs={r.differs}>
                <td className={'sticky left-0 z-10 py-2 pl-4 pr-2 font-extrabold ' + (r.differs ? 'bg-[#FFF8E6] text-[#1C1033]' : 'bg-white text-[var(--ink-3)]')}>{r.label}</td>
                {r.values.map((v, i) => (
                  <td key={i} className={'px-2 py-2 ' + (r.differs ? 'font-extrabold' : 'font-semibold text-[var(--ink-3)]')} data-best={r.best[i]}>
                    <span className="flex items-center gap-1">{r.best[i] && <Check size={13} strokeWidth={3} className="shrink-0 text-[#0C831F]" />}{v}</span>
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="sticky left-0 bg-white" />
              {items.map(x => (
                <td key={`${x.offer.serviceId}:${x.offer.packageId}:go`} className="px-2 pt-3">
                  <button type="button" onClick={() => onChoose(x.m, x.offer)} className="cx-solid cx-solid-flat shadow-[0_8px_18px_-10px_rgba(20,10,40,.55)] cx-press h-9 w-full rounded-full bg-[var(--brand)] text-[12px] font-extrabold text-white" data-compare-choose>Choose</button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Sheet>
  )
}
