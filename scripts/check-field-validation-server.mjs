#!/usr/bin/env node
/**
 * Does the database refuse what the screens refuse — and only that?
 *
 *   node scripts/check-field-validation-server.mjs
 *
 * Needs migration 159 on the database, and .env (VITE_SUPABASE_URL,
 * VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).
 *
 *   PARITY       every rule-catalogue case the APP accepts, the server
 *                accepts too (it is never stricter than the screen); and
 *                how many the app refuses the server also refuses.
 *   DIRECT       as a real partner session, straight to PostgREST, one bad
 *                value per column: refused with 22023 naming the field,
 *                and the row is unchanged afterwards.
 *   BOUNDARIES   another partner's row, an invalid enum, a legacy value
 *                left alone, duplicate and concurrent saves, an oversized
 *                payload, and the operator path that corrects data.
 *
 * Writes only to throwaway partners it creates (tc-valid-*@example.com,
 * "TC VALID …") and deletes them all at the end, then checks none remain.
 * Never a booking, a payout or another partner's row.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ROOT, loadSrc } from './lib/loadSrc.mjs'
import { CASES } from './validation/catalogue.mjs'

const env = Object.fromEntries(readFileSync(join(ROOT, '.env'), 'utf8').split(/\r?\n/)
  .filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')] }))
const URL_ = env.VITE_SUPABASE_URL
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anonClient = () => createClient(URL_, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const M = await loadSrc({
  'src/lib/validation/fieldRules.js': ['validateField', 'SEVERITY'],
  'src/lib/validation/inventory.js': ['FIELD_INVENTORY'],
})

const tick = String.fromCharCode(10003), cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const results = []
const ok = (group, n, cond, d = '') => {
  ran++; if (!cond) bad++
  results.push({ group, name: n, pass: !!cond, detail: cond ? '' : String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300) })
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 200)}`}`)
}
const head = t => console.log(`\n${t}\n`)

/* ═══ PARITY ═════════════════════════════════════════════════════════ */
head('PARITY: the server is never stricter than the app')

const pairs = [...new Map(M.FIELD_INVENTORY.filter(f => f.rule && f.server).map(f => [`${f.rule}|${f.server}`, f])).values()]
const probe = await admin.rpc('partner_field_error', { p_field: 'pincode', p_value: '560001' })
if (probe.error) {
  ok('parity', 'migration 159 is on the database', false, `partner_field_error(): ${probe.error.message}. Paste 159 first.`)
  process.exit(1)
}

let accepted = 0, stricter = [], refusedBoth = 0, refusedAppOnly = 0
for (const f of pairs) {
  for (const [cat, input, , , caseCtx] of CASES[f.rule] ?? []) {
    const js = M.validateField(f.rule, input, caseCtx ?? {})
    const row = caseCtx?.doc_issue_date ? { issue_date: caseCtx.doc_issue_date } : caseCtx?.time_from ? { start_time: caseCtx.time_from } : {}
    if (js.severity !== M.SEVERITY.ERROR) {
      /* What the app would store: the normalised value, and for a number
         column an empty box is saved as NULL, never as the string ''. */
      const NUMERIC = ['item_price', 'starting_price', 'years_active', 'lead_time_days', 'daily_capacity', 'daily_slots', 'service_radius_km', 'venue_capacity', 'doc_issue_date', 'doc_expiry_date']
      const stored = NUMERIC.includes(f.server) && js.value === '' ? null : js.value
      const { data, error } = await admin.rpc('partner_field_error', { p_field: f.server, p_value: stored, p_row: row })
      accepted++
      if (error || data) stricter.push(`${f.rule}→${f.server} [${cat}] ${JSON.stringify(js.value).slice(0, 40)}: ${error?.message ?? data.says}`)
    } else {
      /* What a crafted request would send: the raw value. */
      const { data } = await admin.rpc('partner_field_error', { p_field: f.server, p_value: input, p_row: row })
      if (data) refusedBoth++; else refusedAppOnly++
    }
  }
}
ok('parity', `every value the app accepts, the server accepts (${accepted} checked)`, stricter.length === 0, stricter.length + ': ' + stricter.join(' | '))
for (const s of stricter) console.log('      stricter: ' + s)
console.log(`    of the values the app refuses, the server also refuses ${refusedBoth}; ${refusedAppOnly} are app-only`)
console.log('    (app-only: advice-level rules such as keyboard mash and phone numbers in captions, and Unicode name')
console.log('    character classes the server leaves to the app on purpose; see migration 159\'s header)')

/* ═══ Throwaway partners ═════════════════════════════════════════════ */
const stamp = Date.now().toString(36)
const made = []
const GOOD = {
  business_name: 'TC VALID Anna Ruchi', contact_phone: '9845012345', description: 'Pure vegetarian catering for weddings since 2011.',
  years_active: 12, area: 'Jayanagar', daily_capacity: 2, pincode: '560041', category: 'Catering & Food',
}

async function partner(label) {
  const email = `tc-valid-${label}-${stamp}@example.com`
  const { data: u, error } = await admin.auth.admin.createUser({ email, email_confirm: true })
  if (error) throw new Error(`createUser: ${error.message}`)
  const userId = u.user.id
  made.push({ userId })
  await admin.from('profiles').upsert({ id: userId, email, full_name: `TC VALID ${label}`, role: 'vendor' })
  const { data: v, error: vErr } = await admin.from('vendors').insert({ profile_id: userId, ...GOOD, business_name: `TC VALID ${label}` }).select('id').single()
  if (vErr) throw new Error(`vendor: ${vErr.message}`)
  made.at(-1).vendorId = v.id
  const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  const client = anonClient()
  const { error: sErr } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
  if (sErr) throw new Error(`session: ${sErr.message}`)
  return { client, userId, vendorId: v.id }
}

const details = e => { try { return JSON.parse(e?.details ?? '{}') } catch { return {} } }

try {
  const A = await partner('a')
  const B = await partner('b')

  /* ═══ DIRECT ═══════════════════════════════════════════════════════ */
  head('DIRECT: straight to PostgREST, as the partner, one bad value per column')

  const DIRECT = [
    ['vendors', 'business_name', '<script>alert(1)</script>', 'business_name'],
    ['vendors', 'business_name', '12345', 'business_name'],
    ['vendors', 'contact_phone', 'hello', 'contact_phone'],
    ['vendors', 'contact_phone', '5845000000', 'contact_phone'],
    ['vendors', 'contact_phone', '+1 4155550100', 'contact_phone'],
    ['vendors', 'whatsapp_phone', '98450', 'whatsapp_phone'],
    ['vendors', 'description', 'Call me on 98450 12345 for rates', 'description'],
    ['vendors', 'description', 'x'.repeat(601), 'description'],
    ['vendors', 'description', 'Nice\u0007work', 'description'],
    ['vendors', 'instagram_url', 'anna ruchi', 'instagram_url'],
    ['vendors', 'website_url', 'javascript:alert(1)', 'website_url'],
    ['vendors', 'years_active', 80, 'years_active'],
    ['vendors', 'years_experience', 76, 'years_active'],
    ['vendors', 'starting_price', 0, 'starting_price'],
    ['vendors', 'starting_price', 10000000, 'starting_price'],
    ['vendors', 'area', '560041', 'area'],
    ['vendors', 'daily_capacity', 13, 'daily_capacity'],
    ['vendors', 'lead_time_days', 91, 'lead_time_days'],
    ['vendors', 'service_radius_km', 500, 'service_radius_km'],
    ['vendors', 'pincode', '5600a1', 'pincode'],
    ['vendors', 'pincode', '960001', 'pincode'],
    ['vendors', 'closure_reason', '<b>bye</b>', 'closure_reason'],
    ['vendors', 'category', 'Plumbing', 'trade_name'],
    ['profiles', 'full_name', 'Anna 2', 'full_name'],
    ['profiles', 'phone', 'abc', 'owner_phone'],
  ]
  for (const [table, col, value, field] of DIRECT) {
    const key = table === 'profiles' ? ['id', A.userId] : ['id', A.vendorId]
    const { data: before } = await admin.from(table).select(col).eq(key[0], key[1]).single()
    const { error } = await A.client.from(table).update({ [col]: value }).eq(key[0], key[1])
    const { data: after } = await admin.from(table).select(col).eq(key[0], key[1]).single()
    const d = details(error)
    ok('direct', `${table}.${col} = ${JSON.stringify(value).slice(0, 34)} is refused (${field}), row unchanged`,
      error?.code === '22023' && d.field === field && JSON.stringify(before) === JSON.stringify(after),
      { code: error?.code, field: d.field, before, after })
  }

  const payoutBad = [['upi_id', 'anna@gmail.com'], ['account_number', '12345abc6789'], ['ifsc', 'HDFC1001234'], ['pan', 'abcde1234f'], ['account_name', 'Anna 2']]
  for (const [col, value] of payoutBad) {
    const row = { vendor_id: A.vendorId, method: col === 'upi_id' ? 'upi' : 'bank', [col]: value }
    const { error } = await A.client.from('vendor_payout_details').upsert(row, { onConflict: 'vendor_id' })
    const { data: after } = await admin.from('vendor_payout_details').select('vendor_id').eq('vendor_id', A.vendorId).maybeSingle()
    ok('direct', `vendor_payout_details.${col} = ${JSON.stringify(value).slice(0, 20)} is refused, nothing saved`,
      error?.code === '22023' && !after, { code: error?.code, saved: !!after })
  }

  const { error: availErr } = await A.client.from('vendor_availability').upsert(
    { vendor_id: A.vendorId, slot_date: '2099-01-01', status: 'LIMITED', slots_total: 0 }, { onConflict: 'vendor_id,slot_date' })
  ok('direct', 'vendor_availability.slots_total = 0 is refused', availErr?.code === '22023', availErr)
  const { error: noteErr } = await A.client.from('vendor_availability').upsert(
    { vendor_id: A.vendorId, slot_date: '2099-01-02', status: 'OPEN', note: 'x'.repeat(201) }, { onConflict: 'vendor_id,slot_date' })
  ok('direct', 'vendor_availability.note of 201 characters is refused', noteErr?.code === '22023', noteErr)
  const { error: workErr } = await A.client.from('partner_work').insert({ vendor_id: A.vendorId, kind: 'testimonial', body: '<script>x</script>' })
  ok('direct', 'partner_work.body with markup is refused', workErr?.code === '22023', workErr)

  /* ═══ BOUNDARIES ═══════════════════════════════════════════════════ */
  head('BOUNDARIES')

  const { error: goodErr } = await A.client.from('vendors').update({ description: 'Weddings, house functions and corporate lunches.' }).eq('id', A.vendorId)
  const { data: afterGood } = await admin.from('vendors').select('description, business_name, contact_phone, area, pincode').eq('id', A.vendorId).single()
  ok('boundaries', 'a valid edit saves', !goodErr && afterGood.description.startsWith('Weddings'), goodErr)
  ok('boundaries', 'and leaves every other field as it was',
    afterGood.contact_phone === GOOD.contact_phone && afterGood.area === GOOD.area && afterGood.pincode === GOOD.pincode, afterGood)

  const { data: bBefore } = await admin.from('vendors').select('business_name').eq('id', B.vendorId).single()
  const cross = await A.client.from('vendors').update({ business_name: 'TC VALID taken over' }).eq('id', B.vendorId).select('id')
  const { data: bAfter } = await admin.from('vendors').select('business_name').eq('id', B.vendorId).single()
  ok('boundaries', 'a partner cannot change another partner\'s row', (cross.data ?? []).length === 0 && bAfter.business_name === bBefore.business_name, { cross, bAfter })
  const crossPayout = await A.client.from('vendor_payout_details').upsert({ vendor_id: B.vendorId, method: 'upi', upi_id: 'tcvalid@ybl' }, { onConflict: 'vendor_id' })
  const { data: bPayout } = await admin.from('vendor_payout_details').select('upi_id').eq('vendor_id', B.vendorId).maybeSingle()
  ok('boundaries', 'nor another partner\'s payout destination', !!crossPayout.error && !bPayout, { error: crossPayout.error?.code, bPayout })

  const enumTry = await A.client.from('vendors').update({ verification_status: 'approved' }).eq('id', A.vendorId)
  const { data: vs } = await admin.from('vendors').select('verification_status, is_verified').eq('id', A.vendorId).single()
  ok('boundaries', 'a partner cannot set an approval status', vs.verification_status !== 'approved' && !vs.is_verified, { error: enumTry.error?.message, vs })
  const enumBogus = await A.client.from('vendors').update({ verification_status: 'superstar' }).eq('id', A.vendorId)
  ok('boundaries', 'an unknown status value is refused', !!enumBogus.error, enumBogus.error)

  // A legacy value the rules would refuse, written the way old data was.
  await admin.from('vendors').update({ contact_phone: 'call office' }).eq('id', A.vendorId)
  const legacy = await A.client.from('vendors').update({ area: 'Basavanagudi' }).eq('id', A.vendorId)
  ok('boundaries', 'a row with an old invalid value can still have OTHER fields edited', !legacy.error, legacy.error)
  const legacyTouch = await A.client.from('vendors').update({ contact_phone: 'call office 2' }).eq('id', A.vendorId)
  ok('boundaries', 'but the old value cannot be replaced by another invalid one', legacyTouch.error?.code === '22023', legacyTouch.error)
  await admin.from('vendors').update({ contact_phone: GOOD.contact_phone }).eq('id', A.vendorId)

  const op = await admin.from('vendors').update({ daily_capacity: 20 }).eq('id', A.vendorId)
  ok('boundaries', 'the operator path (service role) can still correct data outside the partner rules', !op.error, op.error)
  await admin.from('vendors').update({ daily_capacity: 2 }).eq('id', A.vendorId)

  const twice = await Promise.all([1, 2].map(() => A.client.from('vendors').update({ area: 'Malleshwaram' }).eq('id', A.vendorId).select('area')))
  ok('boundaries', 'the same save sent twice lands once, the same way', twice.every(r => !r.error && r.data?.[0]?.area === 'Malleshwaram'), twice.map(r => r.error))

  await Promise.all([
    A.client.from('vendors').update({ area: 'Rajajinagar' }).eq('id', A.vendorId),
    A.client.from('vendors').update({ lead_time_days: 5 }).eq('id', A.vendorId),
  ])
  const { data: both } = await admin.from('vendors').select('area, lead_time_days').eq('id', A.vendorId).single()
  ok('boundaries', 'two saves of different fields at once both land (no clobber)', both.area === 'Rajajinagar' && both.lead_time_days === 5, both)

  const huge = await A.client.from('vendors').update({ description: 'a'.repeat(1_000_000) }).eq('id', A.vendorId)
  ok('boundaries', 'a one-megabyte description is refused', !!huge.error, 'saved')

  const anonTry = await anonClient().from('vendors').update({ business_name: 'TC VALID anon' }).eq('id', A.vendorId).select('id')
  ok('boundaries', 'nobody signed out can change a partner', (anonTry.data ?? []).length === 0, anonTry)
} catch (e) {
  ok('setup', 'the run completed', false, e.message)
} finally {
  for (const m of made.reverse()) {
    if (m.vendorId) {
      await admin.from('vendor_payout_details').delete().eq('vendor_id', m.vendorId)
      await admin.from('vendor_availability').delete().eq('vendor_id', m.vendorId)
      await admin.from('partner_work').delete().eq('vendor_id', m.vendorId)
      await admin.from('vendors').delete().eq('id', m.vendorId)
    }
    await admin.from('profiles').delete().eq('id', m.userId)
    await admin.auth.admin.deleteUser(m.userId)
  }
  const { data: left } = await admin.from('vendors').select('id').like('business_name', 'TC VALID%')
  ok('cleanup', 'every throwaway partner was removed', (left ?? []).length === 0, left)
}

mkdirSync(join(ROOT, 'reports', 'validation'), { recursive: true })
writeFileSync(join(ROOT, 'reports', 'validation', 'server.json'), JSON.stringify({ ran, failed: bad, results }, null, 1))
console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran} server checks   report: reports/validation/server.json\n`)
process.exit(bad ? 1 : 0)
