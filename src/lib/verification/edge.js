import { supabase } from '../supabase'

const FALLBACK_SUPABASE_URL = 'https://twpsgrmoqxemxhrzbfwd.supabase.co'
const BASE = ((import.meta.env?.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL).replace(/\/+$/, '')) + '/functions/v1/sambramo-verification-v2'

export async function verificationCall(body, { timeoutMs = 30000 } = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Please sign in again.')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(BASE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + token,
        apikey: import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const raw = await response.text()
    let json = null
    try { json = raw ? JSON.parse(raw) : null } catch {}
    if (!response.ok || json?.ok === false) {
      throw new Error(json?.says || json?.error || ('Verification service error (' + response.status + ')'))
    }
    return json || { ok: true }
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Verification took too long. Please try again.')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchVerificationRequirements() {
  return verificationCall({ action: 'requirements' }, { timeoutMs: 15000 })
}
