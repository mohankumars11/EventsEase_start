import { useState } from 'react'
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Check, X,
  ChevronUp, ChevronDown, Clock, AlertCircle, Sparkles, ArrowRight,
} from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { SERVICE_UNITS, UNIT_BY_ID, describeService } from '../../config/vendor'
import { TRADE_FOR_SERVICE } from '../../config/vendor'
import { TRADES } from '../../data/partnerCatalogue'
import AddItemFlow from './AddItemFlow'
import VenueManager from './VenueManager'
import ServiceSpecs from './ServiceSpecs'
import { ReviewPill } from './ReviewBanner'
import ListingStatusCard from './ListingStatusCard'

/* The trades `match_partners` can match on, read from the same map
   dispatch uses — so this list cannot drift from what actually works.
   A hand-typed copy goes stale the first time a trade is added. */
const DISPATCH_TRADES = [...new Set(Object.values(TRADE_FOR_SERVICE))].sort()

/* The trade a venue partner's service row carries. */
const VENUE_TRADE = TRADE_FOR_SERVICE.venue

/**
 * The vendor's price list.
 *
 * This is the screen the whole vendor side was missing. A coordinator matching
 * a 200-guest wedding needs to know what a partner sells, what it costs per
 * unit of something, the smallest order worth their while, and how much notice
 * they need. Until now all four lived in WhatsApp scrollback.
 *
 * The editor is inline rather than a modal on purpose: a vendor adding six
 * items in a sitting should never lose the list they are working against, and
 * on a phone a modal over a list is a list you can no longer check yourself
 * against.
 */

const BLANK = {
  name: '', category: '', description: '',
  price: '', unit: 'per event', min_quantity: 1, lead_time_days: '',
}

export default function VendorServiceList({ vendor, services, onAdd, onUpdate, onRemove, onOpenCalendar, onOpenJobs }) {
  /* The catalogue picker replaces the free-text add. See
     AddFromCatalogue and data/partnerCatalogue for why. */
  /* Holds `true` for the full picker, or a trade name to start the
     flow already on that trade. See QuickStart. */
  const [picking, setPicking] = useState(false)
  /* Set when a submission happens in this session, so the green "live"
     card is a moment a partner sees once rather than a badge that never
     goes away. */
  const [justSubmitted, setJustSubmitted] = useState(false)

  const toast = useToast()
  // null = closed, 'new' = the add form, or an id being edited. One at a time:
  // two open forms on a phone is two half-finished items.
  const [editing, setEditing] = useState(null)
  const [busyId,  setBusyId]  = useState(null)

  /* STARTERS and DEFAULT_STARTERS are gone with the old empty state.
     They offered three free-text suggestions per category -- exactly the
     typed names AddFromCatalogue was built to end, and they would have
     produced rows dispatch could not match. */

  async function guard(id, fn) {
    setBusyId(id)
    try { await fn() } catch (err) { toast.error(friendlyError(err)) } finally { setBusyId(null) }
  }

  async function handleSave(fields, id) {
    // Empty string is not zero and not null. An untouched price field must
    // stay "quote on request" rather than becoming a free item.
    const payload = {
      name:        fields.name.trim(),
      // Never null: the form requires it, and a row without a trade
      // is a row dispatch cannot see.
      category:    fields.category.trim(),
      description: fields.description.trim() || null,
      price:        fields.price === '' ? null : Number(fields.price),
      unit:         fields.unit,
      min_quantity: Math.max(1, Number(fields.min_quantity) || 1),
      lead_time_days: fields.lead_time_days === '' ? null : Number(fields.lead_time_days),
    }
    if (id === 'new') await onAdd(payload)
    else              await onUpdate(id, payload)
    setEditing(null)
    toast.success(id === 'new' ? 'Added to your list.' : 'Saved.')
  }

  /**
   * Swap sort_order with the neighbour. Two writes, and a partial failure is
   * harmless: the hook orders by sort_order then created_at, so two rows
   * sharing an order still render in a stable sequence.
   */
  async function move(index, dir) {
    const target = services[index + dir]
    const current = services[index]
    if (!target) return
    await guard(current.id, async () => {
      await onUpdate(current.id, { sort_order: target.sort_order })
      await onUpdate(target.id,  { sort_order: current.sort_order })
    })
  }

  const activeCount = services.filter(s => s.is_active).length

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-gray-900">What you offer</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {services.length === 0
              ? 'What you list is what you get offered.'
              : `${activeCount} live${services.length !== activeCount ? ` · ${services.length - activeCount} hidden` : ''}`}
          </p>
        </div>
        {editing !== 'new' && (
          <button onClick={() => setPicking(true)} className="btn-plum text-sm">
            <Plus size={16} /> Add what you do
          </button>
        )}
      </header>
      {/* ── Where a listing actually is ───────────────────────────────
          Submitting and hearing nothing is where a partner loses
          interest, and it is a silence we create. This shows the whole
          journey — submitted, under review with a real timeframe, then
          live — and hands them the one thing worth doing meanwhile.
          See ListingStatusCard. */}
      {(() => {
        const rejected = services.filter(s => s.review_status === 'rejected')
        const pending = services.filter(s => s.review_status === 'under_review')
        const live = services.filter(s => s.review_status === 'live')

        if (rejected.length) {
          return (
            <ListingStatusCard
              status="rejected"
              count={rejected.length}
              note={rejected[0]?.review_note}
            />
          )
        }
        if (pending.length) {
          /* The oldest one, because that is the wait a partner is
             actually feeling. */
          const first = pending.reduce(
            (x, y) => (new Date(x.created_at) < new Date(y.created_at) ? x : y),
            pending[0])
          return (
            <ListingStatusCard
              status="review"
              count={pending.length}
              submittedAt={first?.created_at}
              onOpenCalendar={onOpenCalendar}
            />
          )
        }
        /* Only right after a submission. An established partner opening
           their listing does not need a card telling them they are live —
           that is a moment, not a permanent badge. */
        if (live.length && justSubmitted) {
          return (
            <ListingStatusCard status="live" count={live.length} onOpenJobs={onOpenJobs} />
          )
        }
        return null
      })()}

      {/* ── The venue, for the partners who are one ──────────────────
          For a decorator "your listing" is a price list. For a venue
          manager it is the building, its halls and its calendar — the
          same question asked of a different kind of business, not a
          separate feature, which is why it lives here rather than
          claiming a sixth seat on a tab bar that is full at five.

          Rendered above the price list because a venue's calendar is the
          thing that earns; its per-plate extras are the footnote. */}
      <VenueManager
        vendorId={vendor?.id}
        /* Read from the same map dispatch uses, not typed. The trade
           stored on a service row is 'Venue', not 'venue', and a
           hardcoded lowercase string here would have matched nothing --
           silently, for every venue partner, forever. */
        canClaim={services.some(s => s.category === VENUE_TRADE)}
      />

      {/* The full-screen add journey. Replaces AddFromCatalogue, which
          was a flat list of names and a price box -- it asked a caterer
          for exactly as much as it asked a balloon supplier, and a
          caterer's listing is not a name and a number. See AddItemFlow. */}
      {picking && (
        <AddItemFlow
          existing={services}
          startTrade={typeof picking === 'string' ? picking : null}
          onAdd={onAdd}
          onClose={() => setPicking(false)}
        />
      )}

      {editing === 'new' && (
        <ServiceForm
          initial={BLANK}
          vendorCategory={vendor?.category}
          onCancel={() => setEditing(null)}
          onSave={fields => handleSave(fields, 'new')}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════
          AN EMPTY LISTING IS THE MOST IMPORTANT SCREEN IN THE APP
          ══════════════════════════════════════════════════════════════

          A partner reaches it once, in the first two minutes, having just
          signed up on somebody's word that this is worth their time. What
          was here was a grey clipboard and "Nothing here yet" -- true, and
          an invitation to close the app.

          So it does one job: make the next tap obvious and make it worth
          taking. The number is real -- it is the same figure the partner
          landing page quotes and it comes from actual accepted lines --
          because an invented one is the fastest way to lose somebody who
          later finds out.

          Three reasons, not ten. Somebody deciding whether to spend ten
          minutes on a form does not read ten. */}
      {services.length === 0 && !editing && (
        <div className="overflow-hidden rounded-[24px] bg-kumkuma-600 text-white">
          <div className="p-5 sm:p-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-kumkuma-700">
              <Sparkles size={12} /> Your listing is empty
            </span>

            <h3 className="mt-3 font-display text-[25px] font-extrabold leading-tight text-white">
              Nobody can book what they cannot see
            </h3>
            <p className="mt-1.5 text-[13.5px] font-semibold leading-relaxed text-white/85">
              A typical job on Sambramo pays ₹6,587. Every one of them goes
              to a partner whose listing says they can do it — and right now
              yours says nothing at all.
            </p>

            {/* ── One tap in, already knowing who they are ──────────────
                The button used to open a picker at the top of a list of
                twenty-six trades, and a caterer who told us they were a
                caterer when they signed up had to find themselves in it
                again. Their own trade is the first chip and it starts the
                flow already answered.

                The rest are the four trades a Bengaluru partner most often
                adds alongside, so somebody who does two things is one tap
                from the second — and the full list is still there for
                everybody else. */}
            <QuickStart category={vendor?.category} onPick={setPicking} />
          </div>

          <div className="border-t border-white/20 bg-black/[0.10] px-5 py-4 sm:px-6">
            {[
              ['Pick, never type', 'Everything comes from a list, so your listing cannot be missed because of a spelling.'],
              ['Say exactly what you do', 'Cuisines, menus, dishes — the more you say, the closer the jobs match.'],
              ['You choose every job', 'Nothing is booked over your head. Decline anything, with no penalty.'],
            ].map(([t, d]) => (
              <div key={t} className="flex gap-2.5 py-1.5">
                <Check size={14} className="mt-0.5 shrink-0 text-white" />
                <p className="text-[12.5px] font-semibold leading-snug text-white/90">
                  <span className="font-extrabold text-white">{t}. </span>{d}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* A starter chip opens the form pre-filled — `editing` holds the draft
          object rather than an id, so the same form serves all three entries. */}
      {editing && typeof editing === 'object' && (
        <ServiceForm
          initial={editing}
          vendorCategory={vendor?.category}
          onCancel={() => setEditing(null)}
          onSave={fields => handleSave(fields, 'new')}
        />
      )}

      <ul className="space-y-3">
        {services.map((s, i) => (
          <li key={s.id}>
            {editing === s.id ? (
              <ServiceForm
                initial={{
                  name: s.name, category: s.category ?? '', description: s.description ?? '',
                  price: s.price ?? '', unit: s.unit, min_quantity: s.min_quantity,
                  lead_time_days: s.lead_time_days ?? '',
                }}
                vendorCategory={vendor?.category}
                onCancel={() => setEditing(null)}
                onSave={fields => handleSave(fields, s.id)}
              />
            ) : (
              <div className={`card p-4 flex items-start gap-3 transition-opacity ${s.is_active ? '' : 'opacity-60'}`}>
                <div className="flex flex-col gap-0.5 pt-0.5 shrink-0">
                  <IconButton label="Move up"   disabled={i === 0}                   onClick={() => move(i, -1)}><ChevronUp   size={14} /></IconButton>
                  <IconButton label="Move down" disabled={i === services.length - 1} onClick={() => move(i,  1)}><ChevronDown size={14} /></IconButton>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{s.name}</span>
                    {/* Which of the eleven rows can actually bring work.
                        A partner scanning their list should see that at
                        a glance rather than assuming everything is on. */}
                    {'review_status' in s && <ReviewPill status={s.review_status} />}
                    {!s.is_active && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        Hidden
                      </span>
                    )}
                    {s.price === null && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        No price
                      </span>
                    )}
                    {/* ══════════════════════════════════════════════════
                        The silence that cost a partner every job
                        ══════════════════════════════════════════════════

                        `match_partners` joins on `category`. A row whose
                        category is null, or is free text no trade
                        matches, is offered to NOBODY -- and nothing said
                        so anywhere. A real partner has a row reading
                        "videpgraphy" that has never once been dispatched,
                        and from this screen it looked identical to the
                        row beside it that works.

                        The picker above now makes the field required, so
                        no new row can be born dead. This is for the rows
                        that already were. */}
                    {s.is_active && !DISPATCH_TRADES.includes(s.category) && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                        Never offered — fix the work type
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-plum-700 font-semibold mt-0.5">{describeService(s)}</div>
                  {s.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description}</p>
                  )}
                  {s.lead_time_days !== null && s.lead_time_days !== undefined && (
                    <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1">
                      <Clock size={11} />
                      {s.lead_time_days === 0 ? 'Same-day possible' : `${s.lead_time_days} day${s.lead_time_days === 1 ? '' : 's'} notice`}
                    </p>
                  )}

                  {/* ── What they actually do ──────────────────────────
                      Keyed by TRADE, so a caterer answers their cuisines
                      once rather than once per row. Folded shut, because
                      a caterer has four groups and thirty-odd boxes and
                      this screen is opened to check a price, not to fill
                      in a profile. */}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <IconButton
                    label={s.is_active ? 'Hide from coordinators' : 'Show to coordinators'}
                    disabled={busyId === s.id}
                    onClick={() => guard(s.id, () => onUpdate(s.id, { is_active: !s.is_active }))}
                  >
                    {s.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                  </IconButton>
                  <IconButton label="Edit" onClick={() => setEditing(s.id)}>
                    <Pencil size={15} />
                  </IconButton>
                  <DeleteButton
                    busy={busyId === s.id}
                    onConfirm={() => guard(s.id, () => onRemove(s.id))}
                  />
                </div>
              </div>
              )}

              {/* Outside the flex row, so it spans the whole card.
                  Nested inside the text column it shared the width with
                  the eye/pencil/bin buttons, and thirty cuisine chips in
                  two thirds of a phone is a wall of two-word lines.

                  `'specs' in s` is the migration check: the hook selects
                  '*', so the key is present exactly when 098 has been
                  applied. Offering a Save that writes a column the
                  database does not have would fail on the one tap that
                  matters. Same convention as 096. */}
              {editing !== s.id && 'specs' in s && (
                <ServiceSpecs
                  trade={s.category}
                  value={s.specs}
                  onSave={next => onUpdate(s.id, { specs: next })}
                />
              )}
          </li>
        ))}
      </ul>

      {services.length > 0 && (
        <p className="text-xs text-gray-500">
          Hiding an item keeps it and its price for later — useful for anything
          seasonal. Deleting is permanent.
        </p>
      )}
    </div>
  )
}

function ServiceForm({ initial, vendorCategory, onSave, onCancel }) {
  const [f, setF]         = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr]     = useState(null)

  const unit = UNIT_BY_ID[f.unit] ?? UNIT_BY_ID['per event']
  const set  = (k, v) => { setF(prev => ({ ...prev, [k]: v })); setErr(null) }

  async function submit(e) {
    e.preventDefault()
    if (!f.name.trim())              return setErr('Give this item a name your customer would recognise.')
    if (f.price !== '' && Number(f.price) < 0) return setErr('A price cannot be negative.')
    setSaving(true)
    try { await onSave(f) } catch (e2) { setErr(friendlyError(e2)) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="card p-4 sm:p-5 border-plum-200 ring-1 ring-plum-100 space-y-4">
      <div>
        <label className="label" htmlFor="svc-name">Item name</label>
        <input
          id="svc-name" className="input" value={f.name} autoFocus
          onChange={e => set('name', e.target.value.slice(0, 80))}
          placeholder="e.g. Veg buffet"
        />
      </div>

      {/* Price and unit are one decision, so they sit on one row — the number
          is meaningless without the thing it is per. */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="svc-price">
            Price <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <input
            id="svc-price" className="input" inputMode="numeric" value={f.price}
            onChange={e => set('price', e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="Leave blank to quote later"
          />
        </div>
        <div>
          <label className="label" htmlFor="svc-unit">Per</label>
          <select id="svc-unit" className="input" value={f.unit} onChange={e => set('unit', e.target.value)}>
            {SERVICE_UNITS.map(u => (
              <option key={u.id} value={u.id}>{u.id.replace('per ', '')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="svc-min">{unit.quantityLabel}</label>
          <input
            id="svc-min" className="input" inputMode="numeric" value={f.min_quantity}
            onChange={e => set('min_quantity', e.target.value.replace(/\D/g, ''))}
            placeholder="1"
          />
        </div>
        <div>
          <label className="label" htmlFor="svc-lead">
            Notice needed <span className="font-normal text-gray-500">(days)</span>
          </label>
          <input
            id="svc-lead" className="input" inputMode="numeric" value={f.lead_time_days}
            onChange={e => set('lead_time_days', e.target.value.replace(/\D/g, ''))}
            placeholder="Same as your profile"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          The field that decides whether this partner gets any work
          ══════════════════════════════════════════════════════════

          `vendor_services.category` is what `match_partners` joins on.
          A row whose category is blank matches NOTHING — the partner is
          invisible to dispatch for that service, permanently, with no
          error anywhere.

          It used to be a small optional "Tag as …" link beside the save
          button, carrying `hidden sm:inline-flex` — so on a phone it did
          not exist. Every service added from a phone had a null
          category. Measured across the three real partners: five of
          seventeen rows were unmatched, including BOTH rows of the
          newest partner, who therefore never received one offer.

          A required select of the trades dispatch actually knows, and
          not free text: a partner typing "Photgraphy" was writing a row
          that could never match, and nothing told them. */}
      <div>
        <label className="label" htmlFor="svc-trade">
          What kind of work is this? <span className="text-red-600">*</span>
        </label>
        <select
          id="svc-trade"
          className="input"
          value={f.category}
          onChange={e => set('category', e.target.value)}
          required
        >
          <option value="">Choose one…</option>
          {DISPATCH_TRADES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <p className="mt-1 text-[11.5px] leading-snug text-gray-500">
          This is how customers find you. Jobs are matched on it, so a
          service without one is never offered to you.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="svc-desc">
          What's included <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          id="svc-desc" className="input resize-none h-20" value={f.description}
          onChange={e => set('description', e.target.value.slice(0, 300))}
          placeholder="Starters, two mains, dessert, staff and serving equipment…"
        />
      </div>

      {/* The line a coordinator will actually read, shown while it is being
          typed. It is the only way for the vendor to tell that "400" and
          "per plate" combine into something sane. */}
      <div className="rounded-xl bg-white border border-orange-100 px-3 py-2.5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">
          How this reads to us
        </div>
        <div className="text-sm text-gray-800">
          <span className="font-semibold">{f.name.trim() || 'Untitled item'}</span>
          {' — '}
          <span className="text-plum-700 font-semibold">
            {describeService({ price: f.price === '' ? null : f.price, unit: f.unit, min_quantity: Number(f.min_quantity) || 1 })}
          </span>
        </div>
      </div>

      {err && (
        <p className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />{err}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-plum text-sm flex-1 sm:flex-none">
          <Check size={16} /> {saving ? 'Saving…' : 'Save item'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">
          <X size={16} /> Cancel
        </button>
        {vendorCategory && !f.category && (
          <button
            type="button"
            onClick={() => set('category', vendorCategory)}
            className="hidden sm:inline-flex text-xs text-gray-500 hover:text-plum-600 px-2"
          >
            Tag as {vendorCategory}
          </button>
        )}
      </div>
    </form>
  )
}

function IconButton({ label, children, disabled, onClick }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      aria-label={label} title={label}
      className="p-1.5 rounded-lg text-gray-500 hover:text-plum-600 hover:bg-plum-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-colors"
    >
      {children}
    </button>
  )
}

/**
 * Two-tap delete instead of window.confirm().
 *
 * A price list is a vendor's own work and this is the only destructive control
 * on the page, but a blocking browser dialog on a phone is both ugly and easy
 * to dismiss the wrong way. The button becomes its own confirmation and reverts
 * if the vendor taps anywhere else.
 */
function DeleteButton({ onConfirm, busy }) {
  const [armed, setArmed] = useState(false)

  if (!armed) {
    return (
      <IconButton label="Delete" onClick={() => setArmed(true)}>
        <Trash2 size={15} />
      </IconButton>
    )
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button" onClick={onConfirm} disabled={busy}
        className="text-[11px] font-bold px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
      >
        {busy ? '…' : 'Delete'}
      </button>
      <IconButton label="Keep it" onClick={() => setArmed(false)}>
        <X size={14} />
      </IconButton>
    </span>
  )
}

/**
 * The way in, for somebody who has already told us what they do.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT ONE BUTTON
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Add what you do" opened a list of twenty-six trades scrolled to the
 * top. A caterer who wrote "Catering & Food" on the sign-up form had to
 * find themselves in that list again, which reads as the app not having
 * listened — on the first screen, where a partner is deciding whether
 * this is worth ten minutes.
 *
 * So their own trade is a chip, and it starts the flow already on that
 * trade. The other four are what a Bengaluru partner most often does
 * alongside: somebody who owns a hall usually also rents chairs, and a
 * photographer usually also shoots video. One tap for the second thing.
 *
 * Everything else is still one tap away, and the full list is the wide
 * button so nobody is trapped by our guess.
 */
const ALSO_DOES = {
  'Catering & Food':      ['Tent & Furniture', 'Guest Services', 'Bar & Beverages'],
  'Photography':          ['Videography', 'Decoration & Floral', 'Anchor & MC'],
  'Videography':          ['Photography', 'Sound & AV', 'Event Lighting'],
  'Venue':                ['Catering & Food', 'Tent & Furniture', 'Valet Parking'],
  'Decoration & Floral':  ['Event Lighting', 'Tent & Furniture', 'Gifts & Favours'],
  'Tent & Furniture':     ['Power & Cooling', 'Decoration & Floral', 'Guest Services'],
  'Transportation':       ['Valet Parking', 'Guest Services', 'Security Services'],
  'Sound & AV':           ['DJ & Music', 'Event Lighting', 'Live Entertainment'],
  'DJ & Music':           ['Sound & AV', 'Event Lighting', 'Anchor & MC'],
  'Bridal Makeup & Hair': ['Mehendi Artist', 'Photography', 'Gifts & Favours'],
  'Mehendi Artist':       ['Bridal Makeup & Hair', 'Live Entertainment'],
  'Wedding Planning':     ['Decoration & Floral', 'Photography', 'Anchor & MC'],
  'Priest & Rituals':     ['Live Entertainment', 'Catering & Food'],
}

/* For a partner whose trade we do not have a neighbour list for, and for
   anyone who registered as "Other". The four most-added trades overall,
   which is a guess we are making openly rather than a ranking. */
const COMMON = ['Catering & Food', 'Photography', 'Decoration & Floral', 'Tent & Furniture']

export function QuickStart({ category, onPick }) {
  const mine = category && category !== 'Other' && TRADES.includes(category) ? category : null
  const others = (mine ? (ALSO_DOES[mine] ?? COMMON) : COMMON)
    .filter(x => x !== mine && TRADES.includes(x))
    .slice(0, 3)

  return (
    <div className="mt-4">
      {mine && (
        <button
          onClick={() => onPick(mine)}
          className="flex w-full items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3.5 text-left transition active:scale-[0.99]"
        >
          <span className="min-w-0">
            <span className="block text-[15px] font-extrabold leading-tight text-kumkuma-700">
              Start with {mine}
            </span>
            <span className="mt-0.5 block text-[11.5px] font-semibold text-ink-soft">
              What you told us you do. Ten minutes.
            </span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-kumkuma-600" />
        </button>
      )}

      {others.length > 0 && (
        <>
          <p className="mb-1.5 mt-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/70">
            {mine ? 'Do you also do' : 'Or start with'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {others.map(x => (
              <button
                key={x}
                onClick={() => onPick(x)}
                className="rounded-full bg-white/15 px-3.5 py-2 text-[12.5px] font-extrabold text-white ring-1 ring-white/30 transition active:scale-[0.98]"
              >
                {x}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        onClick={() => onPick(true)}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-extrabold transition active:scale-[0.99] ${
          mine ? 'mt-3 bg-white/15 text-white ring-1 ring-white/30' : 'mt-3 bg-white text-kumkuma-700'
        }`}
      >
        <Plus size={17} /> {mine ? 'Something else' : 'Add what you do'}
      </button>
      <p className="mt-1.5 text-center text-[11.5px] font-semibold text-white/70">
        Nothing is charged, ever. You choose every job.
      </p>
    </div>
  )
}
