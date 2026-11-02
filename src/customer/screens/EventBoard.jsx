/**
 * The event board — live tracking of every master asked (Mohan, 2026-11-02:
 * "make it live tracking of the masters; once they accept you keep getting
 * the actual price running upon the total; compare and negotiate").
 *
 * Every request this event sent (plan.bookings, written by LiveMatch) is
 * read back from the database as it changes:
 *   a request to one master (197)   waiting → accepted at their price → paid
 *   a price request (compare mode)  waiting → replied with a price
 *                                   → Accept (books it) or Negotiate
 * The total counts only prices masters actually gave — an accepted
 * booking, or the lowest reply so far for a service still being compared.
 * Nothing here is an estimate. Supabase realtime + a quiet 15-second
 * re-read keep it live (the same channels Booked uses).
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Check, Clock3, HandCoins, Loader2, Radar, Scale } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { OCCASION } from '../data/occasions'
import { copyFor } from '../data/requirementCopy'
import { TAG } from '../data/visualCatalogue'
import { usePlan } from '../state/PlanContext'
import { myBookings, acceptQuote, nudgeRequests } from '../lib/bookings'
import { dayLabel, rupees } from '../lib/format'
import { ActionBar, BackHeader, Photo } from '../ui/kit'
import EventJourney from '../ui/EventJourney'

export default function EventBoard() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState('')
  const sent = plan.bookings.filter(b => b.occasionId === occasionId && (b.lineId || b.quoteRequestId))

  const load = useCallback(async () => {
    if (!user) return
    await nudgeRequests()
    try { setData(await myBookings(user.id)) } catch (e) { setMsg(e.message) }
  }, [user])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`cx-board-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_lines' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sambramo_quote_requests', filter: `customer_id=eq.${user.id}` }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sambramo_quote_responses' }, () => load())
      .subscribe()
    const tick = setInterval(() => document.visibilityState === 'visible' && load(), 15000)
    return () => { supabase.removeChannel(ch); clearInterval(tick) }
  }, [load, user])

  if (!o) return <Navigate to="/" replace />

  /* Each sent request, with what the database says about it now. */
  const items = sent.map(b => {
    const line = b.lineId ? data?.lines.find(l => l.id === b.lineId) : null
    const quote = b.quoteRequestId ? data?.quotes.find(q => q.id === b.quoteRequestId) : null
    const price = line && ['accepted', 'paid', 'in_progress'].includes(line.status) ? line.listPaise : quote?.response?.customer_amount_paise ?? null
    const state = line ? ({ dispatching: 'waiting', accepted: 'accepted', paid: 'confirmed', in_progress: 'confirmed' }[line.status] ?? line.status)
      : quote ? (quote.response ? 'replied' : ['VENDOR_QUOTE', 'QUOTE_ACTION_REQUIRED'].includes(quote.state) ? 'waiting' : 'closed') : 'waiting'
    return { b, line, quote, price, state }
  })
  const byTrade = [...new Set(items.map(x => x.b.tradeId))].map(t => ({ t, items: items.filter(x => x.b.tradeId === t) }))
  /* The total: a confirmed or accepted price, else the lowest reply. */
  const priceOf = g => {
    const firm = g.items.find(x => ['accepted', 'confirmed'].includes(x.state) && x.price)
    if (firm) return firm.price
    const replies = g.items.filter(x => x.state === 'replied' && x.price).map(x => x.price)
    return replies.length ? Math.min(...replies) : null
  }
  const priced = byTrade.map(priceOf)
  const total = priced.reduce((s, x) => s + (x ?? 0), 0)
  const answered = byTrade.filter((g, i) => priced[i] != null).length
  const toPay = items.some(x => x.state === 'accepted')

  async function accept(x) {
    setBusy(x.quote.response.id); setMsg('')
    try { await acceptQuote(x.quote.response.id); await load(); setMsg(`${x.b.name} accepted — pay to confirm.`) } catch (e) { setMsg(e.message) } finally { setBusy(null) }
  }

  return (
    <main className="cx-enter min-h-[100dvh] bg-white pb-[calc(env(safe-area-inset-bottom,0px)+120px)]" data-event-board>
      <BackHeader title={o.name} sub={dayLabel(plan.event.date)} />
      <EventJourney at={3} occasionId={o.id} />

      <section className="mx-4 mt-4 rounded-[24px] bg-gradient-to-br from-[#1C1033] to-[#3B1670] p-4 text-white" data-board-total>
        <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-white/70"><span className="cx-live-dot h-2 w-2 rounded-full bg-[#4ADE80]" />Live · {answered} of {byTrade.length} priced</p>
        <p className="cx-num mt-1 text-[32px] font-black leading-none tracking-[-0.03em]" data-running-total>{total ? rupees(total) : '—'}</p>
        <p className="mt-1 text-[12.5px] font-semibold text-white/75">{total ? 'So far — only prices masters have given you' : 'Prices appear here as masters reply'}</p>
      </section>

      {msg && <p className="mx-4 mt-3 rounded-[14px] bg-[#F4EEFF] px-3 py-2.5 text-[12.5px] font-bold text-[#3B1670]">{msg}</p>}
      {!sent.length && <p className="mx-4 mt-4 rounded-[18px] bg-[#FAF8FD] p-4 text-[13px] font-semibold text-[var(--ink-2)]">Nothing sent yet. <Link to={`/o/${o.id}/plan`} className="font-extrabold text-[var(--brand)]">Back to your plan</Link></p>}

      <div className="mt-4 space-y-3 px-4" data-board>
        {byTrade.map((g, gi) => {
          const many = g.items.length > 1
          return (
            <section key={g.t} className="overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_1px_#ECE6F4]" data-board-service={g.t}>
              <div className="flex items-center justify-between gap-2 border-b border-[#F3EFF8] px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-extrabold">{copyFor(o, g.t).title}</span>
                  <span className="block text-[11px] font-bold text-[var(--ink-3)]">{TAG[g.t] ?? ''}{many ? ` · comparing ${g.items.length} masters` : ' · one master'}</span>
                </span>
                <span className="shrink-0 text-right text-[15px] font-black">{priced[gi] ? rupees(priced[gi]) : <span className="text-[12px] font-bold text-[var(--ink-3)]">Waiting</span>}</span>
              </div>
              <ul>
                {g.items.map(x => (
                  <li key={x.b.lineId ?? x.b.quoteRequestId} className="flex items-center gap-3 border-b border-[#F7F4FA] px-3.5 py-2.5 last:border-0" data-board-item={x.state}>
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-[12px] bg-[#F3EEF9]">{x.b.cover && <Photo src={x.b.cover} className="h-full w-full object-cover" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-extrabold">{x.b.name}</span>
                      <span className={'flex items-center gap-1 text-[11.5px] font-bold ' + (x.state === 'replied' || x.state === 'accepted' ? 'text-[#0B6B3D]' : x.state === 'confirmed' ? 'text-[#0B6B3D]' : 'text-[var(--ink-3)]')}>
                        {x.state === 'waiting' ? <><Clock3 size={12} />Waiting for their price</>
                          : x.state === 'replied' ? <><HandCoins size={12} />Replied {rupees(x.price)}</>
                            : x.state === 'accepted' ? <><Check size={12} />Accepted {rupees(x.price)} · pay to confirm</>
                              : x.state === 'confirmed' ? <><Check size={12} />Confirmed</> : 'Closed'}
                      </span>
                    </span>
                    {x.state === 'replied' && (
                      <span className="flex shrink-0 gap-1.5">
                        <Link to={`/negotiate/${x.b.serviceId}?t=${x.b.tradeId}&o=${o.id}`} className="cx-press flex h-8 items-center rounded-full bg-[#F4EEFF] px-2.5 text-[11.5px] font-extrabold text-[#4C1D95]" data-negotiate>Negotiate</Link>
                        <button type="button" disabled={!!busy} onClick={() => accept(x)} className="cx-press flex h-8 items-center gap-1 rounded-full bg-[#7C3AED] px-2.5 text-[11.5px] font-extrabold text-white" data-accept>
                          {busy === x.quote.response.id ? <Loader2 size={13} className="animate-spin" /> : null}Accept
                        </button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <p className="mx-4 mt-4 flex items-start gap-2 text-[12px] font-semibold leading-snug text-[var(--ink-3)]"><Scale size={15} className="mt-px shrink-0" />Compare their replies, negotiate if you like — you pay only for the master you accept. Masters see your number only after you pay.</p>

      <ActionBar>
        {toPay ? (
          <button type="button" onClick={() => navigate('/plans')} className="cx-press cx-cta flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] text-[16px] font-extrabold" data-board-pay>Pay to confirm</button>
        ) : (
          <div className="flex h-[56px] items-center justify-center gap-2.5 rounded-[18px] bg-[#F4F0FA] text-[14.5px] font-extrabold text-[#3B1670]" data-board-waiting>
            {data ? <Radar size={18} /> : <Loader2 size={18} className="animate-spin" />}{answered ? `${answered} of ${byTrade.length} services priced` : 'Waiting for masters to reply'}
          </div>
        )}
      </ActionBar>
    </main>
  )
}
