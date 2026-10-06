import { useEffect, useRef, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { fetchMessages, sendMessage } from '../../lib/partnerInbox'

/**
 * A way to tell somebody at Sambramo that the gate is locked.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THIS DOES NOT REACH THE CUSTOMER, AND SAYS SO
 * ══════════════════════════════════════════════════════════════════════
 *
 * Migrations 068 and 073 scrub phone numbers and email addresses out of
 * everything a partner can see, and `partner_offer_feed` leaves out
 * `customer_id` and `address_text` on purpose. A free-text channel
 * between partner and customer would walk around all of that on its
 * first day.
 *
 * What a partner actually needs is to reach a person here — the guest
 * count looks wrong, the venue has no parking, they are running late.
 * That is a thread with an operator, and the header says so plainly,
 * because a partner who believes they have messaged the customer and has
 * not is worse off than one with no thread at all.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NO RESPONSE TIME IS PROMISED
 * ══════════════════════════════════════════════════════════════════════
 *
 * There is no staffed support rota to promise one against. The screen
 * says a person reads it; it does not say when.
 */
export default function PartnerMessages({ vendorId, initialRows }) {
  const [rows, setRows] = useState(initialRows ?? [])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const endRef = useRef(null)

  useEffect(() => { setRows(initialRows ?? []) }, [initialRows])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [rows.length])

  async function send() {
    const body = text.trim()
    if (!body || busy) return
    setBusy(true); setError(null)
    const res = await sendMessage(vendorId, body)
    setBusy(false)
    if (!res.ok) { setError(res.error ?? 'It did not send. Try again.'); return }
    setText('')
    /* Appended from what the database returned, not from what was
       typed: `created_at` and `sender` are stamped server-side by the
       trigger, and echoing the local guess would put a row on screen
       that differs from the one everybody else sees. */
    setRows(r => [...r, res.row])
  }

  return (
    <div className="space-y-3">
      <p className="rounded-[14px] bg-plum-50 px-3.5 py-2.5 text-[12px] leading-snug text-plum-900 ring-1 ring-plum-200">
        This goes to the Sambramo team, not to the customer. A person reads
        every one — mention the job if it is about a particular booking.
      </p>

      {rows.length > 0 && (
        <ul className="max-h-[340px] space-y-2 overflow-y-auto">
          {rows.map(m => {
            const mine = m.sender === 'partner'
            return (
              <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-[16px] px-3 py-2 ${
                  mine
                    ? 'bg-plum-950 text-white'
                    : 'bg-white text-ink ring-1 ring-ink/[0.08]'
                }`}>
                  <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed">{m.body}</p>
                  <p className={`mt-1 text-[10px] font-semibold ${mine ? 'text-white/55' : 'text-ink-mute'}`}>
                    {mine ? 'You' : 'Sambramo'} · {new Date(m.created_at).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
                    })}
                  </p>
                </div>
              </li>
            )
          })}
          <li ref={endRef} />
        </ul>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          maxLength={4000}
          placeholder="What has happened?"
          className="min-w-0 flex-1 resize-none rounded-[16px] bg-white px-3.5 py-2.5 text-[13px] leading-snug text-ink ring-1 ring-ink/[0.12] placeholder:text-ink-mute focus:outline-none focus:ring-2 focus:ring-plum-400"
        />
        <button
          type="button"
          onClick={send}
          disabled={!text.trim() || busy}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-plum-700 text-white disabled:opacity-40"
        >
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
        </button>
      </div>

      {error && (
        <p className="text-[12px] font-semibold text-rose-700">{error}</p>
      )}
    </div>
  )
}
