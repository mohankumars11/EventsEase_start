/* The splash must cover the whole viewport — the bug was a 3.5vh strip
   at the bottom where the tab bar showed through. */
const wait = ms => new Promise(r => setTimeout(r, ms))
await wait(500)
const g = document.querySelector('.app-splash')
const b = g.getBoundingClientRect()
const t = document.querySelector('.app-splash-tagline')
const w = document.querySelector('.app-splash-wordmark')
return [
  { name: 'ground starts at the very top', ok: Math.round(b.top) <= 0, detail: `top=${b.top.toFixed(1)}` },
  { name: 'ground reaches the very bottom', ok: Math.round(b.bottom) >= innerHeight, detail: `bottom=${b.bottom.toFixed(1)} viewport=${innerHeight}` },
  { name: 'ground is not transformed', ok: getComputedStyle(g).transform === 'none', detail: getComputedStyle(g).transform },
  { name: 'lockup still sits above centre', ok: (w.getBoundingClientRect().top + t.getBoundingClientRect().bottom) / 2 < innerHeight / 2,
    detail: `lockup mid=${((w.getBoundingClientRect().top + t.getBoundingClientRect().bottom) / 2).toFixed(0)} centre=${innerHeight / 2}` },
]
