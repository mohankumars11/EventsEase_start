import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function PartnerScreenHeader({ title, subtitle = null, onAction = null, actionLabel = null, back = false, onBack = null }) {
  const navigate = useNavigate()
  return (
    <header className="partner-mobile sticky top-0 z-30 border-b border-ink/[0.08] bg-white/96 backdrop-blur">
      <div className="mx-auto flex min-h-[56px] w-full max-w-[520px] items-center gap-3 px-4">
        {back && (
          <button
            type="button"
            onClick={() => (onBack ? onBack() : navigate(-1))
            aria-label="Go back"
            className="sp-touch grid shrink-0 place-items-center rounded-full text-ink-soft active:bg-ink/[0.04]"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-black tracking-[-0.03em] text-ink">{title}</h1>
          {subtitle && <p className="truncate text-[11px] font-semibold text-ink-mute">{subtitle}</p>}
        </div>
        {onAction && actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="min-h-[40px] shrink-0 rounded-full bg-plum-50 px-3.5 text-[11.5px] font-extrabold text-plum-700 ring-1 ring-plum-100 active:scale-[0.98]"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </header>
  )
}
