import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  Loader2, Search, ShieldCheck, ShieldAlert, Clock, Radio, EyeOff, Images,
  FileText, X, Check, AlertCircle, MapPin, Phone, Mail, Calendar, Download,
  IndianRupee, Layers, RefreshCw, ChevronRight,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast, friendlyError } from '../../context/ToastContext'
import { signedUrlFor } from '../../lib/partnerDocuments'
import { signedUrlsFor } from '../../lib/partnerWork'
import { specsForTrade } from '../../data/partnerSpecs'
import { completenessOf } from '../../lib/listingCompleteness'
import { destinationShort } from '../../lib/documents/mask'

/**
 * The partner side of the business, end to end, in one console.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT ANOTHER TAB IN THE ADMIN RAIL
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Partners" was one table of rows with Approve and Reject on each. That
 * answers exactly one question — is this business real — and the partner
 * lifecycle has about nine more:
 *
 *   did their listings ever go live      review_status, per row
 *   what did they actually claim         vendor_services.specs
 *   can they be paid                     vendor_payout_details
 *   who are they                         vendor_documents
 *   are they reachable at all            partner_readiness
 *   are they being offered work          is_verified AND a live listing
 *   have they asked to leave             a closure request
 *
 * Every one of those lives in a different table, and until now answering
 * them meant the SQL editor. A coordinator who cannot see them does not
 * act on them, which is how a real partner sat with an unread listing
 * for eleven days while the console showed her as approved.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SYNC IS THE SCHEMA, AND THAT IS DELIBERATE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Nothing here pushes anything to the partner app. It does not need to.
 * Every control writes the SAME COLUMN the partner app already reads:
 *
 *   review_status  →  ListingCard's state, its four beads, its badge
 *   review_note    →  "What to change:" on the partner's own card
 *   is_verified    →  partner_readiness, and match_partners itself
 *
 * So a coordinator approving a listing here changes what the partner
 * sees on their next load, with no queue, no webhook and nothing to keep
 * in step. A second mechanism would be a second source of truth, and the
 * two would disagree on the day it mattered.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IS HERE AND WHAT IS NOT, STATED PLAINLY
 * ══════════════════════════════════════════════════════════════════════
 *
 * Built:   the pipeline, every partner with their whole record, and the
 *          per-listing review queue — which is the gap that had no UI at
 *          all, in either console.
 *
 * Not yet: editing the catalogue's questions and options. That one is
 *          not a small omission -- the partner app renders its listing
 *          wizard from compiled-in JavaScript (src/data/partnerSpecs.js
 *          and friends) and never reads listing_questions at all, so an
 *          editor over those tables would edit rows nobody reads, and
 *          the next regeneration of 107 would overwrite them anyway.
 *          Making it real needs a runtime overlay; see the plan.
 */

const TABS = [
  { id: 'pipeline',  label: 'Overview',       icon: Layers },
  { id: 'partners',  label: 'Partner registry', icon: ShieldCheck },
  { id: 'listings',  label: 'Listing review', icon: FileText },
  { id: 'documents', label: 'Documents',      icon: FileText },
  { id: 'dispatch',  label: 'Dispatch & jobs', icon: Radio },
  { id: 'payouts',   label: 'Payouts',         icon: IndianRupee },
  { id: 'referrals', label: 'Referrals',      icon: ShieldAlert },
  { id: 'work',      label: 'Portfolio',      icon: Images },
  { id: 'closures',  label: 'Closure requests', icon: EyeOff },
]

/* The partner-facing words, so the console and the app describe a row
   the same way. A coordinator saying "it is under review" to somebody
   whose screen says "needs a change" is the app losing an argument it
   should not be having. */
const LISTING_STATE = {
  live:         { label: 'Live',         cls: 'bg-forest-100 text-forest-800', icon: Radio },
  under_review: { label: 'Being read',   cls: 'bg-amber-100 text-amber-800',   icon: Clock },
  rejected:     { label: 'Sent back',    cls: 'bg-rose-100 text-rose-800',     icon: AlertCircle },
}

const VENDOR_STATE = {
  approved:  { label: 'Approved',  cls: 'bg-forest-100 text-forest-800' },
  submitted: { label: 'Waiting',   cls: 'bg-amber-100 text-amber-800' },
  rejected:  { label: 'Rejected',  cls: 'bg-rose-100 text-rose-800' },
  suspended: { label: 'Suspended', cls: 'bg-ink/10 text-ink-soft' },
  draft:     { label: 'Draft',     cls: 'bg-ink/10 text-ink-soft' },
}

const ago = iso => {
  if (!iso) return null
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

const money = n =>
  n === null || n === undefined ? '—'
  : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })

/* ══════════════════════════════════════════════════════════════════════
   ONE READ, NOT ONE PER PANEL
   ══════════════════════════════════════════════════════════════════════

   Five tables, fetched together and held. The panels below are views
   over the same objects, so a listing approved in the queue is already
   approved in the partner's drawer without a second round trip — and
   there is no window where the two disagree on screen.

   Synthetic partners are excluded outright. 221 of 228 rows are seeded,
   and a review queue that makes a coordinator scroll past them is a
   queue nobody opens twice. */
function usePartnerData() {
  const [state, setState] = useState({
    loading: true, error: null, payoutsReadable: true,
    vendors: [], services: [], tradeListings: [], docs: [], payouts: [], work: [], tradePackages: [], cateringPackages: [], audit: [], notes: [], activityEvents: [], verificationEvents: [], bookingLines: [], dispatchOffers: [], payoutClaims: [], payoutAccounts: [], adjustments: [], subscriptions: [], referrals: [], referralInvites: [],
  })

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const [v, s, tl, d, p, pa, w, tp, cp, a, n, ev, ve, bl, offers, claims, adj, subs, refs, invites] = await Promise.all([
        supabase.from('vendors').select('*, profiles:profiles!vendors_profile_id_fkey(id,full_name,email,phone,role,city,created_at)').eq('is_synthetic', false).order('created_at', { ascending: false }),
        supabase.from('vendor_services').select('*').order('created_at', { ascending: false }),
        supabase.from('partner_listings').select('id,vendor_id,trade,trade_id,status,review_note,submitted_at,reviewed_at,reviewed_by,created_at,updated_at').order('updated_at', { ascending: false }),
        supabase.from('vendor_documents').select('*'),
        supabase.from('vendor_payout_details').select('*'),
        supabase.from('partner_payout_accounts').select('id,vendor_id,kyc_status,kyc_note,kyc_verified_at,bank_name,account_last4,account_holder,ifsc,route_account_id,route_status,route_product_id,route_stakeholder_id,route_requirements,route_updated_at,created_at,updated_at'),
        supabase.from('partner_work').select('*').order('created_at', { ascending: false }),
        supabase.from('sambramo_trade_packages').select('id,vendor_id,vendor_service_id,parent_package_id,name,status,revision_round,commercial_inputs,trade_inputs,submitted_at,reviewed_at,created_at,updated_at,review_note'),
        supabase.from('sambramo_catering_packages').select('id,vendor_id,vendor_service_id,parent_package_id,name,status,rate_bands,created_at,updated_at,review_note,submitted_at,reviewed_at,sourcing_mode,min_guests,max_guests'),
        supabase.from('admin_lifecycle_audit').select('id,entity_type,entity_id,vendor_id,action,before_state,after_state,actor_id,actor_role,note,created_at').not('vendor_id', 'is', null).order('created_at', { ascending: false }),
        supabase.from('admin_lifecycle_notes').select('id,target_type,vendor_id,note_kind,body,created_by,created_at').eq('target_type', 'partner').order('created_at', { ascending: false }),
        supabase.from('partner_events').select('id,vendor_id,profile_id,name,props,surface,app_build,created_at').order('created_at', { ascending: false }),
        supabase.from('vendor_verification_events').select('id,vendor_id,from_value,to_value,actor_id,actor_role,note,created_at').order('created_at', { ascending: false }),
        supabase.from('booking_lines').select('id,request_id,service_id,service_name,trade,status,partner_amount_paise,platform_fee_paise,quoted_amount_paise,dispatched_at,accepted_at,paid_at,delivered_at,settled_at,expires_at,cancelled_at,cancellation_reason,created_at,updated_at,dispatch_mode,pricing_state,pricing_version,accepted_offer_id').order('created_at', { ascending: false }),
        supabase.from('dispatch_offers').select('id,line_id,vendor_id,wave,distance_m,partner_amount_paise,status,decline_reason,offered_at,expires_at,responded_at,accepted_at,hidden_at').order('offered_at', { ascending: false }),
        supabase.from('payout_claims').select('id,line_id,vendor_id,amount_paise,method,status,requested_at,settled_at,reference,note,failed_at,failure_code,failure_reason,attempt,batch_id').order('requested_at', { ascending: false }),
        supabase.from('partner_adjustments').select('id,vendor_id,line_id,kind,amount_paise,reason,effective_on,settled_claim_id,created_at').order('created_at', { ascending: false }),
        supabase.from('vendor_subscriptions').select('id,vendor_id,tier,status,started_at,expires_at,created_at').order('created_at', { ascending: false }),
        supabase.from('partner_referrals').select('id,referrer_id,referred_id,code,state,rejected_reason,first_line_id,adjustment_id,created_at,updated_at,claimed_at,onboarding_completed_at,verified_at,live_at,first_event_at,qualified_at,reward_status,paid_at').order('created_at', { ascending: false }),
        supabase.from('partner_referral_invites').select('id,referrer_id,trade_id,code,campaign_id,created_at,expires_at,claimed_at,claimed_by').order('created_at', { ascending: false }),
      ])
      if (v.error) throw v.error
      setState({
        loading: false, error: null,
        /* ── An absence is not the same as a refusal ──────────────────
           vendor_payout_details was owner-only until migration 114, and
           RLS does not fail loudly — it returns zero rows. Rendered
           naively that reads as "this partner has no payout method",
           which is a permission wearing data's clothes, and an operator
           would decide on it. So the error is kept and the drawer says
           which of the two it is. */
        payoutsReadable: !p.error,
        vendors: v.data ?? [],
        tradeListings: tl.error ? [] : (tl.data ?? []),
        /* Services are fetched for every vendor and filtered locally.
           Filtering server-side would need the vendor id list in the
           query, which changes as soon as anything is approved. */
        services: s.data ?? [],
        docs: d.data ?? [],
        payouts: p.data ?? [],
        payoutAccounts: pa.error ? [] : (pa.data ?? []),
        /* Write-only since 110 shipped -- nothing has ever read this,
           so day one of the queue is every row ever inserted. */
        work: w.data ?? [],
        tradePackages: tp.error ? [] : (tp.data ?? []),
        cateringPackages: cp.error ? [] : (cp.data ?? []),
        audit: a.error ? [] : (a.data ?? []),
        notes: n.error ? [] : (n.data ?? []),
        activityEvents: ev.error ? [] : (ev.data ?? []),
        verificationEvents: ve.error ? [] : (ve.data ?? []),
        bookingLines: bl.error ? [] : (bl.data ?? []),
        dispatchOffers: offers.error ? [] : (offers.data ?? []),
        payoutClaims: claims.error ? [] : (claims.data ?? []),
        adjustments: adj.error ? [] : (adj.data ?? []),
        subscriptions: subs.error ? [] : (subs.data ?? []),
        referrals: refs.error ? [] : (refs.data ?? []),
        referralInvites: invites.error ? [] : (invites.data ?? []),
      })
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err }))
    }
  }, [])

  useEffect(() => { load() }, [load])
  return { ...state, refresh: load }
}

export default function PartnerConsole() {
  const { user } = useAuth()
  const [tab, setTab] = useState('pipeline')
  const [open, setOpen] = useState(null)       // the partner in the drawer
  const data = usePartnerData()

  const byVendor = useMemo(() => {
    const m = {}
    for (const s of data.services) (m[s.vendor_id] ??= []).push(s)
    return m
  }, [data.services])

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight text-ink">Partner console</h1>
          <p className="mt-0.5 text-[13px] text-ink-mute">
            Every partner, every listing, and what they can see of it.
          </p>
        </div>
        <button
          type="button" onClick={data.refresh} disabled={data.loading}
          className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[12.5px] font-extrabold text-ink-soft ring-1 ring-ink/[0.08] disabled:opacity-50"
        >
          <RefreshCw size={13} className={data.loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      <nav aria-label="Partner lifecycle views" className="flex gap-1 overflow-x-auto rounded-2xl bg-ink/[0.04] p-1">
        {TABS.map(t => {
          const Icon = t.icon
          const n =
            t.id === 'listings' ? data.services.filter(s =>
                s.review_status === 'under_review'
                || (s.review_status === 'live' && s.revised_at
                    && (!s.reviewed_at || new Date(s.revised_at) > new Date(s.reviewed_at)))).length
            : t.id === 'work' ? data.work.filter(w => w.review_status === 'under_review').length
            : t.id === 'closures' ? data.vendors.filter(v => v.closure_requested_at).length
             : t.id === 'documents' ? data.docs.filter(d => data.vendors.some(v => v.id === d.vendor_id)).length
            : t.id === 'dispatch' ? data.dispatchOffers.filter(o => data.vendors.some(v => v.id === o.vendor_id)).length
            : t.id === 'payouts' ? data.payoutClaims.filter(p => !['settled','paid','completed','complete','failed','cancelled','rejected'].includes(String(p.status || '').toLowerCase())).length
            : t.id === 'referrals' ? data.referrals.filter(r => (data.vendors.some(v => v.id === r.referrer_id) || data.vendors.some(v => v.id === r.referred_id)) && !['paid','rejected','cancelled','complete','completed'].includes(String(r.reward_status || r.state || '').toLowerCase())).length
            : 0
          return (
            <button
              key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center justify-center gap-1.5 rounded-[13px] px-3 py-2.5 text-[12px] font-extrabold transition ${
                tab === t.id ? 'bg-white text-ink shadow-sm' : 'text-ink-mute'
              }`}
            >
              <Icon size={14} /> {t.label}
              {n > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-extrabold text-white">{n}</span>
              )}
            </button>
          )
        })}
      </nav>

      {data.loading ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 text-ink-mute">
          <Loader2 size={24} className="animate-spin text-plum-600" />
          <span className="text-[13px]">Reading the partner network…</span>
        </div>
      ) : data.error ? (
        <p className="rounded-2xl bg-rose-50 p-4 text-[13px] font-semibold text-rose-800 ring-1 ring-rose-200">
          {friendlyError(data.error, 'Could not load partners.')}
        </p>
      ) : (
        <>
          {tab === 'pipeline' && <Pipeline data={data} byVendor={byVendor} onOpen={setOpen} onGo={setTab} />}
          {tab === 'partners' && <PartnerTable data={data} byVendor={byVendor} onOpen={setOpen} />}
          {tab === 'listings' && <ListingReview data={data} onOpen={setOpen} />}
          {tab === 'documents' && <DocumentRegistry data={data} onOpen={setOpen} />}
          {tab === 'dispatch' && <DispatchRegistry data={data} onOpen={setOpen} />}
          {tab === 'payouts' && <PayoutRegistry data={data} onOpen={setOpen} />}
          {tab === 'referrals' && <ReferralRegistry data={data} onOpen={setOpen} />}
          {tab === 'work' && <WorkQueue data={data} onOpen={setOpen} />}
          {tab === 'closures' && <ClosureQueue data={data} byVendor={byVendor} onOpen={setOpen} />}
        </>
      )}

      {open && (
        <PartnerDrawer
          vendor={open}
          services={byVendor[open.id] ?? []}
          tradeListings={data.tradeListings.filter(t => t.vendor_id === open.id)}
          docs={data.docs.filter(d => d.vendor_id === open.id)}
          payout={data.payouts.find(p => p.vendor_id === open.id) ?? null}
          payoutAccount={data.payoutAccounts.find(p => p.vendor_id === open.id) ?? null}
          payoutsReadable={data.payoutsReadable}
          work={data.work.filter(w => w.vendor_id === open.id)}
          pricing={{ trade: data.tradePackages.filter(p => p.vendor_id === open.id), catering: data.cateringPackages.filter(p => p.vendor_id === open.id) }}
          audit={data.audit.filter(a => a.vendor_id === open.id)}
          notes={data.notes.filter(n => n.vendor_id === open.id)}
          activityEvents={data.activityEvents.filter(e => e.vendor_id === open.id || (open.profile_id && e.profile_id === open.profile_id))}
          verificationEvents={data.verificationEvents.filter(e => e.vendor_id === open.id)}
          bookingLines={data.bookingLines}
          dispatchOffers={data.dispatchOffers.filter(o => o.vendor_id === open.id)}
          payoutClaims={data.payoutClaims.filter(p => p.vendor_id === open.id)}
          adjustments={data.adjustments.filter(a => a.vendor_id === open.id)}
          subscriptions={data.subscriptions.filter(s => s.vendor_id === open.id)}
          referrals={data.referrals.filter(r => r.referrer_id === open.id || r.referred_id === open.id)}
          referralInvites={data.referralInvites.filter(r => r.referrer_id === open.id)}
          actorId={user?.id}
          onClose={() => setOpen(null)}
          onChanged={data.refresh}
        />
      )}
    </div>
  )
}


/* The following registry tabs are independent operational views but every row
   opens the same Partner 360 record. They use existing normalized table IDs. */
function usePartnerIndex(vendors) {
  return useMemo(() => Object.fromEntries(vendors.map(v => [v.id, v])), [vendors])
}

function DocumentRegistry({ data, onOpen }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const partnerById = usePartnerIndex(data.vendors)
  const rows = data.docs.filter(d => {
    const v = partnerById[d.vendor_id]
    if (!v) return false
    if (status && String(d.status || '').toLowerCase() !== status) return false
    const t = q.trim().toLowerCase()
    return !t || [v.partner_code,v.business_name,v.profiles?.email,d.id,d.kind,d.file_name,d.requirement_id,d.trade,d.provider_status,d.status]
      .some(x => String(x || '').toLowerCase().includes(t))
  }).sort((a,b) => new Date(b.uploaded_at || b.created_at || 0) - new Date(a.uploaded_at || a.created_at || 0))
  const pending = rows.filter(d => !['approved','verified','accepted'].includes(String(d.status || '').toLowerCase()))
  return (
    <div className="space-y-3">
      <section className="grid grid-cols-3 gap-2">
        <Tile label="Uploads in registry" value={rows.length} sub="Documents linked to real partner IDs" />
        <Tile label="Not cleared" value={pending.length} sub="Status is not approved / verified / accepted" />
        <Tile label="Expiring / expired" value={rows.filter(d => d.expires_on && new Date(d.expires_on) <= new Date(Date.now()+30*86400000)).length} sub="Expiry within 30 days or earlier" />
      </section>
      <div className="flex flex-wrap gap-2">
        <div className="min-w-[220px] flex-1"><Searchable value={q} onChange={setQ} placeholder="Search partner, document ID, file, requirement…"/></div>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl bg-white px-3 py-2.5 text-[12px] font-semibold text-ink ring-1 ring-ink/[0.08]">
          <option value="">All document states</option><option value="pending">Pending</option><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="verified">Verified</option><option value="rejected">Rejected</option><option value="failed">Failed</option>
        </select>
      </div>
      <DataTable minWidth="1100px" headers={['Partner / UUID','Document / ID','Requirement & trade','Review status','Provider','Evidence checks','Uploaded / expiry','Open']} rows={rows.map(d=>{
        const v=partnerById[d.vendor_id]
        return {
          key:d.id,
          cells:[
            <button type="button" onClick={()=>onOpen(v)} className="text-left"><span className="block max-w-[170px] truncate text-[11px] font-extrabold">{v.business_name}</span><span className="block font-mono text-[8.5px] text-plum-700">{v.partner_code || v.id.slice(0,8)}</span><span className="block max-w-[165px] truncate font-mono text-[8px] text-ink-mute">{v.id}</span></button>,
            <span><span className="block text-[10.5px] font-bold">{KIND_LABEL[d.kind] || d.kind}</span><span className="block max-w-[165px] break-words text-[9px] text-ink-mute">{d.file_name || 'Unnamed upload'}</span><span className="block font-mono text-[8px] text-ink-mute">{d.id}</span></span>,
            <span><span className="block text-[10px]">{d.requirement_id || '—'}</span><span className="block text-[9px] text-ink-mute">{d.trade || '—'}{d.listing_id ? ' · ' + d.listing_id : ''}</span></span>,
            <span><StatusPill value={d.status}/>{d.review_note ? <span className="mt-1 block max-w-[170px] text-[9px] text-rose-700">{d.review_note}</span> : null}</span>,
            <span><StatusPill value={d.provider_status}/>{d.provider_name ? <span className="mt-1 block text-[9px] text-ink-mute">{d.provider_name}</span> : null}</span>,
            <span className="space-y-0.5 text-[9px] text-ink-mute"><span className="block">Checksum · {d.checksum_ok == null ? 'unknown' : d.checksum_ok ? 'pass' : 'fail'}</span><span className="block">Name · {d.name_match || 'unknown'}</span><span className="block">Face · {d.face_match || 'unknown'}</span><span className="block">Type · {d.detected_type || 'unknown'}</span></span>,
            <span className="whitespace-nowrap text-[9px] text-ink-mute"><span className="block">{d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString('en-IN') : '—'}</span><span className="mt-1 block">Expires {d.expires_on || '—'}</span><span className="mt-1 block">Checked {d.checked_at ? new Date(d.checked_at).toLocaleDateString('en-IN') : '—'}</span></span>,
            <DocLink path={d.storage_path}/>
          ]
        }
      })} empty="No partner document uploads match those filters." />
    </div>
  )
}

function DispatchRegistry({ data, onOpen }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const partnerById = usePartnerIndex(data.vendors)
  const lineById = useMemo(() => Object.fromEntries(data.bookingLines.map(l=>[l.id,l])),[data.bookingLines])
  const rows = data.dispatchOffers.filter(o => {
    if (!partnerById[o.vendor_id]) return false
    if (status && String(o.status || '').toLowerCase() !== status) return false
    const v=partnerById[o.vendor_id], line=lineById[o.line_id], t=q.trim().toLowerCase()
    return !t || [v.business_name,v.partner_code,v.id,o.id,o.line_id,line?.service_name,line?.trade,o.status,o.decline_reason]
      .some(x=>String(x || '').toLowerCase().includes(t))
  }).sort((a,b)=>new Date(b.offered_at || 0)-new Date(a.offered_at || 0))
  const accepted=rows.filter(o=>String(o.status||'').toLowerCase()==='accepted').length
  const expired=rows.filter(o=>String(o.status||'').toLowerCase()==='expired').length
  return (
    <div className="space-y-3">
      <section className="grid grid-cols-3 gap-2"><Tile label="Offers" value={rows.length} sub="Linked to real partners"/><Tile label="Accepted" value={accepted} sub="Partner accepted offer state"/><Tile label="Expired" value={expired} sub="Offers expired without remaining active"/></section>
      <div className="flex flex-wrap gap-2"><div className="min-w-[220px] flex-1"><Searchable value={q} onChange={setQ} placeholder="Search partner, offer ID, line, service or status…"/></div><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl bg-white px-3 py-2.5 text-[12px] font-semibold text-ink ring-1 ring-ink/[0.08]"><option value="">All offer states</option>{['pending','offered','accepted','declined','expired','cancelled','hidden'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
      <DataTable minWidth="1120px" headers={['Partner / UUID','Offer ID / wave','Booking line','Offer state','Partner amount','Distance','Offered','Responded / accepted','Open']} rows={rows.map(o=>{
        const v=partnerById[o.vendor_id], line=lineById[o.line_id]
        return {key:o.id,cells:[
          <button type="button" onClick={()=>onOpen(v)} className="text-left"><span className="block max-w-[160px] truncate text-[11px] font-extrabold">{v.business_name}</span><span className="block font-mono text-[8px] text-plum-700">{v.partner_code || v.id.slice(0,8)}</span><span className="block font-mono text-[8px] text-ink-mute">{v.id}</span></button>,
          <span><span className="block font-mono text-[9px]">{o.id}</span><span className="block text-[9px] text-ink-mute">Wave {o.wave ?? '—'}</span></span>,
          <span><span className="block text-[10.5px] font-bold">{line?.service_name || line?.trade || 'Booking line'}</span><span className="block break-all font-mono text-[8px] text-ink-mute">{o.line_id}</span><span className="block text-[9px] text-ink-mute">Line status · {line?.status || '—'}</span></span>,
          <span><StatusPill value={o.status}/>{o.decline_reason ? <span className="mt-1 block max-w-[130px] text-[9px] text-amber-800">{o.decline_reason}</span> : null}</span>,
          <span className="text-[11px] font-extrabold">{o.partner_amount_paise == null ? '—' : money(Number(o.partner_amount_paise)/100)}</span>,
          <span className="text-[10px]">{o.distance_m == null ? '—' : (Number(o.distance_m)/1000).toFixed(1)+' km'}</span>,
          <span className="whitespace-nowrap text-[9px]">{o.offered_at ? new Date(o.offered_at).toLocaleString('en-IN') : '—'}</span>,
          <span className="whitespace-nowrap text-[9px]"><span className="block">Response {o.responded_at ? new Date(o.responded_at).toLocaleString('en-IN') : '—'}</span><span className="mt-1 block">Accept {o.accepted_at ? new Date(o.accepted_at).toLocaleString('en-IN') : '—'}</span></span>,
          <button type="button" onClick={()=>onOpen(v)} className="rounded-lg bg-plum-50 px-2.5 py-1.5 text-[10px] font-extrabold text-plum-700">Partner 360</button>
        ]}
      })} empty="No partner dispatch offers match those filters."/>
    </div>
  )
}

function PayoutRegistry({ data, onOpen }) {
  const [q, setQ] = useState('')
  const partnerById=usePartnerIndex(data.vendors)
  const activeClaims=data.payoutClaims.filter(p=>partnerById[p.vendor_id])
  const openClaims=activeClaims.filter(p=>!['settled','paid','completed','complete','failed','cancelled','rejected'].includes(String(p.status||'').toLowerCase()))
  const verified=data.payoutAccounts.filter(p=>partnerById[p.vendor_id]&&!!p.kyc_verified_at).length
  const rows=data.vendors.filter(v=>{
    const t=q.trim().toLowerCase()
    return !t||[v.business_name,v.partner_code,v.id,v.profiles?.email,v.city].some(x=>String(x||'').toLowerCase().includes(t))
  })
  return (
    <div className="space-y-3">
      <section className="grid grid-cols-3 gap-2"><Tile label="Partner KYC verified" value={verified} sub="New payout-route table"/><Tile label="Open payout claims" value={openClaims.length} sub="Awaiting final status"/><Tile label="Failed claims" value={activeClaims.filter(p=>String(p.status||'').toLowerCase()==='failed').length} sub="Needs reconciliation"/></section>
      <div className="min-w-[220px]"><Searchable value={q} onChange={setQ} placeholder="Search partner ID, code, name, email…"/></div>
      <DataTable minWidth="1070px" headers={['Partner / UUID','KYC / payout route','Legacy payout details','Open claims','Paid / settled claims','Latest claim status','Open']} rows={rows.map(v=>{
        const account=data.payoutAccounts.find(p=>p.vendor_id===v.id)
        const legacy=data.payouts.find(p=>p.vendor_id===v.id)
        const claims=activeClaims.filter(p=>p.vendor_id===v.id).sort((a,b)=>new Date(b.requested_at||0)-new Date(a.requested_at||0))
        const opened=claims.filter(p=>!['settled','paid','completed','complete','failed','cancelled','rejected'].includes(String(p.status||'').toLowerCase()))
        const settled=claims.filter(p=>['settled','paid','completed','complete'].includes(String(p.status||'').toLowerCase()))
        const latest=claims[0]
        return {key:v.id,cells:[
          <button type="button" onClick={()=>onOpen(v)} className="text-left"><span className="block max-w-[180px] truncate text-[11px] font-extrabold">{v.business_name}</span><span className="block font-mono text-[8px] text-plum-700">{v.partner_code||v.id.slice(0,8)}</span><span className="block font-mono text-[8px] text-ink-mute">{v.id}</span></button>,
          <span><StatusPill value={account?.kyc_status || 'not set'}/><span className="mt-1 block text-[9px] text-ink-mute">Route · {account?.route_status || 'not provisioned'}</span>{account?.account_last4 ? <span className="block text-[9px] text-ink-mute">Account ending {account.account_last4}</span> : null}</span>,
          <span><StatusPill value={legacy?.verified_at ? 'verified' : legacy ? 'unverified' : 'not set'}/><span className="mt-1 block text-[9px] text-ink-mute">{legacy?.method || 'No legacy payout method'}</span></span>,
          <span className="text-[12px] font-black">{opened.length}{opened.length ? <span className="mt-1 block text-[9px] font-semibold text-amber-800">{money(opened.reduce((sum,p)=>sum+Number(p.amount_paise||0),0)/100)} outstanding</span> : null}</span>,
          <span className="text-[12px] font-black">{settled.length}<span className="mt-1 block text-[9px] font-semibold text-ink-mute">{money(settled.reduce((sum,p)=>sum+Number(p.amount_paise||0),0)/100)} amount</span></span>,
          latest ? <span><StatusPill value={latest.status}/><span className="mt-1 block text-[9px] text-ink-mute">{latest.requested_at?new Date(latest.requested_at).toLocaleDateString('en-IN'):'—'}</span></span> : <span className="text-[10px] text-ink-mute">No claim record</span>,
          <button type="button" onClick={()=>onOpen(v)} className="rounded-lg bg-plum-50 px-2.5 py-1.5 text-[10px] font-extrabold text-plum-700">Partner 360</button>
        ]}
      })} empty="No partner records match those filters."/>
      <p className="px-1 text-[10px] leading-relaxed text-ink-mute">Payout state is joined from partner_payout_accounts, vendor_payout_details and payout_claims. Outstanding claim total sums claim amounts for statuses not marked terminal; it is an operational queue, not an accounting ledger.</p>
    </div>
  )
}

function ReferralRegistry({ data, onOpen }) {
  const [q, setQ] = useState('')
  const [state, setState] = useState('')
  const partnerById=usePartnerIndex(data.vendors)
  const rows=data.referrals.filter(r=>{
    if (!partnerById[r.referrer_id] && !partnerById[r.referred_id]) return false
    if (state && String(r.state||'').toLowerCase()!==state) return false
    const ref=partnerById[r.referrer_id], referred=partnerById[r.referred_id], t=q.trim().toLowerCase()
    return !t||[ref?.business_name,ref?.partner_code,ref?.id,referred?.business_name,referred?.partner_code,referred?.id,r.id,r.code,r.state,r.reward_status].some(x=>String(x||'').toLowerCase().includes(t))
  }).sort((a,b)=>new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0))
  return (
    <div className="space-y-3">
      <section className="grid grid-cols-3 gap-2"><Tile label="Referral records" value={rows.length} sub="Partner-to-partner links"/><Tile label="Qualified" value={rows.filter(r=>r.qualified_at).length} sub="Qualification milestone recorded"/><Tile label="Reward paid" value={rows.filter(r=>r.paid_at).length} sub="Payout milestone recorded"/></section>
      <div className="flex flex-wrap gap-2"><div className="min-w-[220px] flex-1"><Searchable value={q} onChange={setQ} placeholder="Search referrer, referred partner, code or ID…"/></div><select value={state} onChange={e=>setState(e.target.value)} className="rounded-xl bg-white px-3 py-2.5 text-[12px] font-semibold ring-1 ring-ink/[0.08]"><option value="">All referral states</option>{[...new Set(rows.map(r=>String(r.state||'unknown').toLowerCase()))].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
      <DataTable minWidth="1160px" headers={['Referral ID / code','Referrer partner','Referred partner','Referral state','Reward state','Claimed / onboarded','Verified / live','Qualified / paid','Open partner']} rows={rows.map(r=>{
        const ref=partnerById[r.referrer_id], referred=partnerById[r.referred_id], v=ref || referred
        return {key:r.id,cells:[
          <span><span className="block font-mono text-[9px] font-bold">{r.id}</span><span className="block text-[10px] font-extrabold text-plum-700">{r.code||'No code'}</span></span>,
          ref?<button type="button" onClick={()=>onOpen(ref)} className="text-left"><span className="block max-w-[140px] truncate text-[10px] font-extrabold">{ref.business_name}</span><span className="font-mono text-[8px] text-ink-mute">{ref.partner_code||ref.id}</span></button>:<span className="text-[9px] text-ink-mute">Partner not in registry</span>,
          referred?<button type="button" onClick={()=>onOpen(referred)} className="text-left"><span className="block max-w-[140px] truncate text-[10px] font-extrabold">{referred.business_name}</span><span className="font-mono text-[8px] text-ink-mute">{referred.partner_code||referred.id}</span></button>:<span className="text-[9px] text-ink-mute">Partner not in registry</span>,
          <StatusPill value={r.state}/>,<StatusPill value={r.reward_status}/>,
          <span className="text-[9px] text-ink-mute"><span className="block">Claimed {r.claimed_at?new Date(r.claimed_at).toLocaleDateString('en-IN'):'—'}</span><span className="mt-1 block">Onboarded {r.onboarding_completed_at?new Date(r.onboarding_completed_at).toLocaleDateString('en-IN'):'—'}</span></span>,
          <span className="text-[9px] text-ink-mute"><span className="block">Verified {r.verified_at?new Date(r.verified_at).toLocaleDateString('en-IN'):'—'}</span><span className="mt-1 block">Live {r.live_at?new Date(r.live_at).toLocaleDateString('en-IN'):'—'}</span></span>,
          <span className="text-[9px] text-ink-mute"><span className="block">Qualified {r.qualified_at?new Date(r.qualified_at).toLocaleDateString('en-IN'):'—'}</span><span className="mt-1 block">Paid {r.paid_at?new Date(r.paid_at).toLocaleDateString('en-IN'):'—'}</span></span>,
          <button type="button" onClick={()=>onOpen(v)} className="rounded-lg bg-plum-50 px-2.5 py-1.5 text-[10px] font-extrabold text-plum-700">Partner 360</button>
        ]}
      })} empty="No partner referral records match those filters."/>
      <p className="px-1 text-[10px] leading-relaxed text-ink-mute">Invite-only records are shown inside the related partner's Partner 360 drawer. This table represents realized referral relationships.</p>
    </div>
  )
}

function Searchable({ value, onChange, placeholder }) {
  return <div className="relative"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute"/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl bg-white py-2.5 pl-9 pr-3 text-[12px] font-semibold text-ink ring-1 ring-ink/[0.08] outline-none focus:ring-2 focus:ring-plum-300"/></div>
}
function StatusPill({ value }) {
  const key=String(value||'unknown').toLowerCase().replace(/ /g,'_')
  const cls=['approved','verified','accepted','settled','paid','live','qualified','completed','active'].includes(key)?'bg-forest-50 text-forest-800'
    :['rejected','failed','cancelled','suspended','declined','closed'].includes(key)?'bg-rose-50 text-rose-800'
    :['pending','submitted','under_review','action_required','expired','not_set','not_provisioned','unverified','unknown'].includes(key)?'bg-amber-50 text-amber-800'
    :'bg-ink/[0.06] text-ink-soft'
  return <span className={'inline-flex rounded-full px-2 py-1 text-[9px] font-extrabold '+cls}>{String(value||'Unknown').replace(/_/g,' ')}</span>
}
function Tile({ label, value, sub }) {
  return <div className="rounded-xl bg-white p-3 ring-1 ring-ink/[0.08]"><p className="text-[9px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</p><p className="mt-1 text-[17px] font-black text-ink">{value}</p><p className="mt-0.5 text-[9px] leading-relaxed text-ink-mute">{sub}</p></div>
}
function DataTable({ headers, rows, minWidth = '900px', empty='No matching records.' }) {
  return rows.length ? (
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-ink/[0.08]">
      <table className="w-full border-collapse text-left" style={{minWidth}}>
        <thead className="bg-ink/[0.025]"><tr className="border-b border-ink/[0.07] text-[9px] font-extrabold uppercase tracking-[0.1em] text-ink-mute">{headers.map((h,i)=><th key={h+i} className="whitespace-nowrap px-3 py-3">{h}</th>)}</tr></thead>
        <tbody>{rows.map(r=><tr key={r.key} className="border-b border-ink/[0.055] last:border-0 hover:bg-plum-50/30">{r.cells.map((cell,i)=><td key={r.key+'-'+i} className="px-3 py-3 align-top text-[10.5px] text-ink-soft">{cell}</td>)}</tr>)}</tbody>
      </table>
      <p className="border-t border-ink/[0.06] px-3 py-2 text-[9px] text-ink-mute">{rows.length} records shown</p>
    </div>
  ) : <p className="rounded-2xl bg-white p-9 text-center text-[12px] text-ink-mute ring-1 ring-ink/[0.08]">{empty}</p>
}

/* ── Pipeline ──────────────────────────────────────────────────────── */
function Pipeline({ data, byVendor, onOpen, onGo }) {
  const { vendors, services } = data
  const waiting  = vendors.filter(v => v.verification_status === 'submitted')
  const approved = vendors.filter(v => v.is_verified)
  const unread   = services.filter(s => s.review_status === 'under_review')

  /* Approved, and STILL cannot be offered anything. The number that
     matters most on this screen and the one nothing used to show: a
     partner in here believes they are live and is receiving nothing. */
  const stranded = approved.filter(v => {
    const rows = byVendor[v.id] ?? []
    return !rows.some(s => s.is_active && s.review_status === 'live')
  })

  const cards = [
    { k: 'Waiting to be approved', n: waiting.length,  tone: 'amber',  go: 'partners' },
    { k: 'Listings to read',       n: unread.length,   tone: 'amber',  go: 'listings' },
    { k: 'Approved partners',      n: approved.length, tone: 'forest', go: 'partners' },
    { k: 'Approved but offered nothing', n: stranded.length, tone: 'rose', go: 'partners' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {cards.map(c => (
          <button
            key={c.k} type="button" onClick={() => onGo(c.go)}
            className={`rounded-2xl p-3.5 text-left ring-1 transition active:scale-[0.99] ${
              c.tone === 'amber' ? 'bg-amber-50 ring-amber-200'
              : c.tone === 'rose' ? 'bg-rose-50 ring-rose-200'
              : 'bg-forest-50 ring-forest-200'
            }`}
          >
            <p className="font-serif text-[26px] font-extrabold leading-none text-ink">{c.n}</p>
            <p className="mt-1.5 text-[11.5px] font-extrabold leading-tight text-ink-soft">{c.k}</p>
          </button>
        ))}
      </div>

      {stranded.length > 0 && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-rose-200">
          <h2 className="text-[14px] font-extrabold text-ink">Approved, and receiving nothing</h2>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-mute">
            match_partners needs an approved business AND a live listing. These
            partners have the first and not the second — from their side the
            app says approved and no work ever arrives.
          </p>
          <ul className="mt-3 space-y-1.5">
            {stranded.map(v => (
              <li key={v.id}>
                <button
                  type="button" onClick={() => onOpen(v)}
                  className="flex w-full items-center gap-2 rounded-xl bg-rose-50/60 px-3 py-2 text-left transition hover:bg-rose-50"
                >
                  <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold text-ink">{v.business_name}</span>
                  <span className="shrink-0 text-[11.5px] text-ink-mute">
                    {(byVendor[v.id] ?? []).length} listing{(byVendor[v.id] ?? []).length === 1 ? '' : 's'}
                  </span>
                  <ChevronRight size={14} className="shrink-0 text-ink-mute" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/* ── Every partner ─────────────────────────────────────────────────── */
function PartnerTable({ data, byVendor, onOpen }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')

  const rows = data.vendors.filter(v => {
    if (status && v.verification_status !== status) return false
    if (!q.trim()) return true
    const t = q.trim().toLowerCase()
    return [
      v.id, v.profile_id, v.partner_code, v.business_name, v.city, v.area,
      v.pincode, v.category, v.profiles?.email, v.profiles?.phone, v.contact_phone,
    ].some(x => String(x ?? '').toLowerCase().includes(t))
  })

  function exportRegistry() {
    const header = ['Partner UUID','Login profile UUID','Partner code','Business name','Full name','Email','Account phone','Business phone','WhatsApp','Category','City','Area','State','Pincode','Verification state','Onboarding state','Current step','Live cards','Total cards','Documents','Payout verified','Accepting jobs','Accepting bookings','Subscription plan','Created at','Updated at']
    const csvRows = [header, ...rows.map(v => {
      const cards = byVendor[v.id] ?? []
      const live = cards.filter(s => s.is_active && s.review_status === 'live').length
      const docs = data.docs.filter(d => d.vendor_id === v.id).length
      const payout = data.payouts.find(p => p.vendor_id === v.id)
      return [v.id,v.profile_id,v.partner_code,v.business_name,v.profiles?.full_name,v.profiles?.email,v.profiles?.phone,v.contact_phone,v.whatsapp_phone,v.category,v.city,v.area,v.state,v.pincode,v.verification_status,v.onboarding_status,v.current_onboarding_step,live,cards.length,docs,!!payout?.verified_at,v.accepting_jobs,v.accepting_bookings,v.subscription_plan,v.created_at,v.updated_at]
    })]
    const csv = csvRows.map(row => row.map(value => '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"').join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a'); a.href = url; a.download = 'sambramo-partner-registry-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[230px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search partner ID, code, name, email, phone, area…"
            className="w-full rounded-xl bg-white py-2.5 pl-9 pr-3 text-[12px] font-semibold text-ink ring-1 ring-ink/[0.08] outline-none focus:ring-2 focus:ring-plum-300" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="rounded-xl bg-white px-3 py-2.5 text-[12px] font-semibold text-ink ring-1 ring-ink/[0.08]">
          <option value="">All lifecycle states</option>
          {Object.entries(VENDOR_STATE).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <span className="rounded-xl bg-white px-3 py-2.5 text-[11px] font-extrabold text-ink-mute ring-1 ring-ink/[0.08]">
          {rows.length} / {data.vendors.length} partners
        </span>
        <button type="button" onClick={exportRegistry} className="flex items-center gap-1.5 rounded-xl bg-plum-50 px-3 py-2.5 text-[11px] font-extrabold text-plum-700 ring-1 ring-plum-100">
          <Download size={13} /> Export filtered registry
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-ink/[0.02] p-10 text-center text-[13px] text-ink-mute">No partner matches that filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-ink/[0.08]">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead className="bg-ink/[0.025]">
              <tr className="border-b border-ink/[0.07] text-[9px] font-extrabold uppercase tracking-[0.12em] text-ink-mute">
                <th className="px-3 py-3">Partner ID / name</th>
                <th className="px-3 py-3">Contact</th>
                <th className="px-3 py-3">Market / trade</th>
                <th className="px-3 py-3">Lifecycle</th>
                <th className="px-3 py-3 text-right">Live / total cards</th>
                <th className="px-3 py-3 text-right">Uploads</th>
                <th className="px-3 py-3">Payout</th>
                <th className="px-3 py-3">Joined</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(v => {
                const cards = byVendor[v.id] ?? []
                const live = cards.filter(s => s.review_status === 'live' && s.is_active).length
                const docs = data.docs.filter(d => d.vendor_id === v.id)
                const payout = data.payouts.find(p => p.vendor_id === v.id)
                const payoutRoute = data.payoutAccounts.find(p => p.vendor_id === v.id)
                const payoutVerified = !!payoutRoute?.kyc_verified_at || !!payout?.verified_at
                const payoutExists = !!payoutRoute || !!payout
                const st = VENDOR_STATE[v.verification_status] ?? VENDOR_STATE.draft
                const dispatchable = v.is_verified && !!v.location && live > 0 && !v.suspended_at && v.accepting_jobs !== false
                return (
                  <tr key={v.id} onClick={() => onOpen(v)} className="cursor-pointer border-b border-ink/[0.055] last:border-0 hover:bg-plum-50/40">
                    <td className="px-3 py-3">
                      <button type="button" onClick={e => { e.stopPropagation(); onOpen(v) }} className="max-w-[250px] text-left">
                        <span className="block truncate text-[12px] font-extrabold text-ink">{v.business_name || 'Unnamed partner'}</span>
                        <span className="mt-1 block font-mono text-[9px] font-bold text-plum-700">{v.partner_code || 'Partner code pending'}</span>
                        <span className="mt-0.5 block max-w-[250px] truncate font-mono text-[9px] text-ink-mute" title={v.id}>{v.id}</span>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <p className="max-w-[170px] truncate text-[10.5px] font-semibold text-ink">{v.profiles?.email || 'Email not linked'}</p>
                      <p className="mt-0.5 text-[10px] text-ink-mute">{v.profiles?.phone || v.contact_phone || 'Phone not provided'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="max-w-[150px] truncate text-[10.5px] font-bold text-ink">{v.city || 'City missing'}{v.area ? ' · ' + v.area : ''}</p>
                      <p className="mt-0.5 max-w-[150px] truncate text-[10px] text-ink-mute">{v.category || 'Trade not set'}{v.pincode ? ' · ' + v.pincode : ''}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={'inline-flex rounded-full px-2 py-1 text-[9px] font-extrabold ' + st.cls}>{st.label}</span>
                      <span className={'mt-1 block text-[9px] font-extrabold ' + (dispatchable ? 'text-forest-700' : 'text-ink-mute')}>{dispatchable ? 'Dispatchable' : 'Not dispatchable'}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <p className="text-[13px] font-black tabular-nums text-ink">{live} <span className="font-medium text-ink-mute">/ {cards.length}</span></p>
                      <p className="mt-0.5 text-[9px] text-ink-mute">{cards.filter(s => s.review_status === 'under_review').length} under review</p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <p className="text-[12px] font-extrabold tabular-nums text-ink">{docs.length}</p>
                      <p className="mt-0.5 text-[9px] text-ink-mute">{docs.filter(d => ['approved','verified','accepted'].includes(String(d.status || '').toLowerCase())).length} accepted</p>
                    </td>
                    <td className="px-3 py-3">
                      <span title={payoutRoute ? 'Partner payout-route KYC' : 'Legacy payout details'} className={'rounded-full px-2 py-1 text-[9px] font-extrabold ' + (payoutVerified ? 'bg-forest-50 text-forest-800' : 'bg-amber-50 text-amber-800')}>{payoutVerified ? 'Verified' : payoutExists ? 'Unverified' : 'Not set'}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[10px] text-ink-mute">{v.created_at ? new Date(v.created_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-3 py-3"><ChevronRight size={14} className="text-ink-mute"/></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="border-t border-ink/[0.06] px-3 py-2.5 text-[9.5px] leading-relaxed text-ink-mute">Each row is keyed by the persistent vendor UUID. Open a record to inspect linked profile fields, every trade listing and service card, upload evidence, portfolio items, pricing packages, payout readiness, audit events and operator notes.</p>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   THE LISTING REVIEW QUEUE
   ══════════════════════════════════════════════════════════════════════

   The gap this console was built for. 112 promotes listings only at the
   moment a BUSINESS is approved, and nothing else in the product ever
   sets review_status = 'live'. So every listing added by an
   already-approved partner is stranded: no queue showed it and no button
   released it. A real caterer sat with an unread listing while this
   console showed her as approved.

   ── The write is checked, not assumed ───────────────────────────────
   trg_freeze_review_status (101) is a BEFORE UPDATE trigger that REVERTS
   review_status silently for a non-operator. The UPDATE still reports
   success. So every write here reads the row back and confirms the value
   actually changed -- the same check scripts/release-stuck-listings.mjs
   makes, for the same reason. */
function ListingReview({ data, onOpen }) {
  const toast = useToast()
  const [busy, setBusy] = useState(null)
  const pricingPending = [...pricing.trade, ...pricing.catering].filter(p => ['UNDER_REVIEW','ACTION_REQUIRED'].includes(p.status))
  const pricingUnderReview = pricingPending.filter(p => p.status === 'UNDER_REVIEW')
  const [sendingBack, setSendingBack] = useState(null)   // listing id
  const [note, setNote] = useState('')

  const vendorById = useMemo(
    () => Object.fromEntries(data.vendors.map(v => [v.id, v])), [data.vendors])

  /* Only listings whose partner is a real, non-synthetic business we
     actually hold. A row whose vendor was filtered out has nobody to
     approve it for. */
  /* ══════════════════════════════════════════════════════════════
     TWO THINGS NEED A HUMAN, NOT ONE
     ══════════════════════════════════════════════════════════════

     `under_review` is a listing nobody has read yet. But 117 added the
     other half: a partner can edit a LIVE listing's price, unit,
     minimum or specs, and until now nobody ever saw it. A listing
     approved at one price could be dispatching at another.

     The revised ones stay live and stay dispatchable while they wait --
     taking a listing down over a price typo would cost a partner a
     day's work and teach them never to update prices. They just need
     looking at. */
  const unread = data.services
    .filter(s => s.review_status === 'under_review' && vendorById[s.vendor_id])
  const revised = data.services
    .filter(s => s.review_status === 'live' && s.revised_at && vendorById[s.vendor_id]
      && (!s.reviewed_at || new Date(s.revised_at) > new Date(s.reviewed_at)))
  const queue = [...unread, ...revised]

  async function decide(listing, next, reviewNote = null) {
    setBusy(listing.id + next)
    try {
      const { data: row, error } = await supabase
        .from('vendor_services')
        .update({
          review_status: next,
          reviewed_at: new Date().toISOString(),
          ...(reviewNote === null ? {} : { review_note: reviewNote }),
        })
        .eq('id', listing.id)
        .select('id, review_status')
        .single()

      if (error) throw error
      /* Trust the row back, not the call. */
      if (row?.review_status !== next) {
        toast.error('That did not stick — the freeze trigger rejected this account. '
          + 'Your profile needs the admin or coordinator role.')
        return
      }
      toast.success(next === 'live'
        ? (listing.review_status === 'live'
            ? 'Read. The change is approved and it stays live.'
            : 'Live. The partner can be offered work now.')
        : 'Sent back with your note.')
      setSendingBack(null); setNote('')
      await data.refresh()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not update this listing.'))
    } finally {
      setBusy(null)
    }
  }

  if (!queue.length) {
    return (
      <div className="rounded-2xl bg-forest-50 p-10 text-center ring-1 ring-forest-200">
        <Check size={26} className="mx-auto text-forest-700" />
        <p className="mt-2 text-[14px] font-extrabold text-forest-900">Nothing waiting to be read</p>
        <p className="mt-1 text-[12.5px] text-forest-800">
          Every listing from a real partner has been read, and nothing has changed
          since it was approved.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-snug text-ink-mute">
        {unread.length > 0 && (
          <>
            <span className="font-extrabold text-ink">{unread.length} never read</span>
            {' '}— until one is made live its partner is offered nothing for that
            trade, however approved their business is.
          </>
        )}
        {unread.length > 0 && revised.length > 0 && <br />}
        {revised.length > 0 && (
          <>
            <span className="font-extrabold text-ink">{revised.length} changed since approval</span>
            {' '}— these are live and being dispatched right now on a version
            nobody has read. Approving one records that you have.
          </>
        )}
      </p>

      {queue.map(s => {
        const v = vendorById[s.vendor_id]
        const siblings = data.services.filter(
          x => x.vendor_id === s.vendor_id && x.review_status === 'under_review')
        const changed = s.review_status === 'live'
        return (
          <article key={s.id} className={`overflow-hidden rounded-2xl bg-white ring-1 ${changed ? 'ring-royal-200' : 'ring-amber-200'}`}>
            <header className={`flex items-center gap-2.5 px-4 py-2.5 text-white ${changed ? 'bg-royal-600' : 'bg-amber-500'}`}>
              <Clock size={15} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-extrabold leading-tight">{s.name}</span>
                <span className="block truncate text-[11.5px] font-semibold opacity-90">
                  {s.listing_code ? `${s.listing_code} · ` : ''}{s.category}
                  {changed
                    ? ` · LIVE, changed ${ago(s.revised_at)} — still being dispatched`
                    : ` · submitted ${ago(s.created_at)}`}
                </span>
              </span>
            </header>

            <div className="px-4 pb-3 pt-3">
              <button
                type="button" onClick={() => onOpen(v)}
                className="text-[13px] font-extrabold text-royal-700 underline"
              >
                {v.business_name}
              </button>
              <p className="mt-0.5 text-[11.5px] text-ink-mute">
                {[v.area, v.city, v.pincode].filter(Boolean).join(' · ') || 'No location'}
                {' · '}{v.is_verified ? 'business approved' : 'business NOT approved'}
              </p>

              <p className="mt-2 text-[13px] font-extrabold text-royal-700">
                {s.price === null ? 'No guide price' : `${money(s.price)}${s.unit ? ' / ' + String(s.unit).replace('per ', '') : ''}`}
              </p>
              {s.description && (
                <p className="mt-1 text-[12px] leading-snug text-ink-mute">{s.description}</p>
              )}

              <SpecsReadout specs={s.specs} />
              <Unanswered listing={s} />
            </div>

            {sendingBack === s.id ? (
              /* ── A rejection with no reason is a resubmission ────────
                 101's own note. The partner's card renders this note
                 under "What to change:", so it is the only thing that
                 stops them sending the identical listing back. */
              <div className="bg-rose-50 px-4 py-3">
                <label className="block text-[11.5px] font-extrabold uppercase tracking-wide text-rose-900">
                  What must change
                </label>
                <textarea
                  value={note} onChange={e => setNote(e.target.value)} rows={3} autoFocus
                  placeholder="Add a photograph of a mandap you have actually built — the two on the listing are stock images."
                  className="mt-1.5 w-full rounded-xl bg-white p-2.5 text-[12.5px] text-ink ring-1 ring-rose-200 focus:ring-2 focus:ring-rose-400"
                />
                <p className="mt-1 text-[11px] text-rose-800">
                  The partner reads this word for word on their own listing.
                </p>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button" onClick={() => { setSendingBack(null); setNote('') }}
                    className="rounded-full px-3 py-1.5 text-[12px] font-extrabold text-rose-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={note.trim().length < 10 || busy === s.id + 'rejected'}
                    onClick={() => decide(s, 'rejected', note.trim())}
                    className="rounded-full bg-rose-600 px-3 py-1.5 text-[12px] font-extrabold text-white disabled:opacity-50"
                  >
                    Send back
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 border-t border-ink/[0.06] text-[12.5px] font-extrabold">
                <button
                  type="button" onClick={() => setSendingBack(s.id)} disabled={!!busy}
                  className="flex items-center justify-center gap-1.5 border-r border-ink/[0.06] py-3 text-rose-700 transition active:bg-rose-50 disabled:opacity-50"
                >
                  <X size={14} /> Send back
                </button>
                <button
                  type="button" onClick={() => decide(s, 'live')} disabled={!!busy}
                  className="flex items-center justify-center gap-1.5 py-3 text-forest-700 transition active:bg-forest-50 disabled:opacity-50"
                >
                  {busy === s.id + 'live'
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Check size={14} />}
                  Make it live
                </button>
              </div>
            )}

            {/* The common case after a business is approved: they
                submitted four things at once and all four are waiting. */}
            {siblings.length > 1 && sendingBack !== s.id && (
              <button
                type="button" disabled={!!busy}
                onClick={async () => { for (const x of siblings) await decide(x, 'live') }}
                className="w-full border-t border-ink/[0.06] bg-forest-50/60 py-2.5 text-[12px] font-extrabold text-forest-800 disabled:opacity-50"
              >
                Make all {siblings.length} of {v.business_name}&rsquo;s waiting listings live
              </button>
            )}
          </article>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   WHAT THEY ACTUALLY CLAIMED
   ══════════════════════════════════════════════════════════════════════

   specs is the partner's own answers, and a coordinator cannot approve
   what they cannot read. The derived keys submit() writes are skipped —
   ids, resolved answers, signature — because they are machinery rather
   than claims. What is left is what the partner ticked. */
/* ══════════════════════════════════════════════════════════════════════
   WHAT THEY DID NOT ANSWER
   ══════════════════════════════════════════════════════════════════════

   The queue showed what a partner ticked and nothing about what they
   left blank, so a coordinator approving a listing was reading half of
   it and could not tell which half. A listing with two of nine
   questions answered looks, in a list of ticks, exactly like a complete
   one -- just shorter.

   completenessOf() already computes this and AddItemFlow's own stepper
   already uses it. Same function, so the gaps an operator sees are
   precisely the gaps the partner was shown. Two implementations of
   "answered" is how a coordinator ends up rejecting somebody for a
   question their app said was optional. */
function Unanswered({ listing }) {
  const groups = specsForTrade(listing.category) ?? []
  if (!groups.length) return null

  const { total, answered, missing } = completenessOf(groups, listing.specs ?? {})
  if (!missing.length) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-forest-700">
        <Check size={12} /> All {total} questions answered
      </p>
    )
  }

  return (
    <div className="mt-2 rounded-xl bg-amber-50/70 px-3 py-2 ring-1 ring-amber-200/60">
      <p className="text-[11.5px] font-extrabold text-amber-900">
        {answered} of {total} answered — {missing.length} left blank
      </p>
      <ul className="mt-1 space-y-0.5">
        {missing.map(m => (
          <li key={m.id} className="text-[11px] leading-snug text-amber-800">· {m.question}</li>
        ))}
      </ul>
      {/* Said plainly, because the instinct is to reject on it. A blank
          answer is not a reason to refuse a real business -- it is a
          reason to ask, and dispatch matches on the trade, not on
          whether every optional box was filled. */}
      <p className="mt-1.5 text-[10.5px] leading-snug text-amber-700">
        Blanks do not stop dispatch. Approve if the business is real; send back
        only if what is missing changes what they are claiming to do.
      </p>
    </div>
  )
}

const SPEC_SKIP = new Set([
  'answers', 'answers_unresolved', 'menu_ids', 'counter_ids', 'dish_ids',
  'signature', 'uploads', 'dishes_typed',
])

function SpecsReadout({ specs }) {
  const rows = Object.entries(specs ?? {})
    .filter(([k, v]) => !SPEC_SKIP.has(k) && v !== null && v !== '' &&
      !(Array.isArray(v) && v.length === 0))
  if (!rows.length) {
    return <p className="mt-2 text-[11.5px] italic text-ink-mute">No answers on this listing.</p>
  }
  return (
    <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-ink/[0.02] p-2.5">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">
            {k.replace(/^ops:/, '').replace(/[:_]/g, ' ')}
          </dt>
          <dd className="text-[11.5px] leading-snug text-ink">
            {Array.isArray(v) ? v.join(', ')
              : typeof v === 'object' ? JSON.stringify(v)
              : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   ASKING TO LEAVE
   ══════════════════════════════════════════════════════════════════════

   Migration 093 made this a reversible REQUEST rather than a delete:
   `closure_requested_at` and `closure_reason` on the vendor row, with an
   index for exactly this queue. The partner side has been built since
   (PartnerAccount's DangerZone), and nothing has ever read it — a
   partner could ask to close their account and no operator would learn
   of it.

   ── What must be looked at before agreeing ──────────────────────────
   Accepted work that has not happened yet. Closing an account with a
   family expecting somebody on Saturday is the failure this screen
   exists to prevent, so the count is shown next to the button rather
   than a page away. */
function ClosureQueue({ data, byVendor, onOpen }) {
  const toast = useToast()
  const [busy, setBusy] = useState(null)

  const queue = data.vendors
    .filter(v => v.closure_requested_at)
    .sort((a, b) => new Date(a.closure_requested_at) - new Date(b.closure_requested_at))

  async function keepOpen(v) {
    setBusy(v.id)
    try {
      const { error } = await supabase.from('vendors')
        .update({ closure_requested_at: null, closure_reason: null })
        .eq('id', v.id)
      if (error) throw error
      toast.success('Kept open. Their account is unchanged.')
      await data.refresh()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not clear that request.'))
    } finally { setBusy(null) }
  }

  /* Suspend rather than delete. match_partners tests is_verified, so a
     suspended partner is offered nothing from the next dispatch — and
     the row, their listings and their history all survive, which is what
     makes this reversible if they change their mind. */
  async function close(v) {
    setBusy(v.id)
    try {
      const { data: res, error } = await supabase.rpc('set_vendor_verification', {
        p_vendor_id: v.id, p_status: 'suspended',
        p_note: v.closure_reason ? `Closed at the partner's request: ${v.closure_reason}` : "Closed at the partner's request.",
      })
      if (error) throw error
      if (!res?.ok) { toast.error(`Could not close this account (${res?.reason ?? 'unknown'}).`); return }
      toast.success('Closed. They receive no further work.')
      await data.refresh()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not close this account.'))
    } finally { setBusy(null) }
  }

  if (!queue.length) {
    return (
      <div className="rounded-2xl bg-ink/[0.02] p-10 text-center">
        <p className="text-[13px] text-ink-mute">Nobody has asked to close their account.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2.5">
      {queue.map(v => {
        const rows = byVendor[v.id] ?? []
        const live = rows.filter(s => s.review_status === 'live' && s.is_active).length
        return (
          <li key={v.id} className="rounded-2xl bg-white p-4 ring-1 ring-amber-300">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <button
                  type="button" onClick={() => onOpen(v)}
                  className="text-[14px] font-extrabold text-ink underline"
                >
                  {v.business_name}
                </button>
                <p className="mt-0.5 text-[11.5px] text-ink-mute">
                  Asked {ago(v.closure_requested_at)} · {live} live listing{live === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {v.closure_reason && (
              <p className="mt-2.5 rounded-xl bg-ink/[0.03] px-3 py-2 text-[12px] leading-snug text-ink">
                <span className="font-extrabold">Their reason: </span>{v.closure_reason}
              </p>
            )}

            {live > 0 && (
              <p className="mt-2 text-[11.5px] font-semibold leading-snug text-amber-800">
                Check for accepted work before closing — a booking already taken is a
                family expecting somebody.
              </p>
            )}

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button" onClick={() => keepOpen(v)} disabled={busy === v.id}
                className="rounded-full bg-white px-3.5 py-2 text-[12px] font-extrabold text-ink-soft ring-1 ring-ink/[0.1] disabled:opacity-50"
              >
                Keep open
              </button>
              <button
                type="button" onClick={() => close(v)} disabled={busy === v.id}
                className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-2 text-[12px] font-extrabold text-white disabled:opacity-50"
              >
                {busy === v.id && <Loader2 size={13} className="animate-spin" />}
                Close the account
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   ONE PARTNER, EVERYTHING WE HOLD
   ══════════════════════════════════════════════════════════════════════

   Nine tables' worth of a partner's life, on one sheet, in the order
   somebody actually asks it:

     can they be offered work   the only question that matters
     who are they               name, contact, where
     what did they list         every row, its state, what they claimed
     who says they are real     identity documents
     can they be paid           payout method and its verification

   `partner_readiness` is recomputed here rather than fetched. The RPC is
   per-vendor and this drawer already holds every row it reads, so a
   round trip would buy nothing and add a spinner to a sheet that is
   otherwise instant. */
function PartnerDrawer({ vendor: v, services, tradeListings = [], docs, payout, payoutAccount = null, payoutsReadable = true, work = [], pricing = { trade: [], catering: [] }, audit = [], notes = [], activityEvents = [], verificationEvents = [], bookingLines = [], dispatchOffers = [], payoutClaims = [], adjustments = [], subscriptions = [], referrals = [], referralInvites = [], actorId, onClose, onChanged }) {
  const toast = useToast()
  const [busy, setBusy] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [noteKind, setNoteKind] = useState('internal')
  const [noteBusy, setNoteBusy] = useState(false)

  const live = services.filter(s => s.review_status === 'live' && s.is_active)
  const readiness = {
    approved:     v.is_verified,
    located:      !!v.location,
    has_service:  services.some(s => s.is_active),
    listing_live: live.length > 0,
    signed_terms: !!v.terms_accepted_at,
    /* Unknown reads as false here, which is the safe direction — but
       the section below says which it is rather than leaving a tick
       looking like a finding. */
    can_be_paid:  !!payout?.verified_at,
  }
  const dispatchable = readiness.approved && readiness.located && readiness.listing_live
  const pricingPending = [...(pricing.trade ?? []), ...(pricing.catering ?? [])]
    .filter(p => ['UNDER_REVIEW','ACTION_REQUIRED'].includes(p.status))
  const pricingUnderReview = pricingPending.filter(p => p.status === 'UNDER_REVIEW')
  const relatedLineIds = new Set(dispatchOffers.map(o => o.line_id))
  const partnerLines = bookingLines.filter(l => relatedLineIds.has(l.id) || payoutClaims.some(p => p.line_id === l.id) || adjustments.some(a => a.line_id === l.id))

  async function saveLifecycleNote() {
    const body = noteText.trim()
    if (!body || !actorId || noteBusy) return
    setNoteBusy(true)
    try {
      const { error } = await supabase.from('admin_lifecycle_notes').insert({
        target_type: 'partner', vendor_id: v.id, note_kind: noteKind, body, created_by: actorId,
      })
      if (error) throw error
      setNoteText('')
      toast.success('Partner lifecycle note saved.')
      await onChanged()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not save this lifecycle note.'))
    } finally { setNoteBusy(false) }
  }

  async function approveApplication() {
    setBusy('approve-application')
    try {
      const { data: res, error } = await supabase.rpc('approve_sambramo_partner_application', {
        p_vendor_id: v.id,
        p_note: null,
      })
      if (error) throw error
      if (!res?.ok) {
        if (res?.reason === 'not_permitted') throw new Error('You do not have permission to approve partner applications.')
        if (res?.reason === 'missing_requirements') throw new Error('This application is missing a required onboarding section.')
        throw new Error('Partner application approval could not be completed.')
      }
      const parts = ['Partner application approved']
      if (res.listings_made_live) parts.push(res.listings_made_live + ' listing' + (res.listings_made_live === 1 ? ' live' : 's live'))
      if (res.pricing_made_live) parts.push(res.pricing_made_live + ' pricing package' + (res.pricing_made_live === 1 ? ' live' : 's live'))
      toast.success(parts.join(' · '))
      await onChanged()
      onClose()
    } catch (err) {
      toast.error(friendlyError(err, 'Application approval was not completed. No partial approval was applied.'))
    } finally { setBusy(null) }
  }
  async function setStatus(status) {
    setBusy(status)
    try {
      const { data: res, error } = await supabase.rpc('set_vendor_verification', {
        p_vendor_id: v.id, p_status: status, p_note: null,
      })
      if (error) throw error
      if (!res?.ok) {
        toast.error(res?.reason === 'not_permitted'
          ? 'You do not have permission to approve partners.'
          : `Could not update this partner (${res?.reason ?? 'unknown'}).`)
        return
      }
      /* 112 made approval promote every under_review listing in the same
         act, and returns how many. Saying the number is the difference
         between "approved" and knowing the partner can now be offered
         work. */
      const n = res.listings_made_live ?? 0
      toast.success(status === 'approved' && n > 0
        ? `Approved, and ${n} listing${n === 1 ? ' is' : 's are'} now live.`
        : `Partner ${status}.`)
      await onChanged()
      onClose()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not update this partner.'))
    } finally { setBusy(null) }
  }

  return (
    /* Fixed, and with NO transformed ancestor. An entrance animation on a
       parent breaks position:fixed outright — an identity transform is
       still a containing block — and the sheet renders off-screen. */
    /* FULL WORKSPACE, not a drawer.
       This was `max-w-lg` pinned to the right: a 512px column holding
       every document, package, payout and audit row a reviewer needs to
       decide on. On a 1920px monitor three quarters of the screen was
       dimmed backdrop while the evidence scrolled in a strip. A reviewer
       who cannot see the evidence approves on faith.
       It now fills the viewport with a small inset, so the dialog still
       reads as a layer above the console rather than a navigation. */
    <div className="fixed inset-0 z-50 flex justify-center bg-ink/40 p-0 sm:p-4 lg:p-6" onClick={onClose}>
      <aside
        onClick={e => e.stopPropagation()}
        className="flex h-full w-full max-w-[1600px] flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-ink/[0.07] bg-white px-5 py-4 lg:px-7">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[17px] font-extrabold text-ink">{v.business_name}</h2>
            {v.partner_code && (
              /* select-all so an operator can copy it into a message
                 without catching the surrounding words. */
              <p className="mt-0.5 select-all font-mono text-[12px] font-bold tracking-tight text-royal-700">
                {v.partner_code}
              </p>
            )}
            <p className="mt-0.5 truncate text-[12px] text-ink-mute">
              {[v.area, v.city, v.pincode].filter(Boolean).join(' · ') || 'No location on file'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 rounded-full p-1.5 text-ink-mute hover:bg-ink/[0.05]">
            <X size={18} />
          </button>
        </header>

        {/* The body owns the scroll now. min-h-0 is load-bearing: a flex
            child defaults to min-height:auto and refuses to shrink, so
            without it the panel grows past the viewport and the page
            scrolls instead of the evidence. */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 lg:px-7">
          {/* The headline answer. */}
          <div className={`rounded-2xl p-3.5 ring-1 ${
            dispatchable ? 'bg-forest-50 ring-forest-200' : 'bg-amber-50 ring-amber-200'
          }`}>
            <p className={`text-[14px] font-extrabold ${dispatchable ? 'text-forest-900' : 'text-amber-900'}`}>
              {dispatchable ? 'Being offered work' : 'Not being offered work'}
            </p>
            <p className={`mt-0.5 text-[12px] leading-snug ${dispatchable ? 'text-forest-800' : 'text-amber-800'}`}>
              {dispatchable
                ? 'Approved, located, and at least one listing is live.'
                : 'match_partners needs an approved business, a location, and a live listing. The ticks below show which is missing.'}
            </p>
            <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
              {Object.entries(readiness).map(([k, ok]) => (
                <li key={k} className="flex items-center gap-1.5 text-[11.5px] font-semibold">
                  {ok ? <Check size={12} className="shrink-0 text-forest-700" />
                      : <X size={12} className="shrink-0 text-ink-mute" />}
                  <span className={ok ? 'text-ink' : 'text-ink-mute'}>{k.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          </div>

          {v.closure_requested_at && (
            <div className="rounded-2xl bg-rose-50 p-3.5 ring-1 ring-rose-200">
              <p className="text-[13px] font-extrabold text-rose-900">Has asked to close this account</p>
              <p className="mt-0.5 text-[12px] text-rose-800">
                {ago(v.closure_requested_at)}{v.closure_reason ? ` — ${v.closure_reason}` : ''}
              </p>
            </div>
          )}

          <Section title="Partner identifiers & contact">
            <Row icon={FileText} label="Partner UUID" value={v.id} />
            <Row icon={FileText} label="Login profile UUID" value={v.profile_id ?? 'No linked login profile'} />
            <Row icon={ShieldCheck} label="Partner code" value={v.partner_code ?? 'Not assigned'} />
            <Row icon={Mail} label="Account full name" value={v.profiles?.full_name ?? '—'} />
            <Row icon={Mail} label="Account email" value={v.profiles?.email ?? '—'} />
            <Row icon={Phone} label="Account phone" value={v.profiles?.phone ?? '—'} />
            <Row icon={Phone} label="Business phone" value={v.contact_phone ?? '—'} />
            <Row icon={Phone} label="WhatsApp" value={v.whatsapp_phone ?? '—'} />
            <Row icon={Calendar} label="Created" value={v.created_at ? new Date(v.created_at).toLocaleString('en-IN') : '—'} />
            <Row icon={Calendar} label="Last updated" value={v.updated_at ? new Date(v.updated_at).toLocaleString('en-IN') : '—'} />
            <Row icon={ShieldCheck} label="Terms" value={v.terms_accepted_at ? 'Signed ' + (v.terms_version || '') + ' · ' + new Date(v.terms_accepted_at).toLocaleDateString('en-IN') : 'Not signed'} />
            <Row icon={FileText} label="Profile role" value={v.profiles?.role ?? 'No linked profile'} />
          </Section>

          <Section title="Business profile & service coverage">
            <Row icon={Layers} label="Business name" value={v.business_name} />
            <Row icon={FileText} label="Business category" value={v.category ?? 'Not set'} />
            <Row icon={FileText} label="Description" value={v.description ?? 'Not provided'} />
            <Row icon={MapPin} label="Formatted address" value={(v.formatted_address || [v.area, v.city, v.state, v.pincode].filter(Boolean).join(', ')) || 'Not provided'} />
            <Row icon={MapPin} label="Location capture" value={v.location_source ? v.location_source + (v.location_confirmed_at ? ' · confirmed ' + new Date(v.location_confirmed_at).toLocaleDateString('en-IN') : '') : 'Source not recorded'} />
            <Row icon={MapPin} label="Service radius" value={v.service_radius_km ? String(v.service_radius_km) + ' km' : 'Not set'} />
            <Row icon={MapPin} label="Travel scope" value={v.travel_scope ?? 'Not set'} />
            <Row icon={MapPin} label="Service areas" value={Array.isArray(v.service_areas) && v.service_areas.length ? v.service_areas.join(', ') : 'Not listed'} />
            <Row icon={FileText} label="Website" value={v.website_url ?? '—'} />
            <Row icon={FileText} label="Instagram" value={v.instagram_url ?? '—'} />
            <Row icon={Calendar} label="Years experience / active" value={String(v.years_experience ?? '—') + ' / ' + String(v.years_active ?? '—')} />
            <Row icon={IndianRupee} label="Price guide" value={v.starting_price != null ? money(v.starting_price) : [v.price_range_min, v.price_range_max].some(x => x != null) ? String(v.price_range_min ?? '—') + ' – ' + String(v.price_range_max ?? '—') : 'Not provided'} />
          </Section>

          <Section title="Operations, availability & onboarding">
            <Row icon={ShieldCheck} label="Verification state" value={v.verification_status ?? 'Unknown'} />
            <Row icon={ShieldCheck} label="Legacy status" value={v.status ?? 'Unknown'} />
            <Row icon={ShieldCheck} label="Subscription plan" value={v.subscription_plan ?? '—'} />
            <Row icon={ShieldCheck} label="Featured" value={v.is_featured ? 'Yes' : 'No'} />
            <Row icon={Calendar} label="Accepting bookings" value={v.accepting_bookings ? 'Yes' : 'No'} />
            <Row icon={Calendar} label="Accepting jobs" value={v.accepting_jobs ? 'Yes' : 'No'} />
            <Row icon={Calendar} label="Working hours" value={v.working_start && v.working_end ? String(v.working_start).slice(0, 5) + '–' + String(v.working_end).slice(0, 5) : 'Not set'} />
            <Row icon={Calendar} label="Lead time / max events" value={String(v.lead_time_days ?? '—') + ' days / ' + String(v.max_events_per_day ?? '—') + ' per day'} />
            <Row icon={Calendar} label="Daily capacity" value={v.daily_capacity ?? '—'} />
            <Row icon={Calendar} label="Weekly days off" value={Array.isArray(v.weekly_days_off) && v.weekly_days_off.length ? v.weekly_days_off.join(', ') : 'Not set'} />
            <Row icon={ShieldCheck} label="Onboarding state" value={v.onboarding_status ?? 'Not recorded'} />
            <Row icon={ShieldCheck} label="Current setup step" value={v.current_onboarding_step ?? '—'} />
            <Row icon={ShieldCheck} label="Completed setup steps" value={Array.isArray(v.completed_steps) && v.completed_steps.length ? v.completed_steps.join(', ') : 'None recorded'} />
            <Row icon={Calendar} label="Calendar reviewed through" value={v.calendar_reviewed_through ?? '—'} />
            <Row icon={FileText} label="Acquisition source" value={v.heard_from_detail || v.heard_from || 'Not recorded'} />
            {(v.verification_note || v.review_note || v.rejection_reason || v.suspended_reason) && (
              <div className="space-y-2 rounded-xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-950">
                {v.verification_note && <p><b>Verification note:</b> {v.verification_note}</p>}
                {v.review_note && <p><b>Review note:</b> {v.review_note}</p>}
                {v.rejection_reason && <p><b>Rejection reason:</b> {v.rejection_reason}</p>}
                {v.suspended_reason && <p><b>Suspension reason:</b> {v.suspended_reason}</p>}
              </div>
            )}
          </Section>

          <Section title={`Trade listings (${tradeListings.length})`}>
            {tradeListings.length ? tradeListings.map(t => (
              <article key={t.id} className="rounded-xl bg-ink/[0.025] p-3 ring-1 ring-ink/[0.05]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-plum-50 px-2 py-0.5 text-[10px] font-extrabold text-plum-700">{String(t.status || 'unknown').replace(/_/g, ' ')}</span>
                  <span className="font-mono text-[9.5px] text-ink-mute">{t.trade_id || t.id}</span>
                </div>
                <p className="mt-1.5 text-[12.5px] font-extrabold text-ink">{t.trade}</p>
                <p className="mt-1 break-words font-mono text-[9px] text-ink-mute">Listing UUID · {t.id}</p>
                <p className="mt-1 text-[10.5px] text-ink-mute">Submitted {t.submitted_at ? new Date(t.submitted_at).toLocaleDateString('en-IN') : '—'} · Reviewed {t.reviewed_at ? new Date(t.reviewed_at).toLocaleDateString('en-IN') : 'Not reviewed'}</p>
                {t.review_note && <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10.5px] text-amber-900">Review note: {t.review_note}</p>}
              </article>
            )) : <p className="text-[12px] italic text-ink-mute">No partner trade rows are linked to this business.</p>}
          </Section>

          <Section title={'Dispatch & booking history (' + partnerLines.length + ' lines · ' + dispatchOffers.length + ' offers)'}>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-ink/[0.025] p-2.5"><p className="text-[8px] font-extrabold uppercase text-ink-mute">Offers</p><p className="mt-1 text-[17px] font-black text-ink">{dispatchOffers.length}</p></div>
              <div className="rounded-xl bg-ink/[0.025] p-2.5"><p className="text-[8px] font-extrabold uppercase text-ink-mute">Accepted</p><p className="mt-1 text-[17px] font-black text-ink">{dispatchOffers.filter(o => String(o.status).toLowerCase() === 'accepted').length}</p></div>
              <div className="rounded-xl bg-ink/[0.025] p-2.5"><p className="text-[8px] font-extrabold uppercase text-ink-mute">Expired</p><p className="mt-1 text-[17px] font-black text-ink">{dispatchOffers.filter(o => String(o.status).toLowerCase() === 'expired').length}</p></div>
            </div>
            <p className="mt-3 text-[10.5px] leading-relaxed text-ink-mute">Partner offers and their linked booking lines. This section intentionally shows operational states and settlement milestones, not customer contact data.</p>
            {dispatchOffers.length ? dispatchOffers.map(o => {
              const line = partnerLines.find(l => l.id === o.line_id) || bookingLines.find(l => l.id === o.line_id)
              return (
                <article key={o.id} className="mt-2 rounded-xl bg-ink/[0.025] p-3 ring-1 ring-ink/[0.05]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-extrabold text-ink">{line?.service_name || line?.trade || 'Partner offer'}</p>
                      <p className="mt-0.5 break-all font-mono text-[8.5px] text-ink-mute">Offer {o.id}</p>
                      <p className="mt-0.5 break-all font-mono text-[8.5px] text-ink-mute">Line {o.line_id}</p>
                    </div>
                    <span className={'shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold ' + (String(o.status).toLowerCase() === 'accepted' ? 'bg-forest-50 text-forest-800' : String(o.status).toLowerCase() === 'declined' || String(o.status).toLowerCase() === 'cancelled' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800')}>{String(o.status || 'unknown').replace(/_/g,' ')}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[9.5px] text-ink-mute">
                    <p>Offer amount · {o.partner_amount_paise != null ? money(Number(o.partner_amount_paise) / 100) : '—'}</p>
                    <p>Distance · {o.distance_m != null ? (Number(o.distance_m) / 1000).toFixed(1) + ' km' : '—'}</p>
                    <p>Wave · {o.wave ?? '—'}</p><p>Line state · {String(line?.status || 'unknown').replace(/_/g,' ')}</p>
                    <p>Offered · {o.offered_at ? new Date(o.offered_at).toLocaleString('en-IN') : '—'}</p>
                    <p>Responded · {o.responded_at ? new Date(o.responded_at).toLocaleString('en-IN') : 'No response'}</p>
                    <p>Accepted · {o.accepted_at ? new Date(o.accepted_at).toLocaleString('en-IN') : '—'}</p>
                    <p>Line settled · {line?.settled_at ? new Date(line.settled_at).toLocaleString('en-IN') : '—'}</p>
                  </div>
                  {(o.decline_reason || line?.cancellation_reason) && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[10px] leading-relaxed text-amber-900">{o.decline_reason ? 'Offer note: ' + o.decline_reason : ''}{o.decline_reason && line?.cancellation_reason ? ' · ' : ''}{line?.cancellation_reason ? 'Line cancellation: ' + line.cancellation_reason : ''}</p>}
                </article>
              )
            }) : <p className="mt-2 rounded-xl bg-ink/[0.025] p-3 text-[11px] text-ink-mute">No dispatch offers are linked to this partner yet.</p>}
            {partnerLines.filter(l => !dispatchOffers.some(o => o.line_id === l.id)).map(l => (
              <article key={l.id} className="mt-2 rounded-xl bg-ink/[0.025] p-3"><p className="text-[11px] font-extrabold">{l.service_name || l.trade || 'Booking line'} · {String(l.status || 'unknown').replace(/_/g,' ')}</p><p className="mt-1 break-all font-mono text-[8.5px] text-ink-mute">Line ID {l.id} · Request {l.request_id}</p><p className="mt-1 text-[10px] text-ink-mute">Partner amount · {l.partner_amount_paise != null ? money(Number(l.partner_amount_paise)/100) : '—'} · Settled {l.settled_at ? new Date(l.settled_at).toLocaleString('en-IN') : '—'}</p></article>
            ))}
          </Section>

          <Section title={`What they list (${services.length})`}>
            {services.length === 0 ? (
              <p className="text-[12px] italic text-ink-mute">
                Nothing listed. An approved partner with no listing is offered nothing.
              </p>
            ) : services.map(s => {
              const st = LISTING_STATE[s.review_status] ?? LISTING_STATE.under_review
              const Icon = st.icon
              return (
                <div key={s.id} className="rounded-xl bg-ink/[0.02] p-3">
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${st.cls}`}>
                      <Icon size={10} /> {st.label}
                    </span>
                    {!s.is_active && (
                      <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10.5px] font-extrabold text-ink-mute">
                        Hidden by them
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[13px] font-extrabold text-ink">{s.name}</p>
                  <p className="text-[11.5px] text-ink-mute">
                    {s.listing_code ? <span className="select-all font-mono font-bold text-royal-700">{s.listing_code}</span> : null}
                    {s.listing_code ? ' · ' : ''}
                    {s.category} · {s.price === null ? 'no guide price' : money(s.price)}
                  </p>
                  {s.review_status === 'rejected' && s.review_note && (
                    <p className="mt-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11.5px] leading-snug text-rose-900">
                      <span className="font-extrabold">Sent back: </span>{s.review_note}
                    </p>
                  )}
                  <SpecsReadout specs={s.specs} />
                </div>
              )
            })}
          </Section>

          {/* 110's own header says the photographs are the evidence a
              listing is reviewed AGAINST. Reviewing a claim to build
              mandaps without looking at the mandaps they have built is
              reviewing the sentence, not the work. */}
          <Section title={`Their work (${work.length})`}>
            {work.length === 0 ? (
              <p className="text-[12px] italic text-ink-mute">
                Nothing uploaded. There is nothing to check a claim against.
              </p>
            ) : (
              <WorkStrip work={work} />
            )}
          </Section>

          <Section title={`Identity & compliance uploads (${docs.length})`}>
            {docs.length === 0 ? (
              <p className="text-[12px] italic text-ink-mute">No partner documents are linked to this record yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl ring-1 ring-ink/[0.07]">
                <table className="w-full min-w-[750px] text-left">
                  <thead><tr className="border-b border-ink/[0.07] bg-ink/[0.025] text-[9px] font-extrabold uppercase tracking-wide text-ink-mute">
                    <th className="px-2.5 py-2">Upload / requirement</th><th className="px-2.5 py-2">Review & provider</th><th className="px-2.5 py-2">Evidence checks</th><th className="px-2.5 py-2">Dates</th><th className="px-2.5 py-2">File</th>
                  </tr></thead>
                  <tbody>{docs.map(d => (
                    <tr key={d.id} className="border-b border-ink/[0.055] last:border-0 align-top">
                      <td className="px-2.5 py-2.5">
                        <p className="text-[11px] font-extrabold text-ink">{KIND_LABEL[d.kind] ?? d.kind}</p>
                        <p className="mt-0.5 max-w-[180px] break-words text-[10px] text-ink-soft">{d.file_name || 'File name not recorded'}</p>
                        <p className="mt-1 font-mono text-[8.5px] text-ink-mute" title={d.id}>Doc ID · {d.id}</p>
                        <p className="mt-0.5 text-[9px] text-ink-mute">Requirement · {d.requirement_id || '—'}{d.listing_id ? ' · listing ' + d.listing_id : ''}</p>
                        {d.number_last4 && <p className="mt-0.5 text-[9px] font-semibold text-ink-mute">Masked reference ends {d.number_last4}</p>}
                        {d.holder_name && <p className="mt-0.5 text-[9px] text-ink-mute">Holder name · {d.holder_name}</p>}
                      </td>
                      <td className="px-2.5 py-2.5">
                        <span className={'inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold ' + (['approved','verified','accepted'].includes(String(d.status || '').toLowerCase()) ? 'bg-forest-50 text-forest-800' : ['rejected','failed'].includes(String(d.status || '').toLowerCase()) ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800')}>{String(d.status || 'unknown').replace(/_/g,' ')}</span>
                        <p className="mt-1 text-[9px] text-ink-mute">Provider · {String(d.provider_status || 'not recorded').replace(/_/g,' ')}</p>
                        {d.provider_name && <p className="mt-0.5 text-[9px] text-ink-mute">{d.provider_name}{d.provider_ref ? ' · ref ' + d.provider_ref : ''}</p>}
                        {d.review_note && <p className="mt-1 max-w-[180px] whitespace-normal text-[9px] leading-relaxed text-rose-700">Review note: {d.review_note}</p>}
                        {d.expires_on && <p className="mt-1 text-[9px] text-ink-mute">Expires {d.expires_on}</p>}
                      </td>
                      <td className="px-2.5 py-2.5">
                        <div className="space-y-1 text-[9px] text-ink-mute">
                          <p>Checksum · {d.checksum_ok == null ? 'Unknown' : d.checksum_ok ? 'Pass' : 'Fail'}</p>
                          <p>Name match · {d.name_match || 'Unknown'}</p><p>Face match · {d.face_match || 'Unknown'}</p>
                          <p>Detected · {d.detected_type || 'Unknown'}{d.detected_confidence != null ? ' (' + Math.round(Number(d.detected_confidence) * (Number(d.detected_confidence) <= 1 ? 100 : 1)) + '%)' : ''}</p>
                          {d.issuing_authority && <p>Issuer · {d.issuing_authority}</p>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2.5 text-[9px] text-ink-mute">
                        <p>Uploaded {d.uploaded_at ? new Date(d.uploaded_at).toLocaleString('en-IN') : 'Unknown'}</p>
                        <p className="mt-1">Checked {d.checked_at ? new Date(d.checked_at).toLocaleString('en-IN') : 'Not checked'}</p>
                        <p className="mt-1">Reviewed {d.reviewed_at ? new Date(d.reviewed_at).toLocaleString('en-IN') : 'Not reviewed'}</p>
                        {d.issue_date && <p className="mt-1">Issued {d.issue_date}</p>}
                      </td>
                      <td className="px-2.5 py-2.5"><DocLink path={d.storage_path} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title={`Pricing packages & version history (${(pricing.trade ?? []).length + (pricing.catering ?? []).length})`}>
            {!(pricing.trade?.length || pricing.catering?.length) ? (
              <p className="text-[12px] italic text-ink-mute">No trade or catering pricing packages are recorded for this partner.</p>
            ) : [...(pricing.trade ?? []).map(p => ({ ...p, packageType: 'Trade', payload: { commercial_inputs: p.commercial_inputs, trade_inputs: p.trade_inputs } })), ...(pricing.catering ?? []).map(p => ({ ...p, packageType: 'Catering', payload: { rate_bands: p.rate_bands } }))].sort((a,b) => new Date(b.submitted_at || b.updated_at || b.created_at || 0) - new Date(a.submitted_at || a.updated_at || a.created_at || 0)).map(p => (
              <article key={p.packageType + ':' + p.id} className="rounded-xl bg-ink/[0.025] p-3 ring-1 ring-ink/[0.05]">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-plum-700"><IndianRupee size={14}/></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-extrabold text-ink">{p.name}</p>
                    <p className="mt-0.5 text-[10px] text-ink-mute">{p.packageType} · {p.parent_package_id ? 'Revision v' + (p.revision_round || '—') : 'Initial package'} · {String(p.status || 'unknown').replace(/_/g,' ')}</p>
                    <p className="mt-1 break-all font-mono text-[8.5px] text-ink-mute">Package ID · {p.id}</p>
                    <p className="mt-0.5 break-all font-mono text-[8.5px] text-ink-mute">Service ID · {p.vendor_service_id || '—'}</p>
                    <p className="mt-1 text-[9.5px] text-ink-mute">Submitted {p.submitted_at ? new Date(p.submitted_at).toLocaleDateString('en-IN') : '—'} · Reviewed {p.reviewed_at ? new Date(p.reviewed_at).toLocaleDateString('en-IN') : '—'}</p>
                    {p.review_note && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[10px] text-amber-900">Review note: {p.review_note}</p>}
                    <details className="mt-2"><summary className="cursor-pointer text-[10px] font-bold text-plum-700">Inspect saved pricing inputs</summary><pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-white p-2 text-[9px] leading-relaxed text-ink-soft">{JSON.stringify(p.payload, null, 2)}</pre></details>
                  </div>
                </div>
              </article>
            ))}
            {pricingPending.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-[10.5px] font-bold text-amber-900">{pricingPending.length} package revision(s) are awaiting review. Use the Pricing review tab to make the formal decision.</p>}
          </Section>

          <Section title="Getting paid">
            {!payoutsReadable ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-[12px] leading-snug text-amber-900">
                <span className="font-extrabold">Cannot read payout details. </span>
                That is a permission, not an absence — migration 114 has not been
                applied, so this says nothing about whether they can be paid.
              </p>
            ) : !payout ? (
              <p className="text-[12px] italic text-ink-mute">
                No payout method. They cannot be paid for completed work.
              </p>
            ) : (
              <>
                <Row icon={IndianRupee} label="Method"
                     value={payout.method === 'upi' ? `UPI · ${payout.upi_id ?? '—'}`
                            : `Bank · ${destinationShort(payout)}`} />
                <Row icon={ShieldCheck} label="Verified"
                     value={payout.verified_at ? payout.verified_at.slice(0, 10) : 'Not verified'} />
              </>
            )}
          </Section>

          {/* ── The business decision ────────────────────────────────
              Always the RPC. 078 derives `status` and `is_verified` from
              `verification_status` by trigger, so writing a derived
              column shows a success toast over a no-op — that is exactly
              how this screen used to lie. */}
          <Section title={'Payout routing & KYC'}>
            {!payoutAccount ? (
              <p className="text-[12px] italic text-ink-mute">No partner payout-route account is recorded. Check whether this partner still uses the older payout details form below.</p>
            ) : (
              <>
                <Row icon={ShieldCheck} label="Payout KYC state" value={payoutAccount.kyc_status || 'Not recorded'} />
                <Row icon={ShieldCheck} label="KYC verified" value={payoutAccount.kyc_verified_at ? new Date(payoutAccount.kyc_verified_at).toLocaleString('en-IN') : 'Not verified'} />
                <Row icon={Layers} label="Bank" value={payoutAccount.bank_name || '—'} />
                <Row icon={Layers} label="Account holder" value={payoutAccount.account_holder || '—'} />
                <Row icon={Layers} label="Account ending" value={payoutAccount.account_last4 ? '•••• ' + payoutAccount.account_last4 : 'Not captured'} />
                <Row icon={Layers} label="IFSC" value={payoutAccount.ifsc || '—'} />
                <Row icon={ShieldCheck} label="Payment route status" value={payoutAccount.route_status || 'Not provisioned'} />
                <Row icon={FileText} label="Route updated" value={payoutAccount.route_updated_at ? new Date(payoutAccount.route_updated_at).toLocaleString('en-IN') : '—'} />
                <Row icon={FileText} label="Provider account ID" value={payoutAccount.route_account_id || '—'} />
                <Row icon={FileText} label="Provider product / stakeholder" value={[payoutAccount.route_product_id, payoutAccount.route_stakeholder_id].filter(Boolean).join(' / ') || '—'} />
                {payoutAccount.kyc_note && <p className="rounded-xl bg-amber-50 p-3 text-[10.5px] leading-relaxed text-amber-900">KYC note: {payoutAccount.kyc_note}</p>}
                {payoutAccount.route_requirements && <details className="mt-2"><summary className="cursor-pointer text-[10px] font-bold text-plum-700">Inspect provider requirements</summary><pre className="mt-2 max-h-52 overflow-auto rounded-lg bg-ink/[0.025] p-2 text-[9px] leading-relaxed text-ink-soft">{JSON.stringify(payoutAccount.route_requirements, null, 2)}</pre></details>}
              </>
            )}
            <p className="mt-3 text-[9.5px] leading-relaxed text-ink-mute">Sensitive PAN, full bank account number and UPI destination values are intentionally not copied into audit logs. Route status and masked account metadata are shown for operational readiness.</p>
          </Section>

          <Section title={'Payout claims & settlement history (' + payoutClaims.length + ')'}>
            {payoutClaims.length ? payoutClaims.map(p => (
              <article key={p.id} className="rounded-xl bg-ink/[0.025] p-3 ring-1 ring-ink/[0.05]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1"><p className="text-[11.5px] font-extrabold text-ink">{money(Number(p.amount_paise || 0) / 100)} · {String(p.method || 'method unknown').replace(/_/g,' ')}</p><p className="mt-0.5 break-all font-mono text-[8.5px] text-ink-mute">Claim ID · {p.id}</p></div>
                  <span className={'shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold ' + (['settled','paid','completed'].includes(String(p.status).toLowerCase()) ? 'bg-forest-50 text-forest-800' : ['failed','rejected'].includes(String(p.status).toLowerCase()) ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800')}>{String(p.status || 'unknown').replace(/_/g,' ')}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[9.5px] text-ink-mute">
                  <p>Requested · {p.requested_at ? new Date(p.requested_at).toLocaleString('en-IN') : '—'}</p><p>Settled · {p.settled_at ? new Date(p.settled_at).toLocaleString('en-IN') : '—'}</p>
                  <p>Attempt · {p.attempt ?? '—'}</p><p>Batch · {p.batch_id || '—'}</p>
                  <p>Line · {p.line_id || '—'}</p><p>Reference · {p.reference || '—'}</p>
                </div>
                {(p.failure_code || p.failure_reason || p.note) && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[10px] leading-relaxed text-amber-900">{[p.failure_code && 'Failure code: ' + p.failure_code, p.failure_reason && 'Failure: ' + p.failure_reason, p.note && 'Note: ' + p.note].filter(Boolean).join(' · ')}</p>}
              </article>
            )) : <p className="text-[12px] italic text-ink-mute">No payout claims are linked to this partner yet.</p>}
          </Section>

          <Section title={'Partner adjustments (' + adjustments.length + ')'}>
            {adjustments.length ? adjustments.map(a => (
              <article key={a.id} className="rounded-xl bg-ink/[0.025] p-3 ring-1 ring-ink/[0.05]">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[11.5px] font-extrabold">{String(a.kind || 'Adjustment').replace(/_/g,' ')}</p><p className="mt-0.5 break-all font-mono text-[8.5px] text-ink-mute">Adjustment ID · {a.id}</p></div><p className="text-[12px] font-black">{money(Number(a.amount_paise || 0) / 100)}</p></div>
                <p className="mt-2 text-[10px] leading-relaxed text-ink-soft">{a.reason || 'No reason recorded'}</p>
                <p className="mt-1 text-[9.5px] text-ink-mute">Effective · {a.effective_on || '—'} · Created · {a.created_at ? new Date(a.created_at).toLocaleString('en-IN') : '—'}</p>
                {a.line_id && <p className="mt-1 break-all font-mono text-[8.5px] text-ink-mute">Line {a.line_id}</p>}
                {a.settled_claim_id && <p className="mt-1 break-all font-mono text-[8.5px] text-ink-mute">Settlement claim {a.settled_claim_id}</p>}
              </article>
            )) : <p className="text-[12px] italic text-ink-mute">No manual or system adjustments are recorded for this partner.</p>}
          </Section>

          <Section title={'Subscription history (' + subscriptions.length + ')'}>
            {subscriptions.length ? subscriptions.map(s => (
              <article key={s.id} className="flex items-start gap-3 rounded-xl bg-ink/[0.025] p-3 ring-1 ring-ink/[0.05]">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-plum-50 text-plum-700"><Layers size={14}/></span>
                <div className="min-w-0 flex-1"><p className="text-[11.5px] font-extrabold">{String(s.tier || 'Plan').toUpperCase()} · {String(s.status || 'unknown').replace(/_/g,' ')}</p><p className="mt-1 text-[9.5px] text-ink-mute">Started {s.started_at ? new Date(s.started_at).toLocaleDateString('en-IN') : '—'} · Expires {s.expires_at ? new Date(s.expires_at).toLocaleDateString('en-IN') : '—'}</p><p className="mt-1 break-all font-mono text-[8.5px] text-ink-mute">Subscription ID · {s.id}</p></div>
              </article>
            )) : <p className="text-[12px] italic text-ink-mute">No subscription history is linked to this partner.</p>}
          </Section>

          <Section title={'Referral lifecycle (' + referrals.length + ' records · ' + referralInvites.length + ' invites)'}>
            <p className="text-[10.5px] leading-relaxed text-ink-mute">Referral milestones are joined by vendor ID. The referral and invite codes below are record references, not assumptions about reward eligibility.</p>
            {referrals.map(r => (
              <article key={r.id} className="mt-2 rounded-xl bg-ink/[0.025] p-3 ring-1 ring-ink/[0.05]">
                <div className="flex items-start justify-between gap-2"><div><p className="text-[11.5px] font-extrabold">{String(r.state || 'unknown').replace(/_/g,' ')} · Reward {String(r.reward_status || 'not recorded').replace(/_/g,' ')}</p><p className="mt-0.5 break-all font-mono text-[8.5px] text-ink-mute">Referral ID · {r.id}</p></div><span className="rounded-full bg-plum-50 px-2 py-1 text-[9px] font-extrabold text-plum-700">{r.code || 'No code'}</span></div>
                <p className="mt-2 break-all text-[9px] text-ink-mute">Referrer UUID · {r.referrer_id} · Referred UUID · {r.referred_id}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[9.5px] text-ink-mute"><p>Claimed · {r.claimed_at ? new Date(r.claimed_at).toLocaleDateString('en-IN') : '—'}</p><p>Onboarding · {r.onboarding_completed_at ? new Date(r.onboarding_completed_at).toLocaleDateString('en-IN') : '—'}</p><p>Verified · {r.verified_at ? new Date(r.verified_at).toLocaleDateString('en-IN') : '—'}</p><p>Went live · {r.live_at ? new Date(r.live_at).toLocaleDateString('en-IN') : '—'}</p><p>Qualified · {r.qualified_at ? new Date(r.qualified_at).toLocaleDateString('en-IN') : '—'}</p><p>Reward paid · {r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-IN') : '—'}</p></div>
                {r.rejected_reason && <p className="mt-2 text-[10px] text-rose-700">Rejected: {r.rejected_reason}</p>}
              </article>
            ))}
            {referralInvites.map(r => (
              <article key={r.id} className="mt-2 rounded-xl bg-ink/[0.025] p-3 ring-1 ring-ink/[0.05]">
                <p className="text-[11px] font-extrabold">Invite · {r.code}</p><p className="mt-0.5 break-all font-mono text-[8.5px] text-ink-mute">Invite ID · {r.id}</p>
                <p className="mt-1 text-[9.5px] text-ink-mute">Trade · {r.trade_id || '—'} · Campaign · {r.campaign_id || '—'}</p>
                <p className="mt-1 text-[9.5px] text-ink-mute">Created · {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'} · Expires · {r.expires_at ? new Date(r.expires_at).toLocaleDateString('en-IN') : '—'} · Claimed · {r.claimed_at ? new Date(r.claimed_at).toLocaleDateString('en-IN') : 'Not yet'}</p>
                {r.claimed_by && <p className="mt-1 break-all font-mono text-[8.5px] text-ink-mute">Claimed by profile · {r.claimed_by}</p>}
              </article>
            ))}
            {!referrals.length && !referralInvites.length && <p className="mt-2 text-[12px] italic text-ink-mute">No referral records or invites are linked to this partner.</p>}
          </Section>

          <Section title={`Lifecycle notes (${notes.length})`}>
            <p className="text-[11.5px] leading-relaxed text-ink-mute">Internal operator notes are linked directly to this partner ID. Use these for follow-ups, support context, compliance concerns or operational handoffs.</p>
            <div className="mt-2 grid gap-2">
              <select value={noteKind} onChange={e => setNoteKind(e.target.value)} className="w-full rounded-xl bg-white px-3 py-2.5 text-[12px] font-semibold text-ink ring-1 ring-ink/[0.08]">
                <option value="internal">Internal note</option><option value="follow_up">Follow-up</option><option value="risk">Risk</option><option value="support">Support</option><option value="compliance">Compliance</option>
              </select>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} maxLength={4000} placeholder="Record context or the next action… (operator-only)" className="w-full resize-y rounded-xl bg-white px-3 py-2.5 text-[12px] text-ink ring-1 ring-ink/[0.08] outline-none focus:ring-2 focus:ring-plum-300"/>
              <div className="flex items-center justify-between gap-2"><span className="text-[10px] text-ink-mute">{noteText.length}/4000 characters</span><button type="button" onClick={saveLifecycleNote} disabled={noteBusy || !noteText.trim() || !actorId} className="rounded-xl bg-plum-700 px-3.5 py-2 text-[11px] font-extrabold text-white disabled:opacity-40">{noteBusy ? 'Saving…' : 'Save note'}</button></div>
            </div>
            <div className="mt-3 space-y-2">
              {notes.map(n => <article key={n.id} className="rounded-xl bg-ink/[0.025] p-3 ring-1 ring-ink/[0.05]"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-plum-50 px-2 py-1 text-[9px] font-extrabold uppercase text-plum-700">{String(n.note_kind || 'internal').replace(/_/g, ' ')}</span><time className="text-[10px] text-ink-mute">{n.created_at ? new Date(n.created_at).toLocaleString('en-IN') : '—'}</time></div><p className="mt-2 whitespace-pre-wrap text-[11.5px] leading-relaxed text-ink-soft">{n.body}</p><p className="mt-2 font-mono text-[9px] text-ink-mute">Note ID · {n.id}</p></article>)}
              {!notes.length && <p className="rounded-xl bg-ink/[0.025] p-3 text-[11.5px] text-ink-mute">No operator notes yet. Notes will remain attached to this partner record.</p>}
            </div>
          </Section>

          <Section title={'Partner app activity (' + activityEvents.length + ')'}>
            <p className="text-[11px] leading-relaxed text-ink-mute">Recent partner-side telemetry linked by partner UUID or login profile UUID. Event properties are expandable for operational troubleshooting.</p>
            <div className="mt-3 space-y-2">
              {activityEvents.slice(0, 40).map(e => (
                <article key={e.id} className="flex gap-2.5 rounded-xl bg-ink/[0.025] p-3 ring-1 ring-ink/[0.05]">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-plum-500"/>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="break-words text-[11.5px] font-extrabold text-ink">{String(e.name || 'Partner event').replace(/_/g, ' ')}</p>
                      <time className="text-[9.5px] text-ink-mute">{e.created_at ? new Date(e.created_at).toLocaleString('en-IN') : '—'}</time>
                    </div>
                    <p className="mt-1 text-[9.5px] text-ink-mute">{e.surface || 'Surface unknown'} · Build {e.app_build || 'unknown'} · Event ID {e.id}</p>
                    {e.props && <details className="mt-1.5"><summary className="cursor-pointer text-[10px] font-bold text-plum-700">Inspect event properties</summary><pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-white p-2 text-[9px] leading-relaxed text-ink-soft">{JSON.stringify(e.props, null, 2)}</pre></details>}
                  </div>
                </article>
              ))}
              {!activityEvents.length && <p className="rounded-xl bg-ink/[0.025] p-3 text-[11.5px] text-ink-mute">No partner app events are currently linked to this partner/profile. Telemetry appears here when the partner surface records activity.</p>}
              {activityEvents.length > 40 && <p className="text-[10px] text-ink-mute">Showing 40 of {activityEvents.length} events, newest first.</p>}
            </div>
          </Section>

          <Section title={'Verification decisions (' + verificationEvents.length + ')'}>
            <p className="text-[11px] leading-relaxed text-ink-mute">Historical decisions already recorded by the partner verification workflow, with previous state, new state, actor and reviewer note.</p>
            <div className="mt-3 space-y-2">
              {verificationEvents.map(e => (
                <article key={e.id} className="rounded-xl bg-ink/[0.025] p-3 ring-1 ring-ink/[0.05]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11.5px] font-extrabold text-ink">{String(e.from_value || 'New').replace(/_/g, ' ')} <ChevronRight size={11} className="inline"/> {String(e.to_value || 'Unknown').replace(/_/g, ' ')}</p>
                    <time className="text-[9.5px] text-ink-mute">{e.created_at ? new Date(e.created_at).toLocaleString('en-IN') : '—'}</time>
                  </div>
                  <p className="mt-1 text-[9.5px] text-ink-mute">Actor · {e.actor_role || 'Not recorded'} · {e.actor_id || 'System / unknown'}</p>
                  {e.note && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-2 text-[10.5px] leading-relaxed text-ink-soft">{e.note}</p>}
                  <p className="mt-1 break-all font-mono text-[8px] text-ink-mute">Verification event ID · {e.id}</p>
                </article>
              ))}
              {!verificationEvents.length && <p className="rounded-xl bg-ink/[0.025] p-3 text-[11.5px] text-ink-mute">No legacy verification-event rows are linked yet. New operator actions appear in the lifecycle audit.</p>}
            </div>
          </Section>

          <Section title={`Lifecycle audit (${audit.length})`}>
            <p className="text-[11px] leading-relaxed text-ink-mute">State changes are recorded by database triggers when partner, listing, trade, document, pricing or account-role fields change. Sensitive document paths and raw payout details are intentionally excluded.</p>
            <div className="mt-3 space-y-2">
              {audit.slice(0, 35).map(a => <article key={a.id} className="flex gap-2.5 rounded-xl bg-ink/[0.025] p-3 ring-1 ring-ink/[0.05]"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-plum-500"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11.5px] font-extrabold text-ink">{String(a.action || 'state changed').replace(/[._]/g, ' ')}</p><time className="text-[9.5px] text-ink-mute">{a.created_at ? new Date(a.created_at).toLocaleString('en-IN') : '—'}</time></div><p className="mt-1 text-[10px] text-ink-mute">{String(a.entity_type || 'record').replace(/_/g, ' ')} · {a.entity_id} · actor {a.actor_role || 'system'}</p>{a.note && <p className="mt-1 text-[10.5px] text-ink-soft">{a.note}</p>}<details className="mt-1.5"><summary className="cursor-pointer text-[10px] font-bold text-plum-700">Inspect before / after state</summary><pre className="mt-2 overflow-x-auto rounded-lg bg-white p-2 text-[9px] leading-relaxed text-ink-soft">{JSON.stringify({before: a.before_state, after: a.after_state}, null, 2)}</pre></details></div></article>)}
              {!audit.length && <p className="rounded-xl bg-ink/[0.025] p-3 text-[11.5px] text-ink-mute">No trigger-generated state changes have been recorded yet. New operational changes will appear here automatically.</p>}
              {audit.length > 35 && <p className="text-[10px] text-ink-mute">Showing the 35 most recent audit events for this partner.</p>}
            </div>
          </Section>

          <Section title="Verification">
            <p className="text-[12px] leading-snug text-ink-mute">
              Currently <span className="font-extrabold text-ink">
                {(VENDOR_STATE[v.verification_status] ?? VENDOR_STATE.draft).label}
              </span>. Approving also makes every listing that is waiting go live.
            </p>
            {/* Said here because it is the thing an operator most needs
                to know before pressing it, and the least obvious. */}
            <p className="text-[11.5px] leading-snug text-ink-mute">
              Closing locks them out of the app immediately and stops all new
              offers. Nothing is deleted and it is reversible — work already
              accepted is untouched, because a family is expecting somebody.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
                          {v.verification_status === 'submitted' && pricingUnderReview.length === pricingPending.length && pricingPending.length > 0 && (
              <button type="button" disabled={!!busy} onClick={approveApplication}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-full bg-plum-700 px-4 py-2.5 text-[12.5px] font-extrabold text-white disabled:opacity-50">
                {busy === 'approve-application' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Approve partner + submitted pricing
              </button>
            )}
{[
                { s: 'approved',  label: 'Approve',  cls: 'bg-forest-600 text-white' },
                { s: 'rejected',  label: 'Reject',   cls: 'bg-white text-rose-700 ring-1 ring-rose-200' },
                /* "Close" rather than "Suspend": it is the same act and
                   the partner's own screen calls it closed, so an
                   operator reading this to somebody on the phone says
                   the same word they are seeing. */
                { s: 'suspended', label: 'Close the account', cls: 'bg-white text-rose-700 ring-1 ring-rose-200' },
              ].map(b => (
                <button
                  key={b.s} type="button" disabled={!!busy}
                  onClick={() => setStatus(b.s)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-extrabold disabled:opacity-50 ${b.cls}`}
                >
                  {busy === b.s && <Loader2 size={13} className="animate-spin" />}
                  {b.label}
                </button>
              ))}
            </div>
          </Section>
        </div>
      </aside>
    </div>
  )
}

const KIND_LABEL = {
  aadhaar: 'Aadhaar card', pan: 'PAN card',
  gst: 'GST certificate', shop_licence: 'Shop licence',
}

/* A private bucket: the file is fetched behind a short-lived signed URL
   rather than linked, so a document never sits on a public path. */
function DocLink({ path }) {
  const [busy, setBusy] = useState(false)
  if (!path) return null
  return (
    <button
      type="button" disabled={busy}
      onClick={async () => {
        setBusy(true)
        const url = await signedUrlFor(path)
        setBusy(false)
        if (url) window.open(url, '_blank', 'noopener')
      }}
      className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-royal-700 ring-1 ring-ink/[0.08] disabled:opacity-50"
    >
      {busy ? '…' : 'View'}
    </button>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-mute">{title}</h3>
      {children}
    </section>
  )
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 text-[12.5px]">
      <Icon size={13} className="shrink-0 text-ink-mute" />
      <span className="w-20 shrink-0 text-ink-mute">{label}</span>
      <span className="min-w-0 flex-1 truncate font-semibold text-ink">{value}</span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   THEIR WORK
   ══════════════════════════════════════════════════════════════════════

   partner_work has been write-only since 110. Nothing read it, so
   review_status never left 'under_review', so 110's public policy
   matched zero rows for its whole existence -- and every photograph a
   partner ever uploaded was invisible to everybody, including them.

   Day one of this queue is therefore a backlog of every row ever
   inserted, which is why the per-partner bulk approve exists. Reviewing
   that one item at a time is not work anybody would finish.

   ── What an operator is actually looking for ────────────────────────
   Not whether the photograph is pretty. Whether it is THEIRS, and
   whether it carries a phone number -- 068 makes contact masking a
   property of the schema, and a caption is free text that renders on
   the screen where a customer is deciding whether to pay. A signboard
   in shot does the same thing. That is what the human read is for. */
function WorkQueue({ data, onOpen }) {
  const toast = useToast()
  const [urls, setUrls] = useState({})
  const [busy, setBusy] = useState(null)

  const vendorById = useMemo(
    () => Object.fromEntries(data.vendors.map(v => [v.id, v])), [data.vendors])

  const queue = data.work
    .filter(w => w.review_status === 'under_review' && vendorById[w.vendor_id])

  /* One request for every thumbnail in the queue, not one per tile. */
  useEffect(() => {
    let alive = true
    signedUrlsFor(queue.map(w => w.storage_path)).then(u => { if (alive) setUrls(u) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.work])

  async function decide(item, next) {
    setBusy(item.id + next)
    try {
      const { data: row, error } = await supabase
        .from('partner_work')
        .update({ review_status: next })
        .eq('id', item.id)
        .select('id, review_status')
        .single()
      if (error) throw error
      /* 118 attached freeze_review_status here, and it reverts a refused
         change in silence while the update reports success. Same
         read-back the listing queue makes, for the same reason. */
      if (row?.review_status !== next) {
        toast.error('That did not stick — your profile needs the admin or coordinator role.')
        return
      }
      toast.success(next === 'live' ? 'Live. Customers can see it.' : 'Sent back.')
      await data.refresh()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not update that.'))
    } finally { setBusy(null) }
  }

  async function approveAllFor(vendorId, items) {
    setBusy('bulk' + vendorId)
    try {
      for (const w of items) {
        await supabase.from('partner_work').update({ review_status: 'live' }).eq('id', w.id)
      }
      toast.success(`${items.length} approved.`)
      await data.refresh()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not approve those.'))
    } finally { setBusy(null) }
  }

  if (!queue.length) {
    return (
      <div className="rounded-2xl bg-forest-50 p-10 text-center ring-1 ring-forest-200">
        <Check size={26} className="mx-auto text-forest-700" />
        <p className="mt-2 text-[14px] font-extrabold text-forest-900">Nothing waiting</p>
        <p className="mt-1 text-[12.5px] text-forest-800">
          Every photograph, video and quote from a real partner has been decided.
        </p>
      </div>
    )
  }

  /* Grouped by partner, because that is how it is judged: six
     photographs from one decorator are one decision about one business,
     not six decisions about six pictures. */
  const byVendor = {}
  for (const w of queue) (byVendor[w.vendor_id] ??= []).push(w)

  return (
    <div className="space-y-4">
      <p className="text-[12.5px] leading-snug text-ink-mute">
        <span className="font-extrabold text-ink">{queue.length} waiting</span> from{' '}
        {Object.keys(byVendor).length} partner{Object.keys(byVendor).length === 1 ? '' : 's'}.
        Look for two things: that the work is theirs, and that no caption or
        signboard carries a phone number — a customer sees these before they pay.
      </p>

      {Object.entries(byVendor).map(([vid, items]) => {
        const v = vendorById[vid]
        return (
          <section key={vid} className="rounded-2xl bg-white p-4 ring-1 ring-ink/[0.07]">
            <header className="flex items-center gap-2">
              <button
                type="button" onClick={() => onOpen(v)}
                className="text-[14px] font-extrabold text-ink underline"
              >
                {v.business_name}
              </button>
              {v.partner_code && (
                <span className="select-all font-mono text-[11px] font-bold text-royal-700">
                  {v.partner_code}
                </span>
              )}
              <span className="ml-auto text-[11.5px] text-ink-mute">{items.length} waiting</span>
            </header>

            <ul className="mt-3 grid grid-cols-3 gap-2">
              {items.map(w => (
                <li key={w.id} className="overflow-hidden rounded-xl bg-ink/[0.03] ring-1 ring-ink/[0.06]">
                  <div className="aspect-square">
                    {w.kind === 'testimonial' ? (
                      <p className="line-clamp-5 p-2 text-[10.5px] leading-snug text-ink">{w.body}</p>
                    ) : urls[w.storage_path] ? (
                      w.kind === 'video'
                        ? <video src={urls[w.storage_path]} controls className="h-full w-full object-cover" />
                        : <img src={urls[w.storage_path]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-ink-mute">
                        no preview
                      </span>
                    )}
                  </div>
                  {w.caption && (
                    <p className="px-2 py-1 text-[10.5px] leading-snug text-ink-mute">{w.caption}</p>
                  )}
                  <div className="grid grid-cols-2 border-t border-ink/[0.06] text-[11px] font-extrabold">
                    <button
                      type="button" disabled={!!busy}
                      onClick={() => decide(w, 'rejected')}
                      className="border-r border-ink/[0.06] py-2 text-rose-700 disabled:opacity-50"
                    >
                      No
                    </button>
                    <button
                      type="button" disabled={!!busy}
                      onClick={() => decide(w, 'live')}
                      className="py-2 text-forest-700 disabled:opacity-50"
                    >
                      Live
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {items.length > 1 && (
              <button
                type="button" disabled={!!busy}
                onClick={() => approveAllFor(vid, items)}
                className="mt-3 w-full rounded-xl bg-forest-50 py-2.5 text-[12px] font-extrabold text-forest-800 ring-1 ring-forest-200 disabled:opacity-50"
              >
                {busy === 'bulk' + vid
                  ? 'Approving…'
                  : `Approve all ${items.length} from ${v.business_name}`}
              </button>
            )}
          </section>
        )
      })}
    </div>
  )
}

/* A partner's work, at a glance, inside the drawer. Read-only — the
   decisions live in the queue, and two places to approve the same thing
   is two places for them to disagree. */
function WorkStrip({ work }) {
  const [urls, setUrls] = useState({})
  useEffect(() => {
    let alive = true
    signedUrlsFor(work.map(w => w.storage_path)).then(u => { if (alive) setUrls(u) })
    return () => { alive = false }
  }, [work])

  return (
    <ul className="grid grid-cols-4 gap-1.5">
      {work.map(w => (
        <li key={w.id} className="relative aspect-square overflow-hidden rounded-lg bg-ink/[0.04]">
          {w.kind === 'testimonial' ? (
            <p className="line-clamp-4 p-1.5 text-[9px] leading-snug text-ink">{w.body}</p>
          ) : urls[w.storage_path] ? (
            <img src={urls[w.storage_path]} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-[9px] text-ink-mute">—</span>
          )}
          <span className={`absolute bottom-0 left-0 right-0 py-0.5 text-center text-[8.5px] font-extrabold text-white ${
            w.review_status === 'live' ? 'bg-forest-600/90'
            : w.review_status === 'rejected' ? 'bg-rose-600/90' : 'bg-amber-500/90'
          }`}>
            {w.review_status === 'live' ? 'Live' : w.review_status === 'rejected' ? 'No' : 'Reading'}
          </span>
        </li>
      ))}
    </ul>
  )
}
