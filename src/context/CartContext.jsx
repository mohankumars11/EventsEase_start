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
        packages: [...state.packages, { key, eventId: action.eventId, eventName: action.eventName, pkg: action.pkg, details: action.details ?? null }],
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
    case 'ADD_PRODUCT': {
      const key = `prod__${action.product.id}`
      if (state.products.find(p => p.key === key)) {
        return {
          ...state,
          products: state.products.map(p => p.key === key ? { ...p, qty: p.qty + 1 } : p),
        }
      }
      return { ...state, products: [...state.products, { key, product: action.product, qty: 1 }] }
    }
    case 'REMOVE_PRODUCT':
      return { ...state, products: state.products.filter(p => p.key !== action.key) }

    case 'SET_PRODUCT_QTY':
      return {
        ...state,
        products: state.products.map(p => p.key === action.key ? { ...p, qty: Math.max(1, action.qty) } : p),
      }

    case 'CLEAR_PRODUCTS':
      return { ...state, products: [] }

    case 'CLEAR':
      return { items: [], packages: [], eventDates: {}, products: state.products }

    case 'HYDRATE':
      // Merge, don't replace — products are local-only and must survive
      // hydration of the Supabase-backed items/packages.
      return { ...state, ...action.state, products: state.products }

    default:
      return state
  }
}

const INITIAL = { items: [], packages: [], eventDates: {}, products: [] }
const STORAGE_KEY = 'ee_cart_v1'

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [cart, rawDispatch] = useReducer(cartReducer, INITIAL, () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : INITIAL
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
    + cart.packages.reduce((sum, p) => sum + (p.pkg.price_min ?? 0), 0)

  const productCount = cart.products.reduce((sum, p) => sum + p.qty, 0)
  const productTotal = cart.products.reduce((sum, p) => sum + p.product.price * p.qty, 0)
  const hasProduct = (productId) => cart.products.some(p => p.key === `prod__${productId}`)

  return (
    <CartContext.Provider value={{
      cart, dispatch, totalCount, hasItem, hasPkg, total, getEventDetails,
      productCount, productTotal, hasProduct,
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
