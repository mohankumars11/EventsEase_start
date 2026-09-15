import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, Loader2, Pause, Play } from 'lucide-react'
import { fetchListings, LISTING_STATUS, pauseListing, resubmitListing } from '../../lib/partnerListings'
import { iconForTrade } from './TradeGrid'

/**
 * My Services — the trades this partner has, one row each.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS REPLACES, AND WHY IT IS NOT A TAB
 * ══════════════════════════════════════════════════════════════════════
 *
 * The bottom bar had a "Listing" tab. It went straight into the add
 * flow, whose first screen is twenty-six trades with nothing marking the
 * ones the partner already has — so listing something a second time was
 * one tap from every screen in the app, and the only thing standing
 * between a partner and four Photographys was that they did not think to
 * do it.
 *
 * This is the front door instead. It answers "what have I got" before it
 * offers "add another", and the add button it offers goes to the same
 * twenty-six with what they own already marked.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE STATUS IS THE TRADE'S, NOT AN OFFERING'S
 * ══════════════════════════════════════════════════════════════════════
 *
 * A decorator has ten offerings under Decoration & Floral at three
 * different review states. "Decoration & Floral — LIVE, 2 waiting" is
 * the sentence they need; ten rows with ten pills is the screen they
 * already had, and it does not tell them whether they are earning.
 *
 * Never "Verified". That word is a claim about the business, an operator
 * sets it, and it lives on vendors.verification_status. A listing badge
 * that reads as a tick nobody awarded is the one thing this must not do.
 */
const TONE = {
  green: 'bg-forest-50 text-forest-700 ring-forest-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  rose:  'bg-rose-50 text-rose-700 ring-rose-200',
  gray:  'bg-ink/[0.05] text-ink-mute ring-ink/10',
}

export default function MyServices({ vendorId, onOpenTrade, initialRows = null }) {
  const navigate = useNavigate()
  const [rows, setRows] = useState(initialRows)
  const [busy, setBusy] = useState(null)

  /* ── Rows can arrive as a prop ──────────────────────────────────────
     The account tab already reads the listings — it needs the trades to
     work out which documents to ask for — and fetching them again here
     is the same query twice on one screen, with the two copies free to
     disagree for a moment after a pause.

     Still fetches when nothing is passed, because this component is
     also mounted on its own. */
  const load = () => {
    if (!vendorId) { setRows(initialRows ?? []); return }
    fetchListings(vendorId).then(setRows)
  }
  useEffect(() => {
    if (initialRows) { setRows(initialRows); return }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, initialRows])

  async function toggle(row) {
    if (!row.id) return          // fallback mode: no container to pause
    setBusy(row.trade)
    try {
      await (row.status === 'paused' ? resubmitListing(row.id) : pauseListing(row.id))
      load()
    } finally {
      setBusy(null)
    }
  }

  if (rows === null) {
    return (
      <p className="flex items-center gap-2 px-1 py-4 text-[13px] text-ink-mute">
        <Loader2 size={14} className="animate-spin" /> Loading your services…
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {!rows.length && (
        <p className="rounded-2xl bg-ink/[0.02] p-4 text-[13px] leading-relaxed text-ink-mute">
          You have not listed anything yet. Add what you do and we will start
          matching you with events.
        </p>
      )}

      {rows.map(row => {
        const Icon = iconForTrade(row.trade)
        const meta = LISTING_STATUS[row.status] ?? LISTING_STATUS.draft
        const waiting = row.offerings.filter(o => o.review_status === 'under_review').length
        return (
          <div key={row.trade} className="rounded-2xl bg-white p-3 ring-1 ring-ink/[0.06]">
            <button
              type="button"
              data-my-service={row.trade}
              onClick={() => onOpenTrade?.(row.trade)}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plum-950 text-white">
                <Icon size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-extrabold leading-tight text-ink">{row.trade}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-mute">
                  {row.offerings.length} {row.offerings.length === 1 ? 'offering' : 'offerings'}
                  {waiting ? ` · ${waiting} waiting to be read` : ''}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide ring-1 ${TONE[meta.tone]}`}>
                {meta.label}
              </span>
              <ChevronRight size={16} className="shrink-0 text-ink-mute" />
            </button>

            {/* Pause is the partner's own switch and the only status they
                may set. Hidden where there is no container row to set it
                on — a control that silently does nothing is worse than
                no control. */}
            {row.id && ['live', 'paused'].includes(row.status) && (
              <button
                type="button"
                onClick={() => toggle(row)}
                disabled={busy === row.trade}
                className="mt-2 flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl
                           bg-ink/[0.04] text-[12.5px] font-bold text-ink-soft disabled:opacity-50"
              >
                {busy === row.trade
                  ? <Loader2 size={13} className="animate-spin" />
                  : row.status === 'paused' ? <Play size={13} /> : <Pause size={13} />}
                {row.status === 'paused' ? 'Take jobs again' : 'Pause this trade'}
              </button>
            )}
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => navigate('/partner/services')}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl
                   bg-plum-50 text-[13.5px] font-extrabold text-plum-700 ring-1 ring-plum-200"
      >
        <Plus size={16} /> Add a service
      </button>
    </div>
  )
}
