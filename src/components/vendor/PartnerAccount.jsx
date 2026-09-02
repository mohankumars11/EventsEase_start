import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Store, MapPin, Phone, UserRound, Landmark, BadgeCheck, ShieldCheck,
  ChevronDown, LogOut, Check, Loader2, CircleDot, Star, DoorOpen,
  TriangleAlert, Sparkles,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BRAND } from '../../config/sambramo'
import { VENDOR_CATEGORIES, VENDOR_STATUS, formatPrice } from '../../config/vendor'
import { PARTNER_PLANS, PLAN_BY_ID, LAUNCH_OFFER, LAUNCH_NOTE, effectiveTier } from '../../config/partnerPlans'
import { lookupPincode } from '../../lib/pincodeDirectory'
import { DOCUMENT_KINDS, fetchDocuments } from '../../lib/partnerDocuments'
import PayoutDetails from './PayoutDetails'
import VendorDocuments from './VendorDocuments'
import PartnerHandbook from './PartnerHandbook'

/**
 * The partner's account, end to end.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS REPLACES, AND WHY IT HAD TO GO
 * ══════════════════════════════════════════════════════════════════════
 *
 * A ten-row `<dl>` of read-only text with one "Edit" link that threw the
 * partner back into the three-step ONBOARDING WIZARD to change an
 * Instagram handle. Below it, three plan cards from `VENDOR_PLANS` — a
 * ladder describing "priority in coordinator search" and "5 enquiries a
 * month", neither of which is a thing this product sells any more.
 *
 * Everything a partner would actually open this tab for was missing:
 * they could not tell whether their account was active, could not see
 * whether anyone had verified them, could not prove who they were, could
 * not change the phone number a customer rings on the day, and could not
 * leave.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SHAPE: A SETTINGS LIST, NOT A PAGE OF CARDS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Everything here except the identity strip is a collapsed row that
 * states its own current value. That is the pattern every Android
 * settings screen uses, and it is the right one for the same reason:
 * this tab holds nine subjects and somebody opening it wants exactly
 * one. Nine expanded cards is 4,000px of scrolling to reach the eighth.
 *
 * The old version spent a `gap-y-3` two-column grid on ten short values
 * with a 28px label column, which on a 360px phone left every value
 * truncated with air on both sides of it. Rows are single-column, the
 * label is above the value, and the vertical rhythm is 2.5 rather than
 * 8 — the same rhythm Earnings and the job cards already use, so the
 * partner app stops looking like two apps.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EDITING HAPPENS HERE NOW
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every field a partner is allowed to change is an input in the section
 * it belongs to, and "Save" appears only once something is dirty. There
 * is no edit MODE to enter and no wizard to be thrown into.
 *
 * Two of these are not plain column writes and are handled specially:
 *
 *   pincode   `vendors.location` is a geography column PostgREST cannot
 *             write, so a pincode change goes through
 *             `set_partner_location` (079). Writing the six digits
 *             without the point is the exact bug that made a fully
 *             onboarded partner silently undispatchable, twice.
 *
 *   verified  Never writable here. 067's trigger silently restores
 *             `is_verified` on any partner-side update, so a control for
 *             it would be a button that appears to work and does not.
 */

export default function PartnerAccount({ vendor, profile, onUpdateVendor, onSignOut }) {
  const { user, fetchProfile } = useAuth()

  const statusMeta = VENDOR_STATUS[vendor?.status] ?? VENDOR_STATUS.PENDING_REVIEW
  const tier       = effectiveTier(vendor?.subscription_plan)
  const plan       = PLAN_BY_ID[tier] ?? PARTNER_PLANS[0]

  /* The payout summary, read here rather than inside PayoutDetails,
     because the fold has to say what is in it while it is still shut.
     A row reading "How you get paid" with nothing after it is a row
     nobody opens until the money is already late. */
  /* `loaded` is not decoration. A fold takes `defaultOpen` into
     useState ONCE, at mount, so rendering this row before the query
     comes back means every partner gets `defaultOpen={!null}` — the
     whole payout form expanded, including the ones who filled it in
     months ago and came here to change their phone number. Waiting for
     the answer is the difference between "open this if it is empty" and
     "open this always". */
  const [payout, setPayout] = useState(null)
  const [payoutLoaded, setPayoutLoaded] = useState(false)
  useEffect(() => {
    if (!vendor?.id) return
    let dead = false
    supabase.from('vendor_payout_details')
      .select('method, upi_id, account_number, verified_at')
      .eq('vendor_id', vendor.id).maybeSingle()
      .then(({ data }) => {
        if (dead) return
        setPayout(data ?? null)
        setPayoutLoaded(true)
      })
    return () => { dead = true }
  }, [vendor?.id])

  /* ══════════════════════════════════════════════════════════════════
     THE DOCUMENTS ARE READ HERE, NOT INSIDE THE SECTION
     ══════════════════════════════════════════════════════════════════

     Two reasons, and the second one is a bug that shipped in the first
     draft of this screen.

     First, the fold has to say what is in it while it is shut — "2 of 4
     added" is the whole reason a settings row is worth tapping.

     Second: migration 093 is applied BY HAND, so on a database where it
     has not been pasted yet there are no documents to show and no
     upload that could succeed. With the fetch inside the section, the
     section returned null and left an EXPANDED, EMPTY fold titled
     "Verification" — a heading with nothing under it and no way to tell
     whether that was a bug or an answer. Knowing up here means the row
     is simply not offered until the feature exists. */
  const [docs, setDocs] = useState(null)
  const readDocs = useCallback(async () => {
    if (!vendor?.id) return
    setDocs(await fetchDocuments(vendor.id))
  }, [vendor?.id])
  useEffect(() => { readDocs() }, [readDocs])

  const docCount = docs ? Object.keys(docs.byKind).length : 0
  const verificationSummary = vendor?.is_verified
    ? 'Verified master'
    : vendor?.verification_status === 'submitted'
      ? `With our team · ${docCount} document${docCount === 1 ? '' : 's'} sent`
      : docCount
        ? `${docCount} of ${DOCUMENT_KINDS.length} added — send them for checking`
        : 'Not verified yet — add a document'

  const payoutSummary = !payout
    ? 'Not added yet — we cannot pay you without it'
    : payout.method === 'upi'
      ? `UPI · ${payout.upi_id}${payout.verified_at ? '' : ' · being checked'}`
      : `Bank · ends ${String(payout.account_number ?? '').slice(-4)}${payout.verified_at ? '' : ' · being checked'}`

  return (
    <div className="space-y-2.5">

      <Identity vendor={vendor} profile={profile} statusMeta={statusMeta} plan={plan} />

      <AccountState vendor={vendor} onUpdateVendor={onUpdateVendor} />

      {/* ── Verification ─────────────────────────────────────────────
          Open by default while unverified, shut once the tick is
          earned. It is the single most consequential thing on this tab
          for somebody who is not yet receiving work — `match_partners`
          will not offer a job to an unverified master — and the least
          interesting thing on it for somebody who is. */}
      {docs && !docs.unavailable && (
        <Fold
          icon={vendor?.is_verified ? BadgeCheck : ShieldCheck}
          title="Verification"
          summary={verificationSummary}
          tone={vendor?.is_verified ? 'good' : 'nudge'}
          defaultOpen={!vendor?.is_verified}
        >
          <VendorDocuments
            vendor={vendor}
            byKind={docs.byKind}
            onUpdateVendor={onUpdateVendor}
            onChanged={readDocs}
          />
        </Fold>
      )}

      {/* ── Money ────────────────────────────────────────────────────
          Second, and above the business details on purpose: a partner
          opening this tab is far more likely to be here about where
          their money goes than about their Instagram handle. */}
      {payoutLoaded && (
        <Fold
          icon={Landmark}
          title="How you get paid"
          summary={payoutSummary}
          tone={payout ? (payout.verified_at ? 'good' : 'neutral') : 'nudge'}
          defaultOpen={!payout}
        >
          <PayoutDetails vendorId={vendor?.id} onSaved={setPayout} />
        </Fold>
      )}

      <BusinessDetails vendor={vendor} onUpdateVendor={onUpdateVendor} />

      <ReachDetails vendor={vendor} onUpdateVendor={onUpdateVendor} />

      <ContactDetails vendor={vendor} onUpdateVendor={onUpdateVendor} />

      <OwnerDetails
        profile={profile}
        onSaved={async patch => {
          const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
          if (error) throw new Error(error.message)
          await fetchProfile(user.id)
        }}
      />

      <Fold icon={Star} title="Your plan" summary={`${plan.label}${LAUNCH_OFFER ? ' · free right now' : ` · ${plan.price}`}`}>
        <YourPlan tier={tier} />
      </Fold>

      {/* Reference rather than a setting, and it folds itself. */}
      <PartnerHandbook />

      <DangerZone vendor={vendor} onUpdateVendor={onUpdateVendor} onSignOut={onSignOut} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Who this is
   ══════════════════════════════════════════════════════════════════════

   One strip, and it is the only thing on the tab that is not a fold.

   The business name used to live in the dashboard header, which was
   removed from every tab but Jobs because it repeated above every
   screen. That left Account with no statement of whose account it is,
   which is the one place it genuinely belongs. */
function Identity({ vendor, profile, statusMeta, plan }) {
  const name = vendor?.business_name ?? profile?.full_name ?? 'Your business'

  /* Initials, not a photo. There is no avatar column and inventing an
     upload for one here would be a fifth thing to maintain for a decoration.
     Two letters on the brand's own saffron reads as deliberate. */
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '').join('') || 'S'

  const live = vendor?.status === 'APPROVED' && !vendor?.suspended_at

  return (
    <section className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-saffron-400 font-serif text-[18px] font-extrabold text-plum-950">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-serif text-[18px] font-extrabold leading-tight text-ink">{name}</h2>
          <p className="truncate text-[12px] font-semibold leading-snug text-ink-mute">
            {[vendor?.category, vendor?.area, vendor?.city ?? BRAND.primaryCity]
              .filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {/* ── The three facts a partner checks this tab for ────────────
          Verified, active, and which plan. All three were previously
          either absent or buried: the plan pill sat in a header that
          only rendered on Jobs, "active" was never stated anywhere at
          all, and verification had no surface in the product. */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip
          tone={vendor?.is_verified ? 'good' : 'idle'}
          icon={vendor?.is_verified ? BadgeCheck : ShieldCheck}
        >
          {vendor?.is_verified ? 'Verified' : 'Not verified'}
        </Chip>
        <Chip tone={live ? 'good' : statusMeta.tone === 'rose' ? 'bad' : 'warn'} icon={CircleDot}>
          {vendor?.suspended_at ? 'Suspended' : live ? 'Account active' : statusMeta.label}
        </Chip>
        <Chip tone="plum" icon={Star}>{plan.label}</Chip>
      </div>
    </section>
  )
}

const CHIP = {
  good: 'bg-forest-50 text-forest-800 ring-forest-200',
  warn: 'bg-saffron-400/20 text-saffron-900 ring-saffron-300/60',
  bad:  'bg-rose-50 text-rose-800 ring-rose-200',
  plum: 'bg-plum-50 text-plum-800 ring-plum-200',
  idle: 'bg-ink/[0.04] text-ink-mute ring-ink/[0.07]',
}

function Chip({ tone = 'idle', icon: Icon, children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${CHIP[tone]}`}>
      {Icon && <Icon size={12} />}{children}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   "I asked to close this, and I have changed my mind"
   ══════════════════════════════════════════════════════════════════════

   This section used to also restate suspension and the pending/rejected
   status, which was wrong twice over: VendorDashboard already renders
   both ABOVE every tab, so on Account a suspended partner read the same
   paragraph twice in a row, once in rose and once in rose. One fact, one
   place that says it — and the place is the one that says it everywhere,
   not the one that says it here.

   A pending closure request is different, and it is why this survives at
   all. It is a state the partner PUT THEMSELVES IN, it stops nothing
   today and deletes nothing, and the only screen that could possibly
   remind them it is pending is this one. Somebody who asked to leave in
   a bad week and then had a good one must not have to remember. */
function AccountState({ vendor, onUpdateVendor }) {
  const [busy, setBusy] = useState(false)
  if (!vendor?.closure_requested_at) return null

  async function cancelClosure() {
    setBusy(true)
    try {
      await onUpdateVendor({ closure_requested_at: null, closure_reason: null })
    } finally { setBusy(false) }
  }

  return (
    <section className="rounded-[20px] bg-saffron-400/15 p-4 ring-1 ring-saffron-300/60">
      <p className="text-[14px] font-extrabold text-ink">You asked to close this account</p>
      <p className="mt-1 text-[12.5px] font-semibold leading-relaxed text-ink-soft">
        Requested on {new Date(vendor.closure_requested_at).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}. Nothing has been deleted and any job you already accepted still
        stands. Change your mind any time before we process it.
      </p>
      <button
        type="button" onClick={cancelClosure} disabled={busy}
        className="btn-primary mt-3 w-full disabled:opacity-45"
      >
        {busy ? 'Working…' : 'Keep my account'}
      </button>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   A fold
   ══════════════════════════════════════════════════════════════════════

   Icon, title, and — the part that makes this pattern work — the current
   VALUE on the collapsed row. A settings list whose rows say only what
   they are called forces somebody to open all nine to find the one that
   is wrong.

   `hidden` rather than unmounting on close: the sections hold forms with
   typing in them, and a fold that discards a half-typed account number
   because somebody collapsed it to check something else is a fold that
   loses work. The exception is a section that is expensive to mount,
   which is why PayoutDetails is given `defaultOpen` rather than being
   mounted eagerly under every partner who never opens it. */
function Fold({ icon: Icon, title, summary, tone = 'neutral', defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  const dot = {
    good:   'text-forest-600',
    nudge:  'text-saffron-600',
    neutral:'text-ink-mute',
  }[tone]

  return (
    <section className="overflow-hidden rounded-[20px] bg-white ring-1 ring-ink/[0.06]">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <Icon size={18} className={`shrink-0 ${dot}`} />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold leading-tight text-ink">{title}</span>
          {summary && (
            <span className="mt-0.5 block truncate text-[11.5px] font-semibold leading-snug text-ink-mute">
              {summary}
            </span>
          )}
        </span>
        <ChevronDown
          size={17}
          className={`shrink-0 text-ink-mute transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div hidden={!open} className="border-t border-ink/[0.06] p-4">
        {children}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   A form that knows whether it is dirty
   ══════════════════════════════════════════════════════════════════════

   Every editable section works the same way, so the behaviour is written
   once: fields are always live inputs, and the Save button exists only
   while something differs from what is on the row. No edit mode, no
   pencil icon, and no way to leave a section wondering whether a change
   was kept.

   `initial` is re-synced when the underlying row changes, so a save
   elsewhere (or the pincode RPC below) does not leave this section
   showing stale text and claiming to be dirty about it. */
function useDirtyForm(initial) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const key = JSON.stringify(initial)
  useEffect(() => { setForm(initial); setSaved(false) }, [key])   // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(
    () => JSON.stringify(form) !== key,
    [form, key],
  )

  const set = useCallback((k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setSaved(false)
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setForm(JSON.parse(key))
    setError(null)
    setSaved(false)
  }, [key])

  return { form, set, reset, dirty, saving, setSaving, saved, setSaved, error, setError }
}

function SaveBar({ dirty, saving, saved, error, onSave, reset, label = 'Save changes' }) {
  return (
    <>
      {error && (
        <p className="mt-3 rounded-[14px] bg-rose-50 px-3 py-2 text-[12px] font-bold text-rose-700">{error}</p>
      )}
      {saved && !dirty && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-forest-700">
          <Check size={14} /> Saved.
        </p>
      )}
      {dirty && (
        <div className="mt-3.5 flex gap-2">
          <button type="button" onClick={reset} className="btn-secondary flex-1">Undo</button>
          <button type="button" onClick={onSave} disabled={saving} className="btn-primary flex-[2] disabled:opacity-45">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : label}
          </button>
        </div>
      )}
    </>
  )
}

/** A labelled field. One column, label above value — see the header note. */
function Field({ label, hint, htmlFor, children }) {
  return (
    <div>
      <label className="label text-[12.5px]" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] font-semibold leading-snug text-ink-mute">{hint}</p>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   The business itself
   ══════════════════════════════════════════════════════════════════════ */
function BusinessDetails({ vendor, onUpdateVendor }) {
  const initial = useMemo(() => ({
    business_name:    vendor?.business_name ?? '',
    category:         vendor?.category ?? '',
    description:      vendor?.description ?? '',
    years_experience: vendor?.years_experience?.toString() ?? '',
    starting_price:   vendor?.starting_price?.toString() ?? '',
  }), [vendor])

  const f = useDirtyForm(initial)

  async function save() {
    if (!f.form.business_name.trim()) { f.setError('Your business needs a name.'); return }
    if (f.form.description.trim() && f.form.description.trim().length < 30) {
      f.setError('A description under 30 characters tells a customer nothing. Add a line or two.')
      return
    }
    f.setSaving(true); f.setError(null)
    try {
      await onUpdateVendor({
        business_name:    f.form.business_name.trim(),
        category:         f.form.category || null,
        description:      f.form.description.trim() || null,
        years_experience: f.form.years_experience === '' ? null : Number(f.form.years_experience),
        starting_price:   f.form.starting_price === '' ? null : Number(f.form.starting_price),
      })
      f.setSaved(true)
    } catch (e) {
      f.setError(e.message)
    } finally {
      f.setSaving(false)
    }
  }

  const summary = [
    vendor?.category,
    vendor?.years_experience ? `${vendor.years_experience} yrs` : null,
    formatPrice(vendor?.starting_price) ? `from ${formatPrice(vendor.starting_price)}` : null,
  ].filter(Boolean).join(' · ') || 'Your trade, your story, your starting price'

  return (
    <Fold icon={Store} title="Business details" summary={summary}>
      <div className="space-y-3.5">
        <Field label="Business name" htmlFor="ba-name">
          <input
            id="ba-name" className="input" value={f.form.business_name}
            onChange={e => f.set('business_name', e.target.value)}
          />
        </Field>

        <Field label="Your trade" htmlFor="ba-cat" hint="This decides which jobs we send you.">
          <select id="ba-cat" className="input" value={f.form.category} onChange={e => f.set('category', e.target.value)}>
            <option value="">Choose your trade…</option>
            {VENDOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field
          label="About your work"
          htmlFor="ba-desc"
          hint={`${f.form.description.length}/300 · this is what a customer reads before they book you.`}
        >
          <textarea
            id="ba-desc" rows={4} maxLength={300} className="input resize-none"
            value={f.form.description}
            onChange={e => f.set('description', e.target.value)}
          />
        </Field>

        {/* Two short numbers side by side. Stacked they are two full rows
            of a phone screen for six characters of input. */}
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Years in the trade" htmlFor="ba-yrs">
            <input
              id="ba-yrs" className="input" inputMode="numeric" value={f.form.years_experience}
              onChange={e => f.set('years_experience', e.target.value.replace(/\D/g, '').slice(0, 2))}
            />
          </Field>
          <Field label="Starting price ₹" htmlFor="ba-price">
            <input
              id="ba-price" className="input" inputMode="numeric" value={f.form.starting_price}
              onChange={e => f.set('starting_price', e.target.value.replace(/\D/g, '').slice(0, 7))}
            />
          </Field>
        </div>

        <SaveBar {...f} onSave={save} />
      </div>
    </Fold>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Where you work, and how much of it you can take
   ══════════════════════════════════════════════════════════════════════

   `service_radius_km` and `daily_capacity` have existed since 057 and 079
   and NO SCREEN HAS EVER SHOWN THEM. A master with one van has been
   defaulted to 1 job a day and 10 km whether that suits them or not, and
   both are things dispatch reads on every single offer.

   The pincode is here rather than in Business details because changing
   it is not a column write — see below. */
function ReachDetails({ vendor, onUpdateVendor }) {
  const initial = useMemo(() => ({
    pincode:           vendor?.pincode ?? '',
    area:              vendor?.area ?? '',
    service_radius_km: (vendor?.service_radius_km ?? 10).toString(),
    daily_capacity:    (vendor?.daily_capacity ?? 1).toString(),
  }), [vendor])

  const f = useDirtyForm(initial)

  async function save() {
    const pin = f.form.pincode.trim()
    if (!/^[1-9][0-9]{5}$/.test(pin)) { f.setError('That is not a valid six-digit pincode.'); return }

    f.setSaving(true); f.setError(null)
    try {
      /* ── The pincode is not a column write ──────────────────────────
         `vendors.location` is a geography point and PostgREST cannot
         write one, so saving six digits WITHOUT calling this leaves the
         partner sitting at their old coordinates while every screen
         shows the new pincode. That exact mismatch made a fully
         onboarded partner invisible to dispatch twice in testing, with
         nothing anywhere reporting a problem — see 079. */
      if (pin !== (vendor?.pincode ?? '')) {
        const place = await lookupPincode(pin)
        if (place.status !== 'served') {
          f.setError(place.status === 'unknown'
            ? `We cannot find the pincode ${pin}. Worth checking those six digits.`
            : `We are not matching masters in ${pin} yet. Your old area is unchanged.`)
          return
        }
        const { data: located } = await supabase.rpc('set_partner_location', {
          p_vendor_id: vendor.id,
          p_pincode: pin,
          p_lat: place.lat,
          p_lng: place.lng,
          p_area: f.form.area.trim() || place.area,
        })
        if (!located?.ok) { f.setError('We could not place that pincode on the map.'); return }
      }

      /* This UPDATE runs after the RPC on purpose: `updateVendor` echoes
         the row Postgres returns back into state, so the pincode, area and
         city `set_partner_location` just wrote arrive with it. Refetching
         the whole account instead would blank the dashboard and collapse
         every fold on the tab for one changed field. */
      await onUpdateVendor({
        area:              f.form.area.trim() || null,
        service_radius_km: Math.min(100, Math.max(1, Number(f.form.service_radius_km) || 10)),
        daily_capacity:    Math.min(50, Math.max(1, Number(f.form.daily_capacity) || 1)),
      })
      f.setSaved(true)
    } catch (e) {
      f.setError(e.message)
    } finally {
      f.setSaving(false)
    }
  }

  const summary = [
    vendor?.area || vendor?.pincode,
    `${vendor?.service_radius_km ?? 10} km`,
    `${vendor?.daily_capacity ?? 1} job${(vendor?.daily_capacity ?? 1) === 1 ? '' : 's'} a day`,
  ].filter(Boolean).join(' · ')

  return (
    <Fold icon={MapPin} title="Where you work" summary={summary}>
      <div className="space-y-3.5">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Pincode" htmlFor="rd-pin">
            <input
              id="rd-pin" className="input" inputMode="numeric" maxLength={6}
              value={f.form.pincode}
              onChange={e => f.set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </Field>
          <Field label="Area" htmlFor="rd-area">
            <input
              id="rd-area" className="input" placeholder="Jayanagar"
              value={f.form.area}
              onChange={e => f.set('area', e.target.value)}
            />
          </Field>
        </div>

        <Field
          label={`How far you will travel — ${f.form.service_radius_km} km`}
          htmlFor="rd-radius"
          hint="We only offer you jobs inside this circle. Widen it to see more work; narrow it to stop being sent across the city."
        >
          <input
            id="rd-radius" type="range" min={1} max={100} step={1}
            value={f.form.service_radius_km}
            onChange={e => f.set('service_radius_km', e.target.value)}
            className="w-full accent-plum-600"
          />
        </Field>

        <Field
          label="Jobs you can take in one day"
          htmlFor="rd-cap"
          hint="One decorator with one van is not two decorators. We will not offer you more than this on any one date."
        >
          <input
            id="rd-cap" className="input" inputMode="numeric" maxLength={2}
            value={f.form.daily_capacity}
            onChange={e => f.set('daily_capacity', e.target.value.replace(/\D/g, '').slice(0, 2))}
          />
        </Field>

        <SaveBar {...f} onSave={save} />
      </div>
    </Fold>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   How a customer reaches you on the day
   ══════════════════════════════════════════════════════════════════════

   `contact_phone` and `whatsapp_phone` (079) exist because a business
   phone is very often not the owner's personal one, and until now there
   was no screen that could set either. The number a customer rings when
   the decorator has not arrived was whatever went into the signup form
   months ago. */
function ContactDetails({ vendor, onUpdateVendor }) {
  const initial = useMemo(() => ({
    contact_phone:  vendor?.contact_phone ?? '',
    whatsapp_phone: vendor?.whatsapp_phone ?? '',
    website_url:    vendor?.website_url ?? '',
    instagram_url:  vendor?.instagram_url ?? '',
  }), [vendor])

  const f = useDirtyForm(initial)

  async function save() {
    const ten = v => v.replace(/\D/g, '').slice(-10)
    if (f.form.contact_phone && ten(f.form.contact_phone).length !== 10) {
      f.setError('An Indian mobile number is ten digits.'); return
    }
    f.setSaving(true); f.setError(null)
    try {
      await onUpdateVendor({
        contact_phone:  f.form.contact_phone.trim() || null,
        whatsapp_phone: f.form.whatsapp_phone.trim() || null,
        website_url:    f.form.website_url.trim() || null,
        instagram_url:  f.form.instagram_url.trim() || null,
      })
      f.setSaved(true)
    } catch (e) {
      f.setError(e.message)
    } finally {
      f.setSaving(false)
    }
  }

  return (
    <Fold
      icon={Phone}
      title="How customers reach you"
      summary={vendor?.contact_phone || vendor?.whatsapp_phone || 'No business number set'}
    >
      <div className="space-y-3.5">
        <Field
          label="Business phone"
          htmlFor="cd-phone"
          hint="What a customer rings on the day. Leave it empty and we use your sign-in number."
        >
          <input
            id="cd-phone" className="input" inputMode="tel" value={f.form.contact_phone}
            onChange={e => f.set('contact_phone', e.target.value)}
          />
        </Field>
        <Field label="WhatsApp number" htmlFor="cd-wa" hint="Only if it is different from the number above.">
          <input
            id="cd-wa" className="input" inputMode="tel" value={f.form.whatsapp_phone}
            onChange={e => f.set('whatsapp_phone', e.target.value)}
          />
        </Field>
        <Field label="Website" htmlFor="cd-web">
          <input
            id="cd-web" className="input" inputMode="url" placeholder="https://"
            value={f.form.website_url} onChange={e => f.set('website_url', e.target.value)}
          />
        </Field>
        <Field label="Instagram" htmlFor="cd-ig" hint="Your work is your sales pitch. A live page is worth more than a description.">
          <input
            id="cd-ig" className="input" inputMode="url" placeholder="https://instagram.com/…"
            value={f.form.instagram_url} onChange={e => f.set('instagram_url', e.target.value)}
          />
        </Field>

        <SaveBar {...f} onSave={save} />
      </div>
    </Fold>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   The person, as distinct from the business
   ══════════════════════════════════════════════════════════════════════ */
function OwnerDetails({ profile, onSaved }) {
  const initial = useMemo(() => ({
    full_name: profile?.full_name ?? '',
    phone:     profile?.phone ?? '',
  }), [profile])

  const f = useDirtyForm(initial)

  async function save() {
    if (!f.form.full_name.trim()) { f.setError('We need a name to put on your account.'); return }
    f.setSaving(true); f.setError(null)
    try {
      await onSaved({ full_name: f.form.full_name.trim(), phone: f.form.phone.trim() || null })
      f.setSaved(true)
    } catch (e) {
      f.setError(e.message)
    } finally {
      f.setSaving(false)
    }
  }

  return (
    <Fold icon={UserRound} title="Your details" summary={profile?.full_name ?? profile?.email ?? 'Signed in'}>
      <div className="space-y-3.5">
        <Field label="Your name" htmlFor="od-name">
          <input
            id="od-name" className="input" value={f.form.full_name}
            onChange={e => f.set('full_name', e.target.value)}
          />
        </Field>
        <Field label="Your phone" htmlFor="od-phone">
          <input
            id="od-phone" className="input" inputMode="tel" value={f.form.phone}
            onChange={e => f.set('phone', e.target.value)}
          />
        </Field>

        {/* Read-only, and it says why rather than being mysteriously
            greyed out. Changing a login email is an auth flow with a
            confirmation on both addresses, not a text box. */}
        <Field label="Email" hint="This is how you sign in. Talk to us to change it.">
          <p className="rounded-xl bg-ink/[0.04] px-4 py-2.5 text-[13px] font-semibold text-ink-soft">
            {profile?.email ?? '—'}
          </p>
        </Field>

        <SaveBar {...f} onSave={save} />
      </div>
    </Fold>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   The plan
   ══════════════════════════════════════════════════════════════════════

   Now reading PARTNER_PLANS, which is the ladder this business actually
   sells: which dispatch WAVE a master is offered a job in. The old
   Account tab rendered VENDOR_PLANS — "priority in coordinator search",
   "5 enquiries a month" — describing a concierge product that no longer
   exists on this side of the app.

   Three side-by-side cards became one list. On a 360px phone three
   columns gave each tier 104px, which fits neither "₹499 a month" nor a
   single feature line, and the whole comparison was unreadable at the
   exact width every partner uses. */
function YourPlan({ tier }) {
  return (
    <div className="space-y-2.5">
      {LAUNCH_OFFER && (
        <div className="flex items-start gap-2.5 rounded-[16px] bg-forest-50 p-3 ring-1 ring-forest-200">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-forest-700" />
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold text-forest-900">
              You are on the top plan, free
            </p>
            <p className="mt-0.5 text-[11.5px] font-semibold leading-relaxed text-forest-800/90">
              {LAUNCH_NOTE} The prices below are what these will cost later —
              nothing is charged today and nothing starts without us telling
              you first.
            </p>
          </div>
        </div>
      )}

      {PARTNER_PLANS.map(p => {
        const current = p.id === tier
        return (
          <div
            key={p.id}
            className={`rounded-[16px] p-3.5 ring-1 ${
              current ? 'bg-plum-50/60 ring-plum-300' : 'bg-white ring-ink/[0.07]'
            }`}
          >
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-[16px] font-extrabold text-ink">{p.label}</span>
              <span className="text-[12.5px] font-extrabold text-saffron-700">{p.price}</span>
              {current && (
                <span className="ml-auto rounded-full bg-plum-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                  Your plan
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-ink-mute">{p.lede}</p>

            {/* Only what this tier ADDS. The `included: false` rows are a
                list of things you do not get, printed under a plan you are
                already on — which on the current tier is just a paragraph
                of bad news about yourself. */}
            <ul className="mt-2 space-y-1">
              {p.features.filter(x => x.included).map(x => (
                <li key={x.text} className="flex items-start gap-1.5 text-[11.5px] font-semibold leading-snug text-ink-soft">
                  <Check size={12} className="mt-0.5 shrink-0 text-forest-600" />
                  <span className={x.emphasis ? 'font-extrabold text-ink' : undefined}>{x.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      <p className="px-1 text-[11px] font-semibold leading-relaxed text-ink-mute">
        A paid plan never changes what a customer pays, where you sit in the
        match order, or your commission. It only changes which wave of a job
        you are offered.
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   The way out
   ══════════════════════════════════════════════════════════════════════

   Sign out was a grey pill in a header that only rendered on the Jobs
   tab, so on a phone the only way to sign out was to navigate back to
   Jobs and find it. It belongs here, where every other app in this
   market puts it.

   Closing the account is a REQUEST and not a delete, and the copy says
   so plainly rather than implying a bigger button than this is. A master
   with an accepted job on Saturday has a family expecting them and
   customer money already in escrow against that line; a self-service
   cascade would tell that customer on the day. 093 has the full
   reasoning. */
function DangerZone({ vendor, onUpdateVendor, onSignOut }) {
  const [asking, setAsking] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const alreadyAsked = !!vendor?.closure_requested_at

  async function requestClosure() {
    setBusy(true); setError(null)
    try {
      await onUpdateVendor({
        closure_requested_at: new Date().toISOString(),
        closure_reason: reason.trim() || null,
      })
      setAsking(false)
    } catch (e) {
      /* 093 not applied yet: the column is not there, so say what to do
         instead of showing a Postgres error to a decorator. */
      setError(/column|schema cache/i.test(e.message ?? '')
        ? `Message us on WhatsApp (${BRAND.whatsappNumber}) and we will close it for you.`
        : e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-2.5 pt-1">
      <button
        type="button"
        onClick={onSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-white py-3.5 text-[14px] font-extrabold text-ink ring-1 ring-ink/[0.08] active:bg-ink/[0.03]"
      >
        <LogOut size={16} /> Sign out
      </button>

      {!alreadyAsked && (
        asking ? (
          <div className="rounded-[18px] bg-rose-50 p-4 ring-1 ring-rose-200">
            <p className="flex items-center gap-2 text-[13.5px] font-extrabold text-rose-900">
              <TriangleAlert size={15} /> Close your partner account
            </p>
            <p className="mt-1 text-[12px] font-semibold leading-relaxed text-rose-900/85">
              We will stop sending you jobs and take your listing down. Any job
              you have already accepted still stands and still gets paid —
              nothing is cancelled on a customer. You can undo this from here
              until we process it.
            </p>
            <label className="label mt-3 text-[12px]" htmlFor="dz-reason">
              Why are you leaving? <span className="font-semibold text-rose-900/60">(optional)</span>
            </label>
            <textarea
              id="dz-reason" rows={2} className="input resize-none"
              placeholder="Not enough work, moving city, taking a break…"
              value={reason} onChange={e => setReason(e.target.value)}
            />
            {error && <p className="mt-2 text-[12px] font-bold text-rose-700">{error}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setAsking(false)} className="btn-secondary flex-[2]">
                Stay
              </button>
              <button
                type="button" onClick={requestClosure} disabled={busy}
                className="btn-crimson flex-1 disabled:opacity-45"
              >
                {busy ? '…' : 'Close it'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="flex w-full items-center justify-center gap-2 py-2 text-[12.5px] font-bold text-ink-mute"
          >
            <DoorOpen size={14} /> Close my partner account
          </button>
        )
      )}
    </section>
  )
}
