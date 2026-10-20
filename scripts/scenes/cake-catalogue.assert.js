/* Part I's claim is a negative one: the flavour, size and allergen text
   boxes are gone and the product name no longer forces a baker to
   invent twenty names. A screenshot of chips cannot prove a text input
   is absent, so this opens the item form and reads it. */
const wait = ms => new Promise(r => setTimeout(r, ms))
for (let i = 0; i < 80; i++) { if (document.querySelector('[data-ready]')) break; await wait(200) }

const byText = re => [...document.querySelectorAll('button')].find(b => re.test(b.textContent || ''))
const add = byText(/add (a )?product/i)
if (add) { add.click(); await wait(900) }

const labels = [...document.querySelectorAll('label, p, span')].map(n => n.textContent || '')
const texty = [...document.querySelectorAll('input[type="text"], input:not([type]), textarea')]
  .map(i => (i.getAttribute('placeholder') || i.getAttribute('aria-label') || '').toLowerCase())
const words = document.body.innerText
const said = s => words.toLowerCase().includes(s)

/* A free-text flavour box would carry the old 40-char limit and sit
   under a "Flavour" label; chips are buttons, not inputs. */
const flavourChips = [...document.querySelectorAll('button')].filter(b => /^(chocolate|red velvet|rasmalai|lotus biscoff)$/i.test((b.textContent || '').trim()))
const allergenChips = [...document.querySelectorAll('button')].filter(b => /contains (egg|nuts|milk)/i.test(b.textContent || ''))
const sizeChips = [...document.querySelectorAll('button')].filter(b => /^(0\.5 kg|1 kg|box of 12)$/i.test((b.textContent || '').trim()))

return [
  { name: 'item form opened', ok: !!add && labels.length > 5, detail: add ? 'opened' : 'no Add button found' },
  { name: 'flavour is chosen from chips', ok: flavourChips.length >= 3, detail: `${flavourChips.length} flavour chips` },
  { name: 'size is chosen from chips', ok: sizeChips.length >= 2, detail: `${sizeChips.length} size chips` },
  { name: 'allergens are chosen from chips', ok: allergenChips.length >= 3, detail: `${allergenChips.length} allergen chips` },
  { name: 'a rare flavour a baker would never be offered before', ok: said('rasmalai'), detail: 'no rasmalai chip' },
  /* A placeholder is an attribute, not innerText — the first version of
     this check looked in innerText and failed on correct code. */
  { name: 'product name no longer demands invention', ok: texty.some(p => p.includes('leave blank')),
    detail: `placeholders: ${texty.join(' | ')}` },
  { name: 'no free-text flavour box remains', ok: !texty.some(p => p.includes('flavour')), detail: texty.join(' | ') },
  { name: 'no free-text allergen box remains', ok: !texty.some(p => p.includes('allergen')), detail: texty.join(' | ') },
]
