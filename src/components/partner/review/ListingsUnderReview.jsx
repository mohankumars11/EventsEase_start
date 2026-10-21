import { useEffect, useState } from 'react'
import { BadgeCheck, Clock3, FileSearch, TriangleAlert } from 'lucide-react'
import { fetchListings } from '../../../lib/partnerListings'

/**
 * Every listing, with its OWN clock.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE ACCOUNT'S TIMESTAMP WAS THE WRONG ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * "See the listing being reviewed" went to the services list, which is
 * organised around what a partner sells rather than what is being
 * decided. And the only clock anywhere came from the ACCOUNT —
 * vendors.submitted_at — so a partner with five listings submitted over
 * three weeks saw one countdown, started by whichever one they sent
 * first. The four later ones looked overdue the moment they were sent.
 *
 * partner_listings already carries submitted_at and reviewed_at per
 * row. This screen reads them, so each listing shows when IT was sent
 * and how long IT has been waiting. Nothing new is stored.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ORDER IS DELIBERATE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Longest-waiting first. A partner opening this screen is asking "what
 * is taking so long", and the answer is at the top rather than wherever
 * the alphabet happened to put it.
 */

const DAY = 86_400_000

function waited(from, to = Date.now()) {
  if (!from) return null
  const ms = to - new Date(from).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  const h = Math.floor(ms / 3_600_000)
  if (h >= 48) return `${Math.floor(h / 24)} days`
  if (h >= 24) return 'a day'
  if (h >= 1) return `${h} hour${h === 1 ? '' : 's'}`
  const m = Math.max(1, Math.floor(ms / 60_000))
  return `${m} minute${m === 1 ? '' : 's'}`
}

const sentOn = iso => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

/* The container row's status, falling back to what its offerings say —
   the same precedence fetchListings already uses. */
const stateOf = l => {
  const s = l.status ?? l.derived
  if (s === 'live' || s === 'approved') return 'live'
  if (s === 'rejected' || s === 'changes_requested') return 'changes'
  if (s === 'draft') return 'draft'
  return 'review'
}

const TONE = {
  live: { ring: 'ring-forest-200', bg: 'bg-forest-50', text: 'text-forest-800', label: 'Live', Icon: BadgeCheck },
  review: { ring: 'ring-amber-200', bg: 'bg-amber-50', text: 'text-amber-900', label: 'Being read', Icon: Clock3 },
  changes: { ring: 'ring-rose-200', bg: 'bg-rose-50', text: 'text-rose-800', label: 'Needs a change', Icon: TriangleAlert },
  draft: { ring: 'ring-ink/10', bg: 'bg-ink/[0.04]', text: 'text-ink/60', label: 'Not sent yet', Icon: FileSearch },
}

export default function ListingsUnderReview({ vendorId, onOpenTrade }) {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let alive = true
    if (!vendorId) { setRows([]); return }
    fetchListings(vendorId).then(r => { if (alive) setRows(r ?? []) }).catch(() => { if (alive) setRows([]) })
    return () => { alive = false }
  }, [vendorId])

  if (rows === null) {
    return <p className="rounded-2xl bg-ink/[0.02] p-4 text-[13px] text-ink/50">Loading your listings…</p>
  }
  if (!rows.length) {
    return <p className="rounded-2xl bg-ink/[0.02] p-4 text-[13px] text-ink/50">You have not listed a service yet.</p>
  }

  /* Longest wait first; anything already decided sinks below. */
  const sorted = [...rows].sort((a, b) => {
    const pending = x => (stateOf(x) === 'review' ? 0 : 1)
    if (pending(a) !== pending(b)) return pending(a) - pending(b)
    const at = a.submitted_at ? new Date(a.submitted_at).getTime() : Infinity
    const bt = b.submitted_at ? new Date(b.submitted_at).getTime() : Infinity
    return at - bt
  })

  const inReview = sorted.filter(l => stateOf(l) === 'review').length

  return (
    <div className="space-y-3">
      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <p className="text-[14px] font-extrabold text-ink">
          {inReview ? `${inReview} listing${inReview === 1 ? '' : 's'} being read` : 'Nothing is waiting on us'}
        </p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">
          Each one has its own clock, starting when you sent that listing — not when you
          joined. A person reads every listing; none of them is forgotten.
        </p>
      </div>

      {sorted.map(l => {
        const st = stateOf(l)
        const tone = TONE[st]
        const { Icon } = tone
        const since = waited(l.submitted_at)
        const decided = l.reviewed_at ? sentOn(l.reviewed_at) : null
        const slow = st === 'review' && l.submitted_at
          && Date.now() - new Date(l.submitted_at).getTime() > DAY
        return (
          <button key={l.trade} type="button"
            onClick={() => onOpenTrade?.(l.trade_id ?? l.trade)}
            className="block w-full rounded-[20px] bg-white p-4 text-left ring-1 ring-ink/[0.06]">
            <div className="flex items-start gap-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone.bg} ${tone.text}`}>
                <Icon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-extrabold text-ink">{l.trade}</p>
                <p className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold ${tone.bg} ${tone.text} ring-1 ${tone.ring}`}>
                  {tone.label}
                </p>
                {/* "Waiting" is only true while it still is. A decided
                    listing showing "waiting 8 days" reads as though
                    nothing has happened, which is the opposite of what
                    the row is saying one line below. */}
                <p className="mt-1.5 text-[12px] leading-snug text-ink/55">
                  {l.submitted_at
                    ? <>Sent {sentOn(l.submitted_at)}{st === 'review' && since ? ` · waiting ${since}` : ''}</>
                    : 'Not submitted yet — finish it and send it when you are ready.'}
                </p>
                {decided && <p className="text-[12px] text-ink/45">Decided {decided}</p>}
                {slow && (
                  <p className="mt-1 text-[11.5px] font-bold text-amber-800">
                    Past the usual day. It is read by a person and it has not been forgotten.
                  </p>
                )}
                {l.review_note && (
                  <p className="mt-1.5 rounded-xl bg-rose-50 px-2.5 py-1.5 text-[12px] font-semibold text-rose-900">
                    {l.review_note}
                  </p>
                )}
                <p className="mt-1.5 text-[11.5px] text-ink/40">
                  {(l.offerings?.length ?? 0)} item{(l.offerings?.length ?? 0) === 1 ? '' : 's'} in this listing
                </p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
