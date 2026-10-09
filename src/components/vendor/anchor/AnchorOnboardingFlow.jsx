/**
 * Anchor & MC listing: eleven stages, the whole journey on screen.
 *
 * Opened by AddItemFlow in place of the generic questionnaire for trades
 * with a pricing profile. The rail shows every stage; finished ones turn
 * green; Submit is the last stage's button.
 *
 * Submit, in order:
 *   1. the vendor_services row (create, or update when editing) — matching keys
 *   2. stage photos to partner_work
 *   3. submit_anchor_listing_version (migration 20261010_03): one listing
 *      version with rate rules, add-on rules and the three packages, all
 *      UNDER_REVIEW, every customer price computed on the server
 * If step 3 fails the partner stays here with the reason. Until then the
 * answers live in a local draft, so closing the app loses nothing.
 */
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, ArrowRight, Loader2, LogOut } from 'lucide-react'
import StepRail from './StepRail'
import { STAGES, ADDONS_V3 } from './options'
import AboutStage, { aboutDone } from './stages/AboutStage'
import LocationStage, { locationDone } from './stages/LocationStage'
import EventsStage, { eventsDone } from './stages/EventsStage'
import LanguagesStage, { languagesDone } from './stages/LanguagesStage'
import PricingModelsStage, { pricingModelsDone } from './stages/PricingModelsStage'
import ExtrasStage, { extrasDone } from './stages/ExtrasStage'
import AvailabilityStage, { availabilityDone } from './stages/AvailabilityStage'
import RulesStage, { rulesStageDone } from './stages/RulesStage'
import { PayoutStage, ReviewStage, usePayoutStatus } from './stages/PayoutReviewStages'
import { PackagesStep, finalPackages } from './StepsCommercial'
import { tiersFromModels, DEFAULT_CONFIG } from '../../../lib/tierPackages'
import { supabase } from '../../../lib/supabase'
import { addWork } from '../../../lib/partnerWork'
import { completeTrade } from '../../../lib/tradeQueue'
import { captureLocation, reverseAddress, openDeviceSettings } from '../../../lib/partnerLocation'
import { useToast, friendlyError } from '../../../context/ToastContext'
import { usePartnerDraft } from '../../../hooks/usePartnerDraft'

const EMPTY = {
  about: {}, location: {}, events: {}, languages: {},
  pricing: { models: [] }, extras: { on: {} }, overrides: {},
  availability: {}, rules: { instant: true, custom_quotes: true },
}

const MISSING = {
  about: 'Add your name, role, years, a bio of 40+ characters, your legal name and a performance video.',
  location: 'Confirm your location on the map and choose how far you travel.',
  events: 'Pick at least one event, your audience size and where you host.',
  languages: 'Add at least one language and one style.',
  pricing: 'Pick how you charge and fill every amount and limit.',
  extras: 'Set a price for each add-on you switched on, and your overtime rate.',
  packages: 'Finish How you charge first. Your packages are built from it.',
  availability: 'Set notice, booking window, hours, rest and how travel is charged.',
  rules: 'Choose advance, cancellation and response time, and confirm both rider items.',
  payout: '',
  review: 'Some earlier steps are not finished yet.',
}

const paise = rupees => Math.round((Number(rupees) || 0) * 100)

export default function AnchorOnboardingFlow({
  trade, vendorId, editing = null, onAdd, onUpdate, onClose, offeringName = 'Emcee / anchor',
  initialStep = null, initialAnswers = null, embedded = false,
}) {
  const toast = useToast()
  const draftKey = editing?.id ?? `${vendorId ?? 'new'}:${trade}`
  const { saveDraft, loadDraft, clearDraft } = usePartnerDraft(draftKey)

  const [a, setA] = useState(() => ({ ...EMPTY, ...(initialAnswers
    ?? editing?.specs?.anchor_v3
    ?? loadDraft()?.answers
    ?? {}) }))
  const [step, setStep] = useState(() => initialStep ?? loadDraft()?.step ?? 'about')
  const [dir, setDir] = useState(1)
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [cfg, setCfg] = useState(DEFAULT_CONFIG)
  const [seen, setSeen] = useState(() => new Set(editing
    ? STAGES.map(x => x.id)
    : STAGES.slice(0, STAGES.findIndex(x => x.id === (initialStep ?? 'about')) + 1).map(x => x.id)))
  const payout = usePayoutStatus(embedded ? null : vendorId)

  useEffect(() => { setSeen(s => s.has(step) ? s : new Set([...s, step])) }, [step])
  useEffect(() => { if (!embedded) saveDraft({ answers: a, step }) }, [a, step]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (embedded) return
    supabase.from('sambramo_pricing_config').select('platform_fee_rate, signature_uplift, vip_factor').maybeSingle()
      .then(({ data }) => {
        if (data) setCfg({ platform_fee_rate: Number(data.platform_fee_rate), signature_uplift: Number(data.signature_uplift), vip_factor: Number(data.vip_factor) })
      })
  }, [embedded])

  const put = key => val => setA(prev => ({ ...prev, [key]: val }))
  const hasHourlyOvertime = (a.pricing.models ?? []).includes('hour') && Number(a.pricing.hour?.overtime) > 0
  const generated = useMemo(() => tiersFromModels(a.pricing, cfg), [a.pricing, cfg])
  const offered = a.extras?.on ?? {}

  const done = useMemo(() => {
    const s = new Set()
    if (aboutDone(a.about)) s.add('about')
    if (locationDone(a.location)) s.add('location')
    if (eventsDone(a.events)) s.add('events')
    if (languagesDone(a.languages)) s.add('languages')
    if (pricingModelsDone(a.pricing)) s.add('pricing')
    if (extrasDone(a.extras, hasHourlyOvertime)) s.add('extras')
    if (s.has('pricing') && generated.length === 3 && seen.has('packages')) s.add('packages')
    if (availabilityDone(a.availability)) s.add('availability')
    if (rulesStageDone(a.rules)) s.add('rules')
    if (seen.has('payout')) s.add('payout')
    if (STAGES.slice(0, -1).every(x => s.has(x.id))) s.add('review')
    return s
  }, [a, generated, seen, hasHourlyOvertime])

  const idx = STAGES.findIndex(s => s.id === step)
  const isLast = idx === STAGES.length - 1
  const here = STAGES[idx]
  const canNext = done.has(step)

  function go(to) {
    const j = STAGES.findIndex(s => s.id === to)
    setDir(j > idx ? 1 : -1); setTried(false); setSubmitError(''); setStep(to)
    document.getElementById('anchor-scroll')?.scrollTo({ top: 0 })
  }
  function next() {
    if (!canNext) { setTried(true); return }
    if (isLast) return submit()
    go(STAGES[idx + 1].id)
  }
  function back() { idx === 0 ? onClose?.() : go(STAGES[idx - 1].id) }

  async function locate() {
    const r = await captureLocation()
    if (!r?.ok) return { denied: r?.reason === 'denied' ? 'denied' : 'off' }
    const addr = await reverseAddress(r.fix.lat, r.fix.lng)
    return { lat: r.fix.lat, lng: r.fix.lng, ...(addr ? addrFields(addr) : {}) }
  }
  async function reverse(lat, lng) {
    const addr = await reverseAddress(lat, lng)
    return addr ? addrFields(addr) : null
  }

  function buildPayload() {
    const p = a.pricing, ex = a.extras, av = a.availability, r = a.rules, loc = a.location
    const overtime = p.hour?.overtime ? paise(p.hour.overtime) : (ex.overtime ? paise(ex.overtime) : null)
    const models = {}
    for (const id of p.models ?? []) {
      const m = p[id] ?? {}
      const base = { take_home_paise: paise(m.rate), extra_hour_take_home_paise: overtime }
      if (id === 'hour') Object.assign(base, { min_hours: m.min_hours, max_hours: m.max_hours, hours: m.min_hours,
        overtime_step_minutes: m.ot_step ?? 60, overtime_grace_minutes: m.grace ?? 0 })
      if (id === 'session') Object.assign(base, { hours: m.hours, sessions: 1, extra_session_take_home_paise: paise(m.extra) || null })
      if (id === 'event') Object.assign(base, { hours: m.hours, sessions: m.functions, extra_session_take_home_paise: paise(m.extra) || null, meta: { rehearsal_included: !!m.rehearsal } })
      if (id === 'half_day') Object.assign(base, { hours: m.hours ?? 4, sessions: m.functions ?? null })
      if (id === 'full_day') Object.assign(base, { hours: m.hours ?? 8, meta: { breaks_included: m.breaks !== false } })
      if (id === 'multi_day') Object.assign(base, { hours: m.hours, multi_day: { max_days: m.max_days, consecutive_discount_pct: m.discount ?? 0, overnight: !!m.overnight } })
      models[id] = base
    }
    const pkgs = finalPackages(generated, a.overrides, offered)
    const addons = Object.entries(offered).map(([id, x]) => ({
      addon_id: id, label: ADDONS_V3.find(d => d.id === id)?.label ?? id, unit: x.unit ?? 'per_event',
      take_home_paise: paise(x.fee), notice_days: x.notice ?? 0,
      included_in: pkgs.filter(k => k.inclusions.includes(id)).map(k => k.tier),
    }))
    const overrides = Object.fromEntries(pkgs.map(k => [k.tier, {
      ...(k.edited ? { take_home_paise: Math.round(k.price_paise * (1 - cfg.platform_fee_rate)), hours: k.duration_hours } : {}),
      inclusions: k.inclusions,
    }]))
    const { work, legal_name, ...about } = a.about // eslint-disable-line no-unused-vars
    return {
      legal_name,
      profile: { ...about, ...a.events, audience_band: a.events.audience, ...a.languages },
      models, addons, overrides,
      booking_rules: {
        instant: r.instant !== false, advance_pct: r.advance_pct, cancellation: r.cancellation,
        custom_quotes: r.custom_quotes !== false, quote_hours: r.quote_hours, min_budget_paise: paise(r.min_budget) || null,
        rider: r.rider, min_notice_days: av.min_notice_days, horizon_months: av.horizon_months,
        max_consecutive_hours: av.max_consecutive_hours, rest_hours: av.rest_hours, multiple_per_day: !!av.multiple_per_day,
        waiting: ex.waiting ? { free_minutes: ex.waiting.free_minutes, fee_take_home_paise: paise(ex.waiting.fee) } : null,
        surcharge: ex.surcharge ?? null,
      },
      travel_rules: {
        scope: loc.travel_scope, model: av.travel_model, flat_take_home_paise: paise(av.travel_fee) || null,
        per_km_take_home_paise: paise(av.travel_per_km) || null, hotel_required: !!av.hotel_required,
      },
      location: {
        lat: loc.lat, lng: loc.lng, formatted_address: loc.formatted_address, state: loc.state, city: loc.city,
        locality: loc.locality, postal_code: loc.postal_code, source: loc.source, confirmed: !!loc.confirmed, travel_scope: loc.travel_scope,
      },
    }
  }

  async function submit() {
    const missingStage = STAGES.slice(0, -1).find(s => !done.has(s.id))
    if (missingStage) { setTried(true); go(missingStage.id); return }
    setBusy(true); setSubmitError('')
    try {
      const payload = buildPayload()
      const essential = generated[0]
      const specs = {
        ...(editing?.specs ?? {}),
        anchor_v3: { ...a, about: { ...a.about, work: undefined, legal_name: undefined } },
        // The flat keys dispatch already matches on.
        languages: (a.languages.languages ?? []).map(l => l.name.toLowerCase()),
        language_levels: a.languages.languages ?? [],
        events: a.events.events ?? [],
        events_other: Object.values(a.events.events_other ?? {}).flat(),
        style: a.languages.styles ?? [],
        years_experience: a.about.years,
        max_audience: Number(a.events.max_audience) || null,
      }
      const row = { price: Math.round(essential.price_paise / 100), unit: 'per event', min_quantity: 1, description: a.about.bio || null, specs }

      let serviceId = editing?.id
      if (editing) await onUpdate(editing.id, row)
      else {
        const created = await onAdd({ ...row, name: offeringName, category: trade, lead_time_days: a.availability.min_notice_days ?? null })
        serviceId = created?.id
      }
      if (!serviceId) throw new Error('The listing did not save. Try again.')

      const work = a.about.work ?? []
      if (vendorId && work.length) {
        const { error } = await addWork(vendorId, work)
        if (error) toast.error('Your listing saved, but the photos did not. Add them again from Your work.')
      }

      const { data, error } = await supabase.rpc('submit_anchor_listing_version', {
        p_vendor_service_id: serviceId, p_payload: payload,
      })
      if (error) { setSubmitError(friendlyError(error)); return }

      toast.success('Your profile has been submitted for review.')
      clearDraft()
      const nextTrade = completeTrade(trade)
      onClose?.(nextTrade || undefined, data)
    } catch (e) {
      setSubmitError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  const readiness = useMemo(() => ({
    state: 'PRICING_UNDER_REVIEW',
    items: [
      { id: 'profile', label: 'Profile & identity', status: done.has('about') && payout.verified ? 'pass' : done.has('about') ? 'pending' : 'fail',
        next: done.has('about') ? 'Identity verification is still pending.' : 'Finish About you.' },
      { id: 'capability', label: 'Services, languages & capacity', status: done.has('events') && done.has('languages') ? 'pass' : 'fail', next: 'Finish Events and Languages.' },
      { id: 'location', label: 'Location confirmed', status: done.has('location') ? 'pass' : 'fail', next: 'Confirm your base on the map.' },
      { id: 'pricing', label: 'Pricing approved', status: 'pending', next: 'Submit to send your packages for review.' },
      { id: 'availability', label: 'Calendar & booking windows', status: done.has('availability') ? 'pass' : 'fail', next: 'Set your limits and open your calendar.' },
      { id: 'rules', label: 'Booking & cancellation rules', status: done.has('rules') ? 'pass' : 'fail', next: 'Finish Booking & cancellation.' },
      { id: 'payout', label: 'Razorpay payout account', status: payout.route ? 'pass' : 'fail', next: 'Complete payout setup to be booked instantly.' },
    ],
  }), [done, payout])

  const missing = tried && !canNext ? MISSING[step] : null

  const body = (
    <div data-anchor-flow className={`${embedded ? 'relative' : 'fixed inset-0 z-[96]'} flex flex-col bg-[#fbfaff]`}>
      <header className="shrink-0 bg-white/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] backdrop-blur-xl ring-1 ring-ink/[0.05]">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button type="button" onClick={back} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full text-ink/70 hover:bg-ink/[0.05]"><ArrowLeft size={20} /></button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-plum-600">{trade}</p>
            <p className="text-[14px] font-extrabold text-ink">Step {idx + 1} of {STAGES.length} · {here.label}</p>
          </div>
          <button type="button" onClick={() => { saveDraft({ answers: a, step }); onClose?.() }}
            className="flex h-9 items-center gap-1 rounded-full bg-plum-50 px-3 text-[11.5px] font-extrabold text-plum-700"><LogOut size={13} />Save & exit</button>
        </div>
        <div className="mx-auto mt-3 max-w-lg"><StepRail steps={STAGES} current={step} done={done} onJump={go} /></div>
      </header>

      <div id="anchor-scroll" className={embedded ? 'overflow-x-hidden' : 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden'}>
        <div className="mx-auto max-w-lg px-4 pb-8 pt-5">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div key={step} custom={dir}
              initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
              {step === 'about' && <AboutStage value={a.about} set={put('about')} vendorId={vendorId} />}
              {step === 'location' && <LocationStage value={a.location} set={put('location')} onLocate={locate} onReverse={reverse} onSettings={openDeviceSettings} />}
              {step === 'events' && <EventsStage value={a.events} set={put('events')} />}
              {step === 'languages' && <LanguagesStage value={a.languages} set={put('languages')} />}
              {step === 'pricing' && <PricingModelsStage value={a.pricing} set={put('pricing')} />}
              {step === 'extras' && <ExtrasStage value={a.extras} set={put('extras')} hasHourlyOvertime={hasHourlyOvertime} />}
              {step === 'packages' && (generated.length === 3
                ? <PackagesStep generated={generated} overrides={a.overrides} setOverrides={put('overrides')} offered={offered}
                    maxHours={Math.max(...generated.map(g => g.duration_hours))} onRegenerate={() => put('overrides')({})} />
                : <p className="rounded-2xl bg-amber-50 p-4 text-[13px] font-bold text-amber-900">Finish How you charge first. Your packages are built from it.</p>)}
              {step === 'availability' && <AvailabilityStage value={a.availability} set={put('availability')} />}
              {step === 'rules' && <RulesStage value={a.rules} set={put('rules')} />}
              {step === 'payout' && <PayoutStage status={payout} />}
              {step === 'review' && (
                <ReviewStage items={readiness.items} state={readiness.state} quotesOk={false}
                  tiers={finalPackages(generated, a.overrides, offered)} name={a.about.stage_name}
                  langs={(a.languages.languages ?? []).map(l => l.name).join(' · ')} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <footer className="shrink-0 bg-white/95 px-4 pt-3 backdrop-blur-xl ring-1 ring-ink/[0.05] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto max-w-lg">
          <AnimatePresence>
            {(missing || submitError) && (
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-2 text-center text-[12.5px] font-bold text-rose-600">{submitError || missing}</motion.p>
            )}
          </AnimatePresence>
          <motion.button type="button" onClick={next} disabled={busy} whileTap={{ scale: 0.98 }}
            className={`flex h-[54px] w-full items-center justify-center gap-2 rounded-full text-[15.5px] font-extrabold text-white transition-all ${
              canNext ? (isLast ? 'bg-gradient-to-r from-forest-600 to-emerald-500 shadow-[0_10px_24px_-10px_rgba(18,105,76,0.8)]' : 'bg-gradient-to-r from-plum-700 to-fuchsia-600 shadow-[0_10px_24px_-10px_rgba(91,33,182,0.8)]') : 'bg-ink/20'
            }`}>
            {busy && <Loader2 size={17} className="animate-spin" />}
            {isLast ? 'Submit for review' : <>Next: {STAGES[idx + 1].label} <ArrowRight size={17} /></>}
          </motion.button>
        </div>
      </footer>
    </div>
  )

  return embedded ? body : createPortal(body, document.body)
}

function addrFields(addr) {
  return { formatted_address: addr.line, locality: addr.locality, city: addr.city, state: addr.state, postal_code: addr.postcode }
}
