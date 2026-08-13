import { useState, useMemo } from 'react'
import { Check, Leaf, Search, X, Sparkles, Utensils } from 'lucide-react'
import {
  CUISINES, CUISINE_GROUPS, CUISINE_BY_ID, COURSES, dishesFor,
} from '../../data/cuisineMenus'
import { perPlateFor } from '../../utils/quote'
import { formatINR } from '../../utils/format'
import { CUISINE_PHOTOS } from '../../config/generatedServicePhotos'
import OptionArt from './OptionArt'
import ImageSourceBadge from '../shop/ImageSourceBadge'

/**
 * The menu, actually built.
 *
 * ── What this replaces ──────────────────────────────────────────────────
 * "Customized Menu — Veg / Non-veg / Fusion / Jain / Keto options. [Get a
 * quote]". Sixteen cuisines and several hundred dishes sat in the catalogue,
 * and the one service whose entire purpose is choosing food would not let you
 * choose any. Tapping it opened a form asking which occasion you were planning.
 *
 * The catalogue was already there — cuisineMenus.js, seven courses per cuisine,
 * every dish with its own per-plate premium — and the celebration builder could
 * already price a configured menu. What was missing was a door into it for
 * somebody who is not planning a whole celebration. This is that door, and it
 * uses the same data and the same `perPlateFor` as the builder, so the two can
 * never quote the same menu differently.
 *
 * ── Ticking, not reading ────────────────────────────────────────────────
 * The occasion page shows these dishes as a list — deliberately, because it has
 * no quote engine attached and collecting choices it cannot price would be a
 * form that goes nowhere. Here the choices *are* the booking, so every dish is
 * a control, the plate rate moves as you tick, and what you selected travels
 * into the cart and on to the coordinator as text they can cook from.
 *
 * ── Pre-ticked, not empty ───────────────────────────────────────────────
 * Nobody should meet an empty menu and have to invent a Mysuru wedding spread.
 * A sensible default is pre-selected per course, ordered by the catalogue's own
 * recommendation ordering, so the customer starts from a complete meal and
 * edits it rather than building one from nothing.
 */

/** How many of each course a standard spread carries. */
const DEFAULT_PICKS = {
  welcome: 2, starters: 4, mains: 5, curries: 4, accompaniments: 5, sweets: 3, counters: 1,
}

function defaultMenuFor(cuisine, { vegOnly, courseFilter }) {
  const menu = {}
  for (const course of COURSES) {
    if (courseFilter && !courseFilter.includes(course.id)) continue
    const dishes = dishesFor(cuisine, course.id, { vegOnly })
    menu[course.id] = dishes.slice(0, DEFAULT_PICKS[course.id] ?? 3).map(d => d.id)
  }
  return menu
}

export default function MenuComposer({
  guestCount, courseFilter, onChange,
}) {
  const [cuisineId, setCuisineId] = useState(CUISINES[0].id)
  const [vegOnly, setVegOnly] = useState(false)
  const [query, setQuery] = useState('')
  const cuisine = CUISINE_BY_ID[cuisineId] ?? CUISINES[0]
  const pureVeg = vegOnly || !cuisine.hasNonVeg

  const [menu, setMenu] = useState(() =>
    defaultMenuFor(CUISINES[0], { vegOnly: false, courseFilter })
  )

  const courses = useMemo(
    () => (courseFilter ? COURSES.filter(c => courseFilter.includes(c.id)) : COURSES),
    [courseFilter]
  )

  const plate = perPlateFor({ cuisine, menu, menuAllowance: {}, vegOnly: pureVeg, guestCount })
  const total = plate.perPlate * (Number(guestCount) || 0)
  const chosenCount = Object.values(menu).reduce((n, list) => n + list.length, 0)

  // Report upward on every change, so the sticky bar and the cart line always
  // describe the menu currently on screen rather than the one at mount.
  const report = (nextMenu, nextCuisine = cuisine, nextVeg = pureVeg) => {
    const p = perPlateFor({
      cuisine: nextCuisine, menu: nextMenu, menuAllowance: {}, vegOnly: nextVeg, guestCount,
    })
    onChange?.({
      cuisine: nextCuisine,
      menu: nextMenu,
      vegOnly: nextVeg,
      perPlate: p.perPlate,
      total: p.perPlate * (Number(guestCount) || 0),
      summary: [
        `${nextCuisine.name}${nextVeg ? ' (pure veg)' : ''} — ₹${p.perPlate}/plate × ${guestCount} guests`,
        ...COURSES.filter(c => (nextMenu[c.id] ?? []).length).map(c => {
          const names = (nextMenu[c.id] ?? [])
            .map(id => dishesFor(nextCuisine, c.id, { vegOnly: nextVeg }).find(d => d.id === id)?.name)
            .filter(Boolean)
          return `${c.label}: ${names.join(', ')}`
        }),
      ],
    })
  }

  function pickCuisine(id) {
    const next = CUISINE_BY_ID[id]
    if (!next) return
    const nextVeg = vegOnly || !next.hasNonVeg
    // A new cuisine is a new menu — carrying over dish ids from the last one
    // would leave a menu of dishes this kitchen does not make.
    const nextMenu = defaultMenuFor(next, { vegOnly: nextVeg, courseFilter })
    setCuisineId(id)
    setMenu(nextMenu)
    report(nextMenu, next, nextVeg)
  }

  function toggleVeg() {
    const nextVeg = !vegOnly
    setVegOnly(nextVeg)
    const effective = nextVeg || !cuisine.hasNonVeg
    // Drop anything now filtered out, rather than keeping an invisible non-veg
    // dish in a menu the customer has just marked pure veg.
    const nextMenu = {}
    for (const course of courses) {
      const available = dishesFor(cuisine, course.id, { vegOnly: effective }).map(d => d.id)
      nextMenu[course.id] = (menu[course.id] ?? []).filter(id => available.includes(id))
    }
    setMenu(nextMenu)
    report(nextMenu, cuisine, effective)
  }

  function toggleDish(courseId, dishId) {
    const current = menu[courseId] ?? []
    const next = {
      ...menu,
      [courseId]: current.includes(dishId)
        ? current.filter(d => d !== dishId)
        : [...current, dishId],
    }
    setMenu(next)
    report(next)
  }

  function resetCourse(courseId) {
    const dishes = dishesFor(cuisine, courseId, { vegOnly: pureVeg })
    const next = { ...menu, [courseId]: dishes.slice(0, DEFAULT_PICKS[courseId] ?? 3).map(d => d.id) }
    setMenu(next)
    report(next)
  }

  const q = query.trim().toLowerCase()

  return (
    <div className="space-y-4">
      {/* ── Which kitchen ──────────────────────────────────────────
          Grouped by region. Sixteen chips in one row is a scroll, not a
          choice. */}
      <section className="px-4">
        <h2 className="text-[15px] font-extrabold text-white">
          1 · Whose food is it?
        </h2>
        <p className="mt-0.5 text-[11.5px] text-white/55">
          {CUISINES.length} kitchens. Every dish under each one is listed, and every
          one is available.
        </p>

        <div className="mt-3 space-y-2.5">
          {CUISINE_GROUPS.map(group => (
            <div key={group.label}>
              <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/35">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.ids.map(id => {
                  const c = CUISINE_BY_ID[id]
                  if (!c) return null
                  const active = id === cuisineId
                  const photo = CUISINE_PHOTOS[c.id]
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => pickCuisine(id)}
                      aria-pressed={active}
                      className={`overflow-hidden rounded-2xl text-left transition-all ${
                        active
                          ? 'bg-saffron-400 text-plum-950 ring-2 ring-saffron-300'
                          : 'bg-white/[0.07] text-white/80 ring-1 ring-white/12'
                      }`}
                    >
                      {/* A picture of the food on the tile you choose it from.
                          Sixteen emoji in a grid told a customer nothing about
                          the difference between Udupi and Chettinad. */}
                      <OptionArt
                        tint={active ? ['#b45309', '#fbbf24'] : ['#4c1d95', '#b45309']}
                        emoji={c.emoji}
                        height={62}
                        seed={c.name.length}
                        photo={photo}
                        alt={`${c.name} food`}
                      />
                      <span className="block p-2.5">
                        <span className="block text-[12px] font-extrabold leading-tight">{c.name}</span>
                        <span className={`mt-0.5 block text-[10px] font-bold ${active ? 'text-plum-900/70' : 'text-white/40'}`}>
                          from ₹{c.basePlate}/plate
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── The chosen kitchen, and what a plate costs ──────────── */}
      <section className="px-4">
        <div className="home-card overflow-hidden">
          {/* The food, actually shown. This was a plain amber gradient — on
              the one card in the app whose entire job is answering "what will
              you serve at my daughter's wedding". */}
          <OptionArt
            tint={['#b45309', '#f59e0b']}
            emoji={cuisine.emoji}
            height={148}
            seed={cuisine.name.length}
            photo={CUISINE_PHOTOS[cuisine.id]}
            alt={`${cuisine.name} — representative photograph of this cuisine`}
          >
            {CUISINE_PHOTOS[cuisine.id]?.url && (
              <ImageSourceBadge
                source={CUISINE_PHOTOS[cuisine.id].source}
                size="sm"
                className="absolute left-3 top-3"
              />
            )}
          </OptionArt>
          <div className="p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold text-gray-900">
                  {cuisine.name}
                  {cuisine.localName && (
                    <span className="ml-1.5 text-[11px] font-medium italic text-gray-400">
                      {cuisine.localName}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-gray-500">{cuisine.blurb}</p>
              </div>
              <div className="shrink-0 rounded-xl bg-plum-50 px-3 py-1.5 text-right ring-1 ring-plum-100">
                <p className="text-[9px] uppercase tracking-wide text-plum-500">Per plate</p>
                <p className="text-[16px] font-extrabold text-plum-800">{formatINR(plate.perPlate)}</p>
                <p className="text-[9px] text-plum-500">{plate.band.label}</p>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {cuisine.hasNonVeg && (
                <button
                  type="button"
                  onClick={toggleVeg}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    pureVeg
                      ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                      : 'bg-gray-50 text-gray-500 ring-1 ring-gray-200'
                  }`}
                >
                  <Leaf size={11} /> {pureVeg ? 'Pure veg' : 'Veg & non-veg'}
                </button>
              )}
              <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1 text-[11px] font-bold text-gray-500 ring-1 ring-gray-200">
                <Utensils size={11} /> {chosenCount} dishes chosen
              </span>
              {plate.premiumDishes.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                  <Sparkles size={11} /> +₹{plate.dishPremium}/plate from premium dishes
                </span>
              )}
            </div>

            <p className="mt-2.5 border-t border-gray-100 pt-2.5 text-[12px] text-gray-500">
              <span className="font-extrabold text-gray-900">{formatINR(total)}</span> for{' '}
              {guestCount} guests, food only — service staff, counters and rentals are
              separate services.
            </p>
          </div>
        </div>
      </section>

      {/* ── Every course, every dish, tickable ──────────────────── */}
      <section className="px-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-extrabold text-white">2 · Build the menu</h2>
            <p className="mt-0.5 text-[11.5px] text-white/55">
              Pre-filled with a standard spread. Change anything — the rate moves as you do.
            </p>
          </div>
        </div>

        <div className="relative mt-2.5">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            type="search"
            placeholder="Find a dish — biryani, payasa, paneer…"
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

        <div className="mt-3 space-y-2.5">
          {courses.map(course => {
            const all = dishesFor(cuisine, course.id, { vegOnly: pureVeg })
            const dishes = q ? all.filter(d => d.name.toLowerCase().includes(q)) : all
            if (!dishes.length) return null
            const chosen = menu[course.id] ?? []

            return (
              <div key={course.id} className="home-card p-3.5">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-[13px] font-extrabold text-gray-900">
                    {course.label}
                    <span className="ml-1.5 text-[10.5px] font-bold text-plum-600">
                      {chosen.length} chosen
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => resetCourse(course.id)}
                    className="text-[10.5px] font-bold text-gray-400 hover:text-gray-600"
                  >
                    Reset to standard
                  </button>
                </div>
                <p className="mb-2 text-[10.5px] text-gray-400">{course.hint}</p>

                <div className="flex flex-wrap gap-1.5">
                  {dishes.map(d => {
                    const on = chosen.includes(d.id)
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDish(course.id, d.id)}
                        aria-pressed={on}
                        title={d.note ?? undefined}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-medium ring-1 transition-colors ${
                          on
                            ? 'bg-plum-600 text-white ring-plum-600'
                            : d.veg
                              ? 'bg-green-50/60 text-gray-700 ring-green-100'
                              : 'bg-rose-50/60 text-gray-700 ring-rose-100'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            on ? 'bg-white' : d.veg ? 'bg-green-500' : 'bg-rose-500'
                          }`}
                        />
                        {d.name}
                        {d.delta > 0 && (
                          <span className={`font-bold ${on ? 'text-saffron-200' : 'text-gray-400'}`}>
                            +₹{d.delta}
                          </span>
                        )}
                        {on && <Check size={11} strokeWidth={3} className="shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-white/45">
          Every dish above is available. Premium items — mutton, prawns, paneer, saffron,
          anything with a chef standing behind it — carry the per-plate premium shown on
          the chip; everything else is priced as part of the spread.
        </p>
      </section>
    </div>
  )
}
