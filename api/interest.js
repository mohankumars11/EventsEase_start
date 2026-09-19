import { createClient } from '@supabase/supabase-js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  const { email, phone = '', interest = 'Events', partner = false, website = '' } = request.body || {}

  // Quiet honeypot for simple bot protection.
  if (website) return response.status(200).json({ ok: true })

  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPhone = String(phone || '').trim()
  const cleanInterest = String(interest || 'Events').trim().slice(0, 80)

  if (!emailPattern.test(cleanEmail) || cleanEmail.length > 254) {
    return response.status(400).json({ error: 'Please provide a valid email address.' })
  }
  if (cleanPhone.length > 32 || cleanInterest.length === 0) {
    return response.status(400).json({ error: 'Please check the submitted details.' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return response.status(503).json({ error: 'Launch list is not configured.' })
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error } = await supabase.from('launch_interest').insert({
      email: cleanEmail,
      phone: cleanPhone || null,
      interest: cleanInterest,
      partner: Boolean(partner),
      source: 'sambramo-public-site',
    })

    if (error) {
      console.error('launch_interest insert failed', error)
      return response.status(500).json({ error: 'Unable to save launch interest.' })
    }

    return response.status(201).json({ ok: true })
  } catch (error) {
    console.error('launch_interest request failed', error)
    return response.status(500).json({ error: 'Unable to save launch interest.' })
  }
}
