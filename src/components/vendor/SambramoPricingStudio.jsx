import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, CheckCircle2, CircleDollarSign, Clock3, Gauge, Save, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import { pricingPolicyFor, tradePricingSummary } from '../../data/sambramoPricingPolicy'

const wholeRupees = value => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}

export default function SambramoPricingStudio({ vendor, services = [], onOpenListings = null }) {
  const [rows, setRows] = useState([])
  const [selectedTrade, setSelectedTrade] = useState('E01')
  const [rate, setRate] = useState('')
  const [unit, setUnit] = useState('per event')
  const [minimum, setMinimum] = useState('1')
  const [included, setIncluded] = useState('0')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    if (!vendor?.id) return
    const { data } = await supabase
      .from('sambramo_partner_price_books')
      .select('id, trade_id, offering_id, component_id, unit, rate_paise, minimum_quantity, included_quantity, status, version, updated_at')
      .eq('vendor_id', vendor.id)
      .order('updated_at', { ascending: false })
    setRows(data ?? [])
  }, [vendor?.id])

  useEffect(() => { load() }, [load])

  const summaries = tradePricingSummary()
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? summaries.filter(p => p.tradeId.toLowerCase().includes(q) || p.tradeName.toLowerCase().includes(q)) : summaries
  }, [summaries, query])

  const byTrade = useMemo(() => {
    const out = new Map()
    for (const row of rows) if (row.trade_id && !out.has(row.trade_id)) out.set(row.trade_id, row)
    return out
  }, [rows])

  useEffect(() => {
    const current = byTrade.get(selectedTrade)
    if (!current) {
      setRate('')
      setUnit('per event')
      setMinimum('1')
      setIncluded('0')
      return
    }
    setRate(String(Math.round(Number(current.rate_paise) / 100)))
    setUnit(current.unit ?? 'per event')
    setMinimum(String(current.minimum_quantity ?? 1))
    setIncluded(String(current.included_quantity ?? 0))
  }, [selectedTrade, byTrade])

  const readyCount = summaries.filter(p => byTrade.has(p.tradeId)).length
  const policy = pricingPolicyFor(selectedTrade)
  const linkedService = services.find(s => {
    const category = String(s.category ?? '').trim().toLowerCase()
    return category === String(policy?.tradeName ?? '').trim().toLowerCase()
  })

  async function save() {
    if (!vendor?.id || !policy) return
    if (wholeRupees(rate) <= 0) {
      setMessage({ bad: true, text: 'Enter a positive partner supply rate.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const current = byTrade.get(selectedTrade)
      const payload = {
        vendor_id: vendor.id,
        vendor_service_id: linkedService?.id ?? null,
        trade_id: selectedTrade,
        offering_id: linkedService?.id ?? selectedTrade,
        component_id: 'base',
        component_type: 'base',
        unit: unit.trim() || 'per event',
        rate_paise: wholeRupees(rate) * 100,
        minimum_quantity: Math.max(1, Number(minimum) || 1),
        included_quantity: Math.max(0, Number(included) || 0),
        inclusions: [],
        exclusions: [],
        quantity_formula: {
          mode: 'structured',
          trade_id: selectedTrade,
          determinants: policy.determinants,
        },
        pcu_ids: [],
        status: 'active',
        version: current ? Number(current.version || 1) + 1 : 1,
      }

      if (current) {
        const { data, error } = await supabase
          .from('sambramo_partner_price_books')
          .update(payload)
          .eq('id', current.id)
          .select('id, trade_id, unit, rate_paise, version, status, updated_at')
          .single()
        if (error) throw error
        setRows(old => old.map(x => x.id === data.id ? data : x))
      } else {
        const { data, error } = await supabase
          .from('sambramo_partner_price_books')
          .insert(payload)
          .select('id, trade_id, unit, rate_paise, version, status, updated_at')
          .single()
        if (error) throw error
        setRows(old => [data, ...old])
      }
      setMessage({ bad: false, text: policy.tradeName + ' rate saved. Sambramo now has a structured supply input for this trade.' })
    } catch (e) {
      setMessage({ bad: true, text: e.message ?? 'Could not save that rate.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-plum-950 via-plum-800 to-violet-700 p-5 text-white">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Gauge size={22} /></span>
          <div className="flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/65">Sambramo Pricing Studio</p>
            <h2 className="mt-1 text-[24px] font-extrabold leading-tight">Turn your rates into more instant jobs.</h2>
            <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-white/75">
              Set the supply economics once. Sambramo keeps the customer-facing price and commercial calculation consistent across the marketplace.
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric value={readyCount} label="Trades covered" icon={CheckCircle2} />
          <Metric value={34 - readyCount} label="Still to configure" icon={Clock3} />
          <Metric value="34" label="Total trades" icon={BarChart3} />
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-4 ring-1 ring-hairline/10">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a trade — catering, photography, L01…" className="w-full rounded-2xl bg-surface px-10 py-3 text-[12.5px] font-semibold text-ink outline-none ring-1 ring-transparent focus:ring-plum-200" />
          </div>
          {onOpenListings && <button type="button" onClick={onOpenListings} className="rounded-2xl bg-surface px-4 py-3 text-[12px] font-extrabold text-ink-soft ring-1 ring-hairline/10">Review my listings</button>}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {visible.map(p => {
            const configured = byTrade.has(p.tradeId)
            const selected = selectedTrade === p.tradeId
            return (
              <button key={p.tradeId} type="button" onClick={() => setSelectedTrade(p.tradeId)} className={selected ? 'rounded-2xl bg-plum-50 p-3 text-left ring-2 ring-plum-400' : 'rounded-2xl bg-surface p-3 text-left ring-1 ring-hairline/[0.08]'}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-plum-600">{p.tradeId}</p>
                    <p className="mt-0.5 text-[13px] font-extrabold text-ink">{p.tradeName}</p>
                  </div>
                  {configured ? <CheckCircle2 size={18} className="text-forest-600" /> : <CircleDollarSign size={18} className="text-ink-mute" />}
                </div>
                <p className="mt-1 text-[10.5px] text-ink-mute">{p.standardLabel}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-4 ring-1 ring-hairline/10">
        <div className="flex items-start gap-3">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-plum-600" />
          <div>
            <p className="text-[13px] font-extrabold text-ink">Configure {policy?.tradeName ?? 'trade'}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-mute">{policy?.determinants?.join(' · ')}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Field label="Partner supply rate" value={rate} onChange={setRate} suffix="₹" />
          <Field label="Pricing unit" value={unit} onChange={setUnit} />
          <Field label="Minimum quantity" value={minimum} onChange={setMinimum} type="number" />
          <Field label="Included quantity" value={included} onChange={setIncluded} type="number" />
        </div>

        <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 ring-1 ring-amber-100">
          You are setting your <strong>supply rate</strong>, not the customer's price. Sambramo owns the customer calculation, matching lane and required disclosures.
        </div>

        {message && <p className={'mt-3 rounded-2xl p-3 text-[11.5px] font-bold ' + (message.bad ? 'bg-rose-50 text-rose-700' : 'bg-forest-50 text-forest-700')}>{message.text}</p>}

        <button type="button" disabled={saving} onClick={save} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3 text-[13px] font-extrabold text-plum-950 disabled:opacity-50">
          <Save size={15} /> {saving ? 'Saving…' : 'Save supply rate'}
        </button>
      </section>

      <section className="rounded-[24px] bg-surface p-4">
        <div className="flex items-center gap-2 text-[12px] font-extrabold text-ink"><ShieldCheck size={15} className="text-plum-600" /> Your custom work stays available</div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-mute">
          Standardized rates unlock autonomous pricing. Bespoke work comes through a separate Sambramo quote lane, so you can price the work that genuinely needs your judgment without bargaining with the customer.
        </p>
      </section>
    </div>
  )
}

function Field({ label, value, onChange, suffix = '', type = 'text' }) {
  return (
    <label className="rounded-2xl bg-surface p-3 ring-1 ring-hairline/[0.08]">
      <span className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">{label}</span>
      <div className="mt-1.5 flex items-center gap-2">
        <input type={type} value={value} onChange={e => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[15px] font-extrabold text-ink outline-none" />
        {suffix && <span className="text-[11px] font-bold text-ink-mute">{suffix}</span>}
      </div>
    </label>
  )
}

function Metric({ value, label, icon: Icon }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <Icon size={14} />
      <p className="mt-1 text-[20px] font-extrabold tabular-nums">{value}</p>
      <p className="text-[9.5px] font-bold text-white/60">{label}</p>
    </div>
  )
}
