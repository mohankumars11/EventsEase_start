import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, Calendar, MapPin,
  Users, Wallet, FileText, AlertCircle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatINRRange, formatINR } from '../../utils/format'
import CustomerLayout from '../../components/customer/CustomerLayout'

export default function RequestQuote() {
  const { vendorId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [vendor, setVendor]           = useState(null)
  const [eventCats, setEventCats]     = useState([])
  const [loading, setLoading]         = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [bookingId, setBookingId]     = useState(null)
  const [error, setError]             = useState(null)

  const [form, setForm] = useState({
    eventCategoryId: '',
    eventDate:       '',
    eventLocation:   '',
    guestCount:      '',
    budget:          '',
    notes:           '',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('vendors').select('*').eq('id', vendorId).single(),
      supabase.from('event_categories').select('*'),
    ]).then(([vRes, cRes]) => {
      setVendor(vRes.data)
      setEventCats(cRes.data ?? [])
    })
  }, [vendorId])

  function handleChange(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.eventCategoryId) return setError('Please select an event type.')
    if (!form.eventDate)       return setError('Please select the event date.')
    if (!form.eventLocation.trim()) return setError('Please enter the event location.')

    setLoading(true)
    const { data, error: err } = await supabase
      .from('bookings')
      .insert({
        customer_id:       user.id,
        vendor_id:         vendorId,
        event_category_id: form.eventCategoryId,
        event_date:        form.eventDate,
        event_location:    form.eventLocation.trim(),
        guest_count:       form.guestCount   ? Number(form.guestCount)   : null,
        budget:            form.budget       ? Number(form.budget)        : null,
        notes:             form.notes.trim() || null,
        status:            'enquiry',
      })
      .select()
      .single()

    if (err) { setError(err.message); setLoading(false); return }

    setBookingId(data.id)
    setSubmitted(true)
    setLoading(false)
  }

  // ── Success screen ────────────────────────────────────
  if (submitted) {
    return (
      <CustomerLayout>
        <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Enquiry sent! 🎉</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Your quote request has been sent to{' '}
              <strong className="text-gray-700">{vendor?.business_name}</strong>.
              They'll respond soon with a quote.
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-xs text-green-600 font-medium mb-0.5">Booking reference</p>
            <p className="font-mono text-xs text-green-800 break-all">{bookingId}</p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={() => navigate('/dashboard/customer/bookings')}
              className="btn-primary w-full py-3"
            >
              View my bookings
            </button>
            <button
              onClick={() => navigate('/dashboard/customer')}
              className="btn-secondary w-full py-3"
            >
              Back to home
            </button>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  // ── Form ─────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <CustomerLayout>
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Vendor summary chip */}
        {vendor && (
          <div className="card p-4 flex items-center gap-3 bg-marigold-50 border-marigold-200">
            <div className="w-11 h-11 bg-marigold-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
              🏪
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{vendor.business_name}</p>
              <p className="text-xs text-gray-500 truncate">
                {vendor.category} · {formatINRRange(vendor.price_range_min, vendor.price_range_max)}
              </p>
            </div>
          </div>
        )}

        <div>
          <h1 className="text-xl font-bold text-gray-900">Request a Quote</h1>
          <p className="text-sm text-gray-500 mt-1">
            Share your event details and the vendor will respond with a quote.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Event type */}
          <div>
            <label className="label">
              <span className="flex items-center gap-1.5">🎊 Event type <span className="text-red-500">*</span></span>
            </label>
            <select name="eventCategoryId" value={form.eventCategoryId} onChange={handleChange} className="input" required>
              <option value="">Select event type</option>
              {eventCats.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Event date */}
          <div>
            <label className="label">
              <span className="flex items-center gap-1.5"><Calendar size={13} /> Event date <span className="text-red-500">*</span></span>
            </label>
            <input
              type="date"
              name="eventDate"
              value={form.eventDate}
              onChange={handleChange}
              min={todayStr}
              className="input"
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="label">
              <span className="flex items-center gap-1.5"><MapPin size={13} /> Event location <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              name="eventLocation"
              value={form.eventLocation}
              onChange={handleChange}
              className="input"
              placeholder="e.g. Andheri West, Mumbai"
              required
            />
          </div>

          {/* Guest count */}
          <div>
            <label className="label">
              <span className="flex items-center gap-1.5"><Users size={13} /> Expected guests</span>
            </label>
            <input
              type="number"
              name="guestCount"
              value={form.guestCount}
              onChange={handleChange}
              className="input"
              placeholder="e.g. 50"
              min="1"
            />
          </div>

          {/* Budget */}
          <div>
            <label className="label">
              <span className="flex items-center gap-1.5"><Wallet size={13} /> Your budget (₹)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                ₹
              </span>
              <input
                type="number"
                name="budget"
                value={form.budget}
                onChange={handleChange}
                className="input pl-7"
                placeholder="e.g. 25000"
                min="0"
              />
            </div>
            {form.budget && (
              <p className="text-xs text-marigold-600 mt-1 font-medium">{formatINR(Number(form.budget))}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="label">
              <span className="flex items-center gap-1.5"><FileText size={13} /> Additional notes</span>
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="input min-h-[100px] resize-none"
              placeholder="Theme preferences, special requirements, anything else the vendor should know…"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 text-base"
          >
            {loading ? 'Sending enquiry…' : 'Send Quote Request'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            The vendor will see your contact email to respond to this enquiry.
          </p>
        </form>
      </div>
    </CustomerLayout>
  )
}
