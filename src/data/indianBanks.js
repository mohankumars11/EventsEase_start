/**
 * The banks a Bengaluru partner is actually likely to hold an account with.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A LIST AND NOT AN API
 * ══════════════════════════════════════════════════════════════════════
 *
 * There is no free, reliable API that enumerates Indian banks. The ones
 * that claim to are scraped copies of the RBI list, go stale after every
 * merger, and would put a network call in front of a dropdown that has
 * not meaningfully changed in two years.
 *
 * Amazon and Flipkart ship a list too. What they do NOT do is make you
 * type your branch — and that is the part this product gets from
 * `lib/ifsc.js`, which asks Razorpay's IFSC service for the branch, the
 * city and whether it supports UPI. One typed field, everything else
 * filled or chosen.
 *
 * ── Ordered by who is likely to be in it ────────────────────────────
 * Not alphabetically. The first eight cover the overwhelming majority of
 * accounts held by small businesses in Karnataka, and a dropdown that
 * opens on the answer is faster than one that opens on Axis.
 *
 * `code` is the IFSC prefix, which is what makes the dropdown do real
 * work: pick Canara, type an SBI code, and the form can say the two do
 * not agree instead of saving both and failing at payout.
 *
 * Post-merger codes only. Vijaya and Dena went into Bank of Baroda in
 * 2019; Syndicate into Canara; Corporation and Andhra into Union. Their
 * old codes still resolve at the IFSC service, so an old chequebook
 * still works — but they are not offered as choices, because choosing a
 * bank that no longer exists is not a choice.
 */
export const BANKS = [
  // ── Karnataka's own, and the ones most small businesses here use ──
  { name: 'State Bank of India',        code: 'SBIN' },
  { name: 'Canara Bank',                code: 'CNRB' },
  { name: 'Union Bank of India',        code: 'UBIN' },
  { name: 'Karnataka Bank',             code: 'KARB' },
  { name: 'HDFC Bank',                  code: 'HDFC' },
  { name: 'ICICI Bank',                 code: 'ICIC' },
  { name: 'Axis Bank',                  code: 'UTIB' },
  { name: 'Bank of Baroda',             code: 'BARB' },

  // ── The rest of the majors ────────────────────────────────────────
  { name: 'Punjab National Bank',       code: 'PUNB' },
  { name: 'Kotak Mahindra Bank',        code: 'KKBK' },
  { name: 'IndusInd Bank',              code: 'INDB' },
  { name: 'Bank of India',              code: 'BKID' },
  { name: 'Indian Bank',                code: 'IDIB' },
  { name: 'Central Bank of India',      code: 'CBIN' },
  { name: 'Indian Overseas Bank',       code: 'IOBA' },
  { name: 'UCO Bank',                   code: 'UCBA' },
  { name: 'Bank of Maharashtra',        code: 'MAHB' },
  { name: 'Punjab & Sind Bank',         code: 'PSIB' },
  { name: 'IDBI Bank',                  code: 'IBKL' },
  { name: 'Yes Bank',                   code: 'YESB' },
  { name: 'IDFC FIRST Bank',            code: 'IDFB' },
  { name: 'Federal Bank',               code: 'FDRL' },
  { name: 'South Indian Bank',          code: 'SIBL' },
  { name: 'Karur Vysya Bank',           code: 'KVBL' },
  { name: 'City Union Bank',            code: 'CIUB' },
  { name: 'Tamilnad Mercantile Bank',   code: 'TMBL' },
  { name: 'RBL Bank',                   code: 'RATN' },
  { name: 'Bandhan Bank',               code: 'BDBL' },
  { name: 'DCB Bank',                   code: 'DCBL' },
  { name: 'CSB Bank',                   code: 'CSBK' },

  // ── Small finance and payments banks, which a lot of gig workers use ──
  { name: 'AU Small Finance Bank',      code: 'AUBL' },
  { name: 'Equitas Small Finance Bank', code: 'ESFB' },
  { name: 'Ujjivan Small Finance Bank', code: 'UJVN' },
  { name: 'Jana Small Finance Bank',    code: 'JSFB' },
  { name: 'Suryoday Small Finance Bank',code: 'SURY' },
  { name: 'Airtel Payments Bank',       code: 'AIRP' },
  { name: 'India Post Payments Bank',   code: 'IPOS' },
  { name: 'Paytm Payments Bank',        code: 'PYTM' },

  // ── Co-operative, common for older family businesses ──────────────
  { name: 'Saraswat Co-operative Bank', code: 'SRCB' },
  { name: 'Cosmos Co-operative Bank',   code: 'COSB' },
  { name: 'Bharat Co-operative Bank',   code: 'BCBM' },
]

/** The IFSC prefix for a bank name, or null if we do not carry it. */
export function codeForBank(name) {
  return BANKS.find(b => b.name === name)?.code ?? null
}

/** The bank a code belongs to, for confirming what the partner picked. */
export function bankForCode(code) {
  const four = String(code ?? '').trim().toUpperCase().slice(0, 4)
  return BANKS.find(b => b.code === four)?.name ?? null
}
