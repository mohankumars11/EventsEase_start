import { useState, useMemo, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, ShoppingBag, Search, X, ShieldCheck, Clock, BadgeIndianRupee,
  SlidersHorizontal, SearchX, ArrowRight, Phone, Sparkles,
} from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { useCity } from '../../context/CityContext'
import { useEventDate, setEventDate } from '../../hooks/useEventDate'
import { BRAND } from '../../config/sambramo'
import { resolveService, cartLineFor, isBookable } from '../../data/singleService'
import { TOP_SERVICES } from '../../data/planCatalog'
import { packCost, defaultPackQty, SERVICE_PACKS } from '../../data/servicePacks'
import { themeCost, searchThemes } from '../../data/decorThemes'
import { formatINR } from '../../utils/format'
import OptionArt from '../../components/service/OptionArt'
import EventScaleBar from '../../components/service/EventScaleBar'
import ThemeCard from '../../components/service/ThemeCard'
import ThemeSheet from '../../components/service/ThemeSheet'
import PackCard from '../../components/service/PackCard'
import MenuComposer from '../../components/service/MenuComposer'
import GoesWithRail from '../../components/service/GoesWithRail'
import BookBar from '../../components/service/BookBar'
import EventDateSheet from '../../components/plan/EventDateSheet'

/**
 * One service, bought end to end.
 *
 * ── The bug this page is ────────────────────────────────────────────────
 * The plan hub's "Need just one thing?" shelf did the hardest part right — it
 * put all ~39 services on one screen and said "pick a single service and we'll
 * arrange only that". Then tapping one selected a chip, and the only button
 * under the grid threw you into /plan/custom: the six-step celebration wizard,
 * which opens by asking what occasion you are planning.
 *
 * So the answer to "I just want a decorator" was a form about your wedding.
 * Every promise on that shelf was undone by its only exit, and the customer who
 * came for one thing left without seeing a single decoration, dish or price.
 *
 * ── What replaces it ────────────────────────────────────────────────────
 * A shop page. Tell us how big it is, look at the actual options — eighty
 * decoration setups, sixteen cuisines with every dish, three to five packages
 * per service — each priced at *your* size, and add one to the cart. There is
 * no redirect anywhere in the flow. The coordinator still confirms before
 * anything is booked, but they confirm a choice the customer already made
 * rather than extracting it over the phone.
 *
 * Three bodies, one frame: décor (the setup catalogue), menu (the cuisine
 * builder) and packs (priced packages). Which one a service gets is decided in
 * data/singleService.js, not here.
 */

const DEFAULT_GUESTS = 100

export default function ServiceDetail() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const { dispatch, hasItem, getEventDetails, cartCount, cartPath } = useCart()
  const { city, chosen } = useCity()
  const savedDate = useEventDate()
  const toast = useToast()

  const resolved = useMemo(() => resolveService(serviceId), [serviceId])

  const [guestCount, setGuestCount] = useState(DEFAULT_GUESTS)
  const [scaleId, setScaleId] = useState('standard')
  const [familyId, setFamilyId] = useState('all')
  const [query, setQuery] = useState('')
  const [openTheme, setOpenTheme] = useState(null)
  const [selectedTheme, setSelectedTheme] = useState(null)
  const [selectedPack, setSelectedPack] = useState(null)
  const [packQty, setPackQty] = useState({})
  const [menuConfig, setMenuConfig] = useState(null)
  const [dateSheetOpen, setDateSheetOpen] = useState(false)
  // The add that is waiting on a date. See handleAdd.
  const [pendingAdd, setPendingAdd] = useState(null)

  // Arriving at a different service must not inherit the last one's choices —
  // a balloon arch selected on the previous page has no meaning on this one.
  useEffect(() => {
    setSelectedTheme(null)
    setSelectedPack(null)
    setOpenTheme(null)
    setPackQty({})
    setMenuConfig(null)
    setFamilyId('all')
    setQuery('')
  }, [serviceId])

  const eventId = resolved ? `single-${resolved.service.id}` : null

  /**
   * What the customer has currently configured, as one shape.
   *
   * Every body type reduces to the same four things — an option id, its name, a
   * price and the lines a human should read — so the sticky bar, the cart line
   * and the enquiry note are written once rather than three times.
   */
  const selection = useMemo(() => {
    if (!resolved) return null

    if (resolved.kind === 'decor' && selectedTheme) {
      const cost = themeCost(selectedTheme, scaleId, guestCount)
      return {
        optionId: selectedTheme.id,
        optionName: selectedTheme.name,
        price: cost.total,
        label: selectedTheme.name,
        detail: `${cost.scale.name} · ${guestCount} guests · installation ${formatINR(cost.installation)}`,
        summary: [`${selectedTheme.name} — ${cost.scale.name.toLowerCase()}, ${guestCount} guests`],
      }
    }

    if (resolved.kind === 'packs' && selectedPack) {
      const qty = packQty[selectedPack.id] ?? defaultPackQty(selectedPack, guestCount)
      const price = packCost(selectedPack, guestCount, qty)
      return {
        optionId: selectedPack.id,
        optionName: selectedPack.name,
        price,
        qty,
        label: selectedPack.name,
        detail: selectedPack.unit === 'guest'
          ? `${formatINR(selectedPack.price)} per guest × ${guestCount}`
          : selectedPack.unit === 'unit'
            ? `${qty} × ${formatINR(selectedPack.price)} per ${selectedPack.unitLabel ?? 'unit'}`
            : 'One price for the event',
        summary: [
          `${selectedPack.name}${selectedPack.unit === 'unit' ? ` × ${qty}` : ''}`,
          ...selectedPack.includes,
        ],
      }
    }

    if (resolved.kind === 'menu' && menuConfig?.total > 0) {
      return {
        optionId: menuConfig.cuisine.id,
        optionName: `${menuConfig.cuisine.name}${menuConfig.vegOnly ? ' (pure veg)' : ''}`,
        price: menuConfig.total,
        label: `${menuConfig.cuisine.name} — ${guestCount} plates`,
        detail: `${formatINR(menuConfig.perPlate)} per plate × ${guestCount} guests`,
        summary: menuConfig.summary,
      }
    }

    return null
  }, [resolved, selectedTheme, selectedPack, packQty, menuConfig, scaleId, guestCount])

  const alreadyAdded = !!(selection && eventId && hasItem(eventId, `${resolved.service.id}:${selection.optionId}`))

  /**
   * Adding to the cart. One step, no gate, no form.
   *
   * ── What was here, and why it was broken ────────────────────────────
   * Pressing "Add to cart" used to open a four-field modal (date, time, guest
   * count, location) and then, on confirm, throw a signed-out visitor to
   * /login. Both halves failed:
   *
   *   · the modal re-asked the guest count that had just driven every price on
   *     the screen, and the city shown in the app bar two inches above it;
   *   · and the login redirect landed *after* the customer had filled the form
   *     — so the observable behaviour of pressing "Add to cart" was that the
   *     page threw away their work and showed them a sign-in screen. Which is
   *     indistinguishable from a button that does not work.
   *
   * The cart has always worked signed-out — CartContext writes to localStorage
   * immediately and only syncs to Supabase when there is a user — so the gate
   * was protecting nothing. It is gone, the services cart is public, and
   * sign-in is asked at send, where there is something to save.
   *
   * The details go with it automatically: the guest count is the one on screen,
   * the city is the one in CityContext, and the date is the shared one every
   * calendar in the app already reads (hooks/useEventDate). Nothing that is
   * already known is asked for again. What is genuinely missing — the venue
   * address, a phone number, the access constraints — is collected once, in
   * the cart, on the way to sending. See BookingSheet.
   *
   * ── `picked` ────────────────────────────────────────────────────────
   * The date the customer has just chosen in the sheet, when there is one. It
   * has to be passed rather than read from the shared store: the store is
   * written a moment earlier in the same tick, and this closure still holds the
   * value from the render that created it — so reading `savedDate` here would
   * attach `null` to the very add the sheet was opened to unblock.
   */
  const commitAdd = useCallback((sel, picked) => {
    if (!resolved) return

    const line = cartLineFor({
      service: resolved.service,
      optionId: sel.optionId,
      optionName: sel.optionName,
      price: sel.price,
      summary: sel.summary,
      qty: sel.qty ?? 1,
    })

    // Everything we already know, carried without asking. `details` is what the
    // cart shows as the event header and what the enquiry row is built from;
    // partial is fine, and the cart asks for the rest before it will send.
    const details = {
      ...(getEventDetails(eventId) ?? {}),
      guestCount,
      date: picked?.event_date ?? savedDate?.event_date ?? getEventDetails(eventId)?.date ?? null,
      slot: picked?.time_slot ?? savedDate?.time_slot ?? null,
      location: getEventDetails(eventId)?.location
        ?? (chosen && city?.name ? { city: city.name, area: '' } : null),
    }

    dispatch({ type: 'ADD_SERVICE', ...line, details })
    toast.success(`Added — ${sel.optionName}, ${formatINR(sel.price)}`)
  }, [resolved, eventId, getEventDetails, guestCount, savedDate, chosen, city, dispatch, toast])

  /**
   * The one thing that is asked for, if it is not already known: the date.
   *
   * Everything else this page needs it already has — the guest count is on
   * screen, the city is in CityContext, the service is the page. The date is
   * the single fact a coordinator cannot proceed without, and it was the one
   * thing an add could carry as `null`: the line landed in the cart, the
   * enquiry was built from it, and the first follow-up call was spent asking
   * what day the event was.
   *
   * Gating it here rather than at send is the deliberate part. The cart does
   * still refuse to send without a date, so nothing broken ever reached a
   * coordinator — but a customer who adds four services and only then meets
   * the question has to answer it with the page they chose them on already
   * gone. Asking at the first add costs one sheet, once, and everything after
   * it in the session is already answered.
   *
   * The pending selection is held while the sheet is open so that confirming
   * the date completes the add the customer actually pressed. Dropping it and
   * making them press Add again is how a gate turns into a dead end.
   */
  const handleAdd = useCallback(sel => {
    if (!sel || !eventId) return
    if (!savedDate?.event_date) {
      setPendingAdd(sel)
      setDateSheetOpen(true)
      return
    }
    commitAdd(sel)
  }, [eventId, savedDate, commitAdd])

  /* ── Not in the catalogue ──────────────────────────────────────── */
  if (!resolved) {
    return (
      <div className="home-canvas flex min-h-screen items-center justify-center px-4">
        <div className="home-glass max-w-sm p-8 text-center">
          <div className="mb-3 text-5xl">🤔</div>
          <h2 className="text-lg font-extrabold text-ink">We don’t offer that yet</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-mute">
            Nothing in the catalogue matches “{serviceId}”.
          </p>
          <Link
            to="/plan"
            className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-saffron-400 px-4 py-2.5 text-[13px] font-extrabold text-plum-950"
          >
            See everything we do <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    )
  }

  const { service, kind } = resolved

  /* ── The décor grid, filtered ──────────────────────────────────── */
  const themes = kind === 'decor'
    ? (query.trim().length >= 2
        ? searchThemes(query).filter(t => resolved.themes.some(rt => rt.id === t.id))
        : familyId === 'all'
          ? resolved.themes
          : resolved.themes.filter(t => t.family === familyId))
    : []

  /** Services people book alongside this one. The rail is the cross-sell. */
  const alsoBooked = TOP_SERVICES
    .filter(s => s.id !== service.id && isBookable(s.id))
    .filter(s => s.category === service.category || (SERVICE_PACKS[s.id]?.packs?.some(p => p.popular)))
    .slice(0, 8)

  return (
    <div className="home-canvas min-h-screen pb-bottom-nav">
      {/* ── The bar ────────────────────────────────────────────────── */}
      <header className="home-appbar sticky top-0 z-40 pt-safe backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 pb-3 pt-3">
          <button
            onClick={() => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/services'))}
            aria-label="Back"
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors active:bg-surface-sunk/[0.07]"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-extrabold leading-tight text-ink">
              {service.emoji} {service.name}
            </p>
            <p className="truncate text-[10.5px] text-ink-mute">
              Book it on its own{chosen && city?.name ? ` · ${city.name}` : ''}
            </p>
          </div>
          <Link
            to={cartPath}
            aria-label={`Cart, ${cartCount} items`}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunk/[0.07] text-ink ring-1 ring-hairline/10"
          >
            <ShoppingBag size={18} />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-saffron-400 px-1 text-[10px] font-extrabold text-plum-950 ring-2 ring-plum-950">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 pb-44 pt-4">
        {/* ── The hero ──────────────────────────────────────────────── */}
        <section className="px-4">
          <div className="home-card overflow-hidden">
            <OptionArt
              tint={heroTint(service.category)}
              emoji={service.emoji}
              height={104}
              seed={service.name.length}
            >
              <div className="absolute bottom-2.5 left-3.5 right-16">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/80">
                  {service.category} · single service
                </p>
                <h1 className="font-serif text-[22px] font-bold leading-tight text-white drop-shadow-sm">
                  {service.name}
                </h1>
              </div>
            </OptionArt>

            <div className="p-4">
              <p className="text-[12.5px] leading-relaxed text-gray-600">{resolved.blurb}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {resolved.optionCount > 0 && (
                  <Stat icon={SlidersHorizontal} label={`${resolved.optionCount} ${resolved.optionNoun}`} />
                )}
                {resolved.from != null && (
                  <Stat
                    icon={BadgeIndianRupee}
                    label={`from ${formatINR(resolved.from)}${resolved.fromUnit ? ` ${resolved.fromUnit}` : ''}`}
                    accent
                  />
                )}
                <Stat icon={ShieldCheck} label="No advance to enquire" />
                <Stat icon={Clock} label="Coordinator replies same day" />
              </div>

              {resolved.unitHint && (
                <p className="mt-2.5 rounded-xl bg-gray-50 px-3 py-2 text-[11px] leading-snug text-gray-500 ring-1 ring-gray-100">
                  {resolved.unitHint}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── How big is it, and when ────────────────────────────────
            Both live here rather than in a modal after the decision. The
            guest count drives every price on the page, and the date is the
            shared one every calendar in the app reads — so asking here means
            never asking again, and never asking for something we already
            have. */}
        <EventScaleBar
          guestCount={guestCount}
          onGuests={setGuestCount}
          scaleId={scaleId}
          onScale={setScaleId}
          showScale={kind === 'decor'}
          perGuestMatters={kind !== 'packs' || resolved.packs.some(p => p.unit === 'guest')}
          pickedDate={savedDate}
          onPickDate={() => setDateSheetOpen(true)}
        />

        {/* ══════════════ DÉCOR ══════════════ */}
        {kind === 'decor' && (
          <>
            <section className="px-4">
              <h2 className="text-[15px] font-extrabold text-ink">
                Pick your setup
              </h2>
              <p className="mt-0.5 text-[11.5px] text-ink-mute">
                Every price below is for {guestCount} guests at the scale you chose. Tap one
                to see exactly what gets installed.
              </p>

              <div className="relative mt-2.5">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  type="search"
                  placeholder="Search — haldi, mandap, jungle, marigold, Kerala…"
                  className="h-10 w-full rounded-2xl bg-white pl-9 pr-9 text-[13px] font-medium text-gray-900 outline-none ring-2 ring-transparent placeholder:text-gray-400 focus:ring-saffron-400"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    aria-label="Clear"
                    className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-gray-500"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </section>

            {/* Family chips — how a customer narrows eighty setups down. */}
            {!query && resolved.families.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
                <button
                  onClick={() => setFamilyId('all')}
                  className={`home-chip ${
                    familyId === 'all'
                      ? 'bg-saffron-400 text-plum-950'
                      : 'bg-surface-sunk/[0.07] text-ink-soft ring-1 ring-hairline/10'
                  }`}
                >
                  ✨ All {resolved.themes.length}
                </button>
                {resolved.families.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFamilyId(f.id)}
                    className={`home-chip ${
                      familyId === f.id
                        ? 'bg-saffron-400 text-plum-950'
                        : 'bg-surface-sunk/[0.07] text-ink-soft ring-1 ring-hairline/10'
                    }`}
                  >
                    {f.emoji} {f.label}
                    <span className="opacity-60">{(resolved.themes.filter(t => t.family === f.id)).length}</span>
                  </button>
                ))}
              </div>
            )}

            {familyId !== 'all' && !query && (
              <p className="px-4 text-[11.5px] leading-snug text-ink-mute">
                {resolved.families.find(f => f.id === familyId)?.blurb}
              </p>
            )}

            <section className="px-4">
              {themes.length === 0 ? (
                <div className="py-10 text-center">
                  <SearchX size={26} className="mx-auto text-ink-mute" />
                  <p className="mt-2 text-sm text-ink-mute">
                    Nothing matches “{query}”. Try “mandap”, “balloon” or “marigold”.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {themes.map((theme, i) => (
                    <ThemeCard
                      key={theme.id}
                      theme={theme}
                      scaleId={scaleId}
                      guestCount={guestCount}
                      selected={selectedTheme?.id === theme.id}
                      index={i}
                      onSelect={t => { setSelectedTheme(t); setOpenTheme(t) }}
                    />
                  ))}
                </div>
              )}

              {resolved.showAllLink && (
                <Link
                  to="/service/decor"
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-surface-sunk/[0.06] px-4 py-3 text-[12.5px] font-bold text-ink-soft ring-1 ring-hairline/10"
                >
                  <Sparkles size={13} /> See all decoration setups
                </Link>
              )}
            </section>
          </>
        )}

        {/* ══════════════ MENU ══════════════ */}
        {kind === 'menu' && (
          <MenuComposer
            guestCount={guestCount}
            courseFilter={resolved.courseFilter}
            onChange={setMenuConfig}
          />
        )}

        {/* ══════════════ PACKAGES ══════════════ */}
        {kind === 'packs' && (
          <section className="px-4">
            <h2 className="text-[15px] font-extrabold text-ink">Choose a package</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-mute">
              Priced for {guestCount} guests. Everything listed on a card is what actually
              gets delivered — nothing is held back for a phone call.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {resolved.packs.map((pack, i) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  guestCount={guestCount}
                  index={i}
                  selected={selectedPack?.id === pack.id}
                  qty={packQty[pack.id]}
                  onSelect={p => setSelectedPack(p)}
                  onQty={(p, n) => {
                    setPackQty(q => ({ ...q, [p.id]: n }))
                    setSelectedPack(p)
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* ══════════════ NOT YET PRICED ══════════════ */}
        {kind === 'enquiry' && (
          <section className="px-4">
            <div className="home-card p-5">
              <h2 className="text-[15px] font-extrabold text-gray-900">
                This one is still quoted by hand
              </h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-600">
                We have not published fixed packages for {service.name.toLowerCase()} yet.
                Tell us what you need and a coordinator comes back with real prices the
                same day — no obligation, nothing charged.
              </p>
              <Link
                to={`/plan/custom?services=${encodeURIComponent(service.name)}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-4 py-3 text-[13px] font-extrabold text-plum-950"
              >
                Ask for a price <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        )}

        {/* ── What people book with it ───────────────────────────────
            The cross-sell, and the honest kind: these are other services
            bookable on their own, not an upsell into a package. */}
        {alsoBooked.length > 0 && (
          <section>
            <div className="px-4">
              <h2 className="text-[15px] font-extrabold text-ink">
                Booked alongside this
              </h2>
              <p className="mt-0.5 text-[11.5px] text-ink-mute">
                Each one is bookable on its own too — add as few or as many as you want.
              </p>
            </div>
            <div className="mt-3 flex gap-2.5 overflow-x-auto px-4 pb-2 scrollbar-hide">
              {alsoBooked.map(s => (
                <Link
                  key={s.id}
                  to={`/service/${s.id}`}
                  className="home-card w-[136px] shrink-0 p-3"
                >
                  <span className="text-[22px] leading-none" aria-hidden="true">{s.emoji}</span>
                  <span className="mt-1.5 block text-[12px] font-extrabold leading-tight text-gray-900">
                    {s.name}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-bold text-plum-600">
                    {s.priceHint}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── What else the same day needs ───────────────────────────────
            Placed after the options and before the reassurance: the customer
            has just made their choice about THIS service and has not yet left,
            which is the one moment "and the nadaswaram?" is a helpful question
            rather than an interruption. Above the options it would compete
            with the thing they came for. */}
        <GoesWithRail seedId={serviceId} />

        {/* ── The reassurance ────────────────────────────────────────── */}
        <section className="px-4">
          <div className="home-glass p-4">
            <h2 className="text-[13px] font-extrabold text-ink">
              What happens after you add this
            </h2>
            <ol className="mt-2 space-y-2">
              {[
                ['1', 'You send it', 'Your choices, your date and your venue reach a coordinator — nothing is charged.'],
                ['2', 'We confirm', 'They check availability for your date, price it against your venue, and come back the same day.'],
                ['3', 'You approve', 'Only then is anything booked. Change or cancel before that at no cost.'],
              ].map(([n, title, body]) => (
                <li key={n} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-saffron-400 text-[10px] font-extrabold text-plum-950">
                    {n}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-extrabold text-ink">{title}</span>
                    <span className="block text-[11px] leading-snug text-ink-mute">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <a
              href={`tel:${BRAND.supportPhone.replace(/\s/g, '')}`}
              className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-surface-sunk/[0.07] px-4 py-2.5 text-[12px] font-bold text-ink ring-1 ring-hairline/10"
            >
              <Phone size={13} /> Rather just talk? {BRAND.supportPhone}
            </a>
          </div>
        </section>
      </div>

      {/* ── The setup, opened ──────────────────────────────────────── */}
      {openTheme && (
        <ThemeSheet
          theme={openTheme}
          scaleId={scaleId}
          guestCount={guestCount}
          onScale={setScaleId}
          onClose={() => setOpenTheme(null)}
          added={alreadyAdded}
          onAdd={({ theme, total, summary }) => {
            handleAdd({
              optionId: theme.id, optionName: theme.name, price: total, summary,
            })
          }}
        />
      )}

      {/* ── The sticky decision ────────────────────────────────────── */}
      {selection && !openTheme && (
        <BookBar
          total={selection.price}
          lineLabel={selection.label}
          detail={selection.detail}
          added={alreadyAdded}
          cartPath={cartPath}
          cartCount={cartCount}
          onAdd={() => handleAdd(selection)}
        />
      )}

      {/* The same calendar the home screen and the plan hub open, writing to
          the same shared store — so a date picked anywhere in the app is known
          everywhere in it, and this page never asks for one twice. */}
      <EventDateSheet
        open={dateSheetOpen}
        onClose={() => { setDateSheetOpen(false); setPendingAdd(null) }}
        city={chosen ? city : null}
        value={savedDate}
        onConfirm={next => {
          setEventDate(next)
          setDateSheetOpen(false)
          // Finish the add the sheet interrupted. The date goes with it
          // explicitly — see commitAdd on why the store cannot be read here.
          if (pendingAdd) { commitAdd(pendingAdd, next); setPendingAdd(null) }
        }}
      />
    </div>
  )
}

/** A fact about the service, as a chip. */
function Stat({ icon: Icon, label, accent }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-bold ${
        accent ? 'bg-plum-50 text-plum-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      <Icon size={11} /> {label}
    </span>
  )
}

/**
 * The hero's two colours, from the service's category.
 *
 * Keyed on category rather than on service id so a service added tomorrow gets
 * a sensible picture without anyone having to remember this file exists.
 */
function heroTint(category) {
  return {
    Decor:          ['#c026d3', '#f59e0b'],
    Catering:       ['#b45309', '#facc15'],
    'F&B':          ['#0891b2', '#fbbf24'],
    Photography:    ['#1e3a8a', '#38bdf8'],
    Video:          ['#0f172a', '#22d3ee'],
    Entertainment:  ['#7c3aed', '#ec4899'],
    Lighting:       ['#f59e0b', '#4c1d95'],
    Venue:          ['#15803d', '#fde68a'],
    Beauty:         ['#be123c', '#f9a8d4'],
    Ritual:         ['#d97706', '#fde68a'],
    Gifts:          ['#7c2d12', '#fbbf24'],
    Logistics:      ['#334155', '#94a3b8'],
    Infrastructure: ['#0f766e', '#5eead4'],
    Safety:         ['#b91c1c', '#fca5a5'],
    Hospitality:    ['#db2777', '#fbcfe8'],
    Stationery:     ['#a16207', '#fef08a'],
    Furniture:      ['#78350f', '#d6d3d1'],
    Security:       ['#1f2937', '#9ca3af'],
    Cleanup:        ['#0e7490', '#a5f3fc'],
    Corporate:      ['#1e293b', '#93c5fd'],
    Effects:        ['#0f172a', '#f59e0b'],
    Bakery:         ['#db2777', '#fed7aa'],
  }[category] ?? ['#6d28d9', '#f59e0b']
}
