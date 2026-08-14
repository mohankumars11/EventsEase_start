import { useState, useEffect, useMemo } from 'react'
import {
  AlertCircle, Plus, Trash2, Users, Globe, CalendarDays,
  Loader2, Sparkles, RotateCcw,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import MonthGrid from '../common/MonthGrid'
import { LIVE_CITIES } from '../../config/cities'
import { humanDate, todayISO } from '../../utils/format'
import { INTEREST_FLOOR, indexInterestRows, addDaysISO, parseISO } from '../../lib/demand'
import { invalidateDateInterest } from '../../hooks/useDateDemand'

/**
 * The date console — everything that decides what a customer sees on a date.
 *
 * The customer-facing calendar has exactly one thing it can say about a date:
 * how many families have asked about it. Half of that counts itself, from
 * enquiries submitted through the site. The other half is logged here,
 * because for a concierge most early enquiries arrive by WhatsApp or a phone
 * call and never touch a web form.
 *
 * This screen is a calendar rather than a list because the job is a calendar
 * job — "which Saturdays in December are we pushing?" is unanswerable from a
 * table sorted by insertion order. Every cell shows the total a customer
 * would see and whether it is above the threshold to show at all, so there is
 * never a guess about whether a row is doing anything.
 *
 * ── Two rules this screen cannot break ───────────────────────────────
 *
 * `note` is required on every entry. A count somebody can trace back to real
 * conversations is a fact; a count nobody can trace is the false-urgency
 * pattern the CCPA dark-pattern guidelines name, and it is the kind of claim
 * that falls apart the first time a customer asks about it.
 *
 * Nothing here can block a date. There is no capacity, no cap and no "full"
 * — those were removed from the product deliberately. Every date is bookable
 * and this screen only decides which ones carry a demand badge.
 */

const HORIZON_DAYS = 400
const BLANK = { logged_count: 1, note: '', city: '' }

export default function DateDemandAdmin() {
  const [rows, setRows]         = useState([])
  const [counts, setCounts]     = useState(new Map())
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [busy, setBusy]         = useState(false)

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const [cursor, setCursor]     = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(todayISO())
  const [form, setForm]         = useState(BLANK)

  // Bulk: the same entry across a run of dates, which is how a real week of
  // enquiries actually arrives — "the Diwali weekend is busy", not one day.
  const [bulk, setBulk] = useState({ from: '', to: '', weekendsOnly: true, logged_count: 1, note: '', city: '' })
  const [bulkOpen, setBulkOpen] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const from = todayISO()
    const [log, demand] = await Promise.all([
      supabase.from('date_enquiry_log').select('*').gte('enquiry_date', from).order('enquiry_date'),
      supabase.rpc('date_demand', { p_from: from, p_to: addDaysISO(from, HORIZON_DAYS), p_city: null }),
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
    setCounts(demand.error ? new Map() : indexInterestRows(demand.data ?? []))
    setLoading(false)
  }

  /** Per-date totals, exactly as date_demand() computes them. */
  const byDate = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const cur = map.get(r.enquiry_date) ?? { logged: 0, entries: [] }
      cur.logged += r.logged_count
      cur.entries.push(r)
      map.set(r.enquiry_date, cur)
    }
    for (const [iso, v] of map) {
      const site = counts.get(iso)?.site ?? 0
      v.site = site
      v.total = site + v.logged
      v.visible = v.total >= INTEREST_FLOOR
    }
    return map
  }, [rows, counts])

  function dayTotals(iso) {
    const logged = byDate.get(iso)
    const site = counts.get(iso)?.site ?? 0
    const total = (logged?.logged ?? 0) + site
    return { site, logged: logged?.logged ?? 0, entries: logged?.entries ?? [], total, visible: total >= INTEREST_FLOOR }
  }

  const sel = dayTotals(selected)

  const stats = useMemo(() => {
    let showing = 0, loggedTotal = 0, siteTotal = 0
    for (const [, v] of byDate) { if (v.visible) showing++; loggedTotal += v.logged }
    for (const [, v] of counts) siteTotal += v.site
    return { showing, loggedTotal, siteTotal }
  }, [byDate, counts])

  const canAdd = Number(form.logged_count) > 0 && form.note.trim() && selected

  async function addEntry(e) {
    e.preventDefault()
    if (!canAdd || busy) return
    setBusy(true)
    const { error: err } = await supabase.from('date_enquiry_log').insert({
      enquiry_date: selected,
      city: form.city || null,
      logged_count: Number(form.logged_count),
      note: form.note.trim(),
    })
    setBusy(false)
    if (err) { setError(err.message); return }
    setForm(BLANK)
    invalidateDateInterest()
    load()
  }

  async function removeEntry(id) {
    const { error: err } = await supabase.from('date_enquiry_log').delete().eq('id', id)
    if (err) { setError(err.message); return }
    setRows(list => list.filter(r => r.id !== id))
    invalidateDateInterest()
  }

  const bulkDates = useMemo(() => {
    if (!bulk.from || !bulk.to || bulk.to < bulk.from) return []
    const out = []
    for (let iso = bulk.from; iso && iso <= bulk.to; iso = addDaysISO(iso, 1)) {
      const dow = parseISO(iso).getDay()
      if (bulk.weekendsOnly && dow !== 0 && dow !== 6) continue
      out.push(iso)
      if (out.length > 120) break
    }
    return out
  }, [bulk])

  async function applyBulk(e) {
    e.preventDefault()
    if (busy || bulkDates.length === 0 || !bulk.note.trim() || Number(bulk.logged_count) < 1) return
    setBusy(true)
    const { error: err } = await supabase.from('date_enquiry_log').insert(
      bulkDates.map(d => ({
        enquiry_date: d,
        city: bulk.city || null,
        logged_count: Number(bulk.logged_count),
        note: bulk.note.trim(),
      })),
    )
    setBusy(false)
    if (err) { setError(err.message); return }
    setBulk(b => ({ ...b, note: '' }))
    setBulkOpen(false)
    invalidateDateInterest()
    load()
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-plum-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">📆 Date demand</h2>
        <p className="text-sm text-gray-500">
          How many families have asked about each date. Every date stays bookable —
          this only decides which ones show a demand badge to customers.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />{error}
          <button onClick={load} className="ml-auto font-semibold hover:underline">Retry</button>
        </div>
      )}

      {/* ── At a glance ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Dates showing demand', value: stats.showing, icon: Sparkles, tone: 'bg-teal-50 text-teal-700' },
          { label: 'Logged by the team', value: stats.loggedTotal, icon: Users, tone: 'bg-plum-50 text-plum-700' },
          { label: 'From the site', value: stats.siteTotal, icon: Globe, tone: 'bg-gray-100 text-gray-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-3 ${s.tone}`}>
            <s.icon size={15} />
            <p className="mt-1 text-xl font-extrabold">{s.value}</p>
            <p className="text-[11px] leading-tight opacity-75">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── The calendar ────────────────────────────────────── */}
      <section className="card p-4 sm:p-5">
        <MonthGrid
          cursor={cursor}
          onCursor={setCursor}
          minDate={today}
          renderDay={(date, { iso, isToday, isPast }) => {
            if (isPast) {
              return (
                <div className="flex h-full w-full items-center justify-center rounded-xl text-xs text-gray-300">
                  {date.getDate()}
                </div>
              )
            }
            const d = dayTotals(iso)
            const isSel = iso === selected
            return (
              <button
                type="button"
                onClick={() => setSelected(iso)}
                aria-pressed={isSel}
                title={`${date.toDateString()} · ${d.total} total (${d.site} site, ${d.logged} logged)`}
                className={[
                  'relative flex h-full w-full flex-col items-center justify-center rounded-xl border text-xs font-semibold transition-colors',
                  d.visible
                    ? 'border-teal-400 bg-teal-50 text-teal-800'
                    : d.total > 0
                      ? 'border-gray-300 bg-gray-50 text-gray-600'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-plum-300',
                  isSel ? 'ring-2 ring-plum-500 ring-offset-1' : '',
                  isToday && !isSel ? 'ring-1 ring-plum-300' : '',
                ].join(' ')}
              >
                {date.getDate()}
                {/* The number a customer would see, or a muted one below the
                    threshold — never a guess about whether a row is live. */}
                {d.total > 0 && (
                  <span className={`text-[9px] font-extrabold leading-none ${d.visible ? 'text-teal-700' : 'text-gray-500'}`}>
                    {d.total}
                  </span>
                )}
              </button>
            )
          }}
        />

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-orange-100 pt-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded border border-teal-400 bg-teal-50" />
            Showing a badge ({INTEREST_FLOOR}+)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded border border-gray-300 bg-gray-50" />
            Below {INTEREST_FLOOR} — hidden from customers
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded border border-gray-200 bg-white" />
            Nothing yet
          </span>
          <button
            type="button"
            onClick={() => setBulkOpen(v => !v)}
            className="ml-auto font-semibold text-plum-600 hover:underline"
          >
            {bulkOpen ? 'Close bulk log' : 'Bulk log a run of dates'}
          </button>
        </div>

        {/* ── Bulk ─────────────────────────────────────────── */}
        {bulkOpen && (
          <form onSubmit={applyBulk} className="mt-4 space-y-2 rounded-2xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">
              The same entry across a run of dates — how a busy week actually arrives.
              Adds one row per date, so each stays individually removable.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] font-semibold text-gray-600">
                From
                <input type="date" required min={todayISO()} value={bulk.from}
                  onChange={e => setBulk(b => ({ ...b, from: e.target.value }))} className="input mt-0.5" />
              </label>
              <label className="text-[11px] font-semibold text-gray-600">
                To
                <input type="date" required min={bulk.from || todayISO()} value={bulk.to}
                  onChange={e => setBulk(b => ({ ...b, to: e.target.value }))} className="input mt-0.5" />
              </label>
              <input type="number" min={1} max={500} required value={bulk.logged_count}
                onChange={e => setBulk(b => ({ ...b, logged_count: e.target.value }))}
                className="input" aria-label="Enquiries per date" placeholder="Per date" />
              <select value={bulk.city} onChange={e => setBulk(b => ({ ...b, city: e.target.value }))}
                className="input" aria-label="City">
                <option value="">All cities</option>
                {LIVE_CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <input required placeholder="Where from — e.g. Diwali weekend WhatsApp run"
                value={bulk.note} onChange={e => setBulk(b => ({ ...b, note: e.target.value }))}
                className="input sm:col-span-2" />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={bulk.weekendsOnly}
                onChange={e => setBulk(b => ({ ...b, weekendsOnly: e.target.checked }))}
                className="h-4 w-4 accent-plum-600" />
              Weekends only
            </label>
            <button type="submit" disabled={busy || bulkDates.length === 0 || !bulk.note.trim()}
              className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-40">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Apply to {bulkDates.length} date{bulkDates.length === 1 ? '' : 's'}
            </button>
          </form>
        )}
      </section>

      {/* ── The selected date ───────────────────────────────── */}
      <section className="card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-gray-900">
              <CalendarDays size={16} className="text-plum-600" />
              {humanDate(selected)}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{sel.site}</span> from the site ·{' '}
              <span className="font-semibold text-gray-700">{sel.logged}</span> logged
            </p>
          </div>
          <span className={[
            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
            sel.visible ? 'bg-teal-100 text-teal-800' : 'bg-gray-200 text-gray-500',
          ].join(' ')}>
            {sel.visible
              ? `shows "${sel.total} enquiries"`
              : `${sel.total} — below ${INTEREST_FLOOR}, hidden`}
          </span>
        </div>

        <form onSubmit={addEntry} className="mt-4 grid gap-2 sm:grid-cols-[7rem_1fr]">
          <input type="number" min={1} max={500} required value={form.logged_count}
            onChange={e => setForm(f => ({ ...f, logged_count: e.target.value }))}
            className="input" aria-label="How many enquiries" placeholder="How many" />
          <input required placeholder="Where from — e.g. 2 WhatsApp, 1 call"
            value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            className="input" />
          <select value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
            className="input" aria-label="City">
            <option value="">All cities</option>
            {LIVE_CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <button type="submit" disabled={!canAdd || busy}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Log enquiries
          </button>
        </form>
        <p className="mt-2 text-[11px] text-gray-500">
          Site enquiries count automatically — don't add those here or they count twice.
        </p>

        {sel.entries.length > 0 && (
          <div className="mt-4 space-y-1.5 border-t border-orange-100 pt-3">
            {sel.entries.map(r => (
              <div key={r.id} className="flex items-center gap-2 text-xs text-gray-600">
                <span className="font-bold text-gray-800">+{r.logged_count}</span>
                <span className="truncate">{r.city ?? 'All cities'} · {r.note}</span>
                <button onClick={() => removeEntry(r.id)} aria-label={`Remove entry of ${r.logged_count}`}
                  className="ml-auto shrink-0 rounded p-1 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Everything logged ───────────────────────────────── */}
      <section className="card p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">All logged dates</h3>
          <button onClick={load} className="flex items-center gap-1.5 text-xs font-semibold text-plum-600 hover:underline">
            <RotateCcw size={12} /> Refresh
          </button>
        </div>
        {byDate.size === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            Nothing logged. Every date currently shows plain and bookable, which is the
            right default until real enquiries exist.
          </p>
        ) : (
          <div className="mt-3 space-y-1">
            {[...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([iso, v]) => (
              <button
                key={iso}
                onClick={() => {
                  setSelected(iso)
                  const d = parseISO(iso)
                  setCursor(new Date(d.getFullYear(), d.getMonth(), 1))
                }}
                className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                  iso === selected ? 'border-plum-400 bg-plum-50' : 'border-gray-200 hover:border-plum-300'
                }`}
              >
                <span className="font-semibold text-gray-800">{humanDate(iso)}</span>
                <span className="text-gray-500">{v.site} site · {v.logged} logged</span>
                <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  v.visible ? 'bg-teal-100 text-teal-800' : 'bg-gray-200 text-gray-500'
                }`}>
                  {v.total}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
