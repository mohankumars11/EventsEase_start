import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft, Check, ChevronRight, Loader2, Send, X,
  UtensilsCrossed, Video, Flame,
  /* The stepper's seven phase icons. Five of them were used in
     ALL_PHASES and never imported, so the array threw a
     ReferenceError while the component was still rendering — which
     is the error boundary, on the FIRST screen of the flow, for every
     partner and every trade. Bundlers do not catch a bare identifier:
     esbuild treats an unknown one as a runtime global, the same as
     `window`, so it built and shipped clean. */
  ListChecks, Soup, ClipboardList, IndianRupee, SendHorizonal,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast, friendlyError } from '../../context/ToastContext'
import { TRADES, offeringsForTrade } from '../../data/partnerCatalogue'
import { specsForTrade } from '../../data/partnerSpecs'
import { specsForServices } from '../../data/partnerServiceSpecs'
import { listingAnswerIds } from '../../lib/listingAnswerIds'
import { menusFor, menuLines, menuLineCount, FOOD_COUNTERS, CATERING_NOTES } from '../../data/cateringMenus'
import { ALL_DISH_GROUPS, TOTAL_DISHES } from '../../data/cateringDishes'
import { SERVICE_UNITS } from '../../config/vendor'
import MenuUpload from './MenuUpload'
import FunnelStepper from './FunnelStepper'
import PriceGuidance from './PriceGuidance'
import DistanceRates from './DistanceRates'
import ListingSignature from './ListingSignature'
import MenuDishStep from './MenuDishStep'
import WorkUpload from './WorkUpload'
import { workPromptsFor } from '../../data/workPrompts'
import WhatHappensNext from './WhatHappensNext'
import VenueTerms from './VenueTerms'
import TradeGrid from './TradeGrid'
import HookCard, { PromiseStrip } from './HookCard'
import { fetchAdditions } from '../../data/catalogueAdditions'
import { DISH_IDS, DISH_BY_ID } from '../../data/dishRegistry'
import {
  KitchenStep, CuisineStep, CuisineDishStep, DishPickerStep,
} from './CateringFunnel'
import {
  dietOf, wantsSouthIndianLibrary, southIndianLibrary,
  wantsNonVegLibrary, nonVegLibrary,
} from '../../data/cateringFunnel'
import { CUISINE_BY_ID } from '../../data/cuisineMenus'
import { operationScreensFor } from '../../data/partnerOperations'

/**
 * Adding what you do, as a journey rather than a form.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT WAS WRONG
 * ══════════════════════════════════════════════════════════════════════
 *
 * The old picker was a flat list of 34 names and a price box. It worked,
 * in the sense that a determined person could get through it, and it
 * asked a caterer for exactly as much as it asked a balloon supplier:
 * a name, a number, and nothing about the business.
 *
 * A caterer's listing is not a name and a number. It is which cuisines
 * they cook, which menus they serve, what is on each of those menus, and
 * what a plate costs. Until this screen could hold that, the answer to
 * "what do you actually do" lived in a phone call.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SHAPE
 * ══════════════════════════════════════════════════════════════════════
 *
 *   1  TRADE      what line of business — 24 cards, searchable
 *   2  OFFERINGS  what within it — multi-select
 *   3  DETAIL     the trade's own questions (cuisines, styles, kit)
 *   4  MENUS      catering: 12 real menu cards, every dish readable
 *   5  DISHES     catering: 479 dishes across 20 groups, à la carte
 *   6  PRICE      a floor price, or type your own
 *   7  REVIEW     what you are about to submit, then submit it
 *
 * Steps 3, 4 and 5 appear only when they have something to ask. A balloon
 * supplier goes trade → offering → price → review in four taps; a caterer
 * gets the seven they need. A flow that shows every screen to everybody
 * teaches people to tap Next without reading, which is how a form full of
 * defaults gets submitted.
 *
 * ── One question per screen ─────────────────────────────────────────
 * This is filled in on a phone, often outdoors, by somebody who has not
 * used the app before. Two questions on one screen means the second one
 * is answered wrong.
 */

/* An icon per trade. Not decoration: 24 identical cards of text is a wall
   somebody has to READ, and a picture is how you find your own trade in a
   list without reading all of it. */

const CATERING = 'Catering & Food'

export default function AddItemFlow({
  existing = [], onAdd, onClose, startTrade = null, vendorId = null,
}) {
  const toast = useToast()
  /* A partner who told us their trade at sign-up should not have to
     find it in a list of twenty-six again. The Listing tab hands it in
     the flow opens on the next question instead of the first. */
  const [step, setStep] = useState(startTrade ? 'offerings' : 'trade')
  const [trade, setTrade] = useState(startTrade)
  const [picked, setPicked] = useState([])     // offering serviceIds
  const [detail, setDetail] = useState({})     // spec answers
  const [menus, setMenus] = useState([])       // menu ids
  const [counters, setCounters] = useState([]) // counter ids
  const [dishes, setDishes] = useState([])     // a la carte dish names
  /* The catalogue dish ids ticked on the menus screen. Separate from
     `dishes`, which is the a-la-carte library and holds NAMES: this one
     is what the menu cards are made of, and it is what coverage is
     worked out from. See MenuDishStep. */
  const [cardDishes, setCardDishes] = useState([])
  /* Photographs, video and testimonials. Every trade, not only catering:
     a decorator has last Saturday's mandap and had nowhere to put it.
     See WorkUpload and data/workPrompts.js. */
  const [work, setWork] = useState([])
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('per event')
  const [minOrder, setMinOrder] = useState('')
  const [uploads, setUploads] = useState([])
  /* What a caterer typed that is not in the catalogue. Kept per screen —
     a dish they added under Kerala is a Kerala dish, and merging them all
     into one blob would lose the only thing that makes it useful to the
     operator who reads it. */
  const [dishNotes, setDishNotes] = useState({})
  /* A rate per menu. One number for the whole business made a caterer
     quote either their cheapest menu or their dearest — see
     PriceGuidance for why that is worse than asking three times. */
  const [menuRates, setMenuRates] = useState({})
  const [distanceRates, setDistanceRates] = useState({})
  /* Null until the partner has held the sign button. Cleared if they
     change the name afterwards — see ListingSignature. */
  const [signature, setSignature] = useState(null)
  /* A hall's price is seven numbers, not one. See VenueTerms. */
  const [venueTerms, setVenueTerms] = useState({})
  /* Fetched once when the flow opens, not per dish screen: a caterer
     with five cuisines would otherwise make the same request five
     times for a list that cannot change mid-form. */
  const [additions, setAdditions] = useState([])
  useEffect(() => { fetchAdditions().then(setAdditions) }, [])
  const noteFor = (v) => setDishNotes(m => ({ ...m, [step]: v }))
  /* The funnel's own answers. `kitchen` is the gate every later screen
     reads; `cuisines` is what it narrowed to. */
  const [kitchen, setKitchen] = useState(null)
  const [cuisines, setCuisines] = useState([])
  /* Which screens the partner has actually reached. The stepper turns a
     dot red only for a step they visited and left empty — never for one
     they have not been shown. */
  const [touched, setTouched] = useState(() => new Set(['trade']))
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')

  const offerings = useMemo(() => (trade ? offeringsForTrade(trade) : []), [trade])
  /* The questions for what they actually ticked, falling back to the
     trade's own.

     Reported exactly right: tapping "Welcome drinks" asked "Which
     cuisines can you cook?" and "Is your kitchen pure vegetarian?". So
     did "Sweets & mithai", and "Live food counters". Seven different
     businesses, one questionnaire, six of them answering something with
     nothing to do with what they sell -- which teaches a partner that
     the app does not know what they do and that the answers do not
     matter. Both were true. */
  const groups = useMemo(
    () => (trade ? specsForServices(picked, specsForTrade(trade)) : []),
    [trade, picked])
  const isCatering = trade === CATERING

  /* A trade whose price is a distance, read from the partner's own
     answer rather than from the trade name — a decorator who ticks
     'base fare plus per kilometre' means it, and hardcoding the trade
     would be one more list to keep in step with another list. */
  const chargesByDistance =
    detail.charge_metric === 'per_km' || unit === 'per km'


  /* ── Menus follow the FUNNEL, not the deleted detail screen ──────────
     This read `detail.cuisines`, and the Catering & Food block was
     deleted from partnerSpecs when the funnel took those questions over.
     So it read undefined, returned [] every time, and the menus screen
     was empty for every caterer who reached it — along with the rate
     screen, which lists the menus they ticked.

     The dependency array already named the right variable. The body
     shadowed it with a const one line in. Nothing threw and nothing
     logged; it simply looked like a caterer who had picked no cuisines.

     `serves` moved for the same reason — detail.service went with the
     rest of that block, and the answer now lives on the serving
     operations screen as service_style. */
  const availableMenus = useMemo(() => {
    if (!isCatering) return []
    if (!cuisines.length) return []
    /* Both facts, not one. A pure-veg Brahmin kitchen that serves only on
       the leaf sees four cards; the eight it does not see are eight fewer
       chances to tick something it cannot honour. */
    return menusFor({ cuisines, serves: detail.service_style ?? [], diet: dietOf(kitchen) })
  }, [isCatering, cuisines, detail.service_style, kitchen])

  const alreadyHave = new Set(existing.map(s => s.name))
  const nameOf = id => offerings.find(o => o.serviceId === id)?.name ?? id

  /* The steps that actually exist for THIS trade. Computed rather than
     hardcoded, so Back and Next cannot walk into a screen with nothing
     on it. */
  /* Which offerings are actually about MENUS.
   *
   * Reported: tapping "Welcome drinks", "Sweets & mithai" or "Customised
   * menu" and pressing Continue landed on a menus screen saying "Pick
   * your cuisines on the last screen and the menus for them appear here"
   * -- a dead end, because those offerings are never asked about
   * cuisines and never will be. A drinks counter has no plantain-leaf
   * menu. The screen was correct and should not have been there at all.
   *
   * `menu` is on this list because a customised menu IS built from the
   * standard ones. The other five are not. */
  /* Which offerings are actually about MENUS.
   *
   * Reported: tapping "Welcome drinks", "Sweets & mithai" or "Customised
   * menu" and pressing Continue landed on a menus screen saying "Pick
   * your cuisines on the last screen" — a dead end, because those
   * offerings are never asked about cuisines and never will be. A drinks
   * counter has no plantain-leaf menu. */
  const MENU_BEARING = ['catering', 'menu', 'cooks']
  const wantsMenus = isCatering && picked.some(id => MENU_BEARING.includes(id))

  /* ── How this trade works, whatever the trade is ────────────────────
     These used to be catering's alone, and the count told the story:
     catering asked 34 questions and every other trade asked one to
     three. A photographer was asked what they shoot and what it costs —
     nothing about travel, notice, whether they bring lighting, or
     whether they will work a 4am muhurta. Dispatch offered them all of
     it and found out by failing.

     Six of catering's seven screens were never about food. They are
     about running a business that turns up somewhere, so they are the
     spine now and each trade fills them with its own questions.
     See data/partnerOperations.js. */
  const opsScreens = useMemo(
    () => (trade ? operationScreensFor(trade) : []),
    [trade])

  /* ══════════════════════════════════════════════════════════════════
     THE FUNNEL, BUILT FROM THE ANSWERS SO FAR
     ══════════════════════════════════════════════════════════════════

     Every screen after the gatekeeper exists only because an earlier
     answer put it there. A pure-veg kitchen never gets a non-veg screen;
     a caterer who picked two cuisines gets two cuisine screens and not
     one wall; the deep libraries appear once each, at the end, rather
     than repeated under every cuisine.

     Computed rather than hardcoded so Back and Next can never walk into
     a screen with nothing on it. */
  const flow = useMemo(() => {
    const s = ['trade', 'offerings']
    if (groups.length) s.push('detail')

    if (wantsMenus) {
      s.push('kitchen')
      if (kitchen) {
        s.push('cuisines')
        for (const id of cuisines) s.push(`cuisine:${id}`)
        if (wantsSouthIndianLibrary(cuisines, kitchen)) s.push('lib:south')
        if (wantsNonVegLibrary(kitchen)) s.push('lib:nonveg')
        s.push('menus')
      }
    }

    /* Every trade, not only catering. */
    for (const screen of opsScreens) s.push(`ops:${screen.id}`)

    /* The menu-card upload is catering's. Asking a valet to photograph
       their menu is the kind of question that teaches a partner the app
       does not know what they do. */
    if (isCatering) s.push('upload')

    /* Every trade. Ticks are what dispatch MATCHES on; this is what wins
       the job once it has been matched, and only caterers could do it. */
    s.push('work')

    s.push('price', 'review')
    return s
  }, [groups.length, wantsMenus, isCatering, kitchen, cuisines, opsScreens])

  /* A title for the screens whose ids are built at runtime. */
  const title = (
    step.startsWith('cuisine:') ? (CUISINE_BY_ID[step.slice(8)]?.name ?? 'This cuisine')
    : step === 'lib:south' ? 'Karnataka, in depth'
    : step === 'lib:nonveg' ? 'Non-veg, region by region'
    : step.startsWith('ops:') ? (opsScreens.find(x => x.id === step.slice(4))?.title ?? 'How you work')
    : STEP_TITLE[step] ?? 'Add what you do'
  )

  /* ══════════════════════════════════════════════════════════════════
     FOURTEEN SCREENS, SEVEN PHASES
     ══════════════════════════════════════════════════════════════════

     The flow can run to fourteen screens — one per cuisine, seven
     operational, two libraries. Fourteen dots on a phone are unreadable
     and the current one would need scrolling to find.

     So they group into phases a caterer would recognise as stages of
     their own work, and the five cuisine screens are one dot that says
     "3 of 5" while you are inside it. */
  const phaseOf = id =>
    id === 'trade' || id === 'offerings' ? 'what'
    : id === 'kitchen' ? 'kitchen'
    : id === 'cuisines' ? 'cuisines'
    : id.startsWith('cuisine:') || id.startsWith('lib:') || id === 'menus' || id === 'dishes' ? 'dishes'
    : id.startsWith('ops:') ? 'ops'
    : id === 'upload' || id === 'work' || id === 'price' ? 'price'
    : 'submit'

  /* ── Only the phases this trade actually has ────────────────────────
     These seven were written when catering was the only trade with a
     journey. Now that every trade gets operations screens, a fixed list
     would show a photographer "Kitchen · Cuisines · Dishes" — three
     steps they will never reach, on the header of every screen, in a
     stepper whose entire job is telling them how much is left.

     Filtered against the flow, so a phase appears only when a screen in
     it exists. A photographer sees four dots; a caterer sees seven. */
  const ALL_PHASES = [
    { id: 'what',     label: 'What you do', icon: ListChecks },
    { id: 'kitchen',  label: 'Kitchen',     icon: Flame },
    { id: 'cuisines', label: 'Cuisines',    icon: Soup },
    { id: 'dishes',   label: 'Dishes',      icon: UtensilsCrossed },
    { id: 'ops',      label: 'How you work', icon: ClipboardList },
    { id: 'price',    label: 'Your rate',   icon: IndianRupee },
    { id: 'submit',   label: 'Submit',      icon: SendHorizonal },
  ]
  const PHASES = ALL_PHASES.filter(p => flow.some(f => phaseOf(f) === p.id))

  /* ── The hook for this screen ───────────────────────────────────────
     Every screen in a twelve-step form is a place somebody can put the
     phone down, and the middle ones are the worst: far enough in to feel
     like work, too far from the end for finishing to be in sight.

     Mapped from the screen id rather than the phase, because "what you
     will not do" needs a different thing said on it than the six
     operational screens around it — that saying no costs them nothing is
     exactly the doubt on that screen and nowhere else.

     Screens with no hook get none. A card on every single screen is
     wallpaper, and wallpaper does not get read. */
  const hookId =
    step === 'kitchen' ? 'kitchen'
    : step === 'cuisines' ? 'cuisines'
    : step.startsWith('cuisine:') || step.startsWith('lib:') || step === 'dishes' ? 'dishes'
    : step === 'ops:limits' ? 'limits'
    : step.startsWith('ops:') ? 'ops'
    : step === 'price' ? 'price'
    : step === 'upload' ? 'upload'
    : null

  const idx = flow.indexOf(step)
  const here = phaseOf(step)

  /* Phases wholly behind the current screen are done. A phase is only
     "done" when every screen in it has been passed, so the Dishes dot
     does not go green while three cuisines are still unanswered. */
  const donePhases = PHASES.map(p => p.id).filter(pid => {
    const screens = flow.filter(f => phaseOf(f) === pid)
    return screens.length > 0 && screens.every(f => flow.indexOf(f) < idx)
  })

  /* Red only on a step actually VISITED and left empty, and only on the
     two that genuinely cannot be skipped. Marking an unvisited step red
     would scold somebody for not doing what they have not been shown. */
  const blockedPhases = [
    ...(touched.has('kitchen') && !kitchen ? ['kitchen'] : []),
    ...(touched.has('cuisines') && !cuisines.length ? ['cuisines'] : []),
  ]

  /* "3 of 5" under the Dishes dot while inside it. */
  const inPhase = flow.filter(f => phaseOf(f) === here)
  const subLabel = inPhase.length > 1
    ? `${inPhase.indexOf(step) + 1} of ${inPhase.length}`
    : null
  const phases = PHASES.map(p => (p.id === here ? { ...p, subLabel } : p))

  const goNext = () => {
    const next = flow[Math.min(idx + 1, flow.length - 1)]
    setTouched(t => new Set([...t, next]))
    setStep(next)
  }
  const goBack = () => (idx <= 0 ? onClose() : setStep(flow[idx - 1]))

  /* Which screens genuinely block, and nothing else.
   *
   * This was a map keyed by step id. The funnel added seven new ids at
   * runtime -- kitchen, cuisines, cuisine:<id>, lib:south, lib:nonveg,
   * ops:<id>, upload -- and a map lookup for a key it does not have
   * returns undefined, which is falsy, which disabled Continue on every
   * one of them. The build was green and the crash repro found nothing,
   * because nothing crashed: the flow simply could not advance.
   *
   * An expression with an explicit default cannot fail that way. Spec
   * questions stay optional -- a partner who cannot answer one today
   * should not be stopped from listing at all -- but the funnel cannot
   * draw the next screen without a kitchen and a cuisine, so those two
   * are real gates. */
  const canAdvance = (
    step === 'trade' ? !!trade
    : step === 'offerings' ? picked.length > 0
    : step === 'kitchen' ? !!kitchen
    : step === 'cuisines' ? cuisines.length > 0
    /* Review is the one screen with a real gate at the end: an unsigned
       listing is a set of claims nobody attested to. */
    : step === 'review' ? !!signature?.signed_at
    : true
  )

  /* What the signature is a signature OF. Counted rather than described,
     because "312 things claimed" is checkable later and "a listing" is
     not. */
  const claimCount =
    picked.length + menus.length + counters.length + dishes.length
    + Object.values(detail).filter(v =>
        Array.isArray(v) ? v.length > 0 : String(v ?? '').trim() !== '').length

  async function submit() {
    setBusy(true)
    try {
      /* One vendor_services row per offering, all carrying the same
         specs. The trade is what dispatch matches on and it is written
         from TRADES rather than typed, so none of these rows can be the
         "videpgraphy" that never got a job. */
      const specs = { ...detail }
      if (menus.length) specs.menus = menus
      if (counters.length) specs.counters = counters
      /* ── Ids and names are stored apart, and only ids are matched ────
         What a caterer ticks comes back as a mix: registry dishes carry
         an SBM- id, the older libraries are still bare names.

         They must not be merged into one column. A name cannot be
         matched — "Arachuvitta Sambar", "Arachuvitta sambar" and
         "Araichuvitta Sambhar" are three caterers cooking one dish, and
         a string comparison quietly finds one of them. Mixed into one
         array, the ids would inherit that unreliability by association:
         nothing downstream could tell which entries were safe to reason
         about.

         So specs.dish_ids is what dispatch matches a customer's menu
         card against, and specs.dishes is what a coordinator reads.
         See lib/menuMatch.js and data/dishRegistry.js. */
      const dishIds = dishes.filter(d => DISH_IDS.has(d))
      const dishNames = dishes.filter(d => !DISH_IDS.has(d))
      if (dishIds.length) specs.dish_ids = dishIds
      if (dishNames.length) specs.dishes = dishNames
      if (minOrder && !/^\d+$/.test(minOrder)) specs.min_order_note = minOrder
      if (uploads.length) specs.uploads = uploads
      /* Typed dishes go in flagged, not merged into the catalogue. An
         operator decides whether one becomes a real entry — that is the
         whole difference between a curated list and a free-text mess.
         Saving them unflagged would be worse than not asking. */
      const typed = Object.entries(dishNotes)
        .filter(([, v]) => String(v).trim())
        .map(([screen, text]) => ({ screen, text: text.trim() }))
      if (typed.length) specs.dishes_typed = typed
      /* Kept per menu rather than flattened to an average. The whole
         point of asking three times is that the three answers differ. */
      const priced = Object.fromEntries(
        Object.entries(menuRates).filter(([, v]) => Number(v) > 0))
      if (Object.keys(priced).length) specs.menu_rates = priced

      /* Base fare, free kilometres, per kilometre, waiting. Kept as
         four numbers because that is what the fare IS — flattening
         them to one average is the thing that made every transport
         job a phone call. */
      const fare = Object.fromEntries(
        Object.entries(distanceRates).filter(([, v]) => String(v ?? '').trim() !== ''))
      if (Object.keys(fare).length) specs.distance_rates = fare

      /* Everything on top of the rent, kept as the separate numbers they
         are. Flattened into one figure they would be exactly the surprise
         this screen exists to remove. */
      const hall = Object.fromEntries(
        Object.entries(venueTerms).filter(([, v]) => String(v ?? '').trim() !== ''))
      if (Object.keys(hall).length) specs.venue_terms = hall
      /* Who said it, when, and how much of it. An operator reviewing a
         listing that turns out to be wrong needs all three. */
      if (signature?.signed_at) specs.signature = signature

      /* ── The portfolio belongs to the PARTNER, not to this row ──────
         A photographer listing candid and pre-wedding separately has one
         body of work; writing it into both specs would mean editing it
         twice and showing it twice. So it goes to partner_work, keyed on
         the vendor, and the listing rows do not carry it.

         Written before the services, deliberately: if this fails the
         partner still has an empty listing and can retry, which is a
         better failure than services that exist while their photographs
         silently did not. Migration 110. */
      if (vendorId && work.length) {
        const rows = work.map((w, i) => ({
          vendor_id: vendorId,
          kind: w.kind,
          storage_path: w.path ?? null,
          caption: w.caption?.trim() || null,
          said_by: w.said_by?.trim() || null,
          said_about: w.said_about?.trim() || null,
          body: w.body?.trim() || null,
          sort_order: i,
        })).filter(r => r.kind !== 'testimonial' || r.body)

        if (rows.length) {
          const { error } = await supabase.from('partner_work').insert(rows)
          /* Not fatal. A partner whose listing saved and whose photographs
             did not should be told, not blocked — the photographs can be
             added again from the listing tab, and losing ten minutes of
             ticks to a storage error would be the worse outcome. */
          if (error) {
            toast.error('Your listing saved, but the photos did not. '
              + 'Add them again from your listing.')
          }
        }
      }

      if (kitchen) specs.kitchen_type = kitchen
      if (cuisines.length) specs.cuisines = cuisines

      /* ── The same answers again, as ids ──────────────────────────────
         Everything above is what a coordinator reads. None of it can be
         queried: 'early' is unique inside its own question and nowhere
         else, and Photography, Catering and Security each have a
         time_limits, so a stored ['early'] cannot be read back without
         already knowing which trade and screen produced it.

         The catalogue has an id for all 309 questions and 1,368
         answers. This attaches them — added, never substituted, exactly
         as dish_ids sits beside dishes. Anything that cannot be resolved
         is stored as such rather than dropped, because a listing missing
         an answer silently is worse than one that says so. */
      const ids = listingAnswerIds({
        trade, groups, opsScreens, detail, menus, counters, kitchen,
      })
      if (ids.answers.length) specs.answers = ids.answers
      if (ids.menu_ids.length) specs.menu_ids = ids.menu_ids
      if (ids.counter_ids.length) specs.counter_ids = ids.counter_ids
      if (ids.unresolved.length) specs.answers_unresolved = ids.unresolved

      /* `picked` holds serviceIds; a vendor_services row stores the NAME.
         Writing the id here would put "welcome_drinks" on a partner's
         listing where "Welcome drinks" belongs -- and a coordinator
         reading a price list of snake_case ids would rightly assume the
         app was broken. */
      for (const id of picked) {
        await onAdd({
          name: nameOf(id),
          category: trade,
          description: null,
          price: price === '' ? null : Number(price),
          unit,
          /* A plain number becomes min_quantity, which coordinators and
             the quote engine already read. Anything else is a sentence
             and belongs with the other free text. */
          min_quantity: /^\d+$/.test(minOrder) ? Math.max(1, Number(minOrder)) : 1,
          lead_time_days: null,
          specs,
        })
      }
      toast.success(
        picked.length === 1
          ? 'Added. Our team checks it and turns it on.'
          : `${picked.length} added. Our team checks them and turns them on.`)
      onClose()
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  /* Portalled to document.body, not rendered in place.
   *
   * `position: fixed` resolves against the nearest ancestor with a
   * transform, not against the viewport -- and the dashboard has an
   * entrance animation on the way in. So a full-screen modal rendered
   * inside it is trapped in that ancestor's box AND in its stacking
   * context, which is why the sticky navbar (z-50) drew a navy strip
   * across the top of a modal at z-95 and hid its subtitle.
   *
   * The same fix DayStatusSheet already uses, and the same trap
   * PROJECT_SUMMARY records for the cancel sheet. */
  return createPortal(
    /* A stable hook for check-flow-renders.mjs. The flow portals to
       document.body, so there is no container to scope a query to,
       and matching on a Tailwind class would tie a guard to styling.
       One attribute, no behaviour. */
    <div data-add-item-flow className="fixed inset-0 z-[95] flex flex-col bg-[#faf9f7]">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-ink/[0.07] bg-[#fdfcfa] px-4 pb-3 pt-4 text-ink">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            type="button" onClick={goBack} aria-label="Back"
            className="-ml-1 rounded-full p-1.5 text-ink-soft hover:bg-ink/[0.05]"
          >
            <ArrowLeft size={19} />
          </button>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-extrabold leading-tight">
              {title}
            </span>
            {/* ink-soft, not white. The header background went light in
                an earlier pass and these two spans did not follow it, so
                the only line telling a partner which trade they are inside
                was white text on cream. */}
            <span className="block text-[12px] font-bold text-plum-800">
              {trade ?? 'Add what you do'}
            </span>
          </span>
          <button
            type="button" onClick={onClose} aria-label="Close"
            className="rounded-full p-1.5 text-ink-soft hover:bg-ink/[0.05]"
          >
            <X size={18} />
          </button>
        </div>

        {/* The stepper. Replaced fourteen thin segments that answered
            "roughly how far" and nothing else -- not what the steps were,
            not which one had a problem. See FunnelStepper. */}
        <div className="mx-auto mt-3 max-w-2xl">
          <FunnelStepper
            phases={phases}
            currentId={here}
            doneIds={donePhases}
            blockedIds={blockedPhases}
          />
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-4 pb-32">

          {/* ── Why this screen is worth the next tap ──────────────────
              Above the screen's own content rather than below it: a
              reason to keep going that arrives after the work is a
              reason nobody reads. See partnerHooks.js — every number on
              these cards is one this repo can produce. */}
          {hookId && <HookCard id={hookId} className="mb-3.5" />}

          {step === 'trade' && (
            <TradeStep
              q={q} setQ={setQ}
              value={trade}
              onPick={t => { setTrade(t); setPicked([]); setDetail({}); setMenus([]); goNext() }}
            />
          )}

          {step === 'offerings' && (
            <OfferingStep
              offerings={offerings}
              picked={picked}
              alreadyHave={alreadyHave}
              onToggle={name => setPicked(p =>
                p.includes(name) ? p.filter(x => x !== name) : [...p, name])}
            />
          )}

          {step === 'detail' && (
            <DetailStep groups={groups} value={detail} onChange={setDetail} />
          )}

          {step === 'menus' && (
            /* The dishes, not the cards. A caterer is not choosing an
               option — see MenuDishStep. The cards are still what
               dispatch matches on; they are worked out from the ticks
               and handed back through onMenusChange, so the rate screen
               and the saved listing are unchanged. */
            <MenuDishStep
              menus={availableMenus}
              picked={cardDishes}
              onChange={setCardDishes}
              onMenusChange={setMenus}
              linesOf={menuLines}
              counters={FOOD_COUNTERS}
              chosenCounters={counters}
              onToggleCounter={id => setCounters(c =>
                c.includes(id) ? c.filter(x => x !== id) : [...c, id])}
            />
          )}

          {step === 'kitchen' && (
            <KitchenStep value={kitchen} onChange={setKitchen} />
          )}

          {step === 'cuisines' && (
            <CuisineStep kitchen={kitchen} value={cuisines} onChange={setCuisines} />
          )}

          {step.startsWith('cuisine:') && (
            <CuisineDishStep
              cuisineId={step.slice(8)}
              kitchen={kitchen}
              chosen={dishes}
              onChange={setDishes}
              note={dishNotes[step] ?? ''}
              onNote={noteFor}
              uploads={uploads}
              onUploads={setUploads}
            />
          )}

          {step === 'lib:south' && (
            <DishPickerStep
              title="The Karnataka kitchen, in depth"
              blurb="From a real Bengaluru caterer's card — 61 palyas, 41 sambars, 44 payasas. Tick only what you actually make."
              emoji="🍛"
              courses={southIndianLibrary()}
              chosen={dishes}
              onChange={setDishes}
              note={dishNotes[step] ?? ''}
              onNote={noteFor}
              uploads={uploads}
              onUploads={setUploads}
            />
          )}

          {step === 'lib:nonveg' && (
            <DishPickerStep
              title="Non-veg, region by region"
              blurb="Nati, tandoor, coastal, Kodava, Bengali. Shown once — it is not tied to any one cuisine."
              emoji="🍗"
              courses={nonVegLibrary()}
              chosen={dishes}
              onChange={setDishes}
              note={dishNotes[step] ?? ''}
              onNote={noteFor}
              uploads={uploads}
              onUploads={setUploads}
            />
          )}

          {step.startsWith('ops:') && (
            <OperationsStep
              screen={opsScreens.find(x => x.id === step.slice(4))}
              value={detail}
              onChange={setDetail}
            />
          )}

          {step === 'upload' && (
            <MenuUpload value={uploads} onChange={setUploads} />
          )}

          {step === 'work' && (
            <WorkUpload value={work} onChange={setWork} trade={trade}
              copy={workPromptsFor(trade)} />
          )}

          {step === 'dishes' && (
            <DishStep chosen={dishes} onChange={setDishes} />
          )}

          {step === 'price' && (
            <PriceStep
              menus={availableMenus.filter(m => menus.includes(m.id))}
              price={price} setPrice={setPrice}
              unit={unit} setUnit={setUnit}
              /* minOrder and setMinOrder were declared by PriceStep and
                 never passed. The chips lit nothing because `undefined
                 === '100'` is false, and tapping one called undefined as
                 a function and took the whole flow to the error boundary
                 on the last screen before Review. */
              minOrder={minOrder} setMinOrder={setMinOrder}
              isCatering={isCatering}
              menuRates={menuRates} setMenuRates={setMenuRates}
              chargesByDistance={chargesByDistance}
              distanceRates={distanceRates} setDistanceRates={setDistanceRates}
              isVenue={trade === 'Venue'}
              venueTerms={venueTerms} setVenueTerms={setVenueTerms}
            />
          )}

          {step === 'review' && (
            <ReviewStep
              trade={trade} picked={picked.map(nameOf)} detail={detail} groups={groups}
              opsScreens={opsScreens}
              menus={availableMenus.filter(m => menus.includes(m.id))}
              counters={FOOD_COUNTERS.filter(c => counters.includes(c.id))}
              dishes={dishes}
              price={price} unit={unit}
              work={work} cardDishes={cardDishes}
            />
          )}

          {/* ── The last thing before Submit ─────────────────────────
              Everything above is a claim, and dispatch sends real jobs
              on it. See ListingSignature for why it is a hold and not a
              tick. */}
          {step === 'review' && (
            <div className="mt-4">
              <ListingSignature
                trade={trade}
                claimCount={claimCount}
                value={signature}
                onChange={setSignature}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── The one action ─────────────────────────────────────────── */}
      {step !== 'trade' && (
        <div
          className="shrink-0 border-t border-ink/[0.08] bg-white px-4 py-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              disabled={!canAdvance || busy}
              onClick={step === 'review' ? submit : goNext}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3.5 text-[15px] font-extrabold text-plum-950 transition active:scale-[0.99] disabled:opacity-40"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {step === 'review'
                ? <><Send size={16} /> Submit for review</>
                : <>Continue <ChevronRight size={16} /></>}
            </button>
            {step === 'offerings' && !picked.length && (
              <p className="mt-1.5 text-center text-[11.5px] text-ink-mute">
                Pick at least one to carry on.
              </p>
            )}
            {step === 'review' && !signature?.signed_at && (
              <p className="mt-1.5 text-center text-[11.5px] text-ink-mute">
                Sign above to submit.
              </p>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

const STEP_TITLE = {
  trade:     'What do you do?',
  offerings: 'Which of these?',
  detail:    'Tell us more',
  menus:     'Your menus',
  dishes:    'What can you cook?',
  kitchen:   'What kind of kitchen?',
  cuisines:  'Which cuisines?',
  upload:    'Your menu card',
  work:      'Show them your work',
  price:     'What do you charge?',
  review:    'Check and submit',
}

/* ══════════════════════════════════════════════════════════════════ */

/* The grid moved to TradeGrid.jsx when the Listing tab started opening
   on it. One implementation, so the search that understands "biryani"
   cannot drift between the two screens that offer it. */
function TradeStep(props) {
  return <TradeGrid {...props} />
}

function OfferingStep({ offerings, picked, alreadyHave, onToggle }) {
  return (
    <>
      <p className="mb-3 text-[13px] leading-relaxed text-ink-soft">
        Tick everything you can do. Each one becomes a line on your listing
        and each one can be matched to a job.
      </p>
      <div className="space-y-2">
        {offerings.map(o => {
          /* `picked` holds serviceIds and `alreadyHave` holds names --
             the first is what the question sets are keyed on, the second
             is what a vendor_services row stores. Comparing the wrong one
             here shows no tick at all when a partner taps. */
          const on = picked.includes(o.serviceId)
          const have = alreadyHave.has(o.name)
          return (
            <button
              key={o.serviceId}
              type="button"
              disabled={have}
              onClick={() => onToggle(o.serviceId)}
              className={`flex w-full items-center gap-3 rounded-[18px] p-3.5 text-left ring-1 transition active:scale-[0.99] ${
                have ? 'bg-ink/[0.03] ring-ink/[0.05] opacity-60'
                : on ? 'bg-forest-50 ring-2 ring-forest-600'
                     : 'bg-white ring-ink/[0.06]'
              }`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 ${
                on ? 'bg-forest-600 ring-forest-600' : 'bg-white ring-ink/[0.18]'
              }`}>
                {on && <Check size={13} className="text-white" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-extrabold text-ink">{o.name}</span>
                {have && <span className="block text-[11.5px] text-ink-mute">Already on your listing</span>}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════ */

export function DetailStep({ groups, value, onChange }) {
  /* The functional updater, not a spread of `value`.
     `value` is the prop from the last render, so two taps inside one
     React batch both build on the SAME object and the second silently
     discards the first. Real taps usually get a re-render between them
     and survive by luck; the capture harness clicks three chips in one
     evaluation and lost two of them, which is the same bug with better
     timing. */
  function toggle(g, choiceId) {
    onChange(prev => {
      if (g.type === 'one') {
        return { ...prev, [g.id]: prev[g.id] === choiceId ? undefined : choiceId }
      }
      const cur = Array.isArray(prev[g.id]) ? prev[g.id] : []
      return {
        ...prev,
        [g.id]: cur.includes(choiceId) ? cur.filter(x => x !== choiceId) : [...cur, choiceId],
      }
    })
  }

  function setOther(g, text) {
    onChange(prev => ({ ...prev, [`${g.id}__other`]: text }))
  }

  return (
    <div className="space-y-5">
      {groups.map(g => (
        <div key={g.id} className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <p className="text-[14px] font-extrabold leading-tight text-ink">{g.question}</p>
          {g.hint && <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{g.hint}</p>}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {g.choices.map(c => {
              const cur = value[g.id]
              const on = g.type === 'one' ? cur === c.id : Array.isArray(cur) && cur.includes(c.id)
              return (
                <button
                  key={c.id} type="button" onClick={() => toggle(g, c.id)} aria-pressed={on}
                  className={`rounded-full px-3.5 py-2 text-[13px] font-bold transition ${
                    on ? 'bg-forest-600 text-white ring-2 ring-forest-600' : 'bg-ink/[0.03] text-ink-soft ring-1 ring-ink/[0.08]'
                  }`}
                >
                  {c.label}
                  {on && c.scan && <span className="ml-1.5 font-semibold opacity-70">{c.scan}</span>}
                </button>
              )
            })}
          </div>

          {/* ── Somewhere to put what our list does not have ─────────
              A fixed list is what keeps the data clean enough to match
              on, and it is also a list written by somebody who has never
              run this partner's kitchen. Every caterer has a speciality
              nobody thought to put in a dropdown, and being unable to
              say it is how a form starts feeling like it is about us
              rather than about them.

              Deliberately SEPARATE from the ticked ids, and never mixed
              into them: matching still runs on the choice ids, and free
              text is read by a person. That is the whole reason the
              dropdown exists. */}
          {/* ── The typed answer, and proof it landed ────────────────
              Reported as "there is no option to submit". There never
              needed to be one -- the text is kept the moment it is typed
              and travels with Continue like every tick on this screen --
              but nothing on the box SAID so, and an input with no button
              beside it reads as an input that has not been submitted.
              A partner who cannot tell whether their sentence was
              recorded will type it again, or lose faith in the rest of
              the form.

              So the box says what it is doing. No extra button: adding
              one would imply the ticks need submitting too. */}
          <div className="relative mt-2.5">
            <input
              value={value[`${g.id}__other`] ?? ''}
              onChange={e => setOther(g, e.target.value)}
              placeholder="Something else? Type it here"
              className="w-full rounded-2xl bg-ink/[0.02] py-2.5 pl-3.5 pr-20 text-[13px] font-semibold text-ink ring-1 ring-ink/[0.06] placeholder:font-normal placeholder:text-ink-mute"
            />
            {(value[`${g.id}__other`] ?? '').trim().length > 0 && (
              <span className="pointer-events-none absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-forest-50 px-2 py-1 text-[10.5px] font-extrabold text-forest-700">
                <Check size={10} /> Saved
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */

function MenuStep({ menus, chosen, counters, onToggleMenu, onAllMenus, onToggleCounter, uploads, setUploads }) {
  const [open, setOpen] = useState(null)

  if (!menus.length) {
    return (
      <p className="rounded-[20px] bg-ink/[0.02] p-6 text-center text-[13px] leading-relaxed text-ink-mute">
        Pick your cuisines on the last screen and the menus for them appear
        here.
      </p>
    )
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Tick the menus you serve. Tap one to read every dish on it.
        </p>
        <button
          type="button" onClick={onAllMenus}
          className="shrink-0 rounded-full bg-forest-600 px-3.5 py-1.5 text-[12px] font-extrabold text-white"
        >
          {chosen.length === menus.length ? 'Clear all' : 'Select all'}
        </button>
      </div>

      <div className="space-y-2.5">
        {menus.map(m => {
          const on = chosen.includes(m.id)
          const isOpen = open === m.id
          return (
            <div
              key={m.id}
              className={`overflow-hidden rounded-[20px] ring-1 transition ${
                on ? 'bg-forest-50 ring-2 ring-forest-600' : 'bg-white ring-ink/[0.06]'
              }`}
            >
              <div className="flex items-start gap-3 p-4">
                <button
                  type="button"
                  onClick={() => onToggleMenu(m.id)}
                  aria-pressed={on}
                  aria-label={`${on ? 'Remove' : 'Add'} ${m.name}`}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 ${
                    on ? 'bg-forest-600 ring-forest-600' : 'bg-white ring-ink/[0.18]'
                  }`}
                >
                  {on && <Check size={13} className="text-white" />}
                </button>

                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : m.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-baseline gap-2">
                    <span className="text-[15px] font-extrabold leading-tight text-ink">{m.name}</span>
                    {m.indicative && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800">
                        Check price
                      </span>
                    )}
                  </span>
                  <span className="block text-[12px] text-ink-mute">{m.tier} · {m.scan}</span>
                  <span className="mt-1 block font-serif text-[17px] font-extrabold tracking-tight text-ink">
                    from ₹{m.fromPrice}
                    <span className="ml-1 font-sans text-[11.5px] font-bold text-ink-mute">
                      a plate · min {m.minPax}
                    </span>
                  </span>
                  <span className="mt-1 block text-[11.5px] font-bold text-plum-700">
                    {isOpen ? 'Hide the dishes' : `Read all ${menuLineCount(m)} dishes`}
                  </span>
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-ink/[0.06] bg-white/70 p-4 pt-3">
                  {m.welcome?.length > 0 && (
                    <div className="mb-2.5">
                      {m.welcome.map(w => (
                        <p key={w} className="text-[12.5px] font-bold leading-snug text-plum-800">{w}</p>
                      ))}
                    </div>
                  )}
                  <ol className="space-y-1">
                    {menuLines(m).map((it, i) => (
                      <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-ink-soft">
                        <span className="w-4 shrink-0 text-right tabular-nums text-ink-mute">{i + 1}</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ol>
                  {m.needsReview && (
                    <p className="mt-3 rounded-xl bg-amber-50 p-2.5 text-[11.5px] leading-snug text-amber-900">
                      We have written a traditional starting point. Edit it on
                      your listing so it reads the way you actually serve it.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Or just hand us the card ──────────────────────────────
          Sitting here, under twelve menus somebody is being asked to
          tick, because this is the moment they realise how long that
          will take. See MenuUpload. */}
      <div className="mt-5">
        <MenuUpload value={uploads} onChange={setUploads} />
      </div>

      {/* ── Counters ─────────────────────────────────────────────── */}
      <p className="mb-2 mt-6 text-[12px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">
        Counters you can add
      </p>
      <div className="flex flex-wrap gap-1.5">
        {FOOD_COUNTERS.map(c => {
          const on = counters.includes(c.id)
          return (
            <button
              key={c.id} type="button" onClick={() => onToggleCounter(c.id)} aria-pressed={on}
              className={`rounded-full px-3.5 py-2 text-left text-[12.5px] font-bold transition ${
                on ? 'bg-forest-600 text-white ring-2 ring-forest-600' : 'bg-white text-ink-soft ring-1 ring-ink/[0.08]'
              }`}
            >
              {c.name}
              <span className={`ml-1.5 font-semibold ${on ? 'opacity-70' : 'text-ink-mute'}`}>
                from ₹{c.fromPrice}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════ */

/**
 * One screen of the operations catalogue.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE OPERATIONAL HALF MATTERS AS MUCH AS THE MENU
 * ══════════════════════════════════════════════════════════════════════
 *
 * Two caterers can cook the identical menu and be completely different
 * bookings. One arrives with vessels, burners, gas, twelve servers and a
 * cleaning crew. The other arrives with two cooks and expects a kitchen,
 * a gas connection and somebody else's staff.
 *
 * A lawn function at a farmhouse needs the first. Send the second and the
 * food never gets cooked — not because the caterer was bad, but because
 * nobody asked. Until now nothing did.
 *
 * Each screen carries a `why`, because a partner answering thirteen
 * groups deserves to know what each one buys them. Screens with a
 * question they cannot answer are still skippable: none of this gates
 * Continue.
 */
/* Exported so scripts/scenes can photograph it. These screens only
   exist eight taps into a modal behind a partner session, and the
   exact-number field beside the chips is the sort of thing that has to
   be looked at rather than reasoned about. */
export function OperationsStep({ screen, value, onChange }) {
  if (!screen) return null

  /* Where this group's answer is kept.
     Not g.id: eight trades have an ops group whose id already exists on
     their detail screen, and both wrote to the same key — so ticking
     "second shooter" on Photography's ops screen erased the lighting and
     drone ticked on the detail screen, with nothing on screen to say so.
     See operationScreensFor in data/partnerOperations.js. */
  const keyOf = g => g.stateKey ?? g.id

  function toggle(g, choiceId) {
    /* The functional updater, not a spread of `value`. Two taps inside
       one React batch both build on the same object otherwise, and the
       second silently discards the first. */
    onChange(prev => {
      if (g.type === 'one') {
        return { ...prev, [keyOf(g)]: prev[keyOf(g)] === choiceId ? undefined : choiceId }
      }
      const cur = Array.isArray(prev[keyOf(g)]) ? prev[keyOf(g)] : []
      return {
        ...prev,
        [keyOf(g)]: cur.includes(choiceId) ? cur.filter(x => x !== choiceId) : [...cur, choiceId],
      }
    })
  }

  return (
    <div className="space-y-4">
      {screen.why && (
        <p className="text-[13px] leading-relaxed text-ink-soft">{screen.why}</p>
      )}

      {screen.groups.map(g => (
        <div key={g.id} className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <p className="text-[14px] font-extrabold leading-tight text-ink">{g.question}</p>
          {g.hint && (
            <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{g.hint}</p>
          )}

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {g.choices.map(c => {
              const cur = value[keyOf(g)]
              const on = g.type === 'one' ? cur === c.id : Array.isArray(cur) && cur.includes(c.id)
              return (
                <button
                  key={c.id} type="button" onClick={() => toggle(g, c.id)} aria-pressed={on}
                  className={`rounded-full px-3.5 py-2 text-[13px] font-bold transition ${
                    on ? 'bg-forest-600 text-white ring-2 ring-forest-600'
                       : 'bg-ink/[0.03] text-ink-soft ring-1 ring-ink/[0.08]'
                  }`}
                >
                  {c.label}
                  {on && c.scan && <span className="ml-1.5 font-semibold opacity-70">{c.scan}</span>}
                </button>
              )
            })}
          </div>

          {/* ── The exact number, sharing the chips' value ──────────────
              One field, not two: typing 9 while "6" stayed lit would
              leave the caterer looking at two different answers to one
              question with no way to know which we kept.

              So a chip is only a fast way to fill this in, and a typed
              number that is not one of the chips lights none of them.
              The bands it replaces were the reason "6 or more" covered a
              house function and a wedding identically. */}
          {g.exact && (
            <label className="mt-2.5 flex items-center gap-2">
              <span className="shrink-0 text-[12px] font-bold text-ink-mute">
                {g.exact.label}
              </span>
              <input
                value={g.choices.some(c => c.id === value[keyOf(g)]) ? '' : (value[keyOf(g)] ?? '')}
                onChange={e => {
                  const n = e.target.value.replace(/\D/g, '').slice(0, 6)
                  onChange(prev => ({ ...prev, [keyOf(g)]: n || undefined }))
                }}
                inputMode="numeric"
                placeholder="—"
                aria-label={`${g.question} — exact number`}
                className="w-20 rounded-xl bg-white px-3 py-2 text-center text-[14px] font-extrabold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
              />
              {g.exact.unit && (
                <span className="text-[12px] font-bold text-ink-mute">{g.exact.unit}</span>
              )}
            </label>
          )}

          {/* Every question takes what our list does not have. */}
          <div className="relative mt-2.5">
            <input
              value={value[`${keyOf(g)}__other`] ?? ''}
              onChange={e => {
                const t = e.target.value
                onChange(prev => ({ ...prev, [`${keyOf(g)}__other`]: t }))
              }}
              placeholder="Something else? Type it here"
              className="w-full rounded-2xl bg-ink/[0.02] py-2.5 pl-3.5 pr-20 text-[13px] font-semibold text-ink ring-1 ring-ink/[0.06] placeholder:font-normal placeholder:text-ink-mute"
            />
            {(value[`${keyOf(g)}__other`] ?? '').trim().length > 0 && (
              <span className="pointer-events-none absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-forest-50 px-2 py-1 text-[10.5px] font-extrabold text-forest-700">
                <Check size={10} /> Saved
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The à la carte library — 479 dishes across 20 groups.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS SEPARATE FROM THE MENUS
 * ══════════════════════════════════════════════════════════════════════
 *
 * A set menu is what gets BOOKED. This is what a caterer can COOK, and
 * they are different questions with different answers: somebody who
 * serves Option 2 can still make Majjige Huli for a griha pravesha that
 * was never on any card.
 *
 * It is also how a family who wants one specific dish finds anybody at
 * all. "Do you make Hayagreeva" is currently a phone call to six
 * caterers; it should be a filter.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FOLDED, AND SKIPPABLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * 479 tick boxes is not a form, it is a punishment. Every group is shut
 * until opened, "all" fills a group in one tap, and Continue works with
 * nothing ticked — a caterer can come back to this on a slow afternoon,
 * which is when it will actually get done properly.
 */
function DishStep({ chosen, onChange }) {
  const [open, setOpen] = useState(null)
  const picked = new Set(chosen)

  function toggle(name) {
    onChange(picked.has(name) ? chosen.filter(x => x !== name) : [...chosen, name])
  }
  function toggleGroup(g) {
    const all = g.items.every(i => picked.has(i))
    onChange(all
      ? chosen.filter(x => !g.items.includes(x))
      : [...new Set([...chosen, ...g.items])])
  }

  return (
    <>
      <div className="mb-3 rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <p className="text-[13.5px] font-extrabold text-ink">
          Tick the dishes you make well
        </p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
          This is how somebody looking for one particular dish finds you.
          You can skip it now and fill it in later.
        </p>
        {/* Sans, not the display serif. The serif zero at this size reads
            as a broken glyph rather than a number -- and "0 of 584" is
            the first thing a caterer sees on this screen, so it is the
            worst possible place for something that looks like a bug. */}
        <p className="mt-2 text-[19px] font-extrabold tracking-tight text-ink tabular-nums">
          {chosen.length}
          <span className="ml-1.5 text-[12px] font-bold text-ink-mute">
            of {TOTAL_DISHES} ticked
          </span>
        </p>
      </div>

      <div className="space-y-2">
        {ALL_DISH_GROUPS.map(g => {
          const n = g.items.filter(i => picked.has(i)).length
          const isOpen = open === g.id
          return (
            <div key={g.id} className="overflow-hidden rounded-[18px] bg-white ring-1 ring-ink/[0.06]">
              <div className="flex items-center gap-2 p-3.5">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : g.id)}
                  aria-expanded={isOpen}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block text-[14px] font-extrabold leading-tight text-ink">
                    {g.label}
                  </span>
                  <span className="block text-[11.5px] text-ink-mute">
                    {g.scan ? g.scan + ' · ' : ''}{n ? n + ' of ' + g.items.length : g.items.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleGroup(g)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition ${
                    n === g.items.length ? 'bg-forest-600 text-white' : 'bg-ink/[0.04] text-ink-soft'
                  }`}
                >
                  {n === g.items.length ? 'Clear' : 'All'}
                </button>
                <ChevronRight
                  size={16}
                  className={`shrink-0 text-ink-mute transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
              </div>

              {isOpen && (
                <div className="flex flex-wrap gap-1.5 border-t border-ink/[0.06] p-3.5">
                  {g.items.map(i => {
                    const on = picked.has(i)
                    return (
                      <button
                        key={i} type="button" onClick={() => toggle(i)} aria-pressed={on}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                          on ? 'bg-forest-600 text-white' : 'bg-ink/[0.03] text-ink-soft ring-1 ring-ink/[0.07]'
                        }`}
                      >
                        {i}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════ */

function PriceStep({
  menus, price, setPrice, unit, setUnit, minOrder, setMinOrder,
  isCatering, menuRates, setMenuRates,
  chargesByDistance, distanceRates, setDistanceRates,
  isVenue, venueTerms, setVenueTerms,
}) {
  return (
    <div className="space-y-4">
      {/* ── A rate per menu ────────────────────────────────────────────
          This used to be a read-only list of our own reference rates
          above a single "your price" field. It showed a caterer three
          menus and then asked for one number, which is a question with no
          honest answer. Now each menu they ticked has its own field, and
          the card above them says plainly what Sambramo does with the
          number — because being told after the first job is how a partner
          decides the platform was not straight with them. */}
      {isCatering && menus.length > 0 && (
        <PriceGuidance menus={menus} rates={menuRates} onChange={setMenuRates} />
      )}

      {/* A transporter's rate is four numbers, not one. See
          DistanceRates for why a single field could not hold it. */}
      {chargesByDistance && (
        <DistanceRates rates={distanceRates} onChange={setDistanceRates} />
      )}

      {/* A rent, a deposit, and the six lines that usually turn up after
          the advance is paid. See VenueTerms. */}
      {isVenue && <VenueTerms value={venueTerms} onChange={setVenueTerms} />}

      {/* ── The three objections, answered on the screen they surface ──
          What does it cost me, can I say no, and do I actually get paid.
          They are asked here and nowhere else in the flow — a promise
          repeated on eleven screens is wallpaper, and wallpaper is not
          believed. */}
      <PromiseStrip />

      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-extrabold text-ink">
            Your price
          </span>
          <span className="mb-2 block text-[12px] leading-snug text-ink-soft">
            Leave it blank if you would rather quote each job. Nothing is
            shown to a customer until our team has checked it.
          </span>
          <div className="flex items-center gap-2">
            <span className="font-serif text-[20px] font-extrabold text-ink">₹</span>
            <input
              value={price}
              onChange={e => setPrice(e.target.value.replace(/\D/g, '').slice(0, 7))}
              inputMode="numeric"
              placeholder="450"
              className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-3 text-[16px] font-extrabold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
            />
          </div>
        </label>

        <p className="mb-1.5 mt-3.5 text-[12px] font-extrabold uppercase tracking-[0.06em] text-ink-mute">
          Per what?
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SERVICE_UNITS.map(u => (
            <button
              key={u.id} type="button" onClick={() => setUnit(u.id)}
              className={`rounded-full px-3.5 py-2 text-[12.5px] font-bold transition ${
                unit === u.id ? 'bg-forest-600 text-white ring-2 ring-forest-600' : 'bg-ink/[0.03] text-ink-soft ring-1 ring-ink/[0.08]'
              }`}
            >
              {u.id}
            </button>
          ))}
        </div>
      </div>

      {/* ── The smallest order YOU will take ──────────────────────────
          Asked once, here, next to the other numbers, in the caterer's
          own words. It used to be printed on twelve menu cards as
          "min 100" -- which states it as OUR rule, before the caterer
          has been asked. Their floor is their business; a customer-side
          minimum is a separate decision that belongs to us. */}
      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <p className="text-[13px] font-extrabold text-ink">
          Smallest order you will take
        </p>
        <p className="mb-2 mt-0.5 text-[12px] leading-snug text-ink-soft">
          Below this it is not worth your while. Leave it blank if you have
          no floor.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {['25', '50', '100', '200', '500'].map(n => {
            const on = minOrder === n
            return (
              <button
                key={n} type="button" onClick={() => setMinOrder(on ? '' : n)}
                aria-pressed={on}
                className={`rounded-full px-3.5 py-2 text-[13px] font-bold transition ${
                  on ? 'bg-forest-600 text-white ring-2 ring-forest-600'
                     : 'bg-ink/[0.03] text-ink-soft ring-1 ring-ink/[0.08]'
                }`}
              >
                {n} plates
              </button>
            )
          })}
        </div>
        <div className="relative mt-2.5">
          <input
            value={/^\d*$/.test(minOrder) ? '' : minOrder}
            onChange={e => setMinOrder(e.target.value)}
            placeholder="Or say it your way — “one function, any size”"
            className="w-full rounded-2xl bg-ink/[0.02] py-2.5 pl-3.5 pr-20 text-[13px] font-semibold text-ink ring-1 ring-ink/[0.06] placeholder:font-normal placeholder:text-ink-mute"
          />
          {minOrder && !/^\d+$/.test(minOrder) && (
            <span className="pointer-events-none absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-forest-50 px-2 py-1 text-[10.5px] font-extrabold text-forest-700">
              <Check size={10} /> Saved
            </span>
          )}
        </div>
      </div>

      {isCatering && (
        <div className="rounded-[20px] bg-ink/[0.02] p-4">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">
            Standard terms
          </p>
          <ul className="mt-2 space-y-1">
            {CATERING_NOTES.map(n => (
              <li key={n} className="flex gap-2 text-[12px] leading-snug text-ink-soft">
                <span className="text-ink-mute">·</span>{n}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */

export function ReviewStep({
  trade, picked, detail, groups, opsScreens = [], menus, counters,
  dishes = [], price, unit, work = [], cardDishes = [],
}) {
  /* ── Read the same key the screen wrote ─────────────────────────────
     An ops group's answer lives under its stateKey, not its id: eight
     trades have an ops group whose id also exists on their detail
     screen, and sharing one key destroyed one of the two answers.

     This screen used to walk `groups` alone, so the operations answers
     never appeared on it at all. A partner answered up to fifteen
     questions about how they work, reached the summary that claims to
     show what they are listing, and none of it was there. Review is the
     last chance to catch a wrong answer, and it was quietly showing
     about a third of them. */
  const labels = (g, key) => {
    const v = detail[key]
    if (!v) return []
    const ids = Array.isArray(v) ? v : [v]
    return ids
      .map(id => (g.choices ?? []).find(c => c.id === id)?.label
        /* A typed exact number matches no chip. Showing nothing would
           read as "not answered" on the one screen meant to prove it
           was. */
        ?? (/^\d+$/.test(id) ? [id, g.exact?.unit].filter(Boolean).join(' ') : null))
      .filter(Boolean)
  }

  const answered = groups.flatMap(g => labels(g, g.id))
  const operations = opsScreens.map(s => ({
    title: s.title,
    lines: (s.groups ?? []).flatMap(g => {
      const got = labels(g, g.stateKey ?? g.id)
      return got.length ? [{ q: g.question, a: got.join(' · ') }] : []
    }),
  })).filter(s => s.lines.length)

  /* Counted before it is listed. Ten minutes of ticking produces a lot
     of small facts, and "312 things" is the sentence that tells somebody
     the time was worth spending — the individual cards below are for
     checking, this is for believing. */
  const claims = picked.length + menus.length + counters.length
    + dishes.length + cardDishes.length
    + answered.length + operations.reduce((t, x) => t + x.lines.length, 0)

  return (
    <div className="space-y-3">
      {/* ── What it adds up to ───────────────────────────────────────
          First, because the rest of this screen is a list and a list
          does not tell you whether it is a big one. */}
      <div className="overflow-hidden rounded-[22px] bg-kumkuma-600 p-4 text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/75">
          Ready to submit
        </p>
        <p className="mt-1 font-display text-[22px] font-extrabold leading-tight">
          {claims} {claims === 1 ? 'thing' : 'things'} you have told us
          you can do
        </p>
        <p className="mt-1 text-[12.5px] font-semibold leading-snug text-white/85">
          Every one of them is something a job can be matched on. Check it
          below — after this a person reads it, and anything wrong is
          easier to fix now than after your first offer.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            [picked.length, 'services'],
            [menus.length, 'menu cards'],
            [cardDishes.length, 'dishes'],
            [work.filter(w => w.kind === 'photo').length, 'photos'],
            [work.filter(w => w.kind === 'video').length, 'videos'],
            [work.filter(w => w.kind === 'testimonial').length, 'testimonials'],
          ].filter(([x]) => x > 0).map(([x, label]) => (
            <span key={label} className="rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-extrabold ring-1 ring-white/25">
              {/* "1 videos" is the kind of small wrongness that makes a
                  screen feel unfinished, and the labels are plural
                  because most counts are. */}
              {x} {x === 1 ? label.replace(/s$/, '') : label}
            </span>
          ))}
        </div>
      </div>

      {/* Before the detail, not after it: a partner deciding whether to
          spend the next tap should already know what the tap does. */}
      <WhatHappensNext at="submitted" />

      <Card title="Your trade">
        <p className="text-[14px] font-extrabold text-ink">{trade}</p>
      </Card>

      <Card title={picked.length === 1 ? 'What you are listing' : `What you are listing (${picked.length})`}>
        <ul className="space-y-1">
          {picked.map(n => (
            <li key={n} className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
              <Check size={13} className="shrink-0 text-forest-600" /> {n}
            </li>
          ))}
        </ul>
      </Card>

      {work.length > 0 && (
        <Card title={`What you are showing them (${work.length})`}>
          <ul className="space-y-1">
            {work.map((w, i) => (
              <li key={w.path ?? w.key ?? i} className="flex items-start gap-2 text-[13px] text-ink-soft">
                <Check size={13} className="mt-1 shrink-0 text-forest-600" />
                <span>
                  <span className="font-semibold text-ink">
                    {w.kind === 'testimonial'
                      ? (w.said_by ? `${w.said_by} said` : 'A testimonial')
                      : w.kind === 'video' ? 'Video'
                      : w.kind === 'document' ? 'Document' : 'Photo'}
                  </span>
                  {w.caption ? ` — ${w.caption}` : ''}
                  {w.kind === 'testimonial' && w.body ? ` — “${w.body.slice(0, 70)}”` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {answered.length > 0 && (
        <Card title="What you do">
          <p className="text-[13px] leading-relaxed text-ink-soft">{answered.join(' · ')}</p>
        </Card>
      )}

      {operations.map(s => (
        <Card key={s.title} title={s.title}>
          <ul className="space-y-1.5">
            {s.lines.map(l => (
              <li key={l.q} className="text-[13px] leading-snug">
                <span className="text-ink-mute">{l.q}</span>
                <span className="ml-1.5 font-semibold text-ink">{l.a}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {menus.length > 0 && (
        <Card title={`Menus (${menus.length})`}>
          <ul className="space-y-1">
            {menus.map(m => (
              <li key={m.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-semibold text-ink">{m.name}</span>
                <span className="shrink-0 text-ink-mute tabular-nums">
                  {menuLineCount(m)} dishes · from ₹{m.fromPrice}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {counters.length > 0 && (
        <Card title="Counters">
          <p className="text-[13px] text-ink-soft">{counters.map(c => c.name).join(' · ')}</p>
        </Card>
      )}

      {dishes.length > 0 && (
        <Card title="Dishes you make">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            {/* Dishes are STORED by id and READ by name. Printing the
                raw entries here would show a caterer "SBM-KA-RA-131"
                where they ticked Bisi Bele Bath — the id exists so
                dispatch can match, and it should never surface to the
                person who ticked it. */}
            <span className="font-extrabold text-ink">{dishes.length}</span> ticked
            {' — '}
            {dishes.slice(0, 6).map(d => DISH_BY_ID[d]?.name ?? d).join(', ')}
            {dishes.length > 6 && ' and ' + (dishes.length - 6) + ' more'}
          </p>
        </Card>
      )}

      <Card title="Price">
        <p className="font-serif text-[20px] font-extrabold tracking-tight text-ink">
          {price === '' ? 'Quote on request' : `₹${Number(price).toLocaleString('en-IN')}`}
          {price !== '' && <span className="ml-1.5 font-sans text-[12px] font-bold text-ink-mute">{unit}</span>}
        </p>
      </Card>

      {/* What used to be a two-line "What happens now" card sat here, at
          the BOTTOM — after everything, where somebody deciding whether
          to submit has already decided. It says more, and says it first,
          as WhatHappensNext at the top of this screen. */}
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <p className="mb-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">
        {title}
      </p>
      {children}
    </div>
  )
}
