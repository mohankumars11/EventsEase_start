import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronRight, Loader2, RefreshCw, WifiOff, CircleAlert, Check } from 'lucide-react'

/**
 * The small pieces Trade Champion, Grow with Sambramo and Build Your
 * Profile share, in the More tab's own visual language: white cards on
 * `ring-ink/[0.06]`, plum for the thing to press, saffron for "this
 * needs you", forest for done.
 */

/**
 * Load something, and be honest about which of the four states it is in.
 * `load` returns `{ data }` or `{ error: 'offline'|'unavailable'|'error' }`.
 */
export function useLoad(load, deps) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const run = useRef(0)

  const reload = useCallback(async ({ quiet = false } = {}) => {
    const id = ++run.current
    if (!quiet) setState(s => ({ ...s, status: s.data ? 'refreshing' : 'loading', error: null }))
    const res = await load()
    if (id !== run.current) return
    setState(res.error
      ? s => ({ status: 'failed', data: s.data, error: res.error })
      : { status: 'ready', data: res.data, error: null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { reload() }, [reload])
  return { ...state, reload }
}

const SAYS = {
  offline:     { Icon: WifiOff,     title: 'You are offline',            body: 'Nothing here has changed. Connect and try again.' },
  unavailable: { Icon: CircleAlert, title: 'Not switched on yet',        body: 'Referral tracking is still being set up for your account. Nothing you shared is lost.' },
  error:       { Icon: CircleAlert, title: 'That did not load',          body: 'Something went wrong on our side. Try again in a moment.' },
}

/** Loading, or why not, with a way out. */
export function LoadState({ status, error, onRetry, what = 'this' }) {
  if (status === 'loading') {
    return (
      <p role="status" className="flex items-center gap-2 rounded-[18px] bg-white p-4 text-[12.5px] text-ink-mute ring-1 ring-ink/[0.06]">
        <Loader2 size={14} className="animate-spin" /> Loading {what}…
      </p>
    )
  }
  if (status !== 'failed') return null
  const s = SAYS[error] ?? SAYS.error
  return (
    <div role="alert" className="rounded-[18px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <p className="flex items-center gap-2 text-[13px] font-extrabold text-ink">
        <s.Icon size={15} className="text-plum-700" /> {s.title}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">{s.body}</p>
      {onRetry && (
        <button type="button" onClick={() => onRetry()}
          className="mt-3 inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-plum-600 px-4 text-[12.5px] font-extrabold text-white active:scale-[0.98]">
          <RefreshCw size={13} /> Try again
        </button>
      )}
    </div>
  )
}

export function RefreshButton({ onClick, busy }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} aria-label="Refresh"
      className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full bg-white px-3 text-[11.5px] font-extrabold text-plum-700 ring-1 ring-plum-200 disabled:opacity-60">
      <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> {busy ? 'Refreshing' : 'Refresh'}
    </button>
  )
}

const CHIP = {
  complete:     'bg-forest-50 text-forest-700',
  good:         'bg-forest-50 text-forest-700',
  incomplete:   'bg-saffron-400 text-plum-950',
  attention:    'bg-saffron-400 text-plum-950',
  submitted:    'bg-plum-100 text-plum-800',
  under_review: 'bg-plum-100 text-plum-800',
  rejected:     'bg-rose-100 text-rose-800',
  mute:         'bg-ink/[0.06] text-ink-soft',
}

export function Chip({ tone = 'mute', children }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${CHIP[tone] ?? CHIP.mute}`}>
      {children}
    </span>
  )
}

/** A row with a second line that states the saved value. */
export function DetailRow({ icon: Icon, label, detail, chip, tone, onClick, testId }) {
  return (
    <button type="button" onClick={onClick} data-testid={testId}
      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors active:bg-ink/[0.03]">
      {Icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-plum-50 text-plum-700 ring-1 ring-plum-100">
          <Icon size={16} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-bold text-ink">{label}</span>
        {detail && <span className="mt-0.5 block truncate text-[11.5px] text-ink-mute">{detail}</span>}
      </span>
      {chip && <Chip tone={tone}>{chip}</Chip>}
      <ChevronRight size={16} className="shrink-0 text-ink/30" />
    </button>
  )
}

export function Card({ children, className = '' }) {
  return <section className={`rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06] ${className}`}>{children}</section>
}

export function ListCard({ children }) {
  return (
    <div className="divide-y divide-ink/[0.06] overflow-hidden rounded-[18px] bg-white ring-1 ring-ink/[0.07]">
      {children}
    </div>
  )
}

/**
 * Copy, and say whether it worked. `navigator.clipboard` works in the apk
 * (Capacitor serves from https://localhost, a secure context); the
 * textarea is for the browsers where it does not.
 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'; el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(el)
      return ok
    } catch {
      return false
    }
  }
}

export function CopyButton({ text, label = 'Copy', onCopied }) {
  const [done, setDone] = useState(null)
  return (
    <button type="button"
      onClick={async () => {
        const ok = await copyText(text)
        setDone(ok ? 'ok' : 'fail'); onCopied?.(ok)
        setTimeout(() => setDone(null), 2000)
      }}
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-white px-3.5 text-[12px] font-extrabold text-plum-700 ring-1 ring-plum-200">
      {done === 'ok' ? <><Check size={13} strokeWidth={3} /> Copied</> : done === 'fail' ? 'Could not copy' : label}
    </button>
  )
}

export const fmtDate = iso => iso
  ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : null
