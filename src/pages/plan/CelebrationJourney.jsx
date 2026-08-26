import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Gift, PartyPopper } from 'lucide-react'

import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useCity } from '../../context/CityContext'
import { friendlyError } from '../../context/ToastContext'
import { BRAND } from '../../config/sambramo'
import { EVENT_DATA } from '../../data/eventServicesData'
import {
  blueprintFor, chaptersFor, coreChapters, extraChapters, decorStepFor, decorOptionFor,
  menuModeFor, defaultGuestsFor, defaultVenueFor, isOutdoorVenue, venueLabelFor,
} from '../../data/celebrationBlueprints'
import { CIRCLE_BY_ID, circleForGuests, allowanceFor } from '../../data/guestCircles'
import { CUISINE_BY_ID, COURSES, dishesFor, defaultMenu } from '../../data/cuisineMenus'
import { DECOR_LEVEL_BY_ID } from '../../data/decorPackages'
import { LOCK_AMOUNT } from '../../data/celebrationTiers'
import { SPECIAL_REQUESTS } from '../../data/menuPairings'
import { PACK_BY_ID, defaultPackQty } from '../../data/servicePacks'
import { journeyQuote, journeyToText, journeyServiceRows } from '../../lib/journeyQuote'
import { celebrationSavings } from '../../lib/savings'
import { EXTRA_DISH_RATE, quoteToText } from '../../utils/quote'
import { saveDraft, loadDraft, clearDraft } from '../../lib/draftStore'
import { noteDetail } from '../../lib/journey'
import { slotByKey } from '../../lib/demand'

import { JourneyBar, JourneyActions, ACTION_BAR_CLEARANCE } from '../../components/journey/JourneyChrome'
import StepJumper from '../../components/journey/StepJumper'
import ChapterStep, { autoAdvances } from '../../components/journey/ChapterStep'
import { GuestStep, CircleStep, VenueStep, MealGateStep } from '../../components/journey/ScaleSteps'
import { CuisineStep, CourseStep, courseStepsFor } from '../../components/journey/MenuSteps'
import MenuAllStep from '../../components/journey/MenuAllStep'
import ExtrasShelf from '../../components/journey/ExtrasShelf'
import { DecorLevelStep, DecorThemeStep, DecorAddonStep, DecorOwnStep } from '../../components/journey/DecorSteps'
import PairingSheet from '../../components/journey/PairingSheet'
import RevealStep from '../../components/journey/RevealStep'
import ContactBlock, { contactBlocked, eventDateBlocked, phoneDigitsOf } from '../../components/plan/ContactBlock'
import PriceLock from '../../components/plan/PriceLock'

/**
 * The guided celebration journey.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS IS, AND WHY IT SITS BESIDE THREE OTHER PLANNING SCREENS
 * ══════════════════════════════════════════════════════════════════════
 *
 * `/plan/custom` asks six questions and promises a call back.
 * `/services/:id` is the occasion catalogue: everything we sell, priced.
 * `/plan/build` is the live estimator — pick, and watch the number move.
 *
 * All three assume a customer who has already decided roughly what they want
 * and is now shopping. This is for the one who has not: somebody who tapped
 * "Birthday" because their mother turns sixty in November and who could not
 * tell you what a décor level is, let alone which of eight scales their
 * family is.
 *
 * ── The one rule everything else follows ──────────────────────────────
 * NO PRICE UNTIL THE END.
 *
 * Not a running total, not a "from ₹", not a per-plate figure on a cuisine
 * card. The occasion page opens on "from ₹26,750" and the builder pins an
 * estimate to the bottom of the screen — correct for a shopper, and for
 * everyone else it is a stranger quoting at you before hello. In this market
 * that does not start a negotiation, it ends a visit: the family closes the
 * app and rings the caterer their cousin used, because at least he asked
 * about the function first.
 *
 * The two deliberate exceptions, both of which protect the customer rather
 * than sell to them: a dish carrying a genuine premium says so (`+₹65/plate`),
 * and going over the included dish count says what that costs. A surcharge
 * somebody was not warned about is worse at the reveal than a number was
 * early.
 *
 * ── One decision per screen, and not one screen more ──────────────────
 * Thirty services in a grid is a procurement form. This asks one question at
 * a time, in the order a family actually decides — who is coming, how big,
 * where, the rite, the cake, the food, the look, the memories, the guests,
 * what they take home, and the unglamorous things that decide whether any of
 * it works. Each question carries the single sentence that earns it. See
 * data/celebrationBlueprints.js, which holds all twenty-five occasions.
 *
 * The corollary took a second pass to get right. One-question-per-screen is
 * only a kindness while the questions are worth asking: measured after the
 * catalogue grew, an aksharabhyasa — a twenty-minute rite before school — was
 * twenty-four screens, and a vahana pooja was twenty-six. Four things fixed
 * that without removing a single service, and all four are declared on the
 * blueprint rather than decided here:
 *
 *   `core`     which chapters earn their own screen. Everything else goes on
 *              ONE shelf near the end (ExtrasShelf), openable in place.
 *   `decor`    what decoration means at this occasion — and it is answer-
 *              aware, so a four-year-old's party is offered a themed backdrop
 *              and a seventieth is offered a garlanded chair and a lamp.
 *   `menu`     seven course screens where the menu is a project, one screen
 *              with seven sections where it is a meal.
 *   `food`     whether there is a meal at all, asked once, where the honest
 *              answer can be no.
 *
 * ── And every option is narrowed to the answer ────────────────────────
 * `showIf` decides whether a chapter appears; `packsFor` and `recommendFor`
 * decide what is on it. The flow correctly stopped offering a magician at a
 * sixtieth and then offered that family the same five cakes it offers a
 * four-year-old. It does not any more — see `narrow()` in the blueprints.
 *
 * Net effect, at each occasion's own default headcount: a vahana pooja went
 * from 26 screens to 13, an aksharabhyasa from 24 to 11, a wedding from 32 to
 * 25 — because a wedding genuinely is that many decisions and nothing else in
 * this catalogue is.
 */

/** A journey waiting out a login, then submitted on the way back. */
const DRAFT_KEY = 'sambramo_journey_draft'
/** A journey waiting out an interruption, which is only ever restored. */
const RESUME_KEY = 'sambramo_journey_resume'

/**
 * The chapters that belong before the food.
 *
 * The blueprint lists chapters in one flat order; the flow splits them around
 * the menu, because the menu is the centre of the decision and burying it
 * behind twenty service questions gets it answered by somebody who has
 * stopped concentrating. What goes first is what a family settles first: the
 * rite (which fixes the clock), the cake, and how people sit to eat — all
 * three of which are really questions about the meal anyway.
 */
const BEFORE_FOOD_SERVICES = new Set(['priest', 'pooja', 'nadaswaram', 'cake', 'dining'])
const beforeFood = ch =>
  ch.id === 'precleanup' || (ch.kind === 'service' && BEFORE_FOOD_SERVICES.has(ch.serviceId))

/**
 * "The venue handles the clearing" → "the venue handles the clearing".
 *
 * So a blueprint's refusal sentence can be dropped after "No — " and still
 * read as one sentence. Left alone when the first word is a proper noun or an
 * initial, because "No — we have already bought them" is right and "No — i
 * have already bought them" is not.
 */
const lowerFirst = text =>
  !text || text[0] !== text[0].toUpperCase() || text[1] === text[1]?.toUpperCase()
    ? text
    : text[0].toLowerCase() + text.slice(1)

/**
 * Which part of the plan a screen belongs to, for the jump sheet.
 *
 * Five sections rather than twenty-seven rows, because the sections are the
 * shape the customer already walked through and a flat list of twenty-seven
 * cards is the queue the sheet exists to replace.
 */
const SECTIONS = {
  basics: 'The basics',
  food: 'The food',
  look: 'How it looks',
  day: 'The day itself',
  finish: 'Finishing up',
}

export default function CelebrationJourney() {
  const { occasionId: routeOccasion } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user, profile } = useAuth()
  const { city, openCityPicker } = useCity()

  const occasionId = routeOccasion && EVENT_DATA[routeOccasion] ? routeOccasion : 'birthday'
  const occasion = EVENT_DATA[occasionId]
  const blueprint = useMemo(() => blueprintFor(occasionId), [occasionId])

  /* ── The answers ──────────────────────────────────────────────────── */
  const [guests, setGuests] = useState(() => Number(searchParams.get('guests')) || defaultGuestsFor(occasionId))
  const [circleId, setCircleId] = useState(null)
  // A fixed venue is settled before the flow starts — a gruha pravesha is at
  // the new house, a bhoomi pooja is on the plot — so it is the initial value
  // rather than something the venue screen fills in when it is reached. That
  // way the jump sheet shows it as answered from the first screen, which is
  // what it is.
  const [venue, setVenue] = useState(() => defaultVenueFor(occasionId))
  const [choices, setChoices] = useState({})
  const [selections, setSelections] = useState({})
  const [cuisineId, setCuisineId] = useState(null)
  /**
   * Whether there is a meal at all.
   *
   * `null` until asked, and only ever asked for the occasions whose blueprint
   * declares `food.optional` — a vahana pooja, a shop opening, a mundan, an
   * aksharabhyasa. Everywhere else it stays `null` and behaves as `true`,
   * which is what it always was.
   *
   * `false` removes the cuisine screen, every course screen, and the catering
   * line from the estimate. Before this existed, somebody arranging a
   * forty-minute pooja in a temple yard was walked through five courses of a
   * Karnataka spread and shown a total with ₹65,000 of lunch in it.
   */
  const [serveMeal, setServeMeal] = useState(null)
  const [vegOnly, setVegOnly] = useState(blueprint.vegDefault ?? true)
  const [menu, setMenu] = useState({})
  const [specialTags, setSpecialTags] = useState([])
  const [specialRequests, setSpecialRequests] = useState('')
  const [decorLevelId, setDecorLevelId] = useState(null)
  /**
   * The occasion's own décor answer, where the occasion has its own.
   *
   * `decorLevelId` stays the thing the quote engine prices — it has to, or
   * every occasion with bespoke décor copy would need its own pricing path.
   * This is the label beside it: "Banana stems and a toran" rather than
   * "Home Touch", which is what the customer actually chose and the only
   * name they will recognise on the estimate.
   */
  const [decorChoiceId, setDecorChoiceId] = useState(null)
  const [themeId, setThemeId] = useState(null)
  const [addonIds, setAddonIds] = useState([])
  const [eventDate, setEventDate] = useState(searchParams.get('date') ?? '')
  const [timeSlot, setTimeSlot] = useState(searchParams.get('slot') ?? '')
  const [chosenCity, setChosenCity] = useState(city ?? BRAND.pilotCities[0])
  const [contact, setContact] = useState({
    name: profile?.full_name ?? '', phone: profile?.phone ?? '', email: profile?.email ?? '',
  })

  /* ── Where we are ─────────────────────────────────────────────────── */
  const [stepKey, setStepKey] = useState(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [enquiryId, setEnquiryId] = useState(null)
  const [lockClaimed, setLockClaimed] = useState(false)
  const [pairing, setPairing] = useState(null)

  /* ── Everything derived ───────────────────────────────────────────── */
  const circle = CIRCLE_BY_ID[circleId] ?? circleForGuests(guests)
  const allowance = useMemo(() => allowanceFor(circle.id), [circle.id])
  const cuisine = CUISINE_BY_ID[cuisineId]
  const decorLevel = DECOR_LEVEL_BY_ID[decorLevelId]

  /**
   * Which questions apply to this customer.
   *
   * Recomputed from every answer that can gate one, so answering "a child,
   * five to twelve" makes the magician chapter appear and answering "an
   * elder" makes the homa chapter appear instead — without either of them
   * having existed in the flow a moment ago.
   */
  const flags = useMemo(() => {
    const out = {}
    for (const chapter of blueprint.chapters) {
      if (chapter.kind !== 'choice') continue
      const answer = choices[chapter.id]
      const ids = Array.isArray(answer) ? answer : answer ? [answer] : []
      for (const id of ids) Object.assign(out, chapter.options.find(o => o.id === id)?.flags ?? {})
    }
    return out
  }, [blueprint, choices])

  /**
   * Everything the blueprint's gates read, in one place.
   *
   * `showIf`, `packsFor`, `recommendFor`, `core` and `decor` are all
   * functions of this object now, so it has to be built once and passed
   * everywhere — an answer-aware flow whose two callers disagree about the
   * context is worse than one that was never answer-aware.
   */
  const ctx = useMemo(() => ({
    flags, guests, circleId: circle.id,
    outdoor: isOutdoorVenue(occasionId, venue), venueKind: venue,
  }), [flags, guests, circle.id, occasionId, venue])

  const chapters = useMemo(() => chaptersFor(occasionId, ctx), [occasionId, ctx])

  /** The decisions that earn a screen, and the ones that share a shelf. */
  const core = useMemo(() => coreChapters(occasionId, chapters, ctx), [occasionId, chapters, ctx])
  const extras = useMemo(() => extraChapters(occasionId, chapters, ctx), [occasionId, chapters, ctx])

  /** How decoration is asked at this occasion, for this answer. */
  const decorStep = useMemo(() => decorStepFor(occasionId, ctx), [occasionId, ctx])

  /** Seven screens of menu, or one. */
  const menuMode = useMemo(() => menuModeFor(occasionId, guests), [occasionId, guests])

  /**
   * The flow, as a flat list of screens.
   *
   * Rebuilt on every answer rather than fixed at the start, because the whole
   * point of the blueprint is that the questions change as they are answered.
   * Navigation is therefore by KEY, never by index — an index into a list that
   * just grew by three chapters points at the wrong screen.
   */
  const steps = useMemo(() => {
    const list = [
      // ── The framing questions, first ────────────────────────────────
      // "Whose birthday is it?", "Which functions are we planning?",
      // "Which tradition are we following?" — the ones that decide which
      // chapters exist at all. They have to be answered before the flow can
      // know what to ask, and they cost nothing: no number to think about,
      // no commitment, just a tap on the thing you came here for.
      //
      // They were originally grouped with the after-food chapters, which put
      // "Whose birthday are we planning?" on screen fourteen — after the app
      // had already offered a bouncy castle and a magician to a family
      // planning a sixtieth. A question that gates other questions cannot be
      // asked after them.
      ...core.filter(ch => ch.kind === 'choice').map(ch => ({ key: `ch:${ch.id}`, chapter: ch })),
      { key: 'guests' },
    ]

    // ── The scale question, only where it is a question ──────────────
    // Four circles is a useful thing to ask a family who said 120 and could
    // reasonably mean either of two rungs. At fifteen guests there is one
    // honest answer and the screen is a tap the customer pays for with
    // nothing. It is derived from the headcount below that.
    if (guests >= 40) list.push({ key: 'circle' })

    list.push(
      { key: 'venue' },
      ...core.filter(ch => ch.kind !== 'choice' && beforeFood(ch)).map(ch => ({ key: `ch:${ch.id}`, chapter: ch })),
    )

    // ── Is there a meal at all? ──────────────────────────────────────
    // Asked once, immediately before the food, and only where the answer
    // can honestly be no. Declining removes the cuisine screen and every
    // course screen underneath it — four to six screens for somebody whose
    // function ends with a packet of kesari bath.
    if (blueprint.food?.optional) list.push({ key: 'meal_gate' })
    if (serveMeal !== false) {
      list.push({ key: 'cuisine' })
      // Seven screens where the menu is a project, one where it is a meal.
      if (menuMode === 'courses') {
        list.push(...courseStepsFor(allowance, menu).map(c => ({ key: `course:${c.id}`, course: c })))
      } else {
        list.push({ key: 'menu_all' })
      }
    }

    // ── How it looks ─────────────────────────────────────────────────
    // `none` means the occasion already asked — a vahana pooja chose its
    // garland eight screens ago, and the generic ladder afterwards would be
    // offering a motorcycle a cake table.
    if (decorStep.mode === 'own') {
      list.push({ key: 'decor_own' })
    } else if (decorStep.mode !== 'none') {
      list.push({ key: 'decor_level' })
      if (decorLevelId && decorLevelId !== 'none') {
        list.push({ key: 'decor_theme' }, { key: 'decor_addons' })
      }
    }

    list.push(
      ...core.filter(ch => ch.kind !== 'choice' && !beforeFood(ch)).map(ch => ({ key: `ch:${ch.id}`, chapter: ch })),
    )
    if (extras.length) list.push({ key: 'extras' })
    list.push({ key: 'reveal' }, { key: 'details' })
    return list
  }, [core, extras, guests, allowance, menu, menuMode, decorStep, decorLevelId, blueprint.food, serveMeal])

  /**
   * The whole plan as a board — every screen, what state it is in, and what
   * was chosen on it.
   *
   * This is what the filter sheet in the app bar renders, and it is the only
   * thing in the flow that shows more than one decision at a time. That is
   * deliberate and it is not a retreat from one-question-per-screen: the flow
   * still WALKS in order, and this is the way out of the walk for the
   * customer who came for two things out of twenty-seven, or who wants to
   * change an answer nine screens back.
   *
   * `summary` carries the NAME of what was chosen rather than its price —
   * "Full day — candid + traditional" — because that is what somebody
   * scanning for a mistake is looking for, and because a number here would
   * turn the sheet into a basket with a running total, which is the one thing
   * this flow exists not to be.
   */
  const jumpEntries = useMemo(() => steps.map(s => {
    const ch = s.chapter
    const packNames = ids => ids.map(id => PACK_BY_ID[id]?.name).filter(Boolean).join(', ')

    if (ch?.kind === 'choice') {
      const answer = choices[ch.id]
      const ids = Array.isArray(answer) ? answer : answer ? [answer] : []
      const names = ids.map(id => ch.options.find(o => o.id === id)?.name).filter(Boolean)
      return {
        key: s.key, emoji: ch.emoji, title: ch.title, section: SECTIONS.basics,
        status: names.length ? 'chosen' : 'todo',
        summary: names.join(', ') || ch.question,
      }
    }
    if (ch) {
      const picked = selections[ch.id]?.packIds ?? []
      return {
        key: s.key,
        emoji: ch.emoji,
        title: ch.title,
        section: beforeFood(ch) ? SECTIONS.food : SECTIONS.day,
        status: picked.length ? 'chosen' : selections[ch.id]?.skipped ? 'declined' : 'todo',
        summary: picked.length
          ? packNames(picked)
          : selections[ch.id]?.skipped
            ? (ch.skipLabel ?? 'Not needed')
            : ch.question,
      }
    }
    if (s.course) {
      const dishes = menu?.[s.course.id] ?? []
      return {
        key: s.key, emoji: '🍲', title: s.course.label, section: SECTIONS.food,
        status: dishes.length ? 'chosen' : 'todo',
        summary: dishes.length ? `${dishes.length} chosen` : 'Nothing picked yet',
      }
    }

    switch (s.key) {
      case 'guests':
        return { key: s.key, emoji: '👥', title: 'Guests', section: SECTIONS.basics, status: 'chosen', summary: `${guests} expected` }
      case 'circle':
        return { key: s.key, emoji: circle.emoji, title: 'The scale', section: SECTIONS.basics, status: circleId ? 'chosen' : 'todo', summary: circle.name }
      case 'venue':
        return { key: s.key, emoji: '📍', title: 'Where', section: SECTIONS.basics, status: venue ? 'chosen' : 'todo', summary: venue ? venueLabelFor(occasionId, venue) : 'Not decided' }
      case 'meal_gate':
        return {
          key: s.key, emoji: '🍽️', title: 'A meal?', section: SECTIONS.food,
          status: serveMeal === null ? 'todo' : serveMeal ? 'chosen' : 'declined',
          summary: serveMeal === null ? 'Not answered yet' : serveMeal ? 'Yes, there is a meal' : 'Sweets and refreshments only',
        }
      case 'cuisine':
        return { key: s.key, emoji: cuisine?.emoji ?? '🍛', title: 'The spread', section: SECTIONS.food, status: cuisineId ? 'chosen' : 'todo', summary: cuisine?.name ?? 'Not chosen yet' }
      case 'menu_all': {
        const n = COURSES.reduce((t, c) => t + (menu?.[c.id]?.length ?? 0), 0)
        return { key: s.key, emoji: '🍲', title: 'The menu', section: SECTIONS.food, status: n ? 'chosen' : 'todo', summary: n ? `${n} dishes chosen` : 'Nothing picked yet' }
      }
      case 'decor_own': {
        const option = decorOptionFor(occasionId, decorChoiceId, ctx)
        return {
          key: s.key, emoji: '🎨', title: 'Decoration', section: SECTIONS.look,
          status: !decorChoiceId ? 'todo' : decorChoiceId === 'none' ? 'declined' : 'chosen',
          summary: option?.name ?? (decorChoiceId === 'none' ? 'None needed' : 'Not chosen yet'),
        }
      }
      case 'extras': {
        const added = extras.filter(ch => (selections[ch.id]?.packIds?.length ?? 0) > 0).length
        return {
          key: s.key, emoji: '➕', title: 'Anything else', section: SECTIONS.day,
          status: added ? 'chosen' : 'todo',
          summary: added ? `${added} of ${extras.length} added` : `${extras.length} optional extras`,
        }
      }
      case 'decor_level':
        return {
          key: s.key, emoji: '🎨', title: 'Decoration', section: SECTIONS.look,
          status: !decorLevelId ? 'todo' : decorLevelId === 'none' ? 'declined' : 'chosen',
          summary: decorLevel?.name ?? 'Not chosen yet',
        }
      case 'decor_theme':
        return { key: s.key, emoji: '🎨', title: 'The colours', section: SECTIONS.look, status: themeId ? 'chosen' : 'todo', summary: themeId ? 'Chosen' : 'Not chosen yet' }
      case 'decor_addons':
        return { key: s.key, emoji: '✨', title: 'Extra touches', section: SECTIONS.look, status: addonIds.length ? 'chosen' : 'todo', summary: addonIds.length ? `${addonIds.length} added` : 'None added' }
      case 'reveal':
        return { key: s.key, emoji: '🧾', title: 'The estimate', section: SECTIONS.finish, status: 'todo', summary: 'Everything you chose, itemised' }
      default:
        return { key: s.key, emoji: '📞', title: 'Your details', section: SECTIONS.finish, status: contactBlocked(contact) ? 'todo' : 'chosen', summary: contact.name?.trim() || 'Who we should call' }
    }
  }), [steps, choices, selections, menu, guests, circle, circleId, venue, occasionId, ctx, extras,
       serveMeal, cuisine, cuisineId, decorLevelId, decorLevel, decorChoiceId, themeId, addonIds, contact])

  const stepIndex = Math.max(0, steps.findIndex(s => s.key === stepKey))
  const step = steps[stepIndex] ?? steps[0]

  // A step that has left the flow — the customer went back and switched décor
  // off while standing on the theme question — must not leave a blank screen.
  useEffect(() => {
    if (enquiryId || !steps.length) return
    // Two cases, one rule: land on a screen that exists. Either we have not
    // started yet (stepKey is null), or the screen we were standing on left
    // the flow — the customer went back and switched décor off while looking
    // at the colour question. Both would otherwise render nothing at all.
    if (!stepKey || !steps.some(s => s.key === stepKey)) {
      setStepKey(steps[Math.min(Math.max(stepIndex, 0), steps.length - 1)]?.key ?? steps[0].key)
    }
  }, [steps, stepKey, stepIndex, enquiryId])

  const quote = useMemo(
    () => journeyQuote(
      { circleId: circle.id, guests, cuisineId, vegOnly, menu, decorLevelId, themeId, addonIds, selections, includeCatering: serveMeal !== false },
      chapters,
    ),
    [circle.id, guests, cuisineId, vegOnly, menu, decorLevelId, themeId, addonIds, selections, chapters, serveMeal],
  )

  const savings = useMemo(() => {
    if (!quote) return null
    return celebrationSavings({
      tierId: quote.tier.id, guestCount: guests, cuisineId, vegOnly, menu,
      decorLevelId, themeId, addonIds, serviceIds: [], mode: 'full',
      includeCatering: serveMeal !== false, includeDecor: !!decorLevelId && decorLevelId !== 'none',
      extras: quote.extras, menuAllowance: allowance,
    })
  }, [quote, guests, cuisineId, vegOnly, menu, decorLevelId, themeId, addonIds, allowance, serveMeal])

  /* ── Moving ───────────────────────────────────────────────────────── */
  const topRef = useRef(null)
  const lastKey = useRef(stepKey)
  useEffect(() => {
    if (lastKey.current === stepKey) return
    lastKey.current = stepKey
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [stepKey])

  const goTo = useCallback(key => setStepKey(key), [])

  /**
   * The flow as it is RIGHT NOW, for anything that moves through it later.
   *
   * `steps` is rebuilt on every answer, and some answers make it longer —
   * choosing a décor level adds the colour and the add-ons screens. A
   * navigation callback that closes over `steps` therefore navigates the list
   * as it was BEFORE the answer, which skipped both of those screens for
   * every customer who picked a décor level. Reading through a ref means the
   * 340ms auto-advance lands on the screen the answer just created.
   */
  const stepsRef = useRef(steps)
  stepsRef.current = steps

  const goNext = useCallback(() => {
    setStepKey(current => {
      const list = stepsRef.current
      const i = list.findIndex(s => s.key === current)
      return list[i + 1]?.key ?? current
    })
  }, [])

  const goBack = useCallback(() => {
    setStepKey(current => {
      const list = stepsRef.current
      const i = list.findIndex(s => s.key === current)
      return i > 0 ? list[i - 1].key : current
    })
  }, [])

  /**
   * Move on by itself once a single-select answer lands.
   *
   * The delay is not decoration: with none, the screen appears to jump out
   * from under the thumb and people lose their place. With it, the tick is
   * visibly received and then the flow continues, which is what makes
   * twenty-nine chapters feel like a conversation rather than a form.
   */
  const advanceTimer = useRef(null)
  const scheduleAdvance = useCallback(() => {
    clearTimeout(advanceTimer.current)
    advanceTimer.current = setTimeout(goNext, 340)
  }, [goNext])
  useEffect(() => () => clearTimeout(advanceTimer.current), [])

  /* ── Menu handling ────────────────────────────────────────────────── */

  /**
   * Choosing a cuisine fills the whole menu in.
   *
   * Never leaves an empty form behind a choice. The circle's allowance is
   * taken from the top of each course, which the catalogue orders
   * most-recommended-first, so the customer lands on a complete spread they
   * could serve as-is and every change from there is one tap.
   */
  const pickCuisine = useCallback(id => {
    const next = CUISINE_BY_ID[id]
    setCuisineId(id)
    setMenu(next ? defaultMenu(next, allowance, { vegOnly }) : {})
  }, [allowance, vegOnly])

  const setDiet = useCallback(next => {
    setVegOnly(next)
    if (!cuisine) return
    if (next) {
      // Going pure veg has to DROP the non-veg dishes, not hide them —
      // otherwise a mutton biryani stays in the order and in the price while
      // the screen says pure vegetarian.
      const cleaned = {}
      for (const course of COURSES) {
        const ok = new Set(dishesFor(cuisine, course.id, { vegOnly: true }).map(d => d.id))
        cleaned[course.id] = (menu?.[course.id] ?? []).filter(id => ok.has(id))
      }
      setMenu(cleaned)
    } else {
      setMenu(defaultMenu(cuisine, allowance, { vegOnly: false }))
    }
  }, [cuisine, menu, allowance])

  const toggleDish = useCallback((courseId, dishId) => {
    setMenu(current => {
      const list = current?.[courseId] ?? []
      return {
        ...current,
        [courseId]: list.includes(dishId) ? list.filter(d => d !== dishId) : [...list, dishId],
      }
    })
  }, [])

  /**
   * Tapping a dish adds it AND opens what it goes with.
   *
   * The pairing sheet only opens on an ADD, never on a remove — somebody
   * un-ticking poori is not asking what poori goes with — and never for a
   * dish in a course with no companions worth naming.
   */
  const tapDish = useCallback((courseId, dishId, dish) => {
    const wasPicked = (menu?.[courseId] ?? []).includes(dishId)
    toggleDish(courseId, dishId)
    if (!wasPicked) setPairing({ dish, courseId })
  }, [menu, toggleDish])

  const resetCourse = useCallback(courseId => {
    if (!cuisine) return
    const allowed = allowance?.[courseId] ?? 0
    setMenu(current => ({
      ...current,
      [courseId]: dishesFor(cuisine, courseId, { vegOnly }).slice(0, allowed).map(d => d.id),
    }))
  }, [cuisine, allowance, vegOnly])

  const toggleSpecial = useCallback(id => {
    setSpecialTags(current =>
      current.includes(id) ? current.filter(t => t !== id) : [...current, id])
  }, [])

  /* ── Chapter answers ──────────────────────────────────────────────── */

  const answerChoice = useCallback((chapter, value) => {
    setChoices(current => ({ ...current, [chapter.id]: value }))
    if (!chapter.multi) scheduleAdvance()
  }, [scheduleAdvance])

  const answerService = useCallback((chapter, value) => {
    setSelections(current => ({ ...current, [chapter.id]: value }))
    if (autoAdvances(chapter) && value.packIds?.length) scheduleAdvance()
  }, [scheduleAdvance])

  const skipChapter = useCallback(chapter => {
    // Recorded, not merely omitted. "No photographer — a cousin is doing it"
    // stops a coordinator ringing about it; silence does not, and they ring.
    setSelections(current => ({ ...current, [chapter.id]: { packIds: [], qty: {}, skipped: true } }))
    goNext()
  }, [goNext])

  /* ── The kitchen note ─────────────────────────────────────────────── */
  const kitchenNote = useMemo(() => {
    const tagged = SPECIAL_REQUESTS.filter(s => specialTags.includes(s.id)).map(s => s.note)
    const typed = specialRequests.trim()
    return [...tagged, typed].filter(Boolean).join('\n  ')
  }, [specialTags, specialRequests])

  /* ── Sending it ───────────────────────────────────────────────────── */
  const stateForDraft = useCallback(() => ({
    occasionId, guests, circleId: circle.id, venue, choices, selections,
    cuisineId, vegOnly, menu, specialTags, specialRequests,
    decorLevelId, decorChoiceId, themeId, addonIds, eventDate, timeSlot, chosenCity, contact, stepKey,
    // Carried explicitly rather than inferred from a missing cuisine: a
    // journey restored mid-flow, before the meal question was reached, is
    // not the same state as one where the customer said there is no meal.
    serveMeal, includeCatering: serveMeal !== false,
  }), [occasionId, guests, circle.id, venue, choices, selections, cuisineId, vegOnly, menu,
      specialTags, specialRequests, decorLevelId, decorChoiceId, themeId, addonIds, eventDate, timeSlot,
      chosenCity, contact, stepKey, serveMeal])

  const submit = useCallback(async (override) => {
    const s = override ?? stateForDraft()
    const liveChapters = chaptersFor(s.occasionId, {
      flags, guests: s.guests, circleId: s.circleId, outdoor: isOutdoorVenue(s.occasionId, s.venue), venueKind: s.venue,
    })
    const liveQuote = journeyQuote(s, liveChapters)
    if (!liveQuote) { setError('We could not price this — go back and check the guest count.'); return }

    const dateMessage = eventDateBlocked(s.eventDate)
    if (dateMessage) { setStepKey('details'); setError(dateMessage); return }
    const contactMessage = contactBlocked(s.contact)
    if (contactMessage) { setStepKey('details'); setError(contactMessage); return }

    // Asked at the point where there is something to save, and never before.
    // Somebody who has spent six minutes choosing gravies has earned an
    // explanation for the login, and "so we can send this to a coordinator"
    // is one.
    if (!user) {
      try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(s)) } catch { /* storage off — login still works */ }
      navigate('/login', { state: { from: { pathname: location.pathname, search: location.search } } })
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const liveCuisine = s.includeCatering === false ? null : CUISINE_BY_ID[s.cuisineId]
      const slot = slotByKey(s.timeSlot)
      const phone = `+91${phoneDigitsOf(s.contact?.phone)}`
      // Resolved through the blueprint rather than a two-branch ternary,
      // because the venue answers are now the occasion's own: "At the
      // showroom, on delivery" and "On the site itself" are real answers a
      // coordinator has to read, and neither is a pack id.
      const venueLabel = venueLabelFor(s.occasionId, s.venue)

      const tagged = SPECIAL_REQUESTS.filter(t => (s.specialTags ?? []).includes(t.id)).map(t => t.note)
      const note = [...tagged, (s.specialRequests ?? '').trim()].filter(Boolean).join('\n  ')

      const notes = [
        'CONTACT',
        `  Name:  ${s.contact?.name?.trim()}`,
        `  Phone: ${phone}`,
        s.contact?.email?.trim() ? `  Email: ${s.contact.email.trim()}` : '',
        `  When:  ${s.eventDate}${slot ? ` · ${slot.label} (${slot.hint})` : ''}`,
        `  Where: ${s.chosenCity} — ${venueLabel}`,
        '',
        `Raised through the guided journey (${CIRCLE_BY_ID[s.circleId]?.name ?? ''}, ${s.guests} guests).`,
        '',
        journeyToText(s, liveChapters),
        '',
        quoteToText(liveQuote, { menu: liveCuisine ? s.menu : {}, cuisine: liveCuisine, vegOnly: s.vegOnly }),
        note ? `\nFOR THE KITCHEN\n  ${note}` : '',
      ].filter(Boolean).join('\n')

      const payload = {
        customer_id: user.id,
        event_id: s.occasionId,
        event_name: EVENT_DATA[s.occasionId]?.name ?? 'Celebration',
        event_date: s.eventDate || null,
        start_time: slot?.start ?? null,
        guest_count: s.guests,
        location: {
          city: s.chosenCity,
          slot: s.timeSlot || null,
          venue: venueLabel,
          name: s.contact?.name?.trim() || null,
          phone,
          email: s.contact?.email?.trim() || null,
        },
        services: journeyServiceRows(s, liveChapters),
        packages: [{
          id: liveQuote.tier.id,
          name: `${CIRCLE_BY_ID[s.circleId]?.name} — ${liveQuote.tier.name}`,
          price_min: liveQuote.range.low,
          price_max: liveQuote.range.high,
          details: {
            guests: s.guests, circle: s.circleId, estimate: liveQuote.total,
            perGuest: liveQuote.perGuest, tax: liveQuote.tax.total, preTax: liveQuote.preTax,
            source: 'journey',
          },
        }],
        notes,
        status: 'open',
      }

      const { data, error: err } = await supabase
        .from('service_enquiries').insert(payload).select('id').single()
      if (err) throw err

      clearDraft(RESUME_KEY)
      setEnquiryId(data.id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(friendlyError(err, 'Could not send this just now. Please try again, or message us on WhatsApp.'))
    } finally {
      setSubmitting(false)
    }
  }, [stateForDraft, flags, user, navigate, location])

  /**
   * Record that the customer says they paid.
   *
   * Swallows its own failure on purpose: the enquiry is already stored by the
   * time this runs, UPI tells the app nothing, and throwing here would show
   * an error over a saved request to somebody who has just paid.
   */
  const claimLock = useCallback(async () => {
    setLockClaimed(true)
    if (!enquiryId) return
    const { error: err } = await supabase.from('service_enquiries').update({
      lock_payment_status: 'claimed',
      lock_payment_amount: LOCK_AMOUNT,
      lock_payment_ref: enquiryId,
      lock_claimed_at: new Date().toISOString(),
    }).eq('id', enquiryId)
    if (err) console.warn('Price-lock claim not recorded (migration 034 applied?):', err.message)
  }, [enquiryId])

  /* ── Autosave, and coming back ────────────────────────────────────── */
  useEffect(() => {
    if (enquiryId) return
    // Nothing worth restoring until a real answer exists. Saving the defaults
    // would have home offering to "finish" a page nobody engaged with.
    if (!stepKey || (!circleId && Object.keys(choices).length === 0)) return
    saveDraft(RESUME_KEY, stateForDraft())
    noteDetail(`${occasion?.name ?? 'Celebration'} · ${guests} guests`)
  }, [stateForDraft, enquiryId, stepKey, circleId, choices, occasion, guests])

  const restored = useRef(false)
  useEffect(() => {
    if (restored.current) return
    restored.current = true

    // Came back from a login with something to send. Restore and send it —
    // this is the ONLY path that submits automatically, and it exists because
    // the customer already pressed the button once.
    let pending = null
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (raw) pending = JSON.parse(raw)
    } catch { /* storage off */ }
    if (pending && pending.occasionId === occasionId && user) {
      try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      applyDraft(pending)
      submit(pending)
      return
    }

    // Interrupted, and came back. Restore and STOP — never send.
    const draft = loadDraft(RESUME_KEY)
    if (draft?.occasionId === occasionId) applyDraft(draft)

    function applyDraft(d) {
      setGuests(d.guests ?? defaultGuestsFor(occasionId))
      setCircleId(d.circleId ?? null)
      setVenue(d.venue ?? null)
      setChoices(d.choices ?? {})
      setSelections(d.selections ?? {})
      setCuisineId(d.cuisineId ?? null)
      setServeMeal(d.serveMeal ?? null)
      setVegOnly(d.vegOnly ?? true)
      setMenu(d.menu ?? {})
      setSpecialTags(d.specialTags ?? [])
      setSpecialRequests(d.specialRequests ?? '')
      setDecorLevelId(d.decorLevelId ?? null)
      setDecorChoiceId(d.decorChoiceId ?? null)
      setThemeId(d.themeId ?? null)
      setAddonIds(d.addonIds ?? [])
      setEventDate(d.eventDate ?? '')
      setTimeSlot(d.timeSlot ?? '')
      setChosenCity(d.chosenCity ?? city ?? BRAND.pilotCities[0])
      setContact(d.contact ?? { name: '', phone: '', email: '' })
      if (d.stepKey) setStepKey(d.stepKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occasionId, user])

  /* ══════════════════════════════════════════════════════════════════
     SENT
     ══════════════════════════════════════════════════════════════════ */
  if (enquiryId) {
    return (
      <div className={`a-canvas min-h-screen ${ACTION_BAR_CLEARANCE}`}>
        <div className="mx-auto max-w-2xl space-y-5 px-4 py-10">
          <div className="text-center">
            <PartyPopper size={40} className="mx-auto text-saffron-500" />
            <h1 className="mt-3 font-serif text-[26px] font-extrabold leading-tight tracking-tight text-ink">
              That is with a coordinator.
            </h1>
            <p className="mx-auto mt-2.5 max-w-md text-[13.5px] leading-relaxed text-ink-soft">
              A real person reads your whole plan, sources the vendors, negotiates, and comes back
              with one proposal and one price. You approve it before anything is booked.
            </p>
            <p className="mt-3 text-[12px] text-ink-mute">
              Reference{' '}
              <span className="font-mono font-bold text-ink-soft">
                SR-{enquiryId.slice(0, 8).toUpperCase()}
              </span>
              {contact.phone && <> · we will call <span className="font-bold text-ink-soft">+91 {phoneDigitsOf(contact.phone)}</span></>}
            </p>
          </div>

          <PriceLock
            reference={enquiryId}
            quote={quote}
            claimed={lockClaimed}
            onClaim={claimLock}
            onSkip={() => navigate('/dashboard/customer/events')}
            whatsappText={`Hi Sambramo, I'd like to hold my quote (ref ${enquiryId.slice(0, 8).toUpperCase()}) — ${occasion?.name ?? ''} for ${guests} guests.`}
          />

          <div className="flex flex-col gap-2 pt-2">
            <Link to="/dashboard/customer/events" className="a-btn-primary w-full">
              Track this celebration
            </Link>
            <Link to={`/services/${occasionId}`} className="a-btn-ghost w-full text-[13.5px]">
              Browse everything for a {occasion?.name?.toLowerCase()}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════════════════
     THE FLOW
     ══════════════════════════════════════════════════════════════════ */
  const chapter = step?.chapter
  const isReveal = step?.key === 'reveal'
  const isDetails = step?.key === 'details'

  // What has to be true before the way on is offered. Everything else is
  // genuinely optional, and the skip button says so out loud.
  const blocked =
    (step?.key === 'guests' && guests < 10) ||
    (step?.key === 'circle' && !circleId) ||
    (step?.key === 'venue' && !venue) ||
    (step?.key === 'meal_gate' && serveMeal === null) ||
    (step?.key === 'cuisine' && !cuisineId) ||
    (step?.key === 'decor_level' && !decorLevelId) ||
    (step?.key === 'decor_own' && !decorChoiceId) ||
    (isDetails && (!!contactBlocked(contact) || !!eventDateBlocked(eventDate)))

  const primaryLabel = isDetails
    ? (submitting ? 'Sending…' : 'Send this to a coordinator')
    : isReveal ? 'Looks right — what happens next?'
    : step?.key === 'decor_addons' ? 'Done with the look'
    : step?.key === 'extras' ? 'Done — show me the estimate'
    : 'Continue'

  const canSkip = chapter && chapter.kind === 'service' && chapter.optional !== false

  /**
   * What the refusal button actually says.
   *
   * The blueprint has always carried a real sentence for every optional
   * chapter — "A cousin with a good phone is doing it", "The venue handles
   * the clearing", "Procurement is handling it" — and the bar used to print
   * "Not needed" instead and bury the real sentence in a grey hint under the
   * buttons. So the honest, specific, already-written words sat where nobody
   * reads, and the control the customer had to press said nothing.
   *
   * They are the button now. "No — the venue handles the clearing" is a
   * sentence somebody can agree with; "Skip" is a control they have to work
   * out the consequences of.
   */
  const skipLabel = chapter?.skipLabel ? `No — ${lowerFirst(chapter.skipLabel)}` : 'No, I do not need this'

  const isBeyondReveal = stepIndex >= steps.findIndex(s => s.key === 'reveal')

  return (
    <div className={`a-canvas min-h-screen ${ACTION_BAR_CLEARANCE}`} ref={topRef}>
      <JourneyBar
        title={occasion?.name ?? 'Celebration'}
        emoji={occasion?.emoji ?? '🎉'}
        stepIndex={stepIndex}
        stepCount={steps.length}
        onBack={stepIndex > 0 ? goBack : null}
        onExit={() => navigate('/plan')}
        onOpenMap={() => setMapOpen(true)}
        answeredCount={jumpEntries.filter(e => e.status === 'chosen').length}
      />

      {/* The opening line, once, on the first screen only. It is the promise
          the rest of the flow keeps — including the one about the price. */}
      {stepIndex === 0 && (
        <div className="mx-auto max-w-2xl px-4 pt-5">
          <div className="rounded-[22px] bg-surface-sunk/[0.05] p-4">
            <p className="text-[13.5px] font-extrabold leading-snug text-ink">{blueprint.opening}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">{blueprint.promise}</p>
          </div>
        </div>
      )}

      {step?.key === 'guests' && <GuestStep guests={guests} onGuests={setGuests} />}

      {step?.key === 'circle' && (
        <CircleStep guests={guests} circleId={circleId} onCircle={setCircleId} onGuests={setGuests} />
      )}

      {step?.key === 'venue' && (
        <VenueStep
          occasionId={occasionId}
          value={venue}
          /* `silent` comes from a FIXED venue writing itself in on arrival —
             a gruha pravesha is at the new house and there is nothing to
             choose. Advancing on that would flick the customer past a screen
             they have not read, which reads as the app skipping ahead. */
          onChange={(v, opts) => { setVenue(v); if (!opts?.silent) scheduleAdvance() }}
          city={chosenCity}
          onOpenCityPicker={openCityPicker}
        />
      )}

      {chapter && (
        <ChapterStep
          key={chapter.id}
          chapter={chapter}
          value={chapter.kind === 'choice' ? choices[chapter.id] : selections[chapter.id]}
          onChange={v => (chapter.kind === 'choice' ? answerChoice(chapter, v) : answerService(chapter, v))}
          guestCount={guests}
          circleId={circle.id}
        />
      )}

      {step?.key === 'meal_gate' && blueprint.food && (
        <MealGateStep
          food={blueprint.food}
          value={serveMeal}
          onChange={v => { setServeMeal(v); scheduleAdvance() }}
        />
      )}

      {step?.key === 'cuisine' && (
        <CuisineStep
          cuisineId={cuisineId}
          onCuisine={pickCuisine}
          lead={blueprint.cuisineLead}
          vegOnly={vegOnly}
          onVegOnly={setDiet}
        />
      )}

      {step?.key === 'menu_all' && cuisine && (
        <MenuAllStep
          cuisine={cuisine}
          vegOnly={vegOnly}
          menu={menu}
          allowance={allowance}
          extraRate={EXTRA_DISH_RATE}
          onToggleDish={tapDish}
          onResetCourse={resetCourse}
          onOpenDish={(courseId, dish) => setPairing({ dish, courseId })}
        />
      )}

      {step?.course && cuisine && (
        <CourseStep
          key={step.course.id}
          course={step.course}
          cuisine={cuisine}
          vegOnly={vegOnly}
          menu={menu}
          allowance={allowance}
          extraRate={EXTRA_DISH_RATE}
          onToggleDish={tapDish}
          onResetCourse={() => resetCourse(step.course.id)}
          onOpenDish={(courseId, dish) => setPairing({ dish, courseId })}
        />
      )}

      {step?.key === 'decor_own' && (
        <DecorOwnStep
          step={decorStep}
          choiceId={decorChoiceId}
          onChoose={option => {
            setDecorChoiceId(option.id)
            setDecorLevelId(option.levelId)
            // The palette comes with the setup rather than being a second
            // question — "banana stems and a toran" is already marigold, and
            // asking a family to also pick a colour for it is a screen that
            // exists to be answered rather than to be decided.
            if (option.themeId) setThemeId(option.themeId)
            scheduleAdvance()
          }}
        />
      )}

      {step?.key === 'decor_level' && (
        <DecorLevelStep
          levelId={decorLevelId}
          onLevel={id => {
            setDecorLevelId(id)
            // No colour question for a customer who just said there is no
            // decoration — and the two screens after this one leave the flow
            // on their own, because `steps` only adds them for a real level.
            if (id !== 'none' && !themeId) setThemeId('traditional_red_gold')
            scheduleAdvance()
          }}
          circle={circle}
          guests={guests}
        />
      )}
      {step?.key === 'decor_theme' && (
        <DecorThemeStep themeId={themeId} onTheme={id => { setThemeId(id); scheduleAdvance() }} levelId={decorLevelId} />
      )}
      {step?.key === 'decor_addons' && (
        <DecorAddonStep addonIds={addonIds} onAddons={setAddonIds} />
      )}

      {step?.key === 'extras' && (
        <ExtrasShelf
          chapters={extras}
          selections={selections}
          onChange={(chapter, value) => setSelections(current => ({ ...current, [chapter.id]: value }))}
          onSkip={chapter => setSelections(current => ({
            ...current, [chapter.id]: { packIds: [], qty: {}, skipped: true },
          }))}
          guestCount={guests}
          circleId={circle.id}
        />
      )}

      {isReveal && (
        <RevealStep
          quote={quote}
          occasionName={occasion?.name ?? 'celebration'}
          occasionEmoji={occasion?.emoji ?? '🎉'}
          circle={circle}
          guests={guests}
          cuisine={cuisine}
          menu={menu}
          vegOnly={vegOnly}
          decorLevel={decorLevel}
          chapters={chapters}
          selections={selections}
          decorLabel={decorOptionFor(occasionId, decorChoiceId, ctx)?.name ?? null}
          extrasCount={extras.length}
          onOpenMap={() => setMapOpen(true)}
          onSaveExit={() => navigate('/plan')}
          onRestart={() => {
            // Confirmed, because it is the one control on this screen that
            // throws away nine minutes of work and it sits beside three that
            // do not. `clearDraft` as well as the state reset — otherwise the
            // resume prompt offers to restore the plan they just discarded.
            if (!window.confirm('Start this plan again from the first question? Nothing you have chosen will be kept.')) return
            clearDraft(RESUME_KEY)
            setChoices({}); setSelections({}); setCuisineId(null); setMenu({})
            setServeMeal(null); setDecorLevelId(null); setDecorChoiceId(null)
            setThemeId(null); setAddonIds([]); setCircleId(null)
            setGuests(defaultGuestsFor(occasionId))
            setVenue(defaultVenueFor(occasionId))
            setStepKey(null)
          }}
          savings={savings}
          /* A chapter that lives on the extras shelf has no screen of its
             own to jump to, so "Change" on its summary row has to land on
             the shelf. Sending it to `ch:power` would have navigated to a
             key that is not in `steps`, and the flow would have bounced the
             customer to the first screen it could find. */
          onEdit={key => {
            if (key === 'guests' || key === 'cuisine') return goTo(key)
            if (key === 'decor_level' || key === 'decor_own') return goTo(key)
            if (key === 'menu_all') return goTo('menu_all')
            return goTo(steps.some(st => st.key === `ch:${key}`) ? `ch:${key}` : 'extras')
          }}
        />
      )}

      {isDetails && (
        <div className="mx-auto max-w-2xl px-4 pb-4 pt-6">
          <p className="type-overline text-saffron-700">Nearly there</p>
          <h1 className="mt-1.5 font-serif text-[26px] font-extrabold leading-[1.14] tracking-tight text-ink">
            Who should we call about this?
          </h1>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
            The last thing we need. A coordinator reads your plan and rings you — usually the same
            day, always within one working day. Free, and you are not committing to anything by
            sending it.
          </p>

          <div className="a-card mt-5 p-5">
            <ContactBlock
              contact={contact}
              onContact={setContact}
              eventDate={eventDate}
              onEventDate={setEventDate}
              timeSlot={timeSlot}
              onTimeSlot={setTimeSlot}
              city={chosenCity}
              onCity={setChosenCity}
            />
          </div>

          <div className="a-card mt-4 p-5">
            <label htmlFor="kitchen-note" className="block text-[13px] font-extrabold text-ink">
              Anything else for the kitchen or the coordinator?
            </label>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">
              A family recipe, an allergy, a relative who needs looking after, the thing you would
              say on the phone in the first minute.
            </p>
            {specialTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SPECIAL_REQUESTS.filter(s => specialTags.includes(s.id)).map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSpecial(s.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-plum-700 px-2.5 py-1 text-[11px] font-bold text-white"
                  >
                    {s.emoji} {s.label} ✕
                  </button>
                ))}
              </div>
            )}
            <textarea
              id="kitchen-note"
              rows={3}
              value={specialRequests}
              onChange={e => setSpecialRequests(e.target.value.slice(0, 600))}
              placeholder="e.g. No garlic in the sambar, and a small Jain counter for six guests"
              className="mt-3 w-full resize-none rounded-2xl border-2 border-hairline/15 bg-white px-4 py-3 text-[14px] text-ink focus:border-saffron-400 focus:outline-none"
            />
            <p className="mt-1 text-right text-[11px] text-ink-mute">{specialRequests.length}/600</p>
          </div>

          {quote && (
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-teal-50 px-4 py-3.5 ring-1 ring-teal-100">
              <CheckCircle2 size={16} className="mt-px shrink-0 text-teal-600" />
              <p className="text-[12px] leading-relaxed text-teal-900">
                Your estimate stays attached to this request. After the call, you can hold the date
                and the quote for {LOCK_AMOUNT === 1000 ? '₹1,000' : `₹${LOCK_AMOUNT}`} — adjusted
                against the final invoice, and refundable. Nothing is taken now.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </p>
          )}
        </div>
      )}

      {error && !isDetails && (
        <p className="mx-auto mt-2 max-w-2xl px-4 text-[13px] text-red-700">{error}</p>
      )}

      <JourneyActions
        primaryLabel={primaryLabel}
        onPrimary={isDetails ? () => submit() : goNext}
        primaryDisabled={blocked || submitting}
        onSkip={canSkip ? () => skipChapter(chapter) : null}
        skipLabel={skipLabel}
        ready={!blocked && !isBeyondReveal}
        hint={
          isDetails
            ? 'Free to send. Nothing is booked and nothing is owed.'
            : stepIndex === 0
              ? 'No price until you have seen everything — that is a promise, not a tactic.'
              : canSkip
                ? 'Nothing here is compulsory, and declining is recorded so nobody rings you about it.'
                : undefined
        }
      />

      {/* Both sheets are mounted at the page root, outside anything that
          could carry a transform. An ancestor with even an identity transform
          re-anchors `position: fixed` to that ancestor instead of the
          viewport, and the sheet renders off screen — which has happened
          here before. */}
      <StepJumper
        open={mapOpen}
        entries={jumpEntries}
        currentKey={step?.key}
        onJump={goTo}
        onClose={() => setMapOpen(false)}
      />

      <PairingSheet
        open={!!pairing}
        dish={pairing?.dish}
        courseId={pairing?.courseId}
        cuisine={cuisine}
        vegOnly={vegOnly}
        menu={menu}
        specialTags={specialTags}
        onToggleDish={toggleDish}
        onToggleSpecial={toggleSpecial}
        onClose={() => setPairing(null)}
      />
    </div>
  )
}
