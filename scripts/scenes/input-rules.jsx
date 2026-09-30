/**
 * Every callback a partner can be given, on screen.
 *
 * The rules are proved by `check-partner-input-rules.mjs` — 158 cases in
 * a second, no browser. What that cannot show is whether the message is
 * READABLE: whether saffron on white is legible at 11.5px, whether a
 * two-line message shifts the next field, whether the tick and the
 * counter collide.
 *
 * So this file is the other half. Same component, same rules, rendered
 * at the width a partner actually holds.
 *
 *   node scripts/shoot-components.mjs shots/input-rules.png \
 *     --scenes scripts/scenes/input-rules.jsx --width 390 --wait 1200
 */
import React, { useState } from 'react'
import ValidatedField from '../../src/components/partner/ValidatedField'

/* `showAll` is forced on so every message is visible without the
   harness having to blur each field. That is exactly what Continue
   does, so it is a real state and not a test-only one. */
function Case({ field, initial, label, ctx }) {
  const [v, setV] = useState(initial)
  return (
    <div className="mb-3">
      <ValidatedField
        field={field} value={v} onChange={setV} showAll ctx={ctx} label={label}
      />
    </div>
  )
}

function Group({ title, note, children }) {
  return (
    <section className="mb-6">
      <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
        {title}
      </p>
      {note && <p className="mb-2.5 text-[12px] leading-snug text-ink-soft">{note}</p>}
      {children}
    </section>
  )
}

export default function InputRules() {
  return (
    <div className="mx-auto max-w-[420px] bg-page p-4">
      <Group title="Right thing, wrong box" note="The most useful message on the form.">
        <Case field="business_name" initial="ravi@gmail.com" />
        <Case field="contact_phone" initial="ravi@gmail.com" />
        <Case field="upi_id" initial="9845000000" />
      </Group>

      <Group title="Counted, not just rejected">
        <Case field="contact_phone" initial="984500000" />
        <Case field="contact_phone" initial="98450000001" />
        <Case field="pincode" initial="56000" />
      </Group>

      <Group title="Email" note="Each failure names the part that is wrong.">
        <Case field="contact_email" initial="ravi@gmail" />
        <Case field="contact_email" initial="ravi@gmail.co" />
        <Case field="contact_email" initial="ravi@gmail.com" />
      </Group>

      <Group title="A warning is not an error" note="These all continue.">
        <Case field="business_name" initial="Hotel 7 Hills" />
        <Case field="account_name" initial="Ravi" />
        <Case field="years_active" initial="60" />
      </Group>

      <Group title="Identity, checked by arithmetic">
        <Case field="aadhaar" initial="234567890123" />
        <Case field="pan" initial="ABCXE1234F" />
        <Case field="ifsc" initial="HDFCO001234" />
      </Group>

      <Group title="The one that cannot be undone" note="Typed twice, on purpose.">
        <Case field="account_number" initial="000111224417" />
        <Case
          field="account_number_confirm" initial="000111224999"
          ctx={{ account_number: '000111224417' }}
        />
      </Group>

      <Group title="Contact details in the description" note="Off-platform is unprotected.">
        <Case field="description" initial="Call me on 9845000000 for rates" />
      </Group>
    </div>
  )
}
