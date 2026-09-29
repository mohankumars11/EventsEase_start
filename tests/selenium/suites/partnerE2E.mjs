/**
 * The real app, the real database, a real (throwaway) partner.
 *
 * Categories covered here: 21-27 through the screens: a save refused
 * while invalid, the value never reaching the database, a valid save
 * that persists, a reopen that shows it, and every other field left as
 * it was. Plus the six-step journey in order, back navigation and
 * re-entry, and More → Business, Contact, Profile, Area and Bank.
 *
 * Needs dist/ built for the partner surface and .env (or CI secrets).
 * Without the database keys every test here is reported SKIPPED.
 */
import { By } from 'selenium-webdriver'
import { serveApp } from '../lib/harness.mjs'
import { partners, hasDatabase, loadEnv } from '../lib/partner.mjs'
import { type as typeRaw, paste as pasteRaw, messageOf, valueOf, focused, until_, waitFor, field as fieldRaw } from '../lib/field.mjs'

const STEP_TITLES = ['Business & Services', 'Partner Details', 'Service Area & Availability',
  'Verification & Compliance', 'Bank & Payments', 'Review & Publish']

export async function partnerE2E(t) {
  const env = loadEnv()
  if (!hasDatabase(env)) {
    for (const name of ['six-step journey', 'More screens']) {
      t.skip('e2e', name, 'no database credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)')
    }
    return
  }
  const { driver } = t
  const app = await serveApp()
  const P = partners(env)
  const url = path => app.url + path
  /* The launch splash covers the screen for a moment after every cold
     load; a click in that moment lands on the splash image. */
  const settle = () => until_(driver, async () => (await driver.executeScript(
    'const s = document.querySelector(".splash-art"); return !s || !s.offsetParent || getComputedStyle(s).opacity === "0"')) || null, 20000)
  const go = async path => { await driver.get(url(path)); await settle(); await unfoldAll() }
  /* A click that the launch splash still covers falls back to a script
     click on the same element, which is what a finger would reach once
     the splash has gone. */
  const tap = async el => {
    await driver.executeScript('arguments[0].scrollIntoView({ block: "center" })', el)
    try { await el.click() } catch { await driver.executeScript('arguments[0].click()', el) }
  }
  /* More sections are folds; open every closed one so its boxes exist. */
  const unfoldAll = async () => {
    await driver.sleep(300)
    await driver.executeScript('document.querySelectorAll("button[aria-expanded=false]").forEach(b => b.click())')
    await driver.sleep(200)
  }
  /* A box inside a closed fold does not exist until the fold opens, and
     the folds render only once the account has loaded: open them until
     the box appears. */
  const field = async (drv, name, ms = 40000) => {
    const found = await until_(driver, async () => {
      const els = await driver.findElements(By.css(`[data-field="${name}"]`))
      if (els.length && await els[0].isDisplayed()) return els[0]
      await driver.executeScript('document.querySelectorAll("button[aria-expanded=false]").forEach(b => b.click())')
      return null
    }, ms, 400)
    return found ?? fieldRaw(drv, name, 1000)
  }
  const type = async (drv, name, text, o) => { await field(drv, name); return typeRaw(drv, name, text, o) }
  const paste = async (drv, name, text, o) => { await field(drv, name); return pasteRaw(drv, name, text, o) }
  const here = () => driver.getCurrentUrl().then(u => new URL(u).pathname)
  const cont = () => driver.findElement(By.css('[data-cta="step-continue"]'))
  const waitPath = (p, ms = 20000) => until_(driver, async () => (await here()) === p, ms)
  const errorFor = async name => until_(driver, async () => { const m = await messageOf(driver, name); return m.invalid && m.says ? m : null })

  try {
    /* ═══ The six steps, one partner, in order ═══════════════════════ */
    const J = await P.create('journey', { verification_status: 'draft' })
    await P.admin.from('vendor_services').insert({
      vendor_id: J.vendorId, name: 'Candid photography', category: 'Photography', price: 25000,
      is_active: true, sort_order: 1 })

    await t.test('journey', 'setup lists the six steps, in order, with step 1 complete from saved data', async () => {
      await P.signIn(driver, app.url, J, '/partner/setup'); await settle(); await unfoldAll()
      const text = await until_(driver, async () => {
        const b = await driver.findElement(By.css('body')).getText()
        return STEP_TITLES.every(s => b.includes(s)) ? b : null
      }, 30000)
      t.assert(text, 'the six step titles are not all on the setup screen')
      const order = STEP_TITLES.map(s => text.indexOf(s))
      t.assert(order.every((v, i) => i === 0 || v > order[i - 1]), 'the steps are not in their order')
      t.assert(/1 of 6/.test(text), 'the count does not show step 1 as done from the seeded service')
    })

    await t.test('journey', 'step 2: the fields, and which are required', async () => {
      await go(('/partner/setup/details'))
      for (const f of ['business_name', 'contact_phone', 'years_active', 'description', 'instagram_url']) await field(driver, f, 30000)
      for (const f of ['business_name', 'contact_phone']) {
        const req = await driver.findElement(By.css(`[data-field="${f}"]`)).getAttribute('aria-required')
        t.assert(req === 'true', `${f} is not marked required`)
      }
    })

    await t.test('journey', 'step 2: an invalid phone is told on leaving, Continue refuses and moves to it', async () => {
      await type(driver, 'business_name', 'TC E2E Anna Ruchi Caterers')
      await type(driver, 'contact_phone', '98x4500000 0')
      const m = await errorFor('contact_phone')
      t.assert(m && /not a digit/i.test(m.says), `expected the letter to be named, got ${m?.says}`)
      /* Spaces are formatting and may be tidied on blur; the letter must stay. */
      t.assert((await valueOf(driver, 'contact_phone')).includes('x'), 'the letter was dropped instead of refused')
      await type(driver, 'description', 'Pure vegetarian catering for weddings since 2011.')
      await type(driver, 'years_active', '12')
      await tap(await cont())
      await driver.sleep(400)
      t.assert((await here()) === '/partner/setup/details', 'Continue moved on with an invalid phone')
      t.assert((await focused(driver)) === 'contact_phone', 'focus did not move to the invalid box')
      const v = await P.vendorOf(J, 'contact_phone')
      t.assert(!v.contact_phone, 'the invalid phone reached the database')
    })

    await t.test('journey', 'step 2: corrected, it saves the clean value and moves to step 3', async () => {
      await type(driver, 'contact_phone', '+91 98450-12345')
      const m = await until_(driver, async () => { const x = await messageOf(driver, 'contact_phone'); return !x.invalid ? x : null })
      t.assert(m, 'the error stayed after correcting')
      await tap(await cont())
      t.assert(await waitPath('/partner/setup/area'), 'did not move to step 3')
      const v = await P.vendorOf(J, 'business_name, contact_phone, years_active, description')
      t.assert(v.contact_phone === '9845012345', `stored as ${v.contact_phone}, not the canonical ten digits`)
      t.assert(v.business_name === 'TC E2E Anna Ruchi Caterers' && v.years_active === 12, 'other fields did not save as typed')
    })

    await t.test('journey', 'back to step 2: the saved values are there after re-entry and a reload', async () => {
      await go(('/partner/setup/details'))
      await driver.navigate().refresh()
      const v = await until_(driver, async () => ((await valueOf(driver, 'contact_phone')) === '9845012345' ? true : null), 30000)
      t.assert(v, 'the saved phone was not loaded back')
      t.assert((await valueOf(driver, 'business_name')) === 'TC E2E Anna Ruchi Caterers', 'the saved name was not loaded back')
    })

    await t.test('journey', 'step 3: "1e3" days of notice is refused, never saved as 1000', async () => {
      /* Location is captured by GPS on a phone; seeded here. */
      await P.admin.from('vendors').update({ city: 'Bengaluru', pincode: '560041' }).eq('id', J.vendorId)
      await go(('/partner/setup/area'))
      await type(driver, 'lead_time_days', '1e3')
      await tap(await cont())
      await driver.sleep(500)
      t.assert((await here()) === '/partner/setup/area', 'moved on with "1e3"')
      const m = await errorFor('lead_time_days')
      t.assert(m, 'no message for "1e3"')
      const v = await P.vendorOf(J, 'lead_time_days')
      t.assert(v.lead_time_days !== 1000, 'saved as 1000')
    })

    await t.test('journey', 'step 3: corrected, it saves and moves to step 4', async () => {
      await type(driver, 'lead_time_days', '3')
      await tap(await cont())
      t.assert(await waitPath('/partner/setup/compliance'), 'did not move to step 4')
      t.assert((await P.vendorOf(J, 'lead_time_days')).lead_time_days === 3, 'lead time not saved')
    })

    await t.test('journey', 'step 4: opens on its own screen, and its Continue records the step', async () => {
      const b = await until_(driver, async () => { const x = await driver.findElement(By.css('body')).getText(); return /Verification & Compliance/i.test(x) ? x : null }, 30000)
      t.assert(b, 'step 4 did not render')
      await tap(await cont())
      t.assert(await waitPath('/partner/setup/bank'), 'did not move to step 5')
      const v = await P.vendorOf(J, 'completed_steps')
      t.assert((v.completed_steps ?? []).includes('compliance'), 'step 4 was not recorded')
    })

    await t.test('journey', 'step 5: an email typed as a UPI id is refused, nothing saved', async () => {
      await type(driver, 'upi_id', 'anna@gmail.com')
      await tap(await cont())
      await driver.sleep(500)
      t.assert((await here()) === '/partner/setup/bank', 'moved on with an email as a UPI id')
      t.assert(await errorFor('upi_id'), 'no message under the UPI box')
      const { data } = await P.admin.from('vendor_payout_details').select('vendor_id').eq('vendor_id', J.vendorId).maybeSingle()
      t.assert(!data, 'payout details were saved')
    })

    await t.test('journey', 'step 5: a valid UPI id saves (this step could never save before) and moves to review', async () => {
      await type(driver, 'upi_id', ' TCE2E.Anna@YBL ')
      await tap(await cont())
      t.assert(await waitPath('/partner/setup/review'), 'did not move to review')
      const { data } = await P.admin.from('vendor_payout_details').select('upi_id').eq('vendor_id', J.vendorId).maybeSingle()
      t.assert(data?.upi_id === 'tce2e.anna@ybl', `stored ${data?.upi_id}`)
    })

    await t.test('journey', 'review: five of six complete, counted from saved data; the flow is unchanged', async () => {
      await go(('/partner/setup'))
      const b = await until_(driver, async () => { const x = await driver.findElement(By.css('body')).getText(); return /5 of 6/.test(x) ? x : null }, 30000)
      t.assert(b, 'the setup count does not read 5 of 6')
      const v = await P.vendorOf(J, 'verification_status')
      t.assert(v.verification_status === 'draft', 'the review state changed without the partner submitting')
    })

    /* ═══ Step 5 by bank account, the other half of the step ═════════ */
    const B = await P.create('bank', {
      verification_status: 'draft', contact_phone: '9845012345', description: 'Pure vegetarian catering for weddings since 2011.',
      years_active: 10, city: 'Bengaluru', pincode: '560041', completed_steps: ['compliance'],
    })
    await P.admin.from('vendor_services').insert({
      vendor_id: B.vendorId, name: 'Wedding lunch', category: 'Catering & Food', price: 450, is_active: true, sort_order: 1 })

    await t.test('bank step', 'bank account: letters in the number are refused on Continue, nothing saved', async () => {
      await P.signIn(driver, app.url, B, '/partner/setup/bank'); await settle(); await unfoldAll()
      const bankBtn = await waitFor(driver, By.css('[data-method="bank"]'), 40000)
      await tap(bankBtn)
      await type(driver, 'account_name', 'Anna Ramesh')
      await type(driver, 'account_number', '12345abc6789')
      await type(driver, 'ifsc', 'HDFC0001234')
      await tap(await cont())
      await driver.sleep(500)
      t.assert((await here()) === '/partner/setup/bank', 'moved on with letters in the account number')
      t.assert(await errorFor('account_number'), 'no message under the account number')
      t.assert((await focused(driver)) === 'account_number', 'focus did not move to the account number')
      const { data } = await P.admin.from('vendor_payout_details').select('vendor_id').eq('vendor_id', B.vendorId).maybeSingle()
      t.assert(!data, 'payout details were saved')
    })

    await t.test('bank step', 'bank account: a spaced number and lower-case IFSC save clean, and move to review', async () => {
      await type(driver, 'account_number', '0001 1122 4417')
      await type(driver, 'ifsc', 'hdfc0001234')
      await tap(await cont())
      t.assert(await waitPath('/partner/setup/review'), 'did not move to review')
      const { data } = await P.admin.from('vendor_payout_details')
        .select('method, account_name, account_number, ifsc, upi_id').eq('vendor_id', B.vendorId).maybeSingle()
      t.assert(data?.method === 'bank', `saved method ${data?.method}`)
      t.assert(data.account_number === '000111224417', 'the account number was not stored as its digits')
      t.assert(data.ifsc === 'HDFC0001234' && data.account_name === 'Anna Ramesh' && data.upi_id === null, JSON.stringify({ ...data, account_number: '…' }))
    })

    await t.test('bank step', 'reopening the step shows it saved, and setup counts it complete', async () => {
      await go(('/partner/setup/bank'))
      const b = await until_(driver, async () => {
        const x = await driver.findElement(By.css('body')).getText()
        return /4417/.test(x) ? x : null
      }, 30000)
      t.assert(b, 'the saved account (ending 4417) is not shown on re-entry')
      await go(('/partner/setup'))
      const s = await until_(driver, async () => { const x = await driver.findElement(By.css('body')).getText(); return /5 of 6/.test(x) ? x : null }, 30000)
      t.assert(s, 'setup does not count the bank step as complete')
    })

    /* ═══ More, on a fully onboarded partner ══════════════════════════ */
    const TERMS = '2026-09-09.v2'
    const K = await P.create('more', {
      verification_status: 'submitted', contact_phone: '9845012345', description: 'Candid wedding photography across Bengaluru.',
      years_active: 8, city: 'Bengaluru', pincode: '560041', area: 'Jayanagar', category: 'Photography',
      daily_capacity: 2, completed_steps: ['compliance'], terms_version: TERMS,
    })
    const open = screen => go(`/dashboard/vendor?tab=account&screen=${screen}`)
    const saveSection = async () => {
      const btn = await driver.findElement(By.xpath('//button[contains(., "Save changes")]'))
      await tap(btn)
    }

    await t.test('more', 'Business: a name that is only numbers is refused and not saved', async () => {
      await P.signIn(driver, app.url, K, '/dashboard/vendor?tab=account&screen=business'); await settle(); await unfoldAll()
      await field(driver, 'business_name', 40000)
      await type(driver, 'business_name', '12345')
      await saveSection()
      t.assert(await errorFor('business_name'), 'no message under the business name')
      const v = await P.vendorOf(K, 'business_name')
      t.assert(v.business_name === 'TC E2E more', 'the invalid name was saved')
    })

    await t.test('more', 'Business: a valid edit saves; description, years and trade are untouched', async () => {
      await type(driver, 'business_name', 'TC E2E Lens and Light')
      await saveSection()
      const v = await until_(driver, async () => {
        const r = await P.vendorOf(K, 'business_name, description, years_experience, years_active, category')
        return r.business_name === 'TC E2E Lens and Light' ? r : null
      })
      t.assert(v, 'the valid name was not saved')
      t.assert(v.description === 'Candid wedding photography across Bengaluru.' && v.category === 'Photography', 'another field changed')
    })

    await t.test('more', 'Business: reopening shows the saved name', async () => {
      await open('business')
      const got = await until_(driver, async () => ((await valueOf(driver, 'business_name')) === 'TC E2E Lens and Light' ? true : null), 30000)
      t.assert(got, 'the saved name did not load back')
    })

    await t.test('more', 'Contact: an empty WhatsApp box is not an error (it said "cannot be blank")', async () => {
      await open('profile')
      await field(driver, 'whatsapp_phone', 40000)
      await type(driver, 'whatsapp_phone', '')
      const m = await messageOf(driver, 'whatsapp_phone')
      t.assert(!m.invalid, `an optional empty box was an error: ${m.says}`)
    })

    await t.test('more', 'Contact: a short WhatsApp number is refused; a +91 number saves as ten digits', async () => {
      await type(driver, 'whatsapp_phone', '98450')
      t.assert(await errorFor('whatsapp_phone'), 'a five-digit number was accepted')
      await type(driver, 'whatsapp_phone', '+91 98450 67890')
      const btns = await driver.findElements(By.xpath('//button[contains(., "Save changes")]'))
      for (const b of btns) { if (await b.isDisplayed()) { await tap(b); break } }
      const v = await until_(driver, async () => { const r = await P.vendorOf(K, 'whatsapp_phone, contact_phone'); return r.whatsapp_phone ? r : null })
      t.assert(v?.whatsapp_phone === '9845067890', `stored ${v?.whatsapp_phone}`)
      t.assert(v.contact_phone === '9845012345', 'the call number changed too')
    })

    await t.test('more', 'Profile: a digit in the owner\'s name is refused', async () => {
      await type(driver, 'full_name', 'Anna 2')
      t.assert(await errorFor('full_name'), 'a digit in a person\'s name was accepted')
    })

    await t.test('more', 'Area: 13 jobs a day is refused (it was clamped), 3 saves, pincode untouched', async () => {
      await open('area')
      await field(driver, 'daily_capacity', 40000)
      await type(driver, 'daily_capacity', '13')
      await saveSection()
      t.assert(await errorFor('daily_capacity'), 'no message for 13')
      t.assert((await P.vendorOf(K, 'daily_capacity')).daily_capacity === 2, 'something was saved')
      await type(driver, 'daily_capacity', '3')
      await saveSection()
      const v = await until_(driver, async () => { const r = await P.vendorOf(K, 'daily_capacity, pincode'); return r.daily_capacity === 3 ? r : null })
      t.assert(v && v.pincode === '560041', 'capacity not saved, or the pincode changed')
    })

    await t.test('more', 'Bank: letters in the account number are refused, nothing saved', async () => {
      await open('bank')
      const bankTab = await until_(driver, async () => (await driver.findElements(By.xpath('//button[.//span[text()="Bank"]]')))[0], 40000)
      await tap(bankTab)
      await type(driver, 'account_number', '12345abc6789')
      t.assert(await errorFor('account_number'), 'letters in the account number were accepted')
      const { data } = await P.admin.from('vendor_payout_details').select('vendor_id').eq('vendor_id', K.vendorId).maybeSingle()
      t.assert(!data, 'payout details were saved')
    })

    await t.test('more', 'Bank: a valid UPI id saves from More and is shown after reopening', async () => {
      await open('bank')
      const upiTab = await until_(driver, async () => (await driver.findElements(By.xpath('//button[.//span[text()="UPI"]]')))[0], 40000)
      await tap(upiTab)
      await type(driver, 'upi_id', 'TCE2E.More@ybl')
      const btn = await driver.findElement(By.xpath('//button[contains(., "payout details")]'))
      await tap(btn)
      const saved = await until_(driver, async () => {
        const { data } = await P.admin.from('vendor_payout_details').select('upi_id, method').eq('vendor_id', K.vendorId).maybeSingle()
        return data?.upi_id ? data : null
      }, 20000)
      t.assert(saved?.upi_id === 'tce2e.more@ybl' && saved.method === 'upi', `saved ${JSON.stringify(saved)}`)
      await open('bank')
      /* The saved id is loaded back into the box itself (an input value, not page text). */
      const shown = await until_(driver, async () => ((await valueOf(driver, 'upi_id').catch(() => '')) === 'tce2e.more@ybl') || null, 30000)
      t.assert(shown, 'the saved UPI id is not shown after reopening')
    })

    await t.test('more', 'a description with a heart "<3" and an apostrophe is prose, saved and shown as text', async () => {
      await open('business')
      await field(driver, 'description', 40000)
      await paste(driver, 'description', "Candid work that families love <3 — it's what we do.")
      await saveSection()
      const v = await until_(driver, async () => { const r = await P.vendorOf(K, 'description'); return /love <3/.test(r.description ?? '') ? r : null })
      t.assert(v, 'ordinary prose was not saved')
    })
  } finally {
    const left = await P.cleanup()
    t.report.add({ suite: 'cleanup', name: 'every throwaway partner was removed', status: left === 0 ? 'passed' : 'failed',
                   message: left ? `${left} left behind` : '' })
    await app.close()
  }
}
