import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import TradeGrid from '../../components/vendor/TradeGrid'
import { usePartnerStage } from '../../hooks/usePartnerStage'
import { fetchListings, ensureListing } from '../../lib/partnerListings'
import { queueTrades } from '../../lib/tradeQueue'

/**
 * What you offer — the 26 trades, as a decision rather than a dropdown.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY ROWS AND NOT THE GRID
 * ══════════════════════════════════════════════════════════════════════
 *
 * The compact two-up grid is right on the Listing tab, where a partner
 * who already knows their trade is going to one they have seen before.
 * It is wrong here. This is the screen where somebody decides what their
 * BUSINESS is on this platform, and "Decoration & Floral / 10 things" in
 * a half-width card does not tell them whether the mandap work they
 * actually do is inside it.
 *
 * So each trade gets a row and a line naming what is in it, read off the
 * catalogue. Same component, same search, same data — see TradeGrid's
 * `layout` prop.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PICKING FOUR TRADES DOES NOT MAKE FOUR ACCOUNTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * One partner, one profile, and one listing per trade underneath it.
 * Continue creates the container for each trade picked — idempotently,
 * so a double tap cannot make a second Photography — and then walks them
 * through the trades one at a time, because the listing flow asks about
 * ONE trade and always has.
 *
 * A trade they already have is not refused. It is marked, and tapping it
 * takes them to the listing that exists. §13: never a second one.
 */
export default function WhatYouOffer() {
  const navigate = useNavigate()
  /* ══════════════════════════════════════════════════════════════════
     AM I INSIDE ONBOARDING? ASK THE URL, NOT THE PATHNAME
     ══════════════════════════════════════════════════════════════════

     This used to read:

         const inSetup = pathname.startsWith('/partner/setup')

     which could never be true. `/partner/setup/services` routes to
     StepGate -> BusinessServicesStep; this component is mounted only at
     `/partner/services`. The comment above it described a "same
     component, two doors" arrangement that stopped existing the day
     step 1 became its own hub.

     The consequence was the whole onboarding loop: `inSetup` false ->
     no `&return=setup` -> `returnTo` null in VendorServiceList -> the
     questionnaire closed and left the partner standing on the dashboard
     that had been hosting it, with step 1 silently complete behind
     them. Exactly the failure the six-step redesign existed to prevent.

     An explicit parameter instead. It survives the hop, it is visible in
     the URL when something goes wrong, and it cannot quietly become
     false the next time routing moves. */
  const [params] = useSearchParams()
  const inSetup = params.get('from') === 'setup'
  const { account } = usePartnerStage()
  const vendorId = account?.vendor?.id ?? null

  const [q, setQ] = useState('')
  const [picked, setPicked] = useState([])
  const [have, setHave] = useState([])
  const [busy, setBusy] = useState(false)

  /* What they already have, so the rows can say so and Continue can skip
     making containers that exist. */
  useEffect(() => {
    let alive = true
    if (!vendorId) return
    fetchListings(vendorId).then(rows => {
      if (alive) setHave(rows.map(r => r.trade))
    })
    return () => { alive = false }
  }, [vendorId])

  const toggle = t => setPicked(p => (p.includes(t) ? p.filter(x => x !== t) : [...p, t]))

  /* Everything they will be walked through: what they ticked now, minus
     anything already set up — which they are taken to rather than asked
     to build again. */
  const fresh = useMemo(() => picked.filter(t => !have.includes(t)), [picked, have])

  async function onContinue() {
    if (!picked.length || busy) return
    setBusy(true)
    try {
      /* Containers first, for every trade — including the ones they
         already have, which upsert to the same row. Doing this before
         navigating means the trade exists as an object the moment they
         are looking at its questions, so leaving halfway leaves
         something to come back to. */
      for (const trade of picked) await ensureListing(vendorId, trade)

      const queue = fresh.length ? fresh : picked
      queueTrades(queue)

      /* ── No vendors row yet, on purpose ─────────────────────────────
         §59 puts "what you offer" before "partner details", and that is
         the right order for the partner: choosing the work is the part
         they came to do, and a name-and-pincode form is the part they
         tolerate. But a container is a row with a foreign key to
         `vendors`, and that row is not written until the details form
         is submitted.

         So the picks are held in the queue — which is exactly what the
         queue is for — and the details form runs next, ending at the
         first trade's questions. Nothing is lost and nothing is written
         against a partner who does not exist yet. */
      if (!vendorId) { navigate('/partner/setup'); return }

      /* ── Where the trade flow hands back ────────────────────────────
         During onboarding this screen is step 1s sub-flow, so the
         questionnaire must return to the Business and Services hub —
         not to the dashboard, which is what taught partners that
         finishing one trade finished everything. The marker rides in
         the URL so the dashboard tab that hosts the flow knows where
         to send them back to. */
      const back = inSetup ? '&return=setup' : ''
      navigate(`/dashboard/vendor?tab=list&start=${encodeURIComponent(queue[0])}${back}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="native-screen flex flex-col bg-white">
      <div className="safe-top px-5 pt-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink/70"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5">
        <h1 className="text-[clamp(1.35rem,6vw,1.7rem)] font-extrabold leading-tight tracking-tight text-plum-950">
          What you offer
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink/70">
          Select the services you provide on Sambramo.
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55">
          You can select more than one. Each one opens its own setup, and each
          becomes a single listing under your account.
        </p>

        <div className="mt-4 pb-4">
          <TradeGrid
            q={q} setQ={setQ}
            layout="rows"
            selected={picked}
            disabledTrades={have}
            onPick={toggle}
            placeholder="Search trades or services"
          />
        </div>
      </div>

      <div className="safe-cta border-t border-ink/[0.06] px-5 pt-3">
        <p className="mb-2 text-center text-[12.5px] font-bold text-ink-mute">
          {picked.length
            ? `${picked.length} service${picked.length === 1 ? '' : 's'} selected`
            : 'Pick at least one to continue'}
        </p>
        <button
          type="button"
          disabled={!picked.length || busy}
          onClick={onContinue}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full
                     bg-gradient-to-r from-plum-700 to-plum-500 text-[15.5px] font-extrabold
                     text-white transition active:scale-[0.99] disabled:opacity-40"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          Continue &rarr;
        </button>
      </div>
    </div>
  )
}
