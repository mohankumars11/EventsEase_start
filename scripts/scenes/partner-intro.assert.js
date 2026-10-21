/* Does it move on its own, does a finger stop it, and does every button
   go where its painted label says? */
const wait = ms => new Promise(r => setTimeout(r, ms))
for (let i = 0; i < 60; i++) { if (document.querySelector('.native-rail')) break; await wait(150) }
const rail = document.querySelector('.native-rail')
const at = () => Math.round(rail.scrollLeft / (rail.clientWidth || 1))
const out = []
const startAt = at()
await wait(4900)
out.push({ name: 'advances by itself after ~4s', ok: at() === startAt + 1, detail: `was ${startAt}, now ${at()}` })

/* hold a finger down across a full interval: it must NOT move */
rail.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
const heldAt = at()
await wait(4900)
out.push({ name: 'a finger on the screen holds the card', ok: at() === heldAt, detail: `was ${heldAt}, now ${at()}` })
rail.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))

/* card two's painted button says See How It Works: it must advance, not leave */
const btns = [...document.querySelectorAll('section button[aria-label]')]
const seeHow = btns.find(b => /See How It Works/.test(b.getAttribute('aria-label')))
const before = at()
seeHow.click(); await wait(900)
out.push({ name: '"See How It Works" moves to the next card', ok: !document.querySelector('[data-landed]') && at() === Math.min(2, before + 1) || at() === 2,
  detail: `card ${before} -> ${at()}, landed=${document.querySelector('[data-landed]')?.dataset.landed ?? 'stayed'}` })

/* the last card does not auto-advance or loop */
await wait(4900)
out.push({ name: 'stops on the last card instead of looping', ok: at() === 2, detail: `at card ${at()}` })

const join = [...document.querySelectorAll('section button[aria-label]')].filter(b => /Join as a Partner/.test(b.getAttribute('aria-label'))).pop()
join.click(); await wait(500)
const landed = document.querySelector('[data-landed]')?.dataset.landed
out.push({ name: '"Join as a Partner" goes straight to sign-in', ok: landed === '/partner/login', detail: `landed ${landed}` })
return out
