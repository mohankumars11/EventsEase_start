/**
 * Look up an IFSC code and get the bank back.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE PARTNER TYPES ELEVEN CHARACTERS AND NOTHING ELSE
 * ══════════════════════════════════════════════════════════════════════
 *
 * A bank form that asks somebody to type their bank name, their branch,
 * their city and their IFSC is four chances to get it wrong, and getting
 * it wrong sends a Saturday's earnings to a stranger.
 *
 * The IFSC already contains all of it. `ifsc.razorpay.com` is free, needs
 * no key, and answers with the bank, the branch, the city, the state and
 * whether that branch supports IMPS and UPI — which is worth knowing
 * before promising anybody an instant payout.
 *
 * Verified from a real browser on the production origin before this was
 * written, because the last API assumed to be callable from a page was
 * not:
 *
 *     { ok: true, status: 200, bank: "HDFC Bank",
 *       branch: "TULSIANI CHMBRS - NARIMAN PT", upi: true }
 *
 * A wrong code is a 404, which is a real answer and a better one than a
 * form that accepts anything and finds out at payout time.
 *
 * ── What it cannot do ───────────────────────────────────────────────
 * There is no reverse lookup. You cannot ask it for "every branch of
 * Canara Bank in Jayanagar" — no free API offers that, and the ones that
 * do are scraped and stale. So the bank is a dropdown the partner picks
 * from, and this CONFIRMS it: pick Canara, type an SBI code, and the
 * form says so rather than saving both.
 */

/* Eleven characters: four letters for the bank, a zero, then six for the
   branch. Checked before the network call so an obvious typo costs
   nothing and answers instantly. */
export const IFSC_SHAPE = /^[A-Z]{4}0[A-Z0-9]{6}$/

export function looksLikeIfsc(raw) {
  return IFSC_SHAPE.test(String(raw ?? '').trim().toUpperCase())
}

const cache = new Map()

/**
 * @returns {{ok:true, bank, branch, city, state, ifsc, upi, imps}
 *          |{ok:false, reason:'shape'|'not_found'|'offline'}}
 */
export async function lookupIfsc(raw) {
  const code = String(raw ?? '').trim().toUpperCase()
  if (!looksLikeIfsc(code)) return { ok: false, reason: 'shape' }
  if (cache.has(code)) return cache.get(code)

  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 6000)
    const res = await fetch(`https://ifsc.razorpay.com/${code}`, { signal: ctl.signal })
    clearTimeout(t)

    // 404 is the API saying "no such branch", which is the answer.
    if (res.status === 404) {
      const miss = { ok: false, reason: 'not_found' }
      cache.set(code, miss)
      return miss
    }
    if (!res.ok) return { ok: false, reason: 'offline' }

    const j = await res.json()
    const hit = {
      ok: true,
      ifsc: j.IFSC ?? code,
      bank: j.BANK ?? '',
      branch: j.BRANCH ?? '',
      city: j.CITY ?? j.CENTRE ?? '',
      state: j.STATE ?? '',
      upi: j.UPI === true,
      imps: j.IMPS === true,
    }
    cache.set(code, hit)
    return hit
  } catch {
    /* A timeout or no signal. Deliberately NOT cached and deliberately
       distinct from `not_found`: one means the code is wrong, the other
       means we could not check, and the form must not tell somebody
       their correct IFSC is invalid because a train went into a tunnel. */
    return { ok: false, reason: 'offline' }
  }
}
