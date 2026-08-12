import { useState, useEffect, useMemo } from 'react'
import { AlertCircle, Plus, Trash2, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { LIVE_CITIES } from '../../config/cities'
import { humanDate, todayISO } from '../../utils/format'
import { slotByKey } from '../../lib/demand'

/**
 * The two knobs behind the customer-facing date calendar, plus the waitlist
 * they produce.
 *
 * Peak dates are what let the calendar say something true about a date before
 * there is any booking history — a muhurtham, a long weekend, a date the team
 * knows is heavy. Capacity is the real ceiling on how many celebrations can
 * be sourced for one day.
 *
 * Neither is decoration: both are read straight into what a customer is told,
 * so a wrong row here is a wrong claim on the site.
 */

const KINDS = [
  { id: 'MUHURTHAM',    label: 'Muhurtham' },
  { id: 'FESTIVAL',     label: 'Festival' },
  { id: 'LONG_WEEKEND', label: 'Long weekend' },
  { id: 'SEASON',       label: 'Season' },
  { id: 'OTHER',        label: 'Other' },
]

const BLANK = {
  peak_date: '', city: '', kind: 'MUHURTHAM',
  label: '', note: '', weight: 3, source: '',
}

export default function DateCapacityAdmin() {
  const [peaks, setPeaks]       = useState([])
  const [capacity, setCapacity] = useState([])
  const [waitlist, setWaitlist] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [form, setForm]         = useState(BLANK)
  const [saving, setSaving]     = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const today = todayISO()
    const [p, c, w] = await Promise.all([
      supabase.from('peak_dates').select('*').gte('peak_date', today).order('peak_date'),
      supabase.from('intake_capacity').select('*').order('city'),
      supabase.from('events')
        .select('id, event_code, event_date, time_slot, city, customer_name, customer_phone, event_type')
        .eq('intake_status', 'WAITLIST')
        .gte('event_date', today)
        .order('event_date'),
    ])
    // A missing table here means migration 035 hasn't been applied yet, which
    // is a setup step rather than a fault — say so plainly instead of showing
    // a raw Postgres error.
    const firstErr = p.error ?? c.error ?? w.error
    if (firstErr) {
      setError(
        firstErr.code === '42P01'
          ? 'Migration 035 has not been applied yet. Run supabase/migrations/035_date_demand.sql in the SQL editor.'
          : firstErr.message,
      )
      setLoading(false)
      return
    }
    setPeaks(p.data ?? [])
    setCapacity(c.data ?? [])
    setWaitlist(w.data ?? [])
    setLoading(false)
  }

  const canSave = form.peak_date && form.label.trim() && form.source.trim()

  async function addPeak(e) {
    e.preventDefault()
    if (!canSave || saving) return
    setSaving(true)
    const { error: err } = await supabase.from('peak_dates').insert({
      ...form,
      city: form.city || null,
      note: form.note.trim() || null,
      weight: Number(form.weight),
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setForm(BLANK)
    load()
  }

  async function removePeak(id) {
    const { error: err } = await supabase.from('peak_dates').delete().eq('id', id)
    if (err) { setError(err.message); return }
    setPeaks(list => list.filter(p => p.id !== id))
  }

  async function setMax(row, value) {
    const n = Number(value)
    if (!n || n < 1) return
    const { error: err } = await supabase
      .from('intake_capacity').update({ max_per_date: n }).eq('id', row.id)
    if (err) { setError(err.message); return }
    setCapacity(list => list.map(c => (c.id === row.id ? { ...c, max_per_date: n } : c)))
  }

  const waitlistByDate = useMemo(() => {
    const map = new Map()
    for (const w of waitlist) {
      if (!map.has(w.event_date)) map.set(w.event_date, [])
      map.get(w.event_date).push(w)
    }
    return [...map.entries()]
  }, [waitlist])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-plum-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">📆 Dates &amp; Capacity</h2>
        <p className="text-sm text-gray-500">
          What the date calendar tells customers, and how many celebrations we'll take in a day.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          <AlertCircle size={18} />{error}
          <button onClick={load} className="font-semibold hover:underline ml-auto">Retry</button>
        </div>
      )}

      {/* ── Capacity ────────────────────────────────────────── */}
      <section className="card p-5">
        <h3 className="font-bold text-gray-900 mb-1">Intake ceiling</h3>
        <p className="text-xs text-gray-500 mb-4">
          The most celebrations we'll accept for one date in a city. Past this the calendar
          shows the date as full and offers the customer nearby dates or the waitlist —
          it never quietly takes a booking we can't source vendors for.
          Starts at 12 for the pilot; raise it once the approved vendor bench can take more.
        </p>
        <div className="space-y-2">
          {capacity.map(row => (
            <div key={row.id} className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700 w-32">
                {row.city ?? 'All other cities'}
              </span>
              <input
                type="number"
                min={1}
                defaultValue={row.max_per_date}
                onBlur={e => setMax(row, e.target.value)}
                className="input w-24"
                aria-label={`Max per date for ${row.city ?? 'all other cities'}`}
              />
              <span className="text-xs text-gray-400">celebrations / date</span>
            </div>
          ))}
          {capacity.length === 0 && (
            <p className="text-sm text-gray-400">No capacity rows — check migration 035 ran its seed.</p>
          )}
        </div>
      </section>

      {/* ── Waitlist ────────────────────────────────────────── */}
      <section className="card p-5">
        <h3 className="font-bold text-gray-900 mb-1">Waitlist</h3>
        <p className="text-xs text-gray-500 mb-4">
          People who asked for a date that was already full. Nothing notifies them
          automatically — this list is the notification. Call them if a spot frees up;
          that is exactly what they were promised.
        </p>
        {waitlistByDate.length === 0 ? (
          <p className="text-sm text-gray-400">Nobody is waiting on a full date.</p>
        ) : (
          <div className="space-y-4">
            {waitlistByDate.map(([date, rows]) => (
              <div key={date}>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
                  {humanDate(date)} · {rows.length} waiting
                </p>
                <div className="space-y-1.5">
                  {rows.map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                      <span className="text-sm font-semibold text-gray-800">{r.customer_name}</span>
                      <span className="text-xs text-gray-500">
                        {r.event_type} · {r.city}
                        {r.time_slot ? ` · ${slotByKey(r.time_slot)?.label ?? r.time_slot}` : ''}
                      </span>
                      <a
                        href={`tel:${r.customer_phone}`}
                        className="ml-auto flex items-center gap-1.5 text-xs font-bold text-plum-600 hover:underline"
                      >
                        <Phone size={12} />{r.customer_phone}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Peak dates ──────────────────────────────────────── */}
      <section className="card p-5">
        <h3 className="font-bold text-gray-900 mb-1">Peak dates</h3>
        <p className="text-xs text-gray-500 mb-4">
          Dates the whole city is busy — muhurthams, festivals, long weekends. These are
          shown to customers as the reason a date is in demand, so every row needs a
          source you could point at. Weight 3 means "the city books out".
        </p>

        <form onSubmit={addPeak} className="grid gap-2 sm:grid-cols-2 mb-5">
          <input
            type="date" required min={todayISO()}
            value={form.peak_date}
            onChange={e => setForm(f => ({ ...f, peak_date: e.target.value }))}
            className="input" aria-label="Date"
          />
          <select
            value={form.city}
            onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
            className="input" aria-label="City"
          >
            <option value="">All cities</option>
            {LIVE_CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <select
            value={form.kind}
            onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}
            className="input" aria-label="Kind"
          >
            {KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <select
            value={form.weight}
            onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
            className="input" aria-label="Weight"
          >
            <option value={1}>1 — mildly busy</option>
            <option value={2}>2 — notably busy</option>
            <option value={3}>3 — the city books out</option>
          </select>
          <input
            required placeholder="Label, e.g. Shubha muhurtham"
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            className="input sm:col-span-2"
          />
          <input
            placeholder="What the customer reads, e.g. An auspicious wedding date — the city books out weeks ahead."
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            className="input sm:col-span-2"
          />
          <input
            required placeholder="Source (required) — e.g. Udupi panchanga 2026-27"
            value={form.source}
            onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
            className="input sm:col-span-2"
          />
          <button
            type="submit" disabled={!canSave || saving}
            className="btn-primary sm:col-span-2 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Plus size={15} />{saving ? 'Adding…' : 'Add peak date'}
          </button>
        </form>

        {peaks.length === 0 ? (
          <p className="text-sm text-gray-400">
            No peak dates yet. Until some are added the calendar runs on festivals,
            weekends, season windows and live vendor availability.
          </p>
        ) : (
          <div className="space-y-1.5">
            {peaks.map(p => (
              <div key={p.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {humanDate(p.peak_date)} · {p.label}
                    <span className="ml-2 text-[11px] font-normal text-gray-400">
                      {p.city ?? 'all cities'} · weight {p.weight}
                    </span>
                  </p>
                  {p.note && <p className="text-xs text-gray-500 mt-0.5">{p.note}</p>}
                  <p className="text-[11px] text-gray-400 mt-0.5">Source: {p.source}</p>
                </div>
                <button
                  onClick={() => removePeak(p.id)}
                  aria-label={`Remove ${p.label}`}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
