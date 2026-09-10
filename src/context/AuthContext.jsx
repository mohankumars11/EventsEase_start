import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { startGoogleSignIn } from '../lib/googleAuth'
import { clearJourney } from '../lib/journey'
import { isPartnerSurface } from '../config/surface'

/* Exported so a guard can mount an auth-gated page with a stub session.
   scripts/scenes/onboarding-walk.jsx needs `user.id` and nothing else,
   and wrapping the real provider would make the guard a test of
   Supabase rather than of the onboarding form. */
export const AuthContext = createContext(null)

/**
 * Which role wins when a signup form and an existing row disagree.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PROMOTE, NEVER DEMOTE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Two failures have already come from getting this wrong, in opposite
 * directions, and both presented as a broken login rather than as a
 * field that changed:
 *
 *   Form always wins   an established partner who passed through
 *                      /signup again was rewritten to 'customer'. Their
 *                      vendor row, approval and service list all
 *                      survived — only access was lost.
 *
 *   Row always wins    a NEW partner could never be created at all,
 *                      because fetchProfile writes a placeholder row the
 *                      instant a session appears, and that placeholder
 *                      said 'customer'. The form then had nothing left
 *                      to say. That was the fix for the first bug.
 *
 * So neither wins outright. A role may go up and may not come down:
 * somebody who is already a vendor or an admin stays one, and anybody
 * else becomes whatever they asked to be.
 *
 * 'admin' is not reachable from any form. It is ranked here so that
 * nothing a signup page sends can reach down and take it away.
 */
const ROLE_RANK = { customer: 0, vendor: 1, admin: 2 }

export function mergeRole(existing, requested) {
  const e = ROLE_RANK[existing] ?? -1
  const r = ROLE_RANK[requested] ?? -1
  if (e < 0 && r < 0) return 'customer'
  return e >= r ? existing : requested
}

/**
 * The role somebody asked for, parked across a redirect.
 *
 * Google's OAuth flow leaves this origin and returns to /auth/callback,
 * so nothing in React state survives it — and the profile row is created
 * on the way back in, before any form has run. Without this, "Join as a
 * partner" followed by "Continue with Google" produced a customer
 * account every time, silently. Same mechanism as `ee_pending_ref`.
 */
export const PENDING_ROLE = 'ee_pending_role'

function pendingRole() {
  try { return localStorage.getItem(PENDING_ROLE) } catch { return null }
}

/**
 * What role this sign-in is FOR.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE APP SOMEBODY OPENED IS THE ANSWER, NOT A LOCALSTORAGE KEY
 * ══════════════════════════════════════════════════════════════════════
 *
 * `ee_pending_role` was the whole mechanism, and it has exactly one
 * weakness: it is per-origin. Every failure this has caused came from an
 * auth round trip that came back somewhere else — a redirect that was
 * not on the allow list lands on the Site URL, which is the customer
 * host, where the key does not exist and the profile is written as a
 * customer. The person then has to be repaired by hand, one email at a
 * time, which is not a fix, it is a chore that recurs.
 *
 * The surface does not have that weakness. Somebody who installed
 * Sambramo Partners and signed in is a master. That is not an inference
 * from a token that might have gone missing; it is what the app they
 * are holding IS. It is true on the APK, on the partner host, and after
 * any redirect, because the partner app only ever loads the partner
 * host.
 *
 * ── Why this is not the boundary App.jsx warns about ────────────────
 * RootScreen's note says a surface is not a security boundary and a
 * hostname must not decide access. That still holds and nothing here
 * changes it. This decides a DEFAULT at row creation, not permission:
 * every table is still governed by RLS, and a vendor still receives no
 * work until an operator sets is_verified. The cost of being wrong is
 * that somebody who deliberately opened the partner app is offered the
 * partner app.
 *
 * The parked key stays as the second answer, for the customer host —
 * "Join as a partner" on the marketing site is still a real intent and
 * still has to survive its own redirect.
 */
function intendedRole() {
  if (isPartnerSurface()) return 'vendor'
  return pendingRole()
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  /* True while completeProfile is mid-flight.
   *
   * Signing in fires onAuthStateChange, which calls fetchProfile — and
   * fetchProfile WRITES a placeholder row when it finds none. During
   * sign-up that races completeProfile writing the real one: two
   * selects, two upserts, on the same row, milliseconds apart, with the
   * loser's values silently winning about half the time.
   *
   * It is also two more round trips at the slowest moment in the app.
   * completeProfile ends by calling setProfile itself, so there is
   * nothing for the listener to do except get in the way. */
  const completing = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) { if (!completing.current) fetchProfile(session.user.id) }
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
      /* ══════════════════════════════════════════════════════════════
         THIS MUST NEVER OVERWRITE A ROLE THAT ALREADY EXISTS
         ══════════════════════════════════════════════════════════════

         It used to be `.upsert({ …, role }, { onConflict: 'id' })`, and
         an upsert OVERWRITES. The guard above is `if (!data)`, which
         reads as "only for brand new users" — but `data` is also null
         when the select simply fails: a dropped connection on a weak
         mobile network, a cold start, an RLS hiccup.

         When that happened to an established partner, this wrote
         role: 'customer' straight over their 'vendor' — and
         ProtectedRoute then bounced them out of the partner app with no
         error at all. It is how the two APPROVED partners found in 099
         got there, and it silently undid that migration's backfill more
         than once while this was being built.

         So: create only, never clobber. `ignoreDuplicates` makes the
         conflict a no-op instead of an overwrite, and the row is read
         back afterwards. A partner's role can now only be changed by
         something that means to change it. */
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const meta = authUser?.user_metadata ?? {}

      await supabase
        .from('profiles')
        .upsert({
          id:         userId,
          email:      authUser?.email ?? null,
          full_name:  meta.full_name ?? meta.name ?? null,
          phone:      authUser?.phone ?? null,
          // Not hardcoded 'customer'. This row is written the instant a
          // session appears — before any signup form runs — so hardcoding
          // it made the form's answer unreachable, and every partner who
          // signed up with Google got a customer account.
          role:       intendedRole() === 'vendor' ? 'vendor' : 'customer',
        }, { onConflict: 'id', ignoreDuplicates: true })

      /* Read back rather than trusting the write. If the row already
         existed, the upsert did nothing and this returns the REAL
         profile — role intact. */
      const { data: after } = await supabase
        .from('profiles').select('*').eq('id', userId).maybeSingle()
      data = after
    }

    /* ══════════════════════════════════════════════════════════════════
       AN ACCOUNT ALREADY WRITTEN WRONG REPAIRS ITSELF HERE
       ══════════════════════════════════════════════════════════════════

       The role is only ever set when the ROW IS CREATED. So every
       partner whose sign-in was misrouted before the fix above is
       stranded: their row says 'customer', nothing rewrites it, and
       ProtectedRoute bounces them out of /dashboard/vendor every time
       they open the app they installed. Repairing those by hand, one
       address at a time, is not a fix — it is a queue that refills.

       Somebody signing in on the partner app whose row says 'customer'
       is, by definition, one of them. Promote on sight.

       ── Only ever upward ────────────────────────────────────────────
       mergeRole ranks customer < vendor < admin and returns the higher,
       and the guard below only fires on 'customer' — so an admin who
       opens the partner app is untouched, and nothing here can take a
       role away from anybody. That direction is the one that has caused
       real damage twice already; see the note on mergeRole.

       A genuine customer who deliberately opens the partner app and
       signs in does become a master. That is the intended reading of
       the act, it grants no access to anyone else's data, and they
       still receive no work until an operator approves them. */
    if (data?.role === 'customer' && isPartnerSurface()) {
      const { data: promoted } = await supabase
        .from('profiles')
        .update({ role: mergeRole(data.role, 'vendor') })
        .eq('id', userId)
        .select()
        .single()
      /* If RLS refuses this, `promoted` is null and the existing row
         stands. A failed repair must not blank the profile and sign
         somebody out of an app that was otherwise working. */
      if (promoted) data = promoted
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
  async function completeProfile({ fullName, role, city, phone, user: known }) {
    /* The user is passed in, not fetched.
     *
     * This began with `await supabase.auth.getUser()` — a network round
     * trip to ask the server about a session the caller was holding.
     * Verifying an OTP already returns the user, so the trip bought
     * nothing and cost a second of somebody staring at the code screen
     * wondering whether their tap registered.
     *
     * Counted, sign-in was five sequential round trips: verify, getUser,
     * select, upsert, and fetchProfile's own select behind it. On mobile
     * data that is the "it goes back to the OTP page" everybody
     * reported — not a bounce, just a long enough wait to look like one.
     *
     * Falls back to the old path when nobody passes a user, so no caller
     * breaks. */
    const authUser = known ?? (await supabase.auth.getUser()).data.user
    if (!authUser) throw new Error('Not authenticated')

    completing.current = true
    try {

    const { data: existing } = await supabase
      .from('profiles').select('role, city, phone').eq('id', authUser.id).maybeSingle()

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id:        authUser.id,
        full_name: fullName,
        // An account that is already a vendor or an admin stays one. A
        // role only arrives from this form for an account that has none.
        //
        // `role` is undefined when the caller does not ask for one — the
        // partner entry screen has no role picker, because the app it is
        // running in already answered the question. intendedRole() is
        // that answer, and without this fallback mergeRole would be
        // handed undefined and default the partner to a customer.
        role:      mergeRole(existing?.role, role ?? intendedRole()),
        city:      city  ?? existing?.city  ?? null,
        phone:     phone ?? existing?.phone ?? authUser.phone ?? null,
        email:     authUser.email ?? null,
      }, { onConflict: 'id' })
      .select()
      .single()

    if (error) throw error
    // Spent. Left set, it would make the next account created in this
    // browser a partner too.
    try { localStorage.removeItem(PENDING_ROLE) } catch { /* storage off */ }
      setProfile(data)
      setLoading(false)
      return data
    } finally {
      completing.current = false
    }
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
  /* Two very different flows behind one call. On the web this is the
     ordinary redirect it always was; in the APK it is a Custom Tab and a
     deep link, because Google will not sign anybody in from inside a
     WebView. See lib/googleAuth.js — that is where the reasoning lives,
     and why the button used to be hidden on native rather than broken. */
  async function signInWithGoogle() {
    await startGoogleSignIn()
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
