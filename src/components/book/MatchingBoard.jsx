import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, MapPinned, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import { MATCHING, PARTIAL, ACCEPTED_ROW, PAID } from '../../config/instantBooking'
import { openRazorpay } from '../../lib/razorpayCheckout'
import TradeSprite, { LiveLine } from './TradeSprite'
import PaidConfirmation from './PaidConfirmation'
import CustomerAlerts from './CustomerAlerts'
import CancelLine from './CancelLine'

/**
 * "Three of five masters have accepted."
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ONE SCREEN THAT HAD TO BE NEW
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every other surface in the instant flow is assembled from components
 * that already draw this app. This one is not, because nothing in
 * Sambramo has ever had to show several independent things resolving at
 * once — a tracker shows a sequence, a cart shows a total, and neither
 * is this.
 *
 * ── It reads like a scoreboard, not a paragraph ──────────────────────
 * A pip row is read in about 200ms and survives being glanced at
 * sideways while walking. "Three of your five masters have confirmed
 * your booking" does neither, and that is who is looking at this screen:
 * somebody standing up, mid-something, waiting.
 *
 * So the pips carry the state and every string beside them is a
 * FRAGMENT — "Finding", "3 notified", "Booked" — because the service
 * name and the price next to it already supply the grammar. The tier
 * rules in config/instantBooking.js are what keep it that way.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NO FAKE COUNTDOWN, EVER
 * ══════════════════════════════════════════════════════════════════════
 *
 * The seconds shown are `dispatch_offers.expires_at` from the database —
 * a real deadline that real masters are looking at. A line with nobody
 * to ask (`dispatch_mode = 'standing'`) shows NO timer at all, because
 * counting down against an empty pool is precisely the `false_urgency`
 * pattern named in config/legal.js, and it is the easiest one in this
 * product to commit by accident.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PARTIAL FILL IS NOT A FAILURE STATE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Measured against the seeded network, five-line baskets complete about
 * 91% of the time at realistic supply and roughly half at launch supply.
 * So "some accepted, some still looking" is a NORMAL outcome and must
 * not be styled as an error — no red, no apology, no warning triangle.
 *
 * It gets the same visual weight as a full fill, and the pay button
 * names what it is paying for. That is also why `interface_interference`
 * is on the dark-patterns list: making "Pay for 3 now" shout while
 * "still looking" whispers would be pressure dressed as layout.
 */

const PIP = {
  accepted:  'bg-forest-500',
  searching: 'bg-saffron-400',
  standing:  'bg-ink/20',
  none:      'bg-ink/10',
}

function stateOf(line) {
  if (line.status === 'accepted' || line.status === 'paid') return 'accepted'
  if (line.dispatch_mode === 'standing') return 'standing'
  if (line.status === 'dispatching') return 'searching'
  return 'none'
}

/** Live seconds against a real database deadline. */
function useCountdown(iso) {
  const [left, setLeft] = useState(() => remaining(iso))
  useEffect(() => {
    if (!iso) return
    const t = setInterval(() => setLeft(remaining(iso)), 500)
    return () => clearInterval(t)
  }, [iso])
  return left
}
function remaining(iso) {
  if (!iso) return null
  const s = Math.ceil((new Date(iso).getTime() - Date.now()) / 1000)
  return s > 0 ? s : 0
}

function LineRow({ line, offers }) {
  const state = stateOf(line)
  const secs = useCountdown(state === 'searching' ? line.expires_at : null)
  const notified = offers.filter(o => o.line_id === line.id).length
  const won = offers.find(o => o.line_id === line.id && o.status === 'ACCEPTED')

  return (
    <li className="flex items-center gap-3 border-b border-ink/[0.06] py-3 last:border-0">
      {/* The face replaces the 8px dot. Same information -- the sprite
          only animates while `active` -- carried by something a person
          recognises in a glance instead of a coloured pixel. */}
      <TradeSprite
        trade={line.trade}
        serviceId={line.service_id}
        active={state === 'searching' || state === 'standing'}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-extrabold leading-tight text-ink">
          {line.service_name}
        </p>

        <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-bold text-ink-mute">
          {state === 'accepted' && (
            <>
              <Check size={12} className="text-forest-600" />
              {line.status === 'paid' ? MATCHING.paid : ACCEPTED_ROW.glance}
              {won?.distance_m != null && (
                <span className="font-semibold text-ink-mute/70">
                  · {(won.distance_m / 1000).toFixed(1)} km
                </span>
              )}
            </>
          )}

          {state === 'searching' && (
            <>
              <Loader2 size={12} className="animate-spin text-saffron-600" />
              {notified > 0 ? MATCHING.notified(notified) : MATCHING.searching}
              {secs != null && secs > 0 && (
                <span className="tabular-nums text-ink-mute/70">· {secs}s</span>
              )}
            </>
          )}

          {/* No timer. There is nobody to count down. */}
          {state === 'standing' && (
            <>
              <Search size={12} className="text-ink-mute" />
              {PARTIAL.glance}
            </>
          )}
        </p>
      </div>

      <span
        className={`shrink-0 text-[13.5px] font-extrabold tabular-nums ${
          state === 'accepted' ? 'text-ink' : 'text-ink-mute/50'
        }`}
      >
        {formatINR(Math.round(line.quoted_amount_paise / 100))}
      </span>
    </li>
  )
}

/**
 * A master who has accepted and is waiting for the money.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS A SECOND ROW AND NOT A LONGER FIRST ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The list is scanned. Eight rows of name-state-price are read in about
 * a second, and every word added to one of them is a word added to all
 * eight — which is what made the original board terse in the first
 * place, correctly.
 *
 * But exactly one state in that list is a decision the customer has to
 * make, and it is invisible when it looks like the other seven. So the
 * accepted-and-unpaid row grows a band underneath it: the sentence and
 * the button. Nothing else in the list changes, and the band disappears
 * the moment it is paid.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SENTENCE NAMES THE DATE, NOT OUR INTERNAL STATE
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Awaiting payment" is a status field. "Ramesh has accepted and is
 * holding your date — pay to confirm him" is what is actually true: the
 * master has cleared that Saturday on the strength of an acceptance, and
 * `match_partners` will not offer them another job on it.
 *
 * That is also the honest reason to pay promptly, which is why it is the
 * sentence rather than a nag.
 */
function AwaitingPayment({ line, master, onPay, onCancel, paying }) {
  return (
    <li className="border-b border-ink/[0.06] pb-3.5 last:border-0">
      <div className="rounded-2xl bg-forest-50 p-3.5 ring-1 ring-forest-200/70">
        <p className="text-[12.5px] font-semibold leading-relaxed text-forest-900">
          {ACCEPTED_ROW.waiting(master)}
        </p>
        <button
          onClick={onPay}
          disabled={paying}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-forest-600 py-2.5 text-[13.5px] font-extrabold text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          {paying && <Loader2 size={14} className="animate-spin" />}
          {ACCEPTED_ROW.payOne(formatINR(Math.round(line.quoted_amount_paise / 100)))}
        </button>

        {/* Quiet, and always present.
            A cancel that has to be hunted for is a support call, and one
            that is as loud as the pay button invites second thoughts on
            a screen that does not need them. It is a text link under the
            action, which is where people look for the way out. */}
        <button
          onClick={onCancel}
          className="mt-1.5 w-full py-1.5 text-[12px] font-bold text-forest-800/70 underline-offset-2 hover:underline"
        >
          Cancel this service
        </button>
      </div>
    </li>
  )
}

/**
 * @param requestId  null until the server has created the booking. The
 *                   board renders anyway — see `pending`.
 * @param pending    what the customer picked, as { id, name }[]. Used to
 *                   draw the real rows before the server has answered,
 *                   so pressing "Find my masters" moves the screen in a
 *                   frame instead of after six seconds of a disabled
 *                   button. Measured: the dispatch round trip is ~6s on
 *                   production, and it was ALL dead time.
 * @param area       the venue's locality, for the header sentence.
 * @param failed     a dispatch error, surfaced here rather than back on
 *                   the form the customer has already left.
 */
export default function MatchingBoard({ requestId, onPay, pending = [], area = null, eventDate = null, failed = null, onRetry }) {
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState(null)
  // Set only when the server says this deployment is charging a test
  // amount. Shown on the screen, because a customer being charged ₹1 for
  // a ₹31,200 basket must be able to see that is what is happening.
  const [testCharge, setTestCharge] = useState(null)
  /* The line ids a completed payment covered.
   *
   * Held rather than derived, because by the time the confirmation
   * renders those lines have moved from 'accepted' to 'paid' and a
   * filter on the current state could not tell them apart from lines
   * paid ten minutes ago in an earlier tap. */
  const [justPaid, setJustPaid] = useState(null)
  // The line whose cancellation sheet is open, if any.
  const [cancelling, setCancelling] = useState(null)
  const [lines, setLines] = useState([])
  const [offers, setOffers] = useState([])
  const [loaded, setLoaded] = useState(false)
  const pollRef = useRef(null)
  const waveRef = useRef(null)
  // Whether any line is still looking for a master. Kept in a ref so the
  // poll effect can read it without listing it as a dependency.
  const huntingRef = useRef(true)

  /**
   * Realtime, with polling underneath it.
   *
   * `hooks/useNotifications.js` already established this pattern and the
   * reasoning holds harder here: Realtime needs the tables in the
   * `supabase_realtime` publication, which is a hand-applied step that
   * can silently not have happened. A screen whose entire job is showing
   * change cannot be the one that quietly stops changing — so the poll
   * is the floor, and when Realtime works it simply finds nothing new.
   */
  useEffect(() => {
    if (!requestId) return
    let dead = false

    async function read() {
      const { data: l } = await supabase
        .from('booking_lines')
        .select('id, service_name, status, dispatch_mode, expires_at, quoted_amount_paise')
        .eq('request_id', requestId)
        .order('created_at')

      if (dead) return
      setLines(l ?? [])
      setLoaded(true)

      const ids = (l ?? []).map(x => x.id)
      if (!ids.length) return
      const { data: o } = await supabase
        .from('dispatch_offers')
        // The winning master's name travels with the offer. A row that
        // says 'someone has accepted' is weaker than one that says
        // 'Ramesh Decorators has accepted', and the name is public
        // information about a business, not about a person.
        .select('id, line_id, status, distance_m, vendors(business_name)')
        .in('line_id', ids)
      if (!dead) setOffers(o ?? [])
    }

    /* ── The screen advances its own waves ─────────────────────────
     *
     * `api/dispatch-waves` widens the radius — 5 km, then 10, then 15 —
     * for lines nobody has answered. It wants to run every minute.
     *
     * The Vercel Hobby plan allows one cron run per DAY, and a
     * `* * * * *` schedule does not degrade at runtime: it fails the
     * deploy outright. See CRON_NOTE.md.
     *
     * So the widening happens here, from the screen of the person
     * waiting for it — which is the only moment it is urgent. The daily
     * cron underneath catches bookings whose customer closed the tab.
     *
     * Every 15 seconds, not every 3: a wave is 45 seconds long and
     * calling this on every poll would be four requests per wave doing
     * nothing. It stops the moment nothing is hunting. */
    async function nudgeWaves() {
      try { await fetch('/api/dispatch-waves', { method: 'POST' }) }
      catch { /* a failed nudge is the cron's job. Never a visible error. */ }
    }

    read()
    pollRef.current = setInterval(read, 3000)
    waveRef.current = setInterval(() => {
      // `hunting` is read from the ref rather than closed over, because
      // this effect is keyed on requestId and must not restart whenever
      // the line list changes.
      if (huntingRef.current) nudgeWaves()
    }, 15000)

    const channel = supabase
      .channel(`booking-${requestId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'booking_lines', filter: `request_id=eq.${requestId}` },
        read)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'dispatch_offers' },
        read)
      .subscribe()

    return () => {
      dead = true
      clearInterval(pollRef.current)
      clearInterval(waveRef.current)
      supabase.removeChannel(channel)
    }
  }, [requestId])

  /**
   * Open a Razorpay checkout for every master who has accepted so far.
   *
   * ── The amount is not sent from here ──────────────────────────────
   * Only line ids go up. `api/create-booking-payment` re-reads every
   * amount from `booking_lines.quoted_amount_paise` and sums them
   * server-side — a client that could name its own total could name ₹1.
   *
   * ── And this does not mark anything paid ──────────────────────────
   * The checkout's success callback is not a witness: somebody who pays
   * and closes the tab leaves a captured payment this app never hears
   * about. `api/razorpay-webhook` is the only thing that writes the
   * escrow hold. So on success this screen says "confirming", and the
   * board's own polling shows the line turn paid when the webhook lands.
   */
  async function pay(payableLines) {
    setPaying(true); setPayError(null)
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id
      if (!uid) { setPayError('Please sign in again to pay.'); return }

      const res = await fetch('/api/create-booking-payment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ customerId: uid, lineIds: payableLines.map(l => l.id) }),
      })

      // Read as text first: a platform error page is HTML, and res.json()
      // on it throws a parse error that says nothing useful.
      const raw = await res.text()
      let body
      try { body = JSON.parse(raw) } catch {
        setPayError(`Payment service error (${res.status}).`); return
      }
      if (!res.ok) { setPayError(body.error ?? body.detail ?? 'Could not start the payment'); return }

      /* The mock provider, in development only.
       *
       * It exists so the escrow path can be exercised without a gateway,
       * and it settles by calling its own webhook WITH A REAL SIGNATURE —
       * so the one security-critical line in api/razorpay-webhook.js is
       * genuinely tested rather than skipped. `api/_lib/payments.js`
       * refuses to produce it when NODE_ENV is production. */
      if (body.provider === 'mock' && body.mockSettleUrl) {
        await fetch(body.mockSettleUrl, { method: 'POST' })
        onPay?.(payableLines)
        return
      }

      if (body.provider !== 'razorpay') {
        setPayError('Payments are not switched on yet.'); return
      }

      setTestCharge(body.testCharge ?? null)

      /* The customer, so Razorpay does not open on a contact form.
       *
       * Read here rather than held in state: this runs once per tap, and
       * a stale profile in a long-lived component would prefill the
       * wrong number. */
      const { data: me } = await supabase
        .from('profiles').select('full_name, email, phone').eq('id', uid).maybeSingle()

      const opened = await openRazorpay({
        keyId: body.keyId,
        orderId: body.orderId,
        amountPaise: body.amountPaise,
        // What they are paying for, in the sheet, in their words. Not
        // "Order #4821": the last line somebody reads before paying
        // should be the thing they wanted.
        description: body.testCharge
          ? 'Test payment · ₹1'
          : payableLines.length === 1
            ? payableLines[0].service_name
            : `${payableLines.length} masters for your celebration`,
        customer: { name: me?.full_name, email: me?.email, phone: me?.phone },
        notes: { lines: String(payableLines.length) },
        onDismiss: () => setPaying(false),
      })

      // A dismissed sheet is not a failure. Somebody who backed out gets
      // their button back and no red text.
      if (opened.dismissed) return
      if (!opened.ok) {
        setPayError(opened.error)
        if (opened.detail) console.warn('[payment]', opened.detail)
        return
      }

      /* Deliberately NOT marking anything paid. The webhook decides
         that, and PaidConfirmation shows the difference: it opens on
         "Payment received — confirming", and only says the date is
         blocked once the LINES say so. */
      setPayError(null)
      setJustPaid(payableLines.map(l => l.id))
    } catch (err) {
      setPayError(`Could not reach the payment service. Nothing has been charged.`)
    } finally {
      setPaying(false)
    }
  }

  const accepted = useMemo(() => lines.filter(l => stateOf(l) === 'accepted'), [lines])
  const payable = useMemo(
    () => accepted.filter(l => l.status === 'accepted'), [accepted])
  const payTotal = payable.reduce((n, l) => n + l.quoted_amount_paise, 0)
  const stillLooking = lines.length - accepted.length
  // Fed to the wave nudge above. A booking where everybody has answered
  // has nothing left to widen for, and should stop asking the server to.
  huntingRef.current = stillLooking > 0

  /* Which of the five things is happening, as one word.
   *
   * Derived rather than stored: every input is already on screen, and a
   * second copy of "what state is this booking in" is a second thing
   * that can disagree with the rows underneath it. */
  const phase =
    failed                       ? 'failed'
    : !requestId                 ? 'sending'
    : accepted.length === 0      ? (lines.every(l => l.dispatch_mode === 'standing') && lines.length ? 'standing' : 'hunting')
    : stillLooking > 0           ? 'partial'
    :                              'complete'

  // How many masters are actually holding this job right now. The number
  // the customer most wants and was never shown.
  const asked = offers.filter(o => o.status === 'OFFERED').length

  const head =
    phase === 'sending'  ? MATCHING.head.sending(area)
    : phase === 'hunting'  ? MATCHING.head.hunting(asked, area)
    : phase === 'standing' ? MATCHING.head.standing(area)
    : phase === 'partial'  ? MATCHING.head.partial(accepted.length, lines.length)
    : phase === 'complete' ? MATCHING.head.complete(accepted.length)
    :                        null

  /* No spinner-only state any more.
   *
   * There used to be one, and it was shown for the whole dispatch round
   * trip — a blank screen with a spinner, after a button that had also
   * been a spinner. The customer had pressed one thing and watched two
   * different loading states without ever being told what was being
   * loaded.
   *
   * The picked services are known on the client, so the real rows are
   * drawn immediately and fill in as the server answers. */
  const showing = loaded && lines.length
    ? lines
    : pending.map(x => ({ id: x.id, service_name: x.name, status: 'pending', __pre: true }))

  /* The whole screen, after a payment.
   *
   * Not a toast and not a banner on top of the board: the board is a
   * live search, and continuing to show a search under a confirmation
   * makes the confirmation look provisional. The lines still hunting
   * are named ON the confirmation instead, which is where somebody who
   * has just paid actually wants to read about them. */
  if (justPaid) {
    return (
      <PaidConfirmation
        paidLines={lines.filter(l => justPaid.includes(l.id))}
        offers={offers}
        eventDate={eventDate}
        area={area}
        stillLooking={stillLooking}
        onDone={() => onPay?.(lines.filter(l => justPaid.includes(l.id)))}
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-40 pt-6">
      <p className="type-overline text-saffron-700">Your masters</p>

      <h1 className="mt-1.5 flex items-start gap-2.5 font-serif text-[26px] font-extrabold leading-[1.14] tracking-tight text-ink sm:text-[30px]">
        {/* A live dot, not a spinner.
            A spinner says "wait"; this says "something is happening out
            there". It is the only motion on the screen while nothing has
            been accepted, and it stops the moment everything has. */}
        {(phase === 'sending' || phase === 'hunting' || phase === 'standing') && (
          <span className="relative mt-2.5 flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-saffron-400 opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-saffron-500" />
          </span>
        )}
        {head?.title ?? MATCHING.progress(accepted.length, showing.length)}
      </h1>

      {head?.body && (
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{head.body}</p>
      )}

      {/* The scoreboard. Read in a glance, before any word is. */}
      <div className="mt-4 flex gap-1.5" aria-hidden="true">
        {showing.map(l => (
          <span key={l.id} className={`h-1.5 flex-1 rounded-full ${l.__pre ? 'bg-ink/[0.08]' : PIP[stateOf(l)]}`} />
        ))}
      </div>

      {(phase === 'sending' || phase === 'hunting' || phase === 'standing') && (
        <LiveLine area={area} notified={asked} />
      )}

      {/* The offer to be told, exactly where the promise is made. */}
      {(phase === 'hunting' || phase === 'standing') && <CustomerAlerts />}

      {head?.note && (
        <p className="mt-3.5 rounded-[18px] bg-forest-50 p-3.5 text-[12.5px] font-semibold leading-relaxed text-forest-800 ring-1 ring-forest-200/60">
          {head.note}
        </p>
      )}

      {failed && (
        <div className="mt-4 rounded-[18px] bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="text-[14px] font-extrabold text-amber-900">That did not go through</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-amber-900/80">{failed}</p>
          <p className="mt-1 text-[12.5px] font-bold text-amber-900">Nothing has been charged.</p>
          {onRetry && (
            <button onClick={onRetry} className="mt-3 rounded-2xl bg-amber-400 px-4 py-2.5 text-[13.5px] font-extrabold text-plum-950">
              Try again
            </button>
          )}
        </div>
      )}

      {cancelling && (
        <CancelLine
          line={cancelling}
          onClose={() => setCancelling(null)}
          // The board is already subscribed to booking_lines, so the row
          // updates itself the moment the RPC commits. Nothing to refresh.
          onCancelled={() => setCancelling(null)}
        />
      )}

      <ul className="mt-5 rounded-[22px] bg-white px-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-ink/[0.06]">
        {showing.map(l => {
          if (l.__pre) return <PendingRow key={l.id} id={l.id} name={l.service_name} />

          const row = <LineRow key={l.id} line={l} offers={offers} />
          // Only for a line somebody has said yes to and nobody has paid
          // for. Every other state is a glance, not a decision.
          if (l.status !== 'accepted') return row

          const won = offers.find(o => o.line_id === l.id && o.status === 'ACCEPTED')
          return [
            row,
            <AwaitingPayment
              key={l.id + '-pay'}
              line={l}
              master={won?.vendors?.business_name ?? null}
              paying={paying}
              onPay={() => pay([l])}
              onCancel={() => setCancelling(l)}
            />,
          ]
        })}
      </ul>

      {/* Only while some have accepted and some have not. The header
          already carries the sentence when nothing has been accepted at
          all — saying it twice made the screen read as anxious. */}
      {accepted.length > 0 && stillLooking > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-[18px] bg-surface-sunk/[0.05] p-3.5 text-[12.5px] font-semibold leading-snug text-ink-soft">
          <MapPinned size={14} className="mt-0.5 shrink-0 text-ink-mute" />
          {PARTIAL.detail}
        </p>
      )}

      {payable.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/[0.06] bg-white/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={() => pay(payable)}
              disabled={paying}
              className="w-full rounded-2xl bg-saffron-400 py-3.5 text-[15px] font-extrabold text-plum-950 transition active:scale-[0.99]"
            >
              {paying ? 'Opening payment…' : MATCHING.payCta(payable.length, formatINR(Math.round(payTotal / 100)))}
            </button>

            {testCharge && (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-center text-[11.5px] font-bold leading-snug text-amber-900 ring-1 ring-amber-200">
                Test mode — you are being charged{' '}
                {formatINR(Math.round(testCharge.chargedPaise / 100))}, not{' '}
                {formatINR(Math.round(testCharge.quotedPaise / 100))}.
              </p>
            )}

            {payError && (
              <p className="mt-2 text-center text-[12px] font-bold text-amber-800">{payError}</p>
            )}
            <p className="mt-2 text-center text-[11px] font-semibold text-ink-mute">
              You only pay for masters who said yes.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}


/**
 * A service the customer picked, before the server has said anything.
 *
 * Shown for the second or two between pressing the button and the
 * booking existing. It carries the real service name, so the list does
 * not reflow when the server answers — the row simply gains a state.
 */
function PendingRow({ id, name }) {
  return (
    <li className="flex items-center gap-3 border-b border-ink/[0.05] py-3.5 last:border-0">
      <TradeSprite serviceId={id} trade={null} active />
      <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-ink">{name}</span>
      <span className="shrink-0 text-[12.5px] font-semibold text-ink-mute">Reaching masters…</span>
    </li>
  )
}
