import { useState, useEffect } from 'react'
import { fetchCategories, FALLBACK_CATEGORIES } from '../lib/shopCategories'

/**
 * The shelves, for the storefront.
 *
 * ── The bug this exists to fix ───────────────────────────────────────────
 * Migration 051 made the category list a table and `lib/shopCategories.js`
 * merges it over the config list. But only the ADMIN console ever called that
 * merge. Every customer-facing screen — the shop home, a category page, the
 * home mosaic, the picks rail, the landing sections, the chat widget —
 * imported the hard-coded `SHOP_CATEGORIES` array directly.
 *
 * So an admin could add a shelf in the Product Studio, file products under it,
 * mark them on sale, and the storefront would never show any of it: there was
 * no tile to tap, `/shop/<new-id>` had no metadata, and the products were only
 * reachable by search. That is exactly the "I put it on sale and it doesn't
 * appear on the front end" report, and it is not a save bug — the row was
 * always written correctly. The read side simply wasn't listening.
 *
 * ── Why a hook with a module cache ───────────────────────────────────────
 * Eight screens need this list and several of them mount together (the shop
 * home renders the picks rail; the landing page renders three sections). One
 * query, shared, with the result kept for the life of the tab.
 *
 * The initial value is never empty and never a spinner: `FALLBACK_CATEGORIES`
 * is the config list, which is correct for the six built-in shelves and lets
 * the first paint happen with real tiles. The live list replaces it a moment
 * later and only ever ADDS shelves or corrects copy. A storefront that flashes
 * blank because a network call is in flight would be a worse bug than the one
 * this fixes.
 */

let cache = null            // { categories, live } for kind:'shop'
let inFlight = null
const listeners = new Set()

async function loadOnce() {
  if (cache) return cache
  if (inFlight) return inFlight

  inFlight = fetchCategories({ kind: 'shop' })
    .then(result => {
      // A failed/empty read must not empty the shop. `fetchCategories` already
      // falls back to config, but belt-and-braces: never cache a blank list.
      cache = result.categories?.length ? result : { categories: FALLBACK_CATEGORIES, live: false }
      inFlight = null
      listeners.forEach(fn => fn(cache))
      return cache
    })
    .catch(() => {
      inFlight = null
      const fallback = { categories: FALLBACK_CATEGORIES, live: false }
      listeners.forEach(fn => fn(fallback))
      return fallback
    })

  return inFlight
}

/**
 * Drop the cache so the next mount re-reads.
 *
 * Called by the console after a shelf is added, renamed or retired — without
 * it an admin adds a shelf, taps through to the storefront in the same tab,
 * and sees the old list, which reads exactly like the save failed.
 */
export function invalidateShopCategories() {
  cache = null
  inFlight = null
  loadOnce()
}

export function useShopCategories() {
  const [state, setState] = useState(() => cache ?? { categories: FALLBACK_CATEGORIES, live: false })

  useEffect(() => {
    let alive = true
    const onChange = next => { if (alive) setState(next) }
    listeners.add(onChange)
    loadOnce().then(onChange)
    return () => { alive = false; listeners.delete(onChange) }
  }, [])

  return state.categories
}

/** One shelf's metadata, or a usable stand-in built from the id itself. */
export function useShopCategory(id) {
  const categories = useShopCategories()
  if (!id) return null
  return (
    categories.find(c => c.id === id) ??
    // An id that is on products but has no row and no config entry still has
    // to render a titled page rather than a blank header — see ShopCategory.
    { id, label: id, emoji: '🛍️', tagline: null, blurb: null, hero_image_url: null, _source: 'implied' }
  )
}
