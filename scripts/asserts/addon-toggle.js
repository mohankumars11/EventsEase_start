/**
 * Switching an add-on on used to take the whole screen down.
 *
 * The add-on is picked under the key `+id`, which is not a trade id, and
 * state/PlanContext.jsx passed every pick key to the 360° engine as a
 * trade. The engine rejects anything outside the registry, so the click
 * threw "added: unknown trade" and the error boundary replaced the plan.
 *
 * This taps a real add-on toggle in a real browser and checks the screen
 * is still there afterwards. `--eval` runs before React has necessarily
 * painted, so everything here polls rather than assuming.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms))
const until = async (fn, ms = 8000) => {
  const stop = Date.now() + ms
  for (;;) { const v = fn(); if (v) return v; if (Date.now() > stop) return null; await sleep(100) }
}
const out = []
const check = (name, ok, detail = '') => out.push({ name, ok: !!ok, detail })

/* The error boundary, whatever it is showing. */
const broken = () => /Something went wrong|still not loading/i.test(document.body.innerText)

const section = await until(() => [...document.querySelectorAll('section')]
  .find(s => /Make it even more special/i.test(s.textContent)))
check('add-ons section rendered', !!section)
if (!section) return out

const toggles = [...section.querySelectorAll('[data-toggle]')]
check('add-on has a toggle', toggles.length > 0, `${toggles.length} found`)
if (!toggles.length) return out

const rowsBefore = document.querySelectorAll('[data-toggle]').length
const first = toggles[0]
const was = first.getAttribute('data-toggle')

first.click()
await sleep(700)

check('screen did not crash on switching an add-on ON', !broken(),
  broken() ? document.body.innerText.slice(0, 120) : '')

const after = [...document.querySelectorAll('section')]
  .find(s => /Make it even more special/i.test(s.textContent))
  ?.querySelectorAll('[data-toggle]')[0]
check('the add-on toggle actually flipped', after && after.getAttribute('data-toggle') !== was,
  after ? `${was} -> ${after.getAttribute('data-toggle')}` : 'row gone')
check('the rest of the plan survived', document.querySelectorAll('[data-toggle]').length >= rowsBefore - 1,
  `${rowsBefore} -> ${document.querySelectorAll('[data-toggle]').length}`)

/* And off again, which is the other half of the same bug. */
after?.click()
await sleep(700)
check('screen did not crash on switching it back OFF', !broken(),
  broken() ? document.body.innerText.slice(0, 120) : '')

/* A plain service toggle must still work — the fix must not have
   narrowed what reaches the engine as a genuine trade. */
const svc = [...document.querySelectorAll('section')]
  .find(s => /Recommended for your celebration/i.test(s.textContent))
  ?.querySelectorAll('[data-toggle]')[0]
const svcWas = svc?.getAttribute('data-toggle')
svc?.click()
await sleep(700)
const svcAfter = [...document.querySelectorAll('section')]
  .find(s => /Recommended for your celebration/i.test(s.textContent))
  ?.querySelectorAll('[data-toggle]')[0]
check('a service toggle still works', svcAfter && svcAfter.getAttribute('data-toggle') !== svcWas,
  svcAfter ? `${svcWas} -> ${svcAfter.getAttribute('data-toggle')}` : 'row gone')
check('screen did not crash on a service toggle', !broken())

return out
