import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, CheckCircle2, ChevronRight, Clipboard, FileText, Loader2, Mail, MessageSquareText, Phone, RefreshCw, Search, ShoppingBag, UserRound, Users, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const fmt = n => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(n || 0))
const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0))
const date = x => x ? new Date(x).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const time = x => x ? new Date(x).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
const rowsOf = r => r && !r.error ? (r.data || []) : []
const errOf = r => r && r.error ? r.error.message : ''
const isOpen = status => !['resolved', 'closed', 'complete', 'completed'].includes(String(status || '').toLowerCase())

export default function CustomerConsole() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [role, setRole] = useState('customer')
  const [selected, setSelected] = useState(null)
  const [detailTab, setDetailTab] = useState('overview')
  const [note, setNote] = useState('')
  const [noteKind, setNoteKind] = useState('internal')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const res = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,phone,role,city,created_at,language,referral_code,referred_by').order('created_at', { ascending: false }),
      supabase.from('events').select('id,customer_id,event_code,event_type,event_date,city,area,status,priority,created_at,guest_count,customer_name'),
      supabase.from('orders').select('id,customer_id,status,total,payment_status,created_at,updated_at'),
      supabase.from('service_enquiries').select('id,customer_id,event_name,event_date,status,intake_status,created_at,quoted_price,lock_payment_status'),
      supabase.from('complaints').select('id,customer_id,subject_type,order_id,enquiry_id,message,status,admin_reply,created_at,resolved_at'),
      supabase.from('admin_lifecycle_notes').select('id,target_type,customer_id,note_kind,body,created_by,created_at').eq('target_type', 'customer').order('created_at', { ascending: false }),
      supabase.from('admin_lifecycle_audit').select('id,entity_type,entity_id,customer_id,action,before_state,after_state,actor_id,actor_role,note,created_at').eq('entity_type', 'customer').order('created_at', { ascending: false }),
    ])
    const labels = ['profiles', 'celebrations', 'orders', 'service enquiries', 'complaints', 'customer notes', 'customer audit']
    const fails = res.map((r, i) => errOf(r) ? labels[i] + ': ' + errOf(r) : '').filter(Boolean)
    const arr = res.map(rowsOf)
    setData({ profiles: arr[0], events: arr[1], orders: arr[2], enquiries: arr[3], complaints: arr[4], notes: arr[5], audit: arr[6] })
    if (fails.length) setError('Some customer sources could not be read: ' + fails.join(' · '))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const metrics = useMemo(() => {
    if (!data) return null
    const customers = data.profiles.filter(p => p.role === 'customer')
    const events = data.events.filter(e => customers.some(c => c.id === e.customer_id))
    const orders = data.orders.filter(o => customers.some(c => c.id === o.customer_id))
    const enquiries = data.enquiries.filter(e => customers.some(c => c.id === e.customer_id))
    const complaints = data.complaints.filter(c => customers.some(x => x.id === c.customer_id))
    const open = complaints.filter(c => isOpen(c.status))
    const last30 = Date.now() - 30 * 86400000
    return {
      customers, events, orders, enquiries, complaints, open,
      new30: customers.filter(c => new Date(c.created_at).getTime() >= last30).length,
      paid: orders.filter(o => ['paid','captured','succeeded','completed','complete'].includes(String(o.payment_status || '').toLowerCase())),
    }
  }, [data])

  const visible = useMemo(() => {
    if (!data) return []
    const profiles = data.profiles.filter(p => role === 'all' || p.role === role)
    const term = q.trim().toLowerCase()
    const counts = p => {
      const orders = data.orders.filter(x => x.customer_id === p.id)
      const events = data.events.filter(x => x.customer_id === p.id)
      const complaints = data.complaints.filter(x => x.customer_id === p.id && isOpen(x.status))
      return { orderCount: orders.length, eventCount: events.length, openCount: complaints.length, spend: orders.filter(o => ['paid','captured','succeeded','completed','complete'].includes(String(o.payment_status || '').toLowerCase())).reduce((n,o)=>n+Number(o.total||0),0) }
    }
    return profiles.filter(p => !term || [p.full_name,p.email,p.phone,p.city,p.id].some(v => String(v || '').toLowerCase().includes(term))).map(p => ({ ...p, ...counts(p) }))
  }, [data, q, role])

  async function addNote() {
    const body = note.trim()
    if (!body || !selected || !user?.id) return
    setBusy('note'); setNotice('')
    try {
      const { error: err } = await supabase.from('admin_lifecycle_notes').insert({
        target_type: 'customer', customer_id: selected.id, note_kind: noteKind, body, created_by: user.id,
      })
      if (err) throw err
      setNote(''); setNotice('Internal note saved to the customer timeline.')
      await load()
    } catch (e) { setNotice(e && e.message ? e.message : 'Could not save the note.') }
    finally { setBusy('') }
  }

  async function resolveComplaint(item) {
    if (!item || !item.id) return
    setBusy('complaint:' + item.id); setNotice('')
    try {
      const { data: row, error: err } = await supabase.from('complaints')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), admin_reply: item.admin_reply || 'Resolved by Sambramo operations.' })
        .eq('id', item.id).select('id,status,resolved_at').single()
      if (err) throw err
      if (!row || row.status !== 'resolved') throw new Error('The complaint status did not persist.')
      setNotice('Complaint marked resolved.')
      await load()
    } catch (e) { setNotice(e && e.message ? e.message : 'Could not resolve complaint.') }
    finally { setBusy('') }
  }

  async function copyId(id) {
    try { await navigator.clipboard.writeText(id); setNotice('Customer ID copied.') }
    catch { setNotice('Select and copy this ID: ' + id) }
  }

  function exportCustomers() {
    const header = ['Customer ID','Name','Email','Phone','City','Joined','Events','Orders','Open complaints','Paid order value']
    const csvRows = [header, ...visible.map(p => [p.id,p.full_name,p.email,p.phone,p.city,p.created_at,p.eventCount,p.orderCount,p.openCount,p.spend])]
    const csv = csvRows.map(row => row.map(x => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"').join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a'); a.href = url; a.download = 'sambramo-customer-registry-' + new Date().toISOString().slice(0,10) + '.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const openCustomer = customer => { setSelected(customer); setDetailTab('overview'); setNote(''); setNotice('') }
  const selectedFresh = selected && data ? data.profiles.find(p => p.id === selected.id) || selected : selected
  const customerNotes = selectedFresh && data ? data.notes.filter(n => n.customer_id === selectedFresh.id) : []
  const customerAudit = selectedFresh && data ? data.audit.filter(n => n.customer_id === selectedFresh.id) : []
  const customerEvents = selectedFresh && data ? data.events.filter(e => e.customer_id === selectedFresh.id) : []
  const customerOrders = selectedFresh && data ? data.orders.filter(o => o.customer_id === selectedFresh.id) : []
  const customerEnquiries = selectedFresh && data ? data.enquiries.filter(e => e.customer_id === selectedFresh.id) : []
  const customerComplaints = selectedFresh && data ? data.complaints.filter(c => c.customer_id === selectedFresh.id) : []
  const customerPaid = customerOrders.filter(o => ['paid','captured','succeeded','completed','complete'].includes(String(o.payment_status || '').toLowerCase())).reduce((n,o)=>n+Number(o.total||0),0)

  return <div className="space-y-5 text-[#27163D]">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#7950A0]">Customer lifecycle</p><h2 className="mt-1 text-[24px] font-black tracking-tight">Customer 360</h2><p className="mt-1 max-w-2xl text-[12px] text-gray-500">One customer profile joined to celebrations, orders, enquiries, complaints and internal support notes.</p></div><button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[12px] font-extrabold ring-1 ring-[#E9E1F0]"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh</button></header>

    {metrics && <section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Tile icon={Users} label="Customers" value={metrics.customers.length} note={metrics.new30 + ' joined in last 30 days'} tone="plum"/><Tile icon={CalendarDays} label="Celebrations" value={metrics.events.length} note="Linked to customer profiles" tone="blue"/><Tile icon={ShoppingBag} label="Orders" value={metrics.orders.length} note={metrics.paid.length + ' marked paid/captured' } tone="green"/><Tile icon={AlertCircle} label="Open customer issues" value={metrics.open.length} note="Complaints not marked resolved" tone="rose"/></section>}

    {error && <p role="status" className="rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">{error}</p>}
    {notice && <div role="status" className="rounded-xl bg-[#F2ECFA] px-3 py-2.5 text-[11px] font-semibold text-[#563378]">{notice}<button onClick={()=>setNotice('')} className="ml-2 underline">Dismiss</button></div>}

    <section className="overflow-hidden rounded-[24px] bg-white ring-1 ring-[#EEE8F3]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#F0EBF4] p-3.5 sm:p-4"><div className="relative min-w-[210px] flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search customer name, email, phone or full ID" className="w-full rounded-xl bg-[#FBF9FD] py-2.5 pl-9 pr-3 text-[12px] outline-none ring-1 ring-[#EEE8F3] focus:ring-2 focus:ring-[#C8B2E1]"/></div><select value={role} onChange={e=>setRole(e.target.value)} className="rounded-xl bg-white px-3 py-2.5 text-[12px] font-bold ring-1 ring-[#EEE8F3]"><option value="customer">Customers only</option><option value="all">All roles</option><option value="vendor">Partner accounts</option><option value="admin">Admin accounts</option></select><button onClick={exportCustomers} className="flex items-center gap-1.5 rounded-xl bg-[#F4EFFA] px-3 py-2.5 text-[11px] font-extrabold text-[#693F94]"><Clipboard size={13}/> Export CSV</button></div>

      {loading && !data ? <div className="p-12 text-center"><Loader2 size={22} className="mx-auto animate-spin text-[#7847A8]"/><p className="mt-2 text-[12px] text-gray-500">Loading customer relationships…</p></div> : visible.length === 0 ? <div className="p-12 text-center"><Users size={24} className="mx-auto text-gray-300"/><p className="mt-2 text-[13px] font-extrabold">No matching profiles</p><p className="mt-1 text-[11px] text-gray-400">Try another name, ID, phone or role filter.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left"><thead><tr className="border-b border-[#EEE8F3] bg-[#FBF9FD] text-[9px] font-extrabold uppercase tracking-[.12em] text-gray-400"><th className="px-4 py-3">Customer identity</th><th className="px-3 py-3">Contact</th><th className="px-3 py-3">Joined</th><th className="px-3 py-3 text-right">Events</th><th className="px-3 py-3 text-right">Orders</th><th className="px-3 py-3 text-right">Paid value</th><th className="px-3 py-3 text-right">Open issues</th><th className="px-4 py-3"/></tr></thead><tbody>{visible.map(p=><tr key={p.id} className="border-b border-[#F4F0F7] last:border-0 hover:bg-[#FCFAFE]"><td className="px-4 py-3"><button onClick={()=>openCustomer(p)} className="max-w-[245px] text-left"><span className="block truncate text-[12px] font-extrabold">{p.full_name || 'Unnamed customer'}</span><span className="mt-0.5 block font-mono text-[9px] text-gray-400">{p.id.slice(0,8)}…{p.id.slice(-4)} · {p.city || 'City not set'}</span></button></td><td className="px-3 py-3"><p className="max-w-[180px] truncate text-[10.5px] font-semibold">{p.email || 'No email'}</p><p className="mt-0.5 text-[10px] text-gray-500">{p.phone || 'No phone'}</p></td><td className="px-3 py-3 text-[10.5px] text-gray-600">{date(p.created_at)}</td><td className="px-3 py-3 text-right text-[12px] font-bold tabular-nums">{fmt(data.events.filter(e=>e.customer_id===p.id).length)}</td><td className="px-3 py-3 text-right text-[12px] font-bold tabular-nums">{fmt(data.orders.filter(o=>o.customer_id===p.id).length)}</td><td className="px-3 py-3 text-right text-[11px] font-extrabold tabular-nums">{money(data.orders.filter(o=>o.customer_id===p.id&&['paid','captured','succeeded','completed','complete'].includes(String(o.payment_status||'').toLowerCase())).reduce((n,o)=>n+Number(o.total||0),0))}</td><td className="px-3 py-3 text-right">{data.complaints.filter(c=>c.customer_id===p.id&&isOpen(c.status)).length>0?<span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-extrabold text-rose-700">{data.complaints.filter(c=>c.customer_id===p.id&&isOpen(c.status)).length}</span>:<span className="text-[10px] text-gray-300">—</span>}</td><td className="px-4 py-3"><button onClick={()=>openCustomer(p)} aria-label="Open customer detail" className="rounded-lg p-2 hover:bg-[#F4EFFA]"><ChevronRight size={15}/></button></td></tr>)}</tbody></table></div>}
      <footer className="border-t border-[#F0EBF4] px-4 py-3 text-[10px] text-gray-400">Showing {fmt(visible.length)} of {fmt(data ? data.profiles.filter(p=>role==='all'||p.role===role).length : 0)} profiles. Select a row for the joined customer timeline and support controls.</footer>
    </section>

    {selectedFresh && <div className="fixed inset-0 z-[70] flex justify-end bg-[#1D1029]/45 backdrop-blur-[2px]" onClick={()=>setSelected(null)}><aside role="dialog" aria-modal="true" aria-label="Customer details" onClick={e=>e.stopPropagation()} className="h-full w-full max-w-[690px] overflow-y-auto bg-[#FCFAFE] shadow-2xl">
      <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-[#EEE8F3] bg-white/95 px-5 py-4 backdrop-blur"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F0E8F8] text-[#70469A]"><UserRound size={19}/></div><div className="min-w-0 flex-1"><p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-[#7D5A9C]">Customer record</p><h3 className="mt-1 truncate text-[18px] font-black">{selectedFresh.full_name || 'Unnamed customer'}</h3><p className="mt-0.5 truncate font-mono text-[10px] text-gray-400">{selectedFresh.id}</p></div><button onClick={()=>setSelected(null)} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100" aria-label="Close customer details"><X size={18}/></button></header>
      <div className="space-y-4 p-4 sm:p-5">
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4"><SmallStat label="Events" value={customerEvents.length}/><SmallStat label="Orders" value={customerOrders.length}/><SmallStat label="Paid value" value={money(customerPaid)}/><SmallStat label="Open issues" value={customerComplaints.filter(c=>isOpen(c.status)).length}/></section>
        <section className="rounded-2xl bg-white p-4 ring-1 ring-[#EEE8F3]"><div className="flex items-center justify-between gap-2"><h4 className="text-[12px] font-black">Account & contact</h4><button onClick={()=>copyId(selectedFresh.id)} className="flex items-center gap-1 text-[10px] font-extrabold text-[#70469A]"><Clipboard size={12}/> Copy ID</button></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><Info icon={Mail} label="Email" value={selectedFresh.email}/><Info icon={Phone} label="Phone" value={selectedFresh.phone}/><Info icon={Users} label="Role" value={selectedFresh.role}/><Info icon={CalendarDays} label="Joined" value={time(selectedFresh.created_at)}/><Info icon={UserRound} label="City" value={selectedFresh.city}/><Info icon={FileText} label="Language" value={selectedFresh.language}/></div><div className="mt-3 rounded-xl bg-[#FBF9FD] p-3"><p className="text-[9px] font-extrabold uppercase tracking-wide text-gray-400">Referral relationship</p><p className="mt-1 text-[11px] font-semibold">{selectedFresh.referral_code || 'No referral code'}{selectedFresh.referred_by ? ' · referred by ' + selectedFresh.referred_by : ' · no referrer recorded'}</p></div></section>

        <nav className="flex flex-wrap gap-1 rounded-xl bg-[#F1ECF6] p-1">{[['overview','Overview'],['activity','Activity & support'],['notes','Internal notes'],['audit','Audit trail']].map(([id,label])=><button key={id} onClick={()=>setDetailTab(id)} className={'rounded-lg px-3 py-2 text-[10.5px] font-extrabold '+(detailTab===id?'bg-white text-[#352044] shadow-sm':'text-gray-500')}>{label}</button>)}</nav>

        {detailTab==='overview' && <div className="space-y-3">
          <section className="rounded-2xl bg-white p-4 ring-1 ring-[#EEE8F3]"><h4 className="text-[12px] font-black">Celebrations & enquiries</h4><div className="mt-3 space-y-2">{customerEvents.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5).map(e=><div key={e.id} className="flex items-start gap-2 rounded-xl bg-[#FBF9FD] p-3"><CalendarDays size={14} className="mt-0.5 text-[#8456AC]"/><div className="min-w-0 flex-1"><p className="text-[11.5px] font-extrabold">{e.event_type || e.event_code || 'Celebration'} <span className="font-mono text-[9px] text-gray-400">{e.event_code ? '· '+e.event_code : ''}</span></p><p className="mt-0.5 text-[10px] text-gray-500">{[e.city,e.area,date(e.event_date)].filter(Boolean).join(' · ') || 'Details incomplete'} · {e.status || 'Status unknown'}</p></div></div>)}{customerEnquiries.slice(0,5).map(e=><div key={e.id} className="flex items-start gap-2 rounded-xl bg-[#FBF9FD] p-3"><MessageSquareText size={14} className="mt-0.5 text-[#8456AC]"/><div className="min-w-0 flex-1"><p className="text-[11.5px] font-extrabold">{e.event_name || 'Service enquiry'}</p><p className="mt-0.5 text-[10px] text-gray-500">{date(e.created_at)} · {e.status || e.intake_status || 'Status unknown'}</p></div></div>)}{!customerEvents.length&&!customerEnquiries.length&&<Blank text="No celebration or service-enquiry rows are linked to this profile yet."/>}</div></section>
          <section className="rounded-2xl bg-white p-4 ring-1 ring-[#EEE8F3]"><h4 className="text-[12px] font-black">Orders & payments</h4><div className="mt-3 space-y-2">{customerOrders.map(o=><div key={o.id} className="flex items-center gap-3 rounded-xl bg-[#FBF9FD] p-3"><ShoppingBag size={14} className="text-[#8456AC]"/><div className="min-w-0 flex-1"><p className="truncate font-mono text-[10px] font-bold">{o.id}</p><p className="mt-0.5 text-[10px] text-gray-500">{date(o.created_at)} · {o.payment_status || 'Payment status unknown'}</p></div><div className="text-right"><p className="text-[12px] font-black">{money(o.total)}</p><p className="text-[10px] text-gray-500">{o.status}</p></div></div>)}{!customerOrders.length&&<Blank text="No order rows are linked to this profile yet."/>}</div></section>
        </div>}

        {detailTab==='activity' && <div className="space-y-3"><section className="rounded-2xl bg-white p-4 ring-1 ring-[#EEE8F3]"><h4 className="text-[12px] font-black">Customer complaints & support</h4><div className="mt-3 space-y-2">{customerComplaints.map(c=><div key={c.id} className="rounded-xl border border-[#EEE8F3] p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-[11.5px] font-extrabold">{c.subject_type || 'Support issue'} · {c.status}</p><p className="mt-1 text-[10px] text-gray-500">{time(c.created_at)}</p></div>{isOpen(c.status)&&<button onClick={()=>resolveComplaint(c)} disabled={busy==='complaint:'+c.id} className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-extrabold text-emerald-800 disabled:opacity-50">{busy==='complaint:'+c.id?'Saving…':'Mark resolved'}</button>}</div><p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-gray-600">{c.message || 'No message text'}</p>{c.admin_reply&&<p className="mt-2 rounded-lg bg-[#F6F1FB] p-2 text-[10.5px] text-[#563378]">Reply: {c.admin_reply}</p>}</div>)}{!customerComplaints.length&&<Blank text="No complaints are linked to this customer."/>}</div></section><section className="rounded-2xl bg-white p-4 ring-1 ring-[#EEE8F3]"><h4 className="text-[12px] font-black">Full enquiry list</h4><div className="mt-3 space-y-2">{customerEnquiries.map(e=><div key={e.id} className="rounded-xl bg-[#FBF9FD] p-3"><div className="flex justify-between gap-2"><p className="text-[11px] font-extrabold">{e.event_name || 'Service enquiry'}</p><span className="text-[10px] text-gray-500">{e.status || e.intake_status}</span></div><p className="mt-1 text-[10px] text-gray-500">{date(e.created_at)} · {e.lock_payment_status || 'No deposit status'}</p></div>)}{!customerEnquiries.length&&<Blank text="No enquiries found."/ >}</div></section></div>}

        {detailTab==='notes' && <section className="rounded-2xl bg-white p-4 ring-1 ring-[#EEE8F3]"><h4 className="text-[12px] font-black">Internal customer notes</h4><p className="mt-1 text-[10px] leading-relaxed text-gray-500">Operator-only notes; not visible to the customer. Keep sensitive personal data out of the note body.</p><div className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr]"><select value={noteKind} onChange={e=>setNoteKind(e.target.value)} className="rounded-xl border border-[#EAE1F1] bg-white px-3 py-2.5 text-[11px] font-bold"><option value="internal">Internal</option><option value="follow_up">Follow-up</option><option value="risk">Risk</option><option value="support">Support</option><option value="compliance">Compliance</option></select><textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={4000} placeholder="Add a dated support or follow-up note…" className="w-full resize-y rounded-xl border border-[#EAE1F1] bg-[#FBF9FD] px-3 py-2.5 text-[11.5px] outline-none focus:ring-2 focus:ring-[#C8B2E1]"/></div><div className="mt-2 flex items-center justify-between"><span className="text-[10px] text-gray-400">{note.length}/4000 characters</span><button onClick={addNote} disabled={busy==='note'||!note.trim()} className="rounded-xl bg-[#351C50] px-4 py-2 text-[11px] font-extrabold text-white disabled:opacity-40">{busy==='note'?'Saving…':'Save note'}</button></div><div className="mt-4 space-y-2">{customerNotes.map(n=><div key={n.id} className="rounded-xl border border-[#EEE8F3] p-3"><div className="flex justify-between gap-2"><span className="rounded-full bg-[#F1EAF8] px-2 py-1 text-[9px] font-extrabold uppercase text-[#70469A]">{n.note_kind.replace(/_/g,' ')}</span><time className="text-[9.5px] text-gray-400">{time(n.created_at)}</time></div><p className="mt-2 whitespace-pre-wrap text-[11.5px] leading-relaxed">{n.body}</p><p className="mt-2 font-mono text-[9px] text-gray-400">note ID {n.id}</p></div>)}{!customerNotes.length&&<Blank text="No operator notes yet. Add the first follow-up here."/ >}</div></section>}

        {detailTab==='audit' && <section className="rounded-2xl bg-white p-4 ring-1 ring-[#EEE8F3]"><h4 className="text-[12px] font-black">System audit trail</h4><p className="mt-1 text-[10px] text-gray-500">Append-only events recorded when relevant customer account state changes.</p><div className="mt-4 space-y-2">{customerAudit.map(a=><div key={a.id} className="flex gap-3 rounded-xl bg-[#FBF9FD] p-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#8658AD]"/><div className="min-w-0 flex-1"><p className="text-[11px] font-extrabold">{String(a.action||'Customer change').replace(/\./g,' · ').replace(/_/g,' ')}</p><p className="mt-1 text-[10px] text-gray-500">{time(a.created_at)} · {a.actor_role || 'system'}</p><p className="mt-1 font-mono text-[9px] text-gray-400">audit {a.id}</p>{(a.before_state||a.after_state)&&<details className="mt-2"><summary className="cursor-pointer text-[10px] font-bold text-[#70469A]">Show change payload</summary><pre className="mt-2 overflow-x-auto rounded-lg bg-white p-2 text-[9px]">{JSON.stringify({before:a.before_state,after:a.after_state},null,2)}</pre></details>}</div></div>)}{!customerAudit.length&&<Blank text="No state-change audit records recorded for this customer yet."/ >}</div></section>}
      </div>
    </aside></div>}
  </div>
}

function Tile({icon:Icon,label,value,note,tone}) { const cls={plum:'bg-[#F2ECFA] text-[#70469A]',blue:'bg-sky-50 text-sky-700',green:'bg-emerald-50 text-emerald-700',rose:'bg-rose-50 text-rose-700'}; return <div className="rounded-[20px] bg-white p-4 ring-1 ring-[#EEE8F3]"><span className={'grid h-9 w-9 place-items-center rounded-xl '+cls[tone]}><Icon size={17}/></span><p className="mt-3 text-[24px] font-black">{fmt(value)}</p><p className="mt-1 text-[11px] font-extrabold">{label}</p><p className="mt-1 text-[10px] text-gray-500">{note}</p></div> }
function SmallStat({label,value}) { return <div className="rounded-xl bg-white p-3 ring-1 ring-[#EEE8F3]"><p className="text-[9px] font-extrabold uppercase tracking-wide text-gray-400">{label}</p><p className="mt-1 break-words text-[14px] font-black">{value}</p></div> }
function Info({icon:Icon,label,value}) { return <div className="flex min-w-0 gap-2"><Icon size={13} className="mt-0.5 shrink-0 text-gray-400"/><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{label}</p><p className="mt-0.5 break-words text-[11px] font-semibold">{value || 'Not provided'}</p></div></div> }
function Blank({text}) { return <p className="rounded-xl bg-[#FBF9FD] px-3 py-4 text-[11px] leading-relaxed text-gray-400">{text}</p> }
