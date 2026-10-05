import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Clock3, Eye, RefreshCw, Send, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const money = n => n == null ? '—' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })

export default function PricingReviewQueue() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState({})
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [tp, cp] = await Promise.all([
        supabase.from('sambramo_trade_packages')
          .select('id,vendor_id,vendor_service_id,parent_package_id,name,description,commercial_inputs,status,revision_round,submitted_at,review_note')
          .in('status', ['UNDER_REVIEW','ACTION_REQUIRED'])
          .order('submitted_at', { ascending: true }),
        supabase.from('sambramo_catering_packages')
          .select('id,vendor_id,vendor_service_id,parent_package_id,name,notes,status,submitted_at')
          .in('status', ['UNDER_REVIEW','ACTION_REQUIRED'])
          .order('submitted_at', { ascending: true }),
      ])
      if (tp.error) throw tp.error
      if (cp.error) throw cp.error

      const trade = tp.data ?? []
      const catering = cp.data ?? []
      const serviceIds = [...new Set([...trade, ...catering].map(x => x.vendor_service_id).filter(Boolean))]
      const vendorIds = [...new Set([...trade, ...catering].map(x => x.vendor_id).filter(Boolean))]
      const packageIds = trade.map(x => String(x.id))
      const cateringIds = catering.map(x => x.id)

      const [services, vendors, prices, cateringRates] = await Promise.all([
        serviceIds.length ? supabase.from('vendor_services').select('id,vendor_id,name,category').in('id', serviceIds) : { data: [] },
        vendorIds.length ? supabase.from('vendors').select('id,business_name,city,is_verified').in('id', vendorIds) : { data: [] },
        packageIds.length ? supabase.from('sambramo_partner_price_books').select('offering_id,rate_paise,unit,status,version').in('offering_id', packageIds).order('version', { ascending: false }) : { data: [] },
        cateringIds.length ? supabase.from('sambramo_catering_price_versions').select('package_id,supply_rate_paise,unit,min_guests,max_guests,version,status').in('package_id', cateringIds).order('version', { ascending: false }) : { data: [] },
      ])

      const serviceById = Object.fromEntries((services.data ?? []).map(x => [x.id, x]))
      const vendorById = Object.fromEntries((vendors.data ?? []).map(x => [x.id, x]))
      const priceByPackage = {}
      for (const p of (prices.data ?? [])) if (!priceByPackage[p.offering_id]) priceByPackage[p.offering_id] = p
      const cateringPriceByPackage = {}
      for (const p of (cateringRates.data ?? [])) if (!cateringPriceByPackage[p.package_id]) cateringPriceByPackage[p.package_id] = p

      setRows([
        ...trade.map(p => ({ ...p, type: 'trade', service: serviceById[p.vendor_service_id], vendor: vendorById[p.vendor_id], price: priceByPackage[String(p.id)] })),
        ...catering.map(p => ({ ...p, type: 'catering', service: serviceById[p.vendor_service_id], vendor: vendorById[p.vendor_id], price: cateringPriceByPackage[p.id] })),
      ])
    } catch (e) {
      setError(e?.message ?? 'Could not load pricing review queue.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function decide(row, decision) {
    setBusy(row.type + ':' + row.id + ':' + decision); setError('')
    try {
      const { data, error: err } = await supabase.rpc('review_sambramo_pricing_revision', {
        p_package_type: row.type,
        p_package_id: row.id,
        p_decision: decision,
        p_note: note[row.type + ':' + row.id] || null,
      })
      if (err) throw err
      if (data?.ok === false) throw new Error('The pricing decision was not applied.')
      await load()
    } catch (e) {
      setError(e?.message ?? 'Could not update the pricing revision.')
    } finally { setBusy('') }
  }

  const count = rows.length
  if (loading) return <div className="rounded-[24px] bg-white p-12 text-center text-[13px] text-ink-mute"><RefreshCw size={20} className="mx-auto animate-spin text-plum-700" /><p className="mt-2">Loading pricing review queue…</p></div>

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div><h1 className="text-[22px] font-extrabold text-ink">Pricing review</h1><p className="mt-1 text-[12.5px] leading-relaxed text-ink-mute">Live customer pricing stays unchanged until a new revision is approved here.</p></div>
        <button type="button" onClick={load} disabled={loading} className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[12px] font-extrabold text-ink-soft ring-1 ring-ink/[0.08]"><RefreshCw size={13} /> Refresh</button>
      </header>

      {error && <p className="rounded-2xl bg-rose-50 px-3.5 py-3 text-[12px] font-bold text-rose-700">{error}</p>}
      {!count ? (
        <div className="rounded-[24px] bg-forest-50 p-10 text-center ring-1 ring-forest-200"><Check size={28} className="mx-auto text-forest-700" /><p className="mt-2 text-[14px] font-extrabold text-forest-900">No pricing revisions waiting</p><p className="mt-1 text-[12px] text-forest-800">Every submitted pricing revision has a decision.</p></div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl bg-plum-950 p-4 text-white"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-plum-300">Queue</p><p className="mt-1 text-[22px] font-black">{count} revision{count === 1 ? '' : 's'} waiting</p><p className="mt-1 text-[11.5px] leading-relaxed text-white/70">Approve only when the proposed scope and commercial rate are correct. The current live package remains protected until then.</p></div>
          {rows.map(row => {
            const key = row.type + ':' + row.id
            const proposed = row.type === 'trade' ? (Number(row.price?.rate_paise || 0) / 100) : (Number(row.price?.supply_rate_paise || 0) / 100)
            return (
              <article key={key} className="rounded-[24px] bg-white p-4 ring-1 ring-ink/[0.07]">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-plum-50 text-plum-700"><ShieldCheck size={19} /></span>
                  <div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-plum-600">{row.type === 'catering' ? 'Catering' : 'Trade'} pricing revision</p><h2 className="mt-1 text-[16px] font-extrabold text-ink">{row.name}</h2><p className="mt-0.5 text-[11.5px] text-ink-mute">{row.vendor?.business_name || 'Partner'} · {row.service?.category || row.service?.name || 'Service'}{row.vendor?.city ? ' · ' + row.vendor.city : ''}</p></div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-800">{row.status.replaceAll('_',' ')}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-surface p-3"><p className="text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">Revision</p><p className="mt-1 text-[13px] font-black text-ink">{row.revision_round ? 'v' + row.revision_round : 'New package'}</p><p className="mt-0.5 text-[10.5px] text-ink-mute">{row.parent_package_id ? 'Replaces an existing live package after approval' : 'First pricing version'}</p></div>
                  <div className="rounded-2xl bg-surface p-3"><p className="text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">Proposed price</p><p className="mt-1 text-[18px] font-black text-plum-700">{proposed > 0 ? money(proposed) : 'Quote lane'}</p><p className="mt-0.5 text-[10.5px] text-ink-mute">{row.price?.unit || 'Customer price calculated at request time'}</p></div>
                </div>

                <div className="mt-3 rounded-2xl bg-plum-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wide text-plum-700">Customer impact</p><p className="mt-1 text-[11.5px] leading-relaxed text-plum-950">The current live package remains unchanged while this revision is under review. Approving will make this revision customer-live and archive the previous live version.</p></div>

                <textarea value={note[key] || ''} onChange={e => setNote(n => ({ ...n, [key]: e.target.value }))} rows={2} placeholder="Optional review note" className="mt-3 w-full resize-none rounded-2xl bg-surface px-3.5 py-3 text-[12px] font-semibold text-ink ring-1 ring-ink/[0.08] outline-none focus:ring-2 focus:ring-plum-500" />

                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={!!busy} onClick={() => decide(row,'request_changes')} className="flex-1 rounded-2xl bg-white py-3 text-[12px] font-extrabold text-rose-700 ring-1 ring-rose-200 disabled:opacity-50">{busy === key + ':request_changes' ? 'Sending…' : 'Request changes'}</button>
                  <button type="button" disabled={!!busy} onClick={() => decide(row,'approve')} className="flex-[1.2] rounded-2xl bg-forest-600 py-3 text-[12px] font-extrabold text-white disabled:opacity-50">{busy === key + ':approve' ? 'Approving…' : 'Approve revision'}</button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
