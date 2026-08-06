import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, ShieldCheck, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINRRange, formatDate } from '../../utils/format'
import { StarDisplay } from '../../components/customer/StarRating'
import CustomerLayout from '../../components/customer/CustomerLayout'

export default function VendorProfile() {
  const { vendorId } = useParams()
  const navigate = useNavigate()
  const [vendor, setVendor]         = useState(null)
  const [photos, setPhotos]         = useState([])
  const [reviews, setReviews]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)

  useEffect(() => { fetchAll() }, [vendorId])

  async function fetchAll() {
    const [vRes, pRes, rRes] = await Promise.all([
      supabase.from('vendors').select('*').eq('id', vendorId).single(),
      supabase.from('vendor_photos').select('*').eq('vendor_id', vendorId).order('is_cover', { ascending: false }),
      supabase.from('reviews').select('*').eq('vendor_id', vendorId).order('created_at', { ascending: false }),
    ])
    setVendor(vRes.data)
    setPhotos(pRes.data ?? [])
    setReviews(rRes.data ?? [])
    setLoading(false)
  }

  if (loading) return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 animate-pulse space-y-4 pb-40">
        <div className="h-72 bg-gray-200 rounded-2xl" />
        <div className="h-6 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-32 bg-gray-100 rounded-2xl" />
      </div>
    </CustomerLayout>
  )

  if (!vendor) return (
    <CustomerLayout>
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Vendor not found.</p>
        <button onClick={() => navigate(-1)} className="btn-secondary">Go back</button>
      </div>
    </CustomerLayout>
  )

  const currentPhoto = photos[activePhoto]?.photo_url

  return (
    <CustomerLayout>
      {/* Extra bottom padding: clears mobile bottom nav (64px) + sticky quote bar (~80px) */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-48 md:pb-28">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} /> Back to results
        </button>

        {/* ── Photo gallery ─────────────────────────────── */}
        <div className="space-y-2">
          <div className="relative h-64 sm:h-80 bg-gradient-to-br from-marigold-100 to-orange-100 rounded-2xl overflow-hidden">
            {currentPhoto ? (
              <img src={currentPhoto} alt="Vendor photo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl opacity-20 select-none">🏪</div>
            )}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setActivePhoto(p => Math.max(0, p - 1))}
                  disabled={activePhoto === 0}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow hover:bg-white disabled:opacity-30 transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setActivePhoto(p => Math.min(photos.length - 1, p + 1))}
                  disabled={activePhoto === photos.length - 1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow hover:bg-white disabled:opacity-30 transition"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
            {/* Dot indicators */}
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === activePhoto ? 'bg-white w-4' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setActivePhoto(i)}
                  className={`h-16 w-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                    i === activePhoto ? 'border-marigold-500 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Vendor info card ──────────────────────────── */}
        <div className="card p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-snug">{vendor.business_name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{vendor.category}</p>
            </div>
            <div className="flex flex-col gap-1.5 items-end shrink-0">
              {vendor.is_featured && (
                <span className="px-2 py-0.5 bg-marigold-100 text-marigold-700 text-xs font-bold rounded-full">
                  ★ Featured
                </span>
              )}
              {vendor.is_verified && (
                <span className="flex items-center gap-0.5 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                  <ShieldCheck size={11} /> Verified
                </span>
              )}
            </div>
          </div>

          {(vendor.city || vendor.area) && (
            <p className="flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin size={14} className="text-marigold-400 shrink-0" />
              {[vendor.area, vendor.city].filter(Boolean).join(', ')}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-6 pt-1 border-t border-gray-50">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Price range</p>
              <p className="text-lg font-bold text-marigold-700">
                {formatINRRange(vendor.price_range_min, vendor.price_range_max)}
              </p>
            </div>
            {vendor.rating_avg > 0 && (
              <div className="border-l border-gray-100 pl-6">
                <p className="text-xs text-gray-400 mb-1">Rating</p>
                <div className="flex items-center gap-2">
                  <StarDisplay rating={vendor.rating_avg} size={16} />
                  <span className="font-bold text-gray-700">{Number(vendor.rating_avg).toFixed(1)}</span>
                  <span className="text-xs text-gray-400">({reviews.length} reviews)</span>
                </div>
              </div>
            )}
          </div>

          {vendor.description && (
            <div className="pt-2 border-t border-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-1.5">About</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{vendor.description}</p>
            </div>
          )}
        </div>

        {/* ── Reviews ───────────────────────────────────── */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">
            Customer Reviews
            {reviews.length > 0 && (
              <span className="text-gray-400 font-normal text-sm ml-2">({reviews.length})</span>
            )}
          </h2>

          {reviews.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">
              <Star size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No reviews yet — be the first to book and review!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map(review => (
                <div key={review.id} className="card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <StarDisplay rating={review.rating} size={15} />
                    <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                  )}
                  <p className="text-xs text-gray-400">Verified customer</p>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* ── Sticky Request Quote button ───────────────── */}
      {/* Sits above mobile bottom nav (bottom-16 = 64px) */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-orange-100 p-4 z-30">
        <div className="max-w-3xl mx-auto flex gap-3 items-center">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 truncate">{vendor.business_name}</p>
            <p className="text-sm font-bold text-marigold-700 truncate">
              {formatINRRange(vendor.price_range_min, vendor.price_range_max)}
            </p>
          </div>
          <button
            onClick={() => navigate(`/dashboard/customer/vendors/${vendorId}/quote`)}
            className="btn-primary px-7 py-3 text-base shadow-lg shadow-marigold-200 shrink-0"
          >
            Request Quote
          </button>
        </div>
      </div>

    </CustomerLayout>
  )
}
