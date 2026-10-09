/**
 * The small set of controls the Anchor & MC flow is built from.
 *
 * No native <select>, no radio, no checkbox anywhere in the flow. Every
 * choice is a thing you tap and watch change: chips, segmented pills,
 * toggles, a slider, cards. Native pickers on Android open a full-screen
 * system list that looks nothing like the app and hides the other answers.
 */
import { motion, AnimatePresence } from 'motion/react'
import { Drawer } from 'vaul'
import { Check } from 'lucide-react'

const spring = { type: 'spring', stiffness: 520, damping: 32 }

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07] shadow-[0_1px_2px_rgba(20,10,40,0.04)] ${className}`}>
      {children}
    </div>
  )
}

export function Label({ children, required, hint, right }) {
  return (
    <div className="mb-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13.5px] font-extrabold text-ink">
          {children}{required && <span className="ml-0.5 text-rose-500">*</span>}
        </span>
        {right && <span className="text-[11.5px] font-bold text-ink-mute">{right}</span>}
      </div>
      {hint && <p className="mt-0.5 text-[12px] leading-snug text-ink/55">{hint}</p>}
    </div>
  )
}

export function TextField({ value, onChange, placeholder, max, multiline, prefix, inputMode, rows = 4, valid }) {
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <div className="relative">
      <div className={`flex items-start gap-2 rounded-2xl bg-[#f7f6fb] px-4 ring-1 ring-ink/[0.06] transition focus-within:bg-white focus-within:ring-2 focus-within:ring-plum-500 ${multiline ? 'py-3' : 'py-0'}`}>
        {prefix && <span className="pt-3.5 text-[16px] font-extrabold text-ink/70">{prefix}</span>}
        <Tag
          value={value ?? ''}
          onChange={e => onChange(max ? e.target.value.slice(0, max) : e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          rows={multiline ? rows : undefined}
          className={`w-full resize-none bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:text-ink/30 ${multiline ? 'leading-relaxed' : 'h-[50px]'}`}
        />
        {valid && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}
            className="mt-[15px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white">
            <Check size={12} strokeWidth={3} />
          </motion.span>
        )}
      </div>
      {max && (
        <p className="mt-1 text-right text-[11px] font-bold text-ink/35">{String(value ?? '').length}/{max}</p>
      )}
    </div>
  )
}

/** One tappable choice. Selected chips fill; the tick springs in. */
export function Chip({ on, onClick, children, disabled, size = 'md' }) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-[12.5px]' : 'px-3.5 py-2.5 text-[13.5px]'
  return (
    <motion.button
      type="button" whileTap={{ scale: 0.94 }} onClick={onClick} disabled={disabled}
      aria-pressed={!!on}
      className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-colors disabled:opacity-30 ${pad} ${
        on ? 'bg-plum-700 text-white shadow-[0_6px_16px_-6px_rgba(91,33,182,0.6)]' : 'bg-[#f4f2f9] text-ink/75 ring-1 ring-ink/[0.06]'
      }`}
    >
      <AnimatePresence initial={false}>
        {on && (
          <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: 14, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            className="inline-flex overflow-hidden"><Check size={14} strokeWidth={3} /></motion.span>
        )}
      </AnimatePresence>
      {children}
    </motion.button>
  )
}

export function ChipRow({ options, value, onChange, multi, max, format = x => x, size, isDisabled }) {
  const picked = multi ? (value ?? []) : value
  const toggle = opt => {
    if (!multi) return onChange(opt)
    const has = picked.includes(opt)
    if (has) return onChange(picked.filter(x => x !== opt))
    if (max && picked.length >= max) return
    onChange([...picked, opt])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const on = multi ? picked.includes(opt) : picked === opt
        return (
          <Chip key={String(opt)} on={on} size={size} onClick={() => toggle(opt)}
            disabled={(!on && multi && max && picked.length >= max) || isDisabled?.(opt)}>
            {format(opt)}
          </Chip>
        )
      })}
    </div>
  )
}

/** A pill with a sliding highlight. For two to four mutually exclusive answers. */
export function Segmented({ options, value, onChange, id }) {
  return (
    <div className="relative flex rounded-full bg-[#f1eff7] p-1">
      {options.map(o => {
        const on = value === o.value
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={`relative z-10 flex-1 rounded-full px-2 py-2 text-[12.5px] font-extrabold transition-colors ${on ? 'text-white' : 'text-ink/60'}`}>
            {on && (
              <motion.span layoutId={`seg-${id}`} transition={spring}
                className="absolute inset-0 -z-10 rounded-full bg-plum-700 shadow-[0_4px_12px_-4px_rgba(91,33,182,0.7)]" />
            )}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors ${on ? 'bg-forest-600' : 'bg-ink/15'}`}>
      <motion.span layout transition={spring}
        className={`absolute top-[3px] h-6 w-6 rounded-full bg-white shadow ${on ? 'right-[3px]' : 'left-[3px]'}`} />
    </button>
  )
}

/** A choice that needs a sentence: cancellation policy, travel billing. */
export function OptionCard({ on, onClick, title, body }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={onClick}
      className={`w-full rounded-2xl p-3.5 text-left transition ${on ? 'bg-plum-50 ring-2 ring-plum-600' : 'bg-white ring-1 ring-ink/[0.08]'}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${on ? 'bg-plum-700 text-white' : 'ring-2 ring-ink/15'}`}>
          {on && <Check size={12} strokeWidth={3.5} />}
        </span>
        <span>
          <span className="block text-[13.5px] font-extrabold text-ink">{title}</span>
          {body && <span className="mt-0.5 block text-[12px] leading-snug text-ink/55">{body}</span>}
        </span>
      </div>
    </motion.button>
  )
}

/** Effort multiplier slider: a track with snap stops and a draggable value bubble. */
export function StopSlider({ stops, value, onChange, format = x => x }) {
  const idx = Math.max(0, stops.indexOf(value))
  const pct = stops.length > 1 ? (idx / (stops.length - 1)) * 100 : 0
  return (
    <div className="px-2 pt-8">
      <div className="relative h-2 rounded-full bg-[#ece9f5]">
        <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-plum-500 to-plum-700"
          animate={{ width: `${pct}%` }} transition={spring} />
        <motion.div className="absolute -top-[30px] -translate-x-1/2" animate={{ left: `${pct}%` }} transition={spring}>
          <span className="rounded-full bg-plum-700 px-2.5 py-1 text-[12px] font-extrabold text-white shadow-lg">{format(stops[idx])}</span>
        </motion.div>
        <motion.div className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-plum-700 bg-white shadow"
          animate={{ left: `${pct}%` }} transition={spring} />
        <input type="range" min={0} max={stops.length - 1} step={1} value={idx}
          onChange={e => onChange(stops[Number(e.target.value)])}
          aria-label="Effort multiplier"
          className="absolute inset-0 -top-3 h-8 w-full cursor-pointer opacity-0" />
      </div>
      <div className="mt-3 flex justify-between text-[11.5px] font-bold text-ink/40">
        {stops.map(s => <span key={s}>{format(s)}</span>)}
      </div>
    </div>
  )
}

/** A bottom sheet. Drag down or tap outside to dismiss. */
export function Sheet({ open, onOpenChange, title, children }) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[120] bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[121] mx-auto flex max-h-[88vh] max-w-lg flex-col rounded-t-[28px] bg-white outline-none">
          <div className="mx-auto mt-3 h-1.5 w-11 rounded-full bg-ink/15" />
          <Drawer.Title className="px-5 pt-4 text-[17px] font-extrabold text-ink">{title}</Drawer.Title>
          <div className="overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

export function SectionTitle({ title, sub }) {
  return (
    <div className="mb-4">
      <h1 className="text-[clamp(1.35rem,6vw,1.6rem)] font-extrabold leading-tight tracking-tight text-plum-950">{title}</h1>
      {sub && <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink/60">{sub}</p>}
    </div>
  )
}
