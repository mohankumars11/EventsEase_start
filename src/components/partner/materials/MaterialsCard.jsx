/**
 * The materials this booking needs bought for it.
 *
 * ── Where the money actually is, said plainly ──────────────────────
 * The hardest thing for this screen to get right is not the list, it is
 * the sentence above it. A partner reading "advance confirmed" will go
 * and spend their own money. So every state here says exactly one of:
 *
 *   nothing to buy                      -> no card at all
 *   it is already in your price         -> list, and "no extra charge"
 *   we are asking the customer          -> "customer approval required"
 *   the customer paid                   -> "material budget approved: X"
 *   a person is looking at it           -> why, in words, and what next
 *
 * It never says the partner has been paid. Their SERVICE earnings are a
 * different number on a different screen, released after the event on
 * the existing path, and nothing here moves them.
 *
 * ── The quantities are a suggestion ────────────────────────────────
 * They come from a BOM rolled against the booking's guest count. A
 * partner who knows the venue will disagree, so they can change any of
 * them -- with a reason, because a silent change is indistinguishable
 * from a mistake, and the server refuses one without it.
 */
import { useCallback, useEffect, useState } from 'react'
import { Package, Check, AlertCircle, Clock, Loader2, Pencil, Send, Info } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { rupees } from '../../../lib/tierPackages'
import { Sheet, TextField } from '../../vendor/anchor/ui'
import { useToast, friendlyError } from '../../../context/ToastContext'

/* Reason codes the engine can return, in the partner's language. Only
   the ones a partner can act on or needs to understand are spelled out;
   anything else falls back to a neutral "a person is checking this". */
const REASON_COPY = {
  no_procurement_policy: 'We have not switched materials on for this trade yet.',
  trade_never_procures: 'This trade does not buy materials for a booking.',
  declared_included_in_listing: 'Your listing says your price already covers materials.',
  catalogue_items_declare_included: 'The items booked already include their materials.',
  menu_includes_materials: 'This menu already includes its materials.',
  cost_basis_covers_materials: 'Your cost-plus price already covers these materials.',
  mixed_inclusion_declarations: 'Some items say materials are included and some do not.',
  inclusion_not_declared: 'Your listing does not say whether materials are included.',
  no_bom_for_selection: 'We do not have a materials list for what was booked.',
  material_cost_unknown: 'One of these materials has no current price.',
  bom_rolls_to_zero: 'Nothing needs buying for this booking.',
  incremental_not_enabled_for_trade: 'Materials are not yet chargeable for this trade.',
  estimate_above_auto_cap: 'This is above the amount we can quote automatically.',
  too_late_to_procure: 'There is not enough time before the event to order materials.',
  partner_has_not_accepted_materials_terms: 'Accept the materials terms to use this.',
  no_payment_path_for_materials: 'There is no way to pay for these materials yet.',
  custom_quote_lane: 'This was a custom quote, so a person prices its materials.',
  already_funded: 'The materials for this booking are already paid for.',
}

const BLOCKER_COPY = {
  supplier_payment_rail_unavailable: 'Supplier payments are not switched on yet.',
  no_listed_supplier_in_area: 'No listed supplier covers this area.',
  partner_has_no_payout_account: 'Add your bank details so we can pay you back.',
  partner_route_not_activated: 'Your payout account is still being activated.',
}

function Banner({ tone, icon: Icon, title, body }) {
  const look = {
    neutral: 'bg-ink/[0.03] text-ink ring-ink/10',
    wait: 'bg-saffron-50 text-saffron-900 ring-saffron-200',
    good: 'bg-forest-50 text-forest-800 ring-forest-200',
  }[tone]
  return (
    <div className={`rounded-[18px] px-4 py-3 ring-1 ${look}`}>
      <p className="flex items-center gap-1.5 text-[13px] font-extrabold">
        {Icon && <Icon size={14} />}{title}
      </p>
      {body && <p className="mt-1 text-[12px] font-semibold leading-snug opacity-80">{body}</p>}
    </div>
  )
}

export default function MaterialsCard({ lineId }) {
  const [data, setData] = useState(undefined)   // undefined = loading, null = nothing to show
  const [editing, setEditing] = useState(null)
  const [qty, setQty] = useState('')
  const [why, setWhy] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const read = useCallback(async () => {
    const { data: d, error } = await supabase.rpc('my_line_materials', { p_line_id: lineId })
    /* Until 20261012_09 is pasted the function does not exist. That is
       not an error state to shout about -- it is a feature that is not
       switched on, and the card simply does not render. */
    if (error?.code === 'PGRST202') return setData(null)
    setData(d ?? null)
  }, [lineId])

  useEffect(() => { read() }, [read])

  if (data === undefined) return null
  if (!data) return null
  if (data.decision === 'NO_MATERIALS') return null

  const items = data.items ?? []
  const reasons = data.reasons ?? []
  const blockers = data.method_blockers ?? []
  const quote = data.quote
  const reviewed = !!data.partner_reviewed_at

  const saveQty = async () => {
    const n = Number(qty)
    if (!Number.isFinite(n) || n < 0) return toast.error('Enter a quantity')
    if (n !== Number(editing.qty_suggested) && why.trim().length < 4) {
      return toast.error('Say why it is different — a few words is enough')
    }
    setBusy(true)
    const { error } = await supabase.rpc('submit_material_review', {
      p_requirement_id: data.requirement_id,
      p_items: [{ id: editing.id, qty_partner: n, reason: why.trim() || null }],
      p_note: null,
    })
    setBusy(false)
    if (error) return toast.error(friendlyError(error))
    setEditing(null); setWhy(''); read()
  }

  /* Confirm without changing anything: an empty items array still
     stamps partner_reviewed_at, which is the gate on sending. */
  const confirmList = async () => {
    setBusy(true)
    const { error } = await supabase.rpc('submit_material_review', {
      p_requirement_id: data.requirement_id, p_items: [], p_note: null,
    })
    setBusy(false)
    if (error) return toast.error(friendlyError(error))
    read()
  }

  const send = async () => {
    setBusy(true)
    const { error } = await supabase.rpc('send_procurement_quote', {
      p_requirement_id: data.requirement_id,
    })
    setBusy(false)
    if (error) return toast.error(friendlyError(error))
    toast.success('Sent to the customer for approval')
    read()
  }

  /* ── The sentence at the top ─────────────────────────────────── */
  let banner = null
  if (data.decision === 'MATERIALS_INCLUDED_IN_PRICE') {
    banner = <Banner tone="good" icon={Check} title="Included in your price"
      body="Buy these for the event. There is no extra charge to the customer." />
  } else if (data.decision === 'MANUAL_REVIEW') {
    const said = reasons.map(r => REASON_COPY[r]).filter(Boolean)[0]
      ?? 'A person at Sambramo is checking this one.'
    banner = <Banner tone="wait" icon={Info} title="We are checking this"
      body={[said, ...blockers.map(b => BLOCKER_COPY[b]).filter(Boolean)].join(' ')} />
  } else if (quote?.status === 'funded' || quote?.status === 'settled') {
    banner = <Banner tone="good" icon={Check}
      title={`Material budget approved: ${rupees(data.funded_paise)}`}
      body="Buy these for the event and keep every bill. Your service payout is released after the event, as usual." />
  } else if (quote?.status === 'approved') {
    banner = <Banner tone="wait" icon={Clock} title="Customer approved — payment processing"
      body="We will tell you the moment the money is through. Do not buy anything yet." />
  } else if (quote?.status === 'sent') {
    banner = <Banner tone="wait" icon={Clock} title="Customer approval required"
      body={`Sent for ${rupees(quote.total_paise)}. Do not buy anything until it is approved and paid.`} />
  } else if (quote?.status === 'declined') {
    banner = <Banner tone="wait" icon={AlertCircle} title="Customer declined this list"
      body="Adjust the quantities and send it again." />
  } else {
    banner = <Banner tone="neutral" icon={Package} title="Material list ready to review"
      body="Check the quantities against the venue, then send it to the customer." />
  }

  const quoteOpen = ['sent', 'approved', 'funded', 'settled'].includes(quote?.status)
  const canSend = data.decision === 'MATERIALS_INCREMENTAL' && reviewed && !quoteOpen
  /* A partner who agrees with every quantity still has to be able to
     say so. Without this, partner_reviewed_at was only ever set by
     EDITING something, so agreeing with the list left the Send button
     hidden for ever -- the list was unsendable precisely when it was
     already right. */
  const canConfirm = data.decision === 'MATERIALS_INCREMENTAL' && !reviewed && !quoteOpen

  return (
    <section data-materials-card className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <p className="mb-3 flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-ink/45">
        <Package size={13} /> Materials for this booking
      </p>

      {banner}

      {items.length > 0 && (
        <ul className="mt-3 divide-y divide-ink/[0.05]">
          {items.map(i => {
            const q = i.qty_final ?? i.qty_partner ?? i.qty_suggested
            const changed = i.qty_partner != null && Number(i.qty_partner) !== Number(i.qty_suggested)
            return (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-bold text-ink">{i.name}</p>
                  <p className="text-[11.5px] text-ink/50">
                    {Number(q)} {i.unit}
                    {changed && <span className="ml-1 font-bold text-plum-600">· you changed this</span>}
                    {i.reusable && <span className="ml-1">· from your own stock</span>}
                  </p>
                </div>
                {data.decision === 'MATERIALS_INCREMENTAL' && !quote && (
                  <button type="button" aria-label={`Change ${i.name}`}
                    onClick={() => { setEditing(i); setQty(String(q)); setWhy(i.qty_change_reason ?? '') }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.04] text-ink/60">
                    <Pencil size={14} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {canConfirm && (
        <>
          <p className="mt-3 text-[12px] font-semibold text-ink/55">
            Change any line that is wrong for this venue. When it looks right, confirm it.
          </p>
          <button type="button" onClick={confirmList} disabled={busy}
            className="mt-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-extrabold text-plum-700 ring-2 ring-plum-200 disabled:opacity-60">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Check size={16} />}
            These quantities look right
          </button>
        </>
      )}

      {canSend && (
        <button type="button" onClick={send} disabled={busy}
          className="mt-4 flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15px] font-extrabold text-white disabled:opacity-60">
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} />}
          Send to customer for approval
        </button>
      )}

      <Sheet open={!!editing} onOpenChange={o => { if (!o) setEditing(null) }}
        title={editing ? `How much ${editing.name}?` : ''}
        footer={
          <button type="button" onClick={saveQty} disabled={busy}
            className="h-[52px] w-full rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15px] font-extrabold text-white disabled:opacity-60">
            Save
          </button>
        }>
        {editing && (
          <>
            <p className="mb-2 text-[12.5px] font-semibold text-ink/60">
              We suggested {Number(editing.qty_suggested)} {editing.unit} from the guest count.
            </p>
            <p className="mb-1 text-[11.5px] font-extrabold text-ink/55">Quantity in {editing.unit}</p>
            <TextField inputMode="decimal" value={qty} onChange={setQty} />
            <div className="mt-4">
              <p className="mb-1 text-[11.5px] font-extrabold text-ink/55">Why is it different?</p>
              <TextField value={why} onChange={setWhy} max={120} placeholder="e.g. the venue provides tables" />
            </div>
          </>
        )}
      </Sheet>
    </section>
  )
}
