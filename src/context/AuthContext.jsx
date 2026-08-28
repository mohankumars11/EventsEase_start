import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { clearJourney } from '../lib/journey'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    let { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!data) {
      // New user (Google OAuth or phone OTP) — create profile safely
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const meta = authUser?.user_metadata ?? {}
      const { data: upserted } = await supabase
        .from('profiles')
        .upsert({
          id:         userId,
          email:      authUser?.email ?? null,
          full_name:  meta.full_name ?? meta.name ?? null,
          phone:      authUser?.phone ?? null,
          role:       'customer',
        }, { onConflict: 'id' })
        .select()
        .single()
      data = upserted
    }

    data = await applyPendingReferral(data)
    setProfile(data)
    setLoading(false)
  }

  // Single point every signup path passes through (email OTP's
  // completeProfile below, Google OAuth's upsert above, legacy
  // signUp) — resolves a ?ref= code stashed in localStorage by
  // SignupPage into the referrer's id, once, the first time this
  // profile is seen with no referred_by set yet.
  async function applyPendingReferral(profileRow) {
    if (!profileRow || profileRow.referred_by) return profileRow
    const pending = localStorage.getItem('ee_pending_ref')
    if (!pending) return profileRow
    localStorage.removeItem('ee_pending_ref')

    const { data: referrerId } = await supabase.rpc('resolve_referral_code', { p_code: pending })
    if (!referrerId || referrerId === profileRow.id) return profileRow

    const { data: updated } = await supabase
      .from('profiles')
      .update({ referred_by: referrerId })
      .eq('id', profileRow.id)
      .select()
      .single()
    return updated ?? profileRow
  }

  // ── Email OTP (primary auth — free, no SMS provider needed) ──
  async function sendEmailOtp(email, { shouldCreateUser = true } = {}) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  async function verifyEmailOtp(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    if (error) throw error
    return data
  }

  // ── Phone OTP (kept for future use when SMS provider is ready) ─
  async function sendPhoneOtp(phone) {
    const { error } = await supabase.auth.signInWithOtp({ phone })
    if (error) throw error
  }

  async function verifyPhoneOtp(phone, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone, token, type: 'sms',
    })
    if (error) throw error
    return data
  }

  // ── Profile completion after phone OTP ───────────────
  /**
   * Finish a profile after the OTP.
   *
   * ── It must never overwrite a role somebody already has ──────────
   * This is an UPSERT keyed on the user id, and the signup form always
   * carries a role — so a partner who passed through /signup again, for
   * any reason at all, was silently demoted to 'customer'. Their vendor
   * row, their approval and their service list all survived; only the
   * role changed, and the role is the one field that decides whether
   * they can open their own dashboard.
   *
   * The symptom is "I cannot log in as a partner". Nothing errors, the
   * sign-in succeeds, and the guard on /dashboard/vendor bounces them
   * to the join page — which reads as a broken login rather than as a
   * field that was quietly rewritten.
   *
   * It cost the only real partner in the network their account.
   *
   * So an existing profile keeps its role and only fills blanks. The
   * name is still updated, because somebody retyping it means it.
   */
  async function completeProfile({ fullName, role, city, phone }) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    const { data: existing } = await supabase
      .from('profiles').select('role, city, phone').eq('id', authUser.id).maybeSingle()

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id:        authUser.id,
        full_name: fullName,
        // An account that is already a vendor or an admin stays one. A
        // role only arrives from this form for an account that has none.
        role:      existing?.role ?? role ?? 'customer',
        city:      city  ?? existing?.city  ?? null,
        phone:     phone ?? existing?.phone ?? authUser.phone ?? null,
        email:     authUser.email ?? null,
      }, { onConflict: 'id' })
      .select()
      .single()

    if (error) throw error
    setProfile(data)
    return data
  }

  // ── Email / password (kept for admin access) ─────────
  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signUp({ email, password, fullName, phone, role, city }) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    const { error: profileError } = await supabase.from('profiles').upsert({
      id:        data.user.id,
      full_name: fullName,
      phone:     phone ? `+91${phone}` : null,
      email,
      role,
      city,
    }, { onConflict: 'id' })
    if (profileError) throw profileError

    if (role === 'vendor') {
      await supabase.from('vendors').upsert({
        profile_id:    data.user.id,
        business_name: fullName,
        status:        'PENDING_REVIEW',
      }, { onConflict: 'profile_id' })
    }

    return data
  }

  // ── Google OAuth ──────────────────────────────────────
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:  `${window.location.origin}/dashboard`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) throw error
  }

  // ── Sign out ──────────────────────────────────────────
  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    // The trail belongs to the person who just left. Without this, the next
    // customer on a shared phone — which in this market is most of them — gets
    // home offering to finish somebody else's wedding plan, with their guest
    // count, their city and their name already in the form.
    clearJourney()
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      sendEmailOtp, verifyEmailOtp,
      sendPhoneOtp, verifyPhoneOtp, completeProfile,
      signIn, signUp, signOut, signInWithGoogle, fetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
