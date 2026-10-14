import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, BadgeCheck, Building2, CircleDollarSign, Download, FileClock, FileText, RefreshCw, ShieldCheck, Sparkles, ChevronRight, Radio } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabase'

const plum = '#7444A1'
const green = '#299876'
const amber = '#E8A24A'
const red = '#D95C70'
const slate = '#8E8798'
const fmt = n => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(n || 0))
const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0))
const ago = value => {
  if (!value) return '—'
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000))
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : String(days) + 'd ago'
}
const rowsOf = r => r && !r.error ? (r.data || []) : []
const errOf = r => r && r.error ? r.error.message : ''

export default function ExecutiveOverview({ onNavigate }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [range, setRange] = useState('30')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const results = await Promise.all([
        supabase.from('vendors').select('id,profile_id,business_name,partner_code,category,city,area,verification_status,is_verified,is_featured,created_at,updated_at,onboarding_status,accepting_jobs,accepting_bookings,is_synthetic,closure_requested_at,suspended_at,review_due_at').eq('is_synthetic', false).order('created_at', { ascending: false }),
        supabase.from('vendor_services').select('id,vendor_id,name,category,price,unit,is_active,review_status,listing_code,revised_at,reviewed_at,created_at,updated_at').order('updated_at', { ascending: false }),
        supabase.from('partner_listings').select('id,vendor_id,trade,trade_id,status,created_at,updated_at'),
        supabase.from('vendor_documents').select('id,vendor_id,kind,status,provider_status,uploaded_at,expires_on'),
        supabase.from('partner_work').select('id,vendor_id,kind,review_status,created_at'),
        supabase.from('vendor_payout_details').select('vendor_id,method,verified_at'),
        supabase.from('sambramo_trade_packages').select('id,vendor_id,name,status,created_at,updated_at'),
        supabase.from('sambramo_catering_packages').select('id,vendor_id,name,status,created_at,updated_at'),
        supabase.from('partner_events').select('id,vendor_id,profile_id,name,created_at').order('created_at', { ascending: false }),
        supabase.from('booking_lines').select('id,request_id,service_name,trade,status,partner_amount_paise,accepted_at,paid_at,delivered_at,settled_at,created_at'),
        supabase.from('dispatch_offers').select('id,line_id,vendor_id,status,partner_amount_paise,offered_at,responded_at,accepted_at'),
        supabase.from('payout_claims').select('id,line_id,vendor_id,amount_paise,status,requested_at,settled_at,failed_at'),
        supabase.from('partner_referrals').select('id,referrer_id,referred_id,state,reward_status,created_at,qualified_at,paid_at'),
        supabase.from('partner_payout_accounts').select('id,vendor_id,kyc_status,kyc_verified_at,route_status'),
      ])
      const names = ['partner profiles', 'service cards', 'trade listings', 'documents', 'portfolio items', 'legacy payout readiness', 'trade pricing', 'catering pricing', 'partner activity', 'booking lines', 'dispatch offers', 'payout claims', 'partner referrals', 'payout-route KYC']
      const issues = results.map((r, i) => errOf(r) ? names[i] + ': ' + errOf(r) : '').filter(Boolean)
      const rows = results.map(rowsOf)
      setData({ vendors: rows[0], services: rows[1], trades: rows[2], docs: rows[3], work: rows[4], payouts: rows[5], tradePrices: rows[6], cateringPrices: rows[7], activityEvents: rows[8], bookingLines: rows[9], dispatchOffers: rows[10], payoutClaims: rows[11], referrals: rows[12], payoutAccounts: rows[13] })
      if (issues.length) setError('Some partner sources could not be read: ' + issues.join(' · ') + '. Figures may be incomplete.')
    } catch (e) {
      setError(e && e.message ? e.message : 'Could not load partner operations.')
    } finally { setBusy(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    if (!data) return null
    const vendors = data.vendors
    const partnerIds = new Set(vendors.map(v => v.id))
    const services = data.services.filter(s => partnerIds.has(s.vendor_id))
    const live = services.filter(s => s.is_active && s.review_status === 'live')
    const dispatchable = live.filter(s => {
      const v = vendors.find(x => x.id === s.vendor_id)
      return v && v.is_verified && !v.suspended_at && v.accepting_jobs !== false
    })
    const waiting = vendors.filter(v => v.verification_status === 'submitted')
    const approved = vendors.filter(v => v.is_verified || v.verification_status === 'approved')
    const suspended = vendors.filter(v => v.verification_status === 'suspended' || v.suspended_at)
    const stranded = approved.filter(v => !live.some(s => s.vendor_id === v.id))
    const revised = services.filter(s => s.is_active && s.review_status === 'live' && s.revised_at && (!s.reviewed_at || new Date(s.revised_at) > new Date(s.reviewed_at)))
    const pendingDocs = data.docs.filter(d => ['pending','submitted','under_review','needs_review'].includes(String(d.status || '').toLowerCase()) || ['pending','submitted','under_review'].includes(String(d.provider_status || '').toLowerCase()))
    const pendingPricing = [...data.tradePrices, ...data.cateringPrices].filter(x => ['UNDER_REVIEW','ACTION_REQUIRED'].includes(x.status))
    const dispatchOffers = data.dispatchOffers.filter(o => partnerIds.has(o.vendor_id))
    const linkedLineIds = new Set(dispatchOffers.map(o => o.line_id))
    const bookingLines = data.bookingLines.filter(l => linkedLineIds.has(l.id))
    const payoutClaims = data.payoutClaims.filter(p => partnerIds.has(p.vendor_id))
    const openPayoutClaims = payoutClaims.filter(p => !['settled','paid','completed','complete','failed','cancelled','rejected'].includes(String(p.status || '').toLowerCase()))
    const acceptedOffers = dispatchOffers.filter(o => String(o.status || '').toLowerCase() === 'accepted')
    const expiredOffers = dispatchOffers.filter(o => String(o.status || '').toLowerCase() === 'expired')
    const referrals = data.referrals.filter(r => partnerIds.has(r.referrer_id) || partnerIds.has(r.referred_id))
    const cutoff30 = Date.now() - 30 * 86400000
    const recentPartnerEvents = data.activityEvents.filter(e => new Date(e.created_at || 0).getTime() >= cutoff30)
    const activeIds = new Set()
    for (const e of recentPartnerEvents) {
      if (e.vendor_id && partnerIds.has(e.vendor_id)) activeIds.add(e.vendor_id)
      else if (e.profile_id) {
        const linked = vendors.find(v => v.profile_id === e.profile_id)
        if (linked) activeIds.add(linked.id)
      }
    }
    const cutoff = range === 'all' ? 0 : Date.now() - Number(range) * 86400000
    const recent = items => items.filter(x => new Date(x.created_at || 0).getTime() >= cutoff)
    const days = range === '90' ? 30 : range === 'all' ? 12 : 14
    const timeline = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('en-CA')
      timeline.push({ day: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), partners: recent(vendors).filter(v => String(v.created_at || '').slice(0,10) === key).length, cards: recent(services).filter(s => String(s.created_at || '').slice(0,10) === key).length })
    }
    const lifecycle = [
      { name: 'Approved', value: approved.length, color: green },
      { name: 'Waiting review', value: waiting.length, color: amber },
      { name: 'Suspended', value: suspended.length, color: red },
      { name: 'Setup / other', value: Math.max(0, vendors.length - approved.length - waiting.length - suspended.length), color: slate },
    ].filter(x => x.value > 0)
    const byStatus = key => services.filter(s => s.review_status === key).length
    const leaders = vendors.map(v => {
      const own = services.filter(s => s.vendor_id === v.id)
      return { ...v, total: own.length, live: own.filter(s => s.is_active && s.review_status === 'live').length }
    }).sort((a,b) => b.live-a.live || b.total-a.total).slice(0,6)
    const topCards = live.slice().sort((a,b) => new Date(b.updated_at || b.created_at)-new Date(a.updated_at || a.created_at)).slice(0,10)
    const alerts = [
      { nav: 'partners', label: 'Partner applications waiting', count: waiting.length, tone: 'amber', detail: 'Submitted partner profiles need an operator decision.' },
      { nav: 'listing-review', label: 'Service cards to review', count: byStatus('under_review'), tone: 'amber', detail: 'Cards awaiting a first review.' },
      { nav: 'listing-review', label: 'Live cards changed after approval', count: revised.length, tone: 'purple', detail: 'Live cards contain edits not yet reviewed.' },
      { nav: 'verification', label: 'Identity uploads needing attention', count: pendingDocs.length, tone: 'amber', detail: 'Uploaded partner documents have a pending state.' },
      { nav: 'partners', label: 'Approved with no live card', count: stranded.length, tone: 'red', detail: 'Approved partners may still be undiscoverable.' },
      { nav: 'partners', label: 'Partner closure requests', count: vendors.filter(v => v.closure_requested_at).length, tone: 'red', detail: 'Closure requests need an operational decision.' },
      { nav: 'partners', label: 'Partner accounts suspended', count: suspended.length, tone: 'red', detail: 'Review reasons and current lifecycle status.' },
    ].filter(x => x.count > 0)
    return {
      vendors, services, live, dispatchable, waiting, approved, suspended, stranded, revised, pendingDocs, pendingPricing,
      lifecycle, timeline, leaders, topCards, alerts, tradeListings: data.trades.filter(t => partnerIds.has(t.vendor_id)),
      tradeCount: new Set(data.trades.filter(t => partnerIds.has(t.vendor_id)).map(t => t.trade_id || t.trade)).size,
      liveWork: data.work.filter(w => w.review_status === 'live').length,
      payoutReady: data.payouts.filter(p => !!p.verified_at).length,
      dispatchOffers, bookingLines, payoutClaims, openPayoutClaims, acceptedOffers, expiredOffers, referrals,
      activePartners30d: activeIds.size,
      partnerEvents30d: recentPartnerEvents.filter(e => (e.vendor_id && partnerIds.has(e.vendor_id)) || vendors.some(v => v.profile_id && v.profile_id === e.profile_id)).length,
      cardReview: byStatus('under_review'), rejected: byStatus('rejected'), inactive: services.filter(s => !s.is_active).length,
      rangeLabel: range === 'all' ? 'All time' : 'Last ' + range + ' days',
    }
  }, [data, range])

  function exportCards() {
    if (!stats) return
    const rows = [['Listing ID','Listing code','Partner ID','Partner code','Partner name','Category','Card name','Price guide','Unit','Review status','Partner status','Updated at']]
    stats.live.forEach(s => {
      const v = stats.vendors.find(x => x.id === s.vendor_id)
      rows.push([s.id,s.listing_code,v && v.id,v && v.partner_code,v && v.business_name,s.category,s.name,s.price,s.unit,s.review_status,v && v.verification_status,s.updated_at])
    })
    const csv = rows.map(row => row.map(value => '"' + String(value == null ? '' : value).replace(/"/g,'""') + '"').join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8;'}))
    const a = document.createElement('a'); a.href=url; a.download='sambramo-live-partner-cards-'+new Date().toISOString().slice(0,10)+'.csv'; a.click(); URL.revokeObjectURL(url)
  }

  if (!data && busy) return <Loading />
  if (!data) return <div className="rounded-3xl bg-white p-8 ring-1 ring-[#EEE8F3]"><p className="font-bold text-rose-700">The partner control tower could not load.</p><p className="mt-1 text-sm text-gray-500">{error}</p><button onClick={load} className="mt-4 rounded-xl bg-[#32184E] px-4 py-2 text-sm font-bold text-white">Retry</button></div>
  if (!stats) return null

  return <div className="space-y-5 text-[#27163D]">
    <section className="relative overflow-hidden rounded-[28px] bg-[#26123E] p-5 text-white shadow-[0_18px_54px_rgba(38,18,62,.18)] sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[32px] border-white/[0.04]"/>
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#D2BCE8]"><Sparkles size={13}/> Founder intelligence · partner network</div><h2 className="mt-2 text-[25px] font-black tracking-tight sm:text-[32px]">Partner control tower</h2><p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-white/65">A live view of partner acquisition, verification, every service card, pricing approval, uploads, and actual readiness to receive work. Each metric is derived from Sambramo's partner operating tables.</p></div>
        <div className="flex gap-2"><select aria-label="Date range" value={range} onChange={e=>setRange(e.target.value)} className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[12px] font-bold text-white outline-none [&>option]:text-[#27163D]"><option value="30">30 days</option><option value="90">90 days</option><option value="all">All time</option></select><button onClick={load} disabled={busy} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[12px] font-extrabold"><RefreshCw size={14} className={busy?'animate-spin':''}/> Refresh</button></div>
      </div>
      <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Hero icon={Building2} label="Real partners" value={stats.vendors.length} note={stats.approved.length+' approved'}/>
        <Hero icon={BadgeCheck} label="Live service cards" value={stats.live.length} note={stats.dispatchable.length+' dispatchable'}/>
        <Hero icon={Radio} label="Partners active · 30d" value={stats.activePartners30d} note={fmt(stats.partnerEvents30d)+' linked activity events'}/>
        <Hero icon={CircleDollarSign} label="Pricing packages live" value={[...data.tradePrices,...data.cateringPrices].filter(x=>['LIVE','PUBLISHED','ACTIVE'].includes(x.status)).length} note={stats.pendingPricing.length+' revisions waiting'}/>
      </div>
      <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-[11px] font-semibold text-white/60"><span>{fmt(stats.waiting.length)} partner decisions pending</span><span>{fmt(stats.cardReview)} listing cards waiting</span><span>{fmt(stats.stranded.length)} approved without a live card</span><span className="ml-auto text-white/45">{stats.rangeLabel}</span></div>
    </section>

    {error && <div role="status" className="rounded-2xl bg-amber-50 px-4 py-3 text-[11.5px] font-semibold text-amber-900 ring-1 ring-amber-200">{error}</div>}
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Metric icon={FileClock} label="Applications waiting" value={stats.waiting.length} note="Partner decision required" tone="amber" onClick={()=>onNavigate&&onNavigate('partners')}/>
      <Metric icon={FileText} label="Cards to review" value={stats.cardReview} note="First-time service review" tone="purple" onClick={()=>onNavigate&&onNavigate('listing-review')}/>
      <Metric icon={AlertTriangle} label="Approved but invisible" value={stats.stranded.length} note="No active live service card" tone="rose" onClick={()=>onNavigate&&onNavigate('partners')}/>
      <Metric icon={CircleDollarSign} label="Pricing revisions" value={stats.pendingPricing.length} note="Packages awaiting an operator decision" tone="blue" onClick={()=>onNavigate&&onNavigate('pricing-review')}/>
    </section>

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Metric icon={Radio} label="Partner dispatch offers" value={stats.dispatchOffers.length} note={stats.acceptedOffers.length + ' accepted · ' + stats.expiredOffers.length + ' expired'} tone="blue" onClick={()=>onNavigate&&onNavigate('live-ops')}/>
      <Metric icon={Activity} label="Booking lines linked" value={stats.bookingLines.length} note="Partner job-request history available" tone="purple" onClick={()=>onNavigate&&onNavigate('live-ops')}/>
      <Metric icon={CircleDollarSign} label="Payout claims to resolve" value={stats.openPayoutClaims.length} note={stats.payoutClaims.length + ' total recorded claims'} tone={stats.openPayoutClaims.length ? 'amber' : 'blue'} onClick={()=>onNavigate&&onNavigate('live-ops')}/>
      <Metric icon={ShieldCheck} label="Referral records" value={stats.referrals.length} note="Referral lifecycle events linked to partners" tone="purple" onClick={()=>onNavigate&&onNavigate('partners')}/>
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
      <Panel icon={Activity} title="Partner and listing growth" sub="New partner profiles and cards in the selected window">
        <div className="h-[235px]">{stats.timeline.some(x=>x.partners||x.cards)?<ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.timeline} margin={{top:8,right:8,bottom:0,left:-18}}><defs><linearGradient id="partner-growth" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={plum} stopOpacity={.28}/><stop offset="100%" stopColor={plum} stopOpacity={0}/></linearGradient><linearGradient id="card-growth" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={green} stopOpacity={.22}/><stop offset="100%" stopColor={green} stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#EEE8F3" vertical={false}/><XAxis dataKey="day" tick={{fill:slate,fontSize:10}} axisLine={false} tickLine={false} minTickGap={20}/><YAxis allowDecimals={false} tick={{fill:slate,fontSize:10}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid #EEE8F3',fontSize:12}}/><Area type="monotone" dataKey="partners" name="Partners" stroke={plum} fill="url(#partner-growth)" strokeWidth={2.5}/><Area type="monotone" dataKey="cards" name="Listing cards" stroke={green} fill="url(#card-growth)" strokeWidth={2.5}/></AreaChart></ResponsiveContainer>:<Empty title="No new partner records in this range" text="The chart updates as partners and service cards are created."/>}</div>
      </Panel>
      <Panel icon={ShieldCheck} title="Partner lifecycle" sub="Current verification state of real partner records">
        <div className="flex items-center gap-3"><div className="h-[175px] w-[50%] min-w-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.lifecycle} dataKey="value" nameKey="name" innerRadius={46} outerRadius={70} paddingAngle={3} stroke="none">{stats.lifecycle.map(x=><Cell key={x.name} fill={x.color}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div><div className="min-w-0 flex-1 space-y-3">{stats.lifecycle.map(x=><div key={x.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{background:x.color}}/><span className="min-w-0 flex-1 text-[10.5px] font-semibold text-gray-600">{x.name}</span><b className="text-[12px] tabular-nums">{fmt(x.value)}</b></div>)}<p className="border-t border-[#F0ECF5] pt-2 text-[10px] text-gray-400">Synthetic seed profiles excluded</p></div></div>
      </Panel>
    </section>

    <section className="grid gap-4 xl:grid-cols-2">
      <Panel icon={FileText} title="Listing card integrity" sub="Customer-facing service cards and their real review status">
        <div className="space-y-3"><Status label="Live cards" count={stats.live.length} total={stats.services.length} color={green} detail="Active service rows marked live"/><Status label="Under review" count={stats.cardReview} total={stats.services.length} color={amber} detail="Not yet cleared for discovery"/><Status label="Sent back" count={stats.rejected} total={stats.services.length} color={red} detail="Returned with a review note or rejected"/><Status label="Inactive / hidden" count={stats.inactive} total={stats.services.length} color={slate} detail="Cards not enabled by the partner or operator"/><Status label="Dispatchable cards" count={stats.dispatchable.length} total={stats.services.length} color={plum} detail="Live plus verified, non-suspended and accepting jobs"/></div>
        <div className="mt-4 rounded-2xl bg-[#F7F2FC] p-3.5"><p className="text-[11.5px] font-extrabold text-[#4A286E]">{stats.stranded.length} approved partners have no live service card</p><p className="mt-1 text-[10.5px] leading-relaxed text-[#6F5D7F]">Approval alone does not make a partner discoverable. Inspect listings, location and readiness in the partner registry.</p></div>
      </Panel>
      <Panel icon={AlertTriangle} title="Founder attention queue" sub="Partner risks and decisions that need a human">
        {stats.alerts.length?<div className="space-y-1.5">{stats.alerts.map(x=><button key={x.label} onClick={()=>onNavigate&&onNavigate(x.nav)} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-[#FAF7FD]"><span className={'grid h-8 w-8 shrink-0 place-items-center rounded-xl '+(x.tone==='red'?'bg-rose-50 text-rose-600':x.tone==='purple'?'bg-purple-50 text-purple-700':'bg-amber-50 text-amber-700')}>{x.tone==='red'?<AlertTriangle size={15}/>:<FileClock size={15}/>}</span><span className="min-w-0 flex-1"><span className="block text-[11px] font-extrabold">{x.label}</span><span className="mt-0.5 block text-[10px] leading-relaxed text-gray-500">{x.detail}</span></span><b className="text-[16px] tabular-nums">{fmt(x.count)}</b><ChevronRight size={14} className="text-gray-400"/></button>)}</div>:<Empty title="No outstanding flags found" text="This status summary uses only the connected partner tables."/>}
      </Panel>
    </section>

    <section className="grid gap-4 xl:grid-cols-[1fr_1.25fr]">
      <Panel icon={Building2} title="Partner supply leaders" sub="Ranked by active, live service cards" action={<button onClick={()=>onNavigate&&onNavigate('partners')} className="text-[11px] font-extrabold text-[#7547A5]">Open registry ↗</button>}>
        {stats.leaders.length?<div className="space-y-1">{stats.leaders.map((v,i)=><div key={v.id} className="flex items-center gap-3 rounded-xl px-2 py-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#F3ECFA] text-[12px] font-black text-[#7547A5]">{String(i+1).padStart(2,'0')}</span><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-extrabold">{v.business_name}</p><p className="mt-0.5 truncate text-[10px] text-gray-500">{[v.partner_code,v.category,v.city].filter(Boolean).join(' · ')||'Partner profile'}</p></div><div className="text-right"><p className="text-[14px] font-black">{v.live}</p><p className="text-[9px] text-gray-500">live / {v.total}</p></div></div>)}</div>:<Empty title="No real partners available"/>}
      </Panel>
      <Panel icon={BadgeCheck} title="Live customer-facing cards" sub="Recent service cards currently marked live and active" action={<button onClick={exportCards} className="flex items-center gap-1.5 rounded-lg bg-[#F5F0FB] px-2.5 py-1.5 text-[10px] font-extrabold text-[#62358E]"><Download size={12}/> Export CSV</button>}>
        {stats.topCards.length?<div className="overflow-x-auto"><table className="w-full min-w-[530px] text-left"><thead><tr className="border-b border-[#EEE8F3] text-[9px] font-extrabold uppercase tracking-[.12em] text-gray-400"><th className="py-2 pr-3">Card / ID</th><th className="py-2 pr-3">Partner</th><th className="py-2 pr-3">Category</th><th className="py-2 pr-3 text-right">Price</th><th className="py-2">Updated</th></tr></thead><tbody>{stats.topCards.map(s=>{const v=stats.vendors.find(x=>x.id===s.vendor_id);return <tr key={s.id} className="border-b border-[#F4F0F7] last:border-0"><td className="py-2.5 pr-3"><p className="max-w-[145px] truncate text-[11px] font-extrabold">{s.name}</p><p className="mt-0.5 font-mono text-[9px] text-gray-500">{s.listing_code||s.id.slice(0,8)}</p></td><td className="py-2.5 pr-3"><p className="max-w-[130px] truncate text-[10px] font-bold">{v?v.business_name:'Unknown partner'}</p><p className="font-mono text-[9px] text-gray-500">{v?(v.partner_code||v.id.slice(0,8)):'—'}</p></td><td className="py-2.5 pr-3 text-[10px] text-gray-600">{s.category||'—'}</td><td className="py-2.5 pr-3 text-right text-[10.5px] font-extrabold">{s.price==null?'Quote':money(s.price)}</td><td className="py-2.5 text-[10px] text-gray-500">{ago(s.updated_at||s.created_at)}</td></tr>})}</tbody></table></div>:<Empty title="No live cards" text="There are no active service rows marked live in the source table."/>}
      </Panel>
    </section>

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-5"><Mini label="Partner trade listings" value={fmt(stats.tradeListings.length)} note={fmt(stats.tradeCount)+' trade types represented'}/><Mini label="Portfolio items" value={fmt(data.work.length)} note={fmt(stats.liveWork)+' approved for display'}/><Mini label="Documents uploaded" value={fmt(data.docs.length)} note={fmt(stats.pendingDocs.length)+' in pending review states'}/><Mini label="Payout readiness" value={fmt(stats.payoutReady)} note="Partner payout profiles marked verified"/><Mini label="Activity events · 30d" value={fmt(stats.partnerEvents30d)} note="Telemetry linked to real partners"/></section>
    <p className="px-1 text-[10px] leading-relaxed text-gray-400">Definitions: live-card counts come from vendor_services; trade coverage comes from partner_listings. Dispatchable cards additionally require an approved, non-suspended partner who is accepting jobs. Pricing packages follow their package status fields; payout readiness counts verified payout profiles. Synthetic seed partners are excluded.</p>
  </div>
}

function Loading(){return <div className="grid min-h-[320px] place-items-center rounded-[28px] bg-white ring-1 ring-[#EEE8F3]"><div className="text-center"><RefreshCw size={22} className="mx-auto animate-spin text-[#7847A8]"/><p className="mt-3 text-[13px] font-bold text-gray-600">Bringing the partner network into focus…</p><p className="mt-1 text-[11px] text-gray-400">Reading verified partner, listing and pricing records</p></div></div>}
function Hero({icon:Icon,label,value,note}){return <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 sm:p-4"><div className="flex items-center gap-2 text-white/60"><Icon size={14}/><span className="text-[10px] font-bold">{label}</span></div><p className="mt-2 truncate text-[22px] font-black tracking-tight sm:text-[25px]">{value}</p><p className="mt-1 truncate text-[10px] font-semibold text-white/50">{note}</p></div>}
function Metric({icon:Icon,label,value,note,tone,onClick}){const colors={amber:'bg-amber-50 text-amber-700',purple:'bg-purple-50 text-purple-700',rose:'bg-rose-50 text-rose-700',blue:'bg-sky-50 text-sky-700'};return <button onClick={onClick} className="rounded-[22px] bg-white p-4 text-left ring-1 ring-[#EDE6F3] transition hover:-translate-y-0.5 hover:shadow-lg"><span className={'grid h-9 w-9 place-items-center rounded-xl '+colors[tone]}><Icon size={17}/></span><p className="mt-4 text-[25px] font-black tracking-tight">{fmt(value)}</p><p className="mt-1 text-[11.5px] font-extrabold">{label}</p><p className="mt-1 text-[10px] text-gray-500">{note}</p></button>}
function Panel({title,sub,icon:Icon,action,children}){return <section className="min-w-0 rounded-[24px] bg-white p-4 ring-1 ring-[#EEE8F3] sm:p-5"><div className="mb-4 flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F4EFFA] text-[#71439C]"><Icon size={16}/></span><div className="min-w-0 flex-1"><h3 className="text-[14px] font-black">{title}</h3><p className="mt-1 text-[10.5px] leading-relaxed text-gray-500">{sub}</p></div>{action}</div>{children}</section>}
function Status({label,count,total,color,detail}){const pct=total?Math.min(100,count/total*100):0;return <div><div className="flex items-center justify-between gap-2"><span className="text-[11.5px] font-extrabold">{label}</span><span className="text-[11.5px] font-black tabular-nums">{fmt(count)} <span className="font-medium text-gray-400">/ {fmt(total)}</span></span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F1ECF6]"><div className="h-full rounded-full transition-all duration-500" style={{width:pct+'%',background:color}}/></div><p className="mt-1 text-[10px] text-gray-400">{detail}</p></div>}
function Mini({label,value,note}){return <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-[#EEE8F3]"><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-gray-400">{label}</p><p className="mt-1.5 text-[21px] font-black">{value}</p><p className="mt-1 text-[10px] text-gray-500">{note}</p></div>}
function Empty({title,text}){return <div className="flex min-h-[125px] flex-col items-center justify-center rounded-2xl bg-[#FBF9FD] p-4 text-center"><Activity size={18} className="text-[#C1B4D0]"/><p className="mt-2 text-[11.5px] font-extrabold text-[#594B66]">{title}</p>{text&&<p className="mt-1 max-w-xs text-[10px] leading-relaxed text-gray-400">{text}</p>}</div>}
