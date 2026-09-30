import { createClient } from '@supabase/supabase-js'

export async function authenticatedUser(req, client) {
  const header = req.headers?.authorization ?? req.headers?.Authorization ?? ''
  const match = String(header).match(/^Bearer\s+(.+)$/i)
  if (!match) return { user: null, error: 'authorization_required' }
  const { data, error } = await client.auth.getUser(match[1])
  if (error || !data?.user) return { user: null, error: 'invalid_session' }
  return { user: data.user, error: null }
}
