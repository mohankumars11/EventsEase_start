/**
 * Anchor & MC partners with a live, approved listing — nearest first.
 * Prices shown are each partner's published "from" price, as charged.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, MapPin, Star, Languages, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { rupees } from '../../lib/tierPackages'

export default function AnchorBrowse() {
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const load = async pos => {
      const { data, error: err } = await supabase.rpc('anchor_public_listings', {
        p_trade: 'Anchor & MC', p_lat: pos?.lat ?? null, p_lng: pos?.lng ?? null, p_limit: 40,
      })
      if (!alive) return
      if (err) setError(err.message); else setRows(data ?? [])
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => load({ lat: p.coords.latitude, lng: p.coords.longitude }), () => load(null), { timeout: 6000 })
    } else load(null)
    return () => { alive = false }
  }, [])

  return (
    <div className="min-h-screen bg-[#fbfaff]">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-white/90 px-3 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top,0px))] backdrop-blur-xl ring-1 ring-ink/[0.05]">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full text-ink/70"><ArrowLeft size={20} /></button>
        <p className="text-[16px] font-extrabold text-ink">Anchors & MCs</p>
      </header>
      <div className="mx-auto max-w-lg space-y-3 px-4 py-4">
        <p className="text-[13px] text-ink/60">Book instantly at the price you see. Bigger or unusual events get a custom quote.</p>
        {error && <p className="rounded-2xl bg-rose-50 p-3 text-[12.5px] font-bold text-rose-700">{error}</p>}
        {!rows && !error && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-plum-600" /></div>}
        {rows?.length === 0 && <p className="rounded-2xl bg-white p-5 text-center text-[13px] text-ink/60 ring-1 ring-ink/[0.07]">No anchors are live near you yet.</p>}
        {rows?.map(r => (
          <button key={r.vendor_service_id} type="button" onClick={() => navigate(`/book/anchor/${r.vendor_service_id}`)}
            className="flex w-full items-center gap-3 rounded-[22px] bg-white p-3.5 text-left ring-1 ring-ink/[0.07] active:scale-[0.99]">
            <span className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-plum-100">
              {r.avatar_url ? <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
                : <span className="flex h-full w-full items-center justify-center text-[17px] font-extrabold text-plum-700">{(r.stage_name ?? '?').slice(0, 2).toUpperCase()}</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-extrabold text-ink">{r.stage_name}</span>
              {r.tagline && <span className="block truncate text-[12px] text-ink/55">{r.tagline}</span>}
              <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] font-bold text-ink/55">
                {r.rating ? <span className="flex items-center gap-0.5 text-amber-600"><Star size={11} fill="currentColor" />{Number(r.rating).toFixed(1)}</span> : null}
                {r.distance_km != null && <span className="flex items-center gap-0.5"><MapPin size={11} />{r.distance_km} km</span>}
                {r.languages?.length ? <span className="flex items-center gap-0.5"><Languages size={11} />{r.languages.map(l => l.name).slice(0, 3).join(', ')}</span> : null}
              </span>
            </span>
            <span className="text-right">
              <span className="block text-[10.5px] font-bold text-ink/45">from</span>
              <span className="block text-[15px] font-extrabold text-ink">{rupees(r.from_paise)}</span>
            </span>
            <ChevronRight size={17} className="text-ink/30" />
          </button>
        ))}
      </div>
    </div>
  )
}
