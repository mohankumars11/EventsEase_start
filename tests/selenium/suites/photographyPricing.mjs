import { By } from 'selenium-webdriver'
import { serveHarness } from '../lib/harness.mjs'
import { waitFor, until_ } from '../lib/field.mjs'

export async function photographyPricing(t) {
  const server = await serveHarness('tests/selenium/harness/pricing-photography.jsx')
  const driver = t.driver

  try {
    await driver.get(server.url)
    await waitFor(driver, By.css('[data-testid="photography-pricing-lab"]'), 30000)

    await t.test('pricing', 'Photography pricing catalog opens cleanly', async () => {
      await until_(driver, async () => {
        const body = await driver.findElement(By.css('body')).getText()
        return body.includes('Photography') && body.includes('No package yet') ? true : null
      }, 15000)
      const templateButtons = await driver.findElements(By.xpath('//button[normalize-space(.)="Use first template"]'))
      t.assert(templateButtons.length === 1, 'Photography pricing catalog did not expose the first-template action')
    })

    await t.test('pricing', 'Photography package editor opens from the pricing catalog', async () => {
      const useTemplate = await driver.findElement(By.xpath('//button[normalize-space(.)="Use first template"]'))
      await driver.executeScript('arguments[0].click()', useTemplate)
      await until_(driver, async () => {
        const els = await driver.findElements(By.css('[data-pricing-action="save-draft"]'))
        return els[0] ?? null
      }, 15000)
      const body = await driver.findElement(By.css('body')).getText()
      t.assert(body.includes('Essential Coverage'), 'Photography package template did not open in the editor')
      t.assert(body.includes('Package'), 'Package editor step did not render')
    })

    await t.test('pricing', 'Photography Save draft works before mandatory fields are complete', async () => {
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

    await t.test('pricing', 'Visible Photography event selector is the only event-type gate', async () => {
      const continueToDetails = await driver.findElement(By.css('.trade-pricing-primary-action'))
      await driver.executeScript('arguments[0].click()', continueToDetails)
      await waitFor(driver, By.css('.trade-step-details'), 15000)

      const bodyBefore = await driver.findElement(By.css('body')).getText()
      t.assert(bodyBefore.includes('Events you serve'), 'Photography event selector is missing')

      const birthday = await driver.findElement(By.xpath('//button[normalize-space(.)="Birthday"]'))
      const wedding = await driver.findElement(By.xpath('//button[normalize-space(.)="Wedding"]'))
      await driver.executeScript('arguments[0].click()', birthday)
      await driver.executeScript('arguments[0].click()', wedding)
      await driver.sleep(150)

      const selected = await driver.findElements(By.css('.trade-event-chip.is-selected'))
      t.assert(selected.length === 2, 'selected event chips were not retained')

      const errorText = await driver.findElements(By.xpath("//*[contains(normalize-space(.), 'Complete Event type.')]"))
      t.assert(errorText.length === 0, 'hidden legacy Event type validation is still shown')
    })

    await t.test('pricing', 'Required Photography Trade Fields can be completed and Pricing opens', async () => {
      const selects = await driver.findElements(By.css('.trade-step-details select'))
      for (const select of selects) {
        await driver.executeScript(
          'const el=arguments[0]; if(!el.value){const option=[...el.options].find(o=>o.value && !/^__custom__$/.test(o.value)); if(option){el.value=option.value; el.dispatchEvent(new Event("change",{bubbles:true}));}}',
          select,
        )
      }
      await driver.sleep(250)

      const primary = await driver.findElement(By.css('.trade-pricing-primary-action'))
      const disabled = await primary.getAttribute('disabled')
      t.assert(disabled === null, 'Trade Fields still has a required control blocking Continue')
      await driver.executeScript('arguments[0].click()', primary)

      await until_(driver, async () => {
        const body = await driver.findElement(By.css('body')).getText()
        return body.includes('Set your price') ? true : null
      }, 15000)
    })

    await t.test('pricing', 'Required pricing fields can be completed and Preview opens', async () => {
      const priceChip = await driver.findElement(By.css('.trade-step-pricing button.trade-pricing-price-chip'))
      await driver.executeScript('arguments[0].click()', priceChip)

      const pricingSelects = await driver.findElements(By.css('.trade-step-pricing select'))
      for (const select of pricingSelects) {
        await driver.executeScript(
          'const el=arguments[0]; if(!el.value){const option=[...el.options].find(o=>o.value && !/^__custom__$/.test(o.value)); if(option){el.value=option.value; el.dispatchEvent(new Event("change",{bubbles:true}));}}',
          select,
        )
      }
      await driver.sleep(300)

      let primary = await driver.findElement(By.css('.trade-pricing-primary-action'))
      t.assert((await primary.getAttribute('disabled')) === null, 'Pricing remained blocked after required fields were filled')
      await driver.executeScript('arguments[0].click()', primary)

      await until_(driver, async () => {
        const xs = await driver.findElements(By.css('.trade-pricing-primary-action'))
        const b = xs[0]
        return b ?? null
      }, 15000)

      primary = await driver.findElement(By.css('.trade-pricing-primary-action'))
      await driver.executeScript('arguments[0].click()', primary)
      await until_(driver, async () => {
        const body = await driver.findElement(By.css('body')).getText()
        return body.includes('Preview your customer-facing catalog') ? true : null
      }, 15000)

      const body = await driver.findElement(By.css('body')).getText()
      t.assert(!body.includes('Complete Event type.'), 'Preview still contains the hidden Event type validation')
    })

    await t.test('pricing', 'Photography pricing submits successfully and returns to the catalog', async () => {
      const before = await driver.executeScript('return window.__PRICING_RPC__.length')
      const submit = await driver.findElement(By.css('[data-pricing-action="submit-review"]'))
      t.assert((await submit.getAttribute('disabled')) === null, 'Submit pricing remained disabled')
      await driver.executeScript('arguments[0].click()', submit)

      await until_(driver, async () => {
        const catalog = await driver.findElements(By.css('.trade-pricing-catalog'))
        return catalog[0] ?? null
      }, 15000)

      const after = await driver.executeScript('return window.__PRICING_RPC__.length')
      t.assert(after > before, 'review submission did not make a pricing RPC call')

      const rpc = await driver.executeScript('return window.__PRICING_RPC__[window.__PRICING_RPC__.length - 1]')
      t.assert(rpc?.name === 'save_sambramo_trade_package', 'review save RPC was not called')
      const ti = rpc?.args?.p_package?.trade_inputs ?? {}
      t.assert(Array.isArray(ti.supported_events) && ti.supported_events.includes('Birthday') && ti.supported_events.includes('Wedding'),
        'supported_events did not contain the selected event types')
      t.assert(Array.isArray(ti.event_type) && ti.event_type.includes('Birthday') && ti.event_type.includes('Wedding'),
        'legacy event_type was not synchronized with the selected event types')
    })
  } finally {
    await server.close()
  }
}
