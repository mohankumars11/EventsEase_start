import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { schemaFor } from '../../config/tradeProfileSchema'

/**
 * The partner's submitted onboarding form, rebuilt for review.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SUBMITTED DOCUMENT, NOT A COLUMN DUMP
 * ══════════════════════════════════════════════════════════════════════
 *
 * Section 9 asks for every question and its exact answer, in context.
 * So the screens come from the trade spec in their original order with
 * their original titles. A review that lists columns alphabetically is
 * a different document from the one the partner filled in, and an
 * operator comparing the two is doing the reconciliation by hand.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FOUR STATES, NOT TWO
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Blank" is not one fact. A question can be:
 *
 *   answered        a value is stored
 *   not asked       its showWhen rule did not fire, so the partner
 *                   never saw it — marking this "missing" would send a
 *                   revision request for something the form hid
 *   missing         required, shown, and left empty
 *   optional, empty shown, skipped, and that was allowed
 *
 * Completeness counts only questions that were actually asked, which
 * is why the rule is evaluated here rather than approximated.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TWO SOURCES, ALWAYS LABELLED
 * ══════════════════════════════════════════════════════════════════════
 *
 * A listing either has a typed profile row or it predates the current
 * questionnaire and only has `vendor_services.specs`. Both are shown,
 * and the header says which one is being read. Rendering a legacy
 * submission as though it were typed would make 22 partners look like
 * they answered nothing.
 */

const ACTIONS = [
  { id: 'approved', label: 'Approve', tone: 'bg-emerald-600 hover:bg-emerald-700', needsNote: false },
  { id: 'rejected', label: 'Reject', tone: 'bg-rose-600 hover:bg-rose-700', needsNote: true },
  { id: 'submitted', label: 'Request revision', tone: 'bg-amber-600 hover:bg-amber-700', needsNote: true },
]

/* Mirrors schema.js: showWhen is { q, in } | { q, includes } | { q, truthy } */
function wasAsked(col, answers) {
  const rule = col.showWhen
  if (!rule) return true
  const other = answers[rule.q]
  if (rule.truthy) return Boolean(other)
  if (rule.includes) return Array.isArray(other) && other.includes(rule.includes)
  if (rule.in) {
    const vals = Array.isArray(other) ? other : [other]
    return vals.some(v => rule.in.includes(slug(v)))
  }
  return true
}
const slug = v => String(v ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

const isEmpty = v => v === null || v === undefined || v === ''
  || (Array.isArray(v) && v.length === 0)

function Answer({ value, form }) {
  if (isEmpty(value)) return null
  if (Array.isArray(value)) {
    return (
      <span className="flex flex-wrap gap-1">
        {value.map((v, i) => (
          <span key={i} className="rounded-md bg-violet-50 px-2 py-0.5 text-[12px] font-semibold text-violet-800">{String(v)}</span>
        ))}
      </span>
    )
  }
  if (typeof value === 'boolean') {
    return <span className={`rounded-md px-2 py-0.5 text-[12px] font-bold ${value ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>{value ? 'Yes' : 'No'}</span>
  }
  if (form === 'money') {
    return <span className="text-[13px] font-semibold tabular-nums text-gray-900">₹{(Number(value) / 100).toLocaleString('en-IN')}</span>
  }
  if (typeof value === 'object') {
    return <span className="font-mono text-[12px] text-gray-700">{JSON.stringify(value)}</span>
  }
  return <span className="whitespace-pre-wrap text-[13px] text-gray-900">{String(value)}</span>
}

export default function OnboardingReview() {
  const [queue, setQueue] = useState(null)
  const [selected, setSelected] = useState(null)
  const [trades, setTrades] = useState([])
  const [profile, setProfile] = useState(null)
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => {
    let live = true
    supabase.from('sambramo_trade_registry').select('id, name').then(({ data }) => {
      if (live && data) setTrades(data)
    })
    return () => { live = false }
  }, [])

  const loadQueue = useCallback(async () => {
    setError(null)
    const { data, error: e } = await supabase
      .from('vendors')
      .select('id, business_name, partner_code, category, city, verification_status, submitted_at, review_due_at')
      .eq('is_synthetic', false)
      .in('verification_status', ['submitted', 'draft', 'approved'])
      .order('submitted_at', { ascending: true, nullsFirst: false })
      .limit(100)
    if (e) { setError(e.message); setQueue([]); return }
    setQueue(data ?? [])
  }, [])

  useEffect(() => { loadQueue() }, [loadQueue])

  const tradeId = useMemo(() => {
    if (!selected) return null
    const t = trades.find(x => x.name === selected.category)
    return t?.id ?? null
  }, [selected, trades])

  const schema = tradeId ? schemaFor(tradeId) : null

  const open = useCallback(async (vendor) => {
    setSelected(vendor); setProfile(null); setService(null); setNote(''); setDone(null); setError(null)
    setLoading(true)
    const t = trades.find(x => x.name === vendor.category)
    const sch = t ? schemaFor(t.id) : null

    /* The listing comes first: it carries the legacy blob and is the
       thing the typed row hangs off. */
    const svc = await supabase
      .from('vendor_services')
      .select('id, name, category, specs, review_status, created_at, updated_at')
      .eq('vendor_id', vendor.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!svc.error) setService(svc.data ?? null)

    if (sch) {
      const prof = await supabase
        .from(sch.table)
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!prof.error) setProfile(prof.data ?? null)
    }
    setLoading(false)
  }, [trades])

  /* One answer bag, keyed by the spec's field key, from whichever
     source exists. The typed row wins when both are present. */
  const answers = useMemo(() => {
    const out = {}
    if (schema && profile) {
      for (const c of schema.columns) {
        if (!isEmpty(profile[c.k])) out[c.key] = profile[c.k]
      }
    }
    const specs = service?.specs
    if (specs && typeof specs === 'object') {
      for (const [k, v] of Object.entries(specs)) {
        const base = k.includes(':') ? k.split(':').pop() : k
        if (out[base] === undefined && !isEmpty(v)) out[base] = v
      }
    }
    return out
  }, [schema, profile, service])

  const source = profile ? 'typed' : (service?.specs && Object.keys(service.specs).length ? 'legacy' : 'none')

  const audit = useMemo(() => {
    if (!schema) return null
    let asked = 0, answered = 0, missing = []
    for (const c of schema.columns) {
      if (!wasAsked(c, answers)) continue
      asked++
      const v = answers[c.key]
      if (!isEmpty(v)) { answered++; continue }
      if (c.req) missing.push(c)
    }
    const required = schema.columns.filter(c => c.req && wasAsked(c, answers))
    const requiredAnswered = required.filter(c => !isEmpty(answers[c.key])).length
    return {
      asked, answered, missing,
      required: required.length,
      requiredAnswered,
      pct: required.length ? Math.round((requiredAnswered / required.length) * 100) : 100,
    }
  }, [schema, answers])

  async function decide(action) {
    if (!selected) return
    if (action.needsNote && !note.trim()) { setError('A reason is required for this decision.'); return }
    setBusy(action.id); setError(null); setDone(null)
    const { error: e } = await supabase.rpc('set_vendor_verification', {
      p_vendor_id: selected.id,
      p_status: action.id,
      p_note: note.trim() || null,
    })
    setBusy(null)
    if (e) { setError(e.message); return }
    setDone(`${action.label} recorded for ${selected.business_name}.`)
    setNote('')
    loadQueue()
    setSelected(s => (s ? { ...s, verification_status: action.id } : s))
  }

  return (
    <div className="space-y-5 p-1">
      <header>
        <h2 className="text-[20px] font-bold text-gray-900">Onboarding review</h2>
        <p className="mt-1 text-[13px] text-gray-500">
          The form the partner submitted, in its own order, with every answer as stored.
        </p>
      </header>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-[13px] text-rose-900 ring-1 ring-rose-200">{error}</p>}
      {done && <p className="rounded-xl bg-emerald-50 p-3 text-[13px] text-emerald-900 ring-1 ring-emerald-200">{done}</p>}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl bg-white p-3 ring-1 ring-gray-200">
          <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Review queue {queue ? `(${queue.length})` : ''}
          </h3>
          {queue === null ? (
            <p className="px-1 py-3 text-[13px] text-gray-500">Loading…</p>
          ) : queue.length === 0 ? (
            <p className="px-1 py-3 text-[13px] text-gray-500">No real partners are waiting. Test partners are excluded.</p>
          ) : (
            <ul className="mt-2 max-h-[70vh] space-y-1 overflow-y-auto">
              {queue.map(v => (
                <li key={v.id}>
                  <button
                    type="button" onClick={() => open(v)}
                    className={`w-full rounded-xl px-2.5 py-2 text-left ring-1 transition ${selected?.id === v.id
                      ? 'bg-violet-50 ring-violet-300' : 'bg-white ring-transparent hover:bg-gray-50'}`}
                  >
                    <span className="block truncate text-[13px] font-bold text-gray-900">{v.business_name || 'Unnamed'}</span>
                    <span className="block truncate text-[11px] text-gray-500">{v.category || 'No trade'} · {v.city || '—'}</span>
                    <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold ${v.verification_status === 'approved'
                      ? 'bg-emerald-50 text-emerald-800'
                      : v.verification_status === 'submitted' ? 'bg-amber-50 text-amber-900' : 'bg-gray-100 text-gray-600'}`}
                    >{v.verification_status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="min-w-0 space-y-4">
          {!selected ? (
            <p className="rounded-2xl bg-white p-6 text-[13px] text-gray-500 ring-1 ring-gray-200">
              Pick a partner to see their submission.
            </p>
          ) : loading ? (
            <p className="rounded-2xl bg-white p-6 text-[13px] text-gray-500 ring-1 ring-gray-200">Loading submission…</p>
          ) : (
            <>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[17px] font-bold text-gray-900">{selected.business_name}</h3>
                    <p className="mt-0.5 text-[12px] text-gray-500">
                      {selected.partner_code || selected.id.slice(0, 8)} · {selected.category || 'No trade'} · {selected.city || '—'}
                    </p>
                  </div>
                  {audit && (
                    <div className="text-right">
                      <p className="text-[22px] font-black leading-none text-gray-900">{audit.pct}%</p>
                      <p className="text-[11px] text-gray-500">{audit.requiredAnswered} of {audit.required} required</p>
                    </div>
                  )}
                </div>

                <p className={`mt-3 rounded-xl p-2.5 text-[12px] ring-1 ${source === 'typed'
                  ? 'bg-emerald-50 text-emerald-900 ring-emerald-200'
                  : source === 'legacy' ? 'bg-amber-50 text-amber-900 ring-amber-200'
                    : 'bg-gray-50 text-gray-600 ring-gray-200'}`}
                >
                  {source === 'typed' && <>Read from the typed table <code>{schema?.table}</code>.</>}
                  {source === 'legacy' && <>No typed profile row. Read from <code>vendor_services.specs</code> — this submission predates the current questionnaire, so some answers may not match a question below.</>}
                  {source === 'none' && <>No onboarding answers are stored for this partner yet.</>}
                </p>

                {!schema && (
                  <p className="mt-2 rounded-xl bg-gray-50 p-2.5 text-[12px] text-gray-600 ring-1 ring-gray-200">
                    {selected.category === 'Anchor & MC'
                      ? 'Anchor & MC runs the legacy flow and has no spec questions. Review it in the Partner console.'
                      : 'No question spec is defined for this trade, so the form cannot be rebuilt.'}
                  </p>
                )}
              </div>

              {schema && schema.screens.map(screen => {
                const cols = schema.columns.filter(c => c.screen === screen.id)
                if (!cols.length) return null
                return (
                  <div key={screen.id} className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
                    <h4 className="text-[14px] font-bold text-gray-900">{screen.title}</h4>
                    {screen.sub && <p className="mt-0.5 text-[12px] text-gray-500">{screen.sub}</p>}
                    <dl className="mt-3 divide-y divide-gray-100">
                      {cols.map(c => {
                        const asked = wasAsked(c, answers)
                        const v = answers[c.key]
                        const empty = isEmpty(v)
                        return (
                          <div key={c.k} className="grid gap-1 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-4">
                            <dt className="text-[13px] text-gray-600">
                              {c.label}
                              {c.req && <span className="ml-1 text-rose-500" title="Required">*</span>}
                            </dt>
                            <dd>
                              {!asked ? (
                                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500"
                                  title={c.cond}>Not asked — {c.cond}</span>
                              ) : !empty ? (
                                <Answer value={v} form={c.form} />
                              ) : c.req ? (
                                <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">Required, not answered</span>
                              ) : (
                                <span className="text-[12px] italic text-gray-400">Skipped (optional)</span>
                              )}
                            </dd>
                          </div>
                        )
                      })}
                    </dl>
                  </div>
                )
              })}

              {audit && audit.missing.length > 0 && (
                <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-200">
                  <h4 className="text-[13px] font-bold text-rose-900">
                    {audit.missing.length} required answer{audit.missing.length === 1 ? '' : 's'} missing
                  </h4>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[12px] text-rose-900">
                    {audit.missing.map(c => <li key={c.k}>{c.label}</li>)}
                  </ul>
                </div>
              )}

              <div className="sticky bottom-0 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-gray-200">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Reason / note
                </label>
                <textarea
                  value={note} onChange={e => setNote(e.target.value)} rows={2}
                  placeholder="Required when rejecting or requesting a revision — the partner is told exactly this."
                  className="mt-1 w-full rounded-xl bg-gray-50 px-3 py-2 text-[13px] text-gray-900 ring-1 ring-gray-200 placeholder:text-gray-400"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {ACTIONS.map(a => (
                    <button
                      key={a.id} type="button" onClick={() => decide(a)} disabled={Boolean(busy)}
                      className={`rounded-xl px-4 py-2 text-[13px] font-bold text-white disabled:bg-gray-300 ${a.tone}`}
                    >{busy === a.id ? 'Saving…' : a.label}</button>
                  ))}
                  <span className="ml-auto text-[11px] text-gray-500">
                    Writes through <code>set_vendor_verification</code>; review state is separate from publication.
                  </span>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
