import { useState } from 'react'
import { CheckCircle2, Loader2, MapPin, Sparkles, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import BookingSheet from './BookingSheet'

export default function SambramoCustomQuoteSheet({
  open,
  onClose,
  onSubmitted,
  tradeId,
  tradeName,
  serviceName,
  guestCount,
  summary = [],
}) {
  const navigate = useNavigate()
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(null)
  if (!open) return null

  async function submit(details) {
    setSending(true)
    setDone(null)
    try {
      const session = await supabase.auth.getSession()
      const token = session?.data?.session?.access_token
      const result = await apiFetch('/api/create-custom-quote', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({
          tradeId,
          tradeName,
          serviceName,
          eventDate: details.date,
          startTime: details.time || null,
          endTime: null,
          guestCount: details.guestCount || guestCount || 1,
          timeNote: details.slot || null,
          radiusKm: 40,
          location: details.location,
          notes: details.notes,
          summary: summary.join(' · '),
          demand: {
            serviceName,
            guestCount: details.guestCount || guestCount || 1,
            slot: details.slot || null,
            address: details.address || null,
            customerNotes: details.notes || null,
            selections: summary,
          },
        }),
      })

      if (!result.ok) throw new Error(result.error)
      const body = result.body ?? {}
      setDone(body)
      onSubmitted?.(body)
    } catch (e) {
      setDone({ error: e.message || 'Could not create the custom quote request.' })
    } finally {
      setSending(false)
    }
  }

  if (done && !done.error) {
    return (
      <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/55 px-4">
        <section className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
            <CheckCircle2 size={28} />
          </div>
          <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-plum-600">Sambramo is on it</p>
          <h2 className="mt-1 text-[23px] font-extrabold leading-tight text-ink">Your requirement is now with the right partners.</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-mute">
            Quotes will arrive inside Sambramo. You do not need to contact vendors separately.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Fact label="Partners contacted" value={String(done.partnersContacted ?? 0)} />
            <Fact label="Quote window" value="Up to 24h" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4"><button type="button" onClick={onClose} className="rounded-2xl bg-surface py-3 text-[12.5px] font-extrabold text-ink-soft ring-1 ring-hairline/10">Back to service</button><button type="button" onClick={() => navigate('/dashboard/customer/requests')} className="rounded-2xl bg-saffron-400 py-3 text-[12.5px] font-extrabold text-plum-950">See my quotes</button></div>
        </section>
      </div>
    )
  }

  if (done?.error) {
    return (
      <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/55 px-4">
        <section className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl">
          <button type="button" onClick={onClose} className="float-right p-1 text-ink-mute" aria-label="Close"><X size={18} /></button>
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-rose-600">Could not send</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{done.error}</p>
          <button type="button" onClick={() => setDone(null)} className="mt-4 w-full rounded-2xl bg-saffron-400 py-3 text-[13px] font-extrabold text-plum-950">Try again</button>
        </section>
      </div>
    )
  }

  return (
    <>
      <BookingSheet
          title={'Make it custom · ' + serviceName}
          subtitle={tradeName + ' · Sambramo handles the quote'}
          guestCount={guestCount}
          onClose={onClose}
          defaults={{}}
          confirmLabel={sending ? 'Sending to Sambramo…' : 'Send custom request'}
          onConfirm={submit}
        />
        {sending && <div className="fixed bottom-5 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-full bg-plum-950 px-4 py-2.5 text-[11px] font-extrabold text-white shadow-xl"><Loader2 size={14} className="animate-spin" /> Finding eligible Sambramo partners</div>}
    </>
  )
}

function Fact({ label, value }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <p className="text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</p>
      <p className="mt-1 text-[14px] font-extrabold text-ink">{value}</p>
    </div>
  )
}
