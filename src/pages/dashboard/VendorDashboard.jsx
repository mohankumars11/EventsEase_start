import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ClipboardList, CalendarDays, LayoutDashboard, UserCog,
  CheckCircle2, Circle, ChevronRight, LogOut, Loader2, AlertCircle,
  MessageCircle, Star, TrendingUp, ArrowRight, Bell,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { BRAND } from '../../config/sambramo'
import { VENDOR_STATUS, VENDOR_PLANS, formatPrice } from '../../config/vendor'
import { useVendorAccount } from '../../hooks/useVendorAccount'
import VendorServiceList from '../../components/vendor/VendorServiceList'
import VendorAvailability from '../../components/vendor/VendorAvailability'
import OfferInbox from '../../components/vendor/OfferInbox'
import JobAlerts from '../../components/vendor/JobAlerts'
import MyJobs from '../../components/vendor/MyJobs'
import OfferHistory from '../../components/vendor/OfferHistory'

/**
 * The partner's console.
 *
 * What this replaces: a page of literals. Seven cards that opened WhatsApp, a
 * five-item checklist hardcoded to 1/5 with a "Coming soon" pill on every
 * remaining step, four stat tiles reading "—" and "0", and a "Free plan" badge
 * that ignored `vendors.subscription_plan`. It queried nothing — an approved
 * vendor with a full profile saw the same "Complete your profile · Important"
 * nag as someone who signed up ten seconds ago.
 *
 * The change of principle: a vendor now *does* things here rather than asking
 * for them to be done. Two of the four sections write to the database, and the
 * two that still route to a coordinator do so because the data genuinely lives
 * on the coordinator's side — concierge sourcing is admin-only by RLS
 * (migration 006), so an "Enquiries" tab would be an empty box with a lie in it.
 *
 * WhatsApp stays for exactly that, and no further. A "contact us" link where a
 * control belongs is a support cost dressed up as a feature.
 */

const TABS = [
  // Jobs first, and it is the only tab whose position is load-bearing.
  // An offer lives for 45 seconds; a partner who has to find the right
  // tab has already lost it. Everything else here can wait.
  { id: 'offers',       label: 'Jobs',         icon: Bell             },
  { id: 'overview',     label: 'Overview',     icon: LayoutDashboard },
  { id: 'list',         label: 'Your list',    icon: ClipboardList   },
  { id: 'availability', label: 'Availability', icon: CalendarDays    },
  { id: 'account',      label: 'Account',      icon: UserCog         },
]

const TONES = {
  amber: { card: 'border-amber-200 bg-amber-50/70',   pill: 'bg-amber-100 text-amber-800',    icon: 'text-amber-600'   },
  green: { card: 'border-emerald-200 bg-emerald-50/60', pill: 'bg-emerald-100 text-emerald-800', icon: 'text-emerald-600' },
  rose:  { card: 'border-rose-200 bg-rose-50/70',     pill: 'bg-rose-100 text-rose-800',      icon: 'text-rose-600'    },
  gray:  { card: 'border-gray-200 bg-gray-50',        pill: 'bg-gray-200 text-gray-700',      icon: 'text-gray-500'    },
}

function whatsappHref(message) {
  return `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(message)}`
}

export default function VendorDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const account = useVendorAccount()
  const {
    loading, error, refresh, vendor, services, availability,
    stats, checklist, updateVendor, addService, updateService, removeService,
    setDayStatus, setRangeStatus,
  } = account

  // The tab lives in the URL so the checklist can link straight at the thing
  // it is asking for, and so a vendor who reloads mid-edit lands back where
  // they were rather than on Overview.
  const tab = TABS.some(t => t.id === params.get('tab')) ? params.get('tab') : 'offers'
  const setTab = id => setParams(id === 'offers' ? {} : { tab: id }, { replace: true })

  const firstName    = profile?.full_name?.split(' ')[0] ?? 'there'
  const businessName = vendor?.business_name ?? profile?.full_name ?? 'Your business'
  const statusMeta   = VENDOR_STATUS[vendor?.status] ?? VENDOR_STATUS.PENDING_REVIEW
  const plan         = VENDOR_PLANS.find(p => p.id === (vendor?.subscription_plan ?? 'free')) ?? VENDOR_PLANS[0]

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="animate-spin text-plum-600" size={30} />
        <span className="text-sm">Loading your dashboard…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="card p-6 border-red-200 bg-red-50/60 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">We couldn't load your dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Your list and calendar are safe — this is a connection problem on our side.
            </p>
            <button onClick={refresh} className="btn-plum text-sm mt-4">Try again</button>
          </div>
        </div>
      </div>
    )
  }

  // A vendor account with no vendors row: they signed up and never finished
  // onboarding, or onboarding failed. Before migration 021 it always failed,
  // so this is the state most existing partners are actually in — it gets a
  // real door rather than an empty dashboard.
  if (!vendor) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="card p-6 sm:p-10 text-center">
          <div className="text-4xl mb-4">🏪</div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Welcome to Sambramo, {firstName}
          </h1>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            One short form and you're set up — your business, where you work, and
            what you charge. It takes about three minutes.
          </p>
          <Link to="/onboarding/vendor" className="btn-cta mt-7">
            Set up my profile <ArrowRight size={18} />
          </Link>
          <button onClick={handleSignOut} className="block mx-auto mt-5 text-xs text-gray-500 hover:text-gray-600">
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

      {/* ── Header ───────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold text-gray-900 truncate">{businessName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {vendor.category ? `${vendor.category} · ` : ''}
            {vendor.area ? `${vendor.area}, ` : ''}{vendor.city ?? BRAND.primaryCity}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${TONES[statusMeta.tone].pill}`}>
            {statusMeta.label}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-plum-100 text-plum-700 rounded-full text-xs font-semibold">
            {plan.label} plan
          </span>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-full text-xs font-semibold transition-colors"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      {/* ── Status ───────────────────────────────────────── */}
      {/* Leads the page whenever the vendor is not live, because it is the only
          fact that changes what the rest of the page means. Once approved it
          stays but stops shouting. */}
      <section className={`card mt-6 p-4 sm:p-5 flex items-start gap-3 ${TONES[statusMeta.tone].card}`}>
        <CheckCircle2 size={20} className={`mt-0.5 shrink-0 ${TONES[statusMeta.tone].icon}`} />
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 text-sm">{statusMeta.headline}</h2>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{statusMeta.detail}</p>
          {vendor.status === 'REJECTED' && vendor.rejection_reason && (
            <p className="text-sm text-rose-800 bg-white/70 border border-rose-200 rounded-xl px-3 py-2 mt-3">
              <span className="font-semibold">What we noted:</span> {vendor.rejection_reason}
            </p>
          )}
          {statusMeta.blocking && (
            <a
              href={whatsappHref(`Hi Sambramo — this is ${businessName}. I'd like an update on my partner profile (${vendor.status}).`)}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-plum-700 hover:text-plum-900 mt-3"
            >
              <MessageCircle size={14} /> Talk to our team
            </a>
          )}
        </div>
      </section>

      {/* ── Tabs ─────────────────────────────────────────── */}
      {/* Scrolls rather than wraps on a phone: four labels wrapping to two rows
          pushes the content below the fold on the screen most partners use. */}
      <nav className="flex gap-1 mt-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          const badge  = id === 'list' && stats.activeServices === 0
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                active
                  ? 'bg-plum-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-plum-50 hover:text-plum-700'
              }`}
            >
              <Icon size={16} /> {label}
              {badge && !active && (
                <span className="w-1.5 h-1.5 rounded-full bg-saffron-500" aria-label="needs attention" />
              )}
            </button>
          )
        })}
      </nav>

      <div className="mt-6">
        {/* Live jobs. Rendered only for an approved partner — an
            unverified one is not in the dispatch pool (match_partners
            filters on is_verified), so an inbox for them would be a
            permanently empty box with a promise in it. */}
        {tab === 'offers' && (
          vendor?.is_verified ? (
            <div className="space-y-5">
              {/* Above the inbox deliberately: an empty inbox with alerts
                  off is a master who will never know a job arrived, and
                  that is the first thing worth telling them. */}
              <JobAlerts vendorId={vendor.id} />

              {/* New offers, which expire in 45 seconds. */}
              <OfferInbox vendorId={vendor.id} />

              {/* And everything already accepted.
                  Below the inbox because an expiring offer is urgent and a
                  job next Saturday is not -- but on the SAME tab, because
                  a master who accepted a job and then could not find it
                  anywhere had no way to know the tap had worked. */}
              <div>
                <p className="mb-2 type-overline text-ink-mute">Your jobs</p>
                <MyJobs vendorId={vendor.id} />
              </div>

              {/* Last, and collapsed. It answers "why am I not getting
                  work", which is a question asked occasionally — not a
                  thing to scroll past on the way to today's jobs. */}
              <OfferHistory vendorId={vendor.id} />
            </div>
          ) : (
            <div className="rounded-[22px] bg-white p-8 text-center ring-1 ring-ink/[0.06]">
              <p className="text-[14px] font-extrabold text-ink">Jobs start once you are approved</p>
              <p className="mx-auto mt-1 max-w-xs text-[12.5px] leading-snug text-ink-mute">
                We check every master before sending them work. Finish your
                list and your calendar, and we will take it from there.
              </p>
            </div>
          )
        )}

        {tab === 'overview' && (
          <Overview
            vendor={vendor} stats={stats} checklist={checklist}
            businessName={businessName} onGo={setTab}
          />
        )}

        {tab === 'list' && (
          <VendorServiceList
            vendor={vendor}
            services={services}
            onAdd={addService}
            onUpdate={updateService}
            onRemove={removeService}
          />
        )}

        {tab === 'availability' && (
          <VendorAvailability
            vendor={vendor}
            availability={availability}
            onSetDay={setDayStatus}
            onSetRange={setRangeStatus}
            onUpdateVendor={updateVendor}
          />
        )}

        {tab === 'account' && (
          <Account vendor={vendor} profile={profile} plan={plan} businessName={businessName} />
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */

function Overview({ vendor, stats, checklist, businessName, onGo }) {
  const done      = checklist.filter(s => s.done).length
  const remaining = checklist.filter(s => !s.done)
  const complete  = remaining.length === 0

  // Only the numbers that come from a row. The old page's "Profile views" tile
  // read "—" because nothing measures it; a tile that can never hold a value is
  // a promise the product hasn't made.
  const tiles = useMemo(() => [
    { label: 'Live items',       value: stats.activeServices,   hint: stats.totalServices > stats.activeServices ? `${stats.totalServices - stats.activeServices} hidden` : 'in your list' },
    { label: 'Upcoming',         value: stats.upcomingBookings, hint: 'confirmed bookings' },
    { label: 'Days marked busy', value: stats.busyDays,         hint: 'from today on' },
    {
      label: 'Rating',
      value: stats.rating ? stats.rating.toFixed(1) : '—',
      hint: stats.reviewCount ? `${stats.reviewCount} review${stats.reviewCount === 1 ? '' : 's'}` : 'no reviews yet',
    },
  ], [stats])

  return (
    <div className="space-y-8">

      {/* Setup — hidden entirely once finished, rather than sitting at 7/7
          forever taking the best real estate on the page. */}
      {!complete && (
        <section className="card p-5 sm:p-6 border-saffron-200 bg-saffron-50/40">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-display font-bold text-gray-900">Finish setting up</h2>
            <span className="text-xs font-bold text-saffron-700 shrink-0">
              {done}/{checklist.length}
            </span>
          </div>

          <div className="w-full bg-saffron-100 rounded-full h-2 mb-5" role="progressbar"
               aria-valuenow={done} aria-valuemin={0} aria-valuemax={checklist.length}>
            <div
              className="bg-saffron-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(done / checklist.length) * 100}%` }}
            />
          </div>

          <ul className="space-y-1">
            {checklist.map(step => {
              const Row = (
                <>
                  {step.done
                    ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    : <Circle       size={16} className="text-saffron-400 shrink-0" />}
                  <span className={step.done ? 'line-through text-gray-500' : 'text-gray-800'}>
                    {step.label}
                  </span>
                  {!step.done && (step.tab || step.to) && (
                    <ChevronRight size={15} className="ml-auto text-saffron-500 shrink-0" />
                  )}
                </>
              )

              // Every unfinished step that has somewhere to go, goes there. The
              // version this replaces put a "Coming soon" pill on all of them.
              if (!step.done && step.tab) {
                return (
                  <li key={step.key}>
                    <button onClick={() => onGo(step.tab)}
                            className="w-full flex items-center gap-3 text-sm py-2 px-2 -mx-2 rounded-lg hover:bg-saffron-100/60 transition-colors text-left">
                      {Row}
                    </button>
                  </li>
                )
              }
              if (!step.done && step.to) {
                return (
                  <li key={step.key}>
                    <Link to={step.to}
                          className="w-full flex items-center gap-3 text-sm py-2 px-2 -mx-2 rounded-lg hover:bg-saffron-100/60 transition-colors">
                      {Row}
                    </Link>
                  </li>
                )
              }
              return (
                <li key={step.key} className="flex items-center gap-3 text-sm py-2 px-2 -mx-2">
                  {Row}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Stats */}
      <section>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Your numbers</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tiles.map(({ label, value, hint }) => (
            <div key={label} className="card p-4">
              <div className="text-2xl font-display font-bold text-gray-900">{value}</div>
              <div className="text-xs font-semibold text-gray-600 mt-1">{label}</div>
              <div className="text-[11px] text-gray-500">{hint}</div>
            </div>
          ))}
        </div>
      </section>

      {/* The two shortcuts that matter, sized like the actions they are. */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={() => onGo('list')} className="card p-5 text-left hover:border-plum-200 hover:shadow-md transition-all group">
          <ClipboardList size={20} className="text-plum-600" />
          <div className="font-semibold text-gray-900 text-sm mt-3">Update your list</div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.activeServices === 0
              ? 'Nothing listed yet — coordinators have nothing to quote.'
              : `${stats.activeServices} item${stats.activeServices === 1 ? '' : 's'} live${stats.pricedServices < stats.activeServices ? `, ${stats.activeServices - stats.pricedServices} without a price` : ''}.`}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-plum-600 mt-3 group-hover:gap-2 transition-all">
            Open <ChevronRight size={13} />
          </span>
        </button>

        <button onClick={() => onGo('availability')} className="card p-5 text-left hover:border-plum-200 hover:shadow-md transition-all group">
          <CalendarDays size={20} className="text-plum-600" />
          <div className="font-semibold text-gray-900 text-sm mt-3">Update your calendar</div>
          <p className="text-xs text-gray-500 mt-1">
            {vendor.accepting_bookings === false
              ? 'Bookings are paused — you are not being offered to customers.'
              : `Open every day except what you've marked. ${vendor.lead_time_days ?? 2} day${(vendor.lead_time_days ?? 2) === 1 ? '' : 's'} notice.`}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-plum-600 mt-3 group-hover:gap-2 transition-all">
            Open <ChevronRight size={13} />
          </span>
        </button>
      </section>

      {/* Where a coordinator is genuinely the answer. One block, honestly
          labelled, instead of four cards pretending to be features. */}
      <section className="card p-5 bg-plum-50/50 border-plum-100">
        <h2 className="font-semibold text-gray-900 text-sm">Anything else, ask us</h2>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          Enquiries, quotes and payments are handled by your Sambramo
          coordinator — that part is deliberately human while we're this size.
          Photos and profile edits go through us too, for now.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { label: 'Customer enquiries', icon: MessageCircle, msg: `Hi Sambramo — this is ${businessName}. Are there any customer enquiries waiting for me?` },
            { label: 'My reviews',         icon: Star,          msg: `Hi Sambramo — this is ${businessName}. Could you share my recent customer feedback?` },
            { label: 'Add photos',         icon: TrendingUp,    msg: `Hi Sambramo — this is ${businessName}. I have portfolio photos to add to my profile.` },
          ].map(({ label, icon: Icon, msg }) => (
            <a
              key={label}
              href={whatsappHref(msg)}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white border border-plum-200 text-plum-700 hover:bg-plum-100 transition-colors"
            >
              <Icon size={14} /> {label}
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */

function Account({ vendor, profile, plan, businessName }) {
  const rows = [
    ['Contact name',  profile?.full_name],
    ['Email',         profile?.email],
    ['Phone',         profile?.phone],
    ['City',          vendor.city ?? profile?.city],
    ['Area',          vendor.area],
    ['Pincode',       vendor.pincode],
    ['Experience',    vendor.years_experience ? `${vendor.years_experience} years` : null],
    ['Starting price', formatPrice(vendor.starting_price)],
    ['Website',       vendor.website_url],
    ['Instagram',     vendor.instagram_url],
  ]

  return (
    <div className="space-y-8">
      <section className="card p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-display font-bold text-gray-900">Business details</h2>
          <Link to="/onboarding/vendor" className="text-xs font-bold text-plum-600 hover:text-plum-800">
            Edit
          </Link>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-3 min-w-0">
              <dt className="text-xs text-gray-500 w-28 shrink-0">{label}</dt>
              <dd className="text-sm font-medium text-gray-800 truncate">{value || '—'}</dd>
            </div>
          ))}
        </dl>
        {vendor.description && (
          <p className="text-sm text-gray-600 mt-5 pt-4 border-t border-orange-100 leading-relaxed">
            {vendor.description}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Your plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {VENDOR_PLANS.map(p => {
            const current = p.id === plan.id
            return (
              <div key={p.id} className={`card p-5 flex flex-col ${
                current ? 'border-plum-400 ring-2 ring-plum-200' : p.popular ? 'border-saffron-300' : ''
              }`}>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-gray-900 text-lg">{p.label}</span>
                  {current && (
                    <span className="text-[10px] font-bold bg-plum-600 text-white px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                  {!current && p.popular && (
                    <span className="text-[10px] font-bold bg-saffron-500 text-plum-950 px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                <div className="text-saffron-600 font-semibold text-sm mt-1 mb-4">{p.price}</div>
                <ul className="space-y-1.5 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                {current ? (
                  <div className="w-full mt-5 text-xs font-semibold text-center text-gray-500 border border-gray-100 rounded-xl py-2.5">
                    Your plan
                  </div>
                ) : (
                  <a
                    href={whatsappHref(`Hi Sambramo — this is ${businessName}. I'd like to move to the ${p.label} plan (${p.price}).`)}
                    target="_blank" rel="noopener noreferrer"
                    className="btn-secondary w-full mt-5 text-xs"
                  >
                    Switch to {p.label}
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
