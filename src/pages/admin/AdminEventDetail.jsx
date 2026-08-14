import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Phone, MessageCircle, Loader2, AlertCircle,
  Plus, X, CheckSquare, Square, Send, Save,
  User, MapPin, Calendar, Users, DollarSign,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  EVENT_STATUSES, STATUS_CSS, PRIORITIES, EVENT_TYPE_EMOJIS,
  DEFAULT_TASKS,
} from '../../config/sambramo'
import { formatDate, formatINR, todayISO } from '../../utils/format'

/* ── Shared small components ───────────────────────────────────── */
function StatusBadge({ status }) {
  const css   = STATUS_CSS[status]  ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  const label = EVENT_STATUSES[status]?.label ?? status
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${css.bg} ${css.text}`}>
      {EVENT_STATUSES[status]?.icon ?? ''} {label}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const p = PRIORITIES[priority] ?? PRIORITIES.NORMAL
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${p.text}`}>
      <span className={`w-2 h-2 rounded-full ${p.dot}`} />
      {p.label}
    </span>
  )
}

function SectionCard({ title, children, className = '' }) {
  return (
    <div className={`card p-5 space-y-4 ${className}`}>
      {title && <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>}
      {children}
    </div>
  )
}

/* ── TAB: Overview ─────────────────────────────────────────────── */
function OverviewTab({ event, onRefresh }) {
  const { profile } = useAuth()
  const [newStatus,   setNewStatus]   = useState(event.status ?? '')
  const [newPriority, setNewPriority] = useState(event.priority ?? 'NORMAL')
  const [coordId,     setCoordId]     = useState(event.assigned_coordinator ?? '')
  const [admins,      setAdmins]      = useState([])
  const [services,    setServices]    = useState([])
  const [notes,       setNotes]       = useState([])
  const [noteText,    setNoteText]    = useState('')
  const [saving,      setSaving]      = useState({})
  const [notesBusy,   setNotesBusy]   = useState(false)

  useEffect(() => {
    // Fetch admins for coordinator dropdown
    supabase.from('profiles').select('id, full_name').eq('role', 'admin')
      .then(({ data }) => setAdmins(data ?? []))

    // Fetch service selections
    supabase.from('event_services').select('*').eq('event_id', event.id)
      .then(({ data }) => setServices(data ?? []))

    // Fetch recent notes (5)
    supabase.from('event_internal_notes')
      .select('*, profiles(full_name)')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setNotes(data ?? []))
  }, [event.id])

  async function updateField(field, value, key) {
    setSaving(s => ({ ...s, [key]: true }))
    await supabase.from('events').update({ [field]: value }).eq('id', event.id)
    setSaving(s => ({ ...s, [key]: false }))
    onRefresh()
  }

  async function addNote() {
    if (!noteText.trim()) return
    setNotesBusy(true)
    const { data } = await supabase.from('event_internal_notes').insert({
      event_id:   event.id,
      note:       noteText.trim(),
      created_by: profile?.id,
    }).select('*, profiles(full_name)').single()
    if (data) setNotes(prev => [data, ...prev])
    setNoteText('')
    setNotesBusy(false)
  }

  const customer = event.profiles
  const whatsappUrl = customer?.phone
    ? `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${customer.full_name ?? ''}, this is your Sambramo coordinator. How can we help you today?`)}`
    : null

  return (
    <div className="space-y-5">
      {/* Event header */}
      <div className="card p-5 flex flex-wrap items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-plum-700 bg-plum-50 px-2 py-0.5 rounded">
              {event.event_code ?? event.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-2xl">{EVENT_TYPE_EMOJIS[event.event_type] ?? '🎉'}</span>
            <span className="font-bold text-gray-900 capitalize">{event.event_type?.replace(/-/g, ' ')}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <StatusBadge status={event.status} />
            <PriorityBadge priority={event.priority} />
          </div>
        </div>
        {/* Quick contact actions */}
        <div className="flex gap-2 shrink-0">
          {customer?.phone && (
            <>
              <a href={`tel:${customer.phone}`}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
                <Phone size={14} /> Call
              </a>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Customer info */}
        <SectionCard title="Customer">
          <div className="space-y-2.5 text-sm">
            <Row icon={<User size={14} />}       label="Name"     value={customer?.full_name ?? '—'} />
            <Row icon={<Phone size={14} />}      label="Phone"    value={customer?.phone
              ? <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">{customer.phone}</a>
              : '—'} />
            <Row icon={<Send size={14} />}       label="Email"    value={customer?.email ?? '—'} />
            <Row icon={<MessageCircle size={14} />} label="Preferred contact" value={event.preferred_contact ?? '—'} />
          </div>
        </SectionCard>

        {/* Event details */}
        <SectionCard title="Event Details">
          <div className="space-y-2.5 text-sm">
            <Row icon={<Calendar size={14} />}  label="Date"    value={event.event_date ? formatDate(event.event_date) : '—'} />
            <Row icon={<Calendar size={14} />}  label="Time"    value={event.start_time ?? '—'} />
            <Row icon={<MapPin size={14} />}    label="City"    value={event.city ?? '—'} />
            <Row icon={<MapPin size={14} />}    label="Area"    value={event.area ?? '—'} />
            <Row icon={<MapPin size={14} />}    label="Venue"   value={event.venue_name ?? '—'} />
            <Row icon={<Users size={14} />}     label="Guests"  value={event.guest_count ?? '—'} />
            <Row icon={<DollarSign size={14} />} label="Budget" value={event.budget_text ?? (event.budget ? formatINR(event.budget) : '—')} />
          </div>
        </SectionCard>
      </div>

      {/* Services requested */}
      {services.length > 0 && (
        <SectionCard title="Services Requested">
          <div className="flex flex-wrap gap-2">
            {services.map(s => (
              <span key={s.id} className="px-3 py-1 bg-plum-50 text-plum-700 rounded-full text-xs font-medium border border-plum-100">
                {s.category && <span className="mr-1">{s.category}</span>}
                {s.service_name ?? s.name ?? s.category}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Admin controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status update */}
        <SectionCard title="Update Status">
          <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input text-sm py-2">
            {Object.entries(EVENT_STATUSES).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
          <button
            onClick={() => updateField('status', newStatus, 'status')}
            disabled={saving.status || newStatus === event.status}
            className="btn-plum w-full py-2 text-sm"
          >
            {saving.status ? 'Updating…' : 'Update Status'}
          </button>
        </SectionCard>

        {/* Priority update */}
        <SectionCard title="Update Priority">
          <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="input text-sm py-2">
            {Object.entries(PRIORITIES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button
            onClick={() => updateField('priority', newPriority, 'priority')}
            disabled={saving.priority || newPriority === event.priority}
            className="btn-plum w-full py-2 text-sm"
          >
            {saving.priority ? 'Updating…' : 'Update Priority'}
          </button>
        </SectionCard>

        {/* Coordinator */}
        <SectionCard title="Coordinator">
          <select value={coordId} onChange={e => setCoordId(e.target.value)} className="input text-sm py-2">
            <option value="">Unassigned</option>
            {admins.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
          <button
            onClick={() => updateField('assigned_coordinator', coordId || null, 'coordinator')}
            disabled={saving.coordinator || coordId === (event.assigned_coordinator ?? '')}
            className="btn-plum w-full py-2 text-sm"
          >
            {saving.coordinator ? 'Assigning…' : 'Assign'}
          </button>
        </SectionCard>
      </div>

      {/* Internal notes preview */}
      <SectionCard title="Internal Notes">
        <p className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl">
          Notes are internal only — customers never see these
        </p>

        <div className="space-y-2.5 max-h-60 overflow-y-auto">
          {notes.length === 0 && (
            <p className="text-xs text-gray-400 py-2">No notes yet. Add the first one below.</p>
          )}
          {notes.map(note => (
            <NoteBubble key={note.id} note={note} />
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-50">
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add an internal note…"
            className="input flex-1 min-h-[72px] resize-none text-sm"
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
          />
          <button
            onClick={addNote}
            disabled={notesBusy || !noteText.trim()}
            className="btn-plum self-end px-4 py-2 text-sm"
          >
            {notesBusy ? '…' : 'Add'}
          </button>
        </div>
      </SectionCard>
    </div>
  )
}

function Row({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <span className="text-gray-500 w-28 shrink-0">{label}</span>
      <span className="text-gray-900 font-medium flex-1">{value}</span>
    </div>
  )
}

function NoteBubble({ note }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <p className="text-sm text-gray-800 leading-relaxed">{note.note}</p>
      <p className="text-[11px] text-gray-400 mt-1.5">
        {note.profiles?.full_name ?? 'Admin'} · {formatDate(note.created_at)}
      </p>
    </div>
  )
}

/* ── TAB: Vendor Sourcing ──────────────────────────────────────── */
function VendorSourcingTab({ event }) {
  const [services,    setServices]    = useState([])
  const [vendors,     setVendors]     = useState({}) // keyed by service id
  const [loading,     setLoading]     = useState(true)
  const [addVendorFor, setAddVendorFor] = useState(null) // service id
  const [addSvcOpen,  setAddSvcOpen]  = useState(false)
  const [vendorForm,  setVendorForm]  = useState({ name: '', phone: '', category: '', quoted_amount: '', availability: '' })
  const [svcForm,     setSvcForm]     = useState({ category: '', service_name: '' })
  const [busy,        setBusy]        = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: svcs } = await supabase
      .from('event_services').select('*').eq('event_id', event.id)

    const svcList = svcs ?? []
    setServices(svcList)

    if (svcList.length > 0) {
      const ids = svcList.map(s => s.id)
      const { data: vOpts } = await supabase
        .from('event_vendor_options').select('*').in('event_service_id', ids)
        .order('created_at', { ascending: true })

      const map = {}
      svcList.forEach(s => { map[s.id] = [] })
      ;(vOpts ?? []).forEach(v => {
        if (map[v.event_service_id]) map[v.event_service_id].push(v)
      })
      setVendors(map)
    }
    setLoading(false)
  }, [event.id])

  useEffect(() => { fetchData() }, [fetchData])

  async function addVendor() {
    if (!vendorForm.name.trim() || !addVendorFor) return
    setBusy(true)
    await supabase.from('event_vendor_options').insert({
      event_service_id:    addVendorFor,
      vendor_name:         vendorForm.name.trim(),
      vendor_phone:        vendorForm.phone.trim(),
      vendor_category:     vendorForm.category.trim(),
      quoted_amount:       vendorForm.quoted_amount ? Number(vendorForm.quoted_amount) : null,
      availability_status: vendorForm.availability.trim() || 'pending',
      quote_status:        'pending',
      selected:            false,
    })
    setVendorForm({ name: '', phone: '', category: '', quoted_amount: '', availability: '' })
    setAddVendorFor(null)
    setBusy(false)
    fetchData()
  }

  async function selectVendor(serviceId, vendorId) {
    // Set all vendors in this service to selected=false, then true for chosen one
    const allVendors = vendors[serviceId] ?? []
    await Promise.all(
      allVendors.map(v =>
        supabase.from('event_vendor_options')
          .update({ selected: v.id === vendorId })
          .eq('id', v.id)
      )
    )
    fetchData()
  }

  async function addService() {
    if (!svcForm.service_name.trim()) return
    setBusy(true)
    await supabase.from('event_services').insert({
      event_id:         event.id,
      service_category: svcForm.category.trim(),
      service_name:     svcForm.service_name.trim(),
    })
    setSvcForm({ category: '', service_name: '' })
    setAddSvcOpen(false)
    setBusy(false)
    fetchData()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      {services.length === 0 && (
        <div className="card p-10 text-center text-gray-400">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-sm">No service requirements added yet.</p>
        </div>
      )}

      {services.map(svc => (
        <div key={svc.id} className="card overflow-hidden">
          <div className="px-5 py-3.5 bg-plum-50 border-b border-plum-100 flex items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-plum-800 text-sm">{svc.service_name ?? svc.category}</span>
              {svc.category && svc.service_name && (
                <span className="ml-2 text-xs text-plum-500">{svc.category}</span>
              )}
            </div>
            <button
              onClick={() => setAddVendorFor(addVendorFor === svc.id ? null : svc.id)}
              className="flex items-center gap-1.5 text-xs font-medium text-plum-700 hover:text-plum-900 bg-white border border-plum-200 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <Plus size={12} /> Add Vendor
            </button>
          </div>

          {/* Vendor list */}
          <div className="divide-y divide-gray-50">
            {(vendors[svc.id] ?? []).length === 0 && addVendorFor !== svc.id && (
              <p className="px-5 py-4 text-xs text-gray-400">No vendors added yet.</p>
            )}
            {(vendors[svc.id] ?? []).map(v => (
              <div key={v.id} className={`px-5 py-3.5 flex flex-wrap items-center gap-3 ${v.selected ? 'bg-green-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{v.vendor_name}</span>
                    {v.selected && (
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[11px] font-semibold rounded-full">Selected</span>
                    )}
                    {v.availability_status && (
                      <span className="text-xs text-gray-500">{v.availability_status}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                    {v.vendor_phone && <span>{v.vendor_phone}</span>}
                    {v.quoted_amount && <span>Quoted: {formatINR(v.quoted_amount)}</span>}
                    {v.sambramo_negotiated_amount && <span>Negotiated: {formatINR(v.sambramo_negotiated_amount)}</span>}
                    {v.quote_status && <span className="capitalize">{v.quote_status}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {v.vendor_phone && (
                    <>
                      <a href={`tel:${v.vendor_phone}`}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                        <Phone size={13} />
                      </a>
                      <a href={`https://wa.me/${v.vendor_phone.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                        <MessageCircle size={13} />
                      </a>
                    </>
                  )}
                  {!v.selected && (
                    <button
                      onClick={() => selectVendor(svc.id, v.id)}
                      className="px-2.5 py-1 text-xs font-medium bg-plum-100 text-plum-700 rounded-lg hover:bg-plum-200 transition-colors"
                    >
                      Select
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add vendor inline form */}
          {addVendorFor === svc.id && (
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Add Vendor</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input placeholder="Vendor name *" value={vendorForm.name} onChange={e => setVendorForm(f => ({ ...f, name: e.target.value }))} className="input text-sm py-2" />
                <input placeholder="Phone" value={vendorForm.phone} onChange={e => setVendorForm(f => ({ ...f, phone: e.target.value }))} className="input text-sm py-2" />
                <input placeholder="Category" value={vendorForm.category} onChange={e => setVendorForm(f => ({ ...f, category: e.target.value }))} className="input text-sm py-2" />
                <input placeholder="Quoted amount" type="number" value={vendorForm.quoted_amount} onChange={e => setVendorForm(f => ({ ...f, quoted_amount: e.target.value }))} className="input text-sm py-2" />
                <input placeholder="Availability status" value={vendorForm.availability} onChange={e => setVendorForm(f => ({ ...f, availability: e.target.value }))} className="input text-sm py-2 sm:col-span-2" />
              </div>
              <div className="flex gap-2">
                <button onClick={addVendor} disabled={busy || !vendorForm.name.trim()} className="btn-plum text-sm py-2 px-4">
                  {busy ? 'Saving…' : 'Add Vendor'}
                </button>
                <button onClick={() => setAddVendorFor(null)} className="btn-secondary text-sm py-2 px-4">Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add service requirement */}
      {addSvcOpen ? (
        <div className="card p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Add Service Requirement</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Category (e.g. Photography)" value={svcForm.category} onChange={e => setSvcForm(f => ({ ...f, category: e.target.value }))} className="input text-sm py-2" />
            <input placeholder="Service name *" value={svcForm.service_name} onChange={e => setSvcForm(f => ({ ...f, service_name: e.target.value }))} className="input text-sm py-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={addService} disabled={busy || !svcForm.service_name.trim()} className="btn-plum text-sm py-2 px-4">
              {busy ? 'Saving…' : 'Add Service'}
            </button>
            <button onClick={() => setAddSvcOpen(false)} className="btn-secondary text-sm py-2 px-4">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddSvcOpen(true)}
          className="w-full card p-4 text-sm text-gray-500 font-medium hover:text-plum-700 hover:border-plum-200 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add Service Requirement
        </button>
      )}
    </div>
  )
}

/* ── TAB: Proposal ─────────────────────────────────────────────── */
function ProposalTab({ event }) {
  const [proposal,    setProposal]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [editing,     setEditing]     = useState(false)
  const [items,       setItems]       = useState([])
  const [coordFee,    setCoordFee]    = useState('')
  const [discount,    setDiscount]    = useState('')
  const [message,     setMessage]     = useState('')
  const [busy,        setBusy]        = useState(false)

  const fetchProposal = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('event_proposals')
      .select('*, event_proposal_items(*)')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      setProposal(data)
      setItems(data.event_proposal_items ?? [])
      setCoordFee(data.sambramo_coordination_fee ?? '')
      setDiscount(data.discount ?? '')
      setMessage(data.customer_message ?? '')
    }
    setLoading(false)
  }, [event.id])

  useEffect(() => { fetchProposal() }, [fetchProposal])

  const initCreate = async () => {
    // Auto-populate from selected vendors
    const { data: selected } = await supabase
      .from('event_vendor_options')
      .select('*, event_services(service_name, category)')
      .eq('selected', true)

    // Filter to vendors that belong to this event's services
    const { data: eventServices } = await supabase
      .from('event_services').select('id').eq('event_id', event.id)
    const svcIds = new Set((eventServices ?? []).map(s => s.id))

    const autoItems = (selected ?? [])
      .filter(v => svcIds.has(v.event_service_id))
      .map(v => ({
        _key:            Math.random().toString(36).slice(2),
        description:     v.event_services?.service_name ?? v.category ?? '',
        vendor_cost:     v.sambramo_negotiated_amount ?? v.quoted_amount ?? '',
        customer_price:  '',
        quantity:        1,
      }))

    setItems(autoItems.length > 0 ? autoItems : [blankItem()])
    setEditing(true)
  }

  function blankItem() {
    return { _key: Math.random().toString(36).slice(2), description: '', vendor_cost: '', customer_price: '', quantity: 1 }
  }

  const subtotal    = items.reduce((s, it) => s + (Number(it.customer_price) || 0) * (Number(it.quantity) || 1), 0)
  const total       = subtotal + (Number(coordFee) || 0) - (Number(discount) || 0)
  const totalMargin = items.reduce((s, it) => s + ((Number(it.customer_price) || 0) - (Number(it.vendor_cost) || 0)) * (Number(it.quantity) || 1), 0)

  async function saveProposal(sendToCustomer = false) {
    setBusy(true)
    const payload = {
      event_id:          event.id,
      status:            sendToCustomer ? 'SENT' : 'DRAFT',
      sambramo_coordination_fee: Number(coordFee) || 0,
      discount:          Number(discount) || 0,
      subtotal,
      total_amount:      total,
      customer_message:  message,
    }

    let proposalId = proposal?.id
    if (proposalId) {
      await supabase.from('event_proposals').update(payload).eq('id', proposalId)
      await supabase.from('event_proposal_items').delete().eq('proposal_id', proposalId)
    } else {
      const { data } = await supabase.from('event_proposals').insert(payload).select().single()
      proposalId = data?.id
    }

    if (proposalId) {
      const lineItems = items.map(it => ({
        proposal_id:    proposalId,
        description:    it.description,
        vendor_cost:    Number(it.vendor_cost) || 0,
        customer_price: Number(it.customer_price) || 0,
        quantity:       Number(it.quantity) || 1,
      }))
      await supabase.from('event_proposal_items').insert(lineItems)

      if (sendToCustomer) {
        await supabase.from('events').update({ status: 'PROPOSAL_SENT' }).eq('id', event.id)
      }
    }
    setBusy(false)
    setEditing(false)
    fetchProposal()
  }

  if (loading) return <LoadingSpinner />

  if (!proposal && !editing) {
    return (
      <div className="card p-12 text-center space-y-4">
        <div className="text-5xl">📄</div>
        <p className="text-gray-600 font-medium">No proposal created yet.</p>
        <p className="text-sm text-gray-400">Select vendors first, then create a proposal with auto-populated line items.</p>
        <button onClick={initCreate} className="btn-plum mx-auto">Create Proposal</button>
      </div>
    )
  }

  if (!editing && proposal) {
    return (
      <div className="space-y-5">
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                proposal.status === 'SENT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {proposal.status === 'SENT' ? '✅ Sent to customer' : '📝 Draft'}
              </span>
              <p className="text-xs text-gray-400 mt-1">{formatDate(proposal.created_at)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} className="btn-secondary text-sm py-2 px-4">Edit</button>
              <button onClick={() => saveProposal(true)} disabled={busy} className="btn-plum text-sm py-2 px-4">
                Resend
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 text-left text-xs font-semibold text-gray-500">Description</th>
                  <th className="py-2 text-right text-xs font-semibold text-gray-500">Qty</th>
                  <th className="py-2 text-right text-xs font-semibold text-gray-500">Vendor Cost</th>
                  <th className="py-2 text-right text-xs font-semibold text-gray-500">Customer Price</th>
                  <th className="py-2 text-right text-xs font-semibold text-amber-600">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(proposal.event_proposal_items ?? []).map(it => (
                  <tr key={it.id}>
                    <td className="py-2.5">{it.description}</td>
                    <td className="py-2.5 text-right text-gray-600">{it.quantity}</td>
                    <td className="py-2.5 text-right text-gray-400 text-xs">{it.vendor_cost ? formatINR(it.vendor_cost) : '—'}</td>
                    <td className="py-2.5 text-right font-medium">{formatINR(it.customer_price * it.quantity)}</td>
                    <td className="py-2.5 text-right text-amber-600 text-xs font-medium">
                      {it.vendor_cost ? formatINR((it.customer_price - it.vendor_cost) * it.quantity) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-1 text-sm text-right">
            <div className="text-gray-500">Subtotal: <span className="font-medium text-gray-900">{formatINR(proposal.subtotal)}</span></div>
            {proposal.sambramo_coordination_fee > 0 && (
              <div className="text-gray-500">Coordination fee: <span className="font-medium text-gray-900">+{formatINR(proposal.sambramo_coordination_fee)}</span></div>
            )}
            {proposal.discount > 0 && (
              <div className="text-gray-500">Discount: <span className="font-medium text-green-700">−{formatINR(proposal.discount)}</span></div>
            )}
            <div className="text-base font-bold text-gray-900">Total: {formatINR(proposal.total_amount)}</div>
            <div className="text-xs text-amber-600 font-medium">Total margin (admin): {formatINR(totalMargin)}</div>
          </div>

          {proposal.customer_message && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1">Customer message:</p>
              {proposal.customer_message}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Editing / creating form
  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700">Line Items</p>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={it._key ?? it.id ?? idx} className="grid grid-cols-12 gap-2 items-center">
              <input
                placeholder="Description"
                value={it.description}
                onChange={e => setItems(prev => prev.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                className="input text-sm py-2 col-span-4"
              />
              <input
                placeholder="Qty"
                type="number"
                min="1"
                value={it.quantity}
                onChange={e => setItems(prev => prev.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))}
                className="input text-sm py-2 col-span-1"
              />
              <div className="col-span-3 relative">
                <input
                  placeholder="Vendor cost (hidden)"
                  type="number"
                  value={it.vendor_cost}
                  onChange={e => setItems(prev => prev.map((x, i) => i === idx ? { ...x, vendor_cost: e.target.value } : x))}
                  className="input text-sm py-2 bg-amber-50 border-amber-100"
                />
              </div>
              <input
                placeholder="Customer price"
                type="number"
                value={it.customer_price}
                onChange={e => setItems(prev => prev.map((x, i) => i === idx ? { ...x, customer_price: e.target.value } : x))}
                className="input text-sm py-2 col-span-3"
              />
              <button
                onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                className="col-span-1 p-2 text-gray-300 hover:text-red-500 transition-colors justify-center flex"
              >
                <X size={14} />
              </button>
              {(it.vendor_cost && it.customer_price) && (
                <div className="col-span-12 text-xs text-amber-600 font-medium -mt-1 text-right pr-8">
                  Margin: {formatINR((Number(it.customer_price) - Number(it.vendor_cost)) * (Number(it.quantity) || 1))}
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => setItems(prev => [...prev, blankItem()])} className="flex items-center gap-1.5 text-sm text-plum-700 font-medium hover:text-plum-900">
          <Plus size={14} /> Add Line Item
        </button>
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Coordination Fee</label>
            <input type="number" value={coordFee} onChange={e => setCoordFee(e.target.value)} className="input text-sm" placeholder="0" />
          </div>
          <div>
            <label className="label">Discount</label>
            <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="input text-sm" placeholder="0" />
          </div>
        </div>

        <div className="text-sm space-y-1 text-right border-t border-gray-100 pt-3">
          <div className="text-gray-500">Subtotal: <span className="font-semibold text-gray-900">{formatINR(subtotal)}</span></div>
          <div className="text-gray-500">Coordination: +{formatINR(Number(coordFee) || 0)}</div>
          <div className="text-gray-500">Discount: −{formatINR(Number(discount) || 0)}</div>
          <div className="font-bold text-gray-900 text-base">Total: {formatINR(total)}</div>
          <div className="text-xs text-amber-600">Admin margin: {formatINR(totalMargin)}</div>
        </div>

        <div>
          <label className="label">Customer Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="input min-h-[80px] resize-none text-sm"
            placeholder="Message shown to the customer with the proposal…"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => saveProposal(false)} disabled={busy} className="btn-secondary flex items-center gap-2 text-sm py-2.5">
            <Save size={14} /> {busy ? 'Saving…' : 'Save as Draft'}
          </button>
          <button onClick={() => saveProposal(true)} disabled={busy} className="btn-plum flex items-center gap-2 text-sm py-2.5">
            <Send size={14} /> {busy ? 'Sending…' : 'Send to Customer'}
          </button>
          {(proposal || editing) && (
            <button onClick={() => { setEditing(false) }} className="btn-secondary text-sm py-2.5 px-4">Cancel</button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── TAB: Tasks ────────────────────────────────────────────────── */
function TasksTab({ event }) {
  const { profile } = useAuth()
  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState({ title: '', description: '', due_at: '', priority: 'NORMAL' })
  const [addOpen, setAddOpen] = useState(false)
  const [busy,    setBusy]    = useState(false)

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('event_tasks')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: true })
    setTasks(data ?? [])
    setLoading(false)
  }, [event.id])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  async function toggleTask(task) {
    const next = task.status === 'DONE' ? 'PENDING' : 'DONE'
    await supabase.from('event_tasks').update({ status: next }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
  }

  async function addTask() {
    if (!form.title.trim()) return
    setBusy(true)
    const { data } = await supabase.from('event_tasks').insert({
      event_id:    event.id,
      title:       form.title.trim(),
      description: form.description.trim() || null,
      due_at:      form.due_at || null,
      priority:    form.priority,
      status:      'PENDING',
      assigned_to: profile?.id,
    }).select().single()
    if (data) setTasks(prev => [...prev, data])
    setForm({ title: '', description: '', due_at: '', priority: 'NORMAL' })
    setAddOpen(false)
    setBusy(false)
  }

  async function seedDefaultTasks() {
    setBusy(true)
    const rows = DEFAULT_TASKS.map((title, i) => ({
      event_id:    event.id,
      title,
      status:      'PENDING',
      priority:    'NORMAL',
      display_order: i,
    }))
    await supabase.from('event_tasks').insert(rows)
    setBusy(false)
    fetchTasks()
  }

  const done    = tasks.filter(t => t.status === 'DONE').length
  const pct     = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      {/* Progress */}
      {tasks.length > 0 && (
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">{done}/{tasks.length} tasks done</span>
            <span className="text-xs text-gray-500">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-plum-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="card divide-y divide-gray-50">
        {tasks.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-gray-400 text-sm mb-4">No tasks yet.</p>
            <button onClick={seedDefaultTasks} disabled={busy} className="btn-secondary text-sm">
              {busy ? 'Adding…' : 'Add default checklist'}
            </button>
          </div>
        )}
        {tasks.map(task => (
          <div key={task.id} className={`flex items-start gap-3 px-5 py-3.5 ${task.status === 'DONE' ? 'bg-gray-50/60' : ''}`}>
            <button onClick={() => toggleTask(task)} className="mt-0.5 shrink-0 text-plum-600">
              {task.status === 'DONE'
                ? <CheckSquare size={18} className="text-plum-600" />
                : <Square size={18} className="text-gray-300" />
              }
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${task.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                {task.title}
              </p>
              {task.description && <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>}
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                {task.due_at && <span>Due: {formatDate(task.due_at)}</span>}
                <PriorityBadge priority={task.priority} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add task form */}
      {addOpen ? (
        <div className="card p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700">New Task</p>
          <input
            placeholder="Task title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="input text-sm py-2"
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="input text-sm py-2 resize-none min-h-[60px]"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              {/* Required, like the title. A task with no due date is one
                  nothing can ever chase — it does not appear in an overdue
                  list, it does not sort, and on an event with a fixed day
                  every piece of work has a real deadline anyway. */}
              <label className="label text-xs">Due date *</label>
              <input type="date" required min={todayISO()} value={form.due_at} onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))} className="input text-sm py-2" />
            </div>
            <div>
              <label className="label text-xs">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input text-sm py-2">
                {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addTask} disabled={busy || !form.title.trim() || !form.due_at} className="btn-plum text-sm py-2 px-4">
              {busy ? 'Adding…' : 'Add Task'}
            </button>
            <button onClick={() => setAddOpen(false)} className="btn-secondary text-sm py-2 px-4">Cancel</button>
          </div>
        </div>
      ) : (
        tasks.length > 0 && (
          <button
            onClick={() => setAddOpen(true)}
            className="w-full card p-4 text-sm text-gray-500 font-medium hover:text-plum-700 hover:border-plum-200 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Task
          </button>
        )
      )}
    </div>
  )
}

/* ── TAB: Payments ─────────────────────────────────────────────── */
const PAYMENT_TYPES = ['advance', 'partial', 'full', 'vendor_payment', 'refund']
const PAYMENT_METHODS  = ['UPI', 'bank_transfer', 'cash', 'card', 'cheque']

function PaymentsTab({ event }) {
  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [form,     setForm]     = useState({ amount: '', type: 'advance', method: 'UPI', transaction_reference: '', notes: '' })
  const [addOpen,  setAddOpen]  = useState(false)
  const [busy,     setBusy]     = useState(false)

  const fetchPayments = useCallback(async () => {
    const { data } = await supabase
      .from('event_payments')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false })
    setPayments(data ?? [])
    setLoading(false)
  }, [event.id])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const totalReceived = payments
    .filter(p => p.status === 'ADMIN_VERIFIED' && p.payment_type !== 'vendor_payment' && p.payment_type !== 'refund')
    .reduce((s, p) => s + Number(p.amount || 0), 0)

  const totalPending = payments
    .filter(p => ['PENDING', 'CUSTOMER_CLAIMED_PAID'].includes(p.status) && p.payment_type !== 'vendor_payment')
    .reduce((s, p) => s + Number(p.amount || 0), 0)

  const vendorPaid = payments
    .filter(p => p.payment_type === 'vendor_payment' && p.status === 'ADMIN_VERIFIED')
    .reduce((s, p) => s + Number(p.amount || 0), 0)

  async function recordPayment() {
    if (!form.amount) return
    setBusy(true)
    await supabase.from('event_payments').insert({
      event_id:              event.id,
      amount:                Number(form.amount),
      payment_type:          form.type,
      payment_method:        form.method,
      transaction_reference: form.transaction_reference.trim() || null,
      notes:                 form.notes.trim() || null,
      status:                'PENDING',
    })
    setForm({ amount: '', type: 'advance', method: 'UPI', transaction_reference: '', notes: '' })
    setAddOpen(false)
    setBusy(false)
    fetchPayments()
  }

  async function updateStatus(id, status) {
    await supabase.from('event_payments').update({ status }).eq('id', id)
    fetchPayments()
  }

  if (loading) return <LoadingSpinner />

  const statusColors = {
    PENDING:                { bg: 'bg-gray-100',    text: 'text-gray-600'    },
    CUSTOMER_CLAIMED_PAID:  { bg: 'bg-amber-100',   text: 'text-amber-700'   },
    ADMIN_VERIFIED:         { bg: 'bg-green-100',   text: 'text-green-700'   },
    CANCELLED:              { bg: 'bg-red-100',     text: 'text-red-600'     },
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Received',  value: formatINR(totalReceived),  color: 'text-green-700' },
          { label: 'Pending Amount',  value: formatINR(totalPending),   color: 'text-amber-700' },
          { label: 'Vendor Payments', value: formatINR(vendorPaid),     color: 'text-plum-700'  },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <div className={`text-xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Payments list */}
      {payments.length > 0 && (
        <div className="card divide-y divide-gray-50">
          {payments.map(pmt => {
            const css = statusColors[pmt.status] ?? statusColors.PENDING
            return (
              <div key={pmt.id} className="px-5 py-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{formatINR(pmt.amount)}</span>
                    <span className="text-xs text-gray-500 capitalize">{pmt.payment_type?.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-400">via {pmt.payment_method}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatDate(pmt.created_at)}
                    {pmt.transaction_reference && ` · Ref: ${pmt.transaction_reference}`}
                  </div>
                  {pmt.notes && <div className="text-xs text-gray-500 mt-0.5">{pmt.notes}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${css.bg} ${css.text}`}>
                    {pmt.status.replace(/_/g, ' ')}
                  </span>
                  {pmt.status === 'CUSTOMER_CLAIMED_PAID' && (
                    <button
                      onClick={() => updateStatus(pmt.id, 'ADMIN_VERIFIED')}
                      className="text-xs font-medium text-green-700 hover:text-green-900 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200 transition-colors"
                    >
                      Verify
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {payments.length === 0 && !addOpen && (
        <div className="card p-10 text-center text-gray-400">
          <DollarSign size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No payments recorded yet.</p>
        </div>
      )}

      {/* Record payment form */}
      {addOpen ? (
        <div className="card p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Record Payment</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Amount *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input text-sm py-2" placeholder="0" />
            </div>
            <div>
              <label className="label text-xs">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input text-sm py-2">
                {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Method</label>
              <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))} className="input text-sm py-2">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Transaction Reference</label>
              <input value={form.transaction_reference} onChange={e => setForm(f => ({ ...f, transaction_reference: e.target.value }))} className="input text-sm py-2" placeholder="UTR / Txn ID" />
            </div>
            <div className="sm:col-span-2">
              <label className="label text-xs">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input text-sm py-2" placeholder="Any notes about this payment" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={recordPayment} disabled={busy || !form.amount} className="btn-plum text-sm py-2 px-4">
              {busy ? 'Saving…' : 'Record Payment'}
            </button>
            <button onClick={() => setAddOpen(false)} className="btn-secondary text-sm py-2 px-4">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddOpen(true)}
          className="w-full card p-4 text-sm text-gray-500 font-medium hover:text-plum-700 hover:border-plum-200 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Record Payment
        </button>
      )}
    </div>
  )
}

/* ── TAB: Notes (full view) ────────────────────────────────────── */
function NotesTab({ event }) {
  const { profile } = useAuth()
  const [notes,   setNotes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [text,    setText]    = useState('')
  const [busy,    setBusy]    = useState(false)

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase
      .from('event_internal_notes')
      .select('*, profiles(full_name)')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false })
    setNotes(data ?? [])
    setLoading(false)
  }, [event.id])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  async function addNote() {
    if (!text.trim()) return
    setBusy(true)
    const { data } = await supabase.from('event_internal_notes').insert({
      event_id:   event.id,
      note:       text.trim(),
      created_by: profile?.id,
    }).select('*, profiles(full_name)').single()
    if (data) setNotes(prev => [data, ...prev])
    setText('')
    setBusy(false)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card p-4 border-amber-100 bg-amber-50">
        <p className="text-xs text-amber-700 font-medium">
          🔒 Internal notes are admin-only. Customers never see these.
        </p>
      </div>

      {/* Add note */}
      <div className="card p-5 space-y-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add an internal note…"
          className="input min-h-[100px] resize-none text-sm w-full"
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
        />
        <button
          onClick={addNote}
          disabled={busy || !text.trim()}
          className="btn-plum text-sm py-2 px-5 self-start"
        >
          {busy ? 'Adding…' : 'Add Note'}
        </button>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="card p-10 text-center text-gray-400 text-sm">No notes yet.</div>
      ) : (
        <div className="space-y-2">
          {notes.map(note => (
            <div key={note.id} className="card p-4 space-y-1.5">
              <p className="text-sm text-gray-800 leading-relaxed">{note.note}</p>
              <p className="text-[11px] text-gray-400">
                {note.profiles?.full_name ?? 'Admin'} · {formatDate(note.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Loading spinner helper ────────────────────────────────────── */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
      <Loader2 className="animate-spin text-plum-600" size={24} />
      <span className="text-sm">Loading…</span>
    </div>
  )
}

/* ── Main page component ───────────────────────────────────────── */
const TABS = [
  { id: 'overview',        label: 'Overview'        },
  { id: 'vendor_sourcing', label: 'Vendor Sourcing' },
  { id: 'proposal',        label: 'Proposal'        },
  { id: 'tasks',           label: 'Tasks'           },
  { id: 'payments',        label: 'Payments'        },
  { id: 'notes',           label: 'Notes'           },
]

export default function AdminEventDetail() {
  const { eventId } = useParams()
  const navigate    = useNavigate()

  const [event,     setEvent]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchEvent = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('events')
      .select('*, profiles!customer_id(full_name, email, phone)')
      .eq('id', eventId)
      .single()

    if (err) { setError(err.message); setLoading(false); return }
    setEvent(data)
    setLoading(false)
  }, [eventId])

  useEffect(() => { fetchEvent() }, [fetchEvent])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen gap-3 text-gray-400">
        <Loader2 className="animate-spin text-plum-600" size={32} />
        <span>Loading event…</span>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="card p-8 text-center space-y-4">
          <AlertCircle className="mx-auto text-red-400" size={40} />
          <p className="text-red-600 font-medium">{error ?? 'Event not found.'}</p>
          <button onClick={() => navigate('/dashboard/admin')} className="btn-secondary mx-auto">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Back + breadcrumb */}
      <button
        onClick={() => navigate('/dashboard/admin')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-plum-700 font-medium transition-colors"
      >
        <ArrowLeft size={15} /> Back to Operations
      </button>

      {/* Page title */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900">
          {event.event_code ?? event.id.slice(0, 8).toUpperCase()}
        </h1>
        <span className="text-2xl">{EVENT_TYPE_EMOJIS[event.event_type] ?? '🎉'}</span>
        <span className="text-gray-600 capitalize font-medium">{event.event_type?.replace(/-/g, ' ')}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-gray-200 pb-px">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-plum-600 text-plum-700'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview'        && <OverviewTab        event={event} onRefresh={fetchEvent} />}
        {activeTab === 'vendor_sourcing' && <VendorSourcingTab  event={event} />}
        {activeTab === 'proposal'        && <ProposalTab        event={event} />}
        {activeTab === 'tasks'           && <TasksTab           event={event} />}
        {activeTab === 'payments'        && <PaymentsTab        event={event} />}
        {activeTab === 'notes'           && <NotesTab           event={event} />}
      </div>
    </div>
  )
}
