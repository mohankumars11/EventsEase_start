const wait = ms => new Promise(r => setTimeout(r, ms))
await wait(500)
const text = document.body.innerText
const cards = [...document.querySelectorAll('article')]
const header = document.querySelector('section[aria-label="Your Sambramo growth"] > div')
return [
  { name: 'the title says 34', ok: /TRADE CHAMPION\s*34/.test(text), detail: (text.match(/TRADE CHAMPION\s*\S+/) || [''])[0] },
  { name: 'nothing anywhere says 26', ok: !/\b26\b/.test(text), detail: (text.match(/.{0,20}\b26\b.{0,10}/) || [''])[0] },
  { name: 'the flower icon in the header is gone', ok: !header?.querySelector('svg'), detail: header?.querySelector('svg') ? 'an svg is still in the header' : '' },
  { name: 'no card is yellow', ok: !cards.some(c => /yellow|amber/.test(c.className)), detail: cards.map(c => c.className.match(/from-\S+/)?.[0]).join(' | ') },
]
