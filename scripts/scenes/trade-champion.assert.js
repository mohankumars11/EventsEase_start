// Body of an async function, run in the page by shoot-components --assert.
// Returns [{ name, ok, detail }]. Every wait polls: React paints after the
// harness says it mounted, and each tap starts a fetch.

const out = []
const check = (name, ok, detail = '') => out.push({ name, ok: !!ok, detail: ok ? '' : String(detail) })
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function until(fn, ms = 4000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    try { const v = fn(); if (v) return v } catch { /* not yet */ }
    await sleep(50)
  }
  return null
}
const $ = s => document.querySelector(s)
const $$ = s => [...document.querySelectorAll(s)]
const text = s => ($(s)?.textContent ?? '').trim()
const byText = (sel, t) => $$(sel).find(e => e.textContent.trim().includes(t))
const q = () => new URLSearchParams(location.search)
const lastCall = path => [...window.__calls].reverse().find(c => c.path === path)
async function back() { history.back(); await sleep(120) }

try {
  // ── More → Trade Champion 26 ─────────────────────────────────────
  await until(() => $('[data-testid=more]'))
  $('[data-testid=more-referral]').click()
  const grid = await until(() => $('[data-testid=trade-grid]'))
  check('Referral & rewards opens the Trade Champion dashboard', grid && text('[data-testid=screen-title]') === 'Trade Champion 26')

  const tiles = $$('[data-trade-id]')
  const ids = tiles.map(t => t.dataset.tradeId)
  const expected = window.__TRADES
  check('all 26 trades render', tiles.length === 26, `found ${tiles.length}`)
  check('each exactly once', new Set(ids).size === 26, ids.join())
  check('in the canonical order, with the canonical names',
    expected.every((t, i) => ids[i] === t.id && tiles[i].textContent.includes(t.name)))
  check('every tile is a real button', tiles.every(t => t.tagName === 'BUTTON' && t.type === 'button'))
  check('the partner code is shown', text('[data-testid=partner-code]') === 'KTM4RZ')
  check('totals come from the rows: 3 signed up', text('[data-testid=total-registered]').endsWith('3'), text('[data-testid=total-registered]'))
  check('and 1 reward qualified, 0 paid',
    text('[data-testid=total-reward_eligible]').endsWith('1') && text('[data-testid=total-paid]').endsWith('0'))
  check('a tile says what happened in its trade', /2 signed up · 2 live/.test($('[data-trade-id="SBM-TRD-014"]').textContent),
    $('[data-trade-id="SBM-TRD-014"]').textContent)
  check('an untouched trade says so rather than a zero', /No invitations yet/.test($('[data-trade-id="SBM-TRD-001"]').textContent))
  const listRows = await until(() => $$('[data-referral-id]').length === 3 && $$('[data-referral-id]'))
  check('every referral is listed', listRows && listRows.length === 3)

  // ── Tap a trade ──────────────────────────────────────────────────
  $('[data-trade-id="SBM-TRD-014"]').click()
  await until(() => $('[data-testid=trade-id]'))
  check('tapping a trade opens that trade', text('[data-testid=screen-title]') === 'Photography' && text('[data-testid=trade-id]') === 'SBM-TRD-014')
  check('and the trade is in the URL', q().get('trade') === 'SBM-TRD-014')
  await until(() => text('[data-testid=trade-registered]').endsWith('2'))
  check('its own counts, not the totals', text('[data-testid=trade-registered]').endsWith('2') && text('[data-testid=trade-invited]').endsWith('2'),
    `${text('[data-testid=trade-registered]')} / ${text('[data-testid=trade-invited]')}`)
  await until(() => $$('[data-invite-code]').length === 2)
  check('its invitations are listed with their state',
    /Signed up/.test($('[data-invite-code=PHTK7M2Q]')?.textContent) && /Waiting/.test($('[data-invite-code=PHTZZ8NV]')?.textContent))

  // ── Invite, for this trade ───────────────────────────────────────
  const before = window.__calls.filter(c => c.path === '/rpc/create_referral_invite').length
  $('[data-testid=invite-button]').click()
  await until(() => $('[data-testid=created-invite]'))
  const made = lastCall('/rpc/create_referral_invite')
  check('Invite creates an invitation on the server', window.__calls.filter(c => c.path === '/rpc/create_referral_invite').length === before + 1)
  check('for the trade that was selected', made?.body?.p_trade_id === 'SBM-TRD-014', JSON.stringify(made?.body))
  check('with an idempotency key', /^[0-9a-f-]{36}$/.test(made?.body?.p_idempotency_key ?? ''))
  const code = text('[data-testid=invite-code]')
  check('the new code is shown', code.length === 8, code)
  await until(() => $(`[data-invite-code="${code}"]`))
  check('and appears in the invitations list', !!$(`[data-invite-code="${code}"]`))

  byText('[data-testid=created-invite] button', 'Copy invitation').click()
  await until(() => window.__copied.length)
  const copied = window.__copied.at(-1) ?? ''
  check('Copy copies the invitation with its code and trade',
    copied.includes(code) && copied.includes('Photography') && copied.includes(`ref=${code}`), copied)
  byText('[data-testid=created-invite] button', 'Share invitation').click()
  await until(() => window.__shared || window.__copied.length > 1)
  const shared = window.__shared?.text ?? window.__copied.at(-1)
  check('Share hands the same invitation to the share sheet', (shared ?? '').includes(code), JSON.stringify(window.__shared))
  check('sharing is not a referral: the sign-up count did not move',
    text('[data-testid=trade-registered]').endsWith('2'))

  // ── One referral, and back ───────────────────────────────────────
  await until(() => $('[data-referral-id=r-photo-1]'))
  $('[data-referral-id=r-photo-1]').click()
  await until(() => $('[data-testid=referral-detail]'))
  check('a referral opens its own screen', text('[data-testid=screen-title]') === 'Referral' && /Lens & Light Studio/.test(document.body.textContent))
  const done = $$('[data-milestone][data-done=true]').map(e => e.dataset.milestone)
  check('its milestones are the ones stamped', done.join() === 'registered,onboarding_completed,verified,live,first_event_completed,qualified', done.join())
  check('QUALIFIED IS NOT PAID: the paid step is not done', $('[data-milestone=paid]')?.dataset.done === 'false')
  check('and the reward says so', /Qualified · not paid yet/.test(document.body.textContent))
  check('with the next step spelled out', /not paid yet/.test(text('[data-testid=next-step]')), text('[data-testid=next-step]'))
  check('no phone number or reason is on the screen', !/\+91|98765|rejected_reason|fraud/i.test(document.body.textContent))

  await back()
  await until(() => $('[data-testid=trade-id]') && !q().get('rid'))
  check('Android back from a referral returns to its trade', text('[data-testid=screen-title]') === 'Photography' && !q().get('rid'))
  await back()
  await until(() => $('[data-testid=trade-grid]'))
  check('and again returns to the dashboard', !!$('[data-testid=trade-grid]') && !q().get('trade'))

  // ── Filters survive a round trip ─────────────────────────────────
  byText('[aria-label="Filter by stage"] button', 'Live').click()
  await until(() => lastCall('/rpc/my_referrals')?.body?.p_state === 'live' && $$('[data-referral-id]').length === 1)
  check('filtering by stage asks the server for that stage', lastCall('/rpc/my_referrals')?.body?.p_state === 'live')
  check('and shows only those', $$('[data-referral-id]').length === 1 && !!$('[data-referral-id=r-photo-2]'))
  const input = $('[aria-label="Search referrals"]')
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  set.call(input, 'candid'); input.dispatchEvent(new Event('input', { bubbles: true }))
  await until(() => q().get('q') === 'candid')
  check('search is in the URL', q().get('q') === 'candid' && q().get('st') === 'live')
  const depth = history.length
  set.call(input, 'candid frames'); input.dispatchEvent(new Event('input', { bubbles: true }))
  await sleep(150)
  check('typing does not stack history entries', history.length === depth, `${depth} → ${history.length}`)
  $('[data-referral-id=r-photo-2]').click()
  await until(() => $('[data-testid=referral-detail]'))
  await back()
  await until(() => $('[data-testid=trade-grid]') && $$('[data-referral-id]').length)
  check('back from a filtered referral keeps the filters',
    q().get('st') === 'live' && byText('[aria-label="Filter by stage"] button', 'Live')?.getAttribute('aria-pressed') === 'true')

  // ── The on-screen Back agrees with the system one ────────────────
  $('[data-trade-id="SBM-TRD-005"]').click()
  await until(() => text('[data-testid=trade-id]') === 'SBM-TRD-005')
  $('[data-testid=screen-back]').click()
  await until(() => $('[data-testid=trade-grid]'))
  check('the on-screen Back from a trade returns to the dashboard', !q().get('trade') && !!$('[data-testid=trade-grid]'))

  // ── Empty, offline, not switched on, retry ───────────────────────
  $('[data-trade-id="SBM-TRD-001"]').click()
  await until(() => /Nobody has signed up for Anchor & MC/.test(document.body.textContent))
  check('a trade with nobody yet says so plainly', /No invitations for Anchor & MC yet/.test(document.body.textContent))
  await back()
  await until(() => $('[data-testid=trade-grid]'))

  window.__mode = 'offline'
  byText('button', 'Refresh').click()
  await until(() => /You are offline/.test(document.body.textContent))
  check('offline is said as offline, with a retry', /You are offline/.test(document.body.textContent) && !!byText('button', 'Try again'))
  check('and the last good numbers stay on screen', !!$('[data-testid=trade-grid]'))
  window.__mode = 'ok'
  byText('[role=alert] button', 'Try again').click()
  await until(() => !/You are offline/.test(document.body.textContent) && $('[data-testid=trade-grid]'))
  check('retry recovers', !/You are offline/.test(document.body.textContent))

  window.__mode = 'unavailable'
  $('[data-trade-id="SBM-TRD-014"]').click()
  await until(() => /Not switched on yet/.test(document.body.textContent))
  check('a database without migration 158 says "not switched on", not a blank', /Not switched on yet/.test(document.body.textContent))
  window.__mode = 'ok'
  await back()
  await until(() => $('[data-testid=trade-grid]'))

  // ── Grow with Sambramo ───────────────────────────────────────────
  await back()
  await until(() => $('[data-testid=more]'))
  check('back from the dashboard leaves the referral screen', !!$('[data-testid=more]'))
  $('[data-testid=more-growth]').click()
  await until(() => $('[data-testid=grow-ready]'))
  check('Grow opens its own hub', text('[data-testid=screen-title]') === 'growth' && !$('[data-testid=trade-grid]') && !$('[data-testid=profile-count]'))
  check('and says truthfully the partner cannot get jobs yet', /Not receiving jobs yet/.test(text('[data-testid=grow-ready]')))
  check('naming what is missing', /Get verified/.test(document.body.textContent) && /Switch job alerts back on/.test(document.body.textContent))
  await until(() => /2 signed up|3 signed up/.test(document.body.textContent))
  check('its Trade Champion row shows the real numbers', /3 signed up · 2 live · 3 invitations/.test($('[data-testid=grow-referral]').textContent),
    $('[data-testid=grow-referral]').textContent)
  $('[data-testid=grow-referral]').click()
  await until(() => $('[data-testid=trade-grid]'))
  check('which opens the same referral dashboard', q().get('screen') === 'referral')
  await back()
  await until(() => $('[data-testid=grow-ready]'))
  check('and back returns to Grow', q().get('screen') === 'growth')
  $('[data-testid=grow-area]').click()
  await until(() => $('[data-testid=screen-area]'))
  check('a Grow row opens the exact editor', window.__went?.screen === 'area')
  await back()
  await until(() => $('[data-testid=grow-ready]'))

  // ── Build Your Profile ───────────────────────────────────────────
  await back()
  await until(() => $('[data-testid=more]'))
  $('[data-testid=more-build]').click()
  await until(() => $('[data-testid=profile-count]'))
  const rows = $$('[data-testid^=check-]')
  check('Build Your Profile lists ten items', rows.length === 10, rows.length)
  check('and is not the growth hub', !$('[data-testid=grow-ready]'))
  const count = () => Number(text('[data-testid=profile-count]').split(' ')[0])
  const c0 = count()
  check('the business item is to do while the description is short',
    /To do/.test($('[data-testid=check-business]').textContent))
  $('[data-testid=check-business]').click()
  await until(() => $('[data-testid=screen-business]'))
  check('its row opens the business editor', window.__went?.screen === 'business')
  await back()
  await until(() => $('[data-testid=profile-count]'))
  check('opening the editor and coming back changed nothing', count() === c0, `${c0} → ${count()}`)
  window.__saveDescription()
  await until(() => count() === c0 + 1)
  check('saving the description completes it, recounted', count() === c0 + 1 && /Complete/.test($('[data-testid=check-business]').textContent),
    `${c0} → ${count()}`)
  check('verification reads as under review, from the saved status', /Under review/.test($('[data-testid=check-verification]').textContent))
  $('[data-testid=check-availability]').click()
  await sleep(150)
  check('availability opens the Calendar tab', window.__went?.tab === 'availability')
} catch (e) {
  check('the script ran to the end', false, e?.stack ?? e)
}

return out
