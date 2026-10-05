import { By } from 'selenium-webdriver'
import { serveHarness } from '../lib/harness.mjs'
import { waitFor, until_ } from '../lib/field.mjs'

export async function photographyPricing(t) {
  const server = await serveHarness('tests/selenium/harness/pricing-photography.jsx')
  const driver = t.driver

  try {
    await driver.get(server.url)
    await waitFor(driver, By.css('[data-testid="photography-pricing-lab"]'), 30000)

    await t.test('pricing', 'Photography pricing opens in the real browser harness', async () => {
      await until_(driver, async () => {
        const body = await driver.findElement(By.css('body')).getText()
        return body.includes('Photography') && body.includes('Essential Coverage') ? true : null
      }, 15000)
      const body = await driver.findElement(By.css('body')).getText()
      t.assert(body.includes('Photography'), 'Photography title did not render')
      t.assert(body.includes('Essential Coverage'), 'Photography package template did not render')
    })

    await t.test('pricing', 'Save draft works without requiring completed Event type or all trade fields', async () => {
      const save = await driver.findElement(By.css('[data-pricing-action="save-draft"]'))
      await driver.executeScript('arguments[0].click()', save)

      await until_(driver, async () => {
        const body = await driver.findElement(By.css('body')).getText()
        return body.includes('Draft saved successfully.') ? true : null
      }, 15000)

      const rpc = await driver.executeScript('return window.__PRICING_RPC__[window.__PRICING_RPC__.length - 1]')
      t.assert(rpc?.name === 'save_sambramo_trade_package', 'draft save RPC was not called')
      t.assert(rpc?.args?.p_package?.status === 'DRAFT', 'draft save did not send DRAFT status')
    })

    await t.test('pricing', 'A Photography package can enter Trade Fields', async () => {
      const template = await driver.findElement(By.css('button.trade-pricing-template-card'))
      await driver.executeScript('arguments[0].click()', template)

      const description = await until_(driver, async () => {
        const xs = await driver.findElements(By.css('button.trade-pricing-description-card'))
        return xs[0] ?? null
      }, 15000)
      await driver.executeScript('arguments[0].click()', description)

      const next = await until_(driver, async () => {
        const xs = await driver.findElements(By.css('.trade-pricing-primary-action'))
        const b = xs[xs.length - 1]
        return b && (await b.getText()).includes('Continue to Trade Fields') ? b : null
      }, 15000)
      t.assert(!(await next.getAttribute('disabled')), 'Continue to Trade Fields stayed disabled')
      await driver.executeScript('arguments[0].click()', next)
      await until_(driver, async () => (await driver.findElements(By.css('.trade-step-details')))[0] ?? null, 15000)
    })

    await t.test('pricing', 'The visible Photography event selector satisfies required event_type', async () => {
      const bodyBefore = await driver.findElement(By.css('body')).getText()
      t.assert(bodyBefore.includes('Events you serve'), 'Photography event selector is missing')

      const birthday = await driver.findElement(By.xpath('//button[normalize-space(.)="Birthday"]'))
      const wedding = await driver.findElement(By.xpath('//button[normalize-space(.)="Wedding"]'))
      await driver.executeScript('arguments[0].click()', birthday)
      await driver.executeScript('arguments[0].click()', wedding)
      await driver.sleep(150)

      const selected = await driver.findElements(By.css('.trade-event-chip.is-selected'))
      t.assert(selected.length === 2, 'both selected event chips were not retained')

      const primary = await driver.findElement(By.css('.trade-pricing-primary-action'))
      t.assert(!(await primary.getAttribute('disabled')), 'Continue remained disabled after selecting event types')

      const errorText = await driver.findElements(By.xpath("//*[contains(normalize-space(.), 'Complete Event type.')]"))
      t.assert(errorText.length === 0, 'the old hidden event_type error is still shown')
    })

    await t.test('pricing', 'Required Photography trade fields can be completed and Pricing opens', async () => {
      const selects = await driver.findElements(By.css('.trade-step-details select'))
      for (const select of selects) {
        await driver.executeScript(
          'const el=arguments[0]; if(!el.value){const option=[...el.options].find(o=>o.value); if(option){el.value=option.value; el.dispatchEvent(new Event("change",{bubbles:true}));}}',
          select,
        )
      }
      await driver.sleep(200)

      const primary = await driver.findElement(By.css('.trade-pricing-primary-action'))
      t.assert(!(await primary.getAttribute('disabled')), 'Trade Fields still has a required control blocking Continue')
      await driver.executeScript('arguments[0].click()', primary)

      await until_(driver, async () => {
        const body = await driver.findElement(By.css('body')).getText()
        return body.includes('Set your price') ? true : null
      }, 15000)
    })

    await t.test('pricing', 'Price and minimum can be completed and Preview opens cleanly', async () => {
      const priceChip = await driver.findElement(By.css('.trade-step-pricing button.trade-pricing-price-chip'))
      await driver.executeScript('arguments[0].click()', priceChip)

      /* The pricing step has several required selects (tier, charge unit,
         minimum, lead time, travel/cancellation/payment rules). Setting only
         the first select previously made the browser test look like a pricing
         bug even though the real screen still had legitimate gates. Fill each
         required select in the real component tree. */
      const pricingSelects = await driver.findElements(By.css('.trade-step-pricing select'))
      for (const select of pricingSelects) {
        await driver.executeScript(
          'const el=arguments[0]; if(!el.value){const option=[...el.options].find(o=>o.value); if(option){el.value=option.value; el.dispatchEvent(new Event("change",{bubbles:true}));}}',
          select,
        )
      }
      await driver.sleep(250)

      const primary = await driver.findElement(By.css('.trade-pricing-primary-action'))
      t.assert(!(await primary.getAttribute('disabled')), 'Continue to Add-ons stayed disabled')
      await driver.executeScript('arguments[0].click()', primary)

      const previewNext = await driver.findElement(By.css('.trade-pricing-primary-action'))
      await driver.executeScript('arguments[0].click()', previewNext)
      const body = await driver.findElement(By.css('body')).getText()
      t.assert(body.includes('Preview your customer-facing catalog'), 'Preview did not open')
      t.assert(!body.includes('Complete Event type.'), 'Preview still shows the hidden event_type error')
    })

    await t.test('pricing', 'Submit pricing calls the save RPC with both event representations', async () => {
      const submit = await driver.findElement(By.css('[data-pricing-action="submit-review"]'))
      await driver.executeScript('arguments[0].click()', submit)

      await until_(driver, async () =>
        (await driver.findElement(By.css('body')).getText()).includes('Pricing submitted to Sambramo review.')
          ? true : null, 15000)

      const rpc = await driver.executeScript('return window.__PRICING_RPC__[window.__PRICING_RPC__.length - 1]')
      t.assert(rpc?.name === 'save_sambramo_trade_package', 'save_sambramo_trade_package was not called')
      const ti = rpc?.args?.p_package?.trade_inputs ?? {}
      t.assert(Array.isArray(ti.supported_events) && ti.supported_events.includes('Birthday') && ti.supported_events.includes('Wedding'),
        'selected events were not sent in supported_events')
      t.assert(Array.isArray(ti.event_type) && ti.event_type.includes('Birthday') && ti.event_type.includes('Wedding'),
        'legacy event_type was not synchronized')
    })
  } finally {
    await server.close()
  }
}
