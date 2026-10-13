/**
 * One partner, end to end.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE QUESTION THIS SCREEN ANSWERS
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Where is this partner stuck?" — which the partner console cannot
 * answer, because it is organised by QUEUE: documents in one tab,
 * listings in another, payouts somewhere else. A founder asking about
 * one person has to visit four screens and hold the answer in their
 * head.
 *
 * So this is organised by PERSON, and reads the same eleven stages the
 * partner's own app shows them, in the same order, with the same words.
 * If this screen and their phone disagree, one of them is lying.
 *
 * ── Readiness is the server's answer, not this screen's ─────────────
 * `listing_readiness(vendor_service_id)` already computes the nine
 * gates and the state ladder, and it is what decides whether a partner
 * can be booked. Recomputing any of that here would create a second
 * truth that drifts. Where the server answers, this renders the answer.
 *
 * ── A blank is a fact ───────────────────────────────────────────────
 * No payout account is not "pending", it is absent. The stage shows
 * what is true and says what is missing, and never fills a gap with an
 * encouraging word.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Loader2, Search, Check, X, Clock, AlertCircle, ChevronRight, RefreshCw, User,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { EmptyNote, SectionHead, StatTile } from './viz/Primitives'

const money = paise => `₹${Math.round((Number(paise) || 0) / 100).toLocaleString('en-IN')}`
const day = iso => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null

/* The eleven stages, in the order a partner lives them. `of()` returns
   'done' | 'now' | 'blocked' | 'todo' plus the sentence underneath. */
const STAGES = [
  {
    id: 'signed_up', label: 'Signed up',
    of: p => ({ state: p.vendor?.created_at ? 'done' : 'todo', note: day(p.vendor?.created_at) }),
  },
  {
    id: 'profile', label: 'Business profile',
    of: p => ({
      state: p.vendor?.business_name ? 'done' : 'todo',
      note: p.vendor?.business_name ?? 'No business name yet',
    }),
  },
  {
    id: 'location', label: 'Location confirmed',
    of: p => ({
      state: p.vendor?.location_confirmed_at ? 'done' : p.vendor?.city ? 'now' : 'todo',
      note: p.vendor?.location_confirmed_at
        ? `${p.vendor.area ?? p.vendor.city} · confirmed`
        : p.vendor?.city ? `${p.vendor.city} · not confirmed` : 'No service area set',
    }),
  },
  {
    id: 'trades', label: 'Trades listed',
    of: p => ({
      state: p.services.length ? 'done' : 'todo',
      note: p.services.length
        ? p.services.map(s => s.category).join(', ')
        : 'No trade listed yet',
    }),
  },
  {
    id: 'pricing', label: 'Prices submitted',
    of: p => {
      const live = p.versions.filter(v => v.status === 'LIVE').length
      const pending = p.versions.filter(v => ['UNDER_REVIEW', 'ACTION_REQUIRED'].includes(v.status)).length
      if (!p.versions.length) return { state: 'todo', note: 'No listing version submitted' }
      if (live) return { state: 'done', note: `${live} live${pending ? `, ${pending} waiting` : ''}` }
      return { state: 'now', note: `${pending} version${pending === 1 ? '' : 's'} with our team` }
    },
  },
  {
    id: 'documents', label: 'Documents',
    of: p => {
      const d = p.documents
      if (!d.length) return { state: 'todo', note: 'Nothing uploaded' }
      const rejected = d.filter(x => x.status === 'rejected').length
      const pending = d.filter(x => x.status === 'pending').length
      if (rejected) return { state: 'blocked', note: `${rejected} sent back` }
      if (pending) return { state: 'now', note: `${pending} waiting to be read` }
      return { state: 'done', note: `${d.length} accepted` }
    },
  },
  {
    id: 'identity', label: 'Identity decided',
    of: p => ({
      state: p.vendor?.is_verified ? 'done'
        : p.vendor?.verification_status === 'submitted' ? 'now'
        : p.vendor?.verification_status === 'rejected' ? 'blocked' : 'todo',
      note: p.vendor?.is_verified ? 'A person checked it'
        : p.vendor?.verification_status === 'submitted' ? 'With our team'
        : p.vendor?.verification_status === 'rejected' ? 'Sent back'
        : 'Not submitted',
    }),
  },
  {
    id: 'payout', label: 'Payout account',
    of: p => {
      if (!p.payout) return { state: 'todo', note: 'No bank details' }
      const s = p.payout.route_status
      if (s === 'activated') return { state: 'done', note: 'Razorpay activated' }
      if (['rejected', 'suspended'].includes(s)) return { state: 'blocked', note: `Razorpay: ${s}` }
      return { state: 'now', note: s ? `Razorpay: ${s}` : 'Added, not activated' }
    },
  },
  {
    id: 'calendar', label: 'Calendar open',
    of: p => ({
      state: p.hasCalendar ? 'done' : 'todo',
      note: p.hasCalendar ? 'Has available days' : 'No availability set — cannot be matched',
    }),
  },
  {
    id: 'live', label: 'Live for customers',
    of: p => {
      const live = p.services.filter(s => s.review_status === 'live' && s.is_active).length
      return {
        state: live ? 'done' : 'todo',
        note: live ? `${live} listing${live === 1 ? '' : 's'} customers can book` : 'Nothing published',
      }
    },
  },
  {
    id: 'earning', label: 'Earning',
    of: p => ({
      state: p.jobs ? 'done' : 'todo',
      note: p.jobs ? `${p.jobs} job${p.jobs === 1 ? '' : 's'}` : 'No jobs yet',
    }),
  },
]

const LOOK = {
  done: ['bg-forest-600 text-white', 'text-ink', Check],
  now: ['bg-saffron-400 text-saffron-950', 'text-ink', Clock],
  blocked: ['bg-chilli-500 text-white', 'text-chilli-700', AlertCircle],
  todo: ['bg-ink/10 text-ink/40', 'text-ink/45', null],
}

function Stage({ label, state, note, last }) {
  const [dot, text, Icon] = LOOK[state] ?? LOOK.todo
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && <span aria-hidden="true" className="absolute left-[11px] top-6 h-full w-[2px] bg-ink/[0.07]" />}
      <span className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${dot}`}>
        {Icon ? <Icon size={13} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-[13.5px] font-extrabold ${text}`}>{label}</p>
        {note && <p className="text-[12.5px] leading-snug text-ink/55">{note}</p>}
      </div>
    </li>
  )
}

export default function PartnerLifecycle() {
  const [list, setList] = useState(undefined)
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('vendors')
      .select('id, business_name, city, area, created_at, is_verified, verification_status, accepting_jobs')
      .eq('is_synthetic', false)
      .order('created_at', { ascending: false })
      .limit(500)
    setList(data ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return list ?? []
    return (list ?? []).filter(v =>
      (v.business_name ?? '').toLowerCase().includes(t) || (v.city ?? '').toLowerCase().includes(t))
  }, [list, q])

  const counts = useMemo(() => {
    const l = list ?? []
    return {
      total: l.length,
      verified: l.filter(v => v.is_verified).length,
      waiting: l.filter(v => v.verification_status === 'submitted' && !v.is_verified).length,
      accepting: l.filter(v => v.accepting_jobs).length,
    }
  }, [list])

  if (list === undefined) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-plum-600" /></div>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Partners" value={counts.total} sub="real, not seeded" />
        <StatTile label="Identity accepted" value={counts.verified} sub="a person checked it" />
        <StatTile label="Waiting on us" value={counts.waiting} sub="submitted, undecided" />
        <StatTile label="Taking jobs" value={counts.accepting} sub="switch is on" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 ring-1 ring-ink/[0.08]">
            <Search size={15} className="shrink-0 text-ink/40" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a partner or a city"
              className="w-full bg-transparent text-[13.5px] font-semibold text-ink outline-none placeholder:text-ink/35" />
            <button type="button" onClick={load} aria-label="Refresh" className="shrink-0 text-ink/40"><RefreshCw size={14} /></button>
          </div>

          <div className="max-h-[70vh] space-y-1.5 overflow-y-auto pr-1">
            {!shown.length && <EmptyNote icon="🔍">No partner matches that.</EmptyNote>}
            {shown.map(v => (
              <button key={v.id} type="button" onClick={() => setPicked(v)}
                className={`flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left transition ${
                  picked?.id === v.id ? 'bg-plum-700 text-white' : 'bg-white ring-1 ring-ink/[0.06] hover:bg-plum-50'}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold ${
                  picked?.id === v.id ? 'bg-white/20 text-white' : 'bg-plum-100 text-plum-700'}`}>
                  {(v.business_name ?? '?').slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-extrabold">{v.business_name ?? 'Unnamed'}</span>
                  <span className={`block truncate text-[11.5px] ${picked?.id === v.id ? 'text-white/70' : 'text-ink/45'}`}>
                    {v.city ?? 'No city'} · joined {day(v.created_at)}
                  </span>
                </span>
                <ChevronRight size={15} className="shrink-0 opacity-50" />
              </button>
            ))}
          </div>
        </div>

        {picked
          ? <LifecycleDetail vendor={picked} />
          : (
            <div className="flex min-h-[320px] items-center justify-center rounded-[18px] bg-white ring-1 ring-ink/[0.07]">
              <div className="text-center">
                <User size={26} className="mx-auto text-ink/20" />
                <p className="mt-2 text-[13.5px] font-bold text-ink/50">Pick a partner to see their whole journey.</p>
              </div>
            </div>
          )}
      </div>
    </div>
  )
}

function LifecycleDetail({ vendor }) {
  const [p, setP] = useState(undefined)

  useEffect(() => {
    let live = true
    setP(undefined)
    ;(async () => {
      /* Services first, because the listing versions hang off them and
         a version for a service this partner does not own is somebody
         else's row. Then one batched read for the rest; each is allowed
         to come back empty, because a partner with no payout row is a
         fact this screen reports, not an error it throws. */
      const { data: svc } = await supabase
        .from('vendor_services').select('id, category, review_status, is_active')
        .eq('vendor_id', vendor.id)
      const serviceIds = (svc ?? []).map(x => x.id)

      const [documents, payout, versions, weekly, exceptions, jobs, adjustments] = await Promise.all([
        supabase.from('vendor_documents').select('id, kind, status').eq('vendor_id', vendor.id),
        supabase.from('partner_payout_accounts').select('route_status').eq('vendor_id', vendor.id).maybeSingle(),
        serviceIds.length
          ? supabase.from('sambramo_listing_versions')
              .select('id, status, version, trade_id, published_at')
              .in('vendor_service_id', serviceIds)
          : Promise.resolve({ data: [] }),
        supabase.from('vendor_weekly_rules').select('id').eq('vendor_id', vendor.id).limit(1),
        supabase.from('vendor_availability').select('id').eq('vendor_id', vendor.id).limit(1),
        supabase.from('partner_jobs').select('line_id', { count: 'exact', head: true }).eq('vendor_id', vendor.id),
        supabase.from('partner_adjustments').select('kind, amount_paise').eq('vendor_id', vendor.id),
      ])

      if (!live) return
      setP({
        vendor,
        services: svc ?? [],
        documents: documents.data ?? [],
        payout: payout.data ?? null,
        versions: versions.data ?? [],
        hasCalendar: !!(weekly.data?.length || exceptions.data?.length),
        jobs: jobs.count ?? 0,
        adjustments: adjustments.data ?? [],
      })
    })()
    return () => { live = false }
  }, [vendor])

  if (p === undefined) {
    return <div className="flex min-h-[320px] items-center justify-center rounded-[18px] bg-white ring-1 ring-ink/[0.07]">
      <Loader2 className="animate-spin text-plum-600" /></div>
  }

  const stages = STAGES.map(s => ({ id: s.id, label: s.label, ...s.of(p) }))
  const stuck = stages.find(s => s.state === 'blocked') ?? stages.find(s => s.state === 'now')
  const net = p.adjustments.reduce((n, a) => n + (Number(a.amount_paise) || 0), 0)

  return (
    <div className="space-y-4">
      <div className="rounded-[18px] bg-white p-5 ring-1 ring-ink/[0.07]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[19px] font-extrabold text-ink">{vendor.business_name ?? 'Unnamed'}</p>
            <p className="text-[12.5px] text-ink/50">
              {vendor.area ?? vendor.city ?? 'No city'} · joined {day(vendor.created_at)}
            </p>
          </div>
          {stuck
            ? <span className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold ring-1 ${
                stuck.state === 'blocked'
                  ? 'bg-chilli-50 text-chilli-700 ring-chilli-200'
                  : 'bg-saffron-50 text-saffron-800 ring-saffron-200'}`}>
                {stuck.state === 'blocked' ? 'Blocked at' : 'Waiting at'} {stuck.label.toLowerCase()}
              </span>
            : <span className="shrink-0 rounded-full bg-forest-50 px-3 py-1.5 text-[11.5px] font-extrabold text-forest-700 ring-1 ring-forest-200">
                Nothing blocking
              </span>}
        </div>

        {net !== 0 && (
          <p className="mt-3 text-[12.5px] font-semibold text-ink/60">
            Adjustments on the account: <b className={net < 0 ? 'text-chilli-700' : 'text-forest-700'}>{money(net)}</b>
            {' '}across {p.adjustments.length} row{p.adjustments.length === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <div className="rounded-[18px] bg-white p-5 ring-1 ring-ink/[0.07]">
        <SectionHead title="The journey" sub="The same eleven steps their own app shows them, in the same order." />
        <ol className="mt-3">
          {stages.map((s, i) => (
            <Stage key={s.id} label={s.label} state={s.state} note={s.note} last={i === stages.length - 1} />
          ))}
        </ol>
      </div>
    </div>
  )
}
