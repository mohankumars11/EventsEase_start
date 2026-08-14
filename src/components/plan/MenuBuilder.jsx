import { useMemo } from 'react'
import { ChevronDown, RotateCcw, Leaf, Plus, Check } from 'lucide-react'
import {
  CUISINES, CUISINE_BY_ID, CUISINE_GROUPS, COURSES, dishesFor, defaultMenu,
} from '../../data/cuisineMenus'
import { EXTRA_DISH_RATE } from '../../utils/quote'

/**
 * Pick a cuisine, then see the entire spread under it.
 *
 * The rule this screen follows: choosing a cuisine must never produce a
 * second empty form. The moment "Karnataka Traditional" is selected, a
 * complete menu appears — the tier's allowance filled from the top of each
 * course — and every other dish in that cuisine is listed underneath it,
 * already visible, one tap from being swapped in. Nobody has to know what a
 * Mysuru wedding menu contains in order to build one here.
 *
 * Dishes past the allowance are added rather than refused, at a stated rate.
 * Refusing them is how you turn a customer who wanted to spend more into a
 * customer who left.
 */
export default function MenuBuilder({
  cuisineId, onCuisine, vegOnly, onVegOnly, menu, onMenu, menuAllowance,
  specialRequests, onSpecialRequests,
}) {
  const cuisine = CUISINE_BY_ID[cuisineId]

  const counts = useMemo(() => {
    const out = {}
    for (const c of COURSES) out[c.id] = (menu?.[c.id] ?? []).length
    return out
  }, [menu])

  function selectCuisine(id) {
    const next = CUISINE_BY_ID[id]
    onCuisine(id)
    // A cuisine switch rebuilds the menu rather than trying to carry dish ids
    // across — "gobi-manchurian" existing in two cuisines is a coincidence,
    // not a match, and a half-translated menu is worse than a fresh one.
    onMenu(next ? defaultMenu(next, menuAllowance, { vegOnly }) : {})
  }

  function toggleDish(courseId, dishId) {
    const current = menu?.[courseId] ?? []
    const next = current.includes(dishId)
      ? current.filter(id => id !== dishId)
      : [...current, dishId]
    onMenu({ ...menu, [courseId]: next })
  }

  function resetCourse(courseId) {
    if (!cuisine) return
    const allowed = menuAllowance?.[courseId] ?? 0
    onMenu({
      ...menu,
      [courseId]: dishesFor(cuisine, courseId, { vegOnly }).slice(0, allowed).map(d => d.id),
    })
  }

  function setVeg(next) {
    onVegOnly(next)
    // Going pure veg has to drop the non-veg dishes from the menu, not just
    // hide them — otherwise a mutton biryani stays in the order and in the
    // price while the customer is looking at a screen that says pure veg.
    if (next && cuisine) {
      const cleaned = {}
      for (const course of COURSES) {
        const vegIds = new Set(dishesFor(cuisine, course.id, { vegOnly: true }).map(d => d.id))
        cleaned[course.id] = (menu?.[course.id] ?? []).filter(id => vegIds.has(id))
      }
      onMenu(cleaned)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Cuisine dropdown ─────────────────────────────── */}
      <div className="card p-5">
        <label className="block text-sm font-bold text-gray-800 mb-1.5">Which cuisine?</label>
        <p className="text-xs text-gray-500 mb-3">
          Pick one and the full menu opens below — every dish, already ticked into a sensible spread you can change.
        </p>
        <div className="relative">
          <select
            value={cuisineId ?? ''}
            onChange={e => selectCuisine(e.target.value)}
            className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border-2 border-gray-200 font-semibold text-gray-900 bg-white focus:border-saffron-400 focus:outline-none"
          >
            <option value="">Choose a cuisine…</option>
            {CUISINE_GROUPS.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.ids.map(id => {
                  const c = CUISINE_BY_ID[id]
                  if (!c) return null
                  return (
                    <option key={id} value={id}>
                      {c.emoji} {c.name} — from ₹{c.basePlate}/plate
                    </option>
                  )
                })}
              </optgroup>
            ))}
          </select>
          <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        {cuisine && (
          <>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{cuisine.blurb}</p>
            {cuisine.note && (
              <p className="mt-2 text-xs text-plum-700 bg-plum-50 border border-plum-100 rounded-lg px-3 py-2">
                {cuisine.note}
              </p>
            )}
            {cuisine.hasNonVeg && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setVeg(true)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition-colors ${
                    vegOnly ? 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  <Leaf size={13} /> Pure vegetarian
                </button>
                <button
                  type="button"
                  onClick={() => setVeg(false)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition-colors ${
                    !vegOnly ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  🍗 Veg &amp; non-veg
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── The whole spread ─────────────────────────────── */}
      {cuisine && COURSES.map(course => {
        const dishes = dishesFor(cuisine, course.id, { vegOnly })
        if (!dishes.length) return null
        const allowed = menuAllowance?.[course.id] ?? 0
        const chosen = menu?.[course.id] ?? []
        const over = Math.max(0, chosen.length - allowed)

        return (
          <div key={course.id} className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-gray-50 border-b border-gray-100">
              <div className="min-w-0">
                <p className="font-bold text-gray-800 text-sm">{course.label}</p>
                <p className="text-xs text-gray-500">{course.hint}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  over > 0 ? 'bg-amber-100 text-amber-700' : 'bg-white text-gray-600 border border-gray-200'
                }`}>
                  {counts[course.id]} of {allowed} included
                </span>
                <button
                  type="button"
                  onClick={() => resetCourse(course.id)}
                  title="Back to the recommended set"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-plum-700 hover:bg-plum-50"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {allowed === 0 && (
              <p className="px-5 pt-3 text-xs text-gray-500">
                Not included at this scale — anything you tick here is added at ₹{EXTRA_DISH_RATE}/plate.
              </p>
            )}
            {over > 0 && (
              <p className="px-5 pt-3 text-xs text-amber-700">
                {over} extra {over === 1 ? 'dish' : 'dishes'} beyond what this scale includes — adds ₹{over * EXTRA_DISH_RATE}/plate.
              </p>
            )}

            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dishes.map(dish => {
                const picked = chosen.includes(dish.id)
                return (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => toggleDish(course.id, dish.id)}
                    className={`flex items-start gap-2 text-left px-3 py-2.5 rounded-xl border-2 transition-colors ${
                      picked
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-100 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className={`mt-0.5 shrink-0 w-4 h-4 rounded flex items-center justify-center ${
                      picked ? 'bg-green-600 text-white' : 'border-2 border-gray-300'
                    }`}>
                      {picked ? <Check size={11} /> : <Plus size={10} className="text-gray-500" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-800">
                        <span className={dish.veg ? 'text-green-600' : 'text-red-600'}>●</span>{' '}
                        {dish.name}
                      </span>
                      {dish.delta > 0 && (
                        <span className="block text-[11px] font-semibold text-plum-600">+₹{dish.delta}/plate</span>
                      )}
                      {dish.note && <span className="block text-[11px] text-gray-500">{dish.note}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {cuisine && (
        <div className="card p-5">
          <label className="block text-sm font-bold text-gray-800 mb-1.5">Anything else for the kitchen?</label>
          <p className="text-xs text-gray-500 mb-3">
            Allergies, a family recipe, less spice for the elders, a separate Jain counter — the things a menu list cannot hold.
          </p>
          <textarea
            value={specialRequests}
            onChange={e => onSpecialRequests(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="e.g. No garlic in the sambar, and a small Jain counter for six guests"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm text-gray-800 focus:border-saffron-400 focus:outline-none resize-none"
          />
          <p className="mt-1 text-[11px] text-gray-500 text-right">{specialRequests.length}/500</p>
        </div>
      )}

      {!cuisine && (
        <div className="card p-8 text-center border-dashed border-2 border-gray-200">
          <p className="text-4xl mb-2">🍽️</p>
          <p className="text-sm text-gray-500">
            Choose a cuisine above and every dish in it appears here.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {CUISINES.length} cuisines, from a Mysuru leaf meal to a multi-cuisine buffet.
          </p>
        </div>
      )}
    </div>
  )
}
