import { useState, useEffect } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import {
  CalendarCheck, CalendarSearch, CalendarPlus,
  ArrowRight, Phone, SearchX,
} from 'lucide-react'
import { BRAND } from '../../config/sambramo'
import { occasionMeta } from '../../data/occasionMap'
import { slotByKey } from '../../lib/demand'
import { humanDate } from '../../utils/format'
import { OCCASIONS } from '../../data/planCatalog'
import { useCart } from '../../context/CartContext'
import { useCity } from '../../context/CityContext'
import { useEventDate, setEventDate, clearEventDate } from '../../hooks/useEventDate'
import EventDateSheet from '../../components/plan/EventDateSheet'
import PlanAppBar from '../../components/plan/PlanAppBar'
import ServiceShelf from '../../components/plan/ServiceShelf'
import PerksDeck from '../../components/plan/PerksDeck'
import PromiseTicker from '../../components/plan/PromiseTicker'
import OffersRail from '../../components/shop/OffersRail'
import OccasionCard from '../../components/home/OccasionCard'
import TierRail from '../../components/home/TierRail'
import { usePublicOffers, bestOfferFor } from '../../hooks/usePublicOffers'

/**
 * The plan hub — everything Sambramo can be asked for, on one screen.
 *
 * ── What was here before, and why it went ──────────────────────────────
 * A chooser: two big cards asking "how would you like to plan?" — concierge or
 * self-serve — later joined by a third for the price builder. Three doors, all
 * described in process terms ("tell us and we call back", "browse the
 * catalogue", "build the menu"), presented to somebody who had just tapped
 * "Plan a celebration" and wanted to plan a celebration.
 *
 * That is a question about *our* internal workflow, asked before we have shown
 * a single thing we sell. A customer arriving with "my daughter turns five in
 * three weeks" cannot answer it, because the answer depends on prices and
 * options they have not been shown yet. So the page put a decision in front of
 * the funnel and gave nothing back for making it.
 *
 * The rule now is the opposite: **show the goods, let the door follow.** The
 * occasion grid, the individual services and the scale ladder are all visible
 * without choosing anything, and each of them lands in the right flow on its
 * own. Nobody has to know what "concierge" means to use this page.
 *
 * ── The four things it shows ───────────────────────────────────────────
 *   Occasions   all 15, cheapest entry first, each with its real "from" price
 *   Services    the ~39 individual services — book one cook, not a package.
 *               This is new; they were previously reachable only *through* an
 *               occasion, so a customer who wanted one thing had no door.
 *   Scale       the celebration tiers, which existed in data and in the
 *               builder but were never shown to anyone deciding
 *   Perks       live coupons, referral, and the Bandhu membership
 *
 * It keeps its own app bar (see PlanAppBar) rather than the marketing chrome,
 * which is what made this page feel like a different website mid-journey.
 */

const DRAFT_KEY = 'sambramo_plan_draft'

export default function PlanHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { totalCount, cartPath } = useCart()
  const { city, chosen } = useCity()
  const offers = usePublicOffers()
  const [query, setQuery] = useState('')
  const [dateSheetOpen, setDateSheetOpen] = useState(false)

  const meta = occasionMeta(searchParams.get('type'), searchParams.get('festival'))

  /**
   * The date, from whichever of the two places has it.
   *
   * The URL wins because it is the more specific statement — somebody who
   * followed a link with a date on it means *that* date. Otherwise the shared
   * store answers, so arriving here from anywhere else in the app still shows
   * the day already chosen instead of asking a third time.
   */
  const saved = useEventDate()
  const urlDate = searchParams.get('date')
  const picked = urlDate
    ? { event_date: urlDate, time_slot: searchParams.get('slot') || '' }
    : saved

  const pickedDate = humanDate(picked?.event_date)
  const pickedSlot = slotByKey(picked?.time_slot)?.label ?? null

  // Forward the date into the wizard even when it came from the store rather
  // than the link, so step 2 opens on it.
  const wizardParams = new URLSearchParams(searchParams)
  if (picked?.event_date) {
    wizardParams.set('date', picked.event_date)
    if (picked.time_slot) wizardParams.set('slot', picked.time_slot)
  }
  const wizardHref = '/plan/custom' + (wizardParams.toString() ? `?${wizardParams}` : '')

  const [hasDraft] = useState(() => {
    try { return !!sessionStorage.getItem(DRAFT_KEY) } catch { return false }
  })

  // A date arriving on the link is a choice like any other — remember it, so
  // the home card and the wizard's calendar both open on it afterwards.
  useEffect(() => {
    if (urlDate && urlDate !== saved?.event_date) {
      setEventDate({ event_date: urlDate, time_slot: searchParams.get('slot') || '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlDate])

  function handlePickedDate(next) {
    setEventDate(next)
    const params = new URLSearchParams(searchParams)
    params.set('date', next.event_date)
    if (next.time_slot) params.set('slot', next.time_slot)
    else params.delete('slot')
    setSearchParams(params, { replace: true })
  }

  // Not a dead end: dropping the date leaves the page exactly as it was for
  // somebody who has not picked one yet, and the wizard will ask later.
  function forgetDate() {
    clearEventDate()
    const params = new URLSearchParams(searchParams)
    params.delete('date')
    params.delete('slot')
    setSearchParams(params, { replace: true })
  }

  // An escape hatch for ad landing pages that want to skip straight to the form.
  if (searchParams.get('go') === 'custom') return <Navigate to={wizardHref} replace />

  const q = query.trim().toLowerCase()
  const searching = q.length >= 2
  const matchedOccasions = searching
    ? OCCASIONS.filter(o =>
        o.name.toLowerCase().includes(q) || o.tagline?.toLowerCase().includes(q)
      )
    : OCCASIONS

  return (
    <div className="home-canvas min-h-screen pb-bottom-nav">
      <PlanAppBar query={query} onQueryChange={setQuery} />

      <div className="mx-auto max-w-3xl space-y-8 pb-32 pt-4">

        {/* ── Unfinished business ───────────────────────────────────── */}
        {(hasDraft || totalCount > 0) && (
          <div className="px-4">
            <Link
              to={hasDraft ? wizardHref : cartPath}
              className="flex items-center gap-3 rounded-2xl bg-saffron-400 px-4 py-3 text-plum-950"
            >
              <span className="min-w-0 flex-1 text-[13px] font-extrabold leading-tight">
                {hasDraft
                  ? 'You have a half-finished request — pick up where you left off'
                  : `${totalCount} ${totalCount === 1 ? 'service' : 'services'} waiting in your cart`}
              </span>
              <ArrowRight size={16} className="shrink-0" />
            </Link>
          </div>
        )}

        {/* ── The welcome ──────────────────────────────────────────────
            Names the customer's situation back to them. Everything that used
            to follow the headline in prose — the catalogue size, the entry
            price, and the three promises that reduce hesitation — is in the
            moving strip below it now (see PromiseTicker), which says the same
            seven things in a fifth of the height and gets the occasion grid
            above the fold on a phone. */}
        <header className="px-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-saffron-300">
            {meta.known ? `Planning ${meta.label?.toLowerCase()}` : 'Tell us the occasion'}
          </p>
          <h1 className="mt-1.5 font-serif text-[26px] font-bold leading-tight text-white sm:text-3xl">
            {meta.known
              ? `Let's make this ${meta.label?.toLowerCase()} yours.`
              : "What are we celebrating?"}
          </h1>

          {/* Full-bleed inside a padded header: the strip has to reach both
              screen edges or cards appear to spawn 16px in from nowhere,
              which is the one thing that makes a ticker look broken. */}
          <PromiseTicker city={chosen ? city : null} className="-mx-4 mt-3" />

          {/* ── The date, and the way out of it ────────────────────────
              Somebody who picked their date on the home screen arrives here
              to a question about something else. Without this the date looks
              discarded and they pick it again inside the wizard.

              The two buttons are the point: a date shown with no way to
              change it reads as a commitment made on the customer's behalf,
              and the ones who are not sure yet — most of them — stall here
              rather than carry on. Both ways out are one tap, and neither
              costs them the rest of the page. */}
          {pickedDate ? (
            <div className="mt-3 rounded-2xl bg-teal-400/10 p-3 ring-1 ring-teal-300/30">
              <p className="flex items-center gap-2 text-[12px] leading-tight text-white/85">
                <CalendarCheck size={15} className="shrink-0 text-teal-300" />
                <span>
                  <span className="font-extrabold text-white">{pickedDate}</span>
                  {pickedSlot ? ` · ${pickedSlot}` : ''} saved
                  <span className="text-white/55"> — now pick what we're celebrating.</span>
                </span>
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDateSheetOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-teal-400 px-3 py-1.5 text-[11px] font-extrabold text-plum-950"
                >
                  <CalendarSearch size={12} /> Change or compare dates
                </button>
                <button
                  type="button"
                  onClick={forgetDate}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/75 ring-1 ring-white/15"
                >
                  I'll decide the date later
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDateSheetOpen(true)}
              className="mt-3 flex w-full items-center gap-2.5 rounded-2xl bg-white/5 px-3 py-2.5 text-left ring-1 ring-white/15 transition-colors hover:bg-white/10"
            >
              <CalendarPlus size={16} className="shrink-0 text-teal-300" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-extrabold text-white">
                  Have a date in mind?
                </span>
                <span className="block text-[11px] leading-tight text-white/55">
                  Check it in the calendar — every date is open, and telling us early
                  is what lets us hold the Masters.
                </span>
              </span>
              <ArrowRight size={14} className="shrink-0 text-white/30" />
            </button>
          )}

        </header>

        {/* Live coupons — the same rail the storefront runs, so an offer is
            advertised identically on both halves of the business. */}
        <OffersRail />

        {/* ── Occasions ─────────────────────────────────────────────── */}
        <section aria-labelledby="occasions-heading">
          <div className="px-4">
            <h2 id="occasions-heading" className="text-[17px] font-extrabold text-white">
              Plan a full celebration
            </h2>
            <p className="mt-1 text-[12px] text-white/60">
              Pick the occasion — we'll show you what it includes and what it costs.
            </p>
          </div>

          {matchedOccasions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <SearchX size={26} className="mx-auto text-white/30" />
              <p className="mt-2 text-sm text-white/55">
                No occasion matches “{query}” — try the services below.
              </p>
            </div>
          ) : (
            // The same card the home screen uses. One occasion should not look
            // like two different products depending on which screen you met it
            // on.
            <div className="mt-3 grid grid-cols-2 gap-3 px-4">
              {matchedOccasions.map((o, i) => (
                <OccasionCard
                  key={o.id}
                  occasion={o}
                  offer={bestOfferFor(o.fromPrice, offers)}
                  stagger={i * 260}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Individual services — the door that never existed ─────── */}
        <ServiceShelf query={query} />

        {/* ── Scale ─────────────────────────────────────────────────────
            The same rail the home screen runs, rather than a second, poorer
            copy of it. This section used to render its own tier cards —
            emoji, name, guest band — which meant the ladder appeared twice in
            the app in two different designs, and only one of them carried the
            photographs, the floor price and the coordination percentage. */}
        <TierRail offer={bestOfferFor(50000, offers)} />

        {/* ── Perks ─────────────────────────────────────────────────── */}
        <PerksDeck />

        {/* ── Hand it over ──────────────────────────────────────────────
            Last, not first. This is the highest-commitment action on the page
            and it converts far better after somebody has seen the prices,
            the services and the scale than it did as one of three doors
            shown before anything else. */}
        <section className="px-4">
          <div className="rounded-3xl bg-gradient-to-br from-plum-700 to-berry-700 p-5 ring-1 ring-white/10">
            <h2 className="font-serif text-[20px] font-bold leading-tight text-white">
              Or just tell us, and we'll take it from here.
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/70">
              Six questions, about two minutes. A coordinator reads it, sources the
              vendors, negotiates, and comes back with one proposal and one price.
              You approve it before anything is booked.
            </p>
            <Link
              to={wizardHref}
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-4 py-3.5 text-[14px] font-extrabold text-plum-950 transition-transform active:scale-[0.98]"
            >
              Tell us what you're planning <ArrowRight size={16} />
            </Link>

            <a
              href={`tel:${BRAND.supportPhone.replace(/\s/g, '')}`}
              className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-[13px] font-bold text-white ring-1 ring-white/15"
            >
              <Phone size={14} /> Prefer to talk? {BRAND.supportPhone}
            </a>
          </div>
        </section>
      </div>

      {/* The same calendar the home screen opens — one date picker in the
          app, so what it says about a date cannot depend on where you met
          it. */}
      <EventDateSheet
        open={dateSheetOpen}
        onClose={() => setDateSheetOpen(false)}
        city={chosen ? city : null}
        value={picked}
        onConfirm={handlePickedDate}
      />
    </div>
  )
}
