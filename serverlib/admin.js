import { createClient } from '@supabase/supabase-js'

/**
 * "Is the person calling this actually an admin?"
 *
 * Shared by every AI endpoint, because each of them spends money on somebody
 * else's API key and none may be reachable by an anonymous POST. The admin
 * console is behind a route guard, but a route guard is a UI convenience — it
 * stops a link being clickable, not a request being made.
 *
 * The role is re-read from the database on every call rather than trusted from
 * a claim inside the token: a JWT minted when somebody was an admin keeps
 * saying so until it expires, long after the role was revoked.
 *
 * Lives outside `api/` on purpose. Every file inside that folder is deployed
 * as its own HTTP route, and a shared helper with no default export would
 * either become a broken endpoint or fail the build.
 *
 * ── Why the messages are this specific ───────────────────────────────────
 * The first version answered every failure with "That session has expired —
 * sign in again." That was wrong in the most expensive way: a wrong service
 * role key, an unreachable Supabase, and a genuinely stale token all produced
 * the same sentence, so the one instruction it gave ("sign in again") was
 * useless in two cases out of three and sent people round a loop that could
 * not fix anything.
 *
 * Each failure now names itself, and carries a `stage` so a report of "it says
 * X" is enough to locate the problem without a debugging session.
 */
export async function requireAdmin(req) {
  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    const missing = [!url && 'VITE_SUPABASE_URL', !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY']
      .filter(Boolean).join(' and ')
    return {
      status: 503,
      stage: 'config',
      error: `The server is missing ${missing}. Add it in the Vercel project settings (Settings → Environment Variables) and redeploy.`,
    }
  }

  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return { status: 401, stage: 'no-token', error: 'Sign in as an admin to use this.' }
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let user
  try {
    const { data, error } = await admin.auth.getUser(token)
    if (error) {
      /* Two very different things arrive here and they need different
         instructions. A rejected *token* is the user's session; a rejected
         *key* is the deployment's configuration, and telling somebody to sign
         in again when the service role key is wrong is how an afternoon
         disappears. Supabase reports the latter as a 401 mentioning the API
         key rather than the JWT. */
      const detail = error.message ?? ''
      if (/api key|apikey|invalid.*key|jwt.*secret/i.test(detail)) {
        return {
          status: 503,
          stage: 'bad-service-key',
          error: 'Supabase rejected the server key. Check SUPABASE_SERVICE_ROLE_KEY in Vercel — it must be the service_role secret from Project Settings → API Keys, not the anon/publishable key.',
        }
      }
      return {
        status: 401,
        stage: 'bad-token',
        error: 'Your sign-in has expired. Reload the admin console and sign in again.',
        /* What Supabase actually said, and which project said it.
           This is here because a valid token minted against this project was
           rejected in production while the identical call succeeded locally —
           which can only mean the deployed environment differs, and no amount
           of reasoning from the outside could tell us how. An auth error
           string and a project host are not secrets; the key is never echoed. */
        detail: detail || 'no message',
        project: url.replace(/^https?:\/\//, '').split('.')[0],
      }
    }
    user = data?.user
  } catch (err) {
    // Network-level: DNS, TLS, a wrong project URL. Never a session problem.
    return {
      status: 503,
      stage: 'unreachable',
      error: `Could not reach Supabase from the server (${err?.message ?? 'network error'}). Check VITE_SUPABASE_URL in Vercel.`,
    }
  }

  if (!user) {
    return { status: 401, stage: 'no-user', error: 'Your sign-in has expired. Reload the admin console and sign in again.' }
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles').select('role').eq('id', user.id).single()

  if (profileError) {
    return {
      status: 503,
      stage: 'no-profile',
      error: `Signed in, but your profile row could not be read (${profileError.message}). That is a database problem, not a sign-in one.`,
    }
  }

  if (!['admin', 'event_coordinator'].includes(profile?.role)) {
    return {
      status: 403,
      stage: 'not-admin',
      // Names the account and the role it actually has, because the usual
      // cause is being signed in as the wrong one of two accounts.
      error: `This is an admin-only tool, and ${user.email ?? 'this account'} has the role "${profile?.role ?? 'none'}". Sign in with the admin account, or set that profile's role to admin.`,
    }
  }

  return { user, supabase: admin }
}
