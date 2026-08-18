import { useState, useEffect, useRef } from 'react'
import { useCart } from '../../context/CartContext'
import { CUSTOMIZABLE_CATEGORIES } from '../../config/shop'
import { buildOptionGroups } from '../../config/customizers'
import {
  loadOptionCatalog, optionsForProduct, mergeOptionGroups,
} from '../../lib/productOptions'
import ProductCustomizeSheet from './ProductCustomizeSheet'
import CustomizeModal from './CustomizeModal'

/**
 * "What happens when someone taps ADD" — decided once, for every surface.
 *
 * There are three right answers and they depend on the product:
 *
 *   — A product with any options at all opens the full sheet. A cake with no
 *     weight, flavour or egg preference is not an order anyone can bake.
 *   — A category that only takes a message (flowers) opens the small modal.
 *   — Everything else goes straight into the cart.
 *
 * This used to be re-decided per page, which is how the same cake could be
 * added with a customiser from the Cakes shelf and without one from a
 * best-sellers rail two screens earlier. The hook returns the handler and the
 * overlay together; a caller renders `{sheet}` once, anywhere in its tree.
 *
 * ── Why the decision is no longer `isCustomizable(category)` ─────────────
 * It used to be a lookup in a table of four hard-coded categories. That made
 * customisation a developer feature: a shelf the admin created — and every
 * product on it — could never ask the customer anything, however much it
 * needed to. Since migration 053 the questions can also come from the
 * database, per shelf or per product, so the real question is "does THIS
 * product have any options", and it is answered by merging both sources.
 *
 * The catalogue is loaded once per tab and cached in the module, so this stays
 * a synchronous-feeling tap: the `await` below resolves instantly on every
 * call after the first, and the first is triggered on mount rather than on the
 * tap itself.
 */
export function useProductAdd() {
  const { dispatch } = useCart()
  const [sheetTarget, setSheetTarget] = useState(null)
  const [modalTarget, setModalTarget] = useState(null)
  const catalogRef = useRef(null)

  // Warmed on mount, not on the first tap — otherwise the very first ADD on a
  // page pays for a round trip while a thumb waits on it.
  useEffect(() => {
    let alive = true
    loadOptionCatalog().then(c => { if (alive) catalogRef.current = c })
    return () => { alive = false }
  }, [])

  async function addProduct(product) {
    const catalog = catalogRef.current ?? await loadOptionCatalog()
    catalogRef.current = catalog

    const groups = mergeOptionGroups(
      buildOptionGroups(product),
      optionsForProduct(catalog, product),
    )

    if (groups.length) { setSheetTarget({ product, groups }); return }
    if (CUSTOMIZABLE_CATEGORIES[product.category]) { setModalTarget(product); return }
    dispatch({ type: 'ADD_PRODUCT', product })
  }

  const sheet = (
    <>
      {sheetTarget && (
        <ProductCustomizeSheet
          product={sheetTarget.product}
          // Resolved here rather than inside the sheet, because the decision
          // to OPEN the sheet already had to know what the groups were —
          // computing them twice is how the two answers drift apart.
          groups={sheetTarget.groups}
          onClose={() => setSheetTarget(null)}
          onConfirm={({ qty, unitPrice, lines, signature }) => {
            dispatch({ type: 'ADD_PRODUCT', product: sheetTarget.product, qty, unitPrice, lines, signature })
            setSheetTarget(null)
          }}
        />
      )}
      {modalTarget && (
        <CustomizeModal
          product={modalTarget}
          fieldConfig={CUSTOMIZABLE_CATEGORIES[modalTarget.category]}
          onClose={() => setModalTarget(null)}
          onConfirm={({ qty, customization }) => {
            dispatch({ type: 'ADD_PRODUCT', product: modalTarget, qty, customization })
            setModalTarget(null)
          }}
        />
      )}
    </>
  )

  return { addProduct, sheet }
}

/**
 * The +/− controls for one product's cart line, wired the way a stepper on a
 * catalogue card has to behave.
 *
 * The subtlety is the bottom of the range: `SET_PRODUCT_QTY` clamps to a
 * minimum of 1, so decrementing the last one does nothing at all — the
 * customer taps "−", the 1 stays, and the only way out of a mistaken add is
 * to open the cart. Going to zero has to dispatch REMOVE_PRODUCT instead.
 * Every card in the shop gets this from here rather than reimplementing it.
 */
export function useCartLine(productId) {
  const { dispatch, productQtyFor, productLines } = useCart()
  const line = productLines(productId)[0]

  return {
    qty: productQtyFor(productId),
    inc: () => line && dispatch({ type: 'SET_PRODUCT_QTY', key: line.key, qty: line.qty + 1 }),
    dec: () => {
      if (!line) return
      if (line.qty <= 1) dispatch({ type: 'REMOVE_PRODUCT', key: line.key })
      else dispatch({ type: 'SET_PRODUCT_QTY', key: line.key, qty: line.qty - 1 })
    },
  }
}

export default useProductAdd
