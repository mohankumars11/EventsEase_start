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
      const body = await driver.findElement(By.css('body')).getText()
      t.assert(body.includes('Photography'), 'Photography title did not render')
      t.assert(body.includes('Essential Coverage'), 'Photography template did not render')
    })

    await t.test('pricing', 'Save draft works before all pricing details are complete', async () => {
      const template = await driver.findElement(By.css('button.trade-pricing-template-card'))
      await driver.executeScript('arguments[0].click()', template)

      const save = await driver.findElement(By.css('[data-pricing-action="save-draft"]'))
      await driver.executeScript('arguments[0].click()', save)
      await until_(driver, async () =>
        (await driver.findElement(By.css('body')).getText()).includes('Draft saved successfully.')
          ? true : null, 15000)

      const rpc = await driver.executeScript('return window.__PRICING_RPC__[window.__PRICING_RPC__.length - 1]')
      t.assert(rpc?.name === 'save_sambramo_trade_package', 'draft save RPC was not called')
      t.assert(rpc?.args?.p_package?.status === 'DRAFT', 'draft save did not send DRAFT status')
    })

    await t.test('pricing', 'Photography Trade Fields accept the visible event selector without hidden legacy validation', async () => {
      const primary = await driver.findElement(By.css('.trade-pricing-primary-action'))
      await driver.executeScript('arguments[0].click()', primary)
      await waitFor(driver, By.css('.trade-step-details'), 15000)

      const bodyBefore = await driver.findElement(By.css('body')).getText()
      t.assert(bodyBefore.includes('Events you serve'), 'event selector is missing')

      const birthday = await driver.findElement(By.xpath('//button[normalize-space(.)="Birthday"]'))
      const wedding = await driver.findElement(By.xpath('//button[normalize-space(.)="Wedding"]'))
      await driver.executeScript('arguments[0].click()', birthday)
      await driver.executeScript('arguments[0].click()', wedding)
      await driver.sleep(150)

      const selected = await driver.findElements(By.css('.trade-event-chip.is-selected'))
      t.assert(selected.length === 2, 'selected event chips were not retained')

      const pageText = await driver.findElement(By.css('body')).getText()
      t.assert(!pageText.includes('Complete Event type.'), 'hidden legacy Event type validation is still blocking the flow')
    })

    await t.test('pricing', 'Required Photography fields can be completed and Pricing opens', async () => {
      const selects = await driver.findElements(By.css('.trade-step-details select'))
      for (const select of selects) {
        await driver.executeScript(
          'const el=arguments[0]; if(!el.value){const option=[...el.options].find(o=>o.value); if(option){el.value=option.value; el.dispatchEvent(new Event("change",{bubbles:true}));}}',
          select,
        )
      }
      await driver.sleep(250)

      const primary = await driver.findElement(By.css('.trade-pricing-primary-action'))
      await driver.executeScript('arguments[0].click()', primary)
      await waitFor(driver, By.css('.trade-step-pricing'), 15000)
      const pageText = await driver.findElement(By.css('body')).getText()
      t.assert(!pageText.includes('Complete Event type.'), 'Trade Fields still reports the hidden Event type requirement')
    })

    await t.test('pricing', 'Required pricing fields can be completed and Preview opens cleanly', async () => {
      const priceChip = await driver.findElement(By.css('.trade-step-pricing button.trade-pricing-price-chip'))
      await driver.executeScript('arguments[0].click()', priceChip)

      const pricingSelects = await driver.findElements(By.css('.trade-step-pricing select'))
      for (const select of pricingSelects) {
        await driver.executeScript(
          'const el=arguments[0]; if(!el.value){const option=[...el.options].find(o=>o.value); if(option){el.value=option.value; el.dispatchEvent(new Event("change",{bubbles:true}));}}',
          select,
        )
      }
      await driver.sleep(250)

      let primary = await driver.findElement(By.css('.trade-pricing-primary-action'))
      await driver.executeScript('arguments[0].click()', primary)
      await waitFor(driver, By.css('[data-testid="trade-pricing-addons"]'), 15000).catch(async () => {})

      primary = await driver.findElement(By.css('.trade-pricing-primary-action'))
      await driver.executeScript('arguments[0].click()', primary)
      await waitFor(driver, By.xpath("//*[contains(normalize-space(.), 'Preview your customer-facing catalog')]"), 15000)

      const body = await driver.findElement(By.css('body')).getText()
      t.assert(body.includes('Preview your customer-facing catalog'), 'Preview did not open')
      t.assert(!body.includes('Complete Event type.'), 'Preview still shows Event type validation')
    })

    await t.test('pricing', 'Submitting Photography pricing sends both event representations and returns success', async () => {
      const submit = await driver.findElement(By.css('[data-pricing-action="submit-review"]'))
      await driver.executeScript('arguments[0].click()', submit)

      await until_(driver, async () =>
        (await driver.findElement(By.css('body')).getText()).includes('Pricing submitted to Sambramo review.')
          ? true : null, 15000)

      const rpc = await driver.executeScript('return window.__PRICING_RPC__[window.__PRICING_RPC__.length - 1]')
      t.assert(rpc?.name === 'save_sambramo_trade_package', 'save_sambramo_trade_package was not called for review')
      const ti = rpc?.args?.p_package?.trade_inputs ?? {}
      t.assert(Array.isArray(ti.supported_events), 'supported_events was not sent as an array')
      t.assert(ti.supported_events.includes('Birthday') && ti.supported_events.includes('Wedding'), 'selected events missing from supported_events')
      t.assert(Array.isArray(ti.event_type), 'legacy event_type was not synchronized as an array')
      t.assert(ti.event_type.includes('Birthday') && ti.event_type.includes('Wedding'), 'selected events missing from legacy event_type')
    })
  } finally {
    await server.close()
  }
}
