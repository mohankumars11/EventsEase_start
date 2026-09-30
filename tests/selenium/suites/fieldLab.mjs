/**
 * Every inventoried field, in a browser, through the real components.
 * Offline: no login, no database. This is the suite CI runs.
 *
 * Categories covered here (see scripts/validation/catalogue.mjs):
 *   15 paste, 16 very long paste, 17 injected markup rendered inert,
 *   19 control characters, 22 a server refusal placed under its box,
 *   23 correction clears the error, 24 a save is refused while invalid.
 */
import { By } from 'selenium-webdriver'
import { CASES } from '../../../scripts/validation/catalogue.mjs'
import { type, paste, messageOf, valueOf, focused, until_, waitFor, field, byField } from '../lib/field.mjs'
import { serveHarness } from '../lib/harness.mjs'
import { loadSrc } from '../../../scripts/lib/loadSrc.mjs'

const pick = (rule, cat, want) => (CASES[rule] ?? []).find(c => c[0] === cat && (!want || c[2] === want) && !c[4])
const firstErr = rule => (CASES[rule] ?? []).find(c => c[2] === 'err' && c[1].trim() && !c[4] && ![16, 17, 19].includes(c[0]))
const firstOk = rule => (CASES[rule] ?? []).find(c => (c[2] === 'ok' || c[2].startsWith('=')) && c[1].trim() && !c[4])

export async function fieldLab(t) {
  const { FIELD_INVENTORY } = await loadSrc({ 'src/lib/validation/inventory.js': ['FIELD_INVENTORY'] })
  const lab = FIELD_INVENTORY.filter(f => f.rule && f.kind !== 'select' && f.kind !== 'slider')
  const server = await serveHarness('tests/selenium/harness/field-lab.jsx')
  const { driver } = t

  try {
    await driver.get(server.url)
    await waitFor(driver, By.css('[data-testid="field-lab"]'), 30000)

    for (const f of lab) {
      const name = 'lab_' + f.id
      const bad = firstErr(f.rule)
      const good = firstOk(f.rule)

      /* A native date or time picker cannot hold an impossible value: the
         browser clears "24:30" or "2020-02-30" itself. So for pickers the
         check is that, plus a value the picker can hold and the rule refuses. */
      if (f.kind === 'date' || f.kind === 'time') {
        await t.test('fields', `${f.id}: the picker itself refuses an impossible value`, async () => {
          const impossible = f.kind === 'date' ? '2026-02-30' : '24:30'
          await paste(driver, name, impossible)
          t.assert((await valueOf(driver, name)) === '', 'the picker held an impossible value')
        })
        const holdable = { doc_issue_date: '2999-01-01', doc_expiry_date: '2020-01-01', range_dates: null, week_dates: null }[f.id]
        if (holdable) {
          await t.test('fields', `${f.id}: a real date the rule refuses is told on leaving`, async () => {
            await paste(driver, name, holdable)
            const m = await until_(driver, async () => { const x = await messageOf(driver, name); return x.invalid ? x : null })
            t.assert(m?.invalid && m.says, 'a refused date was accepted')
            await paste(driver, name, f.id === 'doc_issue_date' ? '2020-05-01' : '2099-05-01')
            const c = await until_(driver, async () => { const x = await messageOf(driver, name); return !x.invalid ? x : null })
            t.assert(c, 'the error stayed after a valid date')
          })
        }
        await paste(driver, name, '', { blur: false })
        continue
      }

      if (bad) {
        await t.test('fields', `${f.id}: quiet while typing, told on leaving (${JSON.stringify(bad[1]).slice(0, 30)})`, async () => {
          await type(driver, name, bad[1], { blur: false })
          const before = await messageOf(driver, name)
          t.assert(!before.invalid, 'an error was shown before the box was left')
          await driver.executeScript('arguments[0].blur()', await field(driver, name))
          const after = await until_(driver, async () => { const m = await messageOf(driver, name); return m.invalid && m.says ? m : null })
          t.assert(after?.invalid, 'aria-invalid is not set after leaving the box')
          t.assert(after?.says, 'no message is linked through aria-describedby')
          t.assert(after?.role === 'alert', 'the message is not announced (role=alert)')
          t.assert(after?.value === bad[1] || !/[\u{0}-\u{1F}]/u.test(bad[1]), 'the typed value was changed instead of refused')
        })
      }

      if (bad && good) {
        await t.test('fields', `${f.id}: correcting it clears the error`, async () => {
          await type(driver, name, good[1])
          const m = await until_(driver, async () => { const x = await messageOf(driver, name); return !x.invalid ? x : null })
          t.assert(m && !m.invalid, 'the error stayed after a valid value was typed')
        })
      }

      const long = pick(f.rule, 16, 'err')
      if (long) {
        await t.test('fields', `${f.id}: a 5000-character paste is kept whole and refused`, async () => {
          await paste(driver, name, long[1])
          const v = await valueOf(driver, name)
          t.assert(v.length === long[1].length, `the paste was cut to ${v.length} characters without a word`)
          const m = await until_(driver, async () => { const x = await messageOf(driver, name); return x.invalid ? x : null })
          t.assert(m?.invalid && m.says, 'a 5000-character value was accepted')
        })
      }

      const xss = pick(f.rule, 17, 'err')
      if (xss) {
        await t.test('fields', `${f.id}: an injected tag is refused and shown as text, never run`, async () => {
          await paste(driver, name, '<img src=x onerror="window.__xss++">')
          await driver.sleep(150)
          const ran = await driver.executeScript('return window.__xss')
          const preview = await driver.executeScript(`return document.querySelector('[data-preview="${f.id}"]').textContent`)
          const imgs = await driver.executeScript(`return document.querySelectorAll('[data-lab-row="${f.id}"] img').length`)
          t.assert(ran === 0, 'the payload executed')
          /* Some boxes upper-case on blur (IFSC, PAN), so the text may read <IMG. */
          t.assert(imgs === 0 && /<img/i.test(preview), 'the payload was rendered as HTML, not as text')
          const m = await messageOf(driver, name)
          t.assert(m.invalid, 'markup was accepted')
        })
      }

      const ctrl = pick(f.rule, 19, 'err')
      if (ctrl) {
        await t.test('fields', `${f.id}: a pasted invisible character is refused`, async () => {
          await paste(driver, name, ctrl[1])
          const m = await until_(driver, async () => { const x = await messageOf(driver, name); return x.invalid ? x : null })
          t.assert(m?.invalid, 'a control character was accepted')
        })
      }

      /* Leave the box empty for the save tests below. */
      await paste(driver, name, '', { blur: false })
    }

    await t.test('form', 'Save with required boxes empty reveals every message and moves to the first', async () => {
      {
        const save = await driver.findElement(By.css('[data-testid="lab-save"]'))
        await driver.executeScript('arguments[0].scrollIntoView({ block: "center" }); arguments[0].click()', save)
      }
      const first = await until_(driver, () => focused(driver))
      const required = lab.filter(f => f.required).map(f => 'lab_' + f.id)
      t.assert(required.includes(first), `focus went to ${first}, not a required box`)
      const shown = await driver.executeScript('return document.querySelectorAll(\'[data-testid="field-lab"] [aria-invalid="true"]\').length')
      t.assert(shown >= required.length, `${shown} errors shown for ${required.length} required boxes`)
      const saved = await driver.findElements(By.css('[data-testid="lab-saved"]'))
      t.assert(saved.length === 0, 'the form saved while boxes were wrong')
    })

    /* ── The real Bank screen, against a stub that refuses like 159 ── */
    await t.test('bank', 'a letter in the account number is refused, never dropped; nothing is sent', async () => {
      await driver.executeScript('document.querySelector(\'[data-testid="bank-screen"]\').scrollIntoView()')
      const bankTab = await driver.findElements(By.xpath('//section[@data-testid="bank-screen"]//button[.//span[text()="Bank"]]'))
      if (bankTab.length) await driver.executeScript('arguments[0].scrollIntoView({ block: "center" }); arguments[0].click()', bankTab[0])
      await type(driver, 'account_number', '12345abc6789')
      const m = await until_(driver, async () => { const x = await messageOf(driver, 'account_number'); return x.invalid ? x : null })
      t.assert(m?.invalid && /not a digit/.test(m.says), `expected a "not a digit" message, got ${m?.says}`)
      t.assert((await valueOf(driver, 'account_number')) === '12345abc6789', 'the value was rewritten')
      const writes = await driver.executeScript('return window.__writes.length')
      t.assert(writes === 0, 'something was sent to the server')
    })

    await t.test('bank', 'a pasted 12-character IFSC is kept whole and refused (no maxLength cut)', async () => {
      const bankTab = await driver.findElements(By.xpath('//section[@data-testid="bank-screen"]//button[.//span[text()="Bank"]]'))
      if (bankTab.length) await driver.executeScript('arguments[0].scrollIntoView({ block: "center" }); arguments[0].click()', bankTab[0])
      await waitFor(driver, byField('ifsc'))
      await paste(driver, 'ifsc', 'HDFC00012345')
      t.assert((await valueOf(driver, 'ifsc')).length === 12, 'the IFSC was cut to 11 characters')
      const m = await until_(driver, async () => { const x = await messageOf(driver, 'ifsc'); return x.invalid ? x : null })
      t.assert(m?.invalid, 'a 12-character IFSC was accepted')
    })

    await t.test('bank', 'a server refusal (22023) is shown under the UPI box, not as a banner', async () => {
      const upiTab = await driver.findElements(By.xpath('//section[@data-testid="bank-screen"]//button[.//span[text()="UPI"]]'))
      if (upiTab.length) await driver.executeScript('arguments[0].scrollIntoView({ block: "center" }); arguments[0].click()', upiTab[0])
      await waitFor(driver, byField('upi_id'))
      await type(driver, 'upi_id', 'refusedname@ybl')
      const saveBtn = await driver.findElement(By.xpath('//section[@data-testid="bank-screen"]//button[contains(., "payout details")]'))
      await driver.executeScript('arguments[0].scrollIntoView({ block: "center" }); arguments[0].click()', saveBtn)
      const m = await until_(driver, async () => { const x = await messageOf(driver, 'upi_id'); return x.invalid && /server says/i.test(x.says ?? '') ? x : null })
      t.assert(m, 'the server\'s refusal did not appear under the UPI box')
      const banner = await driver.executeScript('return [...document.querySelectorAll(\'[data-testid="bank-screen"] .bg-rose-50\')].map(e => e.textContent).join(" ")')
      t.assert(!/invalid_field|22023/.test(banner), 'raw Postgres text reached the screen')
      const writes = await driver.executeScript('return window.__writes.map(w => w.upi_id)')
      t.assert(writes.includes('refusedname@ybl'), 'the save was not attempted with the checked value')
    })
  } finally {
    await server.close()
  }
}
