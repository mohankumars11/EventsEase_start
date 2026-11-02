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
import { Check, Clock3, HandCoins, Loader2, MessageCircle, Radar, Scale, TriangleAlert } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { OCCASION } from '../data/occasions'
import { copyFor } from '../data/requirementCopy'
import { TAG } from '../data/visualCatalogue'
import { usePlan } from '../state/PlanContext'
import { myBookings, acceptQuote, nudgeRequests } from '../lib/bookings'
import { dayLabel, rupees } from '../lib/format'
import { ActionBar, BackHeader, Photo, Sheet } from '../ui/kit'
import { QuoteThread } from '../../components/vendor/MenuQuote'
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
  const [detail, setDetail] = useState(null)       // the reply being looked at
  const [asks, setAsks] = useState({})             // quote request id -> the caterer asked something
  const sent = plan.bookings.filter(b => b.occasionId === occasionId && (b.lineId || b.quoteRequestId))

  const load = useCallback(async () => {
    if (!user) return
    await nudgeRequests()
    try { setData(await myBookings(user.id)) } catch (e) { setMsg(e.message) }
    /* A caterer's question waiting on the customer (migration 200; quiet before it). */
    const ids = plan.bookings.filter(b => b.occasionId === occasionId && b.quoteRequestId).map(b => b.quoteRequestId)
    if (ids.length) supabase.from('sambramo_quote_messages').select('quote_request_id, sender_role, created_at').in('quote_request_id', ids).order('created_at')
      .then(({ data: m }) => { const last = {}; for (const r of m ?? []) last[r.quote_request_id] = r.sender_role; setAsks(Object.fromEntries(Object.entries(last).map(([k, v]) => [k, v === 'partner']))) }, () => {})
  }, [user, plan.bookings, occasionId])
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
    const reply = quote?.response?.partner_components?.menu ?? null
    const guests = Number(quote?.canonical_demand?.menu?.guests) || Number(plan.event.guests) || 0
    const plates = Math.max(guests, Number(reply?.minGuests) || 0)
    return { b, line, quote, price, state, reply, plates, perPlate: reply && price && plates ? Math.round(price / plates) : null, changed: (reply?.changes ?? []).length }
  })
  const byTrade = [...new Set(items.map(x => x.b.tradeId))].map(t => ({ t, items: items.filter(x => x.b.tradeId === t) }))
  /* The total: a confirmed or accepted price, else the lowest reply. */
  const priceOf = g => {
    const firm = g.items.find(x => ['accepted', 'confirmed'].includes(x.state) && x.price)
    if (firm) return firm.price
    /* Like with like: a reply that changed the menu counts only when no reply priced it as asked. */
    const asked = g.items.filter(x => x.state === 'replied' && x.price && !x.changed).map(x => x.price)
    const any = g.items.filter(x => x.state === 'replied' && x.price).map(x => x.price)
    return asked.length ? Math.min(...asked) : any.length ? Math.min(...any) : null
  }
  const priced = byTrade.map(priceOf)
  const total = priced.reduce((s, x) => s + (x ?? 0), 0)
  const answered = byTrade.filter((g, i) => priced[i] != null).length
  const toPay = items.some(x => x.state === 'accepted')

  async function accept(x, approved = false) {
    /* Changes to the customer's menu are approved explicitly, never by accident. */
    if (x.changed && !approved) { setDetail(x); return }
    setBusy(x.quote.response.id); setMsg('')
    try { await acceptQuote(x.quote.response.id, { approveChanges: approved }); setDetail(null); await load(); setMsg(`${x.b.name} accepted — pay to confirm.`) } catch (e) { setMsg(e.message) } finally { setBusy(null) }
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
                  <li key={x.b.lineId ?? x.b.quoteRequestId} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#F7F4FA] px-3.5 py-2.5 last:border-0" data-board-item={x.state}>
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-[12px] bg-[#F3EEF9]">{x.b.cover && <Photo src={x.b.cover} className="h-full w-full object-cover" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-extrabold">{x.b.name}</span>
                      <span className={'flex items-center gap-1 text-[11.5px] font-bold ' + (x.state === 'replied' || x.state === 'accepted' ? 'text-[#0B6B3D]' : x.state === 'confirmed' ? 'text-[#0B6B3D]' : 'text-[var(--ink-3)]')}>
                        {x.state === 'waiting' ? <><Clock3 size={12} />Awaiting quotation</>
                          : x.state === 'replied' ? <><HandCoins size={12} />{rupees(x.price)}{x.perPlate ? ` · ${rupees(x.perPlate)}/plate` : ''}</>
                            : x.state === 'accepted' ? <><Check size={12} />Accepted {rupees(x.price)} · pay to confirm</>
                              : x.state === 'confirmed' ? <><Check size={12} />Confirmed</> : 'Closed'}
                      </span>
                    </span>
                    {(x.state === 'replied' || (x.quote && asks[x.quote.id])) && <span className="flex basis-full flex-wrap items-center justify-end gap-1.5 pl-[52px]" data-board-actions>
                    {x.state === 'replied' && x.reply && (
                      <button type="button" onClick={() => setDetail(x)} className={'cx-press flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-extrabold ' + (x.changed ? 'bg-[#FFF3DC] text-[#8A5300]' : 'bg-[#E9F8EF] text-[#0B6B3D]')} data-menu-reply={x.changed ? 'changed' : 'as-asked'}>
                        {x.changed ? <><TriangleAlert size={12} />{x.changed} change{x.changed === 1 ? '' : 's'}</> : <><Check size={12} />As asked</>}
                      </button>
                    )}
                    {x.quote && asks[x.quote.id] && <button type="button" onClick={() => setDetail(x)} className="cx-press flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#F4EEFF] px-2.5 text-[11px] font-extrabold text-[#4C1D95]" data-question><MessageCircle size={12} />Question</button>}
                    {x.state === 'replied' && (
                      <span className="flex shrink-0 gap-1.5">
                        <Link to={`/negotiate/${x.b.serviceId}?t=${x.b.tradeId}&o=${o.id}`} className="cx-press flex h-8 items-center rounded-full bg-[#F4EEFF] px-2.5 text-[11.5px] font-extrabold text-[#4C1D95]" data-negotiate>Negotiate</Link>
                        <button type="button" disabled={!!busy} onClick={() => accept(x)} className="cx-press flex h-8 items-center gap-1 rounded-full bg-[#7C3AED] px-2.5 text-[11.5px] font-extrabold text-white" data-accept>
                          {busy === x.quote.response.id ? <Loader2 size={13} className="animate-spin" /> : null}Accept
                        </button>
                      </span>
                    )}
                    </span>}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <p className="mx-4 mt-4 flex items-start gap-2 text-[12px] font-semibold leading-snug text-[var(--ink-3)]"><Scale size={15} className="mt-px shrink-0" />Compare their replies, negotiate if you like — you pay only for the master you accept. Masters see your number only after you pay.</p>

      <ReplySheet x={detail} busy={busy} onClose={() => setDetail(null)} onAccept={x => accept(x, true)} />
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

/*
 * One caterer's reply to the customer's menu: the price per plate, what it
 * covers, how long it holds, and — highlighted — every dish they would
 * change. A changed menu is accepted only with "Approve changes & accept".
 * The customer can answer a question or ask for a revised quote here.
 */
function ReplySheet({ x, busy, onClose, onAccept }) {
  const r = x?.reply
  const lines = x?.quote?.response?.partner_components?.lines ?? []
  const covers = lines.map(l => String(l.description).replace(/^Food — .*/, 'Food')).filter(Boolean)
  const free = lines.filter(l => l.charged === false).map(l => l.description)
  const until = x?.quote?.response?.quote_valid_until
  const [text, setText] = useState('')
  const [sent, setSent] = useState('')
  async function askRevision() {
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('sambramo_quote_messages').insert({ quote_request_id: x.quote.id, sender_role: 'customer', sender_id: u?.user?.id, kind: 'revision_request', body: text.trim() })
    setSent(error ? (/check/i.test(error.message) ? 'Keep phone numbers and emails out — contacts are shared once you book.' : 'Revised quotes switch on with the next update.') : 'Sent — they can send a new price for the same request.')
    if (!error) setText('')
  }
  return (
    <Sheet open={!!x} onClose={onClose} title={x?.b.name ?? ''}
      footer={x?.state === 'replied' ? (
        <button type="button" disabled={!!busy} onClick={() => onAccept(x)} className="cx-press cx-cta flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-[14.5px] font-extrabold" data-approve-accept>
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}{x.changed ? 'Approve changes & accept' : 'Accept this quote'}
        </button>
      ) : null}>
      {x && (
        <div className="space-y-3 pb-2" data-reply-sheet>
          {x.price && (
            <div className="rounded-[16px] bg-[#FAF8FD] p-3">
              <p className="text-[24px] font-black">{rupees(x.price)}</p>
              <p className="text-[12px] font-bold text-[var(--ink-2)]">{x.perPlate ? `${rupees(x.perPlate)} a plate · ${x.plates} plates` : ''}{r?.minGuests ? ` · minimum ${r.minGuests}` : ''}</p>
              {until && <p className="text-[11.5px] font-semibold text-[var(--ink-3)]">Holds until {new Date(until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>}
            </div>
          )}
          {x.changed > 0 && (
            <div className="rounded-[16px] bg-[#FFF7E6] p-3" data-reply-changes>
              <p className="text-[13px] font-extrabold text-[#7A4B00]">They changed your menu</p>
              <ul className="mt-1 space-y-0.5 text-[12.5px] font-semibold text-[#5C3A00]">
                {r.changes.map((c, i) => <li key={i}>{c.action === 'swap' ? `${c.from_name} → ${c.to_name}` : c.action === 'remove' ? `Drops ${c.from_name}` : c.action === 'add' ? `Adds ${c.to_name}` : c.note}</li>)}
              </ul>
              <p className="mt-1.5 text-[11px] font-bold text-[#8A5300]">A different menu — not compared like-for-like with quotes for yours.</p>
            </div>
          )}
          {!x.changed && r && <p className="flex items-center gap-1.5 rounded-[14px] bg-[#E9F8EF] px-3 py-2 text-[12.5px] font-extrabold text-[#0B6B3D]"><Check size={14} />Your menu, exactly as you sent it</p>}
          {covers.length > 0 && <p className="text-[12.5px] font-semibold text-[var(--ink-2)]"><b>The price covers:</b> {covers.join(', ')}{free.length ? ` (${free.join(', ')} at no extra cost)` : ''}</p>}
          {x.quote?.response?.notes && <p className="text-[12.5px] font-semibold text-[var(--ink-2)]"><b>From the caterer:</b> {x.quote.response.notes}</p>}
          <Link to={`/p/${x.b.serviceId}`} className="block text-[12.5px] font-extrabold text-[var(--brand)]" data-view-partner>View their profile and work</Link>
          {x.quote && (
            <div className="rounded-[16px] bg-white p-3 shadow-[inset_0_0_0_1.5px_#ECE6F4]">
              <p className="text-[13px] font-extrabold">Questions</p>
              <QuoteThread requestId={x.quote.id} role="customer" />
            </div>
          )}
          {x.state === 'replied' && (
            <div className="rounded-[16px] bg-white p-3 shadow-[inset_0_0_0_1.5px_#ECE6F4]" data-revise>
              <p className="text-[13px] font-extrabold">Ask for a revised quote</p>
              <textarea rows={2} value={text} onChange={e => setText(e.target.value.slice(0, 500))} placeholder="e.g. Can you do it for 120 guests? Drop the live counter?" className="mt-1.5 w-full rounded-[12px] bg-[#FAF8FD] p-2.5 text-[13px] font-semibold outline-none" />
              <button type="button" disabled={!text.trim()} onClick={askRevision} className="mt-1.5 h-10 w-full rounded-[12px] bg-[#F4EEFF] text-[13px] font-extrabold text-[#4C1D95] disabled:opacity-50">Send to {x.b.name}</button>
              {sent && <p className="mt-1 text-[11.5px] font-bold text-[var(--ink-2)]">{sent}</p>}
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
