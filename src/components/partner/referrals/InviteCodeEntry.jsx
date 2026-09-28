import { useState } from 'react'
import { Loader2, Ticket } from 'lucide-react'
import { claimCode } from '../../../lib/referrals'
import { usePendingPartnerReferral } from '../../../hooks/usePendingPartnerReferral'
import { useFieldCheck, FieldMessage } from '../FieldCheck'

/**
 * "Somebody invited me" — applied from the link, or typed in.
 *
 * A code that came with the link is claimed without asking. Otherwise a
 * quiet, folded field: most partners were not invited, and an open input
 * on the first screen of setup reads as a step they have to complete.
 *
 * Neutral in both directions. The referrer's business name is shown on
 * success because the partner already knows who invited them; a refusal
 * is the server's one sentence, never the reason.
 */
export default function InviteCodeEntry({ vendorId }) {
  const fromLink = usePendingPartnerReferral(vendorId)
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState(null)
  const [tried, setTried] = useState(false)
  const codeCheck = useFieldCheck('invite_code', code, { showAll: tried })

  const shown = answer ?? fromLink
  if (!vendorId) return null

  if (shown?.ok) {
    return (
      <p role="status" className="mt-4 rounded-2xl bg-plum-50 px-4 py-3 text-[13px] font-semibold text-plum-900">
        Invitation applied{shown.referrer ? ` from ${shown.referrer}` : ''}.
      </p>
    )
  }

  async function submit(e) {
    e.preventDefault()
    if (busy || !code.trim()) return
    /* Said here, before a round trip: the server would only answer with
       its one uniform refusal, which cannot say "that is a zero, not an O". */
    if (codeCheck.isError) { setTried(true); return }
    setBusy(true)
    setAnswer(await claimCode(code))
    setBusy(false)
  }

  return (
    <div className="mt-4">
      {shown && !shown.ok && (
        <p role="alert" className="mb-2 text-[12.5px] font-semibold text-rose-700">{shown.says}</p>
      )}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-bold text-plum-700">
          <Ticket size={15} /> Have an invitation code?
        </button>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <input {...codeCheck.inputProps} value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            aria-label="Invitation code" placeholder="Invitation code"
            autoCapitalize="characters" autoComplete="off"
            className={"min-h-[44px] min-w-0 flex-1 rounded-xl border border-ink/15 px-3 font-mono text-[15px] font-bold tracking-[0.12em] text-ink outline-none focus:border-plum-500" + codeCheck.ring} />
          <button type="submit" disabled={busy || !code.trim()}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-plum-600 px-4 text-[13px] font-extrabold text-white disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : null} Apply
          </button>
        </form>
      )}
      {open && <FieldMessage check={codeCheck} />}
    </div>
  )
}
