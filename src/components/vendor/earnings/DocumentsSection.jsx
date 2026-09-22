import { useState } from 'react'
import { FileDown, FileText, Loader2 } from 'lucide-react'
import { statementModel } from '../../../lib/documents/slipModel'
import { deliverDocument } from '../../../lib/documents/renderPdf'

/**
 * The documents a partner can actually be given.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IS NOT HERE, AND WHY
 * ══════════════════════════════════════════════════════════════════════
 *
 * The reference design offers four downloads: Statement, Invoice,
 * Payment slip, Tax report. Two of those cannot be honestly produced.
 *
 *   Invoice        A GST tax invoice requires the partner's GSTIN, a
 *                  statutorily continuous invoice number and a place of
 *                  supply. This project stores a PAN and no GSTIN,
 *                  numbers nothing continuously, and records no place of
 *                  supply. A button labelled "Invoice" producing a
 *                  document that is not one is worse than no button: a
 *                  partner may hand it to an accountant.
 *
 *   Tax report     TCS and TDS are computed in the app and deposited by
 *                  Sambramo, but nothing in this system holds a filed
 *                  challan, a TDS certificate or a Form 16A. The
 *                  statement below states the amounts deposited, which
 *                  is the true and useful part; a "Tax document" implying
 *                  a filing receipt would be a fabrication.
 *
 * A payment slip is per job and lives on that job's detail, because that
 * is where a partner is when they want proof of one payment.
 *
 * These come back when there is something real behind them.
 */
export default function DocumentsSection({ statement, fy, partner }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(null)

  const download = async () => {
    setBusy(true); setFailed(null)
    try {
      await deliverDocument(statementModel(statement, { partner, fy }))
    } catch (e) {
      setFailed(e?.message ?? 'The statement could not be made.')
    } finally {
      setBusy(false)
    }
  }

  const empty = !statement || statement.jobs === 0

  return (
    <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <h2 className="text-[13.5px] font-extrabold text-ink">Documents</h2>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">
        A payment slip for a single job is on that job — open it from the
        list above.
      </p>

      <div className="mt-3 flex items-center gap-3 rounded-[16px] bg-page-sunk p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-plum-700 ring-1 ring-ink/[0.06]">
          <FileText size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-extrabold text-ink">
            Payment statement
          </span>
          <span className="block text-[11.5px] text-ink-mute">
            {fy?.label ?? 'This financial year'}
            {statement ? ` · ${statement.jobs} ${statement.jobs === 1 ? 'booking' : 'bookings'}` : ''}
          </span>
        </span>
        <button
          type="button" onClick={download} disabled={busy || empty}
          className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full bg-plum-600 px-3.5 text-[12.5px] font-extrabold text-white disabled:opacity-40"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
          PDF
        </button>
      </div>

      {empty && (
        <p className="mt-2 text-[11.5px] text-ink-mute">
          There is nothing in this financial year to put on a statement yet.
        </p>
      )}
      {failed && <p className="mt-2 text-[11.5px] text-saffron-800">{failed}</p>}

      <p className="mt-2.5 text-[11px] leading-snug text-ink-mute">
        This is a payment statement, not a tax invoice. TCS and TDS shown
        on it are deposited with the authorities on your behalf.
      </p>
    </section>
  )
}
