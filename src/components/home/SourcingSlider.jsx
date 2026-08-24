import './SourcingSlider.css'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { SERVICE_BY_ID } from '../../data/servicePricing'
import { CATALOG_STATS } from '../../data/planCatalog'

/**
 * One resource at a time — the "you can book just the cook" panel.
 *
 * ── What it is for ────────────────────────────────────────────────────────
 * The whole storefront is arranged around whole celebrations: fifteen occasion
 * cards, six scale tiers, a builder that prices a complete event. That is the
 * business and the ordering is right. But it leaves two customers with nowhere
 * obvious to stand:
 *
 *   — somebody who has the hall, the family and the food sorted and needs a
 *     purohit for Thursday morning, and
 *   — a company doing a launch or an annual day, who is not "celebrating" in
 *     the sense every card on this page uses the word.
 *
 * Both are already served — `corporate_event` is one of the fifteen occasions,
 * and PlanHub has carried the individual services since it was rebuilt — but
 * Home never said so. A visitor who wants one thing reads a page of packages
 * and leaves. This panel is the sentence that keeps them, and it is a rail
 * rather than a grid because the claim is the RANGE ("any of these, singly"),
 * which a rail demonstrates by moving and a grid of six only implies.
 *
 * ── Why it does not say "just the cook" ───────────────────────────────────
 * Because IntroCards already does, in the panel directly below this one: "The
 * whole day, or just the cook — 57 services you can take one at a time." Two
 * adjacent panels making one argument is the failure HomeScreen's own deck
 * note describes, where repetition stops reading as emphasis and starts
 * reading as wallpaper.
 *
 * So the two split the work rather than compete. IntroCards ASSERTS the fact,
 * in a list of four facts about the product. This panel DEMONSTRATES it, and
 * takes the two things IntroCards never says: that businesses are served as
 * well as families — `corporate_event` is in the catalogue and nothing on Home
 * admitted it — and that each resource is separately sourced and separately
 * priced. Hence the headline naming a purohit and a product launch in one
 * breath, rather than naming the cook again.
 *
 * ── Why it names the work rather than the price ───────────────────────────
 * `SHOW_SERVICE_PRICES` is false, and for a good reason set out in
 * config/sambramo: the per-service hints are unit-bearing ("₹250 – ₹800/plate")
 * and somebody scanning a rail reads the first number as the price of the
 * whole job. So each slide carries what we DO for that resource instead —
 * which is the more persuasive half anyway. "Three kitchens quoted, tasting
 * before you commit" is a reason to use a concierge; "from ₹3,000" is a reason
 * to go and find a cook yourself.
 *
 * That is also the honest form of the market-rate claim the panel makes. The
 * quote engine returns a RANGE rather than a figure because there is no signed
 * supplier behind the catalogue yet (see utils/quote.js), and the scan drawn
 * here is that range being formed — three unequal quotes, not a rate card.
 *
 * ── Names come from the data file ─────────────────────────────────────────
 * Every slide that can be is keyed to `SERVICE_BY_ID`, so a rename in
 * servicePricing reaches this rail without anyone remembering it exists. The
 * two that cannot be — catering and decor — are quote-engine components rather
 * than rows in ALL_SERVICES, so they carry their own label and are marked.
 */

const RESOURCE_MS = 3000
/* Offset from the resource beat so the audience pill and the slide never
   change in the same frame; see ss-pill in the stylesheet. */
const AUDIENCE_MS = 4900

const AUDIENCES = ['Individuals', 'Businesses']

/**
 * `id` resolves against SERVICE_BY_ID for name and emoji. `label`/`emoji` are
 * the fallback for the two that are priced inside the quote rather than listed
 * as bookable rows — they are not missing, they are a different shape.
 */
const RESOURCES = [
  { id: 'catering',    emoji: '👨‍🍳', label: 'Cooks & catering',
    work: 'Three kitchens quoted. A tasting before you commit to a plate rate.' },
  { id: 'priest',      work: 'Matched to your tradition and your muhurta, not just the nearest one.' },
  { id: 'dj',          work: 'A rig sized to your hall. Nobody sells you a wedding PA for sixty guests.' },
  { id: 'decor',       emoji: '🎨', label: 'Decor & florals',
    work: 'Three decorators on the same brief, so you compare looks at one price.' },
  { id: 'photography', work: 'Portfolios checked and dates confirmed before you ever meet them.' },
  { id: 'tent',        work: 'Measured against your actual space before anyone quotes for it.' },
  { id: 'av_setup',    work: 'Screens, mics and a run-through — the corporate half of the catalogue.' },
  { id: 'transport',   work: 'Guest lists turned into buses, with a pickup plan you can hand out.' },
]

/** Fold the data file over the list, so renames arrive here for free. */
function resolve(r) {
  const svc = SERVICE_BY_ID[r.id]
  return {
    key: r.id,
    emoji: svc?.emoji ?? r.emoji ?? '✨',
    name: svc?.name ?? r.label ?? r.id,
    work: r.work,
  }
}

export default function SourcingSlider({ className = '', to = '/plan#services-heading' }) {
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)
  const [aud, setAud] = useState(0)
  const [held, setHeld] = useState(false)
  const [onScreen, setOnScreen] = useState(false)
  const stage = useRef(null)

  const items = useMemo(() => RESOURCES.map(resolve), [])

  useEffect(() => {
    const el = stage.current
    if (!el || typeof IntersectionObserver === 'undefined') { setOnScreen(true); return }
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const running = !reduced && onScreen && !held

  useEffect(() => {
    if (!running) return
    const a = setInterval(() => setI(n => (n + 1) % items.length), RESOURCE_MS)
    const b = setInterval(() => setAud(n => (n + 1) % AUDIENCES.length), AUDIENCE_MS)
    return () => { clearInterval(a); clearInterval(b) }
  }, [running, items.length])

  if (reduced) return <Rail className={className} items={items} to={to} />

  const r = items[i % items.length]

  return (
    <section className={className} aria-labelledby="sourcing-heading">
      <div className="px-5">
        <h2 id="sourcing-heading" className="text-[19px] font-extrabold leading-tight tracking-tight text-ink">
          A purohit for Thursday. Or a launch for four hundred.
        </h2>
        <p className="mt-0.5 text-[12px] text-ink-mute">
          Individuals and businesses, one resource at a time — each one sourced on its own
          and quoted at what it actually costs this week.
        </p>
      </div>

      <div className="mt-3 px-4">
        <Link
          ref={stage}
          to={to}
          aria-label={`${r.name} — ${r.work}`}
          className="a-card relative block overflow-hidden rounded-3xl p-4 transition-transform active:scale-[0.99]"
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
          onPointerDown={() => setHeld(true)}
        >
          {/* Audience. Alternates on its own slower beat — the claim is that
              BOTH are served, which a pill that sits on one of them forever
              cannot make and a pill that flickers with the resource turns into
              noise. `aria-live` off: it is decorative repetition of the
              heading, and announcing it every five seconds is hostile. */}
          <div className="flex items-center justify-between gap-3">
            <span key={aud} className="ss-pill inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-accent ring-1 ring-accent/20">
              {AUDIENCES[aud]}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-mute">
              <Search size={11} strokeWidth={3} /> Sourced for you
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3.5">
            {/* The tile. Keyed on the resource so the slide replays. */}
            <span
              key={`tile-${r.key}`}
              aria-hidden="true"
              className="ss-slide ss-stagger-1 flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-2xl bg-accent/8 text-[30px] ring-1 ring-accent/15"
            >
              <span className="ss-drift">{r.emoji}</span>
            </span>

            <span className="min-w-0 flex-1">
              <span key={`name-${r.key}`} className="ss-slide ss-stagger-2 block text-[15px] font-extrabold leading-tight text-ink">
                {r.name}
              </span>
              {/* Two lines reserved, so the card does not change height when a
                  one-line claim follows a two-line one — a rail that resizes
                  every three seconds drags the whole page under the reader. */}
              <span key={`work-${r.key}`} className="ss-slide ss-stagger-3 mt-1 block min-h-[30px] text-[11.5px] font-medium leading-snug text-ink-mute">
                {r.work}
              </span>
            </span>

            <MarketScan seed={r.key} />
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-hairline/50 pt-3">
            {/* CATALOG_STATS.services, not the length of SERVICE_BY_ID. Both are
                real counts of different things — 30 priced rows in
                servicePricing, 57 catalogue entries in eventServicesData — and
                the second is the one IntroCards already publishes two panels
                below this. A customer scrolling past "8 of 30+" and then "57
                services" reads it as one of the two being wrong. */}
            <span className="text-[11px] font-medium text-ink-mute">
              {items.length} of {CATALOG_STATS.services} bookable on their own
            </span>
            <span className="inline-flex items-center gap-1 text-[11.5px] font-extrabold text-accent">
              Pick just one <ArrowRight size={12} strokeWidth={3} />
            </span>
          </div>

          {/* Position, as ticks. Same convention as the film's reel, at a
              smaller weight — this is a rail, not a story. */}
          <span aria-hidden="true" className="mt-3 flex gap-1">
            {items.map((it, n) => (
              <span
                key={it.key}
                className={`h-[2.5px] flex-1 rounded-full transition-colors duration-500 ${
                  n === i % items.length ? 'bg-accent/70' : 'bg-ink/10'
                }`}
              />
            ))}
          </span>
        </Link>
      </div>
    </section>
  )
}

/**
 * Three quotes and the range that falls out of them.
 *
 * Heights are derived from the resource key rather than random, so the same
 * resource always draws the same scan — a chart that re-rolls every time the
 * rail comes back around reads as decoration, which it then is. Derived rather
 * than authored because these are not real vendor quotes and must not look
 * like a figure anybody could act on; what is true is the SHAPE — three
 * unequal quotes, a spread, no rate card.
 */
function MarketScan({ seed }) {
  const bars = useMemo(() => {
    let h = 0
    for (let n = 0; n < seed.length; n++) h = (h * 31 + seed.charCodeAt(n)) >>> 0
    return [0, 1, 2].map(n => 44 + ((h >> (n * 5)) % 56))
  }, [seed])

  return (
    <span aria-hidden="true" className="relative flex h-[46px] w-[46px] shrink-0 items-end gap-1 overflow-hidden">
      {bars.map((pct, n) => (
        <span
          key={`${seed}-${n}`}
          className="ss-bar flex-1 rounded-t-[3px] bg-gradient-to-t from-accent/70 to-accent/25"
          style={{ height: `${pct}%`, animationDelay: `${0.08 + n * 0.09}s` }}
        />
      ))}
      <span className="ss-sweep pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </span>
  )
}

/**
 * Reduced motion: the rail, laid out and still.
 *
 * The claim is the range, so the fallback has to show more than one resource —
 * freezing this on slide one would say "we can book you a cook", which is the
 * opposite of the point.
 */
function Rail({ className = '', items, to }) {
  return (
    <section className={className} aria-labelledby="sourcing-heading">
      <div className="px-5">
        <h2 id="sourcing-heading" className="text-[19px] font-extrabold leading-tight tracking-tight text-ink">
          A purohit for Thursday. Or a launch for four hundred.
        </h2>
        <p className="mt-0.5 text-[12px] text-ink-mute">
          Individuals and businesses, one resource at a time — each one sourced on its own
          and quoted at what it actually costs this week.
        </p>
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-2.5 px-4">
        {items.map(r => (
          <li key={r.key}>
            <Link to={to} className="a-card flex h-full items-start gap-2.5 rounded-2xl p-3">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/8 text-[18px] ring-1 ring-accent/15">
                {r.emoji}
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-extrabold leading-tight text-ink">{r.name}</span>
                <span className="mt-0.5 block text-[10.5px] leading-snug text-ink-mute">{r.work}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
