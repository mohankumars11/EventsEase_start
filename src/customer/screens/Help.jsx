/**
 * Help — reachable from the headset on Home and from the search hub.
 * Real channels (BRAND's support line, WhatsApp and email) and the
 * cancellation ladder the customer agreed to at sign-in
 * (customer/data/policies.js LADDER — the same one on Checkout and
 * /legal/cancellation), so the app says one thing everywhere.
 */
import { Link } from 'react-router-dom'
import { ChevronRight, Mail, MessageCircle, Phone, ReceiptText, ShieldCheck } from 'lucide-react'
import { BRAND } from '../../config/sambramo'
import { LADDER, POLICY_VERSION } from '../data/policies'
import { BackHeader } from '../ui/kit'

const FAQ = [
  ['When am I charged?', 'Only when you confirm at checkout. Planning, comparing and sending offers are free.'],
  ['Where does my money go?', 'Into escrow. It is released to your master only after your event is delivered.'],
  ['Can I cancel?', 'Yes — the policy below shows exactly how much comes back, by how close to the day you cancel.'],
]

export default function Help() {
  const ch = [
    [MessageCircle, 'Chat on WhatsApp', 'Message us about anything', `https://wa.me/${BRAND.whatsappNumber}`, '#0F9D58', '#E7F8EF'],
    [Phone, `Call ${BRAND.supportPhone}`, 'Talk to the team', `tel:${BRAND.supportPhone.replace(/\s/g, '')}`, '#2563EB', '#EAF1FF'],
    [Mail, BRAND.supportEmail, 'For anything that needs a paper trail', `mailto:${BRAND.supportEmail}`, '#7C3AED', '#F3ECFF'],
  ]
  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+40px)]">
      <BackHeader title="Help & support" sub="A real person, on every booking" />
      <section className="grid gap-2 px-3 pt-1">
        {ch.map(([I, t, d, href, c, bg]) => (
          <a key={t} href={href} className="cx-press flex items-center gap-3 rounded-[20px] bg-white p-3.5 shadow-[0_0_0_1px_#EEE6FA]" data-channel={t}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]" style={{ background: bg, color: c }}><I size={21} /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[14.5px] font-extrabold">{t}</span><span className="block text-[12px] font-semibold text-[var(--ink-3)]">{d}</span></span>
            <ChevronRight size={18} className="text-[var(--ink-3)]" />
          </a>
        ))}
        <Link to="/plans" className="cx-press flex items-center gap-3 rounded-[20px] bg-white p-3.5 shadow-[0_0_0_1px_#EEE6FA]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#FFF1E6] text-[#EA580C]"><ReceiptText size={21} /></span>
          <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-extrabold">Help with a booking</span><span className="block text-[12px] font-semibold text-[var(--ink-3)]">Open it from My Bookings</span></span>
          <ChevronRight size={18} className="text-[var(--ink-3)]" />
        </Link>
      </section>

      <section className="px-4 pt-7" id="cancellation">
        <h2 className="flex items-center gap-2 text-[17px] font-extrabold tracking-[-0.025em]"><ShieldCheck size={18} className="text-[#0F9D58]" />Cancellation policy</h2>
        <p className="mt-1 text-[12.5px] font-semibold text-[var(--ink-3)]">What comes back depends on how close to the event you cancel — more if you take it as Sambramo credit. If a master cancels, you get everything back.</p>
        <ol className="mt-3 overflow-hidden rounded-[18px] shadow-[0_0_0_1px_#EEE6FA]">
          {LADDER.map((r, i) => (
            <li key={r.when} className={'flex items-start gap-3 bg-white p-3 ' + (i ? 'border-t border-[#F1ECF8]' : '')}>
              <span className={'w-[92px] shrink-0 text-[13px] font-black leading-tight ' + (/^Full/.test(r.refund) ? 'text-[#0F9D58]' : /^No/.test(r.refund) ? 'text-[#B42318]' : 'text-[#B45309]')}>{r.refund}</span>
              <span className="min-w-0"><span className="block text-[13.5px] font-extrabold">{r.when}</span>
                {(r.credit || r.note) && <span className="block text-[12px] font-semibold text-[var(--ink-2)]">{[r.credit, r.note].filter(Boolean).join(' · ')}</span>}</span>
            </li>
          ))}
        </ol>
        <Link to="/legal/cancellation" className="mt-2 inline-flex items-center text-[12.5px] font-extrabold text-[var(--brand)]">Read the full policy<ChevronRight size={14} /></Link>
      </section>

      <section className="px-4 pt-7">
        <h2 className="text-[17px] font-extrabold tracking-[-0.025em]">Common questions</h2>
        <div className="mt-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-b border-[#F1ECF8] py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-extrabold">{q}<ChevronRight size={16} className="shrink-0 transition group-open:rotate-90" /></summary>
              <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-[var(--ink-2)]">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-[11.5px] font-semibold text-[var(--ink-3)]">Policy version {POLICY_VERSION}. Terms of service apply to every booking.</p>
      </section>
    </main>
  )
}
