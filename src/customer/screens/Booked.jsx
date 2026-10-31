/**
 * Plans → Booked: what is real in the database right now.
 *
 * Every booking line with its state and the one action it needs (pay to
 * confirm), and every quote request with the partner's reply (accept →
 * pay). Refreshes when the app returns to the foreground, which is when
 * a customer comes back from a notification.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, CalendarDays, CheckCircle2, ChevronRight, Clock3, FileText, HandCoins, Heart, Loader2, MapPin, RefreshCw, RotateCcw, Settings2, XCircle, Zap } from 'lucide-react'
import { TRADE, TRADES } from '../data/trades'
import { serviceArt } from '../data/art'
import { ArtFill } from '../ui/art'
import { useAuth } from '../../context/AuthContext'
import { payLines } from '../../lib/payLines'
import { supabase } from '../../lib/supabase'
import { myBookings, acceptQuote, confirmPaid, LINE_STATE, requestQueue, nudgeRequests, pendingVoucher, clearVoucher } from '../lib/bookings'
import { dayLabel, plural, rupees } from '../lib/format'
import SignInSheet from './SignInSheet'
import { Sheet } from '../ui/kit'
import { CANCELLATION_LADDER } from '../../config/policies'
import { BRAND } from '../../config/sambramo'

const TONE = {
  ok: 'bg-[var(--ok-tint)] text-[var(--ok)]', act: 'bg-[#FFF4DA] text-[#7A4B00]', wait: 'bg-[var(--am-100)] text-[var(--am-ink)]',
  done: 'bg-[#F1EFF6] text-[var(--ink-2)]', off: 'bg-[#FFF1F2] text-[#9B1A2A]',
}

/* Which statuses each tab shows. */
export const TABS = [['all', 'All'], ['upcoming', 'Upcoming'], ['completed', 'Completed'], ['cancelled', 'Cancelled']]
const IN_TAB = {
  all: () => true,
  upcoming: s => ['dispatching', 'accepted', 'paid', 'in_progress'].includes(s),
  completed: s => ['delivered', 'settled'].includes(s),
  cancelled: s => ['cancelled', 'expired'].includes(s),
}
const REBOOKABLE = new Set(['paid', 'in_progress', 'delivered', 'settled'])

export default function Booked({ tab = 'all' }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState('')
  const [signIn, setSignIn] = useState(false)
  const [cancelFor, setCancelFor] = useState(null)

  const load = useCallback(async () => {
    if (!user) return
    await nudgeRequests() // a lapsed request moves to the next master now, not at the minute's sweep
    try { setData(await myBookings(user.id)) } catch (e) { setData({ lines: [], quotes: [], error: e.message }) }
  }, [user])
  useEffect(() => { load() }, [load])
  /* Live: Supabase realtime on the three tables a reply or a payment
     touches (RLS decides which events reach this customer), plus a quiet
     15-second re-read while the screen is visible, for any table that is
     not in the realtime publication. And a re-read on return from a
     notification. */
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`cx-booked-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_lines' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sambramo_quote_requests', filter: `customer_id=eq.${user.id}` }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sambramo_quote_responses' }, () => load())
      .subscribe()
    const tick = setInterval(() => document.visibilityState === 'visible' && load(), 15000)
    const v = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', v)
    return () => { supabase.removeChannel(ch); clearInterval(tick); document.removeEventListener('visibilitychange', v) }
  }, [load, user])

  async function pay(lineIds, label) {
    setBusy(lineIds[0]); setMsg('')
    /* The offer chosen at checkout comes with the payment that follows the
       accept; the server re-checks it, and if it no longer applies the
       customer pays without it rather than being stuck. */
    const vid = pendingVoucher()
    let r = await payLines({ lineIds, part: 'advance', description: label, voucherId: vid })
    if (!r.ok && r.code === 'voucher') { clearVoucher(); r = await payLines({ lineIds, part: 'advance', description: label }) }
    if (r.ok && vid) clearVoucher()
    const c = await confirmPaid(r)
    setBusy(null)
    setMsg(r.ok ? (c?.ok ? 'Paid and confirmed — your master has been told.' : 'Payment received — confirming with Razorpay.') : r.dismissed ? '' : r.error ?? 'Payment did not go through.')
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

  const shown = data.lines.filter(l => IN_TAB[tab](l.status))
  const due = shown.filter(l => l.status === 'accepted')
  const live = shown.filter(l => l.status !== 'accepted')
  const waiting = tab === 'all' || tab === 'upcoming' ? data.quotes.filter(q => ['VENDOR_QUOTE', 'QUOTE_ACTION_REQUIRED'].includes(q.state)) : []
  const closed = tab === 'all' || tab === 'cancelled' ? data.quotes.filter(q => !['VENDOR_QUOTE', 'QUOTE_ACTION_REQUIRED'].includes(q.state)) : []
  const empty = !shown.length && !waiting.length && !closed.length
  const again = tab === 'cancelled' ? null : data.lines.find(l => REBOOKABLE.has(l.status))

  return (
    <div className="space-y-3 px-4" data-booked>
      {msg && <p className="rounded-[14px] bg-[var(--am-100)] px-3 py-2.5 text-[12.5px] font-bold text-[var(--am-ink)]">{msg}</p>}
      {data.error && <p className="rounded-[14px] bg-[#FFF1F2] px-3 py-2.5 text-[12.5px] font-bold text-[#9B1A2A]">{data.error}</p>}
      {empty && <p className="rounded-[20px] bg-[var(--am-50)] px-4 py-4 text-[13px] font-semibold leading-relaxed text-[var(--ink-2)] ring-1 ring-[var(--am-200)]">{tab === 'all' ? 'Nothing booked yet. Bookings and offers you send appear here, live.' : `No ${tab} bookings.`}</p>}

      {due.length > 0 && (
        <div className="rounded-[22px] bg-[#FFF8E6] p-3.5 ring-1 ring-[#F6DFA2]">
          <p className="flex items-center gap-1.5 text-[13.5px] font-extrabold text-[#7A4B00]"><Zap size={15} className="fill-[var(--gold)] text-[var(--gold)]" />{plural(due.length, 'master')} holding your date</p>
          <p className="mt-0.5 text-[12px] font-semibold text-[#8A6420]">They accepted your request. Pay to confirm — one payment covers them all.</p>
          <button type="button" disabled={!!busy} onClick={() => pay(due.map(l => l.id), `Sambramo · ${plural(due.length, 'master')}`)}
            className="cx-press cx-cta mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-[14px] font-extrabold" data-pay-due>
            {busy && due.some(l => l.id === busy) ? <Loader2 size={16} className="animate-spin" /> : null}Pay {rupees(due.reduce((s, l) => s + l.advancePaise, 0))} to confirm
          </button>
        </div>
      )}

      {[...due, ...live].map((l, k) => (
        <div key={l.id}>
          <BookingCard line={l} />
          {l.status === 'dispatching' && <RequestTimer lineId={l.id} />}
          {['pending', 'dispatching', 'accepted', 'paid'].includes(l.status) && (
            <button type="button" onClick={() => setCancelFor(l)} className="ml-3 mt-1 text-[12px] font-extrabold text-[var(--ink-3)] underline-offset-2 hover:underline" data-cancel-open>Cancel booking</button>
          )}
          {again && l.id === again.id && k === [...due, ...live].findIndex(x => x.id === again.id) && <BookAgain line={l} />}
        </div>
      ))}

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
          <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-[var(--ink-2)]">{q.service_name} · {q.state === 'UNAVAILABLE' ? 'Master declined' : q.state === 'EXPIRED' ? 'No reply in time' : q.state.toLowerCase().replace(/_/g, ' ')}</p>
        </article>
      ))}

      {!empty && <button type="button" onClick={load} className="cx-press mx-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-extrabold text-[var(--brand)]"><RefreshCw size={14} />Refresh</button>}
      <CancelSheet line={cancelFor} onClose={() => setCancelFor(null)} onDone={() => { setCancelFor(null); load() }} />
    </div>
  )
}

/* booking_lines.trade holds the registry NAME ("Cake & Desserts"), not the id. */
const tradeOf = v => TRADE[v] ?? TRADES.find(t => t.name === v) ?? null

/* One booking, as a card: the service's art with its status, then what,
   when and where. Tapping opens the master. */
function BookingCard({ line: l }) {
  const st = LINE_STATE[l.status] ?? { label: l.status, tone: 'wait' }
  const t = tradeOf(l.trade)
  return (
    <Link to={`/p/${l.service_id}?t=${t?.id ?? ''}`} className="cx-press flex gap-3 rounded-[22px] bg-white p-2.5 shadow-[0_0_0_1px_#EEE6FA,0_12px_26px_-22px_rgba(58,18,144,.7)]" data-booking={l.status}>
      <div className="relative w-[112px] shrink-0 overflow-hidden rounded-[16px]">
        <ArtFill art={t ? serviceArt(t.id) : null} tone="#F6F1FF" className="h-full min-h-[108px] w-full" inset="10%" />
        <span className={'absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-sm ' + TONE[st.tone]}>
          {st.tone === 'off' ? <XCircle size={11} /> : st.tone === 'act' ? <Zap size={11} /> : st.tone === 'wait' ? <Clock3 size={11} /> : <CheckCircle2 size={11} />}{st.label.split(' · ')[0]}
        </span>
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-start justify-between gap-2">
          {t && <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF1E6] px-2 py-0.5 text-[10.5px] font-extrabold text-[#C2410C]"><t.icon size={11} />{t.label}</span>}
          <ChevronRight size={17} className="shrink-0 text-[var(--ink-3)]" />
        </div>
        <p className="mt-1 truncate text-[15.5px] font-extrabold tracking-[-0.02em]">{l.service_name}</p>
        <p className="truncate text-[11.5px] font-bold text-[var(--ink-3)]">#{String(l.id).slice(0, 6).toUpperCase()}{l.request.occasion ? ` · ${l.request.occasion}` : ''}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] font-bold text-[var(--ink-2)]">
          {l.request.date && <span className="flex items-center gap-1"><CalendarDays size={12} />{dayLabel(l.request.date)}</span>}
          {l.request.area && <span className="flex items-center gap-1"><MapPin size={12} />{l.request.area}</span>}
        </p>
        <p className="cx-num mt-1 text-[13.5px] font-extrabold">{rupees(l.listPaise ?? l.quoted_amount_paise)}</p>
      </div>
    </Link>
  )
}

/* A request in flight (migration 197): who has it, until when, and who is
   asked next. Silent until 197 is pasted (the queue reads empty). */
function RequestTimer({ lineId }) {
  const [q, setQ] = useState(null)
  const [, tick] = useState(0)
  useEffect(() => {
    let live = true
    const read = () => requestQueue(lineId).then(x => live && setQ(x))
    read()
    const a = setInterval(read, 20000), b = setInterval(() => tick(n => n + 1), 1000)
    return () => { live = false; clearInterval(a); clearInterval(b) }
  }, [lineId])
  if (!q?.length) return null
  const now = q.find(x => x.status === 'asked')
  const next = q.filter(x => x.status === 'waiting')
  const left = now?.reply_by ? Math.max(0, new Date(now.reply_by).getTime() - Date.now()) : 0
  const hh = Math.floor(left / 3600000), mm = Math.floor((left % 3600000) / 60000), ss = Math.floor((left % 60000) / 1000)
  return (
    <div className="mx-1 mt-1.5 rounded-[18px] bg-[#F4FBF7] p-3 ring-1 ring-[#CDEFDC]" data-request-timer>
      {now ? (
        <div className="flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#0C831F] shadow-[inset_0_0_0_2px_#BFE6CC]"><Clock3 size={16} /><span className="absolute inset-0 animate-ping rounded-full ring-2 ring-[#16A34A]/30" /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-extrabold text-[#0B4F2A]">{now.name} has your request</span>
            <span className="block text-[11.5px] font-bold text-[#3C7A5A]">Only they can see it · replies within <span className="cx-num">{hh ? `${hh}h ` : ''}{String(mm).padStart(2, '0')}m {String(ss).padStart(2, '0')}s</span></span>
          </span>
        </div>
      ) : <p className="text-[12.5px] font-extrabold text-[#0B4F2A]">Finding the next master for you…</p>}
      {next.length > 0 && (
        <p className="mt-2 truncate text-[11.5px] font-bold text-[var(--ink-2)]">If they can’t: {next.map(x => `${x.name}${x.list_paise ? ` (${rupees(x.list_paise)})` : ''}`).join(', then ')}</p>
      )}
    </div>
  )
}

/* After a booking that went ahead: book the same master again. */
function BookAgain({ line: l }) {
  const to = `/p/${l.service_id}?t=${tradeOf(l.trade)?.id ?? ''}`
  return (
    <section className="mt-3 rounded-[24px] bg-gradient-to-br from-[#F6F0FF] to-[#EDE3FF] p-4 ring-1 ring-[#E4D6FF]" data-book-again>
      <p className="text-[18px] font-black tracking-[-0.03em] text-[#3A1290]">Loved their service?</p>
      <p className="mt-0.5 text-[12.5px] font-semibold text-[#5F5675]">Book {l.service_name} again in one tap.</p>
      <div className="mt-3 grid grid-cols-4 gap-1 text-center">
        {[[Heart, 'Same master', '#DB2777'], [Zap, 'Quick booking', '#EA580C'], [Settings2, 'Your past details', '#7C3AED'], [BadgeCheck, 'Trusted', '#0F9D58']].map(([I, t, c]) => (
          <span key={t} className="flex flex-col items-center gap-1"><span className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm" style={{ color: c }}><I size={17} /></span><span className="text-[10px] font-bold leading-tight text-[var(--ink-2)]">{t}</span></span>
        ))}
      </div>
      <div className="mt-3.5 grid grid-cols-[1.3fr_1fr] gap-2">
        <Link to={to} className="cx-press flex h-12 items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-[14px] font-extrabold text-white shadow-[0_10px_22px_-12px_rgba(109,40,217,.9)]" data-rebook><RotateCcw size={17} />Book again</Link>
        <Link to={to} className="cx-press flex h-12 items-center justify-center gap-1.5 rounded-[16px] bg-white text-[13.5px] font-extrabold text-[var(--am-ink)] ring-1 ring-[#D6C2FF]"><FileText size={16} />View details</Link>
      </div>
    </section>
  )
}

/* Cancel one booking (Mohan, 2026-10-28: the policy says "My Bookings →
   the booking → Cancel", so it must exist). The server quotes first —
   cancellation_quote, the same function that moves the money — and the
   customer sees exactly what comes back before confirming. Until
   migration 195 is pasted the database still answers on the OLD ladder,
   so a quote without policy 2026-10-28 is refused here rather than
   refunded on terms the customer never agreed to. */
function CancelSheet({ line, onClose, onDone }) {
  const [q, setQ] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [why, setWhy] = useState('')
  useEffect(() => {
    if (!line) return
    setQ(null); setErr(''); setWhy('')
    supabase.rpc('cancellation_quote', { p_line_id: line.id }).then(({ data, error }) => setQ(error ? { ok: false, error: error.message } : data))
  }, [line?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const rung = q?.rung ? CANCELLATION_LADDER.rungs.find(r => r.id === q.rung) : null
  const current = q?.ok && q.policy === '2026-10-28'
  async function go() {
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc('cancel_line', { p_line_id: line.id, p_reason: why || null })
    setBusy(false)
    if (error || !data?.ok) { setErr(error?.message ?? data?.scan ?? 'Could not cancel this booking.'); return }
    onDone()
  }
  const REASONS = ['Plans changed', 'Booked by mistake', 'Found someone else', 'Event cancelled']
  return (
    <Sheet open={!!line} onClose={onClose} title="Cancel this booking?"
      footer={current ? (
        <div className="grid gap-2">
          <button type="button" disabled={busy} onClick={go} className="cx-press h-12 w-full rounded-[16px] bg-[#B42318] text-[14.5px] font-extrabold text-white disabled:opacity-60" data-cancel-confirm>
            {busy ? <Loader2 size={17} className="mx-auto animate-spin" /> : (q.refund_paise > 0 ? `Cancel · ${rupees(q.refund_paise)} back to you` : 'Cancel booking')}
          </button>
          <button type="button" onClick={onClose} className="h-11 w-full rounded-[16px] text-[13.5px] font-extrabold text-[var(--brand)]">Keep my booking</button>
        </div>
      ) : null}>
      <div className="pb-2">
        <p className="text-[14.5px] font-extrabold">{line?.service_name}</p>
        {!q ? <p className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--ink-3)]"><Loader2 size={15} className="animate-spin" />Working out your refund…</p>
          : !current ? (
            <p className="mt-3 rounded-[14px] bg-[#FFF8EB] px-3 py-2.5 text-[13px] font-semibold leading-relaxed text-[#7A4A00]" data-cancel-closed>
              Cancellations are being moved to our new policy. Call or WhatsApp us on {BRAND.supportPhone} and we will cancel it for you today, on the policy you agreed to.
            </p>
          ) : (
            <>
              <div className="mt-3 rounded-[16px] bg-[#F7F4FB] p-3.5" data-cancel-quote={q.rung}>
                <p className="text-[22px] font-black tracking-[-0.02em]">{q.held_paise > 0 ? `${rupees(q.refund_paise)} back` : 'Free to cancel'}</p>
                <p className="text-[12.5px] font-bold text-[var(--ink-2)]">{q.held_paise > 0 ? `of ${rupees(q.held_paise)} paid · ${rung?.scan ?? `${q.refund_pct}% refund`}` : 'Nothing has been paid on this booking yet.'}</p>
                {q.held_paise > 0 && rung?.why && <p className="mt-1.5 text-[12px] font-semibold text-[var(--ink-3)]">{rung.why}</p>}
              </div>
              <p className="mt-3 text-[12.5px] font-extrabold">Why are you cancelling?</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {REASONS.map(r => <button key={r} type="button" onClick={() => setWhy(r)} aria-pressed={why === r} className={'cx-press rounded-full px-3 py-1.5 text-[12px] font-bold ' + (why === r ? 'bg-[#5B21A8] text-white' : 'bg-[#F3EEFA] text-[var(--ink-2)]')}>{r}</button>)}
              </div>
              <p className="mt-3 text-[11.5px] font-semibold text-[var(--ink-3)]">Refunds reach your original payment method in 5–7 working days. <Link to="/legal/cancellation" className="font-extrabold text-[var(--brand)]">Cancellation policy</Link></p>
            </>
          )}
        {err && <p className="mt-2 text-[12.5px] font-bold text-[#B42318]">{err}</p>}
      </div>
    </Sheet>
  )
}
