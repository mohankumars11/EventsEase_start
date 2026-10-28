/**
 * Refer & earn (Mohan, 2026-10-28 — after Zomato / Swiggy / Zepto).
 *
 * The promo artwork stays at the top, cropped to its headline and family —
 * its painted-in reward tiles said 10%, and the launch offer is 25% — and
 * everything below is live: a ticket with the customer's own code, one tap
 * to WhatsApp, the native share sheet or copy, how it works in three
 * steps, the rewards they hold, and gift cards to come.
 *
 * What is true today is said plainly: a friend who joins gets the welcome
 * rewards every new customer gets (25% off the first booking, the first
 * invitation free). The referrer's credit is shown with "at launch" until
 * a customer credit ledger pays it (REFERRAL.credit is the one number).
 *
 * The link carries profiles.referral_code and points at the public site,
 * never window.location (inside the APK that origin exists only on the
 * phone). It opens for a friend once the web build is deployed.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, Copy, Gift, MessageCircle, Share2, Sparkles, Ticket, UserPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { artFor } from '../data/art'
import { BackHeader } from '../ui/kit'
import { WELCOME, myVouchers, usable } from '../lib/rewards'

const PUBLIC_ORIGIN = 'https://sambramoh.vercel.app'
export const REFERRAL = { credit: 500, live: false }

export default function Refer() {
  const { profile, user } = useAuth()
  const [copied, setCopied] = useState('')
  const [vouchers, setVouchers] = useState([])
  const [gift, setGift] = useState(() => { try { return localStorage.getItem('sbm.cx.giftcards.notify') === '1' } catch { return false } })
  useEffect(() => { if (user) myVouchers(user.id).then(setVouchers).catch(() => {}) }, [user])
  const code = profile?.referral_code ?? null
  const link = code ? `${PUBLIC_ORIGIN}/signup?ref=${encodeURIComponent(code)}` : PUBLIC_ORIGIN
  const text = `I plan our celebrations on Sambramo — every master you need, booked in minutes. Join with my code ${code ?? ''} and get ${WELCOME.pct}% off your first booking + your first invitation free 🎉`
  const flash = k => { setCopied(k); setTimeout(() => setCopied(''), 1600) }
  async function copy(what = 'link') {
    try { await navigator.clipboard.writeText(what === 'code' ? (code ?? '') : `${text}\n${link}`); flash(what) } catch { /* clipboard off */ }
  }
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: 'Celebrate together on Sambramo', text, url: link }); return } catch { return } }
    copy('link')
  }
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${link}`)}`

  return (
    <main className="cx-enter min-h-[100dvh] bg-[#FFF7EE] pb-[calc(env(safe-area-inset-bottom,0px)+40px)]" data-refer-page>
      <BackHeader title="Refer & earn" sub="Celebrate together" />
      <img src={artFor('promo-refer')} alt="Celebrate together — refer your friends and family" className="mx-3 block aspect-[1670/560] w-[calc(100%-24px)] rounded-[24px] object-cover object-[50%_0%] shadow-[0_18px_32px_-22px_rgba(58,18,144,.7)]" />

      {/* The ticket */}
      <section className="relative mx-3 mt-4 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#5B21B6] via-[#7C3AED] to-[#DB2777] text-white shadow-[0_24px_44px_-24px_rgba(124,58,237,.9)]" data-ref-ticket>
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.14) 1.2px, transparent 1.3px)', backgroundSize: '16px 16px' }} />
        <div className="relative p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/80"><Sparkles size={13} />Give {WELCOME.pct}% · get ₹{REFERRAL.credit}</p>
          <p className="mt-1.5 text-[24px] font-black leading-[1.1] tracking-[-0.03em]">Your friends save on their first celebration.<br />You earn on every one.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Perk big={`${WELCOME.pct}%`} small="off their first booking" />
            <Perk big="FREE" small="their first invitation" />
          </div>
        </div>
        {/* the perforation */}
        <div className="relative flex items-center">
          <span className="absolute -left-3 h-6 w-6 rounded-full bg-[#FFF7EE]" /><span className="absolute -right-3 h-6 w-6 rounded-full bg-[#FFF7EE]" />
          <span className="mx-5 h-0 flex-1 border-t-2 border-dashed border-white/40" />
        </div>
        <div className="relative flex items-center gap-3 p-5 pt-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-white/70">Your code</p>
            <p className="cx-num mt-0.5 text-[30px] font-black tracking-[0.1em]" data-ref-code>{code ?? '· · · · ·'}</p>
          </div>
          <button type="button" onClick={() => copy('code')} disabled={!code} className="cx-press flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-extrabold text-[#5B21B6] disabled:opacity-50" data-copy-code>
            {copied === 'code' ? <><Check size={15} strokeWidth={3} />Copied</> : <><Copy size={15} />Copy</>}
          </button>
        </div>
      </section>

      <div className="mx-3 mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
        <a href={wa} target="_blank" rel="noreferrer" className="cx-press flex h-14 items-center justify-center gap-2 rounded-[18px] bg-[#25D366] text-[15px] font-extrabold text-white shadow-[0_12px_24px_-14px_rgba(37,211,102,.9)]" data-share-whatsapp><MessageCircle size={19} />Invite on WhatsApp</a>
        <button type="button" onClick={share} aria-label="Share" className="cx-press grid h-14 w-14 place-items-center rounded-[18px] bg-white text-[#5B21B6] shadow-[0_0_0_1px_#EEE6FA]" data-share><Share2 size={19} /></button>
        <button type="button" onClick={() => copy('link')} aria-label="Copy link" className="cx-press grid h-14 w-14 place-items-center rounded-[18px] bg-white text-[#5B21B6] shadow-[0_0_0_1px_#EEE6FA]">{copied === 'link' ? <Check size={19} strokeWidth={3} /> : <Copy size={19} />}</button>
      </div>
      {!code && <p className="mx-4 mt-2 text-[12px] font-semibold text-[var(--ink-3)]">Your personal code appears once your account finishes setting up — the link still invites them.</p>}

      {/* How it works */}
      <section className="mx-3 mt-5 rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EFE7DD]">
        <p className="text-[15px] font-extrabold">How it works</p>
        <div className="relative mt-3 grid grid-cols-3 gap-2 text-center">
          <span aria-hidden className="absolute left-[16%] right-[16%] top-5 h-0.5 bg-gradient-to-r from-[#C4B5FD] via-[#F9A8D4] to-[#86EFAC]" />
          {[[UserPlus, 'Invite', 'Share your code on WhatsApp'], [Ticket, 'They save', `${WELCOME.pct}% off + a free invitation`], [Gift, 'You earn', `₹${REFERRAL.credit} credit after their first event`]].map(([I, t, d]) => (
            <div key={t} className="relative">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#F3ECFF] text-[#7C3AED] ring-4 ring-white"><I size={18} /></span>
              <p className="mt-1.5 text-[13px] font-extrabold">{t}</p>
              <p className="text-[11px] font-semibold leading-snug text-[var(--ink-3)]">{d}</p>
            </div>
          ))}
        </div>
        {!REFERRAL.live && <p className="mt-3 rounded-[12px] bg-[#FFF8EB] px-3 py-2 text-[11.5px] font-bold text-[#8A5A1A]">Referral credit starts with our launch — every friend who joins before then still counts.</p>}
      </section>

      {/* Your rewards */}
      <section className="mx-3 mt-3 rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EFE7DD]">
        <div className="flex items-center justify-between"><p className="text-[15px] font-extrabold">Your rewards</p><Link to="/rewards" className="flex items-center text-[12.5px] font-extrabold text-[var(--brand)]">All rewards<ChevronRight size={15} /></Link></div>
        <div className="cx-noscroll -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
          {vouchers.length ? vouchers.map(v => <MiniVoucher key={v.id} v={v} />) : <p className="py-2 text-[12.5px] font-semibold text-[var(--ink-3)]">Your welcome scratch cards show up here.</p>}
        </div>
      </section>

      {/* Gift cards — next */}
      <section className="mx-3 mt-3 flex items-center gap-3 overflow-hidden rounded-[24px] bg-gradient-to-r from-[#FFF4DA] to-[#FDE2F0] p-4 shadow-[0_0_0_1px_#F7DDB0]" data-giftcards>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-white text-[24px] shadow">🎁</span>
        <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-extrabold text-[#5A3B12]">Gift a celebration</span><span className="block text-[12px] font-semibold text-[#8A5A1A]">Sambramo gift cards are coming — they’ll spend it on any master.</span></span>
        <button type="button" onClick={() => { setGift(true); try { localStorage.setItem('sbm.cx.giftcards.notify', '1') } catch { /* off */ } }} disabled={gift} className="shrink-0 rounded-full bg-white px-3 py-2 text-[12px] font-extrabold text-[#B45309] disabled:opacity-70">{gift ? '✓ We’ll tell you' : 'Notify me'}</button>
      </section>
      <p className="mx-4 mt-3 text-center text-[11px] font-semibold text-[var(--ink-3)]">Offers and referrals follow our <Link to="/legal/terms" className="font-extrabold text-[var(--brand)]">terms</Link> — one welcome offer per person, no self-referrals.</p>
    </main>
  )
}

function Perk({ big, small }) {
  return <span className="rounded-[16px] bg-white/15 px-3 py-2.5 ring-1 ring-white/25"><span className="block text-[22px] font-black leading-none">{big}</span><span className="mt-1 block text-[11.5px] font-bold text-white/85">{small}</span></span>
}

export function MiniVoucher({ v }) {
  const ok = usable(v)
  const rsvp = v.kind === 'free_rsvp'
  return (
    <Link to={rsvp ? '/invites/new' : '/explore'} className={'relative block w-[190px] shrink-0 overflow-hidden rounded-[18px] p-3 ' + (ok ? (rsvp ? 'bg-[#FDF2F8]' : 'bg-[#FFF8E7]') : 'bg-[#F4F1F8] opacity-70')} data-mini-voucher={v.kind}>
      <span className="text-[20px]">{rsvp ? '💌' : '🎉'}</span>
      <span className={'block text-[13.5px] font-black ' + (rsvp ? 'text-[#9D174D]' : 'text-[#9A3412]')}>{rsvp ? 'Free first invitation' : `${v.terms?.pct ?? 25}% off first booking`}</span>
      <span className="block text-[11px] font-bold text-[var(--ink-3)]">{ok ? 'Ready to use' : v.status === 'used' ? 'Used' : 'Expired'}</span>
    </Link>
  )
}
