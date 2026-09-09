import React, { useEffect, useState } from 'react'
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Check, X,
  ChevronUp, ChevronDown, Clock, Search, AlertCircle,
} from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { SERVICE_UNITS, UNIT_BY_ID, describeService } from '../../config/vendor'
import { TRADE_FOR_SERVICE } from '../../config/vendor'
import AddItemFlow from './AddItemFlow'
import VenueManager from './VenueManager'
import ServiceSpecs from './ServiceSpecs'
import ListingStatusCard from './ListingStatusCard'
/* The three the Listing tab is now built from. All three imports were
   lost to a patch that used replace() without asserting the anchor
   matched: the file built clean and threw "ListingPitch is not
   defined" at render — the same bare-identifier class as ListChecks,
   which bundlers treat as a runtime global. */
import TradeGrid from './TradeGrid'
import ListingPitch from './ListingPitch'
/* Not the tracker itself — its states, its beads and its "how long
   ago". The tracker still renders on the Jobs tab, read-only, where a
   partner asking "why are there no jobs" needs the answer and has no
   business editing anything. Here, its row and the service row below it
   were the same listing drawn twice, so they became one card. */
import { STATE, stateOf, StatusBeads, ago } from './ListingTracker'

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

export default function VendorServiceList({
  vendor, services, onAdd, onUpdate, onRemove, onOpenCalendar, onOpenJobs,
  startTrade = null, onStartConsumed,
}) {
  /* The catalogue picker replaces the free-text add. See
     AddFromCatalogue and data/partnerCatalogue for why. */
  /* Holds `true` for the full picker, or a trade name to start the
     flow already on that trade. See TradeGrid. */
  const [picking, setPicking] = useState(false)
  const [q, setQ] = useState('')
  /* Set when a submission happens in this session, so the green "live"
     card is a moment a partner sees once rather than a badge that never
     goes away. */
  const [justSubmitted, setJustSubmitted] = useState(false)

  /* ══════════════════════════════════════════════════════════════════
     THE HAND-OFF FROM ONBOARDING
     ══════════════════════════════════════════════════════════════════

     The last button of onboarding lands here at ?tab=list&start=<trade>
     and this is what reads it: the add-item flow opens on the trade the
     partner named in step 1, so signing up and starting to list are one
     continuous act rather than two things separated by an empty screen.

     Consumed immediately. Left in the URL, closing the flow would drop
     the partner back on this tab and reopen it under them — a screen
     they cannot get out of is worse than one they never reached. */
  useEffect(() => {
    if (!startTrade) return
    setPicking(startTrade)
    onStartConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTrade])

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
        {/* Only once there is a listing. While it is empty the red
           card below carries the same action twice as large, and two
           buttons for one job on the first screen a partner sees is a
           choice they should not have to make. */}
        {editing !== 'new' && services.length > 0 && (
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

      {/* ── The flow itself ───────────────────────────────────────
          Lost when the red card was replaced: the splice that removed
          the empty state walked back to the preceding comment and took
          this with it. `picking` was still set by the grid and nothing
          read it, so tapping a trade did exactly nothing — no error, no
          screen, no clue.

          `picking` is `true` for the full picker or a trade name to open
          on that trade. */}
      {picking && (
        <AddItemFlow
          existing={services}
          startTrade={typeof picking === 'string' ? picking : null}
          /* partner_work is keyed on the vendor, not on a listing row:
             one body of work, however many services they list. */
          vendorId={vendor?.id}
          onAdd={onAdd}
          onClose={() => setPicking(false)}
        />
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

      {/* ══════════════════════════════════════════════════════════════
          ONE CARD PER LISTING, AND EVERYTHING ABOUT IT IS ON IT
          ══════════════════════════════════════════════════════════════

          A listing appeared twice on this screen: as a row in the
          tracker at the top, carrying its status and its four beads,
          and again down here as a service row carrying its price and
          the eye/pencil/bin. Same listing, same screen, two cards, and
          nothing said they were the same thing — so a partner with
          three listings met six cards and had to pair them up.

          Now: one card. The name, what it is being read for, how far
          along it is, the price, and the three things a partner can do
          to it — edit, hide, delete — on the card itself rather than in
          a separate row of controls somewhere else.

          Two listings make two cards; six make six, in the order the
          partner arranged them. The arrows move a card and the list
          reorders under the finger. */}
      <ul className="space-y-2.5">
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
              <ListingCard
                listing={s}
                first={i === 0}
                last={i === services.length - 1}
                busy={busyId === s.id}
                dispatchable={DISPATCH_TRADES.includes(s.category)}
                onMove={dir => move(i, dir)}
                onEdit={() => setEditing(s.id)}
                onToggle={() => guard(s.id, () => onUpdate(s.id, { is_active: !s.is_active }))}
                onDelete={() => guard(s.id, () => onRemove(s.id))}
                onSaveSpecs={next => onUpdate(s.id, { specs: next })}
              />
            )}
          </li>
        ))}
      </ul>

      {/* ── The tab IS the trades ─────────────────────────────────
          This was a full-bleed red card with one button on it, and
          the twenty-six things this platform can list were behind
          that button. A partner opens the Listing tab to list
          something; making them tap a marketing card first is a
          toll gate on the one action the screen exists for.

          So the grid is the screen. The marketing survives as a slim
          banner above it that cycles — no button, because tapping any
          trade is the way in and two ways in is a decision nobody
          should have to make. See TradeGrid. */}
      {!editing && (
        <>
          <ListingPitch empty={services.length === 0} />
          <TradeGrid
            q={q}
            setQ={setQ}
            onPick={t => setPicking(t)}
            placeholder="Search 26 trades — catering, generator, mehendi…"
            heading={services.length > 0 ? (
              <p className="mb-2 mt-1 text-[12px] font-extrabold uppercase tracking-[0.06em] text-ink-mute">
                Add something else
              </p>
            ) : null}
          />
        </>
      )}

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


/**
 * ══════════════════════════════════════════════════════════════════════
 * ONE LISTING, ONE CARD
 * ══════════════════════════════════════════════════════════════════════
 *
 * Everything about a listing, in the order somebody asks it:
 *
 *   what is it        the name, and the trade it is dispatched under
 *   where is it       the status word and the four beads
 *   what does it cost the price line
 *   what is wrong     no price, wrong trade, hidden, or the reviewer's
 *                     note on a listing that came back
 *   what can I do     edit · hide · delete, ON THE CARD
 *
 * ── Why the actions are on the card ─────────────────────────────────
 * They were a column of three round icon buttons at the right-hand edge
 * of a row, sharing 44px with a two-line price. On a 360px phone that is
 * three 32px targets stacked against the screen edge with 6px between
 * them, and the middle one is Edit while the bottom one is Delete.
 *
 * As a labelled row across the bottom of the card each has a word next
 * to it, they are 44px tall, and Delete is at the far end from Edit
 * rather than 6px below it.
 *
 * ── The colour ──────────────────────────────────────────────────────
 * A live listing carries a royal-600 header — the brand blue, not the
 * plum-950 that reads as navy — with bold white text on it. The state
 * paints the card, because the state IS the message: a partner should
 * know from across a kitchen which of their six listings came back.
 */
function ListingCard({
  listing: s, first, last, busy, dispatchable,
  onMove, onEdit, onToggle, onDelete, onSaveSpecs,
}) {
  const state = stateOf(s)
  const meta = STATE[state]
  const Icon = meta.icon
  const when = ago(s.reviewed_at ?? s.created_at)

  /* Bold white on the brand blue for a live listing; amber and rose
     carry white too, and nothing here is white on a pale ground. */
  const head = state === 'live' ? 'bg-royal-600 text-white'
    : state === 'under_review' ? 'bg-amber-500 text-white'
    : state === 'rejected' ? 'bg-rose-600 text-white'
    : 'bg-ink/[0.06] text-ink-soft'

  return (
    <div className={`overflow-hidden rounded-[20px] bg-white ring-1 ${meta.ring} ${s.is_active ? '' : 'opacity-75'}`}>
      {/* ── What it is, and where it is ───────────────────────────── */}
      <div className={`flex items-center gap-2.5 px-4 py-2.5 ${head}`}>
        <Icon size={15} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-extrabold leading-tight">
            {s.name}
          </span>
          <span className="block truncate text-[11.5px] font-semibold opacity-85">
            {meta.label}{when ? ` · ${when}` : ''}
          </span>
        </span>
        {/* ── The arrows ────────────────────────────────────────────
            Here rather than in a column of their own — reordering is
            rare and should not cost the card a gutter.

            They do NOT use IconButton. That component paints
            `text-gray-500`, which is designed for a white row and is
            very nearly invisible on the royal, amber and rose headers
            these now sit on — the same trap `ink` tokens set on every
            dark card in this app. `currentColor` at 80% inherits
            whatever the header is using, so they are legible on all
            four states without a per-state palette. */}
        <span className="flex shrink-0 flex-col">
          <button
            type="button" aria-label="Move up" title="Move up"
            disabled={first} onClick={() => onMove(-1)}
            className="rounded p-0.5 opacity-80 transition hover:opacity-100 disabled:opacity-25"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button" aria-label="Move down" title="Move down"
            disabled={last} onClick={() => onMove(1)}
            className="rounded p-0.5 opacity-80 transition hover:opacity-100 disabled:opacity-25"
          >
            <ChevronDown size={14} />
          </button>
        </span>
      </div>

      <StatusBeads state={state} className="px-4 pt-2.5" />

      <div className="px-4 pb-3 pt-2">
        <p className="text-[13.5px] font-extrabold text-royal-700">{describeService(s)}</p>

        {s.description && (
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-ink-mute">{s.description}</p>
        )}

        {s.lead_time_days !== null && s.lead_time_days !== undefined && (
          <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-ink-mute">
            <Clock size={11} />
            {s.lead_time_days === 0 ? 'Same-day possible' : `${s.lead_time_days} day${s.lead_time_days === 1 ? '' : 's'} notice`}
          </p>
        )}

        {/* ══════════════════════════════════════════════════════════
            The silence that cost a partner every job
            ══════════════════════════════════════════════════════════

            match_partners joins on `category`. A row whose category is
            null, or is free text no trade matches, is offered to NOBODY
            — and nothing said so anywhere. A real partner has a row
            reading "videpgraphy" that has never once been dispatched,
            and from this screen it looked identical to the row beside
            it that works. */}
        {(s.price === null || (s.is_active && !dispatchable) || !s.is_active) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {!s.is_active && (
              <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-bold text-ink-mute">
                Hidden by you
              </span>
            )}
            {s.price === null && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                No price
              </span>
            )}
            {s.is_active && !dispatchable && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                Never offered — fix the work type
              </span>
            )}
          </div>
        )}

        {/* Why it came back. A listing refused with no reason is a
            partner who submits the same thing again. */}
        {state === 'rejected' && s.review_note && (
          <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-[12px] leading-snug text-rose-900 ring-1 ring-rose-200">
            <span className="font-extrabold">What to change: </span>{s.review_note}
          </p>
        )}
      </div>

      {/* ── What they can do to it ──────────────────────────────────
          Labelled, 44px tall, and Delete at the far end from Edit. It
          was three round icon buttons stacked against the right edge of
          the row, 32px each with 6px between them, the middle one Edit
          and the bottom one Delete. */}
      <div className="grid grid-cols-3 border-t border-ink/[0.06] text-[12px] font-extrabold">
        <button
          type="button" onClick={onEdit}
          className="flex items-center justify-center gap-1.5 py-3 text-ink-soft transition active:bg-ink/[0.04]"
        >
          <Pencil size={14} /> Edit
        </button>
        <button
          type="button" onClick={onToggle} disabled={busy}
          className="flex items-center justify-center gap-1.5 border-x border-ink/[0.06] py-3 text-ink-soft transition active:bg-ink/[0.04] disabled:opacity-50"
        >
          {s.is_active ? <><EyeOff size={14} /> Hide</> : <><Eye size={14} /> Show</>}
        </button>
        <CardDelete busy={busy} onConfirm={onDelete} />
      </div>

      {/* ── What they actually do ───────────────────────────────────
          Keyed by TRADE, so a caterer answers their cuisines once
          rather than once per row. Folded shut, because a caterer has
          four groups and thirty-odd boxes and this screen is opened to
          check a price, not to fill in a profile.

          `'specs' in s` is the migration check: the hook selects '*', so
          the key is present exactly when 098 has been applied. Offering
          a Save that writes a column the database does not have would
          fail on the one tap that matters. */}
      {'specs' in s && (
        <ServiceSpecs trade={s.category} value={s.specs} onSave={onSaveSpecs} />
      )}
    </div>
  )
}

/**
 * Delete, in two taps, in the width of one button.
 *
 * The old DeleteButton swapped the bin for a tick-and-cross pair, which
 * on a full-width footer cell puts the confirm exactly where the finger
 * already is. So the confirmation takes over the whole row instead:
 * "Delete this?" with the answer somewhere the finger is not.
 */
function CardDelete({ busy, onConfirm }) {
  const [armed, setArmed] = useState(false)

  if (!armed) {
    return (
      <button
        type="button" onClick={() => setArmed(true)} disabled={busy}
        className="flex items-center justify-center gap-1.5 py-3 text-rose-700 transition active:bg-rose-50 disabled:opacity-50"
      >
        <Trash2 size={14} /> Delete
      </button>
    )
  }

  return (
    <div className="col-span-3 flex items-center gap-2 bg-rose-50 px-4 py-2.5">
      <span className="min-w-0 flex-1 text-[12.5px] font-extrabold text-rose-900">
        Delete this listing for good?
      </span>
      <button
        type="button" onClick={() => setArmed(false)}
        className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-extrabold text-rose-900"
      >
        Keep
      </button>
      <button
        type="button" disabled={busy}
        onClick={() => { setArmed(false); onConfirm() }}
        className="shrink-0 rounded-full bg-rose-600 px-3 py-1.5 text-[12px] font-extrabold text-white disabled:opacity-60"
      >
        Delete
      </button>
    </div>
  )
}
