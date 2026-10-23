/**
 * The first run, straight after the splash: where you are, who you are,
 * and may we tell you when a master replies. Three screens, one job each,
 * the same order and the same calls as the partner app's front door.
 *
 *   1. Location  — the OS prompt fires on arrival (captureLocation), then
 *                  the point is named and checked against the markets.
 *                  Bengaluru is live; Mysuru is let in for testing
 *                  (lib/where.js). Refused or outside: pick a Bengaluru
 *                  area by hand — planning for a Bengaluru address from
 *                  elsewhere is a real customer, not an error.
 *   2. Sign in   — email, six digits, in. AuthContext's sendEmailOtp /
 *                  verifyEmailOtp, exactly as PartnerEntry uses them; the
 *                  phone OTP swap later changes the field, not the screen.
 *   3. Alerts    — the OS notification prompt fires on arrival
 *                  (enableAlerts → POST_NOTIFICATIONS on Android 13+).
 *                  "Not now" is allowed and remembered; it is asked once.
 *
 * Nothing here is skippable in a way that leaves the app half set up:
 * a signed-out customer always comes back to step 2.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BellRing, Check, Loader2, LocateFixed, Mail, MapPin, Search, Settings2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { alertsAvailability, enableAlerts } from '../../lib/push'
import { openDeviceSettings } from '../../lib/partnerLocation'
import { validateField, normalise, SEVERITY } from '../../lib/validation/fieldRules'
import { BENGALURU_AREAS } from '../../data/bengaluruAreas'
import { artFor } from '../data/art'
import { locate, saveWhere, km } from '../lib/where'

const FLAG = 'sbm.cx.onboard.v1'
export const onboardFlags = () => { try { return JSON.parse(localStorage.getItem(FLAG) ?? '{}') } catch { return {} } }
const setFlag = patch => { try { localStorage.setItem(FLAG, JSON.stringify({ ...onboardFlags(), ...patch })) } catch { /* storage off */ } }

export default function Onboarding({ step, onDone }) {
  const steps = ['where', 'signin', 'alerts']
  const at = steps.indexOf(step)
  return (
    <main className="cx-enter flex min-h-[100dvh] flex-col bg-white" data-onboarding={step}>
      <div className="cx-safe-top flex gap-1.5 px-5 pt-3" aria-hidden>
        {steps.map((s, i) => <span key={s} className={'h-1 flex-1 rounded-full transition-colors duration-500 ' + (i <= at ? 'bg-[var(--brand)]' : 'bg-[var(--am-100)]')} />)}
      </div>
      {step === 'where' && <Where onDone={onDone} />}
      {step === 'signin' && <SignIn />}
      {step === 'alerts' && <Alerts onDone={onDone} />}
    </main>
  )
}

function Hero({ id = 'hero-family', children }) {
  const src = artFor(id)
  return (
    <div className="relative mx-5 mt-5 h-[30dvh] max-h-[260px] min-h-[180px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FDEBF5] via-[#F6EAFF] to-[#E9E0FF]">
      {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_35%] mix-blend-multiply" />}
      {children}
    </div>
  )
}

function Title({ eyebrow, title, sub }) {
  return (
    <div className="px-6 pt-6">
      <p className="text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">{eyebrow}</p>
      <h1 className="mt-1.5 text-[28px] font-extrabold leading-[1.06] tracking-[-0.035em]">{title}</h1>
      <p className="mt-2 text-[13.5px] font-semibold leading-relaxed text-[var(--ink-2)]">{sub}</p>
    </div>
  )
}

/* ── 1. Location ──────────────────────────────────────────────────── */
function Where({ onDone }) {
  const [state, setState] = useState('asking') // asking | found | outside | off | pick
  const [found, setFound] = useState(null)
  const [q, setQ] = useState('')
  const asked = useRef(false)

  async function ask() {
    setState('asking')
    const r = await locate()
    if (!r.ok) { setState('off'); return }
    setFound(r)
    if (r.market?.live) {
      setState('found')
      saveWhere({ ...r.place, market: r.market.id, test: !!r.market.test })
      setTimeout(onDone, 1100)
    } else setState('outside')
  }
  /* The prompt is the first thing on screen, as on the partner app. */
  useEffect(() => { if (!asked.current) { asked.current = true; ask() } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = a => { saveWhere({ area: a.name, city: 'Bengaluru', lat: a.lat, lng: a.lng, market: 'BLR', source: 'picked' }); onDone() }
  const areas = useMemo(() => {
    const t = q.trim().toLowerCase()
    const near = found?.place ? a => km(found.place, a) : () => 0
    return BENGALURU_AREAS.filter(a => !t || a.name.toLowerCase().includes(t)).sort((a, b) => near(a) - near(b) || a.tier - b.tier || a.name.localeCompare(b.name))
  }, [q, found])

  if (state === 'pick') {
    return (
      <section className="cx-enter flex flex-1 flex-col px-5 pt-6">
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">Pick your area in Bengaluru</h1>
        <p className="mt-1 text-[13px] font-semibold text-[var(--ink-3)]">Masters near it come first. You can change it any time.</p>
        <label className="mt-4 flex h-12 items-center gap-2.5 rounded-[16px] bg-[var(--am-50)] px-3.5 ring-1 ring-[var(--am-200)]">
          <Search size={17} className="text-[var(--brand)]" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Koramangala, Whitefield, Jayanagar…" className="h-full flex-1 bg-transparent text-[14.5px] font-bold outline-none placeholder:text-[var(--ink-3)]" />
        </label>
        <ul className="mt-2 flex-1 overflow-y-auto pb-6">
          {areas.map(a => (
            <li key={a.name}>
              <button type="button" onClick={() => pick(a)} className="cx-press flex w-full items-center gap-3 border-b border-[var(--line)] py-3.5 text-left" data-area={a.name}>
                <MapPin size={17} className="text-[var(--brand)]" /><span className="flex-1 text-[15px] font-bold">{a.name}</span><ArrowRight size={16} className="text-[var(--ink-3)]" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section className="flex flex-1 flex-col">
      <Hero>
        <span className="absolute bottom-4 right-4 grid h-16 w-16 place-items-center">
          {state === 'asking' && <span className="absolute inset-0 animate-ping rounded-full bg-[#6A2BD9]/30" />}
          <span className={'relative grid h-14 w-14 place-items-center rounded-full text-white shadow-[0_12px_26px_-10px_rgba(74,22,176,.9)] ' + (state === 'found' ? 'cx-pop bg-[var(--ok)]' : 'bg-[var(--brand)]')}>
            {state === 'found' ? <Check size={26} strokeWidth={3} /> : <MapPin size={26} />}
          </span>
        </span>
      </Hero>
      {state === 'asking' && <Title eyebrow="Step 1 · Your location" title="Finding the masters closest to you" sub="Allow location on the next prompt. We use it to show who can reach you and to price travel honestly." />}
      {state === 'found' && <Title eyebrow={found.market.test ? `${found.market.city} · testing access` : 'You are in'} title={found.place.area} sub={found.market.test ? 'Mysuru is open for testing. Customers launch in Bengaluru first.' : `${found.place.city ?? 'Bengaluru'}${found.place.pincode ? ` · ${found.place.pincode}` : ''} — masters near you are ready.`} />}
      {state === 'outside' && <Title eyebrow="Live in Bengaluru" title="We are not in your city yet" sub={`You are in ${found?.place?.area ?? 'a city we do not serve yet'}. Planning something in Bengaluru? Pick the area and carry on.`} />}
      {state === 'off' && <Title eyebrow="Location is off" title="Let us know where you are" sub="Turn location on for the closest masters, or simply pick your area in Bengaluru." />}

      <div className="mt-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-6">
        {state === 'asking' && <p className="flex items-center justify-center gap-2 py-4 text-[13.5px] font-extrabold text-[var(--am-ink)]"><Loader2 size={18} className="animate-spin" />Looking for you…</p>}
        {(state === 'outside' || state === 'off') && (
          <div className="grid gap-2.5">
            <button type="button" onClick={() => setState('pick')} className="cx-press cx-cta flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" data-pick-area>
              <MapPin size={18} />Pick my area in Bengaluru
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={ask} className="cx-press cx-btn flex h-12 items-center justify-center gap-1.5 rounded-[16px] text-[13.5px] font-extrabold"><LocateFixed size={16} />Try again</button>
              <button type="button" onClick={() => openDeviceSettings('app')} className="cx-press cx-btn flex h-12 items-center justify-center gap-1.5 rounded-[16px] text-[13.5px] font-extrabold"><Settings2 size={16} />Settings</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ── 2. Sign in — PartnerEntry's email → code, in the customer's colours ── */
function SignIn() {
  const { sendEmailOtp, verifyEmailOtp } = useAuth()
  const [stage, setStage] = useState('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [resendIn, setResendIn] = useState(0)
  const codeRef = useRef(null)
  const emailOk = !!email.trim() && validateField('login_email', email).severity !== SEVERITY.ERROR
  const codeCheck = validateField('otp_code', code, { length: 6 })
  useEffect(() => { if (!resendIn) return; const t = setTimeout(() => setResendIn(n => n - 1), 1000); return () => clearTimeout(t) }, [resendIn])
  useEffect(() => { if (stage === 'code') codeRef.current?.focus() }, [stage])

  async function send() {
    if (!emailOk || busy) return
    setBusy(true); setError(null)
    try { await sendEmailOtp(normalise('login_email', email), { shouldCreateUser: true }); setStage('code'); setResendIn(30) }
    catch (e) { setError(e?.message || 'Could not send the code. Check the address and try again.') }
    finally { setBusy(false) }
  }
  async function verify() {
    if (busy || codeCheck.severity === SEVERITY.ERROR) return
    setBusy(true); setError(null)
    /* The session lands in AuthContext; CustomerApp sees the user and moves on. */
    try { await verifyEmailOtp(normalise('login_email', email), codeCheck.value) }
    catch (e) { setError(e?.message || 'That code did not work. Check it, or send a new one.'); setBusy(false) }
  }

  return (
    <section className="flex flex-1 flex-col">
      <Hero id="cat-life" />
      {stage === 'email'
        ? <Title eyebrow="Step 2 · Sign in" title="Your celebrations, saved to you" sub="One email, a six-digit code, and you are in. No password to remember." />
        : <Title eyebrow="Check your inbox" title="Enter the six digits" sub={`We sent a code to ${email.trim()}.`} />}
      <div className="mt-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-6">
        {stage === 'email' ? (
          <label className="flex h-14 items-center gap-3 rounded-[18px] bg-white px-4 shadow-[0_0_0_1.5px_var(--am-200)] focus-within:shadow-[0_0_0_2px_var(--brand)]">
            <Mail size={19} className="text-[var(--brand)]" />
            <input type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="you@example.com" className="h-full flex-1 bg-transparent text-[16px] font-bold outline-none placeholder:text-[var(--ink-3)]" data-email />
          </label>
        ) : (
          <input ref={codeRef} inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && verify()}
            placeholder="••••••" className="cx-num h-16 w-full rounded-[18px] bg-[var(--am-50)] text-center text-[30px] font-extrabold tracking-[0.4em] outline-none ring-1 ring-[var(--am-200)] focus:ring-2 focus:ring-[var(--brand)]" data-code />
        )}
        {error && <p className="mt-2 text-[12.5px] font-bold text-[#C8112A]">{error}</p>}
        <button type="button" disabled={busy || (stage === 'email' ? !emailOk : codeCheck.severity === SEVERITY.ERROR)} onClick={stage === 'email' ? send : verify}
          className="cx-press cx-cta mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" data-signin>
          {busy ? <Loader2 size={18} className="animate-spin" /> : stage === 'email' ? <>Send my code<ArrowRight size={18} /></> : <>Verify and continue<ArrowRight size={18} /></>}
        </button>
        {stage === 'code' && (
          <div className="mt-3 flex items-center justify-between text-[13px] font-extrabold">
            <button type="button" onClick={() => { setStage('email'); setCode(''); setError(null) }} className="text-[var(--ink-3)]">Change email</button>
            <button type="button" disabled={resendIn > 0} onClick={send} className="text-[var(--brand)] disabled:text-[var(--ink-3)]">{resendIn ? `Resend in ${resendIn}s` : 'Send a new code'}</button>
          </div>
        )}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11.5px] font-semibold text-[var(--ink-3)]"><ShieldCheck size={14} />By continuing you agree to the Terms and Privacy Policy.</p>
      </div>
    </section>
  )
}

/* ── 3. Notifications ─────────────────────────────────────────────── */
function Alerts({ onDone }) {
  const { profile } = useAuth()
  const [state, setState] = useState('idle') // idle | asking | on | off
  const asked = useRef(false)
  const finish = v => { setFlag({ alerts: v }); onDone() }

  async function ask() {
    if (!profile?.id) return
    setState('asking')
    const r = await enableAlerts({ profileId: profile.id, app: 'customer' }).catch(() => ({ ok: false }))
    setState(r?.ok ? 'on' : 'off')
    if (r?.ok) setTimeout(() => finish('on'), 900)
  }
  /* The system prompt appears on arrival; a browser that cannot show
     alerts at all is simply waved through. */
  useEffect(() => {
    if (asked.current || !profile?.id) return
    asked.current = true
    const a = alertsAvailability()
    if (a.ok === false && a.via === 'web') { finish('unsupported'); return }
    const t = setTimeout(ask, 500)
    return () => clearTimeout(t)
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="flex flex-1 flex-col">
      <Hero id="cat-special">
        <span className={'absolute right-5 top-5 grid h-12 w-12 place-items-center rounded-full text-white shadow-lg ' + (state === 'on' ? 'cx-pop bg-[var(--ok)]' : 'bg-[var(--brand)]')}>
          {state === 'on' ? <Check size={22} strokeWidth={3} /> : <BellRing size={22} className={state === 'asking' ? 'animate-bounce' : ''} />}
        </span>
      </Hero>
      <Title eyebrow="Step 3 · Stay in the loop" title={state === 'on' ? 'You will hear it first' : 'Know the moment a master replies'}
        sub="Quotes, accepted offers, confirmed bookings and the day-of updates — straight to your phone, never spam." />
      <div className="mt-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-6">
        {state === 'off' && <p className="mb-2 text-center text-[12.5px] font-bold text-[var(--ink-3)]">Notifications are off. You can allow them from Settings any time.</p>}
        <button type="button" disabled={state === 'asking' || state === 'on'} onClick={state === 'off' ? () => openDeviceSettings('app') : ask}
          className="cx-press cx-cta flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" data-alerts>
          {state === 'asking' ? <Loader2 size={18} className="animate-spin" /> : <BellRing size={18} />}{state === 'off' ? 'Open settings' : 'Allow notifications'}
        </button>
        <button type="button" onClick={() => finish(state === 'on' ? 'on' : 'later')} className="mt-2 h-11 w-full text-[13.5px] font-extrabold text-[var(--ink-3)]" data-skip-alerts>
          {state === 'off' ? 'Continue' : 'Not now'}
        </button>
      </div>
    </section>
  )
}
