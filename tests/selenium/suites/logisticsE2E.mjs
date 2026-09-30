/**
 * A logistics partner, end to end, on the real app and the real database.
 *
 *   node tests/selenium/run.mjs logistics
 *
 * A  onboarding    a throwaway partner lists L01 Mini Truck / Pickup
 *                  through the real questionnaire: every question group
 *                  answered, the supply-side price book filled (an invalid
 *                  rate refused first), signed, submitted. Then the saved
 *                  vendor_services row is read back: structured specs, the
 *                  161 match profile, the trade name the matcher joins on.
 *
 * B  the job loop  a throwaway customer's request with one L01 line,
 *                  priced by the real price book (floor ₹500, nearest ₹50),
 *                  and one dispatch offer to the partner. The partner
 *                  accepts it in the real Jobs screen; the offer and the
 *                  line change state, and the customer's own session reads
 *                  the accepted line. Everything is deleted afterwards.
 *
 * No payment, no escrow row, no real partner or customer is touched.
 */
import { By } from 'selenium-webdriver'
import { createClient } from '@supabase/supabase-js'
import { serveApp } from '../lib/harness.mjs'
import { partners, hasDatabase, loadEnv } from '../lib/partner.mjs'
import { type as typeRaw, messageOf, until_, byField } from '../lib/field.mjs'
import { loadSrc } from '../../../scripts/lib/loadSrc.mjs'

const TRADE = 'Mini Truck / Pickup'
const TERMS = '2026-09-09.v2'

export async function logisticsE2E(t) {
  const env = loadEnv()
  if (!hasDatabase(env)) {
    t.skip('logistics', 'L01 onboarding and job loop', 'no database credentials')
    return
  }
  const { priceLogisticsLine, platformSplit, LOGISTICS_PRICE_BOOK_VERSION } = await loadSrc({
    'src/data/logisticsPricing.js': ['priceLogisticsLine', 'platformSplit', 'LOGISTICS_PRICE_BOOK_VERSION'] })

  const { driver } = t
  const app = await serveApp()
  const P = partners(env)
  const madeRows = { requests: [], customers: [] }

  const tap = async el => {
    await driver.executeScript('arguments[0].scrollIntoView({ block: "center" })', el)
    try { await el.click() } catch { await driver.executeScript('arguments[0].click()', el) }
  }
  const settle = () => until_(driver, async () => (await driver.executeScript(
    'const s = document.querySelector(".splash-art"); return !s || !s.offsetParent || getComputedStyle(s).opacity === "0"')) || null, 20000)
  const body = () => driver.findElement(By.css('body')).getText()
  const buttonWith = async (text, ms = 20000) => until_(driver, async () => {
    for (const b of await driver.findElements(By.xpath(`//button[contains(normalize-space(.), ${JSON.stringify(text)})]`))) {
      if (await b.isDisplayed()) return b
    }
    return null
  }, ms, 200)
  /* Exactly this label: "Accept" must not match the "0 Accepted" tile, which opens the Calendar. */
  const exactButton = async (text, ms = 20000) => until_(driver, async () => {
    for (const b of await driver.findElements(By.xpath(`//button[normalize-space(.)=${JSON.stringify(text)}]`))) {
      if (await b.isDisplayed()) return b
    }
    return null
  }, ms, 200)
  const type = async (name, text, o) => {
    await until_(driver, async () => (await driver.findElements(byField(name))).length || null, 20000)
    return typeRaw(driver, name, text, o)
  }

  try {
    const V = await P.create('l01', {
      verification_status: 'draft', contact_phone: '9845055501', description: 'Mini truck for event goods across Bengaluru.',
      years_active: 5, city: 'Bengaluru', pincode: '560041', area: 'Jayanagar', category: TRADE,
      daily_capacity: 2, service_radius_km: 25, accepting_jobs: true, completed_steps: ['compliance'], terms_version: TERMS,
    })
    /* The matcher measures from a point, which a phone sets by GPS. */
    await P.admin.rpc('set_partner_location', { p_vendor_id: V.vendorId, p_pincode: '560041', p_lat: 12.9250, p_lng: 77.5938, p_area: 'Jayanagar' })

    /* ═══ A · Onboarding L01 through the real questionnaire ═══════════ */
    await t.test('logistics', 'L01 opens its own questionnaire from the trade', async () => {
      await P.signIn(driver, app.url, V, `/dashboard/vendor?tab=list&start=${encodeURIComponent(TRADE)}`)
      await settle()
      const b = await until_(driver, async () => { const x = await body(); return /mini truck/i.test(x) ? x : null }, 40000)
      t.assert(b, 'the Mini Truck listing flow did not open')
    })

    await t.test('logistics', 'L01 questionnaire: every question answered, reaching the price book', async () => {
      const offering = await buttonWith('Mini truck', 20000)
      t.assert(offering, 'no Mini truck offering to pick')
      await tap(offering)
      let reachedPrice = false
      for (let screen = 0; screen < 20 && !reachedPrice; screen++) {
        await driver.sleep(500)
        if ((await driver.findElements(byField('logistics_base_fare'))).length) { reachedPrice = true; break }
        /* Answer every group that has no answer yet: its first choice. */
        await driver.executeScript(`
          document.querySelectorAll('[data-question]').forEach(g => {
            const buttons = [...g.querySelectorAll('button[aria-pressed]')];
            if (buttons.length && !buttons.some(b => b.getAttribute('aria-pressed') === 'true')) buttons[0].click();
          });`)
        await driver.sleep(300)
        const next = await buttonWith('Continue', 8000)
        t.assert(next, `no Continue on questionnaire screen ${screen + 1}`)
        await tap(next)
      }
      t.assert(reachedPrice, 'never reached the logistics price book')
    })

    await t.test('logistics', 'L01 price book: "1e3" as a rate is refused and Continue does not move', async () => {
      await type('logistics_base_fare', '1e3')
      const before = await body()
      await tap(await buttonWith('Continue'))
      await driver.sleep(600)
      const m = await until_(driver, async () => { const x = await messageOf(driver, 'logistics_base_fare'); return x.invalid ? x : null })
      t.assert(m?.says, 'no message for a rate in scientific notation')
      t.assert((await driver.findElements(byField('logistics_base_fare'))).length, 'moved past the price book with an invalid rate')
      t.assert(before.length > 0, 'page not rendered')
    })

    await t.test('logistics', 'L01 price book: valid rates are accepted and the flow reaches review', async () => {
      await type('logistics_base_fare', '900')
      await type('logistics_included_km', '10')
      await type('logistics_extra_km_rate', '24')
      await type('logistics_waiting_hour_rate', '150')
      for (let i = 0; i < 6; i++) {
        if ((await driver.findElements(By.css('[aria-label="Hold to sign"]'))).length) break
        const next = await buttonWith('Continue', 8000)
        if (!next) break
        await tap(next)
        await driver.sleep(700)
      }
      t.assert((await driver.findElements(By.css('[aria-label="Hold to sign"]'))).length, 'did not reach the signature on review')
    })

    await t.test('logistics', 'L01 signed and submitted: a structured profile is saved for the matcher', async () => {
      await type('signature_name', 'Anna Ramesh')
      const hold = await driver.findElement(By.css('[aria-label="Hold to sign"]'))
      await driver.executeScript('arguments[0].scrollIntoView({ block: "center" })', hold)
      await driver.actions({ async: true }).move({ origin: hold }).press().pause(1800).release().perform()
      const submit = await buttonWith('Submit for review', 10000)
      t.assert(submit, 'no Submit after signing')
      await tap(submit)
      const row = await until_(driver, async () => {
        const { data } = await P.admin.from('vendor_services').select('id, name, category, price, specs, match_profile, is_active')
          .eq('vendor_id', V.vendorId).eq('category', TRADE).maybeSingle()
        return data ?? null
      }, 30000, 800)
      t.assert(row, 'no L01 service row was saved')
      const specs = row.specs ?? {}
      const keys = JSON.stringify(specs)
      t.assert(/vehicle_class/.test(keys) && /payload/.test(keys) && /cargo_types/.test(keys),
        `the questionnaire answers are not in the structured specs: ${keys.slice(0, 200)}`)
      t.assert(/base_fare|logistics/.test(keys), 'the supply-side price book is not in the saved specs')
      /* What the matcher reads (163): the column, or specs.match_profile when the column is '{}'. */
      const profile = row.match_profile && Object.keys(row.match_profile).length ? row.match_profile : specs.match_profile
      t.assert(profile && Object.keys(profile).length, 'no match profile for the matcher, in the column or in specs')
      t.assert((profile.serviceIds ?? []).includes('mini_truck'), `the profile does not name the canonical service id: ${JSON.stringify(profile.serviceIds)}`)
      t.assert(Number(profile.capabilityNumbers?.max_payload_kg) > 0, `no payload capacity for the L01 matcher: ${JSON.stringify(profile.capabilityNumbers)}`)
      V.serviceId = row.id
    })

    await t.test('logistics', 'L01 reopened: the saved answers load back', async () => {
      const { data } = await P.admin.from('vendor_services').select('specs').eq('id', V.serviceId).single()
      t.assert(data?.specs && Object.keys(data.specs).length > 3, 'nothing to reopen')
      await driver.get(app.url + '/dashboard/vendor?tab=account&screen=services')
      await settle()
      const b = await until_(driver, async () => { const x = await body(); return /mini truck/i.test(x) ? x : null }, 40000)
      t.assert(b, 'the saved L01 listing is not shown under My services')
    })

    /* ═══ B · The job loop: offer → accept → customer sees it ════════ */
    const demand = { distanceKm: 25, weightKg: 700 }
    const quote = priceLogisticsLine({ serviceId: 'mini_truck', demand })

    await t.test('logistics', `L01 quote: price book ${LOGISTICS_PRICE_BOOK_VERSION} gives a rounded price above the floor`, async () => {
      t.assert(quote.ok, 'the price book refused mini_truck')
      const inr = quote.amountPaise / 100
      t.assert(inr >= 500 && inr % 50 === 0, `₹${inr} is below the floor or not on ₹50`)
      t.assert(inr === 1450, `expected ₹1450 for 25 km and 700 kg (900 + 15×24 + 180, rounded), got ₹${inr}`)
    })

    /* Offers reach approved partners only (the Jobs inbox renders for
       is_verified). An operator approves, as review would. */
    await P.admin.from('vendors').update({ is_verified: true, verification_status: 'approved' }).eq('id', V.vendorId)

    const customerEmail = `tc-e2e-customer-${Date.now().toString(36)}@example.com`
    const { data: cu } = await P.admin.auth.admin.createUser({ email: customerEmail, email_confirm: true })
    madeRows.customers.push(cu.user.id)
    await P.admin.from('profiles').upsert({ id: cu.user.id, email: customerEmail, full_name: 'TC E2E Customer', role: 'customer' })

    const eventDate = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10)
    const { data: req, error: reqErr } = await P.admin.from('booking_requests').insert({
      customer_id: cu.user.id, occasion_id: 'test', occasion_name: 'TC E2E logistics test', event_date: eventDate,
      location: 'SRID=4326;POINT(77.5938 12.9250)', address_text: 'Test address, Jayanagar', city: 'Bengaluru',
      area_label: 'Jayanagar', policy_version: 'test',
    }).select('id').single()
    if (reqErr) throw new Error('booking_request: ' + reqErr.message)
    madeRows.requests.push(req.id)
    const split = platformSplit(quote.amountPaise)
    const { data: line, error: lineErr } = await P.admin.from('booking_lines').insert({
      request_id: req.id, service_id: 'mini_truck', service_name: quote.serviceName, trade: TRADE,
      /* The split real booking creation writes: fee + partner = quoted,
         which booking_lines_split_balances requires once accepted. */
      quoted_amount_paise: quote.amountPaise, status: 'dispatching',
      platform_fee_paise: split.platformFeePaise, partner_amount_paise: split.partnerPaise,
    }).select('id').single()
    if (lineErr) throw new Error('booking_line: ' + lineErr.message)
    const { data: offer, error: offErr } = await P.admin.from('dispatch_offers').insert({
      line_id: line.id, vendor_id: V.vendorId, partner_amount_paise: split.partnerPaise,
      expires_at: new Date(Date.now() + 20 * 60000).toISOString(),
    }).select('id, status').single()
    if (offErr) throw new Error('dispatch_offer: ' + offErr.message)

    await t.test('logistics', 'the partner sees the offer in the real Jobs screen', async () => {
      await driver.get(app.url + '/dashboard/vendor')
      await settle()
      /* A real partner taps the opportunity, then sees Accept and Pass. */
      const accept = await until_(driver, async () => {
        const b = await exactButton('Accept', 1500)
        if (b && /mini truck/i.test(await body())) return b
        const opp = await buttonWith('new opportunit', 1500) ?? (await driver.findElements(By.xpath('//*[contains(normalize-space(.), "new opportunit") and (self::a or self::button or @role="button")]')))[0]
        if (opp) await tap(opp)
        return null
      }, 45000, 1000)
      t.assert(accept, 'the offer did not appear on the Jobs screen')
      V.acceptBtn = accept
    })

    await t.test('logistics', 'the partner accepts; the offer and the line change state', async () => {
      await tap(await exactButton('Accept', 10000))
      const states = await until_(driver, async () => {
        const { data: o } = await P.admin.from('dispatch_offers').select('status').eq('id', offer.id).single()
        const { data: l } = await P.admin.from('booking_lines').select('status').eq('id', line.id).single()
        return o.status === 'ACCEPTED' ? { o, l } : null
      }, 20000, 800)
      t.assert(states, 'the offer was not accepted')
      t.assert(states.l.status === 'accepted', `the line is ${states.l.status}, not accepted`)
    })

    await t.test('logistics', "the customer's own session reads the accepted line", async () => {
      const { data: link } = await P.admin.auth.admin.generateLink({ type: 'magiclink', email: customerEmail })
      const cust = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
      await cust.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
      const { data, error } = await cust.from('booking_lines').select('id, status').eq('id', line.id).maybeSingle()
      t.assert(!error && data?.status === 'accepted', `customer reads ${error?.message ?? data?.status}`)
    })
  } finally {
    for (const id of madeRows.requests) {
      const { data: lines } = await P.admin.from('booking_lines').select('id').eq('request_id', id)
      for (const l of lines ?? []) await P.admin.from('dispatch_offers').delete().eq('line_id', l.id)
      await P.admin.from('booking_lines').delete().eq('request_id', id)
      await P.admin.from('booking_requests').delete().eq('id', id)
    }
    for (const id of madeRows.customers) {
      await P.admin.from('profiles').delete().eq('id', id)
      await P.admin.auth.admin.deleteUser(id)
    }
    const left = await P.cleanup()
    const { data: reqLeft } = await P.admin.from('booking_requests').select('id').eq('occasion_name', 'TC E2E logistics test')
    t.report.add({ suite: 'cleanup', name: 'every throwaway partner, customer and booking was removed',
      status: left === 0 && !(reqLeft ?? []).length ? 'passed' : 'failed',
      message: left || (reqLeft ?? []).length ? `${left} partners, ${(reqLeft ?? []).length} requests left` : '' })
    await app.close()
  }
}
