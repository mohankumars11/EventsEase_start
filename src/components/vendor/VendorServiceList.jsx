import { useState } from 'react'
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Check, X,
  ChevronUp, ChevronDown, Clock, AlertCircle,
} from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { SERVICE_UNITS, UNIT_BY_ID, describeService } from '../../config/vendor'
import { TRADE_FOR_SERVICE } from '../../config/vendor'

/* The trades `match_partners` can match on, read from the same map
   dispatch uses — so this list cannot drift from what actually works.
   A hand-typed copy goes stale the first time a trade is added. */
const DISPATCH_TRADES = [...new Set(Object.values(TRADE_FOR_SERVICE))].sort()

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

/**
 * First-item suggestions, keyed by the categories VendorOnboarding offers.
 *
 * An empty list with a lone "Add item" button is where vendor onboarding dies:
 * the vendor has to invent the shape of the answer before giving one. Three
 * real examples from their own trade turns a blank page into a pick.
 */
const STARTERS = {
  'Catering & Food':      [{ name: 'Veg buffet',        unit: 'per plate' }, { name: 'Non-veg buffet',    unit: 'per plate' }, { name: 'Live chaat counter', unit: 'per event' }],
  'Photography':          [{ name: 'Half-day coverage', unit: 'per event' }, { name: 'Full-day coverage', unit: 'per event' }, { name: 'Candid add-on',      unit: 'per hour'  }],
  'Videography':          [{ name: 'Event film',        unit: 'per event' }, { name: 'Highlight reel',    unit: 'per event' }, { name: 'Drone coverage',     unit: 'per hour'  }],
  'Decoration & Floral':  [{ name: 'Balloon arch',      unit: 'per set'   }, { name: 'Stage backdrop',    unit: 'per event' }, { name: 'Floral centrepiece', unit: 'per piece' }],
  'Venue':                [{ name: 'Hall booking',      unit: 'per day'   }, { name: 'Lawn booking',      unit: 'per day'   }, { name: 'Extra hours',        unit: 'per hour'  }],
  'DJ & Music':           [{ name: 'DJ with setup',     unit: 'per event' }, { name: 'Extra hours',       unit: 'per hour'  }, { name: 'Dance floor lights', unit: 'per event' }],
  'Cake & Desserts':      [{ name: 'Custom cake',       unit: 'per kg'    }, { name: 'Cupcakes',          unit: 'per piece' }, { name: 'Dessert table',      unit: 'per event' }],
  'Bridal Makeup & Hair': [{ name: 'Bridal makeup',     unit: 'per event' }, { name: 'Guest makeup',      unit: 'per person'}, { name: 'Hair styling',       unit: 'per person'}],
  'Mehendi Artist':       [{ name: 'Bridal mehendi',    unit: 'per event' }, { name: 'Guest mehendi',     unit: 'per person'}, { name: 'Simple hands',       unit: 'per person'}],
  'Tent & Furniture':     [{ name: 'Chairs',            unit: 'per piece' }, { name: 'Round tables',      unit: 'per piece' }, { name: 'Shamiana / pandal',  unit: 'per event' }],
}

const DEFAULT_STARTERS = [
  { name: 'Standard package', unit: 'per event' },
  { name: 'Premium package',  unit: 'per event' },
  { name: 'Hourly rate',      unit: 'per hour'  },
]

const BLANK = {
  name: '', category: '', description: '',
  price: '', unit: 'per event', min_quantity: 1, lead_time_days: '',
}

export default function VendorServiceList({ vendor, services, onAdd, onUpdate, onRemove }) {
  const toast = useToast()
  // null = closed, 'new' = the add form, or an id being edited. One at a time:
  // two open forms on a phone is two half-finished items.
  const [editing, setEditing] = useState(null)
  const [busyId,  setBusyId]  = useState(null)

  const starters = STARTERS[vendor?.category] ?? DEFAULT_STARTERS

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
              ? 'Your list is what our coordinators quote from. Nothing here yet.'
              : `${activeCount} live${services.length !== activeCount ? ` · ${services.length - activeCount} hidden` : ''}`}
          </p>
        </div>
        {editing !== 'new' && (
          <button onClick={() => setEditing('new')} className="btn-plum text-sm">
            <Plus size={16} /> Add an item
          </button>
        )}
      </header>

      {editing === 'new' && (
        <ServiceForm
          initial={BLANK}
          vendorCategory={vendor?.category}
          onCancel={() => setEditing(null)}
          onSave={fields => handleSave(fields, 'new')}
        />
      )}

      {services.length === 0 && !editing && (
        <div className="card p-6 sm:p-8 text-center">
          <div className="text-3xl mb-3">🗒️</div>
          <h3 className="font-display font-bold text-gray-900">Start with what you sell most</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Three or four items is plenty to begin with. You can price them now or
            leave a price blank and quote per enquiry.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {starters.map(s => (
              <button
                key={s.name}
                onClick={() => setEditing({ ...BLANK, ...s, category: vendor?.category ?? '' })}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-plum-200 text-plum-700 bg-plum-50 hover:bg-plum-100 transition-colors"
              >
                + {s.name}
              </button>
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
