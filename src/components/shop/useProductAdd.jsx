import { useState } from 'react'
import { useCart } from '../../context/CartContext'
import { CUSTOMIZABLE_CATEGORIES } from '../../config/shop'
import { isCustomizable } from '../../config/customizers'
import ProductCustomizeSheet from './ProductCustomizeSheet'
import CustomizeModal from './CustomizeModal'

/**
 * "What happens when someone taps ADD" — decided once, for every surface.
 *
 * There are three right answers and they depend on the product:
 *
 *   — A category with an option builder (cakes, party, pooja, gifts) opens
 *     the full sheet. A cake with no weight, flavour or egg preference is not
 *     an order anyone can bake.
 *   — A category that only takes a message (flowers) opens the small modal.
 *   — Everything else goes straight into the cart.
 *
 * This used to be re-decided per page, which is how the same cake could be
 * added with a customiser from the Cakes shelf and without one from a
 * best-sellers rail two screens earlier. The hook returns the handler and the
 * overlay together; a caller renders `{sheet}` once, anywhere in its tree.
 */
export function useProductAdd() {
  const { dispatch } = useCart()
  const [sheetTarget, setSheetTarget] = useState(null)
  const [modalTarget, setModalTarget] = useState(null)

  function addProduct(product) {
    if (isCustomizable(product.category)) { setSheetTarget(product); return }
    if (CUSTOMIZABLE_CATEGORIES[product.category]) { setModalTarget(product); return }
    dispatch({ type: 'ADD_PRODUCT', product })
  }

  const sheet = (
    <>
      {sheetTarget && (
        <ProductCustomizeSheet
          product={sheetTarget}
          onClose={() => setSheetTarget(null)}
          onConfirm={({ qty, unitPrice, lines, signature }) => {
            dispatch({ type: 'ADD_PRODUCT', product: sheetTarget, qty, unitPrice, lines, signature })
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
