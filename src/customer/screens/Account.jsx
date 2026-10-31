/**
 * Account (Mohan, 2026-10-28 — "as natively designed as Home").
 *
 * Laid out the way Swiggy / Zomato / Flipkart do it: who you are on a warm
 * card, four quick tiles (bookings, invitations, rewards, saved), the
 * welcome voucher, then grouped lists — your celebrations, settings
 * (notifications live here now, not on Home; language; location; payments;
 * privacy), help & policies, and the way out.
 *
 * Language: the app is in English today; the other languages are listed
 * so a customer can say which they want, and the choice is remembered.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, CalendarHeart, ChevronRight, CreditCard, FileText, Gift, Globe, Headset, Heart, LogOut, MailOpen, MapPin, MessageCircle, Phone, ShieldCheck, Smartphone, Store, Trash2, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { BRAND } from '../../config/sambramo'
import { openDeviceSettings } from '../../lib/partnerLocation'
import { usePlan } from '../state/PlanContext'
import { savedWhere, saveWhere } from '../lib/where'
import { Sheet } from '../ui/kit'
import LocationSheet from '../ui/LocationSheet'
import { SUPPORT } from '../data/policies'
import { welcomeLine } from '../lib/rewards'
import SignInSheet from './SignInSheet'

const LANGS = [['en', 'English', 'English'], ['kn', 'ಕನ್ನಡ', 'Kannada'], ['hi', 'हिन्दी', 'Hindi'], ['ta', 'தமிழ்', 'Tamil'], ['te', 'తెలుగు', 'Telugu'], ['ml', 'മലയാളം', 'Malayalam']]

export default function Account() {
  const { user, profile, signOut } = useAuth()
  const plan = usePlan()
  const navigate = useNavigate()
  const [signIn, setSignIn] = useState(false)
  const [sheet, setSheet] = useState(null)
  const [where, setWhere] = useState(savedWhere)
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('sbm.cx.lang') ?? 'en' } catch { return 'en' } })
  const name = profile?.full_name || user?.email?.split('@')[0]
  const photo = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null
  const pickLang = id => { setLang(id); try { localStorage.setItem('sbm.cx.lang', id) } catch { /* off */ } }

  const groups = [
    ['Your celebrations', [
      { icon: MapPin, label: 'Addresses & location', value: where?.area ?? null, onClick: () => setSheet('where') },
      { icon: Gift, label: 'Refer & earn', note: 'Friends get 25% off', to: '/refer' },
      { icon: Store, label: 'Become a Sambramo partner', href: 'https://sambramo-partners.vercel.app' },
    ]],
    ['Settings', [
      { icon: Bell, label: 'Notifications', note: 'Quotes, confirmations, RSVPs', to: '/notifications' },
      { icon: Globe, label: 'Language', value: LANGS.find(l => l[0] === lang)?.[1], onClick: () => setSheet('lang') },
      { icon: CreditCard, label: 'Payments', note: 'UPI, cards & net banking via Razorpay', onClick: () => setSheet('pay') },
      { icon: Smartphone, label: 'App permissions', note: 'Location, notifications', onClick: () => openDeviceSettings('app') },
      { icon: ShieldCheck, label: 'Privacy & your data', to: '/legal/privacy' },
    ]],
    ['Help & policies', [
      { icon: Headset, label: 'Help centre', to: '/help' },
      { icon: MessageCircle, label: 'Chat with us on WhatsApp', href: `https://wa.me/${BRAND.whatsappNumber}` },
      { icon: Phone, label: `Call ${BRAND.supportPhone}`, href: `tel:${BRAND.supportPhone.replace(/\s/g, '')}` },
      { icon: FileText, label: 'Cancellation & refunds', to: '/legal/cancellation' },
      { icon: FileText, label: 'Terms of use', to: '/legal/terms' },
    ]],
  ]

  return (
    <main className="cx-enter min-h-[100dvh] bg-white cx-bottom-pad" data-account>
      <header className="cx-safe-top px-4 pt-2">
        <h1 className="text-[26px] font-black tracking-[-0.035em] text-[#1C1033]">Account</h1>
      </header>

      {/* Who you are */}
      <section className="mx-3 mt-3 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#FFFFFF] via-[#F6F0FF] to-[#FFF1F8] p-4 text-[#1B0B33] shadow-[0_18px_36px_-26px_rgba(91,33,168,.7)] ring-1 ring-[#E9DDFB]" data-profile-card>
        <div className="flex items-center gap-3.5">
          <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[22px] bg-gradient-to-br from-[#A78BFA] to-[#DB2777] text-[24px] font-black text-white ring-2 ring-white">
            {photo ? <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" /> : (name ? name[0].toUpperCase() : <UserRound size={26} />)}
          </span>
          <div className="min-w-0 flex-1">
            {user ? <><p className="truncate text-[19px] font-black tracking-[-0.02em]">{name}</p><p className="truncate text-[12.5px] font-semibold text-[#6B5E80]">{user.email}</p></>
              : <><p className="text-[17px] font-black">Plan, book and pay in one place</p><button type="button" onClick={() => setSignIn(true)} className="cx-press cx-cta mt-2 rounded-full px-4 py-2 text-[13px] font-extrabold">Sign in</button></>}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[[CalendarHeart, 'Bookings', '/plans', plan.bookings?.length], [MailOpen, 'Invites', '/invites'], [Gift, 'Rewards', '/rewards'], [Heart, 'Saved', '/saved', plan.saved.length]].map(([I, l, to, n]) => (
            <Link key={l} to={to} className="cx-press relative rounded-[16px] bg-white py-3 text-[#3B1670] shadow-[0_8px_18px_-14px_rgba(91,33,168,.7)] ring-1 ring-[#EEE6FA]" data-quick={l}>
              <I size={20} className="mx-auto text-[#7C3AED]" />
              <span className="mt-1 block text-[11.5px] font-extrabold">{l}</span>
              {n ? <span className="cx-num absolute right-1.5 top-1.5 rounded-full bg-[#DB2777] px-1.5 text-[10px] font-black text-white">{n}</span> : null}
            </Link>
          ))}
        </div>
      </section>

      <Link to="/rewards" className="cx-press mx-3 mt-3 flex items-center gap-3 rounded-[20px] bg-gradient-to-r from-[#FFF4DA] to-[#FDE2F0] p-3.5 ring-1 ring-[#F7DDB0]" data-account-offer>
        <span className="text-[26px]">🎉</span>
        <span className="min-w-0 flex-1"><span className="block text-[14px] font-black text-[#7A3E00]">{welcomeLine}</span><span className="block text-[11.5px] font-semibold text-[#8A5A1A]">Plus your first invitation free — in Rewards</span></span>
        <ChevronRight size={18} className="text-[#B45309]" />
      </Link>

      {groups.map(([title, rows]) => (
        <section key={title} className="mt-4">
          <p className="px-5 pb-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink-3)]">{title}</p>
          <ul className="mx-3 overflow-hidden rounded-[22px] bg-white shadow-[0_0_0_1px_#EFE7DD]">
            {rows.map((r, i) => {
              const inner = (<>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[#F5F0FF]"><r.icon size={18} className="text-[#6D28D9]" /></span>
                <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-bold">{r.label}</span>{r.note && <span className="block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{r.note}</span>}</span>
                {r.value && <span className="max-w-[40%] truncate text-[12.5px] font-bold text-[var(--ink-3)]">{r.value}</span>}
                <ChevronRight size={17} className="shrink-0 text-[var(--ink-3)]" />
              </>)
              const cls = (i ? 'border-t border-[#F4EEE6] ' : '') + 'cx-press flex w-full items-center gap-3 px-3 py-3 text-left active:bg-[#FBF8F4]'
              return <li key={r.label}>{r.to ? <Link to={r.to} className={cls}>{inner}</Link> : r.href ? <a href={r.href} target="_blank" rel="noreferrer" className={cls}>{inner}</a> : <button type="button" onClick={r.onClick} className={cls}>{inner}</button>}</li>
            })}
          </ul>
        </section>
      ))}

      {user && (
        <div className="mx-3 mt-4 space-y-2">
          <button type="button" onClick={signOut} className="cx-press flex w-full items-center justify-center gap-2 rounded-[18px] bg-white py-3.5 text-[14px] font-extrabold text-[#C8112A] shadow-[0_0_0_1px_#EFE7DD]"><LogOut size={17} />Sign out</button>
          <a href={`mailto:${SUPPORT.email}?subject=${encodeURIComponent('Delete my Sambramo account')}&body=${encodeURIComponent(`Please delete my account (${user.email}) and my data.`)}`} className="flex items-center justify-center gap-1.5 py-2 text-[12px] font-bold text-[var(--ink-3)]"><Trash2 size={13} />Delete my account</a>
        </div>
      )}
      <p className="mt-4 text-center text-[11px] font-semibold text-[var(--ink-3)]">Sambramo · celebrations, arranged</p>

      <LocationSheet open={sheet === 'where'} onClose={() => setSheet(null)} onPick={p => { saveWhere(p); setWhere(savedWhere()); setSheet(null) }} />
      <Sheet open={sheet === 'lang'} onClose={() => setSheet(null)} title="Language">
        <div className="pb-3">
          {LANGS.map(([id, native, en]) => (
            <button key={id} type="button" onClick={() => pickLang(id)} className="flex w-full items-center justify-between border-b border-[var(--line)] py-3.5 text-left last:border-0">
              <span><span className="block text-[15px] font-extrabold">{native}</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">{en}{id !== 'en' ? ' · coming soon' : ''}</span></span>
              {lang === id && <span className="rounded-full bg-[#0C831F] px-2.5 py-1 text-[11px] font-extrabold text-white">Selected</span>}
            </button>
          ))}
          {lang !== 'en' && <p className="mt-2 text-[12px] font-semibold text-[var(--ink-3)]">Noted — we’ll switch the app to {LANGS.find(l => l[0] === lang)?.[2]} as soon as it’s ready. Until then it stays in English.</p>}
        </div>
      </Sheet>
      <Sheet open={sheet === 'pay'} onClose={() => setSheet(null)} title="Payments">
        <div className="space-y-2 pb-3 text-[13px] font-semibold text-[var(--ink-2)]">
          <p>Every payment goes through Razorpay: UPI, cards, net banking and wallets. Sambramo never stores your card details.</p>
          <p>Your money is held safely and released to the master after your event, as our <button type="button" onClick={() => { setSheet(null); navigate('/legal/cancellation') }} className="font-extrabold text-[var(--brand)]">cancellation & refund policy</button> describes.</p>
        </div>
      </Sheet>
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={() => setSignIn(false)} why="to keep your plans on every device" />
    </main>
  )
}
