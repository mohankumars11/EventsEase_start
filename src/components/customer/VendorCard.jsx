import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Star, MapPin } from 'lucide-react'
import { formatINRRange } from '../../utils/format'

export default function VendorCard({ vendor }) {
  const navigate = useNavigate()
  const coverPhoto =
    vendor.vendor_photos?.find(p => p.is_cover)?.photo_url ??
    vendor.vendor_photos?.[0]?.photo_url

  return (
    <div
      onClick={() => navigate(`/dashboard/customer/vendors/${vendor.id}`)}
      className="card cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden"
    >
      {/* Cover photo */}
      <div className="h-44 bg-gradient-to-br from-marigold-100 to-orange-100 overflow-hidden relative">
        {coverPhoto ? (
          <img src={coverPhoto} alt={vendor.business_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-40 text-5xl select-none">
            🏪
          </div>
        )}
        {vendor.is_featured && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-marigold-500 text-white text-xs font-bold rounded-full shadow">
            ★ Featured
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">
            {vendor.business_name}
          </h3>
          {vendor.is_verified && (
            <span className="flex items-center gap-0.5 text-xs text-blue-600 font-semibold shrink-0">
              <ShieldCheck size={13} /> Verified
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 mb-1">{vendor.category || '—'}</p>

        {(vendor.city || vendor.area) && (
          <p className="flex items-center gap-1 text-xs text-gray-400 mb-3">
            <MapPin size={11} />
            {[vendor.area, vendor.city].filter(Boolean).join(', ')}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-marigold-700">
            {formatINRRange(vendor.price_range_min, vendor.price_range_max)}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-600">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            {vendor.rating_avg > 0 ? Number(vendor.rating_avg).toFixed(1) : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
