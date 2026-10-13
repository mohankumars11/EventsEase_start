import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Heart, Share2, ShieldCheck } from 'lucide-react'
import AnchorProfileCard from '../../customer/AnchorProfileCard'
import PartnerAvatarInput from '../PartnerAvatarInput'
import { fetchWork, signedUrlsFor } from '../../../lib/partnerWork'

/**
 * Full-screen, edge-to-edge partner preview for Anchor & MC.
 * The page is intentionally reused from the customer profile card so the
 * partner sees the actual mobile customer layout, not a drawer approximation.
 */
export default function AnchorCustomerPreviewScreen({
  vendor, profile = {}, city, rating, reviewCount = 0, verified = false,
  packages = [], pricingModels = [], extras = [], bookingDetails = [],
  instantBookEnabled = true, isLive = false, onClose, onPick,
}) {
  const [favorite, setFavorite] = useState(false)
  const [bookingNote, setBookingNote] = useState(false)
  const [mediaState, setMediaState] = useState({ loading: true, rows: [], unavailable: false })
  useEffect(() => {
    let alive = true
    async function load() {
      if (!vendor?.id) {
        setMediaState({ loading: false, rows: [], unavailable: false })
        return
      }
      setMediaState(s => ({ ...s, loading: true }))
      try {
        const result = await fetchWork(vendor.id)
        const sourceRows = (result.rows ?? []).filter(row => ['photo', 'video'].includes(row.kind))
        const rows = isLive
          ? sourceRows.filter(row => row.review_status === 'live')
          : sourceRows
        const urls = await signedUrlsFor(rows.map(row => row.storage_path), 600)
        if (alive) setMediaState({
          loading: false,
          unavailable: !!result.unavailable,
          rows: rows.map(row => ({ ...row, url: urls[row.storage_path] || '' })).filter(row => row.url),
        })
      } catch {
        if (alive) setMediaState({ loading: false, rows: [], unavailable: false })
      }
    }
    load()
    return () => { alive = false }
  }, [vendor?.id, isLive])

  const avatarName = profile?.business_name || profile?.stage_name || profile?.name || vendor?.business_name || 'Your Anchor & MC profile'
  const instant = instantBookEnabled === true || instantBookEnabled === 'true'
  const media = mediaState.rows
  const cardProfile = useMemo(() => ({ ...profile }), [profile])

  async function sharePreview() {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: avatarName + ' · Anchor & MC', text: 'Preview this Anchor & MC profile', url: window.location.href })
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href)
      }
    } catch {
      // The user dismissed the native share sheet; no action is needed.
    }
  }

  return (
    <div className="fixed inset-0 z-[220] flex flex-col bg-[#f7fbff] text-[#102250]"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="dialog" aria-modal="true" aria-label="Full-screen customer preview">
      <header className="z-20 flex h-[50px] shrink-0 items-center gap-2 border-b border-[#e4edf9] bg-white/95 px-3 backdrop-blur">
        <button type="button" onClick={onClose} aria-label="Close customer preview" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eff6ff] text-[#16356b]"><ArrowLeft size={19} /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-black text-[#102250]">Customer preview</p>
          <p className="text-[9px] font-semibold text-[#657897]">Anchor & MC · mobile storefront</p>
        </div>
        <button type="button" onClick={sharePreview} aria-label="Share preview" className="grid h-9 w-9 place-items-center rounded-full bg-[#eff6ff] text-[#16356b]"><Share2 size={17} /></button>
        <button type="button" onClick={() => setFavorite(v => !v)} aria-label={favorite ? 'Remove preview from favourites' : 'Add preview to favourites'} aria-pressed={favorite} className={`grid h-9 w-9 place-items-center rounded-full ${favorite ? 'bg-rose-50 text-rose-600' : 'bg-[#eff6ff] text-[#16356b]'}`}><Heart size={17} fill={favorite ? 'currentColor' : 'none'} /></button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
        {!isLive && <div className="mx-3 mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold leading-snug text-amber-900"><ShieldCheck size={13} className="mt-0.5 shrink-0" /><span>Preview of your saved listing. Items awaiting approval are clearly marked and are not shown on the live customer listing.</span></div>}
        {mediaState.loading && <div className="mx-3 mt-2 h-1 overflow-hidden rounded-full bg-[#e5effb]"><div className="h-full w-1/2 animate-pulse rounded-full bg-[#2586ef]" /></div>}
        <AnchorProfileCard
          profile={cardProfile}
          city={city}
          rating={rating}
          reviewCount={reviewCount}
          verified={verified}
          packages={packages}
          media={media}
          pricingModels={pricingModels}
          extras={extras}
          bookingDetails={bookingDetails}
          avatarSlot={<PartnerAvatarInput vendor={vendor} draft={{ profile: cardProfile }} businessName={avatarName} editable variant="marketplace" />}
          onPick={onPick}
          instantBookEnabled={instant}
        />
        {mediaState.unavailable && !media.length && <p className="mx-4 mt-2 text-[10px] text-[#647693]">Portfolio storage is not available in this environment yet.</p>}
      </main>

      <footer className="z-20 shrink-0 border-t border-[#e4ecfa] bg-white/95 px-3 pb-2 pt-2 shadow-[0_-5px_20px_rgba(26,75,140,.08)] backdrop-blur">
        <button type="button" onClick={() => setBookingNote(true)}
          className={`flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[17px] px-4 text-center text-[13px] font-black text-white shadow-lg ${instant ? 'bg-gradient-to-r from-[#4935dc] to-[#7134ed]' : 'bg-gradient-to-r from-[#287be9] to-[#1557cc]'}`}>
          <span>{instant ? 'Instant Book & Pay' : 'Check availability & request quote'}</span><span aria-hidden="true">→</span>
        </button>
        <p className="mt-1.5 text-center text-[9px] font-medium text-[#657594]" role={bookingNote ? "status" : undefined}>{bookingNote ? "Preview only: availability and the final payable amount are confirmed in the customer booking flow." : "Preview only · secure payment and booking confirmation happen in the customer flow."}</p>
      </footer>
    </div>
  )
}
