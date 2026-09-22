import { useState } from 'react'
import { X, FileDown, Loader2 } from 'lucide-react'
import ClaimPayment from '../ClaimPayment'
import JobMoneyRow from '../JobMoneyRow'
import { StateChip } from './Transactions'
import { STATE_LABEL, isRetryable, claimableAt } from '../../../lib/payoutState'
import { slipModel } from '../../../lib/documents/slipModel'
import { deliverDocument } from '../../../lib/documents/renderPdf'

/**
 * One job's whole money story, and the proof of it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE COMPONENT, TWO PLACEMENTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * A bottom sheet below `lg`, a panel in the right rail at `lg` and
 * above. Not two components: the contents are identical and the only
 * difference is the box around them, so a second file would be a second
 * place for a new row to be forgotten.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IT WILL NOT SAY
 * ══════════════════════════════════════════════════════════════════════
 *
 * No expected payout date. Nothing in this system can predict when a
 * transfer happens, because a person runs it by hand against the ledger
 * — there is no payout provider, and `escrow_ledger.adapter` has never
 * held anything but 'ManualPayout'. What IS derivable is when the money
 * unlocks, which comes from the same `event_date + 1 day` that
 * `claimable()` tests, so the screen and the database cannot disagree.
 *
 * A progress bar or "processing with your bank" would be an invention
 * about a third party that has not been asked to do anything yet.
 */

const fmt = iso => iso
  ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : null

function Body({ entry, claim, payout, partner, hasPan, annualGrossInr, adjustments = [], onClaimed, onClose }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(null)
  const { row, state } = entry
  const words = STATE_LABEL[state] ?? STATE_LABEL.held

  const download = async () => {
    setBusy(true); setFailed(null)
    try {
      await deliverDocument(slipModel(row, claim, {
        hasPan, annualGrossInr, partner, payout, adjustments, state: words.label,
      }))
    } catch (e) {
      /* Said out loud. A download button that does nothing is the exact
         failure the native branch in renderPdf exists for, and a silent
         catch here would hide the one case it cannot handle. */
      setFailed(e?.message ?? 'The slip could not be made.')
    } finally {
      setBusy(false)
    }
  }

  const unlocks = claimableAt(row)

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-extrabold leading-tight text-ink">
            {row.service_name ?? 'Job'}
          </h2>
          <p className="mt-0.5 truncate text-[11.5px] text-ink-mute">
            {[row.occasion_name, row.area_label, row.city].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        {onClose && (
          <button
            type="button" onClick={onClose} aria-label="Close"
            className="-mr-1 -mt-1 shrink-0 rounded-full p-2 text-ink-mute"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-[14px] bg-page-sunk px-3 py-2.5">
        <StateChip state={state} />
        <p className="text-[11.5px] leading-snug text-ink-soft">{words.note}</p>
      </div>

      {/* When the money unlocks — derived, never predicted. */}
      {state === 'held' && Number.isFinite(unlocks) && (
        <p className="text-[12px] leading-snug text-ink-mute">
          You can ask for this from{' '}
          <span className="font-extrabold text-ink">{fmt(new Date(unlocks).toISOString())}</span>,
          once the event is done.
        </p>
      )}

      {/* The four-part split, from the component the Jobs tab already
          uses, so one job reads the same on both screens. */}
      <JobMoneyRow job={row} where="" hasPan={hasPan} annualGrossInr={annualGrossInr} />

      {state === 'ready' && (
        <ClaimPayment
          lineId={row.line_id} onClaimed={onClaimed}
          hasPan={hasPan} annualGrossInr={annualGrossInr}
        />
      )}

      {isRetryable(state) && (
        <div className="rounded-[16px] bg-saffron-400/10 p-3.5 ring-1 ring-saffron-300/50">
          <p className="text-[12.5px] font-extrabold text-saffron-800">
            The transfer did not go through
          </p>
          {claim?.failure_reason && (
            <p className="mt-1 text-[12px] leading-snug text-saffron-800/90">
              {claim.failure_reason}
            </p>
          )}
          <p className="mt-1.5 text-[11.5px] leading-snug text-ink-soft">
            Nothing was lost. Check your account details are right, then ask again.
          </p>
          <ClaimPayment
            lineId={row.line_id} onClaimed={onClaimed}
            hasPan={hasPan} annualGrossInr={annualGrossInr}
          />
        </div>
      )}

      {/* Reconciliation: what a partner needs to match this against a
          bank statement. Only rendered when the backend actually has it
          — an empty "Reference: —" teaches nothing. */}
      {(claim?.reference || claim?.settled_at || claim?.requested_at || claim?.destination) && (
        <dl className="rounded-[16px] bg-white p-3.5 text-[12px] ring-1 ring-ink/[0.06]">
          {claim.destination && <Row k="Paid into" v={claim.destination} />}
          {claim.requested_at && <Row k="You asked" v={fmt(claim.requested_at)} />}
          {claim.settled_at && <Row k="Payout date" v={fmt(claim.settled_at)} />}
          {claim.reference && <Row k="Reference" v={claim.reference} mono />}
        </dl>
      )}

      <button
        type="button" onClick={download} disabled={busy}
        className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-full bg-plum-600 px-4 text-[13px] font-extrabold text-white disabled:opacity-60"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
        {busy ? 'Making your slip…' : 'Download payment slip'}
      </button>
      {failed && (
        <p className="text-center text-[11.5px] text-saffron-800">{failed}</p>
      )}
    </div>
  )
}

function Row({ k, v, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="shrink-0 text-ink-mute">{k}</dt>
      <dd className={`min-w-0 truncate text-right font-extrabold text-ink ${mono ? 'font-mono text-[11px]' : ''}`}>
        {v}
      </dd>
    </div>
  )
}

export default function TransactionDetail(props) {
  const { entry, onClose } = props
  if (!entry) return null

  return (
    <>
      {/* Phone: a sheet over the screen. `lg:hidden` rather than a media
          query in JS, so there is no resize listener and no flash. */}
      <div className="fixed inset-0 z-40 flex items-end lg:hidden">
        <button
          type="button" aria-label="Close" onClick={onClose}
          className="absolute inset-0 bg-ink/40"
        />
        <div className="relative max-h-[85dvh] w-full overflow-y-auto rounded-t-[24px] bg-white p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
          <Body {...props} />
        </div>
      </div>

      {/* Desktop: it replaces the rail's contents. */}
      <div className="hidden rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06] lg:block">
        <Body {...props} />
      </div>
    </>
  )
}
