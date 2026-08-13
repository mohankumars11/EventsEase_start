import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_SERVICE': {
      const key = `${action.eventId}__${action.service.id}`
      if (state.items.find(i => i.key === key)) return state
      return {
        ...state,
        items: [...state.items, {
          key, eventId: action.eventId, eventName: action.eventName,
          service: action.service, qty: 1, details: action.details ?? null,
        }],
      }
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.key !== action.key) }

    case 'SET_QTY':
      return {
        ...state,
        items: state.items.map(i => i.key === action.key ? { ...i, qty: Math.max(1, action.qty) } : i),
      }

    case 'ADD_PACKAGE': {
      const key = `pkg__${action.eventId}__${action.pkg.id}`
      if (state.packages.find(p => p.key === key)) return state
      return {
        ...state,
        packages: [...state.packages, {
          key, eventId: action.eventId, eventName: action.eventName, pkg: action.pkg,
          details: action.details ?? null, complimentary: !!action.complimentary,
        }],
      }
    }
    case 'REMOVE_PACKAGE':
      return { ...state, packages: state.packages.filter(p => p.key !== action.key) }

    case 'SET_EVENT_DATE':
      return { ...state, eventDates: { ...state.eventDates, [action.eventId]: action.date } }

    case 'SET_ITEM_DETAILS':
      return {
        ...state,
        items: state.items.map(i => i.key === action.key ? { ...i, details: action.details } : i),
        packages: state.packages.map(p => p.key === action.key ? { ...p, details: action.details } : p),
      }

    // Shop products: local-only, separate from the Supabase-persisted
    // service/package cart above (see Phase 3 plan — orders don't mix
    // with event bookings).
    //
    // A cake carries a configuration (weight, flavour, egg, shape, message,
    // add-ons), and two differently-configured cakes are two different things
    // to bake. So the line key is the product id PLUS a signature of the
    // choices when there are any: without that suffix, adding a 2kg red
    // velvet after a 1kg vanilla would find the same `prod__<id>` key and
    // silently merge them into a quantity of two — one of which the customer
    // never ordered. `signature` comes from selectionSignature() in
    // config/cakeCustomizer.
    case 'ADD_PRODUCT': {
      const key = action.signature
        ? `prod__${action.product.id}__${action.signature}`
        : `prod__${action.product.id}`
      const existing = state.products.find(p => p.key === key)
      if (existing) {
        return {
          ...state,
          products: state.products.map(p => p.key === key
            ? { ...p, qty: p.qty + (action.qty ?? 1), customization: action.customization ?? p.customization }
            : p),
        }
      }
      return {
        ...state,
        products: [...state.products, {
          key,
          product: action.product,
          qty: action.qty ?? 1,
          customization: action.customization ?? null,
          // Present only on a configured line. `unitPrice` is the price
          // actually charged — base weight price plus add-ons — and is what
          // the cart, the totals and order_items.unit_price all read. It is
          // stored rather than recomputed so that changing cakeCustomizer.js
          // can never re-price a cart someone already filled.
          unitPrice:   action.unitPrice ?? null,
          optionLines: action.lines ?? null,
        }],
      }
    }
    case 'REMOVE_PRODUCT':
      return { ...state, products: state.products.filter(p => p.key !== action.key) }

    case 'SET_PRODUCT_QTY':
      return {
        ...state,
        products: state.products.map(p => p.key === action.key ? { ...p, qty: Math.max(1, action.qty) } : p),
      }

    case 'SET_PRODUCT_CUSTOMIZATION':
      return {
        ...state,
        products: state.products.map(p => p.key === action.key ? { ...p, customization: action.customization } : p),
      }

    /**
     * When the shop order is needed.
     *
     * The storefront is organised entirely around occasions — festival
     * countdowns, "what are we celebrating", 50-odd occasion tags on the cake
     * catalogue — and yet nothing anywhere asked what day the thing was for.
     * You could order a birthday cake and never say when the birthday was;
     * the question first came up in a WhatsApp message after the order landed.
     *
     * It lives on the cart rather than in a preference context because it is a
     * property of *this order*, not a standing fact about the customer: the
     * city they are in persists for months, the date they need a cake changes
     * every time they buy one. Cleared with the products for the same reason.
     *
     * Deliberately local-only, like the products themselves — no Supabase
     * column, so this needs no migration to work.
     */
    case 'SET_DELIVERY_DATE':
      return { ...state, deliveryDate: action.date ?? null }

    case 'CLEAR_PRODUCTS':
      return { ...state, products: [], deliveryDate: null }

    case 'CLEAR':
      return { items: [], packages: [], eventDates: {}, products: state.products, deliveryDate: state.deliveryDate }

    case 'HYDRATE': {
      // Merge by key rather than replace. `...action.state` protected products
      // but still overwrote items and packages wholesale, which loses anything
      // added locally before the server rows arrive.
      //
      // That race is now reachable: a guest who adds a service is sent to sign
      // in, and on return the restore and this hydration both fire on the same
      // `user` transition. If the restore landed first its item was wiped from
      // local state — the row was already on its way to Supabase, so it came
      // back on the next reload, but the customer watched their item vanish at
      // the exact moment they signed in to save it.
      //
      // Server rows win on conflict: they carry the canonical price and booking
      // details. Local-only rows survive. Order no longer matters.
      const mergeByKey = (local, remote) => {
        const fromServer = new Set(remote.map(r => r.key))
        return [...remote, ...local.filter(l => !fromServer.has(l.key))]
      }
      return {
        ...state,
        eventDates: { ...state.eventDates, ...action.state.eventDates },
        items:      mergeByKey(state.items,    action.state.items    ?? []),
        packages:   mergeByKey(state.packages, action.state.packages ?? []),
        products:   state.products,
      }
    }

    default:
      return state
  }
}

const INITIAL = { items: [], packages: [], eventDates: {}, products: [], deliveryDate: null }
const STORAGE_KEY = 'ee_cart_v1'

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [cart, rawDispatch] = useReducer(cartReducer, INITIAL, () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      // Spread over INITIAL rather than returning the parsed object directly:
      // a cart saved by an earlier build has no `deliveryDate` key, and
      // returning it bare would leave the field `undefined` for every
      // returning customer until they next cleared their basket.
      return saved ? { ...INITIAL, ...JSON.parse(saved) } : INITIAL
    } catch {
      return INITIAL
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  }, [cart])

  // Load the customer's saved cart from Supabase once they're known.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const [{ data: items }, { data: packages }] = await Promise.all([
        supabase.from('cart_items').select('*').eq('customer_id', user.id),
        supabase.from('cart_packages').select('*').eq('customer_id', user.id),
      ])
      if (cancelled) return
      rawDispatch({
        type: 'HYDRATE',
        state: {
          eventDates: {},
          items: (items ?? []).map(r => ({
            key: `${r.event_id}__${r.service_id}`,
            eventId: r.event_id,
            eventName: r.event_name,
            qty: r.qty ?? 1,
            service: { id: r.service_id, name: r.service_name, emoji: r.service_emoji, priceMin: r.unit_price, priceMax: r.unit_price, priceHint: r.unit_price ? `₹${r.unit_price}` : '' },
            details: r.booking_date ? { date: r.booking_date, time: r.booking_time, guestCount: r.guest_count, location: r.location } : null,
          })),
          packages: (packages ?? []).map(r => ({
            key: `pkg__${r.event_id}__${r.package_id}`,
            eventId: r.event_id,
            eventName: r.event_name,
            pkg: { id: r.package_id, name: r.package_name, price_min: r.price_min, price_max: r.price_max },
            details: r.booking_date ? { date: r.booking_date, time: r.booking_time, guestCount: r.guest_count, location: r.location } : null,
            complimentary: r.complimentary ?? false,
          })),
        },
      })
    })()
    return () => { cancelled = true }
  }, [user])

  // Wrap dispatch: update local state immediately, persist to Supabase in the background.
  const dispatch = useCallback((action) => {
    rawDispatch(action)
    if (!user) return

    switch (action.type) {
      case 'ADD_SERVICE':
        supabase.from('cart_items').upsert({
          customer_id:   user.id,
          event_id:      action.eventId,
          event_name:    action.eventName,
          service_id:    action.service.id,
          service_name:  action.service.name,
          service_emoji: action.service.emoji,
          unit_price:    action.service.priceMin ?? null,
          qty: 1,
          booking_date:  action.details?.date ?? null,
          booking_time:  action.details?.time || null,
          guest_count:   action.details?.guestCount ?? null,
          location:      action.details?.location ?? null,
        }, { onConflict: 'customer_id,event_id,service_id' }).then()
        break
      case 'REMOVE_ITEM': {
        const [eventId, serviceId] = action.key.split('__')
        supabase.from('cart_items').delete()
          .eq('customer_id', user.id).eq('event_id', eventId).eq('service_id', serviceId).then()
        break
      }
      case 'SET_QTY': {
        const [eventId, serviceId] = action.key.split('__')
        supabase.from('cart_items').update({ qty: Math.max(1, action.qty) })
          .eq('customer_id', user.id).eq('event_id', eventId).eq('service_id', serviceId).then()
        break
      }
      case 'ADD_PACKAGE':
        supabase.from('cart_packages').upsert({
          customer_id:  user.id,
          event_id:     action.eventId,
          event_name:   action.eventName,
          package_id:   action.pkg.id,
          package_name: action.pkg.name,
          price_min:    action.pkg.price_min ?? null,
          price_max:    action.pkg.price_max ?? null,
          complimentary: !!action.complimentary,
          booking_date: action.details?.date ?? null,
          booking_time: action.details?.time || null,
          guest_count:  action.details?.guestCount ?? null,
          location:     action.details?.location ?? null,
        }, { onConflict: 'customer_id,event_id,package_id' }).then()
        break
      case 'REMOVE_PACKAGE': {
        const [, eventId, packageId] = action.key.split('__')
        supabase.from('cart_packages').delete()
          .eq('customer_id', user.id).eq('event_id', eventId).eq('package_id', packageId).then()
        break
      }
      case 'CLEAR':
        supabase.from('cart_items').delete().eq('customer_id', user.id).then()
        supabase.from('cart_packages').delete().eq('customer_id', user.id).then()
        break
      case 'SET_ITEM_DETAILS': {
        const patch = {
          booking_date: action.details?.date ?? null,
          booking_time: action.details?.time || null,
          guest_count:  action.details?.guestCount ?? null,
          location:     action.details?.location ?? null,
        }
        if (action.key.startsWith('pkg__')) {
          const [, eventId, packageId] = action.key.split('__')
          supabase.from('cart_packages').update(patch)
            .eq('customer_id', user.id).eq('event_id', eventId).eq('package_id', packageId).then()
        } else {
          const [eventId, serviceId] = action.key.split('__')
          supabase.from('cart_items').update(patch)
            .eq('customer_id', user.id).eq('event_id', eventId).eq('service_id', serviceId).then()
        }
        break
      }
      default:
        break
    }
  }, [user])

  const totalCount = cart.items.length + cart.packages.length
  const hasItem = (eventId, serviceId) => cart.items.some(i => i.key === `${eventId}__${serviceId}`)
  const hasPkg  = (eventId, pkgId)     => cart.packages.some(p => p.key === `pkg__${eventId}__${pkgId}`)
  // Reuse the first set of booking details already captured for this event,
  // so the modal doesn't re-ask for the same date/location on every add.
  const getEventDetails = (eventId) =>
    [...cart.items, ...cart.packages].find(i => i.eventId === eventId && i.details)?.details ?? null
  const total = cart.items.reduce((sum, i) => sum + (i.service.priceMin ?? 0) * i.qty, 0)
    + cart.packages.reduce((sum, p) => sum + (p.complimentary ? 0 : (p.pkg.price_min ?? 0)), 0)

  const productCount = cart.products.reduce((sum, p) => sum + p.qty, 0)
  // `unitPrice` is the configured price of a customised line; a plain product
  // has none and falls back to the catalogue price. The fallback also covers
  // carts saved to localStorage before configurable cakes existed.
  const lineUnitPrice = (line) => line.unitPrice ?? line.product.price
  const productTotal = cart.products.reduce((sum, p) => sum + lineUnitPrice(p) * p.qty, 0)

  // One product can now occupy several lines, one per configuration, so
  // "is this in the cart?" can no longer be a key lookup.
  const productLines  = (productId) => cart.products.filter(p => p.product.id === productId)
  const hasProduct    = (productId) => productLines(productId).length > 0
  const productQtyFor = (productId) => productLines(productId).reduce((sum, p) => sum + p.qty, 0)

  // Everything the customer has put aside, across both carts. The header
  // badge needs this: `totalCount` counts only services and packages, so
  // adding a cake to the shop cart used to leave the badge reading 0.
  const cartCount = totalCount + productCount

  // The app has two genuinely different carts — shop products (delivered
  // goods) and event services/packages (quoted work) — and one cart icon
  // in the header. Send people to whichever one actually has their stuff
  // in it, preferring products since that's the checkout-now flow.
  //
  // ── Guests go to the services cart too, now ─────────────────────────
  // This used to send every signed-out visitor to /shop/cart, because the
  // services cart was customer-only and a tap on the cart icon would have
  // bounced them to /login. That was the right call for the guard that
  // existed and the wrong shape for the funnel: a guest who had just added
  // a decoration setup tapped the cart, saw an empty *shop* basket, and
  // reasonably concluded the add had failed.
  //
  // The services cart is public now — browse and fill it freely, sign in at
  // send, exactly as the shop does — so the honest answer is to point at
  // whichever cart holds their things regardless of who they are.
  const cartPath = productCount > 0
    ? '/shop/cart'
    : totalCount > 0
      ? '/dashboard/customer/cart'
      : '/shop/cart'

  return (
    <CartContext.Provider value={{
      cart, dispatch, totalCount, hasItem, hasPkg, total, getEventDetails,
      productCount, productTotal, hasProduct, productLines, productQtyFor,
      lineUnitPrice, cartCount, cartPath,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
