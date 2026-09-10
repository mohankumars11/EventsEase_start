import React, { useEffect, useState } from 'react'
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Check, X, Lock,
  ChevronUp, ChevronDown, Clock, Search, AlertCircle,
} from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { SERVICE_UNITS, UNIT_BY_ID, describeService } from '../../config/vendor'
import { TRADE_FOR_SERVICE } from '../../config/vendor'
import AddItemFlow from './AddItemFlow'
import VenueManager from './VenueManager'
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

      {/* ══════════════════════════════════════════════════════════════
          EDIT OPENS THE TRADE, NOT A NAMING FORM
          ══════════════════════════════════════════════════════════════

          Edit used to swap the card for `ServiceForm` — item name, a
          price, and a select headed "What kind of work is this?". That
          is the ADD form, and on a listing that already exists it is the
          wrong three questions: the name is the offering, the trade is
          what dispatch joins on, and everything a partner might actually
          want to change — their cuisines, their limits, their notice,
          what the hall costs — was not on it at all. It lived on the
          card as a separate fold, so editing a listing and editing its
          answers were two different places.

          Now Edit reopens the flow the listing was made in, on the
          partner's own trade, seeded with what they already answered.
          The trade and offering steps are skipped because those are the
          row. Saving updates that row rather than adding another. */}
      {typeof editing === 'string' && services.some(s => s.id === editing) && (
        <AddItemFlow
          existing={services}
          editing={services.find(s => s.id === editing)}
          vendorId={vendor?.id}
          onUpdate={onUpdate}
          onClose={() => setEditing(null)}
        />
      )}

      {/* A starter chip opens the form pre-filled — `editing` holds the draft
          object rather than an id, so the same form serves all three entries. */}

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
            {/* Editing no longer swaps the card for a form in place —
                it opens the trade's own flow over the top. See the
                AddItemFlow above. */}
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
            />
          </li>
        ))}
      </ul>

      {/* ── The grid is the screen, but only when it needs to be ───
          The argument below is true, and it is true about a partner
          with NOTHING listed. For them the grid IS the screen and a
          button in front of it is a toll gate on the one action the
          screen exists for.

          For everybody else it was 870px -- 66% of the whole tab --
          permanently expanded under their listings, thirteen rows of
          trades they have already chosen from. They have been through
          the flow; they know what the button does; the toll-gate
          argument does not survive the second visit.

          So: zero listings keeps it inline and unchanged. One or more
          gets a button that opens the SAME grid full-screen, because
          AddItemFlow already renders TradeGrid on its first step. No
          second component, no second search, no second copy of the
          thing TradeGrid's own header argues should exist once. */}
      {!editing && services.length === 0 && (
        <>
          <ListingPitch empty />
          <TradeGrid
            q={q}
            setQ={setQ}
            onPick={t => setPicking(t)}
            placeholder="Search 26 trades — catering, generator, mehendi…"
          />
        </>
      )}

      {!editing && services.length > 0 && (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[14px] font-extrabold text-royal-700 ring-1 ring-royal-200 transition active:scale-[0.99]"
        >
          <Plus size={16} /> Add something else you do
        </button>
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

function ListingCard({
  listing: s, first, last, busy, dispatchable,
  onMove, onEdit, onToggle, onDelete,
}) {
  const state = stateOf(s)
  const meta = STATE[state]
  const Icon = meta.icon
  const when = ago(s.reviewed_at ?? s.created_at)

  /* ══════════════════════════════════════════════════════════════════
     COLLAPSED BY DEFAULT, EXCEPT WHEN IT IS WAITING ON THEM
     ══════════════════════════════════════════════════════════════════

     This card was 205-360px and six of them made the tab four screens
     of scrolling to reach a button. Almost all of that is reference: a
     partner opens the Listing tab to check one thing, not to read six
     listings end to end.

     What stays open is exactly what ListingTracker already decided --
     "anything waiting on the partner is never folded". Three things
     qualify, and all three mean the partner is silently earning
     nothing:

       rejected        a review_note is the one sentence on this tab
                       waiting on THEM rather than on us
       no guide price  a blank nobody has told them about
       never offered   a trade string dispatch cannot match

     A rejected listing has no chevron at all. Folding away the note
     that says what to change would be hiding the only actionable thing
     on the screen. */
  const needsThem =
    state === 'rejected' || s.price === null || (s.is_active && !dispatchable)
  const [open, setOpen] = useState(needsThem)
  const locked = state === 'rejected'

  /* Just the money, without the "· min 100 plates" tail -- on a
     collapsed row that tail is what forces the name to truncate. */
  const headline = describeService({ price: s.price, unit: s.unit, min_quantity: 1 })

  /* Bold white on the brand blue for a live listing; amber and rose
     carry white too, and nothing here is white on a pale ground. */
  const head = state === 'live' ? 'bg-royal-600 text-white'
    : state === 'under_review' ? 'bg-amber-500 text-white'
    : state === 'rejected' ? 'bg-rose-600 text-white'
    : 'bg-ink/[0.06] text-ink-soft'

  return (
    <div className={`overflow-hidden rounded-[20px] bg-white ring-1 ${meta.ring} ${s.is_active ? '' : 'opacity-75'}`}>
      {/* ── The whole card, collapsed ──────────────────────────────
          A button, not a div with an onClick: this is the primary
          control of the card and it has to be reachable by keyboard and
          announce its state. The arrows moved into the action row
          below -- a chevron, two 14px arrows and a truncating title
          fighting over one gutter at 390px is three targets in the
          space for one, and nesting buttons inside a button is invalid
          besides. */}
      <button
        type="button"
        onClick={() => { if (!locked) setOpen(o => !o) }}
        aria-expanded={open}
        disabled={locked}
        className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left ${head}`}
      >
        <Icon size={15} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-extrabold leading-tight">
            {s.name}
          </span>
          <span className="block truncate text-[11.5px] font-semibold opacity-85">
            {meta.label}{when ? ` · ${when}` : ''}
          </span>
        </span>
        {/* currentColor, never royal-700 -- a fixed dark token is
            invisible on the royal band and a fixed light one disappears
            on the pale hidden state. The same trap the arrows note
            below already documents. */}
        <span className="shrink-0 text-[12.5px] font-extrabold opacity-90">
          {s.price === null ? 'No price' : headline}
        </span>
        {!locked && (
          <ChevronDown
            size={16}
            className={`shrink-0 opacity-80 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* ── The alarm strip survives the fold ───────────────────────
          These three are the only things on this card that mean the
          partner is earning nothing and does not know it. Hiding them
          behind a tap would make the collapse a way to not find out. */}
      {(s.price === null || (s.is_active && !dispatchable) || !s.is_active) && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-2">
          {!s.is_active && (
            <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-bold text-ink-mute">
              Hidden by you
            </span>
          )}
          {s.price === null && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
              Guide price missing
            </span>
          )}
          {s.is_active && !dispatchable && (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
              Never offered — fix the work type
            </span>
          )}
        </div>
      )}

      {/* `hidden`, never `{open && …}`. Unmounting would throw away a
          half-typed edit inside anything the body grows later -- the
          lesson Fold.jsx already records. */}
      {/* Everything below the coloured row folds away together: the
          beads, the detail, the reorder arrows and the actions. A
          collapsed card is the row and the alarm strip, nothing else.

          No display utility on this element -- see the note further
          down on why a `flex` class here silently defeats `hidden`. */}
      <div hidden={!open}>
      <StatusBeads state={state} className="px-4 pt-2.5" />

      <div className="px-4 pb-3 pt-2">
        <p className="text-[13.5px] font-extrabold text-royal-700">{describeService(s)}</p>

        {/* The handle a partner had no way to quote. Reading a UUID down
            a phone is not a thing anybody does, so until 115 the only
            way to say WHICH listing was to describe it. select-all so it
            can be copied into a WhatsApp message in one gesture. */}
        {s.listing_code && (
          <p className="mt-0.5 select-all font-mono text-[11px] font-bold text-ink-mute">
            {s.listing_code}
          </p>
        )}

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

        {/* ══════════════════════════════════════════════════════════
            WHAT THE NUMBER IS, SAID ONCE, WHERE IT IS MISSING
            ══════════════════════════════════════════════════════════

            A partner who has left the price blank is usually protecting
            it — they think naming a number publishes it, or ties their
            hands on a job they have not seen. Both are wrong here and
            neither was ever said on this screen.

            So the sentence appears exactly where the gap is, and only
            there: on a card that already has a price it would be noise. */}
        {s.price === null && (
          <p className="mt-2 rounded-xl bg-amber-50/70 px-3 py-2 text-[11.5px] leading-snug text-amber-900">
            <span className="font-extrabold">A guide price is not a quote. </span>
            It is what this work costs you, kept between you and us. Customers
            never see it, and it never decides who is offered a job — it is how
            we price a booking on something real instead of guessing.
          </p>
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
      {/* ── Reordering, out of the header ──────────────────────────
          The arrows lived in the coloured band and cost it a gutter,
          next to a title that truncates. Reordering is rare; it belongs
          beside the other rare actions, not competing with the name.

          They still do NOT use IconButton -- that paints text-gray-500,
          designed for a white row, and this row is white so it would be
          fine here; but keeping them on currentColor means the block
          survives being moved back onto a coloured ground. */}
      {/* No display class on the element carrying `hidden`. The
          attribute sets display:none from the UA sheet and ANY utility
          that sets display -- flex, grid, block -- outranks it, so the
          row stays visible and the collapse silently does nothing.
          Fold.jsx works because its hidden div carries no such class.
          The flex lives on the inner div instead. */}
      <div className="border-t border-ink/[0.06]">
      <div className="flex items-center justify-end gap-1 px-3 py-1.5">
        <span className="mr-auto text-[11px] text-ink-mute">Order</span>
        <button
          type="button" aria-label="Move up" title="Move up"
          disabled={first} onClick={() => onMove(-1)}
          className="rounded-lg p-1.5 text-ink-mute transition hover:bg-ink/[0.05] disabled:opacity-25"
        >
          <ChevronUp size={15} />
        </button>
        <button
          type="button" aria-label="Move down" title="Move down"
          disabled={last} onClick={() => onMove(1)}
          className="rounded-lg p-1.5 text-ink-mute transition hover:bg-ink/[0.05] disabled:opacity-25"
        >
          <ChevronDown size={15} />
        </button>
      </div>
      </div>

      <div className="grid grid-cols-3 border-t border-ink/[0.06] text-[12px] font-extrabold">
        <button
          type="button" onClick={onEdit}
          className="flex items-center justify-center gap-1.5 py-3 text-ink-soft transition active:bg-ink/[0.04]"
        >
          <Pencil size={14} /> Edit
        </button>
        <CardHide s={s} state={state} busy={busy} onToggle={onToggle} />
        <CardDelete busy={busy} onConfirm={onDelete} />
      </div>

      </div>
    </div>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════
 * HIDING IS THE QUIETEST WAY TO STOP EARNING
 * ══════════════════════════════════════════════════════════════════════
 *
 * Hide sat in the middle cell in the same grey as Edit, one tap, no
 * confirmation. Delete — which is recoverable, because the partner still
 * has the trade and can list it again in a minute — took two taps and
 * turned the row red.
 *
 * The weights were backwards. `match_partners()` requires
 * `is_active = TRUE`: the moment this is tapped on a live listing the
 * partner leaves the dispatch pool for that trade, silently, with the
 * card still sitting there looking much as it did. Nothing tells them
 * later. A partner who taps it to "tidy up" their list stops being
 * offered work and has no reason to connect the two.
 *
 * So it warns, and it says the consequence in the words that matter —
 * jobs — rather than in the word the database uses. Showing again is
 * still one tap: putting a confirmation in front of somebody turning
 * their income back ON would be a different kind of stupid.
 */
function CardHide({ s, state, busy, onToggle }) {
  const [armed, setArmed] = useState(false)

  /* Coming back is safe and instant. No arming, no colour. */
  if (!s.is_active) {
    return (
      <button
        type="button" onClick={onToggle} disabled={busy}
        className="flex items-center justify-center gap-1.5 border-x border-ink/[0.06] py-3 text-forest-700 transition active:bg-forest-50 disabled:opacity-50"
      >
        <Eye size={14} /> Show
      </button>
    )
  }

  if (!armed) {
    return (
      <button
        type="button" onClick={() => setArmed(true)} disabled={busy}
        className="flex items-center justify-center gap-1.5 border-x border-ink/[0.06] py-3 text-amber-700 transition active:bg-amber-50 disabled:opacity-50"
      >
        <EyeOff size={14} /> Hide
      </button>
    )
  }

  return (
    <div className="col-span-3 bg-amber-50 px-4 py-3">
      <p className="text-[12.5px] font-extrabold leading-snug text-amber-900">
        {state === 'live'
          ? 'This listing is live. Hiding it stops your jobs.'
          : 'Hide this listing?'}
      </p>
      <p className="mt-1 text-[11.5px] leading-snug text-amber-800">
        {state === 'live'
          ? 'You will stop being offered work for it from the moment you tap Hide — customers looking for this today will not reach you. Nothing else changes, and Show puts it back instantly.'
          : 'It stays on this screen for you, and it will not be offered to anybody. Show puts it back instantly.'}
      </p>
      <div className="mt-2.5 flex items-center justify-end gap-2">
        <button
          type="button" onClick={() => setArmed(false)}
          className="rounded-full px-3 py-1.5 text-[12px] font-extrabold text-amber-900"
        >
          Keep it live
        </button>
        <button
          type="button" disabled={busy}
          onClick={() => { setArmed(false); onToggle() }}
          className="rounded-full bg-amber-600 px-3 py-1.5 text-[12px] font-extrabold text-white disabled:opacity-60"
        >
          Hide anyway
        </button>
      </div>
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
