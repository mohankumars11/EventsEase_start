/**
 * The recommendation engine for Personal Celebrations (Category 1).
 *
 * Deterministic and pure: the same occasion, the same event facts and the
 * same answers always produce the same plan. Nothing here reads the
 * network, the clock or localStorage, which is what makes it testable
 * (tests/lifeBlueprints.test.mjs) and what lets the same function run on
 * the phone now and on the server later.
 *
 *   occasionPlan(occasion, { event, answers, picks }) → the output contract
 *
 * ── The clause grammar ──────────────────────────────────────────────
 * Conditions in data/lifeBlueprints.js are arrays, not functions, so a
 * blueprint is JSON: versionable, diffable, sendable. Every clause is a
 * FACT the customer gave us.
 *
 *   ['venue', ...choices]   the venue answer is one of these
 *   ['ans', key, ...values] answers[key] is (or contains) one of these
 *   ['has', key]            answers[key] is answered and not empty
 *   ['gt', key, n]          a numeric answer above n
 *   ['guests', n]           at least n guests
 *   ['any', ...clauses]     any one of them passes
 *   ['not', clause]         it does not pass
 *
 * A row's `when` must ALL pass for it to appear; if any `unless` passes it
 * is excluded. A row with neither is unconditional.
 *
 * ── Classification ──────────────────────────────────────────────────
 *   essential     on by default, "Let's arrange these"
 *   recommended   on by default, genuinely improves the celebration
 *   optional      off by default, an add-on
 *   conditional   appears only when its `when` passes; on by default once
 *                 it does, because the customer's own answer summoned it
 *   arranged      the customer told us they already have it
 *   hidden        not for this occasion, in this format — never displayed
 *
 * ── What wins ───────────────────────────────────────────────────────
 * The customer. `picks` is their own hand: need → in, skip → out (and it
 * stays out through every recalculation, Rule D), have → already arranged,
 * later → saved. A recalculation never undoes a choice they made.
 *
 * ── What this does NOT do ───────────────────────────────────────────
 * It never invents a trade id, a partner, a price or an availability. The
 * budget it reports is computed from live partner prices by the caller
 * (lib/planBudget.js) and is labelled an estimate everywhere it appears.
 */
import { BLUEPRINT } from '../data/blueprints'
import { TRADE_WORDS } from '../data/blueprintKit'
import { TRADE } from '../data/trades'
import { TOOLKIT } from '../data/celebrationToolkit'
import { profileFor } from '../data/occasionProfile'

/* ── Services a kind of day always asks about ────────────────────────
 * Makeup, mehendi and printed invitations are trades like any other
 * (Mohan, 2026-11-13: "you have kept mehendi and makeup and hair as
 * optional at the end — why? these are among our 35 trades"). Where the
 * day calls for them they are on the plan, recommended; where they are
 * merely possible they sit on it switched off, one tap from added.
 * Printed cards are the OFFLINE invitation — the online one, with RSVP,
 * is Sambramo's own and is always in the free toolkit. A blueprint row
 * that is already stronger is never weakened. */
const RANK = { hidden: 0, optional: 1, conditional: 2, recommended: 3, essential: 4 }
function occasionTrades(o) {
  const p = profileFor(o), w = `${o.id} ${o.name}`.toLowerCase()
  const want = {}
  const put = (t, kind, hook, line) => { if (!want[t] || RANK[kind] > RANK[want[t].kind]) want[t] = { trade: t, kind, hook, line } }
  if (p.family === 'wedding') {
    const fn = p.fn
    if (fn === 'mehendi') put('mehendi_artist', 'essential', 'Adorn', 'Bridal mehendi, and the guests’ hands')
    else if (['sangeet', 'engagement', 'shower', 'roka'].includes(fn)) put('mehendi_artist', 'recommended', 'Adorn', 'Mehendi for the bride and the family')
    else if (['haldi', 'wedding', 'cocktail'].includes(fn)) put('mehendi_artist', 'optional', 'Adorn', 'A touch-up, or guest mehendi')
    if (!['baraat', 'griha'].includes(fn)) put('bridal_makeup_hair', fn === 'haldi' ? 'recommended' : 'recommended', 'Glow', fn === 'haldi' ? 'A fresh, light look for the turmeric' : 'Makeup and hair for the bride and family')
    if (['wedding', 'engagement', 'reception', 'roka'].includes(fn)) put('invitation_printing', 'optional', 'Invite', 'Printed cards, for the elders — the e-invite is free')
  }
  if (p.family === 'baby' && /shower|seemanth|valaikappu|godh/.test(w)) { put('bridal_makeup_hair', 'recommended', 'Glow', 'Makeup and draping for the mother-to-be'); put('mehendi_artist', 'optional', 'Adorn', 'Mehendi for the mother-to-be') }
  if (['baby', 'home', 'faith'].includes(p.family) || (p.family === 'birthday' && (p.milestone || /first/.test(w))) || (p.family === 'anniversary' && p.milestone))
    put('invitation_printing', 'optional', 'Invite', 'Printed cards, for the elders — the e-invite is free')
  if (p.family === 'anniversary' && p.milestone) put('bridal_makeup_hair', 'optional', 'Glow', 'A look for the couple of the day')
  if (/bachelorette|bridal-shower|girls/.test(w)) put('mehendi_artist', 'optional', 'Adorn', 'Mehendi for the whole group')
  if (/fashion|pageant|ramp|photoshoot/.test(w)) put('bridal_makeup_hair', 'recommended', 'Glow', 'Makeup and hair for everyone on the ramp')
  return Object.values(want)
}
function withOccasionTrades(o, plan) {
  const out = plan.map(s => ({ ...s }))
  for (const x of occasionTrades(o)) {
    const at = out.find(s => s.trade === x.trade && !s.as)
    if (!at) out.push({ trade: x.trade, kind: x.kind, hook: x.hook, line: x.line, byRule: true })
    else if (RANK[x.kind] > (RANK[at.kind] ?? 0) && at.kind !== 'conditional') at.kind = x.kind
  }
  return out
}

/* The venue answer a clause reads. "Book a venue with us" (2026-11-11) IS
   "help me find one" to every blueprint — the place is still to be found;
   only who finds it changed. */
const venueOf = (o, event) => (event.venueChoice === 'bookvenue' ? 'need' : event.venueChoice ?? (o.where === 'home' || o.where === 'newhome' ? 'home' : null))

/* ── Clause evaluation ────────────────────────────────────────────── */

const listOf = v => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v])

export function test(clause, ctx) {
  if (!Array.isArray(clause) || !clause.length) return true
  const [op, ...rest] = clause
  switch (op) {
    case 'venue': return rest.includes(ctx.venue)
    case 'ans': {
      const [k, ...vals] = rest
      const got = listOf(ctx.answers[k])
      return got.some(g => vals.includes(String(g)))
    }
    case 'has': {
      const got = listOf(ctx.answers[rest[0]])
      return got.length > 0 && !got.every(g => g === '' || g === 'none')
    }
    case 'gt': return Number(ctx.answers[rest[0]]) > Number(rest[1])
    case 'guests': return ctx.guests != null && ctx.guests >= Number(rest[0])
    case 'any': return rest.some(c => test(c, ctx))
    case 'not': return !test(rest[0], ctx)
    default: return false
  }
}

const passes = (row, ctx) =>
  (row.when ?? []).every(c => test(c, ctx)) && !(row.unless ?? []).some(c => test(c, ctx))

/* Why a conditional row is on screen, in the customer's own words. */
function reasonFor(row, ctx, blueprint) {
  if (!row.when?.length) return null
  for (const c of row.when) {
    if (c[0] === 'ans') {
      const q = blueprint.ask.find(x => x.k === c[1])
      const opt = q?.options?.find(([v]) => listOf(ctx.answers[c[1]]).map(String).includes(v))
      if (opt) return `You said: ${opt[1].toLowerCase()}`
      if (q && ctx.answers[c[1]] === 'yes') return `You asked for this`
    }
    if (c[0] === 'venue') return ctx.venueLabel ? `For ${ctx.venueLabel}` : null
    if (c[0] === 'guests') return `For ${ctx.guests} guests`
  }
  return null
}

/* ── The plan ─────────────────────────────────────────────────────── */

const ORDER = { essential: 0, recommended: 1, conditional: 1, optional: 2, added: 2 }

/**
 * @param o        the occasion record from data/occasions.js
 * @param event    { venueChoice, guests, hours, date, time, budget }
 * @param answers  the occasion's own questions, as given
 * @param picks    the customer's own hand: tradeId → need | skip | have | later
 */
export function occasionPlan(o, { event = {}, answers = {}, picks = {} } = {}) {
  const b = o && BLUEPRINT[o.id]
  if (!b) return null

  const venue = venueOf(o, event)
  const ctx = {
    venue, answers, guests: Number(event.guests) || null, hours: Number(event.hours) || null,
    venueLabel: VENUE_LABEL[venue] ?? null,
  }
  /* Rule C — what the customer told us is already theirs, from the one
     universal question and from any card they marked "I have this". */
  const arranged = new Set([
    ...listOf(answers.arranged),
    ...Object.entries(picks).filter(([, v]) => v === 'have').map(([t]) => t),
  ])

  /* A trade can legitimately be written twice — a venue to FIND and a
     table to BOOK are different asks of the same trade — but only one of
     them may ever reach the screen. The toggle writes `picks[tradeId]`,
     so two live rows on one trade would move together and brief the same
     master twice. The first one whose conditions pass wins; the other is
     hidden. `row.id` stays unique, because React keys on it. */
  const taken = new Set()
  const rows = []
  const planned = withOccasionTrades(o, b.plan)
  /* A service the rule put on the plan replaces the add-on that offered the same trade. */
  const ruled = new Set(planned.filter(s => s.byRule).map(s => s.trade))
  for (const s of planned) {
    const id = s.as ? `${s.trade}:${s.as}` : s.trade
    const [dh, dl] = TRADE_WORDS[s.trade] ?? ['Add', TRADE[s.trade]?.why ?? '']
    const live = passes(s, ctx) && !taken.has(s.trade)
    let kind = arranged.has(s.trade) ? 'arranged' : s.kind === 'conditional' && !live ? 'hidden' : live ? s.kind : 'hidden'
    /* Picked from "Add more" (Mohan, 2026-11-13: "whenever I click any of the
       services from add more, it is not reflecting in the main services"). */
    if (kind === 'hidden' && picks[s.trade] === 'need' && !taken.has(s.trade)) kind = 'added'
    if (kind !== 'hidden') taken.add(s.trade)
    const pick = picks[s.trade]
    const onByDefault = kind === 'essential' || kind === 'recommended' || (kind === 'conditional' && live)
    const row = {
      id, tradeId: s.trade, variant: s.as ?? null, kind,
      name: s.as === 'restaurant' ? 'Restaurant' : TRADE[s.trade]?.label ?? s.trade,
      hook: s.hook ?? dh, line: s.line ?? dl, icon: s.icon ?? s.trade,
      bookable: true,
      default: onByDefault,
      /* Rule D: a skip survives every recalculation. */
      on: pick === 'skip' ? false : pick === 'need' ? true : kind === 'arranged' ? false : onByDefault,
      declined: pick === 'skip', arranged: kind === 'arranged', savedForLater: pick === 'later',
      reason: reasonFor(s, ctx, b),
      when: s.when ?? null, unless: s.unless ?? null,
      order: ORDER[kind] ?? 3,
    }
    rows.push(row)
  }

  /* "We'll order in" or "eating at a restaurant" with no restaurant row in
     the blueprint: the restaurant trade (#35, 2026-11-11) answers it, as a
     conditional row — the customer's own answer summoned it. */
  const food = String(answers.food_way ?? '')
  const wantsRestaurant = ['order', 'restaurant'].includes(food) || venue === 'restaurant'
  if (wantsRestaurant && TRADE.restaurant && !rows.some(r => r.tradeId === 'restaurant' && r.kind !== 'hidden')) {
    const pick = picks.restaurant, had = arranged.has('restaurant')
    rows.push({
      id: 'restaurant:auto', tradeId: 'restaurant', variant: null, kind: had ? 'arranged' : 'conditional',
      name: TRADE.restaurant.label, hook: food === 'order' ? 'Order' : 'Dine', line: food === 'order' ? 'Food ordered in from a restaurant, per person' : 'A table or a room at a restaurant', icon: 'restaurant',
      bookable: true, default: true, on: pick === 'skip' ? false : pick === 'need' ? true : !had,
      declined: pick === 'skip', arranged: had, savedForLater: pick === 'later',
      reason: food === 'order' ? 'You said: we’ll order in' : 'You said: eating at a restaurant', when: null, unless: null, order: ORDER.conditional,
    })
  }

  /* "Book a hall with us" on a home occasion (a naming ceremony in a hall): the venue joins the plan. */
  if (event.venueChoice === 'bookvenue' && TRADE.venue && !rows.some(r => r.tradeId === 'venue' && r.kind !== 'hidden')) {
    const pick = picks.venue
    rows.push({ id: 'venue:booked', tradeId: 'venue', variant: null, kind: 'conditional', name: TRADE.venue.label, hook: 'Book', line: 'A hall that fits your guests, booked with us', icon: 'venue',
      bookable: true, default: true, on: pick !== 'skip', declined: pick === 'skip', arranged: false, savedForLater: false, reason: 'You asked us to book the place', when: null, unless: null, order: ORDER.conditional })
  }

  /* A trade the blueprint never mentions, picked from "Add more", joins the plan. */
  for (const [t, v] of Object.entries(picks)) {
    if (t.startsWith('+') || v !== 'need' || !TRADE[t] || rows.some(r => r.tradeId === t && r.kind !== 'hidden')) continue
    const [dh, dl] = TRADE_WORDS[t] ?? ['Add', TRADE[t]?.why ?? '']
    rows.push({ id: `${t}:added`, tradeId: t, variant: null, kind: 'added', name: TRADE[t].label, hook: dh, line: dl, icon: t, bookable: true, default: false,
      on: true, declined: false, arranged: false, savedForLater: false, reason: 'You added this', when: null, unless: null, order: ORDER.added })
  }

  /* Add-ons. Never a duplicate of something already on the plan, which is
     the rule that stops "Make it extra special" from re-selling décor. */
  const shown = new Set(rows.filter(r => r.kind !== 'hidden').map(r => r.tradeId))
  const addons = b.addons.filter(a => passes(a, ctx) && !(a.trade && ruled.has(a.trade) && !a.joinsAlways)).map(a => {
    /* Three kinds, and the difference matters to the customer:
         bookable   its own trade, nobody on the plan covers it — a booking
         joins      an upgrade to a service already chosen (a balloon arch
                    is décor): it goes on THAT master's brief, not a
                    second booking, which is the no-duplicates rule
         idea       no trade behind it at all — a plan, not a purchase */
    const joins = a.trade && shown.has(a.trade) ? a.trade : null
    return {
      id: a.id, tradeId: a.trade ?? null, kind: 'addon',
      name: titled(a.id),
      hook: a.hook, line: a.line, icon: a.icon,
      bookable: !!a.trade && !joins,
      joins, experience: !a.trade,
      reason: joins ? `Goes on your ${(TRADE[joins]?.label ?? joins).toLowerCase()} brief` : null,
      default: false,
      on: picks[`+${a.id}`] === 'need',
      order: 4,
    }
  })

  /* A bookable add-on that is switched on is a service of the plan now. */
  for (const a of addons) {
    if (!a.on || !a.bookable || !a.tradeId || rows.some(r => r.tradeId === a.tradeId && r.kind !== 'hidden' && r.kind !== 'arranged')) continue
    const [dh, dl] = TRADE_WORDS[a.tradeId] ?? ['Add', TRADE[a.tradeId]?.why ?? '']
    rows.push({ id: `${a.tradeId}:addon`, tradeId: a.tradeId, variant: null, kind: 'added', name: TRADE[a.tradeId]?.label ?? a.name, hook: a.name ?? dh, line: a.line ?? dl, icon: a.tradeId,
      bookable: true, default: false, on: true, declined: false, arranged: false, savedForLater: false, reason: `Added: ${a.name}`, addonId: a.id, when: null, unless: null, order: ORDER.added })
    a.promoted = true
  }
  const visible = rows.filter(r => r.kind !== 'hidden' && r.kind !== 'arranged')
  const sort = (x, y) => x.order - y.order
  return {
    occasionId: o.id, occasionName: o.name, categoryId: o.category, version: b.v,
    hook: b.hook, statement: b.statement, about: b.about, formats: b.formats,
    answers,
    toolkit: toolkitFor(b),
    recommended: visible.sort(sort),
    addons: addons.filter(a => !a.promoted),
    arranged: rows.filter(r => r.kind === 'arranged'),
    hidden: rows.filter(r => r.kind === 'hidden').map(r => ({ id: r.id, tradeId: r.tradeId, reason: 'Not for this celebration, as you’ve described it' })),
    timeline: b.timeline,
    checklist: b.checklist,
    /* What the rest of the app already speaks: the trades the customer wants. */
    needed: [...new Set(visible.filter(r => r.on).map(r => r.tradeId).concat(addons.filter(a => a.on && a.tradeId).map(a => a.tradeId)))],
  }
}

/* An add-on is named after itself, never after its trade: a plan that
   lists "Décor & flowers" twice — once as the service and once as the
   balloon arch that joins it — reads like a duplicate. The id is already
   the name in snake_case, so it is title-cased, with an override only
   where that would read badly. */
const ADDON_NAME = {
  bbq_setup: 'BBQ & grill', facepaint: 'Face painting', shade_water: 'Shade & water',
  stay: 'Rooms for the night', name_plate: 'Nameplate', decoy: 'The cover story',
  next_morning: 'Telling the families', guest_book_film: 'Message corner',
  spa: 'Spa treatments', spa_day: 'Spa day', reels: 'Short films', crafts: 'Craft table',
  silver_set: 'Silver plate & cup', flowers: 'Fresh flowers', lighting: 'Mood lighting',
}
const titled = id => ADDON_NAME[id] ?? id.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())

const VENUE_LABEL = {
  have: 'the venue you have', need: 'a venue we find for you', home: 'a celebration at home',
  restaurant: 'a restaurant celebration', banquet: 'a banquet hall', outdoor: 'an outdoor celebration', other: 'where you’re holding it',
}

/* ── The free digital bundle ──────────────────────────────────────── */

/** Which of the seven free features this occasion turns on, and how. */
export function toolkitFor(b) {
  const t = b.toolkit ?? {}
  const features = TOOLKIT.map(f => {
    const cfg = t[f.key]
    if (cfg === false) return null
    const mode = typeof cfg === 'string' ? cfg : null
    return { ...f, mode, note: mode ? f.modes?.[mode] ?? null : null, polls: f.key === 'polls' ? (Array.isArray(t.polls) ? t.polls : f.polls) : null }
  }).filter(Boolean)
  return { free: true, note: t.note ?? null, features }
}

/* ── The questions Event Details should ask ───────────────────────── */

/** The occasion's own questions, with the ones whose condition fails removed. */
export function questionsFor(o, { event = {}, answers = {} } = {}) {
  const b = o && BLUEPRINT[o.id]
  if (!b) return []
  const venue = venueOf(o, event)
  const ctx = { venue, answers, guests: Number(event.guests) || null, venueLabel: VENUE_LABEL[venue] ?? null }
  return b.ask.filter(q => passes(q, ctx))
}

/** Which required questions have not been answered yet. */
export function missingAnswers(o, { event = {}, answers = {} } = {}) {
  return questionsFor(o, { event, answers })
    .filter(q => !q.optional && (answers[q.k] == null || answers[q.k] === '' || (Array.isArray(answers[q.k]) && !answers[q.k].length)))
    .map(q => q.k)
}

/** Answers for questions that are no longer on screen are dropped, so a
 *  changed mind cannot leave a stale fact driving a recommendation. */
export function pruneAnswers(o, { event = {}, answers = {} } = {}) {
  const keys = new Set(questionsFor(o, { event, answers }).map(q => q.k).concat('arranged'))
  return Object.fromEntries(Object.entries(answers).filter(([k]) => keys.has(k)))
}

export const hasBlueprint = id => !!BLUEPRINT[id]
