import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Loader2, Search, ShieldCheck, ShieldAlert, Clock, Radio, EyeOff,
  FileText, X, Check, AlertCircle, MapPin, Phone, Mail, Calendar,
  IndianRupee, Layers, RefreshCw, ChevronRight,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast, friendlyError } from '../../context/ToastContext'
import { signedUrlFor } from '../../lib/partnerDocuments'

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
  { id: 'pipeline',  label: 'Pipeline',       icon: Layers },
  { id: 'partners',  label: 'Partners',       icon: ShieldCheck },
  { id: 'listings',  label: 'Listing review', icon: FileText },
  { id: 'closures',  label: 'Leaving',         icon: EyeOff },
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
  const [state, setState] = useState({ loading: true, error: null, vendors: [], services: [], docs: [], payouts: [] })

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const [v, s, d, p] = await Promise.all([
        supabase.from('vendors').select('*').eq('is_synthetic', false).order('created_at', { ascending: false }),
        supabase.from('vendor_services').select('*').order('created_at', { ascending: false }),
        supabase.from('vendor_documents').select('*'),
        supabase.from('vendor_payout_details').select('*'),
      ])
      if (v.error) throw v.error
      setState({
        loading: false, error: null,
        vendors: v.data ?? [],
        /* Services are fetched for every vendor and filtered locally.
           Filtering server-side would need the vendor id list in the
           query, which changes as soon as anything is approved. */
        services: s.data ?? [],
        docs: d.data ?? [],
        payouts: p.data ?? [],
      })
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err }))
    }
  }, [])

  useEffect(() => { load() }, [load])
  return { ...state, refresh: load }
}

export default function PartnerConsole() {
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

      <nav className="flex gap-1 rounded-2xl bg-ink/[0.04] p-1">
        {TABS.map(t => {
          const Icon = t.icon
          const n =
            t.id === 'listings' ? data.services.filter(s => s.review_status === 'under_review').length
            : t.id === 'closures' ? data.vendors.filter(v => v.closure_requested_at).length
            : 0
          return (
            <button
              key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[13px] py-2.5 text-[12.5px] font-extrabold transition ${
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
          {tab === 'closures' && <ClosureQueue data={data} byVendor={byVendor} onOpen={setOpen} />}
        </>
      )}

      {open && (
        <PartnerDrawer
          vendor={open}
          services={byVendor[open.id] ?? []}
          docs={data.docs.filter(d => d.vendor_id === open.id)}
          payout={data.payouts.find(p => p.vendor_id === open.id) ?? null}
          onClose={() => setOpen(null)}
          onChanged={data.refresh}
        />
      )}
    </div>
  )
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
    return [v.business_name, v.city, v.area, v.pincode, v.category]
      .some(x => String(x ?? '').toLowerCase().includes(t))
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Business, area, pincode…"
            className="w-full rounded-xl bg-white py-2.5 pl-9 pr-3 text-[13px] font-semibold text-ink ring-1 ring-ink/[0.08]"
          />
        </div>
        <select
          value={status} onChange={e => setStatus(e.target.value)}
          className="rounded-xl bg-white px-3 py-2.5 text-[13px] font-semibold text-ink ring-1 ring-ink/[0.08]"
        >
          <option value="">All statuses</option>
          {Object.entries(VENDOR_STATE).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-ink/[0.02] p-10 text-center text-[13px] text-ink-mute">
          No partner matches that.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map(v => {
            const rows2 = byVendor[v.id] ?? []
            const live = rows2.filter(s => s.review_status === 'live' && s.is_active).length
            const st = VENDOR_STATE[v.verification_status] ?? VENDOR_STATE.draft
            const dispatchable = v.is_verified && !!v.location && live > 0
            return (
              <li key={v.id}>
                <button
                  type="button" onClick={() => onOpen(v)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left ring-1 ring-ink/[0.07] transition hover:ring-ink/20"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-extrabold text-ink">{v.business_name}</span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-ink-mute">
                      {[v.area, v.city, v.pincode].filter(Boolean).join(' · ') || 'No location'}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${st.cls}`}>
                    {st.label}
                  </span>
                  {/* The honest one. Approved is not the same as working. */}
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${
                    dispatchable ? 'bg-forest-100 text-forest-800' : 'bg-ink/[0.07] text-ink-mute'
                  }`}>
                    {dispatchable ? 'Offered work' : 'Not offered'}
                  </span>
                  <span className="shrink-0 text-[11.5px] font-semibold text-ink-mute">{rows2.length} listed</span>
                  <ChevronRight size={15} className="shrink-0 text-ink-mute" />
                </button>
              </li>
            )
          })}
        </ul>
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
  const [sendingBack, setSendingBack] = useState(null)   // listing id
  const [note, setNote] = useState('')

  const vendorById = useMemo(
    () => Object.fromEntries(data.vendors.map(v => [v.id, v])), [data.vendors])

  /* Only listings whose partner is a real, non-synthetic business we
     actually hold. A row whose vendor was filtered out has nobody to
     approve it for. */
  const queue = data.services
    .filter(s => s.review_status === 'under_review' && vendorById[s.vendor_id])

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
      toast.success(next === 'live' ? 'Live. The partner can be offered work now.' : 'Sent back with your note.')
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
          Every listing from a real partner has been decided.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-ink-mute">
        {queue.length} listing{queue.length === 1 ? '' : 's'} waiting. Until one is
        made live its partner is offered nothing for that trade, however approved
        their business is.
      </p>

      {queue.map(s => {
        const v = vendorById[s.vendor_id]
        const siblings = data.services.filter(
          x => x.vendor_id === s.vendor_id && x.review_status === 'under_review')
        return (
          <article key={s.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-amber-200">
            <header className="flex items-center gap-2.5 bg-amber-500 px-4 py-2.5 text-white">
              <Clock size={15} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-extrabold leading-tight">{s.name}</span>
                <span className="block truncate text-[11.5px] font-semibold opacity-90">
                  {s.category} · submitted {ago(s.created_at)}
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
function PartnerDrawer({ vendor: v, services, docs, payout, onClose, onChanged }) {
  const toast = useToast()
  const [busy, setBusy] = useState(null)

  const live = services.filter(s => s.review_status === 'live' && s.is_active)
  const readiness = {
    approved:     v.is_verified,
    located:      !!v.location,
    has_service:  services.some(s => s.is_active),
    listing_live: live.length > 0,
    signed_terms: !!v.terms_accepted_at,
    can_be_paid:  !!payout?.verified_at,
  }
  const dispatchable = readiness.approved && readiness.located && readiness.listing_live

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
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <aside
        onClick={e => e.stopPropagation()}
        className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-ink/[0.07] bg-white px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[17px] font-extrabold text-ink">{v.business_name}</h2>
            <p className="mt-0.5 truncate text-[12px] text-ink-mute">
              {[v.area, v.city, v.pincode].filter(Boolean).join(' · ') || 'No location on file'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 rounded-full p-1.5 text-ink-mute hover:bg-ink/[0.05]">
            <X size={18} />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5">
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

          <Section title="Who they are">
            <Row icon={Mail}  label="Email"    value={v.profiles?.email ?? '—'} />
            <Row icon={Phone} label="Phone"    value={v.profiles?.phone ?? v.phone ?? '—'} />
            <Row icon={MapPin} label="Travels" value={v.service_radius_km ? `${v.service_radius_km} km` : '—'} />
            <Row icon={Calendar} label="Joined" value={v.created_at?.slice(0, 10) ?? '—'} />
            <Row icon={ShieldCheck} label="Terms"
                 value={v.terms_accepted_at ? `Signed ${v.terms_version ?? ''}`.trim() : 'Not signed'} />
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

          <Section title={`Identity documents (${docs.length})`}>
            {docs.length === 0 ? (
              <p className="text-[12px] italic text-ink-mute">Nothing uploaded.</p>
            ) : docs.map(d => (
              <div key={d.id} className="flex items-center gap-2 rounded-xl bg-ink/[0.02] px-3 py-2">
                <FileText size={14} className="shrink-0 text-ink-mute" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-extrabold text-ink">
                    {KIND_LABEL[d.kind] ?? d.kind}
                  </span>
                  <span className="block text-[11px] text-ink-mute">
                    {d.last4 ? `ends ${d.last4} · ` : ''}added {ago(d.created_at)}
                  </span>
                </span>
                <DocLink path={d.storage_path} />
              </div>
            ))}
          </Section>

          <Section title="Getting paid">
            {!payout ? (
              <p className="text-[12px] italic text-ink-mute">
                No payout method. They cannot be paid for completed work.
              </p>
            ) : (
              <>
                <Row icon={IndianRupee} label="Method"
                     value={payout.method === 'upi' ? `UPI · ${payout.upi_id ?? '—'}`
                            : `Bank · ${payout.account_number ? '…' + String(payout.account_number).slice(-4) : '—'}`} />
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
          <Section title="Verification">
            <p className="text-[12px] leading-snug text-ink-mute">
              Currently <span className="font-extrabold text-ink">
                {(VENDOR_STATE[v.verification_status] ?? VENDOR_STATE.draft).label}
              </span>. Approving also makes every listing that is waiting go live.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { s: 'approved',  label: 'Approve',  cls: 'bg-forest-600 text-white' },
                { s: 'rejected',  label: 'Reject',   cls: 'bg-white text-rose-700 ring-1 ring-rose-200' },
                { s: 'suspended', label: 'Suspend',  cls: 'bg-white text-ink-soft ring-1 ring-ink/[0.1]' },
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
