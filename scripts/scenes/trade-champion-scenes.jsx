/**
 * Trade Champion 26, Grow with Sambramo and Build Your Profile, driven in
 * a real browser with no login and no database.
 *
 *   node scripts/shoot-components.mjs tc.png \
 *     --scenes scripts/scenes/trade-champion-scenes.jsx \
 *     --assert scripts/scenes/trade-champion.assert.js
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IS REAL AND WHAT IS NOT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Real: the screens, lib/referrals.js making its calls through the real
 * supabase client, lib/referralModel.js, lib/profileCompletion.js, and
 * useAccountScreens — the hook VendorDashboard uses — pushing real
 * browser history, so `history.back()` here is exactly what Android's
 * back button does in the apk (no backButton listener is registered, so
 * Capacitor's default is WebView goBack).
 *
 * Not real: the server. `fetch` to the harness's stub Supabase URL is
 * answered below with fixed rows, so the screens can be driven through
 * every state — loaded, empty, offline, not switched on — on demand.
 * Whether the SERVER does the right thing is check-referral-lifecycle's
 * job, against the database.
 *
 * The More list here is a stand-in: PartnerAccount needs a signed-in
 * AuthProvider. That the real More rows, Earnings card and Jobs cards
 * open these same screen names is checked in check-trade-champion.mjs.
 */
import React, { useMemo, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'

import TradeChampion from '../../src/components/partner/referrals/TradeChampion'
import GrowHub from '../../src/components/partner/growth/GrowHub'
import BuildProfile from '../../src/components/partner/growth/BuildProfile'
import { useAccountScreens } from '../../src/hooks/useAccountScreens'
import { referralScreenMeta } from '../../src/lib/referralModel'
import { profileChecklist } from '../../src/lib/profileCompletion'
import { PARTNER_TRADES, tradeById } from '../../src/lib/trades'

/* ── The fixture server ─────────────────────────────────────────────── */
const T0 = '2026-09-01T09:00:00Z'
const T1 = '2026-09-05T09:00:00Z'
const REFERRALS = [
  { id: 'r-photo-1', trade_id: 'SBM-TRD-014', trade_name: 'Photography', referred_name: 'Lens & Light Studio',
    state: 'reward_unlocked', not_eligible: false, created_at: T0, updated_at: T1, claimed_at: T0,
    onboarding_completed_at: T0, verified_at: T0, live_at: T0, first_event_at: T1, qualified_at: T1,
    reward_status: 'eligible', paid_at: null, invite_code: 'PHTK7M2Q', campaign_title: 'Monsoon Trade Champion' },
  { id: 'r-photo-2', trade_id: 'SBM-TRD-014', trade_name: 'Photography', referred_name: 'Candid Frames',
    state: 'live', not_eligible: false, created_at: T0, updated_at: T0, claimed_at: T0,
    onboarding_completed_at: T0, verified_at: T0, live_at: T0, first_event_at: null, qualified_at: null,
    reward_status: 'not_eligible', paid_at: null, invite_code: 'PHTX3W9R', campaign_title: null },
  { id: 'r-cater-1', trade_id: 'SBM-TRD-005', trade_name: 'Catering & Food', referred_name: 'Annapoorna Caterers',
    state: 'registered', not_eligible: false, created_at: T0, updated_at: T0, claimed_at: T0,
    onboarding_completed_at: null, verified_at: null, live_at: null, first_event_at: null, qualified_at: null,
    reward_status: 'not_eligible', paid_at: null, invite_code: null, campaign_title: null },
]
const reached = (rows, col) => rows.filter(r => r[col]).length
const SUMMARY = () => ({
  ok: true,
  code: 'KTM4RZ',
  campaign: { id: 'c1', title: 'Monsoon Trade Champion', body: null, reward_paise: 100000,
              reward_type: 'cash', terms_url: null, start_at: null, end_at: null, minimum_referrals: 2 },
  trades: PARTNER_TRADES.map(t => {
    const rows = REFERRALS.filter(r => r.trade_id === t.id)
    const inv = INVITES.filter(i => i.trade_id === t.id)
    return {
      trade_id: t.id, name: t.name, invited: inv.length, invites_open: inv.filter(i => !i.claimed_at).length,
      registered: rows.length, onboarding_completed: reached(rows, 'onboarding_completed_at'),
      verified: reached(rows, 'verified_at'), live: reached(rows, 'live_at'),
      first_event_completed: reached(rows, 'first_event_at'), qualified: reached(rows, 'qualified_at'),
      reward_eligible: rows.filter(r => r.reward_status !== 'not_eligible').length,
      payout_recorded: 0, paid: 0, not_eligible: 0,
    }
  }),
  untraded: null,
})
const INVITES = [
  { id: 'i1', trade_id: 'SBM-TRD-014', code: 'PHTK7M2Q', created_at: T0, expires_at: '2026-11-01T00:00:00Z', claimed_at: T0 },
  { id: 'i2', trade_id: 'SBM-TRD-014', code: 'PHTZZ8NV', created_at: T1, expires_at: '2026-11-04T00:00:00Z', claimed_at: null },
]

window.__calls = []
window.__mode = 'ok'
window.__copied = []
window.__TRADES = PARTNER_TRADES
const madeByKey = new Map()

const json = (body, status = 200) => new Response(JSON.stringify(body),
  { status, headers: { 'content-type': 'application/json' } })

const realFetch = window.fetch.bind(window)
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url
  if (!url.startsWith('http://127.0.0.1:9/stub')) return realFetch(input, init)
  const u = new URL(url)
  const body = init.body ? JSON.parse(init.body) : null
  window.__calls.push({ path: u.pathname.replace('/stub/rest/v1', ''), search: u.search, body })

  if (window.__mode === 'offline') throw new TypeError('Failed to fetch')
  if (window.__mode === 'unavailable') {
    return json({ code: 'PGRST202', message: 'Could not find the function in the schema cache' }, 404)
  }
  await new Promise(r => setTimeout(r, 40))

  const path = u.pathname.replace('/stub/rest/v1', '')
  if (path === '/rpc/my_referral_summary') return json(SUMMARY())
  if (path === '/rpc/ensure_my_referral_code') return json('KTM4RZ')
  if (path === '/rpc/my_referrals') {
    let rows = REFERRALS
    if (body?.p_id) rows = rows.filter(r => r.id === body.p_id)
    if (body?.p_trade_id) rows = rows.filter(r => r.trade_id === body.p_trade_id)
    if (body?.p_state) rows = rows.filter(r => r.state === body.p_state)
    return json(rows)
  }
  if (path === '/rpc/create_referral_invite') {
    const key = body.p_idempotency_key
    if (!madeByKey.has(key)) {
      const inv = { id: `i${INVITES.length + 1}`, trade_id: body.p_trade_id,
        code: `NEW${String(INVITES.length + 1).padStart(5, '2')}`.slice(0, 8),
        created_at: new Date().toISOString(), expires_at: '2026-12-01T00:00:00Z', claimed_at: null }
      INVITES.unshift(inv)
      madeByKey.set(key, inv)
    }
    const inv = madeByKey.get(key)
    return json({ ok: true, id: inv.id, code: inv.code, trade_id: inv.trade_id, expires_at: inv.expires_at })
  }
  if (path === '/partner_referral_invites') {
    const trade = u.searchParams.get('trade_id')?.replace(/^eq\./, '')
    return json(INVITES.filter(i => !trade || i.trade_id === trade))
  }
  return json({ message: `no fixture for ${path}` }, 500)
}

/* Copy and share are recorded rather than performed: a headless browser
   has no clipboard to read back and no share sheet to open. */
try {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async t => { window.__copied.push(t) } },
  })
} catch { /* the fallback path is then exercised instead */ }
navigator.share = async data => { window.__shared = data }

/* ── The profile facts, changeable from the page ────────────────────── */
const BASE_VENDOR = {
  business_name: 'Asha Photography', description: 'Short.', avatar_url: null,
  contact_phone: '+91 98765 43210', pincode: '560001', area: 'MG Road', service_radius_km: 20,
  accepting_jobs: false, is_verified: false, verification_status: 'submitted',
}

function Harness() {
  const { screen, screenParams, openAccount, goUp, setScreenParams } = useAccountScreens()
  const [vendor, setVendor] = useState(BASE_VENDOR)
  window.__saveDescription = () => setVendor(v => ({ ...v, description: 'Candid wedding photography across Bengaluru since 2015.' }))

  const listings = [{ trade: 'Photography', status: 'under_review', offerings: [{ price: 25000, is_active: true }] }]
  const checklist = useMemo(() => profileChecklist({
    profile: { full_name: 'Asha Rao' }, vendor, listings, weeklyRules: [], markedDays: 0,
    docs: { byRequirement: {} }, requirements: [{ id: 'id_proof', required: true }],
    payout: null, payoutLoaded: true,
  }), [vendor])

  const go = to => {
    window.__went = to
    if (to?.screen) openAccount(to.screen)
    else if (to?.tab) setScreenParams(null, { tab: to.tab })
  }

  if (!screen) {
    return (
      <div data-testid="more" className="space-y-2 p-4">
        <h1 className="text-[20px] font-extrabold">More</h1>
        <button data-testid="more-growth" onClick={() => openAccount('growth')}>Grow with Sambramo</button>
        <button data-testid="more-build" onClick={() => openAccount('buildprofile')}>Build your profile</button>
        <button data-testid="more-referral" onClick={() => openAccount('referral')}>Referral &amp; rewards</button>
      </div>
    )
  }

  const meta = screen === 'referral'
    ? referralScreenMeta(screenParams, tradeById(screenParams.trade)?.name)
    : { title: screen, parent: null }

  return (
    <div className="p-4">
      <button data-testid="screen-back" onClick={() => goUp(meta.parent)}>{meta.parent ? 'Back' : 'More'}</button>
      <h1 data-testid="screen-title" className="mb-3 text-[20px] font-extrabold">{meta.title}</h1>
      {screen === 'referral' && (
        <TradeChampion view={screenParams} onView={(next, opts) => setScreenParams('referral', next, opts)} />
      )}
      {screen === 'growth' && (
        <GrowHub checklist={checklist} vendor={vendor} listings={listings} onGo={go} onRefresh={null} />
      )}
      {screen === 'buildprofile' && <BuildProfile checklist={checklist} onGo={go} onRefresh={null} />}
      {!['referral', 'growth', 'buildprofile'].includes(screen) && (
        <p data-testid={`screen-${screen}`}>Editor: {screen}</p>
      )}
    </div>
  )
}

export default function Scenes() {
  return (
    <div style={{ width: 430 }}>
      <BrowserRouter><Harness /></BrowserRouter>
    </div>
  )
}
