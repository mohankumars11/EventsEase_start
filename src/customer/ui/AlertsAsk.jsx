/**
 * "Keep your phone away — we’ll ping you" — the notifications ask. Laid out like the
 * big ride apps (Mohan, 2026-11-15), but in Sambramo's own words and with
 * its own bell — he asked that it not copy Uber's lines or icon — and in
 * the app's royal blue, the colour of every Book now (never black).
 *
 *   <AlertsAsk open place={{ lat, lng, area }} masters={[{ id, tradeId }]}
 *     onAllow={…} onLater={…} />
 *
 * A full screen: the live map on top (the customer's own pin and the
 * app's service figures — never a partner's place, see LiveMap), and a
 * white sheet rising over it with a temple bell, a big headline, one plain
 * sentence, a full-width dark Allow and a quiet Not now. The chevron on
 * the map closes it like Not now.
 */
import { createPortal } from 'react-dom'
import { ChevronDown, Loader2, ShieldCheck } from 'lucide-react'
import LiveMap from './LiveMap'

/* Sambramo's own bell: a brass temple ghanta — the bell that opens every
   Indian celebration — with a green "yes" seal, ringing out in two arcs.
   Not a generic notification bell (Mohan, 2026-11-15: "redesign it as per
   the uniqueness"). */
export function Bell({ className = '' }) {
  return (
    <svg viewBox="0 0 132 124" className={className} aria-hidden>
      <defs>
        <linearGradient id="sbm-brass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#C77D06" /><stop offset=".35" stopColor="#FFD56B" /><stop offset=".6" stopColor="#F2B02A" /><stop offset="1" stopColor="#B86A00" />
        </linearGradient>
        <linearGradient id="sbm-plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EEF4FF" /><stop offset="1" stopColor="#DCE8FF" /></linearGradient>
      </defs>
      <rect x="10" y="8" width="108" height="108" rx="32" fill="url(#sbm-plate)" />
      <g className="cx-ask-waves" fill="none" stroke="#2563EB" strokeLinecap="round" strokeWidth="4">
        <path d="M24 50a26 26 0 0 0 0 30" opacity=".55" /><path d="M16 42a38 38 0 0 0 0 46" opacity=".3" />
        <path d="M104 50a26 26 0 0 1 0 30" opacity=".55" /><path d="M112 42a38 38 0 0 1 0 46" opacity=".3" />
      </g>
      <g className="cx-ask-bell">
        <path d="M57 20h14v8H57z" fill="#B86A00" />
        <circle cx="64" cy="17" r="6" fill="none" stroke="#B86A00" strokeWidth="4" />
        <path d="M64 28c-13 0-20 9-21 22l-3 26c-1 6-6 10-11 13v4h70v-4c-5-3-10-7-11-13l-3-26c-1-13-8-22-21-22Z" fill="url(#sbm-brass)" />
        <path d="M44 46h40M42 62h44" stroke="#B86A00" strokeWidth="3" strokeLinecap="round" opacity=".7" />
        <path d="M51 34c-4 4-5 10-6 16" stroke="#FFF3C4" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".8" />
        <rect x="27" y="90" width="74" height="6" rx="3" fill="#B86A00" />
        <circle cx="64" cy="102" r="6.5" fill="#7A4300" />
      </g>
      <g>
        <circle cx="98" cy="26" r="15" fill="#16A34A" stroke="#FFFFFF" strokeWidth="4" />
        <path d="M91 26.5l4.6 4.6 9-9.4" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

export default function AlertsAsk({ open, place, masters = [], onAllow, onLater, title = 'Keep your phone away — we’ll ping you',
  body = 'The moment a master says yes, Sambramo pings you. On the day, you’ll know as each one heads your way. Only your bookings — never spam, and you can switch it off any time.',
  allowLabel = 'Yes, ping me', laterLabel = 'Maybe later', busy = false, note = null }) {
  /* laterLabel null: a confirmation, one button (alerts are already on). */
  if (!open) return null
  const mapH = Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.4)
  return createPortal(
    <div className="cx cx-ask-fade fixed inset-0 z-[430] flex flex-col overflow-hidden bg-white" role="dialog" aria-modal="true" aria-label={title} data-ask-alerts>
      <div className="relative shrink-0" style={{ height: mapH }}>
        <LiveMap full bare searching place={place} masters={masters} height={mapH + 30} />
        <button type="button" onClick={onLater} aria-label="Close" className="absolute left-4 grid h-12 w-12 place-items-center rounded-full bg-white text-[#0B0B14] shadow-[0_6px_16px_-6px_rgba(0,0,0,.4)]" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }} data-alerts-close>
          <ChevronDown size={24} strokeWidth={2.4} />
        </button>
        <span className="pointer-events-none absolute right-4 flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-bold text-[#0B0B14] shadow-[0_6px_16px_-6px_rgba(0,0,0,.4)]" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 14px)' }}>
          <ShieldCheck size={17} strokeWidth={2.4} className="fill-[#2F6BFF] text-white" />ID-verified
        </span>
      </div>
      <section className="cx-ask-rise relative -mt-5 flex min-h-0 flex-1 flex-col rounded-t-[24px] bg-white px-6 pt-7 shadow-[0_-12px_30px_-22px_rgba(0,0,0,.45)]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
        <Bell className="h-[112px] w-[119px] shrink-0 -ml-2" />
        <h2 className="mt-6 text-[34px] font-extrabold leading-[1.06] tracking-[-0.035em] text-[#0B0B14] [text-wrap:balance]">{title}</h2>
        <p className="mt-3 text-[15.5px] font-medium leading-[1.45] text-[#3A3A48]">{body}</p>
        <div className="mt-auto pt-6">
          {note && <p className="mb-2 text-center text-[12.5px] font-semibold text-[#6B6880]">{note}</p>}
          <button type="button" onClick={onAllow} disabled={busy}
            className="cx-solid flex h-[56px] w-full items-center justify-center gap-2 rounded-[16px] bg-gradient-to-b from-[#2563EB] to-[#0F4FC4] text-[17px] font-extrabold text-white shadow-[0_14px_26px_-14px_rgba(15,79,196,.9)] disabled:opacity-80" data-alerts-allow>
            {busy && <Loader2 size={18} className="animate-spin" />}{allowLabel}
          </button>
          {laterLabel && <button type="button" onClick={onLater} className="mt-1 flex h-[56px] w-full items-center justify-center rounded-[12px] text-[16px] font-bold text-[#0F4FC4]" data-alerts-later>{laterLabel}</button>}
        </div>
      </section>
    </div>,
    document.body,
  )
}
