import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'
import { BANKS } from '../../../data/indianBanks'
import { lookupIfsc, looksLikeIfsc } from '../../../lib/ifsc'

/**
 * The bank list and the IFSC lookup, shared by every payout form.
 *
 * BANKS (data/indianBanks) and lookupIfsc (lib/ifsc → Razorpay's IFSC
 * service) are the existing implementations; this file only makes the
 * list searchable on a phone and puts the lookup in one hook, so the More
 * tab's Bank & payments and the onboarding step cannot disagree about
 * what a code means.
 */

/** Debounced IFSC lookup. Fills the bank when the code names one and none is picked. */
export function useIfscLookup(ifsc, bank, setBank, { delay = 450 } = {}) {
  const [branch, setBranch] = useState(null)
  const [checking, setChecking] = useState(false)
  const [tick, setTick] = useState(0)
  const timer = useRef()
  useEffect(() => {
    clearTimeout(timer.current)
    setBranch(null)
    const code = String(ifsc ?? '').trim().toUpperCase()
    if (!looksLikeIfsc(code)) { setChecking(false); return }
    setChecking(true)
    timer.current = setTimeout(async () => {
      const r = await lookupIfsc(code)
      setChecking(false)
      setBranch(r)
      // A partner who typed the code before picking the bank should not then have to pick it.
      if (r.ok && !bank) {
        const known = BANKS.find(b => b.name === r.bank)
        if (known) setBank(known.name)
      }
    }, delay)
    return () => clearTimeout(timer.current)
  }, [ifsc, bank, tick]) // eslint-disable-line react-hooks/exhaustive-deps
  return { branch, checking, retry: () => setTick(t => t + 1) }
}

/** A searchable bank dropdown over the full BANKS list. */
export default function BankPicker({ id = 'po-bank', value, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef(null)
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? BANKS.filter(b => b.name.toLowerCase().includes(t) || b.code.toLowerCase().startsWith(t)) : BANKS
  }, [q])
  useEffect(() => {
    if (!open) return
    const away = e => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])
  return (
    <div ref={box} className="relative" data-bank-picker>
      <button type="button" id={id} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)}
        className="input flex items-center justify-between text-left">
        <span className={value ? 'text-ink' : 'text-ink-mute'}>{value || 'Choose your bank…'}</span>
        <ChevronDown size={16} className="text-ink-mute" />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-2xl bg-white shadow-[0_14px_36px_rgba(42,8,92,0.18)] ring-1 ring-plum-100">
          <div className="relative border-b border-ink/[0.06] p-2">
            <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-plum-500" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search your bank" aria-label="Search banks"
              data-testid="bank-search" className="w-full rounded-xl bg-[#f6f3fc] py-2.5 pl-9 pr-3 text-[14px] font-semibold text-ink placeholder:font-medium placeholder:text-ink/40 focus:outline-none" />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {list.map(b => (
              <li key={b.code}>
                <button type="button" role="option" aria-selected={value === b.name} data-bank={b.code}
                  onClick={() => { onChange(b.name); setOpen(false); setQ('') }}
                  className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[13.5px] ${value === b.name ? 'bg-plum-50 font-extrabold text-plum-800' : 'text-ink'}`}>
                  {b.name}{value === b.name && <Check size={15} />}
                </button>
              </li>
            ))}
            {!list.length && <li className="px-3.5 py-3 text-[12.5px] font-bold text-ink-mute">No bank matches “{q}”. Type your IFSC below — it names the bank.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
