import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, MapPin, Package, Users, Truck, Warehouse, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useCity } from '../../context/CityContext'
import { useToast } from '../../context/ToastContext'
import { TOP_SERVICES } from '../../data/planCatalog'
import { priceLogisticsLine } from '../../data/logisticsPricing'

async function authHeaders() { const { data } = await supabase.auth.getSession(); return { 'content-type': 'application/json', ...(data?.session?.access_token ? { Authorization: 'Bearer ' + data.session.access_token } : {}) } }

const RESUME_KEY = 'sambramo_logistics_quote_resume'

const DEFINITIONS = {
  mini_truck: {
    tradeId: 'L01',
    title: 'Mini Truck / Pickup',
    icon: Truck,
    fields: [
      ['date', 'Event / delivery date', 'date', true],
      ['pickup', 'Pickup location', 'text', true],
      ['dropoff', 'Drop location', 'text', true],
      ['weightKg', 'Approx. load weight (kg)', 'number', true],
      ['access', 'Access notes', 'text', false],
    ],
  },
  goods_vehicle: {
    tradeId: 'L02',
    title: 'Medium / Large Goods Vehicle',
    icon: Truck,
    fields: [
      ['date', 'Cargo movement date', 'date', true],
      ['pickup', 'Pickup location', 'text', true],
      ['dropoff', 'Drop location', 'text', true],
      ['weightKg', 'Approx. load weight (kg)', 'number', true],
      ['dimensions', 'Largest item dimensions', 'text', true],
      ['access', 'Loading / access notes', 'text', false],
    ],
  },
  passenger_transport: {
    tradeId: 'L03',
    title: 'Group Passenger Transport',
    icon: Users,
    fields: [
      ['date', 'Travel date', 'date', true],
      ['pickup', 'Pickup location', 'text', true],
      ['dropoff', 'Drop location', 'text', true],
      ['passengers', 'Passengers', 'number', true],
      ['stops', 'Number of stops', 'number', false],
      ['durationHours', 'Estimated duration (hours)', 'number', false],
      ['luggage', 'Luggage / special travel notes', 'text', false],
    ],
  },
  event_equipment: {
    tradeId: 'L04',
    title: 'Event Operations Equipment Rental',
    icon: Package,
    fields: [
      ['date', 'Event date', 'date', true],
      ['location', 'Delivery / event location', 'text', true],
      ['assets', 'Equipment / items needed', 'text', true],
      ['quantity', 'Approx. quantity / sets', 'number', true],
      ['durationDays', 'Rental duration (days)', 'number', true],
      ['setup', 'Delivery / setup requirements', 'text', false],
    ],
  },
  loading_crew: {
    tradeId: 'L05',
    title: 'Loading & Unloading Crew',
    icon: Users,
    fields: [
      ['date', 'Work date', 'date', true],
      ['location', 'Work location', 'text', true],
      ['workers', 'Workers required', 'number', true],
      ['shiftHours', 'Shift length (hours)', 'number', true],
      ['workScope', 'Loading / unloading / carry / setup / strike', 'text', true],
      ['access', 'Stairs, lift, long carry or heavy items', 'text', false],
    ],
  },
  warehouse_storage: {
    tradeId: 'L06',
    title: 'Event Warehouse & Storage',
    icon: Warehouse,
    fields: [
      ['date', 'Storage start date', 'date', true],
      ['location', 'Preferred storage area', 'text', true],
      ['spaceSqFt', 'Approx. space required (sq ft)', 'number', true],
      ['durationDays', 'Storage duration (days)', 'number', true],
      ['handling', 'Receiving / dispatch / consolidation needs', 'text', false],
      ['conditions', 'Security / temperature / special conditions', 'text', false],
    ],
  },
  event_materials: {
    tradeId: 'L07',
    title: 'Bulk Event Materials',
    icon: Package,
    fields: [
      ['date', 'Required-by date', 'date', true],
      ['location', 'Delivery location', 'text', true],
      ['materials', 'Materials / SKUs required', 'text', true],
      ['quantity', 'Approx. quantity', 'number', true],
      ['custom', 'Custom / bulk requirements', 'text', false],
    ],
  },
  event_logistics: {
    tradeId: 'L08',
    title: 'End-to-End Event Logistics',
    icon: Truck,
    fields: [
      ['date', 'Event / project date', 'date', true],
      ['locations', 'Pickup / delivery locations and stops', 'text', true],
      ['scope', 'What should we coordinate?', 'text', true],
      ['shipments', 'Approx. number of shipments / movements', 'number', false],
      ['storage', 'Storage / consolidation needed', 'text', false],
      ['crew', 'Loading / setup / strike manpower', 'text', false],
    ],
  },
}

function initialForm() {
  return {
    date: '', startTime: '', endTime: '', pickup: '', dropoff: '', location: '',
    weightKg: '', access: '', passengers: '', stops: '', durationHours: '',
    luggage: '', assets: '', quantity: '', durationDays: '', setup: '',
    workers: '', shiftHours: '', workScope: '', spaceSqFt: '', handling: '',
    conditions: '', materials: '', custom: '', locations: '', scope: '',
    shipments: '', storage: '', crew: '',
  }
}

export default function LogisticsRequirements() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { city } = useCity()
  const toast = useToast()
  const definition = DEFINITIONS[serviceId] ?? DEFINITIONS.mini_truck
  const service = useMemo(() => TOP_SERVICES.find(s => s.id === serviceId), [serviceId])
  const [form, setForm] = useState(() => initialForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    try {
      const raw = sessionStorage.getItem(RESUME_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved?.serviceId === serviceId && saved.form) setForm(saved.form)
      sessionStorage.removeItem(RESUME_KEY)
    } catch {
      // Ignore malformed local resume data.
    }
  }, [user, serviceId])

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const missingRequired = definition.fields
    .filter(([, , , required]) => required)
    .filter(([key]) => !String(form[key] ?? '').trim())
    .map(([, label]) => label)

  const quote = useMemo(
    () => priceLogisticsLine({ serviceId, demand: form }),
    [serviceId, form],
  )

  async function submit() {
    if (saving || missingRequired.length) return

    if (!user) {
      sessionStorage.setItem(RESUME_KEY, JSON.stringify({ serviceId, form }))
      navigate('/login', {
        state: { from: { pathname: '/book/logistics/' + serviceId, search: '' } },
      })
      return
    }

    setSaving(true)
    setError(null)
    try {
      const getPosition = () => new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Location is required to find nearby logistics partners.'))
        navigator.geolocation.getCurrentPosition(
          p => resolve(p.coords),
          () => reject(new Error('Please allow location access so Sambramo can find nearby logistics partners.')),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
        )
      })
      const coords = await getPosition()
      const demand = {
        service_id: serviceId,
        trade_id: definition.tradeId,
        ...Object.fromEntries(Object.entries(form).filter(([, v]) => String(v ?? '').trim() !== '')),
      }
      const response = await fetch('/api/dispatch-booking', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          customerId: user.id,
          occasionId: 'logistics',
          occasionName: definition.title,
          eventDate: form.date,
          guestCount: Number(form.passengers || 0) || null,
          radiusKm: 25,
          lat: coords.latitude,
          lng: coords.longitude,
          addressText: [form.pickup || form.location, form.dropoff].filter(Boolean).join(' → '),
          areaLabel: city?.name ?? 'Bengaluru',
          city: city?.name ?? 'Bengaluru',
          notes: form.access || form.setup || form.scope || null,
          lines: [{ serviceId, demand, options: {} }],
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'We could not create the logistics booking.')
      toast.success('Logistics request sent to matching.')
      navigate('/book/instant?request=' + encodeURIComponent(payload.requestId))
      return payload
    } catch (err) {
      setError(err?.message || 'We could not send the request. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!DEFINITIONS[serviceId]) {
    return (
      <div className="min-h-screen bg-cream p-5">
        <button onClick={() => navigate('/services')} className="mb-4 flex items-center gap-2 text-sm font-bold text-ink-soft">
          <ArrowLeft size={18} /> Back
        </button>
        <div className="card p-6 text-center">
          <h1 className="text-lg font-extrabold text-ink">Logistics service not found</h1>
          <p className="mt-2 text-sm text-ink-mute">This logistics service is not in the current catalogue.</p>
        </div>
      </div>
    )
  }

  const Icon = definition.icon

  return (
    <div className="min-h-screen bg-cream pb-24">
      <header className="sticky top-0 z-30 border-b border-ink/[0.06] bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 text-ink-soft" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-plum-600">Logistics quote</p>
            <h1 className="truncate text-[16px] font-extrabold text-ink">{definition.title}</h1>
          </div>
          <Icon size={20} className="text-plum-600" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <div className="home-glass mb-4 p-4">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Tell us the operational details once. Sambramo uses these inputs to match the right logistics trade and prepare a structured quote — not a generic callback request.
          </p>
          {service?.desc && <p className="mt-2 text-[12px] text-ink-mute">{service.desc}</p>}
        </div>

        <div className="space-y-3">
          {quote.ok && (
            <div className="card flex items-center justify-between p-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">Deterministic estimate</p>
                <p className="mt-1 text-[22px] font-extrabold text-ink">₹{Math.round(quote.amountPaise / 100).toLocaleString('en-IN')}</p>
              </div>
              <span className="rounded-full bg-plum-100 px-2.5 py-1 text-[10px] font-extrabold text-plum-800">Price book {quote.basis.version}</span>
            </div>
          )}
          {definition.fields.map(([key, label, type, required]) => (
            <label key={key} className="block card p-4">
              <span className="mb-1.5 block text-[12px] font-extrabold text-ink">
                {label}{required && <span className="ml-1 text-rose-600">*</span>}
              </span>
              <input
                type={type}
                value={form[key] ?? ''}
                onChange={e => setField(key, e.target.value)}
                className="w-full rounded-2xl bg-white px-3.5 py-3 text-sm text-ink ring-1 ring-ink/[0.08] outline-none focus:ring-2 focus:ring-saffron-400"
              />
            </label>
          ))}
        </div>

        {missingRequired.length > 0 && (
          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-[12px] leading-relaxed text-amber-900">
            Add: {missingRequired.join(', ')}
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-[12px] leading-relaxed text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-5 rounded-[22px] bg-plum-950 p-4 text-white">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-saffron-300" />
            <div>
              <p className="text-[13px] font-extrabold">What happens next</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-plum-100">
                We will match the appropriate logistics trade, check availability and return a structured quote. Complex jobs may require a site or load survey before a final amount is issued.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={saving || missingRequired.length > 0}
          onClick={submit}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-4 py-3.5 text-[14px] font-extrabold text-plum-950 disabled:opacity-40"
        >
          {saving ? 'Sending…' : 'Request structured quote'}
        </button>
      </main>
    </div>
  )
}
