import { useState, useEffect, useCallback } from 'react'
import {
  ChevronDown, User, ShieldCheck, MapPin, Bell, Languages,
  Plus, Pencil, Trash2, Check, Loader2, Star, AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast, friendlyError } from '../../context/ToastContext'
import { useCity } from '../../context/CityContext'
import {
  updateProfile, passwordState, changePassword, changeEmail,
  fetchAddresses, saveAddress, deleteAddress, setDefaultAddress,
  NOTIFICATION_KEYS, prefsOf, LANGUAGES,
} from '../../lib/account'

/**
 * The settings half of the account screen.
 *
 * ── Why this is five expanders and not five routes ────────────────────────
 * Every e-commerce app of this shape puts settings behind a stack of rows that
 * each push a new screen. That is the right pattern when a setting is a page —
 * an address book with twenty entries, an order history. It is the wrong one
 * for four toggles and a name field, because a push transition, a back button
 * and a header cost more attention than the control they wrap.
 *
 * These are all small. So they open in place: one section at a time, the rest
 * collapsed, and nothing leaves the page. It also means the customer can see
 * the whole shape of what is configurable in one scroll, which a stack of
 * chevrons deliberately hides.
 *
 * Addresses are the one that will outgrow this. When somebody has six of them
 * this becomes a route — the list is already a component and would move whole.
 *
 * ── Everything here writes somewhere real ─────────────────────────────────
 * The first version of the account screen shipped with no settings at all,
 * because a settings row that opens nothing is worse than a short list. That
 * constraint has not been relaxed, it has been satisfied: name, phone and city
 * write to `profiles`; the password goes through Supabase auth with the current
 * one verified first; addresses are rows in `customer_addresses`; the toggles
 * and the language are columns on `profiles`. Migration 049 carries the schema.
 *
 * Where the schema is not applied yet, reads degrade to defaults and WRITES SAY
 * SO by name. A save that silently does nothing is the one outcome worse than
 * an error, because the customer walks away believing their address is stored.
 */
export default function AccountSettings() {
  const { user, profile, fetchProfile } = useAuth()
  const [open, setOpen] = useState(null)

  if (!user) return null

  const sections = [
    { id: 'profile',  icon: User,        title: 'Personal information', hint: 'Your name, phone and city' },
    { id: 'security', icon: ShieldCheck, title: 'Sign-in & security',   hint: 'Email address and password' },
    { id: 'address',  icon: MapPin,      title: 'Saved addresses',      hint: 'Where we deliver, without typing it again' },
    { id: 'notify',   icon: Bell,        title: 'Notifications',        hint: 'What we message you about, and where' },
    { id: 'language', icon: Languages,   title: 'Language',             hint: 'How the app should speak to you' },
  ]

  const refresh = useCallback(() => fetchProfile(user.id), [fetchProfile, user.id])

  return (
    <section className="px-4">
      <h2 className="text-[15px] font-extrabold text-ink">Settings</h2>
      <p className="mt-0.5 text-[11px] text-ink-mute">Everything about your account, in one place.</p>

      <div className="mt-2.5 space-y-2">
        {sections.map(({ id, icon: Icon, title, hint }, i) => {
          const isOpen = open === id
          return (
            <div
              key={id}
              className="rise-in home-glass overflow-hidden"
              style={{ '--rise-delay': `${i * 60}ms` }}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 p-3.5 text-left"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/15">
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-ink">{title}</span>
                  <span className="block truncate text-[11px] text-ink-mute">{hint}</span>
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-ink/40 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="animate-fade-in border-t border-hairline/[0.07] p-3.5">
                  {id === 'profile'  && <ProfilePanel  profile={profile} userId={user.id} onSaved={refresh} />}
                  {id === 'security' && <SecurityPanel user={user} />}
                  {id === 'address'  && <AddressPanel  userId={user.id} />}
                  {id === 'notify'   && <NotifyPanel   profile={profile} userId={user.id} onSaved={refresh} />}
                  {id === 'language' && <LanguagePanel profile={profile} userId={user.id} onSaved={refresh} />}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ── Shared form furniture ─────────────────────────────────────────────── */

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-ink-soft">{label}</span>
      {hint && <span className="mt-0.5 block text-[10px] leading-snug text-ink-mute">{hint}</span>}
      <span className="mt-1 block">{children}</span>
    </label>
  )
}

const INPUT =
  'w-full rounded-xl bg-surface px-3 py-2.5 text-[13px] text-ink ring-1 ring-hairline/12 outline-none placeholder:text-ink-mute/70 focus:ring-2 focus:ring-saffron-400'

function SaveButton({ busy, children = 'Save', disabled }) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="flex items-center justify-center gap-1.5 rounded-xl bg-plum-900 px-4 py-2.5 text-[12px] font-extrabold text-white transition-transform active:scale-95 disabled:opacity-40"
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={3} />}
      {children}
    </button>
  )
}

function Note({ children, tone = 'info' }) {
  return (
    <p className={`flex items-start gap-1.5 rounded-xl p-2.5 text-[10px] leading-relaxed ${
      tone === 'warn'
        ? 'bg-saffron-400/12 text-saffron-800'
        : 'bg-surface-sunk/[0.05] text-ink-mute'
    }`}>
      <AlertCircle size={11} className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  )
}

/* ── Personal information ──────────────────────────────────────────────── */

function ProfilePanel({ profile, userId, onSaved }) {
  const toast = useToast()
  const { cities } = useCity()
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    city: profile?.city ?? '',
  })
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await updateProfile(userId, form)
      await onSaved()
      toast.success('Saved.')
    } catch (err) {
      toast.error(friendlyError(err, 'Could not save that.'))
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Full name">
        <input
          className={INPUT}
          value={form.full_name}
          onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
          placeholder="How we should address you"
        />
      </Field>

      <Field label="Phone" hint="The number a coordinator calls about a celebration.">
        <input
          className={INPUT}
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          placeholder="+91…"
        />
      </Field>

      <Field label="City" hint="Which city your celebrations are usually in.">
        <select
          className={INPUT}
          value={form.city}
          onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
        >
          <option value="">Not set</option>
          {cities.map(c => (
            <option key={c.name} value={c.name}>
              {c.name}{c.live ? '' : ' — not served yet'}
            </option>
          ))}
        </select>
      </Field>

      <SaveButton busy={busy} />
    </form>
  )
}

/* ── Sign-in & security ────────────────────────────────────────────────── */

function SecurityPanel({ user }) {
  const toast = useToast()
  const state = passwordState(user)
  const [email, setEmail] = useState(user?.email ?? '')
  const [emailBusy, setEmailBusy] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwBusy, setPwBusy] = useState(false)

  async function submitEmail(e) {
    e.preventDefault()
    if (email === user?.email) return
    setEmailBusy(true)
    try {
      await changeEmail(email)
      toast.success('Check the new address — the change lands when you click the link we just sent.')
    } catch (err) {
      toast.error(friendlyError(err, 'Could not change the email.'))
    } finally { setEmailBusy(false) }
  }

  async function submitPassword(e) {
    e.preventDefault()
    if (pw.next !== pw.confirm) { toast.error('The two new passwords do not match.'); return }
    setPwBusy(true)
    try {
      await changePassword({
        email: user?.email,
        // A social-only account has nothing to verify against, so the current
        // password is not asked for and not sent.
        currentPassword: state.socialOnly ? null : pw.current,
        newPassword: pw.next,
      })
      setPw({ current: '', next: '', confirm: '' })
      toast.success(state.socialOnly ? 'Password set.' : 'Password changed.')
    } catch (err) {
      toast.error(friendlyError(err, 'Could not change the password.'))
    } finally { setPwBusy(false) }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submitEmail} className="space-y-3">
        <Field
          label="Email address"
          hint="This is what you sign in with."
        >
          <input
            className={INPUT}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </Field>
        {/* Stated before the change, not discovered after it. Supabase sends a
            confirmation link to the NEW address and nothing moves until it is
            clicked — an account screen that shows the new address immediately
            is describing a change that has not happened. */}
        <Note>
          Changing this sends a confirmation link to the new address. You keep
          signing in with the old one until you click it.
        </Note>
        <SaveButton busy={emailBusy} disabled={email === user?.email}>Update email</SaveButton>
      </form>

      <div className="border-t border-hairline/[0.07] pt-4">
        {state.socialOnly ? (
          <Note tone="warn">
            You sign in with {state.socialProviders.join(' and ')}, so there is no
            password on this account yet. Setting one gives you a second way in if
            you ever lose access to that account.
          </Note>
        ) : null}

        <form onSubmit={submitPassword} className="mt-3 space-y-3">
          {!state.socialOnly && (
            <Field label="Current password">
              <input
                className={INPUT}
                type="password"
                autoComplete="current-password"
                value={pw.current}
                onChange={e => setPw(p => ({ ...p, current: e.target.value }))}
                placeholder="Leave blank if you signed in with a link"
              />
            </Field>
          )}
          <Field label={state.socialOnly ? 'Choose a password' : 'New password'} hint="At least 8 characters.">
            <input
              className={INPUT}
              type="password"
              autoComplete="new-password"
              value={pw.next}
              onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
            />
          </Field>
          <Field label="Confirm it">
            <input
              className={INPUT}
              type="password"
              autoComplete="new-password"
              value={pw.confirm}
              onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
            />
          </Field>
          <SaveButton busy={pwBusy} disabled={!pw.next || pw.next !== pw.confirm}>
            {state.socialOnly ? 'Set password' : 'Change password'}
          </SaveButton>
        </form>
      </div>
    </div>
  )
}

/* ── Addresses ─────────────────────────────────────────────────────────── */

const BLANK_ADDRESS = {
  id: null, label: 'Home', recipient: '', phone: '',
  line1: '', line2: '', landmark: '', city: '', pincode: '',
}

function AddressPanel({ userId }) {
  const toast = useToast()
  const { city: currentCity } = useCity()
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    fetchAddresses(userId).then(setRows).catch(() => setRows([]))
  }, [userId])

  useEffect(() => { load() }, [load])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await saveAddress(userId, editing)
      setEditing(null)
      load()
      toast.success('Address saved.')
    } catch (err) {
      toast.error(friendlyError(err, 'Could not save that address.'))
    } finally { setBusy(false) }
  }

  async function remove(row) {
    if (!confirm(`Delete "${row.label}"? Orders already placed to it are unaffected.`)) return
    try { await deleteAddress(row.id); load(); toast.success('Deleted.') }
    catch (err) { toast.error(friendlyError(err, 'Could not delete that.')) }
  }

  async function makeDefault(row) {
    try { await setDefaultAddress(userId, row.id); load() }
    catch (err) { toast.error(friendlyError(err, 'Could not set the default.')) }
  }

  if (editing) {
    return (
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Label"><input className={INPUT} value={editing.label}
            onChange={e => setEditing(a => ({ ...a, label: e.target.value }))} placeholder="Home" /></Field>
          <Field label="Pincode"><input className={INPUT} inputMode="numeric" value={editing.pincode}
            onChange={e => setEditing(a => ({ ...a, pincode: e.target.value }))} /></Field>
        </div>

        {/* Recipient and phone, because this app sends gifts — the person the
            parcel is for is frequently not the account holder, and a delivery
            partner needs the number of whoever is at the door. */}
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Who receives it"><input className={INPUT} value={editing.recipient}
            onChange={e => setEditing(a => ({ ...a, recipient: e.target.value }))} placeholder="Their name" /></Field>
          <Field label="Their phone"><input className={INPUT} type="tel" inputMode="tel" value={editing.phone}
            onChange={e => setEditing(a => ({ ...a, phone: e.target.value }))} /></Field>
        </div>

        <Field label="Address"><input className={INPUT} value={editing.line1} required
          onChange={e => setEditing(a => ({ ...a, line1: e.target.value }))} placeholder="Flat, building, street" /></Field>
        <Field label="Area"><input className={INPUT} value={editing.line2}
          onChange={e => setEditing(a => ({ ...a, line2: e.target.value }))} placeholder="Locality" /></Field>
        <Field label="Landmark" hint="What to look for. This is what actually gets a delivery to the door.">
          <input className={INPUT} value={editing.landmark}
            onChange={e => setEditing(a => ({ ...a, landmark: e.target.value }))} placeholder="Opposite the temple" /></Field>
        <Field label="City"><input className={INPUT} value={editing.city} required
          onChange={e => setEditing(a => ({ ...a, city: e.target.value }))} /></Field>

        <div className="flex items-center gap-2">
          <SaveButton busy={busy} />
          <button type="button" onClick={() => setEditing(null)}
            className="rounded-xl bg-surface px-4 py-2.5 text-[12px] font-bold text-ink ring-1 ring-hairline/10">
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-2.5">
      {rows === null ? (
        <p className="text-[11px] text-ink-mute">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-[11px] leading-relaxed text-ink-mute">
          No saved addresses yet. Adding one here means not typing it at every
          checkout — and a gift can go straight to whoever it is for.
        </p>
      ) : (
        rows.map(row => (
          <div key={row.id} className="rounded-2xl bg-surface p-3 ring-1 ring-hairline/[0.08]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[12px] font-extrabold text-ink">
                  {row.label}
                  {row.is_default && (
                    <span className="rounded-full bg-forest-600/12 px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide text-forest-700">
                      Default
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-ink-mute">
                  {[row.recipient, row.line1, row.line2, row.landmark, row.city, row.pincode]
                    .filter(Boolean).join(', ')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!row.is_default && (
                  <button onClick={() => makeDefault(row)} title="Make default"
                    className="p-1.5 text-ink/35 hover:text-saffron-600"><Star size={13} /></button>
                )}
                <button onClick={() => setEditing({ ...BLANK_ADDRESS, ...row })} title="Edit"
                  className="p-1.5 text-ink/35 hover:text-plum-700"><Pencil size={13} /></button>
                <button onClick={() => remove(row)} title="Delete"
                  className="p-1.5 text-ink/35 hover:text-chilli-600"><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        ))
      )}

      <button
        onClick={() => setEditing({ ...BLANK_ADDRESS, city: currentCity ?? '' })}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-surface py-2.5 text-[12px] font-extrabold text-plum-700 ring-1 ring-hairline/10"
      >
        <Plus size={13} strokeWidth={3} /> Add an address
      </button>
    </div>
  )
}

/* ── Notifications ─────────────────────────────────────────────────────── */

function NotifyPanel({ profile, userId, onSaved }) {
  const toast = useToast()
  const [prefs, setPrefs] = useState(() => prefsOf(profile))
  const [busy, setBusy] = useState(null)

  async function toggle(key) {
    const next = !prefs[key]
    setPrefs(p => ({ ...p, [key]: next }))   // optimistic — a switch that lags reads as broken
    setBusy(key)
    try {
      await updateProfile(userId, { [key]: next })
      await onSaved()
    } catch (err) {
      setPrefs(p => ({ ...p, [key]: !next }))  // put it back; the write did not land
      toast.error(friendlyError(err, 'Could not save that setting.'))
    } finally { setBusy(null) }
  }

  return (
    <div className="space-y-1">
      {NOTIFICATION_KEYS.map(({ key, label, hint }) => (
        <button
          key={key}
          onClick={() => toggle(key)}
          disabled={busy === key}
          className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-bold text-ink">{label}</span>
            <span className="block text-[10px] leading-snug text-ink-mute">{hint}</span>
          </span>
          <span
            aria-hidden="true"
            className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
              prefs[key] ? 'bg-forest-600' : 'bg-ink/15'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                prefs[key] ? 'translate-x-[18px]' : 'translate-x-0.5'
              }`}
            />
          </span>
        </button>
      ))}
      <Note>
        Order and celebration updates are the ones you actually need — turning
        them off means finding out about a delivery yourself.
      </Note>
    </div>
  )
}

/* ── Language ──────────────────────────────────────────────────────────── */

function LanguagePanel({ profile, userId, onSaved }) {
  const toast = useToast()
  const [lang, setLang] = useState(() => prefsOf(profile).language)
  const [busy, setBusy] = useState(false)

  async function pick(id) {
    setLang(id)
    setBusy(true)
    try {
      await updateProfile(userId, { language: id })
      await onSaved()
      toast.success('Saved.')
    } catch (err) {
      toast.error(friendlyError(err, 'Could not save that.'))
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-1">
      {LANGUAGES.map(l => (
        <button
          key={l.id}
          onClick={() => pick(l.id)}
          disabled={busy}
          className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left disabled:opacity-60"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-bold text-ink">{l.native}</span>
            <span className="block text-[10px] text-ink-mute">{l.label}</span>
          </span>
          {lang === l.id && <Check size={15} strokeWidth={3} className="shrink-0 text-forest-600" />}
        </button>
      ))}
      {/* Said plainly rather than discovered. The setting is stored and a
          coordinator can see it, but the app's own strings are still English —
          somebody who picks Kannada and sees no change would reasonably
          conclude the setting is broken. */}
      <Note tone="warn">
        We save this and your coordinator will speak to you in it. The app's own
        screens are still English — we are working through them.
      </Note>
    </div>
  )
}
