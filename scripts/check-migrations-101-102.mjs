/**
 * Are 101 and 102 applied, and do they actually do their job?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT "APPLIED" IS NOT ENOUGH TO MEAN
 * ══════════════════════════════════════════════════════════════════════
 *
 * 101's whole point is that `match_partners` stops matching a row nobody
 * has read. A `review_status` column that exists while dispatch ignores
 * it is worse than no column: the badge tells a partner they are under
 * review while jobs arrive anyway.
 *
 * So the guard is tested by flipping one row and watching a partner drop
 * out of the match — then putting it straight back. That is a write to
 * production, done deliberately, bounded, and verified restored. It is
 * the one thing here that cannot be proven any other way.
 *
 * Usage:  node --env-file=.env scripts/check-migrations-101-102.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY
if (!url || !key) { console.error('\n  Needs the service role key.\n'); process.exit(2) }
const db = createClient(url, key, { auth: { persistSession: false } })

const fails = []
const line = (ok, label, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  ${detail}` : ''}`)
  if (!ok) fails.push(label + (detail ? ` — ${detail}` : ''))
}

console.log('\n  101 · a listing goes live when somebody says so\n')

const { data: probe, error: probeErr } = await db
  .from('vendor_services').select('id, review_status, reviewed_at, review_note').limit(1)

if (probeErr) {
  line(false, 'review_status column', probeErr.message.slice(0, 70))
  console.error('\n  101 is not applied.\n')
  process.exit(1)
}
line(true, 'review_status column readable')

/* The CHECK. Aimed at a REAL row, because a constraint never fires when
   no row matches — the mistake that made the 098 probe report a missing
   constraint on a database that had it. Restored if it somehow lands. */
{
  const { id, review_status } = probe[0]
  const { error } = await db.from('vendor_services')
    .update({ review_status: 'banana' }).eq('id', id)
  if (!error) {
    await db.from('vendor_services').update({ review_status }).eq('id', id)
    line(false, 'an invalid status is refused', 'CHECK missing — row restored')
  } else {
    line(/review_status_valid|violates check/i.test(error.message),
      'an invalid status is refused')
  }
}

/* The counts. Every row that predates 101 should be live, or every
   partner on the platform went dark the moment it was applied. */
{
  const counts = {}
  for (const st of ['live', 'under_review', 'rejected']) {
    const { count } = await db.from('vendor_services')
      .select('id', { count: 'exact', head: true }).eq('review_status', st)
    counts[st] = count ?? 0
  }
  const { count: all } = await db.from('vendor_services')
    .select('id', { count: 'exact', head: true })
  line(counts.live > 0, `existing listings kept live`,
    Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ') + ` of ${all}`)
  if (counts.live + counts.under_review + counts.rejected !== all) {
    fails.push('some rows have no review_status')
  }
}

/* ── The guard that matters ───────────────────────────────────────── */
{
  /* The row to flip has to be the vendor's ONLY live row in its trade.
   *
   * The first version took any live row. It landed on a decorator with
   * SIX rows in "Decoration & Floral", so flipping one left five live,
   * the vendor stayed matched, and the check reported the migration
   * broken on a database where it was working. A test that names an
   * innocent migration is worse than no test at all.
   *
   * The clause in match_partners is
   * `EXISTS (... category = p_trade AND review_status = 'live')`, which
   * is per-VENDOR -- so only a vendor whose sole row in that trade goes
   * under review can prove it. */
  const { data: cands } = await db
    .from('vendor_services')
    .select('id, vendor_id, category, review_status, is_active, vendor:vendors(is_verified, location)')
    .eq('review_status', 'live').eq('is_active', true).limit(600)

  const perVendorTrade = new Map()
  for (const r of cands ?? []) {
    const k = r.vendor_id + '|' + r.category
    perVendorTrade.set(k, (perVendorTrade.get(k) ?? 0) + 1)
  }
  const row = (cands ?? []).find(r =>
    r.vendor?.is_verified && r.vendor?.location
    && perVendorTrade.get(r.vendor_id + '|' + r.category) === 1)

  if (!row) {
    line(false, 'match_partners honours review_status',
      'no verified partner with a single live row in one trade')
  } else {
    const { data: point } = await db.rpc('point_of', { p_lat: 12.9716, p_lng: 77.5946 })
    const args = {
      p_trade: row.category, p_point: point, p_radius_m: 60000,
      p_date: '2027-01-15', p_allow_synthetic: true, p_limit: 500,
    }

    const before = await db.rpc('match_partners', args)
    const inBefore = (before.data ?? []).some(r => r.vendor_id === row.vendor_id)

    if (!inBefore) {
      line(false, 'match_partners honours review_status',
        'the test partner is not matched even while live -- cannot tell')
    } else {
      await db.from('vendor_services').update({ review_status: 'under_review' }).eq('id', row.id)
      const during = await db.rpc('match_partners', args)
      const inDuring = (during.data ?? []).some(r => r.vendor_id === row.vendor_id)

      const { error: restoreErr } = await db.from('vendor_services')
        .update({ review_status: 'live' }).eq('id', row.id)
      const { data: after } = await db.from('vendor_services')
        .select('review_status').eq('id', row.id).single()

      const restored = !restoreErr && after?.review_status === 'live'
      if (!restored) {
        console.error('  !! ROW ' + row.id + ' LEFT AT ' + after?.review_status + " -- SET IT BACK TO 'live'")
        fails.push('the test row was not restored')
      }

      line(!inDuring, 'match_partners honours review_status',
        inDuring ? 'still matched while under review -- the badge would be a lie'
                 : 'sole row in ' + row.category + ', restored ' + (restored ? 'ok' : 'FAILED'))
    }
  }
}

console.log('\n  102 · partner-uploads\n')
{
  const { data: buckets, error } = await db.storage.listBuckets()
  if (error) {
    line(false, 'buckets readable', error.message.slice(0, 60))
  } else {
    const b = (buckets ?? []).find(x => x.id === 'partner-uploads')
    line(!!b, 'partner-uploads bucket exists')
    if (b) {
      line(b.public === false, 'bucket is private',
        b.public ? 'PUBLIC — a menu card would be world-readable' : '')
      const mimes = b.allowed_mime_types ?? []
      line(mimes.includes('application/pdf'), 'accepts PDF', mimes.join(', ').slice(0, 60))
      line((b.file_size_limit ?? 0) >= 5 * 1024 * 1024,
        'size limit fits a phone photo',
        `${Math.round((b.file_size_limit ?? 0) / 1048576)} MB`)
    }

    /* A real round trip. service_role bypasses RLS, so this proves the
       bucket accepts and returns a file -- not that the policies are
       right. Those are only provable from a partner's own session, which
       is what the app does on a handset. */
    const path = `__check__/${Date.now()}.txt`
    const up = await db.storage.from('partner-uploads')
      .upload(path, new Blob(['check'], { type: 'text/plain' }), { contentType: 'text/plain' })
    if (up.error) {
      /* text/plain is not on the allow list, which is itself correct. */
      const refused = /mime|not supported|invalid/i.test(up.error.message)
      line(refused, 'a disallowed type is refused', refused ? '' : up.error.message.slice(0, 60))
    } else {
      await db.storage.from('partner-uploads').remove([path])
      line(false, 'a disallowed type is refused', 'text/plain was accepted — allow list not applied')
    }
  }
}

if (fails.length) {
  console.error('\n  FAILED\n' + fails.map(f => '   · ' + f).join('\n') + '\n')
  process.exit(1)
}
console.log('\n  101 and 102 are live and doing their job.\n')
