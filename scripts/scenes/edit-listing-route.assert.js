/* Did Edit listing reach the questionnaire, or bounce to Pricing? */
const wait = ms => new Promise(r => setTimeout(r, ms))
for (let i = 0; i < 80; i++) { if (document.querySelector('[data-ready]')) break; await wait(200) }
await wait(1200)   /* let the parameter be consumed and the redirect, if any, fire */
const bounced = !!document.querySelector('[data-landed="pricing"]')
const words = document.body.innerText
const wanted = new URLSearchParams(location.search).get('edit') ?? 'svc-1'
const opened = /Photography|Your work|What you offer this|step/i.test(words) && !bounced
return [
  { name: 'did NOT bounce to the Pricing tab', ok: !bounced, detail: bounced ? 'landed on PRICING TAB' : 'stayed' },
  { name: wanted === 'svc-1' ? 'the questionnaire opened' : 'a bad id is handled, not blank',
    ok: wanted === 'svc-1' ? opened : /could not be opened/i.test(words),
    detail: words.slice(0, 160).replace(/\s+/g, ' ') },
  { name: 'the screen is not blank', ok: words.replace(/rendered/i, '').trim().length > 0, detail: 'empty' },
]
