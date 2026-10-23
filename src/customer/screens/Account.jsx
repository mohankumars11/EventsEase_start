/** Account — the person, their saved partners, help, and the way out. */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronRight, Heart, LogOut, MessageCircle, Phone, Store, CalendarHeart } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { BRAND } from '../../config/sambramo'
import { usePlan } from '../state/PlanContext'
import SignInSheet from './SignInSheet'

export default function Account() {
  const { user, profile, signOut } = useAuth()
  const plan = usePlan()
  const [signIn, setSignIn] = useState(false)
  const name = profile?.full_name || user?.email?.split('@')[0]
  const rows = [
    { icon: Heart, label: 'Saved masters', value: plan.saved.length || null, to: '/saved' },
    { icon: CalendarHeart, label: 'Your plans', to: '/plans' },
    { icon: Bell, label: 'Notifications', to: '/notifications' },
    { icon: MessageCircle, label: 'Help on WhatsApp', href: `https://wa.me/${BRAND.whatsappNumber}` },
    { icon: Phone, label: `Call ${BRAND.supportPhone}`, href: `tel:${BRAND.supportPhone.replace(/\s/g, '')}` },
    { icon: Store, label: 'Become a Sambramo partner', href: 'https://sambramo-partners.vercel.app' },
  ]
  return (
    <main className="cx-enter cx-bottom-pad">
      <header className="cx-safe-top px-4">
        <h1 className="cx-display mt-3 text-[34px]">Account</h1>
      </header>
      <section className="mx-4 mt-4 flex items-center gap-4 rounded-[26px] bg-[var(--brand-deep)] p-4 text-white">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-gradient-to-br from-[#8B5CF6] to-[#5B21C8] text-[24px] font-extrabold">{name ? name[0].toUpperCase() : 'S'}</span>
        <div className="min-w-0 flex-1">
          {user ? (
            <><p className="truncate text-[18px] font-extrabold tracking-[-0.02em]">{name}</p><p className="truncate text-[12.5px] font-semibold text-white/65">{user.email}</p></>
          ) : (
            <><p className="text-[17px] font-extrabold tracking-[-0.02em]">Plan, book and pay in one place</p>
              <button type="button" onClick={() => setSignIn(true)} className="cx-press cx-btn mt-2 rounded-full px-4 py-2 text-[13px] font-extrabold">Sign in</button></>
          )}
        </div>
      </section>
      <ul className="mx-4 mt-4 overflow-hidden rounded-[24px] shadow-[0_0_0_1px_var(--line)]">
        {rows.map((r, i) => {
          const inner = (<>
            <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[var(--am-100)]"><r.icon size={18} className="text-[var(--brand)]" /></span>
            <span className="flex-1 text-[15px] font-bold">{r.label}</span>
            {r.value && <span className="cx-num rounded-full bg-[var(--brand-tint)] px-2 py-0.5 text-[12px] font-extrabold text-[var(--brand)]">{r.value}</span>}
            <ChevronRight size={18} className="text-[var(--ink-3)]" />
          </>)
          const cls = (i ? 'border-t border-[var(--line)] ' : '') + 'cx-press flex items-center gap-3 bg-white px-3 py-3 active:bg-[var(--soft)]'
          return <li key={r.label}>{r.to ? <Link to={r.to} className={cls}>{inner}</Link> : <a href={r.href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>}</li>
        })}
      </ul>
      {user && (
        <button type="button" onClick={signOut} className="cx-press mx-4 mt-4 flex w-[calc(100%-32px)] items-center justify-center gap-2 rounded-[18px] bg-[var(--soft)] py-3.5 text-[14px] font-extrabold text-[#C8112A]">
          <LogOut size={17} />Sign out
        </button>
      )}
      <p className="mt-6 text-center text-[11.5px] font-semibold text-[var(--ink-3)]">Sambramo · Celebrations, arranged.</p>
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={() => setSignIn(false)} why="to keep your plans on every device" />
    </main>
  )
}
