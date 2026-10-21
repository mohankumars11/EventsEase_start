/* Does the expanded Decoration & Floral spec actually reach the screen?
   Counting what renders, not what the data file says. */
const wait = ms => new Promise(r => setTimeout(r, ms))
for (let i = 0; i < 80; i++) { if (document.querySelector('[data-ready]')) break; await wait(200) }
const add = [...document.querySelectorAll('button')].find(b => /add (a |an )?(item|product|package)/i.test(b.textContent || ''))
if (add) { add.click(); await wait(1000) }
const words = document.body.innerText
const said = s => words.toLowerCase().includes(s.toLowerCase())
const chips = [...document.querySelectorAll('button')].map(b => (b.textContent || '').trim())
return [
  { name: 'item form opened', ok: !!add, detail: add ? 'opened' : 'no add button' },
  { name: 'the rate card asks what the item IS', ok: said('What is this?'), detail: 'kind question missing' },
  { name: 'per sq ft is a charging unit', ok: chips.some(c => /per sq ft/i.test(c)) || said('Per sq ft'), detail: 'no per-sq-ft unit' },
  { name: 'mandap is offered', ok: chips.some(c => /^mandap$/i.test(c)), detail: 'no mandap chip' },
  { name: 'flower wall is offered', ok: chips.some(c => /flower wall/i.test(c)), detail: 'missing' },
  { name: 'inclusions are chosen, not typed', ok: said('What the customer gets'), detail: 'missing' },
  { name: 'dismantling is asked explicitly', ok: said('Dismantling included'), detail: 'missing' },
  { name: 'crew and lead time are asked', ok: said('Crew needed') && said('Notice you need'), detail: 'missing' },
]
