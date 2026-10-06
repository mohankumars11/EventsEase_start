import { supabase } from './supabase'
import { captureLocation, reverseAddress, readSavedLocation, readSavedAddress, saveAddress } from './partnerLocation'
import { marketCheck, MARKET_STATUS, launchMarkets } from '../config/markets'

/**
 * Which market a partner is standing in, and what that means for them.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ORDER MATTERS AND IT IS ALWAYS THIS ORDER
 * ══════════════════════════════════════════════════════════════════════
 *
 *   real device GPS → reverse geocode → city → market
 *
 * Nothing in here starts from a city name somebody typed, and nothing
 * carries a hard-coded coordinate. The failure this prevents is the one
 * the app already shipped once: `city: f.city || 'Bengaluru'` stamped
 * Bengaluru on a partner standing in Mysuru, and every downstream
 * screen then told them, correctly for the data and wrongly for them,
 * that they were in the launch city.
 *
 * ══════════════════════════════════════════════════════════════════════
 * OUT OF MARKET IS NOT A REJECTION
 * ══════════════════════════════════════════════════════════════════════
 *
 * Two different partners land on COMING_SOON and they need opposite
 * things:
 *
 *   a decorator in Mysuru who works only in Mysuru
 *       → their city is not open. Capture the interest, tell the truth.
 *
 *   a decorator in Mysuru who does half their weddings in Bengaluru
 *       → they are a Bengaluru partner who happens to sleep elsewhere.
 *         Their SERVICE area is what dispatch cares about, and it is
 *         not the same field as where their phone is.
 *
 * So `marketFor()` reports a status and never a verdict. The screen asks
 * the second question before it does anything with the first.
 */

export { MARKET_STATUS }

/**
 * Fix, address, market — in one call, for the screen that needs all three.
 *
 * @param force  ignore a saved fix and ask the device again
 * @returns { ok, reason?, fix, address, market }
 */
export async function detectMarket({ force = false } = {}) {
  let fix = force ? null : readSavedLocation()
  let address = force ? null : readSavedAddress()

  if (!fix) {
    const res = await captureLocation()
    if (!res.ok) return { ok: false, reason: res.reason, fix: null, address: null, market: null }
    fix = res.fix
    address = null
  }

  if (!address) {
    address = await reverseAddress(fix.lat, fix.lng)
    if (address) saveAddress({ ...address, accuracy: fix.accuracy ?? null })
  }

  /* No address means the geocoder was unreachable, not that the partner
     is nowhere. We have coordinates and no name for them — which is not
     enough to tell somebody their city is closed, so it is reported as
     unknown rather than guessed at. */
  const market = address?.city
    ? marketCheck(address.city, address.state)
    : { status: null, market: null, city: null, state: null, knownCity: false }

  return { ok: true, fix, address, market }
}

/** The city or cities recruitment is open in, for the "do you serve…" ask. */
export const openCities = () => launchMarkets().map(m => m.city)

/**
 * Write down that somebody wants Sambramo where they are.
 *
 * Never throws and never blocks the screen. A partner who has just been
 * told we are not in their city has had enough bad news; an error toast
 * about a table they have never heard of is not the next thing they
 * need. The return value says whether it landed, for the one screen that
 * wants to say "we have saved your interest" honestly.
 */
export async function captureMarketInterest({
  profileId = null, vendorId = null,
  name = null, email = null, phone = null,
  detected = {}, requestedCity, trades = [],
  currentMarket = null, marketStatus = null, source = 'partner_app',
} = {}) {
  if (!requestedCity) return { ok: false, reason: 'no-city' }

  try {
    /* ══════════════════════════════════════════════════════════════════
       NO .select() WHEN THERE IS NOBODY TO READ IT BACK
       ══════════════════════════════════════════════════════════════════

       This screen runs BEFORE the login — that is the whole point of it
       (§22: nobody should make an account to be told we are not there
       yet). So `profileId` is usually null, and the row is anonymous.

       `.insert().select()` is INSERT ... RETURNING, and RETURNING has to
       satisfy a SELECT policy as well as the insert's own check. The
       only partner-side read policy on this table is
       `profile_id = auth.uid()`, which an anonymous row cannot satisfy —
       so the whole statement was refused, Postgres reported it as "new
       row violates row-level security policy", and the catch below
       quietly fell through to localStorage.

       The partner saw "We'll be in touch". Nothing had been written.
       That is the exact failure this feature exists to prevent, and it
       hit the commonest path. Found by check-listing-rls.mjs against a
       real session, not by reading the policy.

       Asking for the row back only when somebody is allowed to read it.
       The MI- code is for an operator's list anyway; the thank-you
       screen says the same thing without it. */
    const row = {
      profile_id: profileId,
      vendor_id: vendorId,
      partner_name: name,
      email,
      phone,
      detected_city:    detected.city    ?? null,
      detected_state:   detected.state   ?? null,
      detected_pincode: detected.postcode ?? null,
      latitude:  detected.lat ?? null,
      longitude: detected.lng ?? null,
      requested_city: requestedCity,
      trades,
      current_market: currentMarket,
      market_status:  marketStatus,
      interest_source: source,
    }

    const q = supabase.from('partner_market_interest').insert(row)
    const { data, error } = profileId
      ? await q.select('interest_code').single()
      : await q

    if (error) throw error
    /* So a second visit can say "you are already on the list" without a
       read, which the RLS policy allows but which needs a session. */
    try { localStorage.setItem(`sb_market_interest_${requestedCity}`, '1') } catch { /* private mode */ }
    return { ok: true, code: data?.interest_code ?? null }
  } catch (err) {
    /* 121 not applied yet, or no signal. Remembered locally so the
       screen does not ask the same person twice in one session. */
    try { localStorage.setItem(`sb_market_interest_${requestedCity}`, 'pending') } catch { /* ignore */ }
    return { ok: false, reason: String(err?.message ?? err) }
  }
}

/** Have they already told us about this city? */
export function alreadyInterested(city) {
  try { return !!localStorage.getItem(`sb_market_interest_${city}`) } catch { return false }
}

const SERVES_KEY = 'sb_partner_serves_city_v1'

/**
 * "I am in Mysuru and I work in Bengaluru."
 *
 * Device-local until there is a vendors row to write it to — at which
 * point it becomes the service area, which is a real column and the
 * thing dispatch actually reads. See §30: where the phone is and where
 * the work is are two different facts and must never be one column.
 */
export function rememberServesCity(city) {
  try { localStorage.setItem(SERVES_KEY, city) } catch { /* private mode */ }
}

export function servesCity() {
  try { return localStorage.getItem(SERVES_KEY) } catch { return null }
}
