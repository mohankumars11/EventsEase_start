import { useCallback, useEffect, useState } from 'react'
import { History, Loader2, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'

/**
 * Jobs a master was offered and did not get.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY KEEP IT AT ALL
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Why am I not getting any work" is going to be the most common thing a
 * master says to Sambramo, and this is the answer to it. A master who
 * has passed on nine of their last ten offers is not experiencing a
 * matching bug — and being able to see that themselves is worth more
 * than being told it.
 *
 * It also shows the ones that were LOST: somebody else accepted first.
 * That is the part a master cannot otherwise see, and it is the honest
 * argument for answering faster.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "CLEAR" HIDES. IT DOES NOT DELETE.
 * ══════════════════════════════════════════════════════════════════════
 *
 * `dispatch_offers` is the audit trail behind first-accept-wins — it is
 * what `uq_offer_one_winner` operates on and what a dispute is settled
 * against. A partner able to DELETE rows from it is a partner able to
 * erase the evidence of an offer they later argue about.
 *
 * So clearing sets `hidden_at` on the master's own view (migration 081).
 * Their screen empties, which is what they asked for, and the record
 * survives, which is what the platform needs. Nobody is being denied
 * anything: the row is theirs to stop looking at, not theirs to destroy.
 */

const LABEL = {
  DECLINED: { text: 'You passed',        tone: 'text-ink-mute' },
  LOST:     { text: 'Another master got it', tone: 'text-ink-mute' },
  EXPIRED:  { text: 'You did not answer',    tone: 'text-amber-700' },
}

export default function OfferHistory({ vendorId }) {
  const [rows, setRows] = useState(null)
  const [missing, setMissing] = useState(false)
  const [open, setOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const read = useCallback(async () => {
    const { data, error } = await supabase
      .from('partner_offer_history')
      .select('*')
      .order('offered_at', { ascending: false })
      .limit(60)

    if (error && /does not exist|schema cache/i.test(error.message)) { setMissing(true); setRows([]); return }
    setRows(data ?? [])
  }, [])

  useEffect(() => { read() }, [read])

  async function clearAll() {
    setClearing(true)
    await supabase.rpc('clear_offer_history', { p_vendor_id: vendorId })
    setClearing(false)
    setConfirm(false)
    await read()
  }

  if (missing || rows === null || rows.length === 0) return null

  return (
    <div className="rounded-[22px] bg-white ring-1 ring-ink/[0.06]">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <span className="inline-flex items-center gap-2 text-[13.5px] font-extrabold text-ink">
          <History size={15} className="text-ink-mute" />
          Jobs you did not take
          <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-extrabold text-ink-soft">
            {rows.length}
          </span>
        </span>
        <span className="text-[12px] font-bold text-ink-mute">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="border-t border-ink/[0.06] px-4 pb-4">
          <ul className="divide-y divide-ink/[0.05]">
            {rows.map(r => {
              const meta = LABEL[r.status] ?? LABEL.LOST
              return (
                <li key={r.offer_id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold text-ink">{r.service_name}</p>
                    <p className="mt-0.5 truncate text-[11.5px] font-semibold text-ink-mute">
                      {new Date(r.event_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {' · '}{r.area_label ?? ''}
                      {r.distance_m != null && ` · ${(r.distance_m / 1000).toFixed(1)} km`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[12.5px] font-bold tabular-nums text-ink-mute">
                      {formatINR(Math.round((r.partner_amount_paise ?? 0) / 100))}
                    </p>
                    <p className={`text-[10.5px] font-extrabold ${meta.tone}`}>{meta.text}</p>
                  </div>
                </li>
              )
            })}
          </ul>

          {!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-ink-mute hover:text-ink-soft"
            >
              <Trash2 size={13} /> Clear this list
            </button>
          ) : (
            <div className="mt-3 rounded-2xl bg-surface-sunk/[0.06] p-3.5">
              <p className="text-[12.5px] font-semibold leading-relaxed text-ink-soft">
                This clears the list from your app. Sambramo keeps its own record —
                it is what settles a disagreement about who accepted a job first.
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={clearAll}
                  disabled={clearing}
                  className="flex items-center gap-1.5 rounded-2xl bg-ink px-3.5 py-2 text-[12.5px] font-extrabold text-white disabled:opacity-60"
                >
                  {clearing && <Loader2 size={13} className="animate-spin" />}
                  Clear it
                </button>
                <button
                  onClick={() => setConfirm(false)}
                  className="inline-flex items-center gap-1 rounded-2xl px-3 py-2 text-[12.5px] font-bold text-ink-mute"
                >
                  <X size={13} /> Keep
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
