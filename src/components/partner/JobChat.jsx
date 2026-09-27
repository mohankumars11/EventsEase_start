import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, Loader2, MessageSquare, Lock } from 'lucide-react'
import { fetchThread, send, markRead, canWrite, subscribe } from '../../lib/lineChat'

/**
 * Talking to the customer, about this job.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT OPENS WHEN THE MONEY IS IN
 * ══════════════════════════════════════════════════════════════════════
 *
 * Before payment there is no relationship to discuss, and a partner who
 * could message everybody they were merely OFFERED could canvass the
 * whole city off one dispatch. Migration 151's INSERT policy is what
 * actually stops that; this screen only decides what to draw.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE QUICK LINES ARE THE WHOLE POINT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Nobody types on a phone in a van. The three things a partner needs to
 * say on the way are the same three every time — I have set off, I am
 * running late, I am outside — so they are buttons. They FILL the box
 * rather than sending on their own: a tap that fires a message the
 * partner has not read is how the wrong thing reaches a customer.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NOTHING HERE IS A PAYMENT CHANNEL
 * ══════════════════════════════════════════════════════════════════════
 *
 * The thread closes a week after the event and the panel says so before
 * it does. A conversation that stays open for ever becomes the place the
 * next booking is arranged directly, and the customer loses every
 * protection the platform exists to give them.
 */

/* Written out rather than generated: each has to be readable by
   somebody who is worried and is not going to read it twice. */
const QUICK = [
  ['On my way', 'I have set off and am on my way now.'],
  ['Running late', 'I am running about 15 minutes behind. Sorry — I will keep you posted.'],
  ['I am outside', 'I am outside. Could you tell me which gate to come to?'],
  ['All set', 'Everything is set up and ready. Thank you.'],
]

export default function JobChat({
  lineId, open = true, onClose,
  initialRows = null, initialCanWrite = null,
}) {
  const [rows, setRows] = useState(initialRows ?? [])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [writable, setWritable] = useState(initialCanWrite ?? false)
  const [unavailable, setUnavailable] = useState(false)
  const endRef = useRef(null)

  const load = useCallback(async () => {
    if (initialRows) return
    const res = await fetchThread(lineId)
    setRows(res.rows)
    setUnavailable(res.unavailable)
    if (!res.unavailable) markRead(lineId, 'partner').catch(() => {})
  }, [lineId, initialRows])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (initialCanWrite !== null) return
    canWrite(lineId).then(setWritable).catch(() => setWritable(false))
  }, [lineId, initialCanWrite])

  /* Live, not polled. A chat that polls while a partner is driving
     costs them data all day for the two minutes it is used. */
  useEffect(() => {
    if (initialRows) return undefined
    return subscribe(lineId, row => {
      setRows(prev => (prev.some(r => r.id === row.id) ? prev : [...prev, row]))
      if (row.sender !== 'partner') markRead(lineId, 'partner').catch(() => {})
    })
  }, [lineId, initialRows])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [rows.length])

  async function submit(e) {
    e?.preventDefault?.()
    const body = text.trim()
    if (!body || busy) return
    setBusy(true); setError(null)
    const res = await send(lineId, body)
    setBusy(false)
    if (!res.ok) { setError(res.says); return }
    setText('')
    setRows(prev => (prev.some(r => r.id === res.row.id) ? prev : [...prev, res.row]))
  }

  if (unavailable || !open) return null

  return (
    <section className="rounded-[20px] bg-white p-3.5 ring-1 ring-ink/[0.06]">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] font-extrabold text-ink">
          <MessageSquare size={15} className="text-plum-700" />
          Message the customer
        </p>
        {onClose && (
          <button type="button" onClick={onClose}
                  className="text-[12px] font-extrabold text-ink-mute">
            Done
          </button>
        )}
      </div>

      <div className="max-h-[260px] space-y-1.5 overflow-y-auto">
        {rows.length === 0 && (
          <p className="rounded-[14px] bg-ink/[0.03] px-3 py-4 text-center text-[12px] leading-snug text-ink-mute">
            Nothing yet. A line before you set off saves a phone call.
          </p>
        )}

        {rows.map(row => {
          const mine = row.sender === 'partner'
          return (
            <div key={row.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                data-sender={row.sender}
                className={`max-w-[82%] rounded-[16px] px-3 py-2 ${
                  mine ? 'bg-plum-700 text-white' : 'bg-ink/[0.05] text-ink'}`}
              >
                <p className="text-[12.5px] leading-snug">{row.body}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? 'text-white/70' : 'text-ink-mute'}`}>
                  {new Date(row.created_at).toLocaleTimeString('en-IN',
                    { hour: 'numeric', minute: '2-digit' })}
                  {mine && row.read_at ? ' · Read' : ''}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {writable ? (
        <>
          {/* Filled into the box, never sent on tap. */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {QUICK.map(([label, body]) => (
              <button
                key={label} type="button" onClick={() => setText(body)}
                className="rounded-full bg-plum-700 px-2.5 py-1 text-[11.5px] font-extrabold text-white"
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-2 flex items-end gap-2">
            <textarea
              rows={1} value={text} maxLength={2000}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e) }
              }}
              placeholder="Write a message…"
              className="min-h-[44px] w-full resize-none rounded-[14px] border-0 bg-ink/[0.04] px-3 py-2.5 text-[13px] text-ink ring-1 ring-ink/[0.08] placeholder:text-ink-mute focus:ring-2 focus:ring-plum-500"
            />
            <button
              type="submit" disabled={busy || !text.trim()} aria-label="Send"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-plum-700 text-white disabled:opacity-40"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </>
      ) : (
        <p className="mt-2.5 flex items-start gap-2 rounded-[14px] bg-ink/[0.03] px-3 py-2.5 text-[11.5px] leading-snug text-ink-soft">
          <Lock size={13} className="mt-0.5 shrink-0" />
          <span>
            This conversation opens once the booking is paid for, and closes a week
            after the event. You can still read it here afterwards, and Sambramo can
            always help.
          </span>
        </p>
      )}

      {error && (
        <p className="mt-2 text-[11.5px] font-bold leading-snug text-rose-700">{error}</p>
      )}
    </section>
  )
}
