/**
 * The customer's view, while the partner is still filling it in.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY IT POPS UP AFTER EVERY STEP
 * ══════════════════════════════════════════════════════════════════════
 *
 * Asked for in so many words: do not wait until the end to show the
 * partner what customers will see; show it after every step, from the
 * first, so they know why they are filling it. A twelve-step form
 * reads as paperwork until a partner watches their own answer turn into
 * the chips, numbers and photos a customer chooses them by.
 *
 * So each finished step that changes something a customer sees opens a
 * short card with exactly that part of their storefront, as it now is.
 * It does not block: Continue, a swipe, or eight seconds closes it, and
 * a finger on it holds the timer while they look. Steps a customer never
 * sees (identity documents, payout) open nothing.
 *
 * The full storefront is one tap away throughout, from the Preview
 * button in the header.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Check, Eye, X } from 'lucide-react'
import Storefront from '../../customer/storefront/Storefront'
import StoreAvatar from '../../customer/storefront/StoreAvatar'

const SECTION_NAME = {
  profile: 'on your profile card', about: 'in your introduction', work: 'in your work',
  offers: 'in your packages', pricing: 'in how you charge', glance: 'in your details', terms: 'in your booking terms',
}

/** Does the model have anything to show in these sections yet? */
export function hasContent(model, secs) {
  return (secs ?? []).some(k => ({
    profile: true,
    about: !!model.bio || model.highlights.length > 0 || model.events.length > 0,
    work: model.media.length > 0,
    offers: model.packages.length > 0 || model.menus.length > 0,
    pricing: model.rules.length > 0 || model.items.length > 0 || model.extras.length > 0,
    glance: model.facts.length > 0 || model.checks.length > 0,
    terms: model.instant != null || model.noticeDays != null || !!model.terms?.cancellation,
  })[k])
}

export function PreviewButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} data-live-preview-open
      className="flex h-9 items-center gap-1 rounded-full bg-[#1B1433] px-3 text-[11.5px] font-extrabold text-white">
      <Eye size={13} />Preview
    </button>
  )
}

/** Full-screen: the whole storefront as it stands. */
export function LivePreviewScreen({ open, model, onClose, avatar, onEditSection = null }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="live" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="fixed inset-0 z-[140] flex flex-col bg-[#FBF9FF]" role="dialog" aria-modal="true" aria-label="Live customer preview" data-live-preview>
          <header className="flex shrink-0 items-center gap-2 border-b border-[#EEE8F8] bg-white/95 px-3 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+10px)] backdrop-blur">
            <div className="min-w-0 flex-1 pl-1">
              <p className="text-[13px] font-extrabold text-[#1B1433]">Live preview</p>
              <p className="truncate text-[11px] font-semibold text-[#8E87A6]">What customers will see, built from your answers so far</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close preview" className="grid h-10 w-10 place-items-center rounded-full bg-[#F1EAFF] text-[#4B1D96]"><X size={19} /></button>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <Storefront model={model} rateNote onEditSection={onEditSection} avatarSlot={avatar ?? <StoreAvatar src={model.avatarUrl} name={model.name} />} />
          </main>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** After a step: exactly the part of the storefront that step changed. */
export function StepPop({ pop, model, onClose, onFull, total }) {
  const [held, setHeld] = useState(false)
  const [left, setLeft] = useState(1)
  const startRef = useRef(0)
  const HOLD_MS = 8000

  useEffect(() => {
    if (!pop) return
    setLeft(1)
    startRef.current = performance.now()
  }, [pop])

  useEffect(() => {
    if (!pop || held) return
    let raf
    const base = performance.now() - (1 - left) * HOLD_MS
    const tick = now => {
      const f = 1 - (now - base) / HOLD_MS
      if (f <= 0) { onClose(); return }
      setLeft(f)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pop, held])

  if (typeof document === 'undefined') return null
  const filled = pop && hasContent(model, pop.secs)
  return createPortal(
    <AnimatePresence>
      {pop && (
        <motion.div key={pop.key} className="fixed inset-0 z-[130] flex items-end" data-step-pop={pop.stage}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#1B1433]/40" />
          <motion.section
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 90) onClose() }}
            onPointerDown={() => setHeld(true)} onPointerUp={() => setHeld(false)} onPointerCancel={() => setHeld(false)}
            className="relative mx-auto flex max-h-[78dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[30px] bg-white shadow-[0_-20px_50px_-20px_rgba(27,20,51,.5)]">
            {/* The countdown, as a hairline across the top. */}
            <div className="h-1 w-full bg-[#F1EAFF]"><div className="h-full bg-gradient-to-r from-[#5B21A8] to-[#8B5CF6]" style={{ width: `${Math.max(0, left) * 100}%` }} /></div>
            <div className="mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-[#1B1433]/15" />
            <div className="flex items-start gap-3 px-5 pb-3 pt-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 ring-1 ring-emerald-200"><Check size={19} strokeWidth={3} className="text-emerald-700" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-[#7C3AED]">Step {pop.n} of {total} done</p>
                <p className="mt-0.5 text-[17px] font-extrabold leading-tight text-[#1B1433]">
                  {filled ? 'This is what customers now see' : 'Customers will see this part next'}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-[#6E6787]">
                  {filled
                    ? `What you answered in “${pop.label}” is now ${SECTION_NAME[pop.secs[0]] ?? 'on your storefront'}, exactly as customers see it.`
                    : 'Fill this step and customers see it here, exactly like this.'}
                </p>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[#F1ECFA] bg-[#FBF9FF]">
              <div className="pointer-events-none">
                <Storefront model={model} focus={pop.secs} avatarSlot={<StoreAvatar src={model.avatarUrl} name={model.name} />} />
              </div>
            </div>
            <div className="flex shrink-0 gap-2 border-t border-[#F1ECFA] bg-white px-4 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] pt-3">
              <button type="button" onClick={onFull} className="h-12 flex-1 rounded-full bg-[#F1EAFF] text-[14px] font-extrabold text-[#4B1D96]">Full preview</button>
              <button type="button" onClick={onClose} data-step-pop-continue className="h-12 flex-[1.3] rounded-full bg-gradient-to-r from-[#5B21A8] to-[#7C3AED] text-[14px] font-extrabold text-white">Continue</button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** The Submit step's customer preview: the real storefront, in a frame. */
export function SubmitPreview({ model, onOpenFull, onEditSection = null }) {
  return (
    <section className="mb-4" data-submit-preview>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-[#7C3AED]">Customer preview</p>
          <p className="text-[15px] font-extrabold text-[#1B1433]">This is your storefront</p>
        </div>
        <button type="button" onClick={onOpenFull} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#1B1433] px-3.5 text-[12px] font-extrabold text-white"><Eye size={14} />Full screen</button>
      </div>
      {/* A phone, not a card: a gradient bezel and a fixed height with the
          storefront scrolling inside it, so the partner reads it the way a
          customer will, top to bottom. */}
      <div className="rounded-[34px] bg-gradient-to-br from-[#5B21A8] via-[#8B5CF6] to-[#C4A7FF] p-[3px] shadow-[0_24px_50px_-28px_rgba(91,33,168,.8)]">
        <div className="relative h-[520px] overflow-hidden rounded-[31px] bg-[#FBF9FF]">
          <div className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-[#1B1433]/15" />
          <div className="h-full overflow-y-auto overscroll-contain pt-3">
            <Storefront model={model} rateNote onEditSection={onEditSection} avatarSlot={<StoreAvatar src={model.avatarUrl} name={model.name} />} />
          </div>
        </div>
      </div>
    </section>
  )
}
