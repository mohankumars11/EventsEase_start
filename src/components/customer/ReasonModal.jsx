import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'

/**
 * One modal for cancel / return / complaint — all "pick a reason
 * (optional) + write a message" forms.
 *
 * title, itemLabel, reasons?: string[], messageRequired?: boolean,
 * messagePlaceholder?, submitLabel, onSubmit({ reason, message }), onClose
 */
export default function ReasonModal({
  title, itemLabel, reasons, messageRequired = false,
  messagePlaceholder = 'Tell us more…', submitLabel = 'Submit',
  onSubmit, onClose,
}) {
  const [reason, setReason] = useState(reasons?.[0] ?? '')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit() {
    if (reasons && !reason) { setError('Please pick a reason.'); return }
    if (messageRequired && !message.trim()) { setError('Please add a few details.'); return }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ reason, message: message.trim() })
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            {itemLabel && <p className="text-xs text-gray-400 mt-0.5">{itemLabel}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {reasons && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Reason</p>
              <div className="flex flex-wrap gap-2">
                {reasons.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      reason === r
                        ? 'bg-plum-600 border-plum-600 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              {messageRequired ? 'What happened?' : 'Additional details (optional)'}
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full min-h-[90px] resize-none px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-plum-300"
              placeholder={messagePlaceholder}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-plum-700 text-white font-bold hover:bg-plum-800 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
