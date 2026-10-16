/**
 * Ask for money, or send the bill and the photographs.
 *
 * Two modes in one sheet because they are two halves of the same
 * errand and a partner thinks of them together: "I need ₹18,000 to
 * order the flowers" and "here is what I bought with it".
 *
 * ── Why photographs are required, not optional ─────────────────────
 * A bill proves somebody was charged. A photograph proves the goods
 * exist and are where the partner says they are. Reviewing an invoice
 * alone is reviewing a PDF, and a PDF is easy to produce. The CHECK on
 * the table requires a bill; this screen requires at least one photo
 * before it will submit, because the reviewer has to be able to see
 * what arrived.
 */
import { useRef, useState } from 'react'
import { Loader2, Upload, X, Receipt, Camera } from 'lucide-react'
import { Sheet, TextField, Segmented } from '../../vendor/anchor/ui'
import { useToast, friendlyError } from '../../../context/ToastContext'
import { requestAdvance, submitEvidence } from '../../../lib/materialsAdvance'

const toPaise = rupees => Math.round((Number(String(rupees).replace(/[^\d.]/g, '')) || 0) * 100)

function FilePick({ label, icon: Icon, accept, multiple, files, onPick, onDrop }) {
  const ref = useRef(null)
  return (
    <div>
      <p className="mb-1.5 text-[11.5px] font-extrabold text-ink/55">{label}</p>
      <button type="button" onClick={() => ref.current?.click()}
        className="flex w-full items-center gap-2.5 rounded-2xl bg-[#f7f6fb] px-4 py-3.5 text-left ring-1 ring-ink/[0.06]">
        <Icon size={17} className="shrink-0 text-plum-600" />
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-ink/70">
          {files.length ? `${files.length} file${files.length > 1 ? 's' : ''} chosen` : 'Choose a file'}
        </span>
        <Upload size={15} className="shrink-0 text-ink/40" />
      </button>
      <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden"
        onChange={e => { onPick([...e.target.files]); e.target.value = '' }} />
      {!!files.length && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-[12px] font-semibold text-ink/60">
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onDrop(i)}
                className="shrink-0 text-ink/40"><X size={13} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function AdvanceSheet({ mode, lineId, vendorId, onClose, onDone }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  const [bill, setBill] = useState([])
  const [goods, setGoods] = useState([])
  const [billAmount, setBillAmount] = useState('')
  const [supplier, setSupplier] = useState('')
  const [where, setWhere] = useState('with_partner')

  const close = () => { if (!busy) onClose() }

  const submitRequest = async () => {
    const paise = toPaise(amount)
    if (paise <= 0) return toast.error('How much do you need?')
    if (reason.trim().length < 4) return toast.error('Say what it is for')
    setBusy(true)
    try {
      await requestAdvance({ lineId, paise, reason: reason.trim() })
      toast.success('Sent. We will come back to you shortly.')
      setAmount(''); setReason('')
      onDone()
    } catch (e) { toast.error(friendlyError(e)) } finally { setBusy(false) }
  }

  const submitBill = async () => {
    if (!bill.length) return toast.error('Attach the supplier bill')
    if (!goods.length) return toast.error('Add at least one photo of what arrived')
    const paise = toPaise(billAmount)
    if (paise <= 0) return toast.error('What does the bill come to?')
    if (supplier.trim().length < 2) return toast.error('Who did you buy from?')
    setBusy(true)
    try {
      await submitEvidence({
        lineId, vendorId,
        billFile: bill[0], billAmountPaise: paise,
        supplierName: supplier, goodsFiles: goods, goodsLocation: where,
      })
      toast.success('Sent for review')
      setBill([]); setGoods([]); setBillAmount(''); setSupplier('')
      onDone()
    } catch (e) { toast.error(friendlyError(e)) } finally { setBusy(false) }
  }

  const isRequest = mode === 'request'
  const action = isRequest ? submitRequest : submitBill

  return (
    <Sheet open={!!mode} onOpenChange={o => { if (!o) close() }}
      title={isRequest ? 'Ask us to fund the order' : 'Send your bill'}
      footer={
        <button type="button" onClick={action} disabled={busy}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15px] font-extrabold text-white disabled:opacity-60">
          {busy && <Loader2 size={17} className="animate-spin" />}
          {isRequest ? 'Send request' : 'Send for review'}
        </button>
      }>
      {isRequest ? (
        <>
          <p className="mb-3 text-[12.5px] font-semibold leading-snug text-ink/60">
            If you have to place the order before the event and cannot fund it yourself, tell us how
            much you need. We will confirm before any money moves.
          </p>
          <p className="mb-1 text-[11.5px] font-extrabold text-ink/55">How much do you need?</p>
          <TextField prefix="₹" inputMode="numeric" value={amount} onChange={setAmount} />
          <div className="mt-4">
            <p className="mb-1 text-[11.5px] font-extrabold text-ink/55">What is it for?</p>
            <TextField value={reason} onChange={setReason} max={160}
              placeholder="e.g. advance to the flower mandi, order closes Tuesday" />
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-[12.5px] font-semibold leading-snug text-ink/60">
            Send the supplier's bill and photographs of what arrived. We check both, then pay you.
          </p>
          <FilePick label="Supplier bill" icon={Receipt} accept="image/*,application/pdf"
            files={bill} onPick={f => setBill(f.slice(0, 1))} onDrop={() => setBill([])} />
          <div className="mt-4">
            <FilePick label="Photos of the goods" icon={Camera} accept="image/*" multiple
              files={goods} onPick={f => setGoods([...goods, ...f].slice(0, 6))}
              onDrop={i => setGoods(goods.filter((_, k) => k !== i))} />
          </div>
          <div className="mt-4">
            <p className="mb-1 text-[11.5px] font-extrabold text-ink/55">Bill total</p>
            <TextField prefix="₹" inputMode="numeric" value={billAmount} onChange={setBillAmount} />
          </div>
          <div className="mt-4">
            <p className="mb-1 text-[11.5px] font-extrabold text-ink/55">Who did you buy from?</p>
            <TextField value={supplier} onChange={setSupplier} max={80}
              placeholder="Shop or supplier name" />
          </div>
          <div className="mt-4">
            <p className="mb-1.5 text-[11.5px] font-extrabold text-ink/55">Where are the goods now?</p>
            <Segmented id="goods-where" value={where} onChange={setWhere} options={[
              { value: 'with_partner', label: 'With me' },
              { value: 'at_venue', label: 'At the venue' },
            ]} />
          </div>
        </>
      )}
    </Sheet>
  )
}
