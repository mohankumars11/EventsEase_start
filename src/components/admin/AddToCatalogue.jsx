import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Check, Search, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { CUISINES, COURSES } from '../../data/cuisineMenus'
import { tidyName } from '../../data/catalogueAdditions'

/**
 * Add a dish to the catalogue without a deploy.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHO THIS IS FOR
 * ══════════════════════════════════════════════════════════════════════
 *
 * The operator on the phone to a caterer who has just said "we also make
 * Kaipuli Gojju". Before this, that sentence went nowhere: adding it
 * meant an edit, a build, a deploy and an engineer who was free, so the
 * catalogue only grew when somebody technical had time and the person who
 * found the gap forgot it by Thursday.
 *
 * It takes four taps now, and the next caterer to open Karnataka sees it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY PARTNERS CANNOT DO THIS
 * ══════════════════════════════════════════════════════════════════════
 *
 * They have a text box, and what they type is saved to specs flagged for
 * an operator. That operator decides whether it becomes a catalogue
 * entry, and the decision is the entire reason a curated list is worth
 * more than a free-text column: open the pen to everyone and inside a
 * week the list holds "Chiken Biriyani", "chicken biryani" and "Biryani
 * (chicken)" — three rows no customer search can match against.
 *
 * The typed suggestions are shown here, beside the form, so the operator
 * is adding from evidence rather than memory.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DEACTIVATE, NEVER DELETE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Listings reference dishes by NAME. Deleting a row that partners have
 * already ticked leaves those listings claiming something the catalogue
 * no longer offers — not visibly broken, and impossible to find later.
 */
export default function AddToCatalogue() {
  const toast = useToast()

  const [rows, setRows] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  const [cuisineId, setCuisineId] = useState(CUISINES[0]?.id ?? '')
  const [courseId, setCourseId] = useState(COURSES[0]?.id ?? '')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('catalogue_additions')
      .select('id, kind, cuisine_id, course_id, name, note, is_active, created_at')
      .order('created_at', { ascending: false })

    /* 103 not applied is a completely different problem from a failed
       query, and telling an operator "something went wrong" when the
       answer is "paste the migration" wastes an afternoon. */
    if (error) setMissing(/relation .* does not exist/i.test(error.message))
    setRows(data ?? [])
    setLoading(false)
  }

  /* What partners typed into the dish screens. Evidence, not memory. */
  async function loadSuggestions() {
    const { data } = await supabase
      .from('vendor_services')
      .select('id, specs, vendors(business_name)')
      .not('specs->dishes_typed', 'is', null)
      .limit(60)

    const out = []
    for (const row of data ?? []) {
      for (const t of row.specs?.dishes_typed ?? []) {
        out.push({
          id: `${row.id}:${t.screen}`,
          who: row.vendors?.business_name ?? 'A partner',
          screen: t.screen,
          text: t.text,
        })
      }
    }
    setSuggestions(out)
  }

  useEffect(() => { load(); loadSuggestions() }, [])

  async function add() {
    const clean = tidyName(name)
    if (!clean) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('catalogue_additions').insert({
      kind: 'dish',
      cuisine_id: cuisineId,
      course_id: courseId,
      name: clean,
      note: tidyName(note) || null,
      added_by: user?.id ?? null,
    })
    setSaving(false)

    if (error) {
      /* The unique index firing is not an error worth an apology — it
         means the dish is already there, which is what the operator
         wanted to be true. */
      toast.error(/duplicate key/i.test(error.message)
        ? `${clean} is already in ${cuisineId} · ${courseId}`
        : error.message)
      return
    }
    toast.success(`${clean} added — caterers see it on their next load`)
    setName(''); setNote(''); load()
  }

  async function deactivate(row) {
    const { error } = await supabase
      .from('catalogue_additions')
      .update({ is_active: !row.is_active })
      .eq('id', row.id)
    if (error) return toast.error(error.message)
    load()
  }

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter(r =>
      r.name.toLowerCase().includes(t)
      || String(r.cuisine_id).toLowerCase().includes(t))
  }, [rows, q])

  if (missing) {
    return (
      <div className="rounded-[20px] bg-amber-50 p-5 ring-1 ring-amber-300">
        <p className="flex items-center gap-2 text-[15px] font-extrabold text-amber-900">
          <AlertCircle size={17} /> Migration 103 has not been applied
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-amber-900/80">
          Paste <code className="font-mono">supabase/migrations/103_catalogue_additions.sql</code>{' '}
          into the Supabase SQL editor, then reload this page. Nothing else in
          the app depends on it — the funnel falls back to the catalogue in
          source, which is why nobody has noticed.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Add one ────────────────────────────────────────────────── */}
      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <p className="text-[16px] font-extrabold text-ink">Add a dish</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
          It appears in the partner funnel on the next load. No deploy.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-ink-mute">
              Cuisine
            </span>
            <select
              value={cuisineId}
              onChange={e => setCuisineId(e.target.value)}
              className="w-full rounded-2xl bg-white px-3 py-2.5 text-[14px] font-bold text-ink ring-1 ring-ink/[0.08]"
            >
              {CUISINES.map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-ink-mute">
              Course
            </span>
            <select
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              className="w-full rounded-2xl bg-white px-3 py-2.5 text-[14px] font-bold text-ink ring-1 ring-ink/[0.08]"
            >
              {COURSES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
        </div>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Kaipuli Gojju"
          className="mt-2 w-full rounded-2xl bg-white px-3.5 py-3 text-[15px] font-bold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
        />
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Note for the team — optional"
          className="mt-2 w-full rounded-2xl bg-ink/[0.02] px-3.5 py-2.5 text-[13px] font-semibold text-ink ring-1 ring-ink/[0.06] placeholder:font-normal placeholder:text-ink-mute"
        />

        <button
          type="button"
          onClick={add}
          disabled={saving || !tidyName(name)}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-plum-950 py-3 text-[15px] font-extrabold text-white transition active:scale-[0.99] disabled:opacity-40"
        >
          <Plus size={17} /> {saving ? 'Adding…' : 'Add to catalogue'}
        </button>
      </div>

      {/* ── What partners have asked for ───────────────────────────── */}
      {suggestions.length > 0 && (
        <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <p className="text-[15px] font-extrabold text-ink">
            Typed by partners <span className="text-ink-mute">({suggestions.length})</span>
          </p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
            What caterers wrote in the box on the dish screens. Every line is a
            gap in the list — add it above and it stops being one.
          </p>
          <div className="mt-2.5 space-y-1.5">
            {suggestions.slice(0, 20).map(sg => (
              <button
                key={sg.id}
                type="button"
                onClick={() => setName(sg.text.split(/[,\n]/)[0] ?? sg.text)}
                className="block w-full rounded-2xl bg-ink/[0.02] p-3 text-left ring-1 ring-ink/[0.05] transition active:bg-ink/[0.05]"
              >
                <span className="block text-[13px] font-semibold leading-snug text-ink">
                  {sg.text}
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-mute">
                  {sg.who} · on {sg.screen}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── What has been added ────────────────────────────────────── */}
      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] font-extrabold text-ink">
            Added so far <span className="text-ink-mute">({rows.length})</span>
          </p>
        </div>

        {rows.length > 6 && (
          <div className="relative mt-2.5">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search"
              className="w-full rounded-2xl bg-ink/[0.02] py-2.5 pl-9 pr-3 text-[13px] font-semibold text-ink ring-1 ring-ink/[0.06]"
            />
          </div>
        )}

        {loading ? (
          <p className="mt-3 text-[13px] text-ink-mute">Loading…</p>
        ) : !shown.length ? (
          <p className="mt-3 rounded-2xl bg-ink/[0.02] p-4 text-[13px] leading-relaxed text-ink-mute">
            Nothing added yet. The catalogue in source still has 840 dishes —
            this is only for what it turns out to be missing.
          </p>
        ) : (
          <div className="mt-2.5 space-y-1.5">
            {shown.map(r => (
              <div
                key={r.id}
                className={`flex items-start gap-2.5 rounded-2xl p-3 ring-1 ${
                  r.is_active ? 'bg-white ring-ink/[0.06]' : 'bg-ink/[0.02] ring-ink/[0.04] opacity-60'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-extrabold leading-snug text-ink">
                    {r.name}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-mute">
                    {r.cuisine_id} · {r.course_id}
                    {r.note ? ` · ${r.note}` : ''}
                    {!r.is_active ? ' · off' : ''}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => deactivate(r)}
                  title={r.is_active ? 'Stop offering this' : 'Offer it again'}
                  className="shrink-0 rounded-full bg-ink/[0.04] p-2 text-ink-soft transition active:bg-ink/[0.08]"
                >
                  {r.is_active ? <Trash2 size={14} /> : <Check size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-mute">
          Turning one off stops it being offered to anyone new. It is never
          deleted — listings reference dishes by name, and removing the row
          would leave partners claiming something the catalogue no longer has.
        </p>
      </div>
    </div>
  )
}
