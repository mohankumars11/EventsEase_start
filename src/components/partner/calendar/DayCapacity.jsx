/**
 * "Capacity this day", inside the Calendar's day sheet.
 *
 * For every service on the shared engine: what its bookings have reserved
 * on this date against what the partner declared (staff, vehicles, stock,
 * spaces, guests per day). Read from sambramo_resource_reservations — the
 * same rows book_partner_line checks — so what is shown free is what the
 * next booking can actually take. Renders nothing for partners with no
 * declared resources, or before migration 20261010_07 is pasted.
 */
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function DayCapacity({ vendorId, date }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    if (!vendorId || !date) return
    let live = true
    ;(async () => {
      const from = new Date(`${date}T00:00:00+05:30`).toISOString()
      const to = new Date(new Date(from).getTime() + 864e5).toISOString()
      const { data: res, error } = await supabase.from('sambramo_resources')
        .select('id, label, quantity, unit, kind, vendor_services(category)').eq('vendor_id', vendorId).eq('active', true)
      if (error || !res?.length) { if (live) setRows([]); return }
      const { data: held } = await supabase.from('sambramo_resource_reservations')
        .select('resource_id, qty').eq('vendor_id', vendorId).neq('status', 'released').lt('start_at', to).gt('end_at', from)
      const used = {}
      for (const h of held ?? []) used[h.resource_id] = (used[h.resource_id] ?? 0) + Number(h.qty)
      if (live) setRows(res.map(r => ({ ...r, used: used[r.id] ?? 0 })))
    })()
    return () => { live = false }
  }, [vendorId, date])

  if (!rows?.length) return null
  return (
    <div className="rounded-[18px] bg-white p-3.5 ring-1 ring-ink/[0.07]">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/45">Capacity this day</p>
      <div className="mt-2 space-y-2">
        {rows.map(r => {
          const total = Number(r.quantity), pct = total ? Math.min(100, Math.round((r.used / total) * 100)) : 0
          return (
            <div key={r.id}>
              <div className="flex justify-between text-[12.5px]">
                <span className="font-bold text-ink">{r.label} <span className="font-semibold text-ink/45">· {r.vendor_services?.category}</span></span>
                <span className="font-extrabold text-ink">{total - r.used} of {total} free</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-ink/[0.06]">
                <div className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-forest-600'}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
