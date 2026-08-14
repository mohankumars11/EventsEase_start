import { useState, useEffect, useMemo } from 'react'
import {
  AlertCircle, Plus, Trash2, Loader2, CalendarDays, BookOpen, Save,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import MonthGrid from '../common/MonthGrid'
import { LIVE_CITIES } from '../../config/cities'
import { humanDate, todayISO } from '../../utils/format'
import { addDaysISO, parseISO } from '../../lib/demand'

/**
 * Peak dates — the muhurtham, festival and long-weekend calendar.
 *
 * This is the screen migration 035 said should exist and never got built.
 * Its own comment is the spec:
 *
 *   "No seed rows. Auspicious dates are not something to invent — a wrong
 *    one is both a false claim and embarrassing in front of exactly the
 *    customers who would notice. Seed from a published panchang via the
 *    admin screen, which records the source."
 *
 * So `source` is required by the form as well as by the column. A muhurtham
 * nobody can trace to a published panchang is somebody's guess, and the one
 * audience guaranteed to catch a wrong auspicious date is the audience that
 * cares about auspicious dates.
 *
 * ── What a peak date is, and what it is not ──────────────────────────
 *
 * It is a *signal*: this date is under pressure, here is why, here is where
 * we read it. It is not a block. Nothing on this screen can stop a booking —
 * that is what the Capacity tab does, and the two are deliberately separate
 * so that marking Diwali as a festival never silently closes it.
 *
 * ── One row per date per city ────────────────────────────────────────
 *
 * The table carries UNIQUE (peak_date, city), so saving twice for the same
 * pair has to update rather than insert. It cannot be done with an upsert:
 * Postgres treats repeated NULLs as distinct, so the all-cities rows would
 * slip straight past the constraint and duplicate — the same trap migration
 * 036 documents for date_enquiry_log. Instead the form looks for an existing
 * row in state and switches itself to an update, which also lets the UI say
 * plainly that it is editing rather than adding.
 */

const HORIZON_DAYS = 400

const KINDS = [
  { id: 'MUHURTHAM',    label: 'Muhurtham',    hint: 'An auspicious date from a panchang' },
  { id: 'FESTIVAL',     label: 'Festival',     hint: 'Diwali, Dasara, Ugadi…' },
  { id: 'LONG_WEEKEND', label: 'Long weekend', hint: 'A public holiday running into a weekend' },
  { id: 'SEASON',       label: 'Season',       hint: 'Wedding season, exam results, admissions' },
  { id: 'OTHER',        label: 'Other',        hint: 'Anything else worth flagging' },
]

// 1 · 2 · 3 exactly as the column's CHECK defines them.
const WEIGHTS = [
  { value: 1, label: 'Mild',     hint: 'Busier than usual' },
  { value: 2, label: 'Notable',  hint: 'Vendors commit early' },
  { value: 3, label: 'City full', hint: 'Everyone is booked out' },
]

const BLANK = { kind: 'MUHURTHAM', label: '', weight: 2, source: '', note: '', city: '' }

const WEIGHT_CELL = {
  1: 'border-amber-300 bg-amber-50 text-amber-800',
  2: 'border-orange-400 bg-orange-50 text-orange-800',
  3: 'border-red-400 bg-red-50 text-red-800',
}

export default function PeakDatesAdmin() {
  const { profile } = useAuth()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [busy, setBusy]       = useState(false)

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const [cursor, setCursor]     = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(todayISO())
  const [form, setForm]         = useState(BLANK)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const from = todayISO()
    const { data, error: err } = await supabase
      .from('peak_dates')
      .select('*')
      .gte('peak_date', from)
      .lte('peak_date', addDaysISO(from, HORIZON_DAYS))
      .order('peak_date')
    if (err) {
      // 42P01 = undefined_table. Migration 035 creates this one, so a miss
      // here is a setup step rather than a fault — say which file to run.
      setError(
        err.code === '42P01'
          ? 'Migration 035 has not been applied yet. Run supabase/migrations/035_date_demand.sql in the SQL editor.'
          : err.message,
      )
      setLoading(false)
      return
    }
    setRows(data ?? [])
    setLoading(false)
  }

  /** iso → the rows marked on it, across all cities. */
  const byDate = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const list = map.get(r.peak_date) ?? []
      list.push(r)
      map.set(r.peak_date, list)
    }
    return map
  }, [rows])

  const selectedRows = byDate.get(selected) ?? []

  /**
   * The row this form would overwrite, if any. Drives the button's wording
   * as well as the insert/update branch, so the screen can never claim to be
   * adding a second entry the constraint would reject.
   */
  const existing = useMemo(
    () => selectedRows.find(r => (r.city ?? '') === form.city) ?? null,
    [selectedRows, form.city],
  )

  // When the date or city changes, load whatever is already there so the
  // form edits it rather than silently proposing a replacement.
  useEffect(() => {
    const match = (byDate.get(selected) ?? []).find(r => (r.city ?? '') === form.city)
    if (match) {
      setForm(f => ({
        ...f,
        kind: match.kind,
        label: match.label,
        weight: match.weight,
        source: match.source,
        note: match.note ?? '',
      }))
    }
    // Only re-run on the identity of the target cell, never on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, form.city, rows])

  const canSave = form.label.trim() && form.source.trim() && selected && !busy

  async function save(e) {
    e.preventDefault()
    if (!canSave) return
    setBusy(true)
    setError(null)

    const payload = {
      peak_date: selected,
      city:      form.city || null,
      kind:      form.kind,
      label:     form.label.trim(),
      weight:    Number(form.weight),
      source:    form.source.trim(),
      note:      form.note.trim() || null,
    }

    const { error: err } = existing
      ? await supabase.from('peak_dates').update(payload).eq('id', existing.id)
      : await supabase.from('peak_dates').insert({ ...payload, created_by: profile?.id ?? null })

    setBusy(false)
    if (err) {
      setError(
        err.code === '23505'
          ? 'That date already has an entry for this city. Reload and edit it instead.'
          : err.message,
      )
      return
    }
    setForm(f => ({ ...BLANK, city: f.city }))
    load()
  }

  async function remove(id) {
    const { error: err } = await supabase.from('peak_dates').delete().eq('id', id)
    if (err) { setError(err.message); return }
    setRows(list => list.filter(r => r.id !== id))
    setForm(f => ({ ...BLANK, city: f.city }))
  }

  const stats = useMemo(() => ({
    marked: byDate.size,
    full:   rows.filter(r => r.weight === 3).length,
    kinds:  new Set(rows.map(r => r.kind)).size,
  }), [byDate, rows])

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-plum-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">🪔 Peak dates</h2>
        <p className="text-sm text-gray-500">
          Muhurtham, festival and long-weekend pressure, with the panchang or
          almanac it came from. A signal only — marking a date here never blocks it.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />{error}
          <button onClick={load} className="ml-auto shrink-0 font-semibold hover:underline">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Dates marked',   value: stats.marked, tone: 'bg-orange-50 text-orange-700' },
          { label: 'Marked as full', value: stats.full,   tone: 'bg-red-50 text-red-700' },
          { label: 'Kinds in use',   value: stats.kinds,  tone: 'bg-gray-100 text-gray-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-3 ${s.tone}`}>
            <p className="text-xl font-extrabold">{s.value}</p>
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
            const marks = byDate.get(iso) ?? []
            // The loudest mark on the day decides the cell — a date that is
            // both a festival somewhere and full in Bengaluru should read as
            // full, not average out to amber.
            const top = marks.reduce((a, b) => (b.weight > (a?.weight ?? 0) ? b : a), null)
            const isSel = iso === selected
            return (
              <button
                type="button"
                onClick={() => setSelected(iso)}
                aria-pressed={isSel}
                title={marks.length ? marks.map(m => `${m.city ?? 'All cities'}: ${m.label}`).join(' · ') : date.toDateString()}
                className={[
                  'relative flex h-full w-full flex-col items-center justify-center rounded-xl border text-xs font-semibold transition-colors',
                  top ? WEIGHT_CELL[top.weight] : 'border-gray-200 bg-white text-gray-700 hover:border-plum-300',
                  isSel ? 'ring-2 ring-plum-500 ring-offset-1' : '',
                  isToday && !isSel ? 'ring-1 ring-plum-300' : '',
                ].join(' ')}
              >
                {date.getDate()}
                {marks.length > 0 && (
                  <span className="mt-0.5 flex gap-0.5" aria-hidden="true">
                    {marks.slice(0, 3).map(m => (
                      <span key={m.id} className="h-1 w-1 rounded-full bg-current opacity-70" />
                    ))}
                  </span>
                )}
              </button>
            )
          }}
        />

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-orange-100 pt-3 text-[11px] text-gray-500">
          {WEIGHTS.map(w => (
            <span key={w.value} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded border ${WEIGHT_CELL[w.value]}`} />
              {w.label} — {w.hint}
            </span>
          ))}
        </div>
      </section>

      {/* ── The selected date ───────────────────────────────── */}
      <section className="card p-4 sm:p-5">
        <h3 className="flex items-center gap-2 font-bold text-gray-900">
          <CalendarDays size={16} className="text-plum-600" />
          {humanDate(selected)}
        </h3>

        {selectedRows.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {selectedRows.map(r => (
              <div key={r.id} className="flex items-start gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs">
                <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${WEIGHT_CELL[r.weight]}`}>
                  {WEIGHTS.find(w => w.value === r.weight)?.label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-gray-800">
                    {r.label} <span className="font-normal text-gray-500">· {r.city ?? 'All cities'}</span>
                  </span>
                  {r.note && <span className="block text-gray-500">{r.note}</span>}
                  <span className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500">
                    <BookOpen size={10} /> {r.source}
                  </span>
                </span>
                <button
                  onClick={() => remove(r.id)}
                  aria-label={`Remove ${r.label}`}
                  className="shrink-0 rounded p-1 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={save} className="mt-4 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[11px] font-semibold text-gray-600">
              Kind
              <select
                value={form.kind}
                onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}
                className="input mt-0.5"
              >
                {KINDS.map(k => <option key={k.id} value={k.id}>{k.label} — {k.hint}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-semibold text-gray-600">
              City
              <select
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="input mt-0.5"
              >
                <option value="">All cities</option>
                {LIVE_CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </label>
            <input
              required
              placeholder="What it is — e.g. Shubha muhurtham"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className="input"
              aria-label="Label"
            />
            <select
              value={form.weight}
              onChange={e => setForm(f => ({ ...f, weight: Number(e.target.value) }))}
              className="input"
              aria-label="Pressure"
            >
              {WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.value} · {w.label} — {w.hint}</option>)}
            </select>
            <input
              required
              placeholder="Source — e.g. Mysore panchang 2026, p.14"
              value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              className="input sm:col-span-2"
              aria-label="Source"
            />
            <input
              placeholder="Customer-facing note (optional) — e.g. Decorators book out weeks ahead"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="input sm:col-span-2"
              aria-label="Note"
            />
          </div>

          <button
            type="submit"
            disabled={!canSave}
            className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-40"
          >
            {busy ? <Loader2 size={15} className="animate-spin" />
                  : existing ? <Save size={15} /> : <Plus size={15} />}
            {existing
              ? `Update ${form.city || 'all cities'} entry`
              : `Mark ${humanDate(selected)}`}
          </button>
          <p className="text-[11px] text-gray-500">
            Source is required. An auspicious date nobody can trace back to a published
            panchang is a guess, and this is the one audience that will notice.
          </p>
        </form>
      </section>

      {/* ── Everything marked ───────────────────────────────── */}
      <section className="card p-4 sm:p-5">
        <h3 className="font-bold text-gray-900">All marked dates</h3>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            Nothing marked yet — which is the honest default. Add dates from a published
            panchang or the festival calendar as you confirm them.
          </p>
        ) : (
          <div className="mt-3 space-y-1">
            {rows.map(r => (
              <button
                key={r.id}
                onClick={() => {
                  setSelected(r.peak_date)
                  setForm(f => ({ ...f, city: r.city ?? '' }))
                  const d = parseISO(r.peak_date)
                  setCursor(new Date(d.getFullYear(), d.getMonth(), 1))
                }}
                className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                  r.peak_date === selected ? 'border-plum-400 bg-plum-50' : 'border-gray-200 hover:border-plum-300'
                }`}
              >
                <span className="font-semibold text-gray-800">{humanDate(r.peak_date)}</span>
                <span className="truncate text-gray-500">{r.label}</span>
                <span className="ml-auto shrink-0 text-[10px] text-gray-500">{r.city ?? 'All cities'}</span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${WEIGHT_CELL[r.weight]}`}>
                  {r.weight}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
