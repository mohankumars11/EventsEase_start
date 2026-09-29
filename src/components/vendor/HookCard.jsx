import { Sparkles, Wallet, Hand, ShieldCheck } from 'lucide-react'
import { hookFor, PROMISES } from '../../data/partnerHooks'

/**
 * The card a hook renders into.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SMALL ON PURPOSE
 * ══════════════════════════════════════════════════════════════════════
 *
 * These sit above a form somebody is trying to finish. A hook that takes
 * a third of the screen stops being encouragement and becomes an
 * obstacle — the partner scrolls past it every time and eventually stops
 * reading any of them, including the one that mattered.
 *
 * So: one line of claim, one line of detail, and never a button. The
 * screen already has the action on it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TONE IS A DECISION, NOT DECORATION
 * ══════════════════════════════════════════════════════════════════════
 *
 * plum   — used twice in the whole flow, where somebody is deciding
 *          whether to begin or has just finished. Spending it on the
 *          middle screens is how it stops meaning anything.
 * quiet  — the working screens. Present, unshouted.
 * green  — the screens people are wary of: what they will not do, and
 *          what they charge.
 */

const TONE = {
  plum: {
    shell: 'bg-plum-950 text-white',
    line: 'text-white',
    detail: 'text-white/72',
    icon: 'bg-saffron-400 text-plum-950',
  },
  green: {
    shell: 'bg-forest-50 ring-1 ring-forest-600/20',
    line: 'text-forest-900',
    detail: 'text-forest-800/80',
    icon: 'bg-forest-600 text-white',
  },
  quiet: {
    shell: 'bg-white ring-1 ring-ink/[0.06]',
    line: 'text-ink',
    detail: 'text-ink-soft',
    icon: 'bg-saffron-100 text-saffron-900',
  },
}

export default function HookCard({ id, hook, className = '' }) {
  const h = hook ?? hookFor(id)
  if (!h) return null
  const t = TONE[h.tone] ?? TONE.quiet

  return (
    <div className={`flex items-start gap-3 rounded-[18px] p-3.5 ${t.shell} ${className}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${t.icon}`}>
        <Sparkles size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[13.5px] font-extrabold leading-snug ${t.line}`}>
          {h.line}
        </span>
        <span className={`mt-0.5 block text-[12px] leading-relaxed ${t.detail}`}>
          {h.detail}
        </span>
      </span>
    </div>
  )
}

const PROMISE_ICON = { wallet: Wallet, hand: Hand, shield: ShieldCheck }

/**
 * The three standing promises.
 *
 * Shown where somebody is deciding whether to start and again where they
 * are deciding what to charge — the two moments the objections actually
 * surface. Not on every screen: a promise repeated eleven times is
 * wallpaper, and wallpaper is not believed.
 */
export function PromiseStrip({ className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {PROMISES.map(p => {
        const Icon = PROMISE_ICON[p.icon] ?? ShieldCheck
        return (
          <div
            key={p.id}
            className="flex items-start gap-2.5 rounded-2xl bg-white p-3 ring-1 ring-ink/[0.05]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-700">
              <Icon size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-extrabold leading-snug text-ink">
                {p.line}
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-mute">
                {p.detail}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
