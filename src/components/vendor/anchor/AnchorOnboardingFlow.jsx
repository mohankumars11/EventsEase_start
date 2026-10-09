/**
 * Anchor & MC listing, as seven steps with the whole journey on screen.
 *
 * Opened by AddItemFlow in place of the generic questionnaire whenever a
 * trade has a pricing profile. The partner sees every step at the top; a
 * finished step turns green; Submit is the last step's button.
 *
 * Saving happens once, at Submit:
 *   1. the vendor_services row (create, or update when editing)
 *   2. stage photos to partner_work
 *   3. generate_sambramo_tier_packages, which writes the three packages
 *      UNDER_REVIEW through the same saver the Pricing Studio uses
 * Until then, answers live in a local draft so closing the app loses nothing.
 */
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, ArrowRight, Loader2, X, Sparkles } from 'lucide-react'
import StepRail from './StepRail'
import { STEPS, ADDONS } from './options'
import {
  IdentityStep, identityDone, SkillsStep, skillsDone, PricingStep, pricingDone, AddonsStep, addonsDone,
} from './StepsProfile'
import { PackagesStep, finalPackages, RulesStep, rulesDone, PublishStep, publishDone } from './StepsCommercial'
import { tierPreview, rupees } from '../../../lib/tierPackages'
import { supabase } from '../../../lib/supabase'
import { addWork } from '../../../lib/partnerWork'
import { completeTrade } from '../../../lib/tradeQueue'
import { useToast, friendlyError } from '../../../context/ToastContext'
import { usePartnerDraft } from '../../../hooks/usePartnerDraft'

const EMPTY = {
  identity: {}, skills: {}, pricing: { vip_multiplier: 4 }, addons: { on: {} },
  overrides: {}, rules: { custom_quotes: true }, publish: { instant: true },
}

export default function AnchorOnboardingFlow({
  trade, vendorId, editing = null, onAdd, onUpdate, onClose, offeringName = 'Emcee / anchor',
  initialStep = null, initialAnswers = null, embedded = false,
}) {
  const toast = useToast()
  const draftKey = editing?.id ?? `${vendorId ?? 'new'}:${trade}`
  const { saveDraft, loadDraft, clearDraft } = usePartnerDraft(draftKey)

  const [a, setA] = useState(() => initialAnswers
    ?? (editing?.specs?.anchor_profile ? { ...EMPTY, ...editing.specs.anchor_profile } : null)
    ?? loadDraft()?.answers
    ?? EMPTY)
  const [step, setStep] = useState(() => initialStep ?? loadDraft()?.step ?? 'identity')
  const [dir, setDir] = useState(1)
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)
  /* Packages has nothing to fill in, so it counts as done once the partner
     has actually looked at it, not the moment Pricing is complete. */
  const [seen, setSeen] = useState(() => new Set(editing ? STEPS.map(x => x.id) : STEPS.slice(0, STEPS.findIndex(x => x.id === step) + 1).map(x => x.id)))
  useEffect(() => { setSeen(s => s.has(step) ? s : new Set([...s, step])) }, [step])

  useEffect(() => { if (!embedded) saveDraft({ answers: a, step }) }, [a, step]) // eslint-disable-line react-hooks/exhaustive-deps

  const put = key => val => setA(prev => ({ ...prev, [key]: val }))

  const generated = useMemo(() => tierPreview(a.pricing), [a.pricing])
  const offered = a.addons?.on ?? {}

  const done = useMemo(() => {
    const s = new Set()
    if (identityDone(a.identity)) s.add('identity')
    if (skillsDone(a.skills)) s.add('skills')
    if (pricingDone(a.pricing)) s.add('pricing')
    if (addonsDone(a.addons)) s.add('addons')
    if (pricingDone(a.pricing) && addonsDone(a.addons) && generated.length === 3 && seen.has('packages')) s.add('packages')
    if (rulesDone(a.rules)) s.add('rules')
    if (publishDone(a.publish)) s.add('publish')
    return s
  }, [a, generated, seen])

  const idx = STEPS.findIndex(s => s.id === step)
  const isLast = idx === STEPS.length - 1
  const here = STEPS[idx]
  const canNext = done.has(step)
  const allDone = STEPS.every(s => done.has(s.id))

  function go(to) {
    const j = STEPS.findIndex(s => s.id === to)
    setDir(j > idx ? 1 : -1); setTried(false); setStep(to)
    document.getElementById('anchor-scroll')?.scrollTo({ top: 0 })
  }

  function next() {
    if (!canNext) { setTried(true); return }
    if (isLast) return submit()
    go(STEPS[idx + 1].id)
  }

  function back() { idx === 0 ? onClose?.() : go(STEPS[idx - 1].id) }

  async function submit() {
    if (!allDone) { setTried(true); go(STEPS.find(s => !done.has(s.id)).id); return }
    setBusy(true)
    try {
      const { work = [], ...identity } = a.identity
      const profile = { ...a, identity }
      const pkgs = finalPackages(generated, a.overrides, offered)
      const essential = pkgs[0]

      /* The flat keys dispatch already matches on, beside the full profile. */
      const specs = {
        ...(editing?.specs ?? {}),
        anchor_profile: profile,
        baseline_inputs: a.pricing,
        languages: (a.skills.languages ?? []).map(l => l.name.toLowerCase()),
        language_levels: a.skills.languages ?? [],
        events: a.skills.events ?? [],
        events_other: Object.values(a.skills.events_other ?? {}).flat(),
        style: a.skills.styles ?? [],
        years_experience: a.skills.years,
        overtime_rate: Number(a.addons.overtime) || null,
      }
      const row = {
        price: Math.round(essential.price_paise / 100),
        unit: 'per event',
        min_quantity: 1,
        description: identity.bio || null,
        specs,
      }

      let serviceId = editing?.id
      if (editing) await onUpdate(editing.id, row)
      else {
        const created = await onAdd({ ...row, name: offeringName, category: trade, lead_time_days: null })
        serviceId = created?.id
      }
      if (!serviceId) throw new Error('The listing did not save. Try again.')

      if (vendorId && work.length) {
        const { error } = await addWork(vendorId, work)
        if (error) toast.error('Your listing saved, but the photos did not. Add them again from Your work.')
      }

      const overrides = Object.fromEntries(pkgs.map(p => [p.tier, {
        ...(p.edited ? { price_paise: p.price_paise, duration_hours: p.duration_hours } : {}),
        inclusions: p.inclusions,
      }]))
      const addons = Object.entries(offered).map(([id, fee], i) => ({
        name: ADDONS.find(x => x.id === id)?.label ?? id, unit: 'per_event',
        rate_paise: (Number(fee) || 0) * 100, sort_order: i, active: true,
      }))
      const { error: rpcErr } = await supabase.rpc('generate_sambramo_tier_packages', {
        p_vendor_service_id: serviceId,
        p_baseline_inputs: {
          take_home_per_hour: Number(a.pricing.take_home_per_hour),
          min_duration_hours: Number(a.pricing.min_duration_hours),
          max_duration_hours: Number(a.pricing.max_duration_hours),
          vip_multiplier: Number(a.pricing.vip_multiplier),
          overtime_rate_per_hour: Number(a.addons.overtime) || 0,
        },
        p_trade_id: trade,
        p_overrides: overrides,
        p_addons: addons,
      })
      if (rpcErr) {
        toast.error('Your listing saved, but the packages did not. Open Pricing to finish them. ' + friendlyError(rpcErr))
      } else {
        toast.success('Submitted. Our team checks your packages and turns them on.')
      }

      clearDraft()
      const nextTrade = completeTrade(trade)
      onClose?.(nextTrade || undefined)
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  const summary = (
    <div className="mt-4 rounded-[22px] bg-gradient-to-br from-plum-700 to-plum-950 p-4 text-white">
      <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-plum-200"><Sparkles size={14} /> Ready to submit</p>
      <p className="mt-2 text-[18px] font-extrabold">{a.identity.stage_name || 'Your profile'}</p>
      <p className="text-[12.5px] text-plum-100">
        {(a.skills.languages ?? []).map(l => l.name).join(' · ') || 'No languages yet'}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {finalPackages(generated, a.overrides, offered).map(p => (
          <div key={p.tier} className="rounded-xl bg-white/10 p-2 text-center">
            <p className="text-[10px] font-extrabold uppercase text-plum-200">{p.name}</p>
            <p className="text-[13.5px] font-extrabold">{rupees(p.price_paise)}</p>
          </div>
        ))}
      </div>
    </div>
  )

  const missing = tried && !canNext ? MISSING[step] : null

  const body = (
    <div data-anchor-flow className={`${embedded ? 'relative' : 'fixed inset-0 z-[96]'} flex flex-col bg-[#fbfaff]`}>
      <header className="shrink-0 bg-white/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] backdrop-blur-xl ring-1 ring-ink/[0.05]">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button type="button" onClick={back} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full text-ink/70 hover:bg-ink/[0.05]"><ArrowLeft size={20} /></button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-plum-600">{trade}</p>
            <p className="text-[14px] font-extrabold text-ink">Step {idx + 1} of {STEPS.length} · {here.label}</p>
          </div>
          <button type="button" onClick={() => onClose?.()} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full text-ink/60 hover:bg-ink/[0.05]"><X size={19} /></button>
        </div>
        <div className="mx-auto mt-3 max-w-lg"><StepRail steps={STEPS} current={step} done={done} onJump={go} /></div>
      </header>

      <div id="anchor-scroll" className={embedded ? 'overflow-x-hidden' : 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden'}>
        <div className="mx-auto max-w-lg px-4 pb-8 pt-5">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div key={step} custom={dir}
              initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
              {step === 'identity' && <IdentityStep value={a.identity} set={put('identity')} vendorId={vendorId} />}
              {step === 'skills' && <SkillsStep value={a.skills} set={put('skills')} />}
              {step === 'pricing' && <PricingStep value={a.pricing} set={put('pricing')} />}
              {step === 'addons' && <AddonsStep value={a.addons} set={put('addons')} />}
              {step === 'packages' && (generated.length === 3
                ? <PackagesStep generated={generated} overrides={a.overrides} setOverrides={put('overrides')} offered={offered}
                    maxHours={Number(a.pricing.max_duration_hours)} onRegenerate={() => put('overrides')({})} />
                : <p className="rounded-2xl bg-amber-50 p-4 text-[13px] font-bold text-amber-900">Finish the Pricing step first. Your packages are built from it.</p>)}
              {step === 'rules' && <RulesStep value={a.rules} set={put('rules')} />}
              {step === 'publish' && <PublishStep value={a.publish} set={put('publish')} summary={summary} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <footer className="shrink-0 bg-white/95 px-4 pt-3 backdrop-blur-xl ring-1 ring-ink/[0.05] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto max-w-lg">
          <AnimatePresence>
            {missing && (
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-2 text-center text-[12.5px] font-bold text-rose-600">{missing}</motion.p>
            )}
          </AnimatePresence>
          <motion.button type="button" onClick={next} disabled={busy} whileTap={{ scale: 0.98 }}
            className={`flex h-[54px] w-full items-center justify-center gap-2 rounded-full text-[15.5px] font-extrabold text-white transition-all ${
              canNext ? (isLast ? 'bg-gradient-to-r from-forest-600 to-emerald-500 shadow-[0_10px_24px_-10px_rgba(18,105,76,0.8)]' : 'bg-gradient-to-r from-plum-700 to-fuchsia-600 shadow-[0_10px_24px_-10px_rgba(91,33,182,0.8)]') : 'bg-ink/20'
            }`}>
            {busy && <Loader2 size={17} className="animate-spin" />}
            {isLast ? 'Submit for review' : <>Next: {STEPS[idx + 1].label} <ArrowRight size={17} /></>}
          </motion.button>
        </div>
      </footer>
    </div>
  )

  return embedded ? body : createPortal(body, document.body)
}

const MISSING = {
  identity: 'Add your stage name, a bio of 40+ characters and your city.',
  skills: 'Pick your years, at least one event, one language and one style.',
  pricing: 'Enter your take-home and both durations. Longest must be 2× the minimum.',
  addons: 'Set your overtime rate, and a fee for every add-on you switched on.',
  packages: 'Finish the Pricing step first.',
  rules: 'Set a minimum budget and a reply time, or switch custom quotes off.',
  publish: 'Choose advance and cancellation, and confirm both rider items.',
}

