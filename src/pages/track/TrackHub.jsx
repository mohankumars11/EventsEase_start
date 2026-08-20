import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight, AlertCircle, Sparkles, Store, Lock, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { fetchActivity, TRACK_STAGES, needsYou, isLive } from '../../lib/activity'
import { formatINR } from '../../utils/format'
import FulfilmentFilm from '../../components/track/FulfilmentFilm'

/**
 * Everything the customer has going with us, in one place.
 *
 * ── Why this replaces three screens ───────────────────────────────────────
 * `MyOrders`, `MyEvents` and `MyRequests` each answered "where is my thing?"
 * in a different vocabulary, and none of them said when anything happened. A
 * customer with a cake order and a birthday booking had to visit two screens
 * and translate between them.
 *
 * ── Why the two halves are deliberately unequal ───────────────────────────
 * A shop order needs a status word and a date. A celebration is weeks of work
 * on somebody's wedding and a five-figure sum settled in one payment — it needs the
 * whole road. Giving them the same card weight would either bury the
 * celebration or make a cake delivery look like a project.
 *
 * ── Aurora ────────────────────────────────────────────────────────────────
 * Rebuilt on the tonal system. The screen's job is triage — "is anything
 * waiting on me?" — so the one thing that needed to get louder is the answer
 * to that, which is now a banner above the filters rather than a badge buried
 * on the third card. Everything else is the same data in the same order.
 */
export default function TrackHub() {
  const { user } = useAuth()
  const [items, setItems] = useState(null)      // null = still loading
  const [errors, setErrors] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!user) { setItems([]); return }
    let cancelled = false
    fetchActivity(user.id).then(({ items: rows, errors: errs }) => {
      if (cancelled) return
      setItems(rows)
      setErrors(errs)
    })
    return () => { cancelled = true }
  }, [user])

  const counts = useMemo(() => ({
    all: items?.length ?? 0,
    needsYou: items?.filter(needsYou).length ?? 0,
    live: items?.filter(isLive).length ?? 0,
    past: items?.filter(i => !i.live).length ?? 0,
  }), [items])

  const shown = useMemo(() => {
    if (!items) return []
    if (filter === 'needsYou') return items.filter(needsYou)
    if (filter === 'live') return items.filter(isLive)
    if (filter === 'past') return items.filter(i => !i.live)
    return items
  }, [items, filter])

  const celebrations = shown.filter(i => i.kind === 'celebration')
  const orders = shown.filter(i => i.kind === 'order')

  return (
    <div className="a-canvas min-h-screen pb-bottom-nav">
      <header className="px-5 pt-6">
        <h1 className="font-serif text-[30px] font-extrabold leading-[1.08] tracking-tight text-ink">
          Track
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-mute">
          Every celebration and every order, with what happens next.
        </p>
      </header>

      {/* ── Named failures, never a silent empty state ─────────────────
          "You have nothing here" is the most damaging thing this screen can
          say untruthfully. If one source failed, the other still renders and
          the customer is told which half is missing. */}
      {errors.length > 0 && (
        <div className="mx-5 mt-4 flex items-start gap-2.5 rounded-[20px] bg-chilli-50 px-4 py-3.5 ring-1 ring-chilli-600/15">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-chilli-700" />
          <p className="text-[12px] leading-relaxed text-chilli-800">
            We couldn't load your {errors.map(e => e.source === 'orders' ? 'orders' : 'celebrations').join(' and ')} just now.
            Anything shown below is complete; pull down to try again.
          </p>
        </div>
      )}

      {!user ? (
        <SignedOutPitch />
      ) : items === null ? (
        <div className="mx-auto max-w-3xl space-y-3 px-5 pt-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="a-well h-32 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <LockedState />
      ) : (
        <div className="mx-auto max-w-3xl space-y-7 pb-10 pt-5">
          {/* ── The triage answer, said once and at the top ──────────────
              This is the question the screen exists to answer. It used to be
              answerable only by reading every card's badge. */}
          {counts.needsYou > 0 && filter !== 'needsYou' && (
            <button
              onClick={() => setFilter('needsYou')}
              className="mx-5 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-[24px] bg-saffron-400/15 px-4 py-3.5 text-left ring-1 ring-saffron-400/35 transition-transform active:scale-[0.99]"
            >
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-saffron-400 text-plum-950">
                <AlertCircle size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-extrabold text-ink">
                  {counts.needsYou} {counts.needsYou === 1 ? 'thing needs' : 'things need'} you
                </span>
                <span className="block text-[11.5px] text-ink-mute">
                  Tap to see only those.
                </span>
              </span>
              <ArrowRight size={16} className="shrink-0 text-ink-soft" />
            </button>
          )}

          <Filters filter={filter} onChange={setFilter} counts={counts} />

          {celebrations.length > 0 && (
            <section aria-labelledby="celebrations-heading">
              <h2 id="celebrations-heading" className="px-5 text-[17px] font-extrabold tracking-tight text-ink">
                Your celebrations
              </h2>
              <div className="a-stagger mt-3.5 space-y-3.5 px-5">
                {celebrations.map(c => <CelebrationCard key={c.key} item={c} />)}
              </div>
            </section>
          )}

          {orders.length > 0 && (
            <section aria-labelledby="orders-heading">
              <h2 id="orders-heading" className="px-5 text-[17px] font-extrabold tracking-tight text-ink">
                Your orders
              </h2>
              <p className="mt-1 px-5 text-[12px] text-ink-mute">
                Delivered by Sambramo. Tap one to see where it is.
              </p>
              <div className="a-card mx-5 mt-3.5 overflow-hidden">
                <div className="divide-y divide-ink/[0.06]">
                  {orders.map(o => <OrderRow key={o.key} item={o} />)}
                </div>
              </div>
            </section>
          )}

          {shown.length === 0 && (
            <p className="px-5 py-12 text-center text-[13px] text-ink-mute">
              Nothing here under this filter.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Filters ──────────────────────────────────────────────────────────── */

const FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'needsYou', label: 'Needs you' },
  { id: 'live',     label: 'Live' },
  { id: 'past',     label: 'Past' },
]

function Filters({ filter, onChange, counts }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide">
      {FILTERS.map(f => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          aria-pressed={filter === f.id}
          className="a-chip"
        >
          {f.label}
          {counts[f.id] > 0 && <span className="opacity-65">{counts[f.id]}</span>}
        </button>
      ))}
    </div>
  )
}

/* ── A celebration ────────────────────────────────────────────────────── */

function CelebrationCard({ item }) {
  const stageLabel = item.cancelled
    ? 'Cancelled'
    : TRACK_STAGES[item.stageIndex]?.label ?? 'Received'

  return (
    <Link
      to={item.href}
      className="a-card a-rail block overflow-hidden transition-transform active:scale-[0.985]"
    >
      <div className="flex items-start gap-3.5 p-5 pt-6">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-accent/[0.09] text-[22px]">
          {item.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[15.5px] font-extrabold tracking-tight text-ink">{item.title}</p>
            <span className="shrink-0 font-mono text-[10px] text-ink-mute">{item.reference}</span>
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-mute">{item.message}</p>

          {item.needsYou && (
            <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-saffron-400/20 px-3 py-1.5 text-[11.5px] font-extrabold text-saffron-800 ring-1 ring-saffron-400/35">
              {item.needsYou.label}
            </p>
          )}
        </div>
      </div>

      {/* The bar is the axis only. `needsYou` never moves it — a plan waiting
          on the customer has not travelled further, it has stopped. */}
      <div className="px-5 pb-4">
        <div
          className="h-2 overflow-hidden rounded-full bg-ink/[0.07]"
          role="progressbar"
          aria-valuenow={item.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${item.title}: ${stageLabel}`}
        >
          <span
            className={`block h-full rounded-full transition-all duration-500 ${item.cancelled ? 'bg-ink/20' : 'a-aurora'}`}
            style={{ width: `${Math.max(item.progress, 4)}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[12px] font-bold text-ink-soft">{stageLabel}</span>
          {/* Names the payment panel rather than a generic "open". The ladder
              is one tap in, and a card that does not mention it is why
              somebody looks at this hub and concludes the payment options
              were never built. */}
          <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-accent">
            Steps &amp; payments <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ── An order ─────────────────────────────────────────────────────────── */

function OrderRow({ item }) {
  return (
    <Link to={item.href} className="flex min-h-[64px] items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-ink/[0.04]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink/[0.05] text-[17px]">
        {item.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-bold text-ink">{item.title}</span>
        <span className="block text-[12px] text-ink-mute">
          {TRACK_STAGES[item.stageIndex]?.label ?? 'Cancelled'}
          {item.amount != null && <> · {formatINR(item.amount)}</>}
        </span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-ink-mute" />
    </Link>
  )
}

/* ── Signed out ───────────────────────────────────────────────────────────
 *
 * The tab is permanent, so this is a real destination for somebody who has
 * never ordered — and it is the single best place in the app to make the
 * argument, because it describes what happens AFTER they commit. A brand with
 * no ratings and no order count cannot win on reputation; it can win on
 * showing exactly how the thing will be run.
 *
 * So this is the promise, not an apology for being empty, and certainly not a
 * login wall. Sign-in is asked at the point there is something to see.
 */
/**
 * These four sentences are a promise about how the business runs, so they
 * have to move whenever the business does. The payment line used to read
 * 'Paid in stages, never all at once' — which stopped being true the moment
 * the instalment ladder was removed, and was still on the live site telling
 * people the opposite of what the tracker would do. Copy that describes
 * mechanics is code with a longer fuse.
 */
const PROMISES = [
  { emoji: '🤝', title: 'Every step your coordinator takes',
    body: 'Masters sourced, decorator confirmed, caterer confirmed — as it happens, with the time it happened.' },
  { emoji: '📋', title: 'Your plan, priced and itemised',
    body: 'One number you approve before anything is booked. Change it and we re-send it.' },
  { emoji: '💳', title: 'One payment, and what it set in motion',
    body: 'The price you approved, paid once. No instalments to keep track of, and nothing collected after the day.' },
  { emoji: '✅', title: 'Every service you ordered, ticked as it is booked',
    body: 'Eleven services on a wedding means eleven ticks — not one progress bar.' },
  { emoji: '🛍️', title: 'Your shop orders too',
    body: 'Cakes, gifts and pooja essentials, from placed to delivered.' },
]

function SignedOutPitch() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 pb-12 pt-5">
      <div className="a-raised a-rail overflow-hidden p-6 pt-7">
        <p className="font-serif text-[23px] font-extrabold leading-[1.15] tracking-tight text-ink">
          Track unlocks when you place an event order with us
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-mute">
          There is nothing to set up and nothing to switch on. The moment you send us a
          celebration or place an order, this is where you watch it happen — every step,
          every payment, one screen, from that day until your event is over.
        </p>

        <ul className="mt-5 space-y-4">
          {PROMISES.map(p => (
            <li key={p.title} className="flex gap-3.5">
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/[0.09] text-[17px]">
                {p.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-extrabold tracking-tight text-ink">{p.title}</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-mute">{p.body}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link to="/plan" className="a-btn-primary flex-1">
            <Sparkles size={16} /> Plan a celebration
          </Link>
          <Link to="/shop" className="a-btn-quiet flex-1">
            <Store size={16} /> Browse the shop
          </Link>
        </div>

        {/* Sign-in is offered, never imposed — the same rule the planner and
            the storefront follow. Somebody who already has a booking should
            be able to get to it from here in one tap. */}
        <p className="mt-4 text-center text-[12px] text-ink-mute">
          Already booked something?{' '}
          <Link to="/login" className="font-bold text-accent underline underline-offset-2">
            Sign in to track it
          </Link>
        </p>
      </div>

      <FulfilmentFilm />
    </div>
  )
}

/* ── Nothing yet: locked, not empty ───────────────────────────────────── */

/**
 * What the Track tab opens when the customer has ordered nothing.
 *
 * ── Why "locked" and not "empty" ──────────────────────────────────────────
 * These are the same screen and they are not the same message. "Nothing to
 * track yet" describes a container; it invites the reading that the feature
 * is thin, or half-built, which for a brand with no order history is the most
 * expensive wrong impression available. "This unlocks when you order"
 * describes a door — it says the thing behind it is real, is substantial, and
 * is waiting.
 *
 * The greyed tab in the bottom bar makes the same statement, and the two have
 * to agree: a tab drawn as locked that opens a screen apologising for being
 * empty is worse than either on its own.
 *
 * ── What it spends its space on ───────────────────────────────────────────
 * Not an apology, and not a feature list. The six steps below are exactly the
 * ones the real tracker shows on a live celebration, in the real order, with
 * the real green ticks — so somebody deciding whether to trust us with a
 * wedding is looking at the actual instrument, greyed out, rather than at a
 * description of it. That is the whole argument this business has before it
 * has reviews: not "we are good", but "here is precisely how you will watch
 * us work."
 */
const UNLOCKED_STEPS = [
  { title: 'Your request, the moment it lands',
    body: 'Timestamped. You never wonder whether it reached a human.' },
  { title: 'Your coordinator sourcing, master by master',
    body: 'Decorator confirmed, caterer confirmed, photographer confirmed — as it happens.' },
  { title: 'One price, itemised, before anything is booked',
    body: 'You approve it. Nothing is committed to a vendor until you do.' },
  { title: 'One payment, and a receipt that lists every step',
    body: 'No instalments to track, and nothing collected after the day.' },
  { title: 'Every single service you ordered, ticked as it is booked',
    body: 'Eleven services on a wedding means eleven ticks — not one progress bar.' },
  { title: 'Your rating of each of them, afterwards',
    body: 'It decides which masters we book for the next family.' },
]

function LockedState() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 pb-12 pt-5">
      <div className="a-raised overflow-hidden">
        {/* The lock, said plainly and once. */}
        <div className="flex items-start gap-3.5 border-b border-ink/[0.07] px-6 py-5" style={{ background: 'var(--a-low)' }}>
          <span aria-hidden="true" className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink/[0.08] text-ink-mute">
            <Lock size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[21px] font-extrabold leading-[1.15] tracking-tight text-ink">
              Track unlocks when you place an event order with us
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-mute">
              There is nothing to set up and nothing to switch on. The moment you send us a
              celebration or place an order, this screen fills in — and stays filled in from
              that day until your event is over.
            </p>
          </div>
        </div>

        {/* The instrument itself, greyed. Every tick below is one the live
            tracker really draws; nothing here is illustrative. */}
        <ol className="divide-y divide-ink/[0.06]">
          {UNLOCKED_STEPS.map((s, i) => (
            <li key={s.title} className="flex items-start gap-3.5 px-6 py-4">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.08] text-ink-mute/60"
              >
                <Check size={13} strokeWidth={3.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold tracking-tight text-ink-soft">{s.title}</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-mute">{s.body}</span>
              </span>
              <span aria-hidden="true" className="mt-1 shrink-0 text-[11px] font-bold tabular-nums text-ink-mute/50">
                {i + 1}
              </span>
            </li>
          ))}
        </ol>

        {/* The transparency claim, made as a promise rather than a feature. */}
        <p className="border-t border-ink/[0.07] bg-accent/[0.05] px-6 py-4 text-[12px] leading-relaxed text-ink-soft">
          <span className="font-extrabold text-ink">Nothing is hidden from you.</span>{' '}
          Anything not ticked here is not done yet — we never mark work complete in advance,
          and we never show you a step we cannot stand behind.
        </p>

        <div className="flex flex-col gap-2.5 px-6 py-5 sm:flex-row">
          <Link to="/plan" className="a-btn-primary flex-1">
            <Sparkles size={16} /> Plan a celebration
          </Link>
          <Link to="/shop" className="a-btn-quiet flex-1">
            <Store size={16} /> Browse the shop
          </Link>
        </div>
      </div>

      <FulfilmentFilm />
    </div>
  )
}
