/**
 * Plans → Booked: what is real in the database right now.
 *
 * Every booking line with its state and the one action it needs (pay to
 * confirm), and every quote request with the partner's reply (accept →
 * pay). Refreshes when the app returns to the foreground, which is when
 * a customer comes back from a notification.
 */
import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock3, HandCoins, Loader2, RefreshCw, XCircle, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { payLines } from '../../lib/payLines'
import { myBookings, acceptQuote, confirmPaid, LINE_STATE } from '../lib/bookings'
import { dayLabel, plural, rupees } from '../lib/format'
import SignInSheet from './SignInSheet'

const TONE = {
  ok: 'bg-[var(--ok-tint)] text-[var(--ok)]', act: 'bg-[#FFF4DA] text-[#7A4B00]', wait: 'bg-[var(--am-100)] text-[var(--am-ink)]',
  done: 'bg-[#F1EFF6] text-[var(--ink-2)]', off: 'bg-[#FFF1F2] text-[#9B1A2A]',
}

export default function Booked() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState('')
  const [signIn, setSignIn] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try { setData(await myBookings(user.id)) } catch (e) { setData({ lines: [], quotes: [], error: e.message }) }
  }, [user])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const v = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', v)
    return () => document.removeEventListener('visibilitychange', v)
  }, [load])

  async function pay(lineIds, label) {
    setBusy(lineIds[0]); setMsg('')
    const r = await payLines({ lineIds, part: 'advance', description: label })
    const c = await confirmPaid(r)
    setBusy(null)
    setMsg(r.ok ? (c?.ok ? 'Paid and confirmed — your partner has been told.' : 'Payment received — confirming with Razorpay.') : r.dismissed ? '' : r.error ?? 'Payment did not go through.')
    setTimeout(load, 1200)
  }
  async function accept(q) {
    setBusy(q.response.id); setMsg('')
    try {
      const a = await acceptQuote(q.response.id)
      await load()
      if (a.lineId) await pay([a.lineId], q.service_name)
    } catch (e) { setMsg(e.message) } finally { setBusy(null) }
  }

  if (!user) {
    return (
      <div className="mx-4 rounded-[20px] bg-[var(--am-50)] px-4 py-4 ring-1 ring-[var(--am-200)]">
        <p className="text-[13.5px] font-semibold leading-relaxed text-[var(--ink-2)]">Sign in to see every booking you confirm, with live status from each partner.</p>
        <button type="button" onClick={() => setSignIn(true)} className="cx-press cx-btn mt-3 rounded-full px-4 py-2 text-[13px] font-extrabold">Sign in</button>
        <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={() => setSignIn(false)} why="to see your bookings" />
      </div>
    )
  }
  if (!data) return <div className="grid place-items-center py-8"><Loader2 className="animate-spin text-[var(--brand)]" /></div>

  const due = data.lines.filter(l => l.status === 'accepted')
  const live = data.lines.filter(l => l.status !== 'accepted')
  const waiting = data.quotes.filter(q => ['VENDOR_QUOTE', 'QUOTE_ACTION_REQUIRED'].includes(q.state))
  const closed = data.quotes.filter(q => !['VENDOR_QUOTE', 'QUOTE_ACTION_REQUIRED'].includes(q.state))
  const empty = !data.lines.length && !data.quotes.length

  return (
    <div className="space-y-3 px-4" data-booked>
      {msg && <p className="rounded-[14px] bg-[var(--am-100)] px-3 py-2.5 text-[12.5px] font-bold text-[var(--am-ink)]">{msg}</p>}
      {data.error && <p className="rounded-[14px] bg-[#FFF1F2] px-3 py-2.5 text-[12.5px] font-bold text-[#9B1A2A]">{data.error}</p>}
      {empty && <p className="rounded-[20px] bg-[var(--am-50)] px-4 py-4 text-[13px] font-semibold leading-relaxed text-[var(--ink-2)] ring-1 ring-[var(--am-200)]">Nothing booked yet. Bookings and offers you send appear here, live.</p>}

      {due.length > 0 && (
        <div className="rounded-[22px] bg-[#FFF8E6] p-3.5 ring-1 ring-[#F6DFA2]">
          <p className="flex items-center gap-1.5 text-[13.5px] font-extrabold text-[#7A4B00]"><Zap size={15} className="fill-[var(--gold)] text-[var(--gold)]" />{plural(due.length, 'partner')} holding your date</p>
          <p className="mt-0.5 text-[12px] font-semibold text-[#8A6420]">Pay to confirm. One payment covers them all.</p>
          <button type="button" disabled={!!busy} onClick={() => pay(due.map(l => l.id), `Sambramo · ${plural(due.length, 'partner')}`)}
            className="cx-press cx-cta mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-[14px] font-extrabold" data-pay-due>
            {busy && due.some(l => l.id === busy) ? <Loader2 size={16} className="animate-spin" /> : null}Pay {rupees(due.reduce((s, l) => s + l.advancePaise, 0))} to confirm
          </button>
        </div>
      )}

      {[...due, ...live].map(l => {
        const st = LINE_STATE[l.status] ?? { label: l.status, tone: 'wait' }
        return (
          <article key={l.id} className="cx-card flex items-center gap-3 p-3.5" data-booking={l.status}>
            <span className={'grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ' + TONE[st.tone]}>
              {st.tone === 'off' ? <XCircle size={19} /> : st.tone === 'act' ? <Zap size={19} /> : st.tone === 'wait' ? <Clock3 size={19} /> : <CheckCircle2 size={19} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-extrabold tracking-[-0.015em]">{l.service_name}</p>
              <p className="truncate text-[12px] font-bold text-[var(--ink-3)]">{l.trade}{l.request.date ? ` · ${dayLabel(l.request.date)}` : ''}{l.request.area ? ` · ${l.request.area}` : ''}</p>
              <span className={'mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold ' + TONE[st.tone]}>{st.label}</span>
            </div>
            <span className="cx-num shrink-0 text-[14px] font-extrabold">{rupees(l.quoted_amount_paise)}</span>
          </article>
        )
      })}

      {waiting.map(q => (
        <article key={q.id} className="cx-card p-3.5" data-quote={q.response ? 'replied' : 'waiting'}>
          <div className="flex items-center gap-3">
            <span className={'grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ' + (q.response ? TONE.act : TONE.wait)}>{q.offerPaise ? <HandCoins size={19} /> : <Clock3 size={19} />}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-extrabold tracking-[-0.015em]">{q.service_name}</p>
              <p className="truncate text-[12px] font-bold text-[var(--ink-3)]">
                {q.offerPaise ? `Your offer ${rupees(q.offerPaise)}` : 'Quote requested'}{q.event_date ? ` · ${dayLabel(q.event_date)}` : ''}
              </p>
            </div>
            {q.response && <span className="cx-num shrink-0 text-[15px] font-extrabold">{rupees(q.response.customer_amount_paise)}</span>}
          </div>
          {q.response ? (
            <>
              {q.response.notes && <p className="mt-2 rounded-[12px] bg-[var(--am-50)] px-3 py-2 text-[12.5px] font-semibold text-[var(--ink-2)]">“{q.response.notes}”</p>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <span className="flex items-center text-[12px] font-bold text-[var(--ink-3)]">{q.response.quote_valid_until ? `Valid until ${new Date(q.response.quote_valid_until).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : 'Their quote'}</span>
                <button type="button" disabled={!!busy} onClick={() => accept(q)} className="cx-press cx-cta flex h-11 items-center justify-center gap-1.5 rounded-[14px] text-[13.5px] font-extrabold" data-accept>
                  {busy === q.response.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}Accept & pay
                </button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-[12px] font-bold text-[var(--ink-3)]">
              Waiting for the partner{q.expires_at ? ` · replies by ${new Date(q.expires_at).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })}` : ''}
            </p>
          )}
        </article>
      ))}

      {closed.slice(0, 6).map(q => (
        <article key={q.id} className="flex items-center gap-3 rounded-[18px] bg-[#FAF9FC] p-3 ring-1 ring-[var(--line)]">
          <XCircle size={17} className="text-[var(--ink-3)]" />
          <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-[var(--ink-2)]">{q.service_name} · {q.state === 'UNAVAILABLE' ? 'Partner declined' : q.state === 'EXPIRED' ? 'No reply in time' : q.state.toLowerCase().replace(/_/g, ' ')}</p>
        </article>
      ))}

      {!empty && <button type="button" onClick={load} className="cx-press mx-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-extrabold text-[var(--brand)]"><RefreshCw size={14} />Refresh</button>}
    </div>
  )
}
