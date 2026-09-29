/**
 * What a partner does to a box, and what they are told.
 *
 * Every helper finds a field by `data-field`, which ValidatedField and
 * the FieldCheck helpers put on every checked input. The message is
 * found the way a screen reader finds it: through `aria-describedby`.
 * If that link is missing, the helper reports no message, and the test
 * fails for the right reason.
 */
import { By, Key, until } from 'selenium-webdriver'

export const byField = name => By.css(`[data-field="${name}"]`)

export async function waitFor(driver, locator, ms = 15000) {
  const el = await driver.wait(until.elementLocated(locator), ms)
  await driver.wait(until.elementIsVisible(el), ms)
  return el
}

export async function field(driver, name, ms) {
  const el = await waitFor(driver, byField(name), ms)
  /* Centre it: a box at the bottom edge sits under the fixed toast
     region, and a click there lands on the toast, not the box. */
  await driver.executeScript('arguments[0].scrollIntoView({ block: "center" })', el)
  return el
}

/** Click, or focus by script if something still covers it. */
export async function press(driver, el) {
  try { await el.click() } catch { await driver.executeScript('arguments[0].focus()', el) }
}

/** Select everything in the box and delete it, the way a thumb would. */
export async function clear(driver, el) {
  await press(driver, el)
  await el.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE)
  /* Some React inputs keep a stale value until an input event fires. */
  const v = await el.getAttribute('value')
  if (v) await driver.executeScript(setNative, el, '')
}

/** Type, character by character, as a keyboard does. */
export async function type(driver, name, text, { blur = true } = {}) {
  const el = await field(driver, name)
  await clear(driver, el)
  if (text) await el.sendKeys(text)
  if (blur) await blurField(driver, el)
  return el
}

/* Setting `value` through the native setter and dispatching input is how
   a paste reaches React: one event, the whole string at once. */
const setNative = `
  const el = arguments[0], v = arguments[1];
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
              : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
`

/** Paste: the whole value in one input event, including characters a
    keyboard cannot type (control characters, zero-width spaces). */
export async function paste(driver, name, text, { blur = true } = {}) {
  const el = await field(driver, name)
  await press(driver, el)
  await driver.executeScript(setNative, el, text)
  if (blur) await blurField(driver, el)
  return el
}

export async function blurField(driver, el) {
  await driver.executeScript('arguments[0].blur(); arguments[0].dispatchEvent(new FocusEvent("focusout", { bubbles: true }))', el)
  await driver.sleep(60)
}

/** What the partner is told about this box, found through aria-describedby. */
export async function messageOf(driver, name) {
  const el = await driver.findElement(byField(name))
  return driver.executeScript(`
    const el = arguments[0];
    const id = el.getAttribute('aria-describedby');
    const msg = id && document.getElementById(id);
    return {
      invalid: el.getAttribute('aria-invalid') === 'true',
      says: msg ? msg.textContent.trim() : null,
      role: msg ? msg.getAttribute('role') : null,
      value: el.value,
    };`, el)
}

export async function valueOf(driver, name) {
  return (await driver.findElement(byField(name))).getAttribute('value')
}

/** The element with focus, by its data-field. */
export async function focused(driver) {
  return driver.executeScript('return document.activeElement && document.activeElement.getAttribute("data-field")')
}

/** Poll a condition in the page (React paints after events). */
export async function until_(driver, fn, ms = 8000, step = 100) {
  const end = Date.now() + ms
  let last
  while (Date.now() < end) {
    try { last = await fn(); if (last) return last } catch { /* not yet */ }
    await driver.sleep(step)
  }
  return last
}
