/**
 * The cap sheet, and the submitted card's continuation offer.
 * `?view=cap` or `?view=submitted`.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import SubmittedCard from '../../src/components/partner/SubmittedCard'
import { capMessage, MAX_TRADES } from '../../src/config/listingCap'
import SambramoTradePictogram from '../../src/components/vendor/SambramoTradePictogram'

try { localStorage.setItem('sb_partner_trade_queue_v1', JSON.stringify(['Photography', 'Videography', 'Decoration & Floral'])) } catch {}

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  if (u.includes('sambramo_listing_versions')) {
    return new Response(JSON.stringify([{ id: 'ver1', vendor_service_id: 's1', status: 'UNDER_REVIEW' }]),
      { status: 200, headers: { 'content-type': 'application/json' } })
  }
  if (u.includes('/rest/v1/')) return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
  return real(input, init)
}

const msg = capMessage(3)

export default function Scene() {
  const view = new URLSearchParams(window.location.search).get('view') || 'cap'
  return (
    <MemoryRouter initialEntries={['/dashboard/vendor?tab=offers&submitted=Photography&version=ver1']}>
      <AuthProvider><ToastProvider>
        <div style={{ maxWidth: 420, margin: '0 auto', padding: 12, background: '#f6f5fa' }}>
          {view === 'submitted'
            ? <SubmittedCard vendorId="v1" services={[{ id: 's1', category: 'Photography' }]} reviewShownElsewhere />
            : (
              <div className="rounded-[24px] bg-white p-4 ring-1 ring-ink/[0.06]">
                <p className="text-[16px] font-extrabold text-plum-950">{msg.title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink/70">{msg.body}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-ink/70">{msg.suggestion}</p>
                <div className="mt-4 space-y-2">
                  {msg.options.map(o => (
                    <div key={o.id} className="flex items-center gap-3 rounded-2xl bg-[#f8f6fd] p-3 ring-1 ring-plum-100">
                      <SambramoTradePictogram trade={o.name} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-extrabold text-plum-950">{o.name}</span>
                        <span className="block text-[12px] leading-snug text-ink/55">{o.why}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-ink/40">cap = {MAX_TRADES}</p>
              </div>
            )}
          <p data-ready style={{ font: '700 11px system-ui', color: '#999' }}>rendered</p>
        </div>
      </ToastProvider></AuthProvider>
    </MemoryRouter>
  )
}
