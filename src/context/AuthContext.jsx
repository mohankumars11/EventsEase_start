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
      // Google OAuth users: trigger may not have run yet — upsert profile now
      const { data: { user } } = await supabase.auth.getUser()
      const meta = user?.user_metadata ?? {}
      const { data: upserted } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: user?.email ?? null,
          full_name: meta.full_name ?? meta.name ?? null,
          role: 'customer',
        })
        .select()
        .single()
      data = upserted
    }

    setProfile(data)
    setLoading(false)
  }

  async function signUp({ email, password, fullName, phone, role, city }) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: fullName,
      phone,
      email,
      role,
      city,
    })
    if (profileError) throw profileError

    if (role === 'vendor') {
      await supabase.from('vendors').insert({
        profile_id: data.user.id,
        business_name: fullName,
        subscription_plan: 'free',
      })
    }

    return data
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  /**
   * Google OAuth sign-in.
   *
   * Prerequisites:
   *   1. Enable Google provider in Supabase Dashboard → Authentication → Providers.
   *   2. Add your Google Client ID & Secret from Google Cloud Console.
   *   3. Add the Supabase callback URL as an authorized redirect URI in GCP.
   *
   * After a successful OAuth flow Supabase redirects the user to /dashboard.
   * The onAuthStateChange listener above will fire and load the profile.
   */
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signUp, signIn, signOut, fetchProfile, signInWithGoogle }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
