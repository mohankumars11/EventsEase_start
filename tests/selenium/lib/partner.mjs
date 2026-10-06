/**
 * A throwaway partner, signed in inside the browser.
 *
 * Created with the service role (an auth user, a profile, a vendor row),
 * then given a REAL session: generateLink + verifyOtp on the anon client,
 * the same path a magic link takes. That session is written into the
 * page's localStorage under the key supabase-js reads, so the app starts
 * signed in as this partner and every request it makes is subject to
 * RLS and to migration 159, exactly as a real partner's would be.
 *
 * Every partner made here is removed by `cleanup()`, which then checks
 * that none are left.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ROOT } from './harness.mjs'

export function loadEnv() {
  const env = { ...process.env }
  try {
    for (const l of readFileSync(join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
      const m = /^([A-Z_]+)=(.*)$/.exec(l)
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* CI: secrets come from the environment */ }
  return env
}

export function hasDatabase(env = loadEnv()) {
  return !!(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY)
}

export function partners(env = loadEnv()) {
  const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const stamp = Date.now().toString(36)
  const made = []
  const storageKey = `sb-${new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`

  return {
    admin,
    storageKey,
    /** @param vendor columns to seed (null for none: the app creates it) */
    async create(label, vendor = {}) {
      const email = `tc-e2e-${label}-${stamp}@example.com`
      const { data: u, error } = await admin.auth.admin.createUser({ email, email_confirm: true })
      if (error) throw new Error(`createUser: ${error.message}`)
      const rec = { userId: u.user.id, email }
      made.push(rec)
      await admin.from('profiles').upsert({ id: rec.userId, email, full_name: 'TC E2E Partner', role: 'vendor' })
      if (vendor) {
        const { data: v, error: vErr } = await admin.from('vendors')
          .insert({ profile_id: rec.userId, business_name: `TC E2E ${label}`, ...vendor }).select('id').single()
        if (vErr) throw new Error(`vendor: ${vErr.message}`)
        rec.vendorId = v.id
      }
      const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
      const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
      const { data: s, error: sErr } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
      if (sErr) throw new Error(`session: ${sErr.message}`)
      rec.session = s.session
      return rec
    },

    /** Put the session where supabase-js looks, then open `path`. */
    async signIn(driver, baseUrl, rec, path) {
      await driver.get(baseUrl + '/__blank')
      await driver.executeScript(
        'localStorage.clear(); localStorage.setItem(arguments[0], arguments[1]); localStorage.setItem("ee_pending_role", "vendor")',
        storageKey, JSON.stringify(rec.session))
      await driver.get(baseUrl + path)
    },

    async vendorOf(rec, cols = '*') {
      const q = rec.vendorId ? admin.from('vendors').select(cols).eq('id', rec.vendorId)
                             : admin.from('vendors').select(cols).eq('profile_id', rec.userId)
      const { data } = await q.maybeSingle()
      if (data?.id) rec.vendorId = data.id
      return data
    },

    async cleanup() {
      for (const m of made.reverse()) {
        const { data: v } = await admin.from('vendors').select('id').eq('profile_id', m.userId).maybeSingle()
        const vid = m.vendorId ?? v?.id
        if (vid) {
          for (const t of ['vendor_payout_details', 'vendor_availability', 'vendor_weekly_rules', 'vendor_documents', 'partner_work', 'vendor_services', 'partner_listings']) {
            await admin.from(t).delete().eq('vendor_id', vid)
          }
          await admin.from('vendors').delete().eq('id', vid)
        }
        await admin.from('profiles').delete().eq('id', m.userId)
        await admin.auth.admin.deleteUser(m.userId)
      }
      const { data: left } = await admin.from('vendors').select('id').like('business_name', 'TC E2E%')
      return (left ?? []).length
    },
  }
}
