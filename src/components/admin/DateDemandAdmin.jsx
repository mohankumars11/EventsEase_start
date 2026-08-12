import { useState, useEffect, useMemo } from 'react'
import { AlertCircle, Plus, Trash2, Users, Globe } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { LIVE_CITIES } from '../../config/cities'
import { humanDate, todayISO } from '../../utils/format'
import { INTEREST_FLOOR, indexInterestRows, addDaysISO } from '../../lib/demand'
import { invalidateDateInterest } from '../../hooks/useDateDemand'

/**
 * What the date calendar tells customers.
 *
 * The customer-facing calendar has exactly one thing it can say about a
 * date: how many families have asked about it. Half of that number counts
 * itself — enquiries submitted through the site. The other half is logged
 * here, because for a concierge most early enquiries arrive by WhatsApp or a
 * phone call and never touch a web form.
 *
 * `note` is required on every row. A count somebody can trace back to real
 * conversations is a fact; a count nobody can trace is the false-urgency
 * pattern the CCPA dark-pattern guidelines name, and it is also the kind of
 * claim that falls apart the first time a customer asks about it.
 *
 * Every date stays available. There is nothing on this screen that can block
 * or cap a date, by design.
 */

const BLANK = { enquiry_date: '', city: '', logged_count: 1, note: '' }

export default function DateDemandAdmin() {
  const [rows, setRows]       = useState([])
  const [siteCounts, setSite] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [form, setForm]       = useState(BLANK)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const today = todayISO()
    const [log, demand] = await Promise.all([
      supabase.from('date_enquiry_log').select('*').gte('enquiry_date', today).order('enquiry_date'),
      supabase.rpc('date_demand', { p_from: today, p_to: addDaysISO(today, 400), p_city: null }),
    ])
    if (log.error) {
      // A missing table means migration 036 hasn't been applied — a setup
      // step, not a fault. Say so instead of showing raw Postgres text.
      setError(
        log.error.code === '42P01'
          ? 'Migration 036 has not been applied yet. Run supabase/migrations/036_date_enquiry_log.sql in the SQL editor.'
          : log.error.message,
      )
      setLoading(false)
      return
    }
    setRows(log.data ?? [])
    setSite(demand.error ? new Map() : indexInterestRows(demand.data ?? []))
    setLoading(false)
  }

  const canSave = form.enquiry_date && Number(form.logged_count) > 0 && form.note.trim()

  async function add(e) {
    e.preventDefault()
    if (!canSave || saving) return
    setSaving(true)
    const { error: err } = await supabase.from('date_enquiry_log').insert({
      enquiry_date: form.enquiry_date,
      city: form.city || null,
      logged_count: Number(form.logged_count),
      note: form.note.trim(),
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setForm(BLANK)
    invalidateDateInterest()
    load()
  }

  async function remove(id) {
    const { error: err } = await supabase.from('date_enquiry_log').delete().eq('id', id)
    if (err) { setError(err.message); return }
    setRows(list => list.filter(r => r.id !== id))
    invalidateDateInterest()
  }

  /**
   * What a customer would actually see, per date.
   *
   * Several log entries can share a date — "2 more came in today" is its own
   * row — so they are totalled here the same way date_demand() sums them,
   * rather than each row claiming to be the whole picture.
   */
  const preview = useMemo(() => {
    const byDate = new Map()
    for (const r of rows) {
      const cur = byDate.get(r.enquiry_date) ?? { date: r.enquiry_date, logged: 0, entries: [] }
      cur.logged += r.logged_count
      cur.entries.push(r)
      byDate.set(r.enquiry_date, cur)
    }
    return [...byDate.values()].map(d => {
      const site = siteCounts.get(d.date)?.site ?? 0
      const total = site + d.logged
      return { ...d, site, total, visible: total >= INTEREST_FLOOR }
    }).sort((a, b) => a.date.localeCompare(b.date))
  }, [rows, siteCounts])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-plum-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">📆 Date demand</h2>
        <p className="text-sm text-gray-500">
          How many families have asked about each date. Every date stays bookable —
          this only decides which ones show a badge.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          <AlertCircle size={18} />{error}
          <button onClick={load} className="font-semibold hover:underline ml-auto">Retry</button>
        </div>
      )}

      <section className="card p-5">
        <h3 className="font-bold text-gray-900 mb-1">Log an off-platform enquiry</h3>
        <p className="text-xs text-gray-500 mb-4">
          Enquiries that came by WhatsApp, a call, Instagram or a walk-in. Site enquiries
          are counted automatically — don't add those here or they'll count twice.
          A date shows nothing to customers until the combined total reaches{' '}
          <strong>{INTEREST_FLOOR}</strong>.
        </p>

        <form onSubmit={add} className="grid gap-2 sm:grid-cols-2">
          <input
            type="date" required min={todayISO()}
            value={form.enquiry_date}
            onChange={e => setForm(f => ({ ...f, enquiry_date: e.target.value }))}
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
          <input
            type="number" min={1} max={500} required
            value={form.logged_count}
            onChange={e => setForm(f => ({ ...f, logged_count: e.target.value }))}
            className="input" aria-label="How many enquiries"
            placeholder="How many"
          />
          <input
            required placeholder="Where from — e.g. 2 WhatsApp, 1 call"
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            className="input"
          />
          <button
            type="submit" disabled={!canSave || saving}
            className="btn-primary sm:col-span-2 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Plus size={15} />{saving ? 'Saving…' : 'Log enquiries'}
          </button>
        </form>
      </section>

      <section className="card p-5">
        <h3 className="font-bold text-gray-900 mb-3">Logged dates</h3>
        {preview.length === 0 ? (
          <p className="text-sm text-gray-400">
            Nothing logged. Every date currently shows as plain and available, which
            is the right default until real enquiries exist.
          </p>
        ) : (
          <div className="space-y-3">
            {preview.map(d => (
              <div key={d.date} className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                  {humanDate(d.date)}
                  <span className="inline-flex items-center gap-1 text-[11px] font-normal text-gray-500">
                    <Globe size={11} />{d.site} from the site
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-normal text-gray-500">
                    <Users size={11} />{d.logged} logged
                  </span>
                  {/* Exactly what the customer sees, so nobody has to guess
                      whether a row is doing anything. */}
                  <span className={[
                    'rounded-full px-2 py-0.5 text-[11px] font-bold',
                    d.visible ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-500',
                  ].join(' ')}>
                    {d.visible
                      ? `shows "${d.total} enquiries"`
                      : `${d.total} — below ${INTEREST_FLOOR}, hidden`}
                  </span>
                </p>
                <div className="mt-2 space-y-1">
                  {d.entries.map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-[11px] text-gray-500">
                      <span className="font-bold text-gray-600">+{r.logged_count}</span>
                      <span className="truncate">{r.city ?? 'All cities'} · {r.note}</span>
                      <button
                        onClick={() => remove(r.id)}
                        aria-label={`Remove ${r.logged_count} logged on ${r.enquiry_date}`}
                        className="ml-auto shrink-0 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
