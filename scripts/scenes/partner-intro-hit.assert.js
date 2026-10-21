/* Does every card's invisible tap area cover its whole painted button?
   Painted positions measured from the supplied 853x1844 artwork. */
const wait = ms => new Promise(r => setTimeout(r, ms))
for (let i = 0; i < 60; i++) { if (document.querySelector('.native-rail')) break; await wait(150) }
await wait(400)
const PAINTED = [[1515, 1624], [1559, 1662], [1592, 1693]]
const slides = [...document.querySelectorAll('.native-slide')]
const out = []
slides.forEach((sl, i) => {
  const r = sl.getBoundingClientRect()
  const btn = sl.querySelector('button[aria-label]')
  const b = btn.getBoundingClientRect()
  const top = r.top + r.height * PAINTED[i][0] / 1844
  const bot = r.top + r.height * PAINTED[i][1] / 1844
  const covered = Math.max(0, Math.min(b.bottom, bot) - Math.max(b.top, top)) / (bot - top)
  out.push({ name: `card ${i + 1}: the whole painted button is tappable`, ok: covered >= 0.999,
    detail: `${(covered * 100).toFixed(0)}% covered (tap ${b.top.toFixed(0)}-${b.bottom.toFixed(0)}, painted ${top.toFixed(0)}-${bot.toFixed(0)})` })
})
const skips = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Skip')
out.push({ name: 'exactly one visible Skip, drawn by the app', ok: skips.length === 1, detail: `${skips.length} found` })
out.push({ name: 'the timer line is gone', ok: !document.querySelector('.partner-intro-timer'), detail: 'still present' })
const rail = document.querySelector('.native-rail')
const at = () => Math.round(rail.scrollLeft / (rail.clientWidth || 1))
const t0 = at(); await wait(4000)
out.push({ name: 'advances after 3.5s', ok: at() === t0 + 1, detail: `card ${t0} -> ${at()}` })
return out
