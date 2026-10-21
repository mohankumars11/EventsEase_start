const wait = ms => new Promise(r => setTimeout(r, ms))
await wait(700)
const t = document.querySelector('.app-splash-tagline')
const w = document.querySelector('.app-splash-wordmark')
const l = document.querySelector('.app-splash-ring')
const cs = el => el ? getComputedStyle(el) : {}
const b = el => el?.getBoundingClientRect?.()
const centred = el => el && Math.abs((b(el).x + b(el).width / 2) - innerWidth / 2) < 14
return [
  { name: 'tagline is a readable size', ok: parseFloat(cs(t).fontSize) >= 16, detail: cs(t).fontSize },
  { name: 'tagline is sentence case, not capitals', ok: cs(t).textTransform === 'none', detail: cs(t).textTransform },
  { name: 'tagline is centred', ok: centred(t), detail: `x=${Math.round(b(t).x)} w=${Math.round(b(t).width)} vw=${innerWidth}` },
  { name: 'tagline sits tight under the wordmark', ok: b(t).top - b(w).bottom < 40, detail: `gap=${Math.round(b(t).top - b(w).bottom)}px` },
  { name: 'loader is amethyst, not white', ok: /196, 167, 255/.test(cs(l).borderTopColor), detail: cs(l).borderTopColor },
  { name: 'loader is near the bottom', ok: b(l).top > innerHeight * 0.75, detail: `top=${Math.round(b(l).top)} of ${innerHeight}` },
]
