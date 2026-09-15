import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Rocket, MapPin, Loader2, Heart, ArrowRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { detectMarket, openCities, captureMarketInterest, rememberServesCity, MARKET_STATUS } from '../../lib/partnerMarket'
import { readSavedAddress } from '../../lib/partnerLocation'

/**
 * Is Sambramo open where this partner is standing?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS A SCREEN AND NOT A CONDITION INSIDE THE FORM
 * ══════════════════════════════════════════════════════════════════════
 *
 * The check used to happen three steps into the onboarding form, as a
 * side effect of a pincode lookup. A decorator in Mysuru filled in a
 * business name, a description and an experience figure, and then found
 * out we could not send them work. That reads as a bait, and it is the
 * point in the funnel where a partner stops.
 *
 * It is also the wrong shape for what happens next: "we are not in your
 * city" is not an ending. It is the start of two different conversations
 * and they belong on a screen that can hold them.
 *
 * ══════════════════════════════════════════════════════════════════════
 * OUT OF THE CITY IS NOT OUT OF THE MARKET
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner in Mysuru who does half their weddings in Bengaluru is a
 * Bengaluru partner. Where their phone is and where they work are two
 * different facts, and dispatch reads the second one.
 *
 * So this screen asks before it decides. Only somebody who says they do
 * NOT work in an open city is treated as out of market, and even then
 * they are captured as supply for a city we have not opened, never
 * refused. There is no "rejected" anywhere in this flow — see the note
 * on the status ladder in migration 121.
 */
export default function MarketCheck() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [detected, setDetected] = useState(null)   // { city, state, postcode, lat, lng }
  const [market, setMarket] = useState(null)
  const [asked, setAsked] = useState(false)        // has the "do you serve" question been answered
  const [saved, setSaved] = useState(null)         // the interest code, once captured
  const [busy, setBusy] = useState(false)

  const open = openCities()
  const openCity = open[0] ?? null

  useEffect(() => {
    let alive = true
    detectMarket().then(res => {
      if (!alive) return
      const addr = res.address ?? readSavedAddress()
      setDetected({
        city: addr?.city ?? null,
        state: addr?.state ?? null,
        postcode: addr?.postcode ?? null,
        lat: res.fix?.lat ?? null,
        lng: res.fix?.lng ?? null,
        line: addr?.line ?? null,
      })
      setMarket(res.market)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  async function saveInterest(city) {
    setBusy(true)
    try {
      const res = await captureMarketInterest({
        profileId: user?.id ?? null,
        name: profile?.full_name ?? null,
        email: profile?.email ?? user?.email ?? null,
        phone: profile?.phone ?? null,
        detected: detected ?? {},
        requestedCity: city,
        currentMarket: openCity,
        marketStatus: market?.status ?? null,
        source: 'partner_market_check',
      })
      setSaved(res)
    } finally {
      setBusy(false)
    }
  }

  function serveTheOpenCity() {
    rememberServesCity(openCity)
    navigate('/partner/login')
  }

  if (loading) {
    return (
      <div className="native-screen flex flex-col items-center justify-center bg-white px-8">
        <Loader2 size={28} className="animate-spin text-plum-600" />
        <p className="mt-4 text-[13.5px] text-ink-mute">Checking your area&hellip;</p>
      </div>
    )
  }

  /* ── Captured. The last thing they see, and it promises nothing we
        cannot keep: no date, no "soon", just that we have it. ─────── */
  if (saved) {
    return (
      <div className="native-screen flex flex-col bg-white">
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-plum-50">
            <Heart size={32} className="text-plum-600" />
          </span>
          <h1 data-market="captured" className="text-[22px] font-extrabold leading-tight text-plum-950">
            We&apos;ll be in touch
          </h1>
          <p className="mt-3 max-w-[19rem] text-[13.5px] leading-relaxed text-ink/65">
            Thanks for telling us. We have saved your interest
            {detected?.city ? ` for ${detected.city}` : ''}, and we will reach out
            when Sambramo opens there.
          </p>
          {saved.code && (
            <p className="mt-3 font-mono text-[11.5px] text-ink-mute">{saved.code}</p>
          )}
        </div>
        <div className="safe-cta px-7">
          <button
            type="button"
            onClick={() => navigate('/partner')}
            className="min-h-[52px] w-full rounded-full bg-gradient-to-r from-plum-700 to-plum-500
                       text-[15.5px] font-extrabold text-white"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  /* ── In an open market ──────────────────────────────────────────── */
  if (market?.status === MARKET_STATUS.ACTIVE) {
    return (
      <div className="native-screen flex flex-col bg-white">
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-forest-50">
            <CheckCircle2 size={32} className="text-forest-600" />
          </span>
          <h1 data-market="active" className="text-[22px] font-extrabold leading-tight text-plum-950">
            Sambramo is live in {market.city}
          </h1>
          <p className="mt-3 max-w-[19rem] text-[13.5px] leading-relaxed text-ink/65">
            You&apos;re in our current launch city. Set up your partner profile and
            start offering your services to customers across {market.city}.
          </p>
          {detected?.line && (
            <p className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold text-ink-mute">
              <MapPin size={13} /> {detected.line}
            </p>
          )}
        </div>
        <div className="safe-cta px-7">
          <button
            type="button"
            onClick={() => navigate('/partner/login')}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full
                       bg-gradient-to-r from-plum-700 to-plum-500 text-[15.5px] font-extrabold text-white"
          >
            Continue setup <ArrowRight size={17} />
          </button>
        </div>
      </div>
    )
  }

  /* ── Not an open market ─────────────────────────────────────────────
     Two questions, in this order, and the order is the whole design:
     "do you work in an open city" comes FIRST, because a yes means they
     were never out of market and the rest of the screen does not apply
     to them. Asking "shall we tell you when we open here" first would
     file a working Bengaluru partner as a lead. */
  const where = detected?.city ?? 'your area'

  return (
    <div className="native-screen flex flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto px-7 pt-10">
        <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-plum-50">
          <Rocket size={28} className="text-plum-600" />
        </span>
        <h1 data-market="coming-soon" className="text-[22px] font-extrabold leading-tight text-plum-950">
          Sambramo is coming to your city
        </h1>

        <p className="mt-3 text-[13.5px] leading-relaxed text-ink/65">
          {detected?.city
            ? <>We detected that you&apos;re currently in {detected.city}{detected.state ? `, ${detected.state}` : ''}.</>
            : <>We could not tell which city you&apos;re in.</>}
          {' '}
          Sambramo is currently launching in {openCity}. We&apos;re working to
          bring it to more cities soon.
        </p>

        {/* THE question. A partner in Mysuru who works Bengaluru weddings
            is a Bengaluru partner, and dispatch reads their service
            area, not their address. */}
        {!asked && (
          <div className="mt-7 rounded-[20px] bg-ink/[0.02] p-5 ring-1 ring-ink/[0.06]">
            <p className="text-[15px] font-extrabold text-plum-950">
              Do you serve {openCity}?
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink/60">
              Your current location is outside {openCity}. If you provide services
              there, you can carry on setting up your partner profile.
            </p>
            <button
              type="button"
              data-serve="yes"
              onClick={serveTheOpenCity}
              className="mt-4 min-h-[48px] w-full rounded-full bg-gradient-to-r from-plum-700 to-plum-500
                         text-[14.5px] font-extrabold text-white"
            >
              Yes, I serve {openCity}
            </button>
            <button
              type="button"
              data-serve="no"
              onClick={() => setAsked(true)}
              className="mt-2 min-h-[44px] w-full text-[13px] font-bold text-ink/55"
            >
              No, I&apos;m interested in my city
            </button>
          </div>
        )}

        {asked && (
          <div className="mt-7 rounded-[20px] bg-ink/[0.02] p-5 ring-1 ring-ink/[0.06]">
            <p className="text-[15px] font-extrabold text-plum-950">
              Want Sambramo in {where}?
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink/60">
              Tell us and we will count you in. The cities with the most partners
              waiting are the ones we open next — and we will come back to you
              before we do.
            </p>
            <button
              type="button"
              data-interest="yes"
              disabled={busy || !detected?.city}
              onClick={() => saveInterest(detected.city)}
              className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full
                         bg-gradient-to-r from-plum-700 to-plum-500 text-[14.5px] font-extrabold
                         text-white disabled:opacity-40"
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              Yes, I&apos;m interested
            </button>
            <button
              type="button"
              onClick={serveTheOpenCity}
              className="mt-2 min-h-[44px] w-full text-[13px] font-bold text-plum-600"
            >
              I&apos;ll explore {openCity} opportunities
            </button>
            <button
              type="button"
              onClick={() => navigate('/partner')}
              className="mt-1 min-h-[44px] w-full text-[13px] font-bold text-ink/45"
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
