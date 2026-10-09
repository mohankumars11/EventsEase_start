/**
 * One listing for any of the 33 trades on the shared engine.
 *
 * The stage list comes from the trade's config (src/data/trades/<id>.js):
 * shared stages (about, location, pricing, extras, capacity, availability,
 * licences, booking rules, payout, review) around the trade's OWN screens and
 * catalogue. Anchor & MC keeps AnchorOnboardingFlow; everything else is here.
 *
 * Submit, in order — the same contract as the Anchor flow:
 *   1. the vendor_services row (create, or update when editing)
 *   2. work photos to partner_work
 *   3. submit_listing_version (migration 20261010_08): version + rules +
 *      catalogue + add-ons + packages + resources, UNDER_REVIEW, every
 *      customer price computed on the server with this trade's fee
 * Answers live in a local draft per trade until submit, so one trade can be
 * half-done while another is live.
 */
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, ArrowRight, Loader2, LogOut, Shuffle } from 'lucide-react'
import StepRail from '../anchor/StepRail'
import LocationStage, { locationDone } from '../anchor/stages/LocationStage'
import { PayoutStage, usePayoutStatus } from '../anchor/stages/PayoutReviewStages'
import { Card, SectionTitle } from '../anchor/ui'
import QuestionRenderer, { questionsDone } from './QuestionRenderer'
import CatalogueEditor, { catalogueDone } from './CatalogueEditor'
import PricingRulesEditor from './PricingRulesEditor'
import ComplianceStage from './ComplianceStage'
import {
  BasicsStage, basicsDone, ExtrasStage, extrasDone, PackagesStage, packagesDone,
  ResourcesStage, resourcesDone, AvailabilityStage, availabilityDone, BookingStage, bookingDone, Tick,
} from './stages'
import { stagesFor, buildTradePayload, pricingDone, suggestPackages, itemName, itemPricePaise } from './payload'
import { configFor, redirectFor, CONFIG_BY_ID } from '../../../data/trades'
import { supabase } from '../../../lib/supabase'
import { addWork } from '../../../lib/partnerWork'
import { completeTrade } from '../../../lib/tradeQueue'
import { captureLocation, reverseAddress, openDeviceSettings } from '../../../lib/partnerLocation'
import { useToast, friendlyError } from '../../../context/ToastContext'
import { usePartnerDraft } from '../../../hooks/usePartnerDraft'

const EMPTY = { basics: {}, location: {}, answers: {}, catalogue: [], rules: {}, packages: [], addons: {}, availability: {}, booking: { instant: true, custom_quotes: true } }
const DEFAULT_POLICY = { platform_fee_rate: 0.08, signature_uplift: 1.75, vip_factor: 2 }
const inr = p => `₹${Math.round((Number(p) || 0) / 100).toLocaleString('en-IN')}`

/** The trade's fee and tier factors: its own policy row, else the global config. */
function useTradePolicy(tradeId) {
  const [policy, setPolicy] = useState(DEFAULT_POLICY)
  useEffect(() => {
    let live = true
    ;(async () => {
      const { data: g } = await supabase.from('sambramo_pricing_config').select('platform_fee_rate, signature_uplift, vip_factor').maybeSingle()
      const { data: t } = await supabase.from('sambramo_trade_pricing_policy').select('platform_fee_rate, signature_uplift, vip_factor').eq('trade_id', tradeId).maybeSingle()
      if (!live) return
      const pick = k => Number(t?.[k] ?? g?.[k] ?? DEFAULT_POLICY[k])
      setPolicy({ platform_fee_rate: pick('platform_fee_rate'), signature_uplift: pick('signature_uplift'), vip_factor: pick('vip_factor') })
    })()
    return () => { live = false }
  }, [tradeId])
  return policy
}

/** Shared business details, so a partner's second service starts filled in. */
function useAccountPrefill(vendorId) {
  const [v, setV] = useState(null)
  useEffect(() => {
    if (!vendorId) return
    supabase.from('vendors').select('*').eq('id', vendorId).maybeSingle().then(({ data }) => setV(data ?? null))
  }, [vendorId])
  return v
}

export default function ListingOnboardingFlow({
  trade, vendorId, editing = null, onAdd, onUpdate, onClose, onSwitchTrade, offeringName,
  initialStep = null, initialAnswers = null, embedded = false,
}) {
  const config = configFor(trade)
  const toast = useToast()
  const draftKey = editing?.id ?? `${vendorId ?? 'new'}:${config.id}`
  const { saveDraft, loadDraft, clearDraft } = usePartnerDraft(draftKey)
  const STAGES = useMemo(() => stagesFor(config), [config])
  const policy = useTradePolicy(config.id)
  const fee = policy.platform_fee_rate
  const account = useAccountPrefill(embedded ? null : vendorId)

  const [a, setA] = useState(() => ({ ...EMPTY, ...(initialAnswers ?? editing?.specs?.trade_v1 ?? loadDraft()?.answers ?? {}) }))
  const [step, setStep] = useState(() => initialStep ?? loadDraft()?.step ?? STAGES[0].id)
  const [dir, setDir] = useState(1)
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [seen, setSeen] = useState(() => new Set([STAGES[0].id]))
  const payout = usePayoutStatus(embedded ? null : vendorId)

  useEffect(() => { setSeen(s => (s.has(step) ? s : new Set([...s, step]))) }, [step])
  useEffect(() => { if (!embedded) saveDraft({ answers: a, step }) }, [a, step]) // eslint-disable-line react-hooks/exhaustive-deps
  // Shared details fill only what the partner has not typed for this service.
  useEffect(() => {
    if (!account) return
    setA(prev => ({ ...prev, basics: {
      display_name: account.business_name ?? account.name ?? undefined,
      bio: account.bio ?? account.description ?? undefined,
      avatar_url: account.avatar_url ?? undefined,
      ...prev.basics,
    } }))
  }, [account])

  const put = key => val => setA(prev => ({ ...prev, [key]: val }))
  const suggested = useMemo(() => suggestPackages(config, a, policy), [config, a.rules, policy]) // eslint-disable-line react-hooks/exhaustive-deps
  const redirect = redirectFor(config, a.answers)
  const isTrip = config.archetype === 'TRIP_VEHICLE'

  const done = useMemo(() => {
    const s = new Set()
    if (basicsDone(a.basics)) s.add('basics')
    if (locationDone(a.location)) s.add('location')
    for (const sc of config.screens) if (questionsDone(sc.questions, a.answers) && !(redirect && sc.questions.some(q => q.id === 'service_type'))) s.add(`screen:${sc.id}`)
    if (config.catalogue && catalogueDone(config.catalogue, a.catalogue)) s.add('catalogue')
    if (pricingDone(config, a) && questionsDone(config.pricing.fields ?? [], a.answers)) s.add('pricing')
    if (packagesDone(a.packages?.length ? a.packages : suggested) && seen.has('packages')) s.add('packages')
    if (extrasDone(a.addons)) s.add('extras')
    if (resourcesDone(config, a)) s.add('resources')
    if (availabilityDone(a.availability, isTrip)) s.add('availability')
    if (seen.has('compliance')) s.add('compliance')
    if (bookingDone(a.booking)) s.add('booking')
    if (seen.has('payout')) s.add('payout')
    if (STAGES.slice(0, -1).every(x => s.has(x.id))) s.add('review')
    return s
  }, [a, config, seen, suggested, redirect, isTrip, STAGES])

  const idx = Math.max(0, STAGES.findIndex(s => s.id === step))
  const here = STAGES[idx]
  const isLast = idx === STAGES.length - 1
  const canNext = done.has(here.id)

  function go(to) {
    const j = STAGES.findIndex(s => s.id === to)
    setDir(j > idx ? 1 : -1); setTried(false); setSubmitError(''); setStep(to)
    document.getElementById('listing-scroll')?.scrollTo({ top: 0 })
  }
  function next() {
    if (!canNext) { setTried(true); return }
    if (here.id === 'pricing' && config.tiers && config.pricing.packages && !a.packages?.length) put('packages')(suggested)
    if (isLast) return submit()
    go(STAGES[idx + 1].id)
  }
  const back = () => (idx === 0 ? onClose?.() : go(STAGES[idx - 1].id))

  async function locate() {
    const r = await captureLocation()
    if (!r?.ok) return { denied: r?.reason === 'denied' ? 'denied' : 'off' }
    const addr = await reverseAddress(r.fix.lat, r.fix.lng)
    return { lat: r.fix.lat, lng: r.fix.lng, ...(addr ? addrFields(addr) : {}) }
  }
  async function reverse(lat, lng) { const addr = await reverseAddress(lat, lng); return addr ? addrFields(addr) : null }

  async function submit() {
    const missing = STAGES.slice(0, -1).find(s => !done.has(s.id))
    if (missing) { setTried(true); go(missing.id); return }
    setBusy(true); setSubmitError('')
    try {
      const payload = buildTradePayload(config, a)
      const prices = [
        ...payload.rules.map(r => r.take_home_paise ?? r.customer_paise ?? 0),
        ...payload.catalogue.map(c => c.take_home_paise ?? 0),
        ...payload.packages.map(p => p.take_home_paise),
      ].filter(x => x > 0)
      const { legal_name, ...publicBasics } = a.basics // eslint-disable-line no-unused-vars
      const specs = {
        ...(editing?.specs ?? {}),
        trade_v1: { ...a, basics: { ...publicBasics, work: undefined } },
        trade_id: config.id,
        events: a.answers.events ?? [],
      }
      const row = { price: prices.length ? Math.round(Math.min(...prices) / 100) : null, unit: 'per booking', min_quantity: 1,
        description: a.basics.bio || null, specs }

      let serviceId = editing?.id
      if (editing) await onUpdate(editing.id, row)
      else {
        const created = await onAdd({ ...row, name: offeringName ?? config.name, category: config.name,
          lead_time_days: a.availability.min_notice_days ?? null })
        serviceId = created?.id
      }
      if (!serviceId) throw new Error('The listing did not save. Try again.')

      const work = a.basics.work ?? []
      if (vendorId && work.length) {
        const { error } = await addWork(vendorId, work)
        if (error) toast.error('Your listing saved, but the photos did not. Add them again from Your work.')
      }

      const { data, error } = await supabase.rpc('submit_listing_version', { p_vendor_service_id: serviceId, p_payload: payload })
      if (error) { setSubmitError(friendlyError(error)); return }

      toast.success(`Your ${config.serviceNoun} has been submitted for review.`)
      clearDraft()
      const nextTrade = completeTrade(config.name)
      onClose?.(nextTrade || undefined, data)
    } catch (e) {
      setSubmitError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  const answersSet = val => put('answers')(val)
  const screen = here.id.startsWith('screen:') ? config.screens.find(s => `screen:${s.id}` === here.id) : null
  const missingText = tried && !canNext ? 'Some answers on this step are still needed — they are marked in red.' : null

  const body = (
    <div data-listing-flow={config.id} className={`${embedded ? 'relative' : 'fixed inset-0 z-[96]'} flex flex-col bg-[#fbfaff]`}>
      <header className="shrink-0 bg-white/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] backdrop-blur-xl ring-1 ring-ink/[0.05]">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button type="button" onClick={back} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full text-ink/70 hover:bg-ink/[0.05]"><ArrowLeft size={20} /></button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.14em] text-plum-600">{config.name}</p>
            <p className="truncate text-[14px] font-extrabold text-ink">Step {idx + 1} of {STAGES.length} · {here.label}</p>
          </div>
          <button type="button" onClick={() => { saveDraft({ answers: a, step }); onClose?.() }}
            className="flex h-9 items-center gap-1 rounded-full bg-plum-50 px-3 text-[11.5px] font-extrabold text-plum-700"><LogOut size={13} />Save & exit</button>
        </div>
        <div className="mx-auto mt-3 max-w-lg"><StepRail steps={STAGES} current={here.id} done={done} onJump={go} /></div>
      </header>

      <div id="listing-scroll" className={embedded ? 'overflow-x-hidden' : 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden'}>
        <div className="mx-auto max-w-lg px-4 pb-8 pt-5">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div key={here.id} custom={dir}
              initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
              {here.id === 'basics' && <BasicsStage value={a.basics} set={put('basics')} vendorId={vendorId} config={config} />}
              {here.id === 'location' && <LocationStage value={a.location} set={put('location')} onLocate={locate} onReverse={reverse} onSettings={openDeviceSettings} />}
              {screen && (
                <>
                  <SectionTitle title={screen.title} sub={screen.sub} />
                  <QuestionRenderer questions={screen.questions} answers={a.answers} set={answersSet} trade={config.name} tried={tried} />
                  {redirect && screen.questions.some(q => q.id === 'service_type') && (
                    <Card className="mt-3 bg-amber-50 ring-amber-200">
                      <p className="text-[13.5px] font-extrabold text-amber-900">This belongs under {CONFIG_BY_ID[redirect].name}.</p>
                      <p className="mt-1 text-[12.5px] text-amber-900/80">That trade asks the right questions for your vehicles, so customers can book them instantly.</p>
                      {onSwitchTrade && (
                        <button type="button" onClick={() => onSwitchTrade(CONFIG_BY_ID[redirect].name)}
                          className="mt-3 flex items-center gap-1.5 rounded-full bg-amber-900 px-4 py-2 text-[12.5px] font-extrabold text-white"><Shuffle size={14} /> List it there instead</button>
                      )}
                    </Card>
                  )}
                </>
              )}
              {here.id === 'catalogue' && <CatalogueEditor cat={config.catalogue} items={a.catalogue} set={put('catalogue')} trade={config.name} tried={tried} />}
              {here.id === 'pricing' && <PricingRulesEditor config={config} rules={a.rules} setRules={put('rules')} answers={a.answers} setAnswers={answersSet} fee={fee} tried={tried} trade={config.name} />}
              {here.id === 'packages' && <PackagesStage config={config} value={a.packages} set={put('packages')} suggested={suggested} offered={a.addons} fee={fee} onRegenerate={() => put('packages')(suggested)} />}
              {here.id === 'extras' && <ExtrasStage config={config} value={a.addons} set={put('addons')} fee={fee} tried={tried} />}
              {here.id === 'resources' && <ResourcesStage config={config} a={a} setAnswers={answersSet} tried={tried} />}
              {here.id === 'availability' && <AvailabilityStage value={a.availability} set={put('availability')} isTrip={isTrip} />}
              {here.id === 'compliance' && <ComplianceStage config={config} answers={a.answers} vendorId={vendorId} />}
              {here.id === 'booking' && <BookingStage value={a.booking} set={put('booking')} />}
              {here.id === 'payout' && <PayoutStage status={payout} />}
              {here.id === 'review' && <ReviewStage config={config} a={a} done={done} stages={STAGES} go={go} fee={fee} suggested={suggested} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <footer className="shrink-0 bg-white/95 px-4 pt-3 backdrop-blur-xl ring-1 ring-ink/[0.05] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto max-w-lg">
          <AnimatePresence>
            {(missingText || submitError) && (
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-2 text-center text-[12.5px] font-bold text-rose-600">{submitError || missingText}</motion.p>
            )}
          </AnimatePresence>
          <motion.button type="button" onClick={next} disabled={busy} whileTap={{ scale: 0.98 }}
            className={`flex h-[54px] w-full items-center justify-center gap-2 rounded-full text-[15.5px] font-extrabold text-white transition-all ${
              canNext ? (isLast ? 'bg-gradient-to-r from-forest-600 to-emerald-500' : 'bg-gradient-to-r from-plum-700 to-fuchsia-600') : 'bg-ink/20'}`}>
            {busy && <Loader2 size={17} className="animate-spin" />}
            {isLast ? 'Submit for review' : <>Next: {STAGES[idx + 1].short ?? STAGES[idx + 1].label} <ArrowRight size={17} /></>}
          </motion.button>
        </div>
      </footer>
    </div>
  )

  return embedded ? body : createPortal(body, document.body)
}

/* ── Review: every section with Edit, a customer preview, and what is left ── */
function ReviewStage({ config, a, done, stages, go, fee, suggested }) {
  const items = (a.catalogue ?? []).slice(0, 4)
  const pkgs = a.packages?.length ? a.packages : suggested
  const from = [
    ...Object.values(a.rules ?? {}).filter(r => r?.on && r.amount_paise > 0).map(r => (r.price_mode === 'customer' ? r.amount_paise : Math.round(r.amount_paise / (1 - fee) / 10) * 10)),
    ...items.map(it => Math.round(itemPricePaise(config.catalogue, it.answers) / (1 - fee) / 10) * 10).filter(x => x > 0),
    ...pkgs.map(p => Math.round(p.take_home_paise / (1 - fee) / 10) * 10),
  ].filter(x => x > 0)
  return (
    <>
      <SectionTitle title="Review & submit" sub="Your listing goes live once Sambramo approves it. Prices are protected for 15 days after that." />
      <div className="rounded-[22px] bg-gradient-to-br from-plum-700 to-plum-950 p-4 text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-plum-200">What customers see</p>
        <p className="mt-1.5 text-[19px] font-extrabold">{a.basics.display_name || 'Your service'}</p>
        {a.basics.tagline && <p className="text-[12.5px] text-plum-100">{a.basics.tagline}</p>}
        {from.length > 0 && <p className="mt-2 text-[14px] font-extrabold">From {inr(Math.min(...from))}</p>}
        {items.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {items.map(it => (
              <div key={it.item_key} className="flex justify-between rounded-xl bg-white/10 px-3 py-2 text-[12.5px]">
                <span className="truncate font-bold">{itemName(config.catalogue, it.answers)}</span>
                <span className="font-extrabold">{itemPricePaise(config.catalogue, it.answers) ? inr(Math.round(itemPricePaise(config.catalogue, it.answers) / (1 - fee) / 10) * 10) : 'On request'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Card className="mt-3">
        {stages.slice(0, -1).map(s => <Tick key={s.id} ok={done.has(s.id)} onEdit={() => go(s.id)}>{s.label}</Tick>)}
      </Card>
      <p className="mt-3 px-1 text-[12px] leading-snug text-ink/50">Instant booking switches on once your identity, any licence this service needs and your payout account are all verified. Until then customers can still send you requests.</p>
    </>
  )
}

function addrFields(addr) {
  return { formatted_address: addr.line, locality: addr.locality, city: addr.city, state: addr.state, postal_code: addr.postcode }
}
