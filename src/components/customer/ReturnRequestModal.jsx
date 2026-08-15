import { useState, useMemo } from 'react'
import { X, AlertCircle, Camera, ShieldCheck } from 'lucide-react'
import { formatINR } from '../../utils/format'
import {
  RETURN_REASONS, RETURN_TERMS, POLICY_VERSION,
  returnEligibility, refundBreakdown, needsEvidence, ruleForCategory, describeWindow,
} from '../../config/policies'

/**
 * Raising a return, with the policy on screen rather than discovered afterwards.
 *
 * ── What this replaces ───────────────────────────────────────────────────
 * A generic reason-picker: five hard-coded strings, pick exactly one, type a
 * note, submit. It never showed the return window, never said what would be
 * refunded, never mentioned that a cake is not collected back, and recorded no
 * agreement to anything. The first time a customer learned any of it was when
 * a coordinator told them, one message at a time.
 *
 * ── Three things it now does ─────────────────────────────────────────────
 * 1. SHOWS THE RULES FIRST. The window for this specific order, the condition
 *    for each shelf in it, and what happens to the delivery fee. Rules a
 *    customer is told after they file are rules that read as excuses.
 *
 * 2. TAKES MORE THAN ONE REASON. "Damaged AND late" is an ordinary complaint,
 *    and forcing it into one bucket is how a delivery problem gets filed as a
 *    product problem and the pattern is never found.
 *
 * 3. RECORDS THE AGREEMENT, VERSIONED. `policy_version` and
 *    `terms_accepted_at` go on the row (migration 039), so a dispute months
 *    later can be answered with what was actually shown, and so the policy can
 *    be changed without silently rewriting what past customers agreed to.
 *
 * ── The refund figure is calculated, not promised loosely ────────────────
 * `refundBreakdown` applies the same rules the admin screen applies, so the
 * number quoted here is the number that will be sent. The delivery fee is
 * refunded when the fault is ours and withheld when it is not — stated up
 * front, with the reason, rather than becoming an argument at refund time.
 */

export default function ReturnRequestModal({ order, onSubmit, onClose }) {
  const [reasons, setReasons] = useState([])
  const [message, setMessage] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const eligibility = useMemo(() => returnEligibility(order), [order])
  const breakdown   = useMemo(() => refundBreakdown(order, reasons), [order, reasons])
  const wantsPhoto  = needsEvidence(reasons)

  const categories = useMemo(
    () => [...new Set((order.order_items ?? []).map(i => i.category).filter(Boolean))],
    [order],
  )

  function toggle(id) {
    setReasons(prev => (prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]))
    setError(null)
  }

  async function handleSubmit() {
    if (reasons.length === 0) { setError('Please tell us what went wrong — you can pick more than one.'); return }
    if (!accepted) { setError('Please confirm you have read the return terms.'); return }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        reasons,
        // The legacy single `reason` column is still read by Support and by
        // the customer's own order list, so it stays populated with the first
        // choice rather than being abandoned mid-migration.
        reason: RETURN_REASONS.find(r => r.id === reasons[0])?.label ?? reasons[0],
        comment: message.trim() || null,
        policy_version: POLICY_VERSION,
        terms_accepted_at: new Date().toISOString(),
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-end pb-bottom-nav sm:pb-0 sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-xl max-h-[94vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-bold text-gray-900">Request a return</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Order #{String(order.id).slice(0, 8).toUpperCase()} · {formatINR(order.total)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* ── The window, for THIS order ───────────────────────── */}
          <div
            className={`rounded-xl px-3.5 py-3 flex items-start gap-2.5 ${
              eligibility.eligible ? 'bg-green-50' : 'bg-amber-50'
            }`}
          >
            <ShieldCheck size={16} className={`shrink-0 mt-0.5 ${eligibility.eligible ? 'text-green-600' : 'text-amber-600'}`} />
            <div>
              <p className="text-xs font-semibold text-gray-900">{eligibility.message}</p>
              {categories.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {categories.map(c => {
                    const rule = ruleForCategory(c)
                    return (
                      <li key={c} className="text-[11px] text-gray-600">
                        <span className="font-semibold">{c}</span> — {rule.label}. {rule.condition}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* ── Reasons — more than one allowed ──────────────────── */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">What went wrong?</p>
            <p className="text-[11px] text-gray-500 mb-2">Tick everything that applies.</p>
            <div className="flex flex-wrap gap-2">
              {RETURN_REASONS.map(r => {
                const on = reasons.includes(r.id)
                return (
                  <button
                    key={r.id} type="button" onClick={() => toggle(r.id)} aria-pressed={on}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      on ? 'bg-plum-600 border-plum-600 text-ink' : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
                    }`}
                  >
                    {on ? '✓ ' : ''}{r.label}
                  </button>
                )
              })}
            </div>
          </div>

          {wantsPhoto && (
            <p className="flex items-start gap-2 text-[11px] rounded-lg bg-blue-50 px-3 py-2 text-blue-800">
              <Camera size={13} className="shrink-0 mt-0.5" />
              <span>
                A photo settles this the same day. Send one to us on WhatsApp right after you submit —
                without it we may have to ask, and that slows your refund down.
              </span>
            </p>
          )}

          {/* ── What comes back ─────────────────────────────────── */}
          {reasons.length > 0 && (
            <div className="rounded-xl bg-gray-50 px-3.5 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">
                What you would get back
              </p>
              <dl className="space-y-0.5 text-xs">
                <Line label="Items" value={formatINR(breakdown.goods)} />
                {breakdown.delivery > 0 && <Line label="Delivery" value={formatINR(breakdown.delivery)} />}
                {breakdown.deliveryWithheld > 0 && (
                  <Line label="Delivery (not refunded)" value={`− ${formatINR(breakdown.deliveryWithheld)}`} />
                )}
                <Line label="Refund" value={formatINR(breakdown.total)} bold />
              </dl>
              <p className="text-[11px] text-gray-500 mt-1.5">{breakdown.reason}</p>
              <p className="text-[11px] text-gray-500 mt-1">
                Subject to review — we will confirm the exact amount before sending it.
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
              Anything else we should know? <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <textarea
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder="When you opened it, what you saw…"
              className="w-full min-h-[70px] resize-none px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-plum-300"
            />
          </div>

          {/* ── The terms ───────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 p-3.5">
            <p className="text-xs font-bold text-gray-900">{RETURN_TERMS.heading}</p>
            <ul className="mt-2 space-y-1.5">
              {RETURN_TERMS.points.map((point, i) => (
                <li key={i} className="text-[11px] text-gray-600 flex gap-1.5">
                  <span className="text-gray-300 shrink-0">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <label className="flex items-start gap-2.5 mt-3 pt-3 border-t border-gray-100 cursor-pointer">
              <input
                type="checkbox" checked={accepted}
                onChange={e => { setAccepted(e.target.checked); setError(null) }}
                className="mt-0.5 w-4 h-4 accent-plum-600 shrink-0"
              />
              <span className="text-xs text-gray-700 font-medium">{RETURN_TERMS.confirm}</span>
            </label>
            <p className="text-[10px] text-gray-500 mt-1.5">
              We record which version of these terms you agreed to (v{POLICY_VERSION}), so this
              cannot change behind you.
            </p>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-xs text-red-600">
              <AlertCircle size={14} /> {error}
            </p>
          )}
        </div>

        <div className="px-6 pb-5 pt-1 flex gap-2 sticky bottom-0 bg-white border-t border-gray-100">
          <button
            onClick={handleSubmit}
            disabled={submitting || reasons.length === 0 || !accepted}
            className="flex-1 px-4 py-2.5 rounded-xl bg-plum-600 text-white text-sm font-semibold hover:bg-plum-700 disabled:opacity-40"
          >
            {submitting ? 'Sending…' : 'Submit the request'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:border-gray-300">
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}

function Line({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`tabular-nums ${bold ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{value}</dd>
    </div>
  )
}
