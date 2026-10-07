import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import TradeGrid from '../../components/vendor/TradeGrid'
import { usePartnerStage } from '../../hooks/usePartnerStage'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { fetchListings, ensureListing } from '../../lib/partnerListings'
import { ensureVendorRow } from '../../lib/ensureVendor'
import { queueTrades } from '../../lib/tradeQueue'

/**
 * What you offer — the 26 trades, as a decision rather than a dropdown.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY TWO-UP VISUAL CARDS
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
  const { account, loading: stageLoading } = usePartnerStage()
  const { user, profile } = useAuth()
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
      /* ── Never decide "no partner yet" from a hook still loading ─────
         vendorId is null until usePartnerStage's query returns. A tap on
         Continue inside that window took the no-vendor branch below and
         sent a partner who HAS a vendors row back to /partner/setup --
         reported as "after selecting Anchor & MC it goes back to step 1".
         Ask the database directly when the hook has not answered yet. */
      let vid = vendorId
      if (!vid && user?.id) {
        const { data } = await supabase
          .from('vendors').select('id').eq('profile_id', user.id).maybeSingle()
        vid = data?.id ?? null
      }

      // The picker is also reachable directly from More/My Services. Do not
      // send a partner back to setup just because the vendor row is still
      // being created. Create/resolve it once, then create the listing
      // containers against that real vendor.
      if (!vid && profile) {
        const ensured = await ensureVendorRow({ profile })
        vid = ensured?.vendor?.id ?? ensured?.id ?? null
      }

      if (!vid) throw new Error('We could not prepare your partner profile. Please try again.')

      for (const trade of picked) await ensureListing(vid, trade)

      const queue = fresh.length ? fresh : picked
      queueTrades(queue)

      /* A real vendor now always exists before the listing containers are
         created. The old no-vendor branch could navigate back to setup
         after a perfectly valid service selection, which looked like the
         first-service button had done nothing. */

      /* ── Where the trade flow hands back ────────────────────────────
         During onboarding this screen is step 1s sub-flow, so the
         questionnaire must return to the Business and Services hub —
         not to the dashboard, which is what taught partners that
         finishing one trade finished everything. The marker rides in
         the URL so the dashboard tab that hosts the flow knows where
         to send them back to. */
      const back = inSetup ? '&return=setup' : ''

      // Anchor & MC has a controlled trade-specific setup. Do not send it
      // through the generic service questionnaire: the partner needs the
      // standardized Anchor/MC templates, language/event fields, durations,
      // add-ons and Instant Book vs Quote rules on the trade contract.
      if (picked.length === 1 && picked[0] === 'Anchor & MC') {
        navigate('/partner/setup/anchor-mc')
        return
      }

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
            layout="grid"
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
          disabled={!picked.length || busy || stageLoading}
          onClick={onContinue}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full
                     bg-gradient-to-r from-plum-700 to-plum-500 text-[15.5px] font-extrabold
                     text-white transition active:scale-[0.99] disabled:opacity-40"
        >
          {(busy || stageLoading) && <Loader2 size={16} className="animate-spin" />}
          Continue &rarr;
        </button>
      </div>
    </div>
  )
}
