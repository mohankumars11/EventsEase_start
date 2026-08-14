import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

/**
 * App-wide toasts.
 *
 * Replaces `alert()`, which the admin console used for every error path.
 * `alert()` is a blocking, unstyled, browser-chrome modal that shows raw
 * Postgres text ("duplicate key value violates unique constraint …") to
 * an operator mid-task, freezes the tab until dismissed, and can't
 * express success at all — so successful actions gave no feedback
 * whatsoever and operators re-clicked, causing duplicates.
 */
const ToastContext = createContext(null)

const VARIANTS = {
  success: { icon: CheckCircle2, ring: 'border-green-200',  bg: 'bg-green-50',  fg: 'text-green-800',  iconFg: 'text-green-600'  },
  error:   { icon: AlertCircle,  ring: 'border-red-200',    bg: 'bg-red-50',    fg: 'text-red-800',    iconFg: 'text-red-600'    },
  info:    { icon: Info,         ring: 'border-plum-200',   bg: 'bg-plum-50',   fg: 'text-plum-800',   iconFg: 'text-plum-600'   },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback(id => {
    setToasts(list => list.filter(t => t.id !== id))
  }, [])

  const push = useCallback((message, variant = 'info', ms = 5000) => {
    const id = nextId.current++
    setToasts(list => [...list, { id, message, variant }])
    // Errors stay until dismissed — an operator who looked away shouldn't
    // lose the only record that their action failed.
    if (variant !== 'error') setTimeout(() => dismiss(id), ms)
    return id
  }, [dismiss])

  const toast = {
    success: useCallback((m, ms) => push(m, 'success', ms), [push]),
    error:   useCallback((m)     => push(m, 'error'), [push]),
    info:    useCallback((m, ms) => push(m, 'info', ms), [push]),
    dismiss,
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed z-[100] top-[calc(env(safe-area-inset-top,0px)+8.5rem)] right-4 left-4 sm:left-auto sm:right-5 sm:max-w-sm flex flex-col gap-2 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map(({ id, message, variant }) => {
          const v = VARIANTS[variant] ?? VARIANTS.info
          const Icon = v.icon
          return (
            <div
              key={id}
              // animate-pop-in (120ms), not animate-fade-in-up (500ms). A
              // toast is a reply to something the user just pressed, and at
              // half a second the reply arrives after the thumb has moved on
              // — which is what made operators press the button twice, the
              // exact duplicate-submit problem this component was built to
              // stop. See the note on .animate-pop-in in index.css.
              className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-2xl border shadow-lg animate-pop-in ${v.ring} ${v.bg}`}
            >
              <Icon size={17} className={`mt-0.5 shrink-0 ${v.iconFg}`} />
              <p className={`flex-1 text-sm font-medium leading-snug ${v.fg}`}>{message}</p>
              <button
                onClick={() => dismiss(id)}
                className={`shrink-0 p-0.5 rounded-lg opacity-50 hover:opacity-100 transition-opacity ${v.fg}`}
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

/**
 * Turns a Supabase/Postgres error into something a human can act on.
 * Raw driver text is kept only as a last resort — it's better than
 * nothing, but it should never be the first thing an operator reads.
 */
export function friendlyError(err, fallback = 'Something went wrong. Please try again.') {
  const msg = (err?.message ?? String(err ?? '')).toLowerCase()
  if (!msg) return fallback
  if (msg.includes('duplicate key'))        return 'That already exists — it looks like this was already saved.'
  if (msg.includes('violates foreign key')) return "This is linked to something else that's missing. Refresh and try again."
  if (msg.includes('violates row-level'))   return "You don't have permission to do that."
  if (msg.includes('jwt') || msg.includes('expired')) return 'Your session expired. Please sign in again.'
  if (msg.includes('failed to fetch') || msg.includes('networkerror')) return 'Network problem — check your connection and try again.'
  return err?.message ?? fallback
}
