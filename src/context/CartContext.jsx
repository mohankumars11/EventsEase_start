import { createContext, useContext, useReducer, useEffect } from 'react'

const CartContext = createContext(null)

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_SERVICE': {
      const key = `${action.eventId}__${action.service.id}`
      if (state.items.find(i => i.key === key)) return state
      return {
        ...state,
        items: [...state.items, { key, eventId: action.eventId, eventName: action.eventName, service: action.service, qty: 1 }],
      }
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.key !== action.key) }

    case 'ADD_PACKAGE': {
      const key = `pkg__${action.eventId}__${action.pkg.id}`
      if (state.packages.find(p => p.key === key)) return state
      return {
        ...state,
        packages: [...state.packages, { key, eventId: action.eventId, eventName: action.eventName, pkg: action.pkg }],
      }
    }
    case 'REMOVE_PACKAGE':
      return { ...state, packages: state.packages.filter(p => p.key !== action.key) }

    case 'SET_EVENT_DATE':
      return { ...state, eventDates: { ...state.eventDates, [action.eventId]: action.date } }

    case 'CLEAR':
      return { items: [], packages: [], eventDates: {} }

    case 'HYDRATE':
      return action.state

    default:
      return state
  }
}

const INITIAL = { items: [], packages: [], eventDates: {} }
const STORAGE_KEY = 'ee_cart_v1'

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, INITIAL, () => {
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

  const totalCount = cart.items.length + cart.packages.length
  const hasItem = (eventId, serviceId) => cart.items.some(i => i.key === `${eventId}__${serviceId}`)
  const hasPkg  = (eventId, pkgId)     => cart.packages.some(p => p.key === `pkg__${eventId}__${pkgId}`)

  return (
    <CartContext.Provider value={{ cart, dispatch, totalCount, hasItem, hasPkg }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
