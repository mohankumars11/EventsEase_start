import { useState } from 'react'
import { Plus, Pencil, Trash2, Users, Snowflake, Loader2, Check, X } from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { saveSpace, removeSpace } from '../../lib/venues'

/**
 * The halls inside one venue.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A HALL IS ITS OWN ROW
 * ══════════════════════════════════════════════════════════════════════
 *
 * A property with a boardroom, a cluster banquet and a grand ballroom is
 * three products with three capacities, three prices and three calendars.
 * `vendor_availability` gives it one row per day, so the schema could not
 * say the ballroom was gone and the boardroom was free.
 *
 * A venue with a single hall still gets a row here. It costs a join, and
 * the alternative is discovering the shape is wrong on the day a hotel
 * signs up.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TWO CAPACITIES, BECAUSE THEY ARE DIFFERENT NUMBERS
 * ══════════════════════════════════════════════════════════════════════
 *
 * A hall that seats 300 for a banana-leaf lunch holds 800 standing at a
 * reception. Customers ask with whichever number is in their head, and
 * quoting one figure for both is how somebody arrives to a room that does
 * not fit their guests — a complaint no refund fixes, because the event
 * has already happened.
 */

const FLOOR_TYPES = [
  { id: 'marble',   label: 'Marble or polished' },
  { id: 'carpeted', label: 'Carpeted' },
  { id: 'concrete', label: 'Plain concrete' },
  { id: 'grass',    label: 'Grass or turf' },
]

const blank = venueId => ({
  venue_id: venueId,
  space_name: '',
  floating_capacity: '',
  seated_capacity: '',
  is_ac: null,
  has_stage: null,
  floor_type: '',
  is_active: true,
})

export default function VenueSpaces({ venue, onChanged }) {
  const toast = useToast()
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)

  const spaces = [...(venue.spaces ?? [])].sort((a, b) => a.sort_order - b.sort_order)

  async function save(space) {
    setBusy(true)
    try {
      await saveSpace({
        ...space,
        /* Empty string is what an untouched number input gives, and it is
           not zero — a hall with no stated capacity should read as
           unknown, not as a hall that holds nobody. */
        floating_capacity: space.floating_capacity === '' ? null : Number(space.floating_capacity),
        seated_capacity:   space.seated_capacity   === '' ? null : Number(space.seated_capacity),
        floor_type: space.floor_type || null,
      })
      setEditing(null)
      await onChanged?.()
      toast.success('Saved.')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  async function remove(space) {
    /* Deleting a hall deletes its calendar with it. A manager tidying up
       must not silently un-block dates they closed months ago. */
    if (!confirm(`Remove ${space.space_name}? Its calendar goes too.`)) return
    setBusy(true)
    try {
      await removeSpace(space.id)
      await onChanged?.()
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2.5">
      {spaces.map(s => (
        editing?.id === s.id
          ? <SpaceForm key={s.id} value={editing} onChange={setEditing}
                       onSave={save} onCancel={() => setEditing(null)} busy={busy} />
          : (
            <div key={s.id} className="rounded-[18px] bg-white p-3.5 ring-1 ring-ink/[0.06]">
              <div className="flex items-start gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-extrabold text-ink">{s.space_name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-soft">
                    {s.floating_capacity != null && (
                      <span className="inline-flex items-center gap-1">
                        <Users size={12} /> {s.floating_capacity} standing
                      </span>
                    )}
                    {s.seated_capacity != null && <span>{s.seated_capacity} seated</span>}
                    {s.is_ac === true && (
                      <span className="inline-flex items-center gap-1"><Snowflake size={12} /> AC</span>
                    )}
                  </span>
                </span>
                <button type="button" onClick={() => setEditing(s)} aria-label={`Edit ${s.space_name}`}
                        className="shrink-0 rounded-full p-1.5 text-ink-mute hover:bg-ink/[0.04]">
                  <Pencil size={15} />
                </button>
                <button type="button" onClick={() => remove(s)} aria-label={`Remove ${s.space_name}`}
                        className="shrink-0 rounded-full p-1.5 text-ink-mute hover:bg-rose-50 hover:text-rose-700">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          )
      ))}

      {editing && !editing.id && (
        <SpaceForm value={editing} onChange={setEditing}
                   onSave={save} onCancel={() => setEditing(null)} busy={busy} />
      )}

      {!editing && (
        <button
          type="button"
          onClick={() => setEditing(blank(venue.id))}
          className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-saffron-400/12 py-3 text-[13.5px] font-extrabold text-ink ring-1 ring-saffron-300/60"
        >
          <Plus size={15} /> {spaces.length ? 'Add another hall' : 'Add your first hall'}
        </button>
      )}

      {!spaces.length && !editing && (
        <p className="rounded-[18px] bg-ink/[0.02] p-4 text-center text-[12.5px] leading-relaxed text-ink-mute">
          Until there is at least one hall here, customers cannot see this
          venue — there is nothing for them to book.
        </p>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */

function SpaceForm({ value, onChange, onSave, onCancel, busy }) {
  const set = (k, v) => onChange({ ...value, [k]: v })

  return (
    <div className="rounded-[18px] bg-white p-4 ring-1 ring-saffron-300/70">
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-[0.06em] text-ink-mute">
          Hall name
        </span>
        <input
          value={value.space_name}
          onChange={e => set('space_name', e.target.value)}
          placeholder="Grand Ballroom"
          className="w-full rounded-2xl bg-white px-4 py-2.5 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Num label="Standing" hint="Reception" value={value.floating_capacity}
             onChange={v => set('floating_capacity', v)} />
        <Num label="Seated" hint="Sit-down meal" value={value.seated_capacity}
             onChange={v => set('seated_capacity', v)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Tri label="Air conditioned" value={value.is_ac} onChange={v => set('is_ac', v)} />
        <Tri label="Has a stage" value={value.has_stage} onChange={v => set('has_stage', v)} />
      </div>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-[0.06em] text-ink-mute">
          Floor
        </span>
        <select
          value={value.floor_type ?? ''}
          onChange={e => set('floor_type', e.target.value)}
          className="w-full rounded-2xl bg-white px-4 py-2.5 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.08]"
        >
          <option value="">Not saying</option>
          {FLOOR_TYPES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </label>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onCancel}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white py-2.5 text-[13px] font-extrabold text-ink-mute ring-1 ring-ink/[0.08]">
          <X size={14} /> Cancel
        </button>
        <button type="button" onClick={() => onSave(value)} disabled={busy || !value.space_name.trim()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-saffron-400 py-2.5 text-[13px] font-extrabold text-plum-950 disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
        </button>
      </div>
    </div>
  )
}

function Num({ label, hint, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-[0.06em] text-ink-mute">
        {label}
      </span>
      <input
        value={value ?? ''}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 5))}
        inputMode="numeric"
        placeholder={hint}
        className="w-full rounded-2xl bg-white px-3.5 py-2.5 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.08] placeholder:text-[12px] placeholder:font-normal placeholder:text-ink-mute"
      />
    </label>
  )
}

/* Three states, not two.
   A checkbox cannot tell "no AC" from "has not said", and a customer
   filtering for an air-conditioned hall would silently lose every venue
   that simply never answered. */
function Tri({ label, value, onChange }) {
  const opts = [{ v: true, t: 'Yes' }, { v: false, t: 'No' }, { v: null, t: '—' }]
  return (
    <div>
      <span className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-[0.06em] text-ink-mute">
        {label}
      </span>
      <div className="flex overflow-hidden rounded-2xl ring-1 ring-ink/[0.08]">
        {opts.map(o => (
          <button
            key={String(o.v)} type="button" onClick={() => onChange(o.v)}
            className={`flex-1 py-2.5 text-[12.5px] font-extrabold transition ${
              value === o.v ? 'bg-saffron-400 text-plum-950' : 'bg-white text-ink-mute'
            }`}
          >
            {o.t}
          </button>
        ))}
      </div>
    </div>
  )
}
