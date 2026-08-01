import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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

    setProfile(data)
    setLoading(false)
  }

  // ── Email OTP (primary auth — free, no SMS provider needed) ──
  async function sendEmailOtp(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
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
  async function completeProfile({ fullName, role, city, phone }) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id:        authUser.id,
        full_name: fullName,
        role:      role ?? 'customer',
        city:      city ?? null,
        phone:     phone ?? authUser.phone ?? null,
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
