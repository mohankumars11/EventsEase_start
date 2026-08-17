import { createClient } from '@supabase/supabase-js'

/**
 * "Is the person calling this actually an admin?"
 *
 * Shared by every AI endpoint, because each of them spends money on somebody
 * else's API key and none of them may be reachable by an anonymous POST. The
 * admin console is behind a route guard, but a route guard is a UI convenience
 * — it stops a link being clickable, not a request being made.
 *
 * The role is re-read from the database on every call rather than trusted from
 * a claim inside the token: a JWT minted when somebody was an admin keeps
 * saying so until it expires, long after the role was revoked.
 *
 * Lives outside `api/` on purpose. Every file inside that folder is deployed
 * as its own HTTP route, and a shared helper with no default export would
 * either become a broken endpoint or fail the build.
 */
export async function requireAdmin(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return { error: 'Sign in as an admin to use this.', status: 401 }

  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return { error: 'The server is missing its Supabase configuration.', status: 503 }
  }

  const admin = createClient(url, serviceKey)

  const { data: { user } = {}, error } = await admin.auth.getUser(token)
  if (error || !user) return { error: 'That session has expired — sign in again.', status: 401 }

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'event_coordinator'].includes(profile?.role)) {
    return { error: 'This is an admin-only tool.', status: 403 }
  }

  return { user, supabase: admin }
}
