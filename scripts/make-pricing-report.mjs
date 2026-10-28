#!/usr/bin/env node
/**
 * The pricing, offers, payments, escrow and tax report — as a PDF.
 *
 *   node scripts/make-pricing-report.mjs
 *   → docs/SAMBRAMO-PRICING-PAYMENTS-TAX.html and .pdf
 *
 * Every number in the charts is computed by api/_lib/listPrice.js — the
 * code the app and the server charge with — so the report cannot drift
 * from the product. Re-run it after changing a margin.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { TRADE_CODE, MARGIN_BANDS, marginPct, toList, applyOffer, advanceFloor, PAY_RULES } from '../api/_lib/listPrice.js'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const FEE = 0.08
const NAMES = {
  catering_food: 'Catering', photography: 'Photography', videography: 'Videography', decoration_floral: 'Décor & flowers', venue: 'Venue',
  dj_music: 'DJ & music', live_entertainment: 'Live entertainment', bridal_makeup_hair: 'Makeup & hair', wedding_planning: 'Wedding planner',
  tent_furniture: 'Tents & furniture', invitation_printing: 'Invitations', transportation: 'Transport coordination', event_lighting: 'Lighting',
  cake_desserts: 'Cakes & desserts', mehendi_artist: 'Mehendi', anchor_mc: 'Anchor & emcee', sound_av: 'Sound & AV', valet_parking: 'Valet parking',
  security_services: 'Security', bar_beverages: 'Drinks & ice cream', guest_services: 'Hosts & ushers', power_cooling: 'Power & cooling',
  safety_facilities: 'Clean-up & safety', priest_rituals: 'Priest & rituals', gifts_favours: 'Return gifts', trousseau_gift_packing: 'Trousseau packing',
  mini_truck_pickup: 'Mini truck', medium_large_goods_vehicle: 'Goods truck', passenger_transport: 'Guest transport', event_equipment_rental: 'Equipment rental',
  loading_unloading_crew: 'Loading crew', warehouse_storage: 'Storage', event_materials_supplier: 'Event supplies', end_to_end_event_logistics: 'Event logistics',
}
const band = p => (p >= MARGIN_BANDS.everyday ? 'Everyday' : p >= MARGIN_BANDS.mid ? 'Mid-ticket' : 'Big-ticket')
const inr = p => `₹${Math.round(p / 100).toLocaleString('en-IN')}`
const pct = f => `${Math.round(f * 100)}%`
const WELCOME = { terms: { pct: 25, cap_paise: 250000 } }, REF25 = { terms: { pct: 25, cap_paise: 250000 } }, REF5 = { terms: { pct: 5, cap_paise: 100000 } }
function row(trade, P) {
  const L = toList(P, trade), partner = Math.round(P * (1 - FEE))
  const at = v => L - applyOffer([{ list: L, base: P, due: L }], v)[0].discount
  return { P, L, partner, keep: L - partner, w: at(WELCOME), r25: at(REF25), r5: at(REF5) }
}
const trades = Object.keys(TRADE_CODE).sort((a, b) => marginPct(b) - marginPct(a) || NAMES[a].localeCompare(NAMES[b]))
const example = { 'Everyday': 'decoration_floral', 'Mid-ticket': 'photography', 'Big-ticket': 'catering_food' }
const SIZES = [500000, 2500000, 5000000, 10000000, 50000000, 100000000]

const css = `
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; } body { font-family: 'Segoe UI', Manrope, Arial, sans-serif; color: #1B0B33; font-size: 10.5pt; line-height: 1.45; margin: 0; }
h1 { font-size: 24pt; margin: 0 0 4pt; letter-spacing: -0.02em; } h2 { font-size: 15pt; margin: 18pt 0 6pt; color: #3B1670; border-bottom: 2px solid #EDE4FF; padding-bottom: 3pt; page-break-after: avoid; }
h3 { font-size: 11.5pt; margin: 10pt 0 4pt; } p { margin: 4pt 0; } .muted { color: #6B6280; } .small { font-size: 9pt; }
table { width: 100%; border-collapse: collapse; margin: 6pt 0; font-size: 9.4pt; page-break-inside: auto; } tr { page-break-inside: avoid; }
th { background: #F3ECFF; color: #3B1670; text-align: left; padding: 4pt 6pt; font-weight: 700; } td { padding: 3.5pt 6pt; border-bottom: 1px solid #EFEAF5; }
td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; } .pill { display: inline-block; padding: 1pt 6pt; border-radius: 8pt; font-size: 8.5pt; font-weight: 700; }
.e { background: #FCE7F3; color: #9D174D; } .m { background: #EDE4FF; color: #5B21A8; } .b { background: #E7F8EF; color: #0B7A4B; }
.box { border: 1px solid #E6DDF5; border-radius: 8pt; padding: 8pt 10pt; margin: 6pt 0; background: #FBF9FE; page-break-inside: avoid; }
.warn { border-color: #F5D58A; background: #FFF9EA; } .ok { border-color: #BFE8D2; background: #F1FBF5; }
.cover { background: linear-gradient(135deg, #1B0B33, #5B21A8); color: #fff; border-radius: 12pt; padding: 18pt; margin-bottom: 10pt; } .cover .muted { color: #D9CCF5; }
.flow { display: flex; gap: 6pt; margin: 6pt 0; } .flow div { flex: 1; background: #F3ECFF; border-radius: 8pt; padding: 6pt; text-align: center; font-size: 9pt; } .flow b { display: block; font-size: 10pt; }
ul { margin: 4pt 0 4pt 16pt; padding: 0; } li { margin: 2pt 0; } a { color: #5B21A8; } .pb { page-break-before: always; }`

const bandRows = Object.entries(example).map(([b, t]) => {
  const rows = SIZES.map(P => row(t, P))
  return `<h3>${b} — e.g. ${NAMES[t]} (+${pct(marginPct(t))} margin)</h3>
<table><tr><th class="n">Partner price</th><th class="n">Sambramo price</th><th class="n">First booking (25% ≤ ₹2,500)</th><th class="n">Referral 25%</th><th class="n">Referral 5%</th><th class="n">Partner gets</th><th class="n">Sambramo keeps*</th></tr>
${rows.map(r => `<tr><td class="n">${inr(r.P)}</td><td class="n"><b>${inr(r.L)}</b></td><td class="n">${inr(r.w)}</td><td class="n">${inr(r.r25)}</td><td class="n">${inr(r.r5)}</td><td class="n">${inr(r.partner)}</td><td class="n">${inr(r.keep)} (${pct(r.keep / r.L)})</td></tr>`).join('')}</table>`
}).join('')

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Sambramo — pricing, payments, escrow and tax</title><style>${css}</style></head><body>
<div class="cover"><h1>Sambramo: pricing, offers, payments, escrow &amp; tax</h1>
<p class="muted">Prepared for Mohan, 28 October 2026 · every figure computed by <code>api/_lib/listPrice.js</code>, the code the app and the server charge with.</p></div>

<h2>1. The model in one line</h2>
<p><b>Customer price = partner price + Sambramo margin.</b> The partner keeps exactly what they keep today (their price minus the 8% fee). The customer sees one final price and the bill says <b>“Booking fee ₹0”</b> — true, because nothing is added at the end.</p>
<div class="box ok"><b>Sambramo earns twice on every booking:</b> the margin on top (paid by the customer) and the 8% fee (taken from the partner). Every offer comes <b>only out of the margin</b> — no offer can take a booking below the partner’s own price, so the partner is always paid in full and the 8% is always earned. Verified across 1,904 simulated journeys (34 trades × 7 prices × 4 offers × 2 payment styles) and against live listings.</div>
<div class="box warn"><b>Why no fake “was ₹X” prices.</b> A struck-out price that no customer ever paid is a false statement of price under the Consumer Protection Act 2019 (s.2(47), unfair trade practice). The Sambramo price is a real price — it is what every customer without an offer pays — so “25% off” is a real saving. The same rule is why the bill shows “Booking fee ₹0” but never a struck-out fee.</div>

<h2>2. Margin by trade (the commission on top)</h2>
<p>Three bands, falling with the size of a typical ticket: a ₹10 lakh wedding is compared rupee by rupee and is where customers phone the partner directly; a ₹15k balloon set-up is a convenience buy. Any trade, in any city, can be changed without an app update (table <code>sambramo_margins</code>, migration 193).</p>
<table><tr><th>Trade</th><th>Band</th><th class="n">Margin on top</th><th class="n">Sambramo’s total take*</th><th class="n">Minimum advance</th></tr>
${trades.map(t => { const m = marginPct(t), b = band(m); return `<tr><td>${NAMES[t]}</td><td><span class="pill ${b[0].toLowerCase()}">${b}</span></td><td class="n">+${pct(m)}</td><td class="n">${pct((m + FEE) / (1 + m))}</td><td class="n">${advanceFloor(t) >= 1 ? 'Full' : pct(advanceFloor(t))}</td></tr>` }).join('')}
</table>
<p class="small muted">* Total take = (margin + 8% fee) as a share of the price the customer pays, before payment-gateway charges and tax.</p>

<h2 class="pb">3. Price charts — what everyone pays and keeps</h2>
${bandRows}
<p class="small muted">* Sambramo keeps = customer price − partner’s amount (margin + 8% fee), before Razorpay’s charges (~2% on cards/UPI-credit; UPI-debit is usually free) and tax. With an offer, subtract the saving shown.</p>

<h2>4. Offers and codes</h2>
<table><tr><th>Offer</th><th>Who</th><th>Value</th><th>Rules</th><th>Code</th></tr>
<tr><td>Welcome</td><td>Every new customer, at sign-up (scratch card)</td><td>25% off, up to ₹2,500</td><td>First booking · 30 days · one per person</td><td>SAMBRAMO25-XXXXXX</td></tr>
<tr><td>Free first invitation</td><td>Every new customer</td><td>₹299 invitation free</td><td>First invitation · 90 days</td><td>SAMBRAMO-RSVP-XXXXXX</td></tr>
<tr><td>Referral (the referrer)</td><td>Per friend who signed up with your code</td><td>25% off next event (≤ ₹2,500) + 5% off the one after (≤ ₹1,000)</td><td>Unlocks only when the friend has booked, paid and completed an event AND you have completed one of your own · claimed on the Refer page · 180 / 365 days</td><td>SAMBRAMO-REF25-… / SAMBRAMO-REF5-…</td></tr>
<tr><td>Referral (the friend)</td><td>The person invited</td><td>The welcome offer</td><td>Must sign up with the code before the first booking</td><td>—</td></tr></table>
<p><b>Codes are unique per person:</b> six random characters from an alphabet without 0/O/1/I, a unique index in the database, and a retry on the one-in-a-billion collision. A code is a label, not a bearer token — only its owner’s account can use it. <b>One offer per booking</b>; the server re-checks every offer at payment (owner, unused, unexpired, first booking) and takes it off the Razorpay order.</p>
<h3>Does 25% + 5% make sense?</h3>
<p>Yes, as two offers on two future bookings rather than one 30% discount: it brings the referrer back twice (the habit), it is paid only after two completed events (it cannot be farmed with fake accounts), and because offers live inside the margin it never costs the partner anything. A single 30% off would exceed the margin on every Mid and Big-ticket trade.</p>

<h2>5. When the money is due</h2>
<table><tr><th>Booking</th><th>What the customer pays</th></tr>
<tr><td>Under ${inr(PAY_RULES.fullBelowPaise)}</td><td>In full, at booking</td></tr>
<tr><td>Event ${PAY_RULES.fullWithinDays} days away or less</td><td>In full, at booking</td></tr>
<tr><td>${inr(PAY_RULES.fullBelowPaise)} and above, event further out</td><td>Customer chooses: <b>advance</b> (the partner’s advance %, never under the trade’s minimum above) or <b>pay in full</b> (marked Recommended). Balance due ${PAY_RULES.balanceDaysBefore} days before the event.</td></tr></table>
<p>The minimum advance follows what the partner must spend before the day: <b>100%</b> invitations &amp; priest (production/samagri starts at once), <b>50%</b> trades that buy goods (catering, décor, cakes, drinks, gifts, trousseau, supplies) and venues (they turn other bookings away), <b>30%</b> light consumables, <b>20%</b> labour, own equipment and vehicles.</p>

<h2>6. Escrow — where every rupee sits</h2>
<div class="flow"><div><b>1 · Pay</b>Razorpay order for exactly what the server computed</div><div><b>2 · Held</b>escrow_ledger HOLD = what was captured</div><div><b>3 · Partner share on hold</b>Razorpay Route transfer, on hold</div><div><b>4 · Event delivered</b>after the delivery window</div><div><b>5 · Released</b>partner’s transfer released; the rest booked as Sambramo’s</div></div>
<ul>
<li><b>Partner share</b> = captured × partner amount ÷ what the customer owes on the line. Advance + balance add up to exactly the partner’s amount (verified).</li>
<li><b>Sambramo’s margin + fee</b> = what stays in escrow after the partner’s transfer; released to the platform at settlement (RELEASE_PLATFORM).</li>
<li><b>Offers</b> are recorded per line (booking_line_discounts) at capture, so the balance never charges a saving back, and refunds are on what was actually paid.</li>
<li><b>Materials (procurement):</b> for trades that buy goods before the event, the partner can claim a materials advance against bills and photos (migrations 20261013_01/02); it is recovered from the payout at settlement. The minimum customer advance in section 5 is set so that money is always already in escrow before it is advanced.</li>
<li>Partners without a Route account stay on the manual payout path (operator-settled, migration 139: settlement requires held ≥ the partner’s price — guaranteed because offers never go below it).</li></ul>

<h2 class="pb">7. Tax — what is real, and what to ask your CA</h2>
<h3>The 3-year income-tax holiday (Section 80-IAC)</h3>
<ul>
<li><b>What it is:</b> 100% deduction of profits for <b>any 3 consecutive years</b> out of the first 10 years from incorporation. It is <b>income tax only</b> — it does not touch GST.</li>
<li><b>Who qualifies:</b> a <b>Private Limited company or LLP</b> (not a proprietorship or partnership firm), incorporated on or after 1 April 2016 and <b>before 1 April 2030</b> (extended by Finance Act 2025); turnover up to <b>₹100 crore</b>; not formed by splitting up or reconstructing an existing business; working towards innovation or a scalable model with high potential for jobs or wealth.</li>
<li><b>How:</b> (1) DPIIT recognition on the Startup India portal, then (2) a separate application (Form 80-IAC) to the <b>Inter-Ministerial Board</b>, which must issue a certificate. DPIIT recognition alone does not give the holiday; the IMB approves only a minority of applicants, so the pitch must show the innovation (Sambramo’s instant pricing engine, escrow, 34-trade marketplace).</li>
<li><b>Udyam is not required</b> for 80-IAC. Udyam (MSME) gives different benefits: priority-sector and collateral-free (CGTMSE) loans, the 45-day payment protection, procurement preferences and state subsidies. Get both.</li>
<li><b>Catches:</b> MAT (15% of book profit) still applies to a company claiming 80-IAC under the old regime; the 22% regime (s.115BAA) does not allow 80-IAC at all. The new Income-tax Act 2025 is reported to carry the holiday forward (as section 140) — confirm the section numbers with your CA.</li>
<li><b>Other DPIIT benefits:</b> angel-tax provision removed for all investors (Finance Act 2024); self-certification under several labour and environmental laws; 80% rebate on patent and 50% on trademark fees with fast-tracked examination; Seed Fund and credit-guarantee schemes; relaxed criteria in public procurement.</li></ul>
<h3>GST — there is no startup exemption</h3>
<ul>
<li><b>Sambramo must register for GST from day one</b>, whatever its turnover, as an e-commerce operator (CGST s.24(x)), and <b>collect TCS of 1%</b> (0.5% CGST + 0.5% SGST) on partners’ net taxable supplies made through the app (s.52), filing GSTR-8 monthly.</li>
<li><b>Partners:</b> service providers below ₹20 lakh aggregate turnover can supply through an e-commerce operator without registering (notification 65/2017); above it they register and invoice with GST.</li>
<li><b>Rates (indicative, after the Sept 2025 rationalisation — confirm per SAC):</b> event management 18%; photography, décor, sound, lighting, rentals 18%; outdoor catering 5% without input credit or 18% with it, depending on how it is supplied and billed; hotel rooms ≤ ₹7,500 a night 5%; beauty services were moved to 5% without credit — check whether bridal makeup falls there.</li></ul>
<div class="box warn"><b>The one decision to take with your CA before launch: who invoices the customer.</b><br>
<b>(A) Marketplace</b> — the partner invoices the customer for the full Sambramo price; Sambramo invoices the partner for margin + fee (18% GST) and collects 1% TCS. Simple for Sambramo, but the partner’s invoice shows the marked-up price.<br>
<b>(B) Sambramo as the seller</b> — Sambramo invoices the customer for everything (18% or the service’s rate on the full price) and takes input credit on registered partners’ invoices; unregistered partners give no credit, so GST is on the full price. Sambramo becomes the supplier, with the liability that brings.<br>
This decides whether GST is charged on the margin or on the whole booking, and whether the price shown must include it. Until it is decided, the bill says only that the price is final and nothing is added.</div>

<h2>8. What you need to do</h2>
<ul>
<li><b>Migration 193 is live</b> (you pasted it): unique SAMBRAMO codes, offer records and margins are working — verified live, 12 of 12 checks. <b>Paste migration 194</b> next: 193’s referral tracker shared a name with the partner programme’s, so the Refer page’s tracker reads “Live at launch” until 194 renames it (the partner app is unaffected).</li>
<li><b>Deploy the API before real payments.</b> The APK talks to the laptop server (new code), but Razorpay’s webhook goes to production, which still runs the old capture code — it would size a Route partner’s on-hold transfer on the quote instead of on what the customer owes. Test-mode payments are safe.</li>
<li><b>Keep the laptop API server running</b> (<code>node --env-file=.env scripts/serve-api-local.mjs</code>) on the same Wi-Fi when testing the APK — the APK’s payments and bookings go to it. Live Razorpay tests after your web deploy.</li>
<li><b>Decide with your CA:</b> invoicing model (A or B), GST registration as e-commerce operator, and whether to apply for DPIIT + 80-IAC now.</li>
<li><b>Lawyer:</b> review the cancellation, terms (now with prices, offers and referrals) and privacy policy; name the Grievance Officer.</li>
<li><b>Next to build:</b> balance-due reminders and the auto-cancel job for unpaid balances; the materials-advance cap check against escrow.</li></ul>

<h2>Sources (tax)</h2>
<ul class="small">
<li><a href="https://www.startupindia.gov.in/content/sih/en/startup-scheme.html">Startup India — DPIIT recognition</a> · <a href="https://www.incometaxindia.gov.in/income-from-business/profession-taxation-of-start-ups">Income Tax Department — taxation of start-ups</a></li>
<li><a href="https://www.businesstoday.in/amp/entrepreneurship/start-up/story/how-startups-can-legally-pay-zero-tax-for-three-years-expert-explains-tax-breakup-482733-2025-07-02">Business Today — 80-IAC, MAT</a> · <a href="https://www.setindiabiz.com/blog/section-80-iac-tax-exemption-startups-guide">Setindiabiz — 80-IAC guide 2026</a> · <a href="https://www.khuranaandkhurana.com/turnover-thresholds-for-start-up-tax-holiday-changes-in-2026-and-implications-for-funded-start-ups">Khurana &amp; Khurana — 2026 thresholds</a> · <a href="https://ssrana.in/articles/section-80-iac-of-the-income-tax-act-1961-a-comprehensive-guide-for-startups-in-india/">S.S. Rana — 80-IAC</a></li>
<li><a href="https://www.patronaccounting.com/blog/dpiit-startup-recognition-vs-udyam-registration">Patron — DPIIT vs Udyam</a> · <a href="https://www.gstcouncil.gov.in/sites/default/files/2024-02/faqs_tcs.pdf">GST Council — TCS FAQs</a> · <a href="https://taxguru.in/goods-and-service-tax/e-commerce-operator-under-gst.html">Taxguru — e-commerce operator under GST</a></li>
<li><a href="https://cleartax.in/s/gst-on-event-management">ClearTax — GST on event management</a> · <a href="https://busy.in/sac-code-998596/">Busy — SAC 998596</a> · <a href="https://disytax.com/gst-for-catering-business/">Disytax — GST for catering 2026</a></li></ul>
<p class="small muted">This is research to take to a Chartered Accountant, not tax advice. Secondary sources disagree on some points (marked “confirm”); the statute and CBIC/CBDT notifications decide.</p>
</body></html>`

const out = join(ROOT, 'docs/SAMBRAMO-PRICING-PAYMENTS-TAX.html')
writeFileSync(out, html)
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
const pdf = out.replace(/\.html$/, '.pdf')
const r = spawnSync(EDGE, ['--headless=new', '--disable-gpu', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'pdf-'))}`, '--no-pdf-header-footer', `--print-to-pdf=${pdf}`, `file:///${out.replace(/\\/g, '/')}`], { stdio: 'ignore', timeout: 90000 })
console.log(existsSync(pdf) ? `  ${pdf}` : `  PDF failed (${r.status}); open ${out} and print`)
