/**
 * The materials advance, on the job it belongs to.
 *
 * ── The sentence matters more than the list ────────────────────────
 * A partner who reads "approved" goes and spends money. So each state
 * says exactly one true thing, and the two that cost real money say so
 * in as many words:
 *
 *   eligible, nothing started  -> you can claim materials on this job
 *   requested                  -> we are looking at your request
 *   advance_approved           -> MONEY IS WITH YOU; buy, and keep the bill
 *   under_review               -> we are checking your bill
 *   paid                       -> what you were paid, and what was recovered
 *   rejected                   -> why, in words, and what to do next
 *
 * It never implies money has moved before it has, and it never says
 * "verified" about a document a human merely accepted.
 *
 * ── What it does not do ────────────────────────────────────────────
 * It does not compute quantities. The earlier design rolled a Bill of
 * Materials against the guest count; that needed a recipe authored for
 * 26 trades and none exists. The bill the partner actually paid is a
 * better number than any recipe, and it arrives with evidence attached.
 */
import { useCallback, useEffect, useState } from 'react'
import { Package, Check, AlertCircle, Clock, Receipt, Wallet, Info } from 'lucide-react'
import { fetchLineAdvance, signedUrlsFor } from '../../../lib/materialsAdvance'
import { rupees } from '../../../lib/tierPackages'
import AdvanceSheet from './AdvanceSheet'

export function Banner({ tone, icon: Icon, title, body }) {
  const look = {
    neutral: 'bg-ink/[0.03] text-ink ring-ink/10',
    wait: 'bg-saffron-50 text-saffron-900 ring-saffron-200',
    good: 'bg-forest-50 text-forest-800 ring-forest-200',
    bad: 'bg-chilli-50 text-chilli-800 ring-chilli-200',
  }[tone] ?? 'bg-ink/[0.03] text-ink ring-ink/10'
  return (
    <div className={`rounded-[18px] px-4 py-3 ring-1 ${look}`}>
      <p className="flex items-center gap-1.5 text-[13px] font-extrabold">
        {Icon && <Icon size={14} />}{title}
      </p>
      {body && <p className="mt-1 text-[12px] font-semibold leading-snug opacity-85">{body}</p>}
    </div>
  )
}

export default function MaterialsCard({ lineId, vendorId }) {
  const [data, setData] = useState(undefined)
  const [sheet, setSheet] = useState(null)      // 'request' | 'evidence'
  const [photoUrls, setPhotoUrls] = useState({})

  const read = useCallback(async () => {
    try { setData(await fetchLineAdvance(lineId)) } catch { setData(null) }
  }, [lineId])

  useEffect(() => { read() }, [read])

  useEffect(() => {
    const paths = (data?.advance?.goods_photos ?? []).map(p => p.path)
    if (paths.length) signedUrlsFor(paths).then(setPhotoUrls)
  }, [data])

  if (data === undefined) return null
  /* Not eligible, or the feature is not switched on: no card at all. A
     DJ should never see a materials card, and an empty one is worse
     than none. */
  if (!data || !data.eligible) return null

  const a = data.advance
  const status = a?.status ?? 'none'
  const confirmed = ['paid', 'in_progress'].includes(data.line_status)

  let banner
  switch (status) {
    case 'requested':
      banner = <Banner tone="wait" icon={Clock} title="We are looking at your request"
        body={`You asked for ${rupees(a.requested_paise)}. Do not buy anything until we confirm.`} />
      break
    case 'advance_approved':
      banner = <Banner tone="good" icon={Wallet} title={`${rupees(a.advance_paise)} is with you`}
        body="Place the order. Keep the bill and photograph what arrives — you will need both." />
      break
    case 'under_review':
      banner = <Banner tone="wait" icon={Clock} title="We are checking your bill"
        body={`${rupees(a.bill_amount_paise)} from ${a.supplier_name}. We will confirm shortly.`} />
      break
    case 'paid': {
      const advanced = Number(a.advance_paise) || 0
      const approved = Number(a.approved_paise) || 0
      const owed = approved - advanced
      banner = <Banner tone="good" icon={Check} title={`Materials settled: ${rupees(approved)}`}
        body={owed > 0
          ? `${rupees(owed)} has been added to your earnings.`
          : owed < 0
            ? `${rupees(-owed)} of the advance was unspent and has been taken back.`
            : 'This matched the advance exactly, so nothing further is owed.'} />
      break
    }
    case 'rejected':
      banner = <Banner tone="bad" icon={AlertCircle} title="Sent back"
        body={a.review_note ?? 'Something was not right with the evidence.'} />
      break
    default:
      banner = <Banner tone="neutral" icon={Package} title="Materials for this job"
        body={confirmed
          ? 'Buy what you need and send us the bill, or ask us to fund the order first.'
          : 'This opens once the customer has paid for the booking.'} />
  }

  const canRequest = confirmed && (status === 'none' || status === 'rejected')
  const canSendBill = confirmed && ['none', 'advance_approved', 'rejected'].includes(status)

  return (
    <section data-materials-card className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <p className="mb-3 flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-ink/45">
        <Package size={13} /> Materials
      </p>

      {banner}

      {a?.bill_path && (
        <div className="mt-3 flex items-center gap-2.5 rounded-[16px] bg-ink/[0.02] px-3.5 py-2.5 ring-1 ring-ink/[0.05]">
          <Receipt size={15} className="shrink-0 text-ink/50" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-ink">{a.supplier_name}</p>
            <p className="text-[11.5px] text-ink/50">{rupees(a.bill_amount_paise)} · bill attached</p>
          </div>
        </div>
      )}

      {!!(a?.goods_photos ?? []).length && (
        <>
          <p className="mt-3 text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-ink/45">
            What arrived
          </p>
          <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
            {a.goods_photos.map(p => (
              <img key={p.path} src={photoUrls[p.path]} alt=""
                className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-ink/10" />
            ))}
          </div>
        </>
      )}

      {a?.goods_location && (
        <p className="mt-2.5 flex items-center gap-1.5 text-[12px] font-semibold text-ink/55">
          <Info size={13} />
          {a.goods_location === 'at_venue' ? 'Goods are at the venue' : 'Goods are with you'}
        </p>
      )}

      {(canRequest || canSendBill) && (
        <div className="mt-4 space-y-2">
          {canSendBill && (
            <button type="button" onClick={() => setSheet('evidence')}
              className="flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15px] font-extrabold text-white">
              <Receipt size={16} /> Send a bill
            </button>
          )}
          {canRequest && (
            <button type="button" onClick={() => setSheet('request')}
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-full text-[14px] font-extrabold text-plum-700 ring-2 ring-plum-200">
              <Wallet size={15} /> Ask us to fund the order
            </button>
          )}
        </div>
      )}

      <AdvanceSheet
        mode={sheet}
        lineId={lineId}
        vendorId={vendorId}
        onClose={() => setSheet(null)}
        onDone={() => { setSheet(null); read() }}
      />
    </section>
  )
}
