import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Loader2, Search, X, ShieldCheck, Landmark, Sparkles, ChevronRight, RotateCcw } from 'lucide-react'
import SambramoTradePictogram from '../../components/vendor/SambramoTradePictogram'
import { scanForTrade } from '../../components/vendor/TradeGrid'
import { usePayoutStatus } from '../../components/vendor/anchor/stages/PayoutReviewStages'
import RazorpayBadge from '../../components/partner/payout/RazorpayBadge'
import InviteCodeEntry from '../../components/partner/referrals/InviteCodeEntry'
import { TRADE_CONFIGS } from '../../data/trades'
import { offeringsForTrade } from '../../data/partnerCatalogue'
import { usePartnerStage } from '../../hooks/usePartnerStage'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { ensureVendorRow } from '../../lib/ensureVendor'
import { ensureListing } from '../../lib/partnerListings'
import { queueTrades } from '../../lib/tradeQueue'
import { IDENTITY_TEXT, PAYOUT_TEXT } from '../../lib/partnerAccountStatus'
import { onboardPath } from '../../lib/tradeRoutes'
import { MAX_TRADES, capMessage } from '../../config/listingCap'
import { Sheet } from '../../components/vendor/anchor/ui'

/**
 * "What services do you offer?" — the partner's way in.
 *
 * Replaces the five-section overview (Business / Area / Verification /
 * Payout / Review) as the entry route. Those sections already live inside
 * each trade's own flow, and identity and payout are account-level, so the
 * overview was a second pass over the same ground. This screen only asks
 * the one question that has to come first: which trades.
 *
 *   /partner/setup      a new partner, or one who has not picked yet
 *   /partner/services   "+ Add another service" from the dashboard
 *
 * The list is the canonical registry (src/data/trades, 34 trades, their
 * order and ids) — never a second hand-kept list, and free text can never
 * become a trade. A trade that already has a listing is shown with its
 * status and opens THAT listing, so a second Photography cannot be made.
 * A trade with an unsent draft resumes it, at the step it was left on.
 *
 * Nothing about identity or bank details is collected here: the summary
 * sheet shows their account-level status and links to where they are
 * managed (More → Verification & documents, Payouts).
 */

const CANONICAL = TRADE_CONFIGS.slice().sort((a, b) => a.order - b.order)
const STATUS = {
  live: { label: 'Live', cls: 'bg-forest-50 text-forest-700 ring-forest-200' },
  under_review: { label: 'Under review', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  rejected: { label: 'Changes requested', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  draft: { label: 'Draft', cls: 'bg-plum-50 text-plum-700 ring-plum-200' },
}
const TONE = { good: 'bg-forest-50 text-forest-700', wait: 'bg-amber-50 text-amber-800', act: 'bg-rose-50 text-rose-700' }

// Only these six final-row trade images need a constrained, centered frame.
// Keep the correction scoped so the other 28 trade cards remain unchanged.
const CENTERED_TRADE_ART = new Set([
  'Trousseau & Gift Packing',
  'Valet Parking',
  'Venue',
  'Videography',
  'Warehouse / Storage',
  'Wedding Planning',
])

/** Trades matching a query: the trade's own name, or a service inside it. */
export function matchTrades(q) {
  const t = String(q ?? '').trim().toLowerCase()
  if (!t) return CANONICAL
  return CANONICAL.filter(c => c.name.toLowerCase().includes(t)
    || offeringsForTrade(c.name).some(o => o.name.toLowerCase().includes(t)))
}

/** Drafts this partner left: on this device, or synced to the server. */
async function draftTrades(vendorId) {
  const ids = new Set()
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? ''
      if (k.startsWith(`partner_draft:${vendorId}:`)) ids.add(k.split(':')[2])
    }
  } catch { /* private mode */ }
  try {
    const { data } = await supabase.from('sambramo_listing_drafts').select('trade_id').eq('vendor_id', vendorId)
    for (const r of data ?? []) if (r.trade_id) ids.add(r.trade_id)
  } catch { /* migration 12 not applied: device drafts only */ }
  const { data: rows } = await supabase.from('partner_listings').select('trade').eq('vendor_id', vendorId)
  const byName = new Set((rows ?? []).map(r => r.trade))
  return CANONICAL.filter(c => ids.has(c.id) || byName.has(c.name)).map(c => c.name)
}

export default function ServiceSelector() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const adding = pathname === '/partner/services'
  const { user, profile } = useAuth()
  const { account, loading, refresh } = usePartnerStage()
  const vendorId = account?.vendor?.id ?? null
  const status = usePayoutStatus(vendorId)

  const [q, setQ] = useState('')
  const [picked, setPicked] = useState([])
  const [capOpen, setCapOpen] = useState(false)
  const [drafts, setDrafts] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  /* The partner row every trade's listing hangs off. Idempotent; only
     runs when there genuinely is none (a brand-new sign-up). */
  const ensuring = useRef(false)
  useEffect(() => {
    if (loading || ensuring.current || vendorId || !profile) return
    ensuring.current = true
    ensureVendorRow({ user, profile }).then(r => { if (r?.created) refresh() }).finally(() => { ensuring.current = false })
  }, [loading, vendorId, profile, user, refresh])

  useEffect(() => { if (vendorId) draftTrades(vendorId).then(setDrafts) }, [vendorId])

  /* Each trade's own listing state. One listing per trade, so the newest row decides. */
  const listed = useMemo(() => {
    const out = {}
    for (const s of account?.services ?? []) {
      if (!s.category || out[s.category]) continue
      out[s.category] = { id: s.id, state: STATUS[s.review_status] ? s.review_status : 'draft' }
    }
    return out
  }, [account?.services])
  const resumable = drafts.filter(t => !listed[t])
  const list = useMemo(() => matchTrades(q), [q])

  /* ── The cap is on the total, not on this screen ────────────────
     A partner with two listings already may pick one more, not three.
     Counting only what is on this screen would let somebody reach six
     in two visits, which is the case the cap exists for. */
  const alreadyListed = Object.keys(listed ?? {}).length
  const remaining = Math.max(0, MAX_TRADES - alreadyListed)
  const atCap = picked.length >= remaining

  const toggle = name => {
    if (listed[name]) { navigate(onboardPath(name)); return }
    if (!picked.includes(name) && atCap) { setCapOpen(true); return }
    setPicked(p => (p.includes(name) ? p.filter(x => x !== name) : [...p, name]))
  }
  /* In the order the partner picked them: the first one they tapped is set up first. */
  const ordered = picked

  async function start(first = ordered[0], queue = ordered) {
    if (!first || busy) return
    setBusy(true); setError('')
    try {
      let vid = vendorId
      if (!vid && user?.id) {
        const { data } = await supabase.from('vendors').select('id').eq('profile_id', user.id).maybeSingle()
        vid = data?.id ?? null
      }
      if (!vid && profile) vid = (await ensureVendorRow({ user, profile }))?.id ?? null
      if (!vid) throw new Error('We could not prepare your partner profile. Check your connection and try again.')
      for (const name of queue) await ensureListing(vid, name)
      queueTrades([first, ...queue.filter(n => n !== first)])
      navigate(onboardPath(first))
    } catch (e) {
      setError(e?.message ?? 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !account?.vendor) {
    return <div className="native-screen flex items-center justify-center bg-white"><Loader2 size={26} className="animate-spin text-plum-600" /></div>
  }

  const idText = IDENTITY_TEXT[status.identity] ?? IDENTITY_TEXT.not_started
  const poText = PAYOUT_TEXT[status.payout] ?? PAYOUT_TEXT.not_started

  return (
    <div data-screen="service-selector" className="native-screen flex flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* ── The hero ─────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-plum-950 via-plum-900 to-plum-700 px-5 pb-7 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] text-white">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-fuchsia-500/25 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-saffron-300/15 blur-3xl" />
          {adding ? (
            <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="relative -ml-2 flex h-11 w-11 items-center justify-center rounded-full text-white/85">
              <ArrowLeft size={20} />
            </button>
          ) : <div className="h-6" />}
          <p className="relative mt-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-plum-200">
            <Sparkles size={13} className="text-saffron-300" /> {adding ? 'Add another service' : 'Sambramo partner'}
          </p>
          <h1 className="relative mt-2 text-[clamp(1.6rem,7.4vw,2.05rem)] font-black leading-[1.08] tracking-tight">What services do you offer?</h1>
          <p className="relative mt-2.5 max-w-md text-[13.5px] leading-relaxed text-white/75">
            Choose the services your business provides. You can select more than one and complete each service setup using your saved business details.
          </p>
        </div>

        <div className="px-4">
          {/* ── Search, pinned while the list scrolls ──────────────── */}
          <div className="sticky top-0 z-20 -mx-4 bg-white/90 px-4 pb-2 pt-3 backdrop-blur-md">
            <div className="relative">
              <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-plum-500" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search for a service..." aria-label="Search for a service"
                data-testid="service-search"
                className="w-full rounded-[18px] bg-[#f6f3fc] py-3.5 pl-11 pr-10 text-[14.5px] font-semibold text-ink ring-1 ring-plum-100 placeholder:font-medium placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-plum-400" />
              {q && (
                <button type="button" onClick={() => setQ('')} aria-label="Clear search"
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-plum-100 text-plum-700"><X size={14} /></button>
              )}
            </div>
          </div>

          {/* ── Unsent drafts, one tap from where they were left ─────── */}
          {!q && resumable.length > 0 && (
            <div className="mt-2 rounded-[22px] bg-plum-50/70 p-3.5 ring-1 ring-plum-100" data-testid="resume-drafts">
              <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-plum-700"><RotateCcw size={13} /> Continue setup</p>
              <div className="mt-2 flex flex-col gap-2">
                {resumable.map(name => (
                  <button key={name} type="button" onClick={() => start(name, [name])} data-resume={name}
                    className="flex items-center gap-3 rounded-2xl bg-white p-2.5 text-left ring-1 ring-plum-100 active:scale-[0.99]">
                    <SambramoTradePictogram trade={name} size="sm" showSparkle={false} title={false} className="shrink-0" />
                    <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-extrabold text-ink">{name}</span>
                      <span className="block text-[11.5px] font-bold text-plum-600">Draft saved · pick up where you left off</span></span>
                    <ChevronRight size={17} className="text-plum-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── The 34 trades ──────────────────────────────────────── */}
          <div className="mt-3 grid grid-cols-2 gap-2.5 pb-6" data-testid="trade-grid">
            {list.map(c => {
              const on = picked.includes(c.name)
              const have = listed[c.name]
              const blurb = scanForTrade(c.name, 2)
              return (
                <motion.button key={c.id} type="button" layout="position" whileTap={{ scale: 0.97 }}
                  data-trade={c.name} data-trade-id={c.id} aria-pressed={on} onClick={() => toggle(c.name)}
                  className={`relative flex min-h-[150px] flex-col items-start rounded-[22px] p-3 text-left transition-colors ${
                    on ? 'bg-gradient-to-br from-plum-50 to-fuchsia-50 ring-2 ring-plum-600 shadow-[0_10px_26px_rgba(91,33,182,0.16)]'
                      : 'bg-white ring-1 ring-ink/[0.07]'}`}>
                  <span className={`absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition ${
                    on ? 'bg-plum-700 text-white' : 'bg-white text-transparent ring-1 ring-ink/15'}`}>
                    <Check size={14} strokeWidth={3} />
                  </span>
                  {CENTERED_TRADE_ART.has(c.name) ? (
                    <span className="block w-full min-w-0 self-center overflow-hidden rounded-[18px]">
                      <SambramoTradePictogram trade={c.name} size="md" showSparkle={false} title={false} centerCrop
                        className="!mx-auto !block !h-[82px] !w-full !max-w-full" />
                    </span>
                  ) : (
                    <SambramoTradePictogram trade={c.name} size="md" showSparkle={false} title={false} />
                  )}
                  <span className="mt-2 block pr-1 text-[13px] font-extrabold leading-tight text-ink">{c.name}</span>
                  {have ? (
                    <span className={`mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${STATUS[have.state].cls}`}>{STATUS[have.state].label}</span>
                  ) : blurb && (
                    <span className="mt-1 line-clamp-2 block text-[10.5px] leading-snug text-ink/50">{blurb}</span>
                  )}
                </motion.button>
              )
            })}
          </div>
          {list.length === 0 && (
            <p data-testid="no-results" className="-mt-2 mb-6 rounded-[20px] bg-[#f6f3fc] p-6 text-center text-[13.5px] font-bold text-ink/60">
              No services found. Try another name.
            </p>
          )}

          {!adding && !(account?.services ?? []).length && <div className="pb-6"><InviteCodeEntry vendorId={vendorId} /></div>}
        </div>
      </div>

      {/* ── One way forward ───────────────────────────────────────── */}
      <div className="safe-cta border-t border-ink/[0.06] bg-white/95 px-5 pt-3 backdrop-blur-md">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={picked.length ? 'n' : 'z'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            data-testid="selected-count"
            className={`mb-2 text-center text-[12.5px] font-extrabold ${picked.length ? 'text-plum-700' : 'text-ink/45'}`}>
            {picked.length
              ? `${picked.length} selected · ${Math.max(0, remaining - picked.length)} more you can add`
              : remaining === 0
                ? `You have ${alreadyListed} services — that is the limit`
                : `Select at least one service to continue · up to ${remaining}`}
          </motion.p>
        </AnimatePresence>
        {/* ── Straight into setup ───────────────────────────────────
            This used to open a summary sheet first: the services in
            order, identity and payout status, a Razorpay badge, and a
            second button that started the thing the first button had
            already asked for. Two taps and a wall of pending-status
            text stood between picking a trade and answering its first
            question, every single time.

            Identity and payout are asked inside the flow, at the step
            that needs them, which is where a partner can act on them.
            Nothing is lost by not previewing them here. */}
        {error && <p className="mb-2 rounded-2xl bg-rose-50 px-3 py-2 text-[12.5px] font-bold text-rose-700">{error}</p>}
        <button type="button" data-cta="continue" disabled={!picked.length || busy} onClick={() => start()}
          className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15.5px] font-extrabold text-white shadow-[0_12px_28px_rgba(91,33,182,0.28)] transition active:scale-[0.99] disabled:bg-none disabled:bg-ink/15 disabled:shadow-none">
          {busy && <Loader2 size={16} className="animate-spin" />}
          {picked.length > 1 ? `Start with ${ordered[0]}` : 'Continue'} <ArrowRight size={17} />
        </button>
      </div>

      {/* ── Why, and where to go instead ──────────────────────────────
          A refusal that only refuses teaches nothing. A partner hitting
          this is usually a real event company, and there is a right
          answer for them: list once under the trade that describes the
          whole job, instead of competing with themselves across cards. */}
      <Sheet open={capOpen} onOpenChange={o => !o && setCapOpen(false)} title={capMessage(alreadyListed).title}>
        <p className="text-[13px] leading-relaxed text-ink/70">{capMessage(alreadyListed).body}</p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink/70">{capMessage(alreadyListed).suggestion}</p>
        <div className="mt-4 space-y-2">
          {capMessage(alreadyListed).options.map(o => (
            <button key={o.id} type="button"
              onClick={() => { setCapOpen(false); navigate(onboardPath(o.name)) }}
              className="flex w-full items-center gap-3 rounded-2xl bg-[#f8f6fd] p-3 text-left ring-1 ring-plum-100">
              <SambramoTradePictogram trade={o.name} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-extrabold text-plum-950">{o.name}</span>
                <span className="block text-[12px] leading-snug text-ink/55">{o.why}</span>
              </span>
              <ChevronRight size={17} className="shrink-0 text-plum-700" />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setCapOpen(false)}
          className="mt-4 min-h-[48px] w-full rounded-full bg-ink/[0.05] text-[13.5px] font-extrabold text-ink">
          Keep my current selection
        </button>
      </Sheet>
    </div>
  )
}
