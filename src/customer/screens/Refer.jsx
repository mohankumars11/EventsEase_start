/**
 * Refer & earn (Mohan, 2026-10-28).
 *
 *   Your friend   25% off their first booking (the welcome offer) + their
 *                 first invitation free.
 *   You           25% off your next event (up to ₹2,500) and 5% off the
 *                 one after (up to ₹1,000) — per friend, once BOTH of you
 *                 have a completed, paid event. Claimed here; issued by
 *                 the server (claim_referral_rewards, migration 193).
 *
 * Every referral is followed (my_referrals): joined → booked & paid →
 * event done, first names only. The ticket at the top is drawn in code —
 * it tilts and catches the light under a finger — and the old painted
 * "Celebrate together" artwork is gone.
 *
 * Both rewards come out of Sambramo's margin, never below the partner's
 * price (api/_lib/listPrice.js), so they cost the partner nothing.
 *
 * The link carries profiles.referral_code and points at the public site,
 * never window.location (inside the APK that origin exists only on the
 * phone). It opens for a friend once the web build is deployed.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, ChevronRight, Copy, Gift, Loader2, MessageCircle, PartyPopper, Share2, Sparkles, Trophy, UserPlus, Wallet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { BackHeader } from '../ui/kit'
import Twinkle from '../ui/Twinkle'
import { WELCOME, REFERRAL, myVouchers, myReferrals, claimReferralRewards, usable } from '../lib/rewards'

const PUBLIC_ORIGIN = 'https://sambramoh.vercel.app'
const rs = p => `₹${Math.round(p / 100).toLocaleString('en-IN')}`

export default function Refer() {
  const { profile, user } = useAuth()
  const [copied, setCopied] = useState('')
  const [vouchers, setVouchers] = useState([])
  const [refs, setRefs] = useState(null)
  const [claiming, setClaiming] = useState(false)
  const [claimMsg, setClaimMsg] = useState('')
  const [gift, setGift] = useState(() => { try { return localStorage.getItem('sbm.cx.giftcards.notify') === '1' } catch { return false } })
  useEffect(() => {
    if (!user) return
    myVouchers(user.id).then(setVouchers).catch(() => {})
    myReferrals().then(setRefs).catch(() => setRefs({ joined: 0, paid: 0, done: 0, claimed: 0, eligible: false, friends: [] }))
  }, [user])
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
  const claimable = refs ? Math.max(0, (refs.eligible ? refs.done : 0) - (refs.claimed ?? 0)) : 0
  async function claim() {
    setClaiming(true); setClaimMsg('')
    try {
      const got = await claimReferralRewards()
      setClaimMsg(got.length ? `🎉 ${got.length} reward${got.length === 1 ? '' : 's'} added to your wallet` : 'Nothing to claim yet.')
      myVouchers(user.id).then(setVouchers).catch(() => {}); myReferrals().then(setRefs).catch(() => {})
    } catch (e) { setClaimMsg(e.message) } finally { setClaiming(false) }
  }

  return (
    <main className="cx-enter min-h-[100dvh] bg-[#F5F2FA] pb-[calc(env(safe-area-inset-bottom,0px)+40px)]" data-refer-page>
      <BackHeader title="Refer & earn" sub="Give 25% · get 25% + 5%" />

      <HoloTicket code={code} copied={copied === 'code'} onCopy={() => copy('code')} />

      <div className="mx-3 mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
        <a href={wa} target="_blank" rel="noreferrer" className="cx-press flex h-14 items-center justify-center gap-2 rounded-[18px] bg-[#25D366] text-[15px] font-extrabold text-white shadow-[0_12px_24px_-14px_rgba(37,211,102,.9)]" data-share-whatsapp><MessageCircle size={19} />Invite on WhatsApp</a>
        <button type="button" onClick={share} aria-label="Share" className="cx-press grid h-14 w-14 place-items-center rounded-[18px] bg-white text-[#5B21A8] shadow-[0_0_0_1px_#EEE6FA]" data-share><Share2 size={19} /></button>
        <button type="button" onClick={() => copy('link')} aria-label="Copy link" className="cx-press grid h-14 w-14 place-items-center rounded-[18px] bg-white text-[#5B21A8] shadow-[0_0_0_1px_#EEE6FA]">{copied === 'link' ? <Check size={19} strokeWidth={3} /> : <Copy size={19} />}</button>
      </div>
      {!code && <p className="mx-4 mt-2 text-[12px] font-semibold text-[var(--ink-3)]">Your personal code appears once your account finishes setting up — the link still invites them.</p>}

      {/* Every referral, followed */}
      <section className="mx-3 mt-4 rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EEE8F6]" data-ref-tracker>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-[16px] font-black tracking-[-0.02em]"><Trophy size={18} className="text-[#E3A008]" />Your referrals</p>
          {refs?.pending && <span className="rounded-full bg-[#FFF4D6] px-2 py-0.5 text-[10.5px] font-extrabold text-[#7A4A00]">Live at launch</span>}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[['Joined', refs?.joined ?? 0, '#7C3AED'], ['Booked & paid', refs?.paid ?? 0, '#C026D3'], ['Event done', refs?.done ?? 0, '#0E9F6E']].map(([t, n, c], i) => (
            <div key={t} className="relative rounded-[16px] bg-[#FAF8FD] px-2 py-3">
              {i < 2 && <ChevronRight size={14} className="absolute -right-2.5 top-1/2 z-[1] -translate-y-1/2 text-[#C9B5F5]" />}
              <p className="cx-num text-[26px] font-black leading-none" style={{ color: c }}>{refs ? n : '·'}</p>
              <p className="mt-1 text-[11px] font-extrabold text-[var(--ink-2)]">{t}</p>
            </div>
          ))}
        </div>
        {refs?.friends?.length > 0 && (
          <ul className="mt-3 divide-y divide-[#F3F0F7]">
            {refs.friends.slice(0, 8).map((f, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#EDE4FF] to-[#FCE7F3] text-[14px] font-black text-[#5B21A8]">{(f.name ?? 'F')[0]}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{f.name}</span>
                <Stage s={f.stage} />
              </li>
            ))}
          </ul>
        )}
        {refs && !refs.friends?.length && <p className="mt-3 text-[12.5px] font-semibold text-[var(--ink-3)]">No one yet — your first friend who books unlocks your reward.</p>}
        {claimable > 0 ? (
          <button type="button" onClick={claim} disabled={claiming} className="cx-press cx-cta mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-[14.5px] font-extrabold" data-claim>
            {claiming ? <Loader2 size={17} className="animate-spin" /> : <Gift size={17} />}Claim {claimable === 1 ? 'your reward' : `${claimable} rewards`}
          </button>
        ) : refs && !refs.eligible && (refs.done ?? 0) > 0 ? (
          <p className="mt-3 rounded-[14px] bg-[#FFF8EB] px-3 py-2.5 text-[12px] font-bold text-[#7A4A00]">Your friend’s event is done 🎉 — complete one event of your own to unlock your reward.</p>
        ) : null}
        {claimMsg && <p className="mt-2 text-center text-[12.5px] font-bold text-[#5B21A8]">{claimMsg}</p>}
      </section>

      {/* How it works */}
      <section className="mx-3 mt-3 rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EEE8F6]">
        <p className="text-[16px] font-black tracking-[-0.02em]">How it works</p>
        <ol className="mt-3 space-y-3">
          {[[UserPlus, 'Share your code', 'On WhatsApp, or anywhere'],
            [PartyPopper, 'Your friend books & pays', `They get ${WELCOME.pct}% off their first booking + a free invitation`],
            [Check, 'Both events are done', 'Theirs, and one of your own'],
            [Wallet, 'Claim 25% + 5%', `${REFERRAL.pct}% off your next event (up to ${rs(REFERRAL.capPaise)}) and ${REFERRAL.bonus}% off the one after (up to ${rs(REFERRAL.bonusCapPaise)})`]].map(([I, t, d], i) => (
            <li key={t} className="relative flex gap-3">
              {i < 3 && <span aria-hidden className="absolute left-[19px] top-10 h-[calc(100%-16px)] w-[2px] bg-gradient-to-b from-[#C9B5F5] to-[#F5D0FE]" />}
              <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F3ECFF] text-[#7C3AED] ring-4 ring-white"><I size={18} /></span>
              <span className="min-w-0 pt-0.5"><span className="block text-[14px] font-extrabold">{t}</span><span className="block text-[12px] font-semibold leading-snug text-[var(--ink-3)]">{d}</span></span>
            </li>
          ))}
        </ol>
      </section>

      {/* Your rewards */}
      <section className="mx-3 mt-3 rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EEE8F6]">
        <div className="flex items-center justify-between"><p className="text-[16px] font-black tracking-[-0.02em]">Your rewards</p><Link to="/rewards" className="flex items-center text-[12.5px] font-extrabold text-[#5B21A8]">Wallet<ChevronRight size={15} /></Link></div>
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

      <details className="group mx-3 mt-3 rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EEE8F6]" data-ref-terms>
        <summary className="flex cursor-pointer list-none items-center justify-between text-[14.5px] font-extrabold">Referral terms<ChevronDown size={18} className="transition group-open:rotate-180" /></summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[12px] font-semibold leading-relaxed text-[var(--ink-2)]">
          {REF_TERMS.map(t => <li key={t}>{t}</li>)}
        </ul>
        <Link to="/legal/terms" className="mt-2 inline-flex items-center text-[12px] font-extrabold text-[#5B21A8]">Full terms<ChevronRight size={14} /></Link>
      </details>
    </main>
  )
}

const REF_TERMS = [
  'Your friend must sign up with your code or link before their first booking. Codes cannot be added afterwards.',
  'Your reward unlocks only when your friend has booked, paid for and completed an event, AND you have booked, paid for and completed at least one event of your own.',
  `Per friend you get two offers: ${REFERRAL.pct}% off your next event (up to ₹2,500, valid 180 days) and ${REFERRAL.bonus}% off a later event (up to ₹1,000, valid 365 days). One offer per booking; offers cannot be combined.`,
  'Offers are applied at checkout on the Sambramo price and never exceed Sambramo’s share of the booking. Your exact saving is shown before you pay.',
  'Rewards have no cash value, cannot be transferred, and are not given for self-referrals, duplicate accounts, or bookings that are cancelled or refunded.',
  'Sambramo may withhold or withdraw a reward where it finds misuse, and may change or end this programme for future referrals.',
]

/* The ticket: drawn in code, tilts under a finger, a sheen that follows it. */
function HoloTicket({ code, copied, onCopy }) {
  const ref = useRef(null)
  const [t, setT] = useState({ x: 0, y: 0, on: false })
  const move = e => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))
    setT({ x, y, on: true })
  }
  const rx = t.on ? (0.5 - t.y) * 10 : 0, ry = t.on ? (t.x - 0.5) * 14 : 0
  return (
    <div className="mx-3 mt-2" style={{ perspective: '900px' }}>
      <section ref={ref} onPointerMove={move} onPointerDown={move} onPointerLeave={() => setT(s => ({ ...s, on: false }))}
        className="relative overflow-hidden rounded-[28px] text-[#1B0B33] shadow-[0_22px_44px_-26px_rgba(91,33,168,.7)] ring-1 ring-[#E9DDFB] transition-transform duration-200 ease-out"
        style={{ transform: `rotateX(${rx}deg) rotateY(${ry}deg)`, background: 'radial-gradient(110% 90% at 0% 0%, #EBDDFF 0%, transparent 55%), radial-gradient(90% 80% at 100% 100%, #FFE0EF 0%, transparent 60%), linear-gradient(135deg, #FFFFFF 0%, #FAF6FF 55%, #FFF6FA 100%)', touchAction: 'pan-y' }} data-ref-ticket>
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-90" style={{ background: `radial-gradient(240px 160px at ${t.x * 100}% ${t.y * 100}%, rgba(255,255,255,.9), transparent 60%), conic-gradient(from ${t.x * 360}deg at 50% 50%, rgba(52,211,153,0), rgba(52,211,153,.14), rgba(251,191,36,.14), rgba(244,114,182,.14), rgba(52,211,153,0))` }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(rgba(91,33,168,.10) 1.2px, transparent 1.3px)', backgroundSize: '16px 16px' }} />
        <Twinkle />
        <div className="relative p-5">
          <p className="flex items-center gap-2 text-[#5B21A8]"><span className="cx-brand text-[15px]">Sambramo</span><span className="rounded-full bg-[#F0E9FF] px-2 py-0.5 text-[11px] font-extrabold">Invite pass</span><Sparkles size={14} className="text-[#C026D3]" /></p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <span className="rounded-[18px] bg-white p-3 shadow-[0_10px_22px_-16px_rgba(91,33,168,.7)] ring-1 ring-[#EADFFB]">
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#7A6E8F]">They get</span>
              <span className="mt-1 block text-[30px] font-black leading-none text-[#5B21A8]">25%</span>
              <span className="mt-1 block text-[11.5px] font-bold text-[#4A3B5E]">off their first booking + free invite</span>
            </span>
            <span className="rounded-[18px] bg-gradient-to-br from-[#FFC24B] to-[#FF8A4C] p-3 text-[#3B1670] shadow-[0_10px_24px_-12px_rgba(255,194,75,.9)]">
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#3B1670]/70">You get</span>
              <span className="mt-1 block text-[30px] font-black leading-none">25<span className="text-[20px]">%</span><span className="text-[18px]"> + 5%</span></span>
              <span className="mt-1 block text-[11.5px] font-extrabold text-[#3B1670]/85">off your next two events</span>
            </span>
          </div>
        </div>
        <div className="relative flex items-center">
          <span className="absolute -left-3 h-6 w-6 rounded-full bg-[#F5F2FA] ring-1 ring-[#E9DDFB]" /><span className="absolute -right-3 h-6 w-6 rounded-full bg-[#F5F2FA] ring-1 ring-[#E9DDFB]" />
          <span className="mx-5 h-0 flex-1 border-t-2 border-dashed border-[#DCCBF7]" />
        </div>
        <div className="relative flex items-center gap-3 p-5 pt-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[#7A6E8F]">Your code</p>
            <p className="cx-code mt-0.5 truncate text-[28px] text-[#3B1670]" data-ref-code>{code ?? '· · · · ·'}</p>
          </div>
          <button type="button" onClick={onCopy} disabled={!code} className="cx-press cx-cta flex h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-extrabold disabled:opacity-50" data-copy-code>
            {copied ? <><Check size={15} strokeWidth={3} />Copied</> : <><Copy size={15} />Copy</>}
          </button>
        </div>
      </section>
    </div>
  )
}

function Stage({ s }) {
  const m = { joined: ['Joined', 'bg-[#F0E9FF] text-[#5B21A8]'], paid: ['Booked & paid', 'bg-[#FCE7F3] text-[#9D174D]'], done: ['Event done ✓', 'bg-[#E7F8EF] text-[#0B7A4B]'] }[s] ?? ['Joined', 'bg-[#F0E9FF] text-[#5B21A8]']
  return <span className={'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ' + m[1]}>{m[0]}</span>
}

export function MiniVoucher({ v }) {
  const ok = usable(v)
  const rsvp = v.kind === 'free_rsvp'
  const ref = v.kind === 'referral_pct'
  return (
    <Link to={rsvp ? '/invites/new' : '/explore'} className={'relative block w-[190px] shrink-0 overflow-hidden rounded-[18px] p-3 ' + (ok ? (rsvp ? 'bg-[#FDF2F8]' : ref ? 'bg-[#F3ECFF]' : 'bg-[#FFF8E7]') : 'bg-[#F4F1F8] opacity-70')} data-mini-voucher={v.kind}>
      {ok && <Twinkle count={4} color={rsvp ? '#DB2777' : '#7C3AED'} />}
      <span className="text-[20px]">{rsvp ? '💌' : ref ? '🏆' : '🎉'}</span>
      <span className={'block text-[13.5px] font-black ' + (rsvp ? 'text-[#9D174D]' : ref ? 'text-[#5B21A8]' : 'text-[#9A3412]')}>{rsvp ? 'Free first invitation' : ref ? `${v.terms?.pct ?? 25}% off · referral` : `${v.terms?.pct ?? 25}% off first booking`}</span>
      <span className="cx-code block truncate text-[10.5px] text-[var(--ink-3)]">{v.code}</span>
      <span className="block text-[11px] font-bold text-[var(--ink-3)]">{ok ? 'Ready to use' : v.status === 'used' ? 'Used' : 'Expired'}</span>
    </Link>
  )
}
