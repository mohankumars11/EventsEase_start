/**
 * The field lab: every inventoried field, in a real browser, through the
 * real components, with no login and no database.
 *
 * Each field is a ValidatedField (or, for pickers, the same FieldCheck
 * behaviour) bound to its rule from FIELD_INVENTORY, so this page grows
 * with the inventory and cannot drift from it. One Save at the bottom
 * behaves as every screen's save does: it reveals every error and moves
 * to the first. A preview under each box renders the value the way the
 * public profile renders text, which is where an injected tag would run
 * if anything rendered it as HTML.
 *
 * Below the lab, the real More → Bank & payments screen, against a stub
 * server that refuses one value exactly as migration 159 does, so a
 * server refusal can be watched landing under its box.
 */
import React, { useState } from 'react'
import ValidatedField from '../../../src/components/partner/ValidatedField'
import { useFieldCheck, FieldMessage, focusFirstInvalid } from '../../../src/components/partner/FieldCheck'
import PayoutDetails from '../../../src/components/vendor/PayoutDetails'
import { FIELD_INVENTORY } from '../../../src/lib/validation/inventory'
import { validateForm } from '../../../src/lib/validation/fieldRules'

/* ── A stub PostgREST for the Bank screen ──────────────────────────── */
window.__writes = []
const realFetch = window.fetch.bind(window)
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url
  if (!url.startsWith('http://127.0.0.1:9/stub')) return realFetch(input, init)
  const u = new URL(url)
  const json = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } })
  if (u.pathname.endsWith('/vendor_payout_details') && (init.method ?? 'GET') === 'GET') return json(null)
  if (u.pathname.endsWith('/vendor_payout_details')) {
    const body = JSON.parse(init.body ?? '{}')
    window.__writes.push(body)
    /* The trigger's refusal, byte for byte the shape 159 raises. */
    if (String(body.upi_id ?? '').startsWith('refused')) {
      return json({ code: '22023', message: 'invalid_field', hint: 'A UPI id looks like yourname@okhdfcbank.',
        details: JSON.stringify({ field: 'upi_id', rule: 'upi', says: 'The server says: a UPI id looks like yourname@okhdfcbank.',
          table: 'vendor_payout_details', column: 'upi_id' }) }, 400)
    }
    return json({ ...body, verified_at: null })
  }
  return json({ message: 'no stub for ' + u.pathname }, 404)
}

/* Anything an injected payload could do, it would do here. */
window.__xss = 0

const PICKER = { date: 'date', time: 'time' }

function PickerField({ entry, value, onChange, showAll }) {
  const c = useFieldCheck(entry.rule, value, { showAll, name: 'lab_' + entry.id, ctx: entry.ctx ?? {} })
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-extrabold text-ink">{entry.label}</span>
      <input {...c.inputProps} type={PICKER[entry.kind]} value={value}
             onChange={e => onChange(e.target.value)}
             className={'w-full rounded-[14px] bg-white px-3.5 py-3 text-[14px] ring-1 ring-ink/[0.10]' + c.ring} />
      <FieldMessage check={c} />
    </label>
  )
}

export default function FieldLab() {
  const fields = FIELD_INVENTORY.filter(f => f.rule && f.kind !== 'select' && f.kind !== 'slider')
  const [values, setValues] = useState({})
  const [showAll, setShowAll] = useState(false)
  const [saved, setSaved] = useState(null)
  const set = (id, v) => setValues(s => ({ ...s, [id]: v }))

  function save() {
    const r = validateForm(Object.fromEntries(fields
      .filter(f => f.required || (values[f.id] ?? '') !== '')
      .map(f => [f.id, { field: f.rule, value: values[f.id] ?? '', ctx: f.ctx ?? {} }])))
    if (!r.canSave) { setShowAll(true); setSaved(null); setTimeout(() => focusFirstInvalid(), 0); return }
    setSaved(true)
  }

  return (
    <div style={{ width: 412 }} className="space-y-4 p-4" data-testid="field-lab">
      {fields.map(f => (
        <div key={f.id} data-lab-row={f.id}>
          {PICKER[f.kind]
            ? <PickerField entry={f} value={values[f.id] ?? ''} onChange={v => set(f.id, v)} showAll={showAll} />
            : <ValidatedField field={f.rule} name={'lab_' + f.id} value={values[f.id] ?? ''} ctx={f.ctx ?? {}}
                label={f.label} multiline={f.kind === 'prose'} showAll={showAll}
                onChange={v => set(f.id, v)} />}
          {/* Rendered as text, the way every screen renders it. */}
          <p data-preview={f.id} className="mt-1 break-all text-[11px] text-ink-mute">{values[f.id] ?? ''}</p>
        </div>
      ))}
      <button type="button" data-testid="lab-save" onClick={save}
        className="w-full rounded-full bg-plum-600 py-3 text-[14px] font-extrabold text-white">Save</button>
      {saved && <p data-testid="lab-saved">Saved</p>}

      <section data-testid="bank-screen" className="mt-8 rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <PayoutDetails vendorId="00000000-0000-4000-8000-000000000001" onSaved={() => {}} />
      </section>
    </div>
  )
}
