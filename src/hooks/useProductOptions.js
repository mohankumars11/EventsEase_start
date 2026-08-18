import { useState, useEffect, useMemo } from 'react'
import { buildOptionGroups } from '../config/customizers'
import { loadOptionCatalog, optionsForProduct, mergeOptionGroups } from '../lib/productOptions'

/**
 * "What can be changed about this product" — the merged answer, for React.
 *
 * Four surfaces need this and they must all agree, because they are showing
 * the same product to the same person: the grid card decides whether to print
 * a stepper or a "Choose options" button, the detail page decides whether the
 * price reads "from ₹899", `useProductAdd` decides whether a tap opens the
 * sheet, and the sheet renders the groups. When those four disagreed — which
 * they did, because three of them called `isCustomizable(category)` and the
 * sheet called `buildOptionGroups(product)` — a product could show a stepper
 * and then open a configurator anyway.
 *
 * The catalogue behind this is fetched once per tab and cached in the module,
 * so mounting this on forty cards costs one query in total.
 */

let cache = null
const listeners = new Set()

function useOptionCatalog() {
  const [catalog, setCatalog] = useState(cache)

  useEffect(() => {
    let alive = true
    const onChange = c => { if (alive) setCatalog(c) }
    listeners.add(onChange)
    loadOptionCatalog().then(c => {
      cache = c
      listeners.forEach(fn => fn(c))
    })
    return () => { alive = false; listeners.delete(onChange) }
  }, [])

  return catalog
}

/**
 * Every option group for one product: the code builder's, plus the admin's.
 *
 * Returns `[]` until the catalogue arrives, which is the honest answer — a
 * card that renders a stepper for a frame and swaps to "Choose options" a
 * moment later is better than one that blocks the whole grid on a query. The
 * code groups are available synchronously and are included from the first
 * render, so nothing that worked before this feature ever flickers.
 */
export function useProductOptionGroups(product) {
  const catalog = useOptionCatalog()

  return useMemo(() => {
    const code = buildOptionGroups(product)
    if (!catalog) return code
    return mergeOptionGroups(code, optionsForProduct(catalog, product))
  }, [catalog, product])
}

/** Whether tapping ADD has anything to ask. */
export function useIsConfigurable(product) {
  return useProductOptionGroups(product).length > 0
}
