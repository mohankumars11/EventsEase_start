import { useId, useState } from 'react'
import { AlertCircle, Check, Info } from 'lucide-react'
import { FIELD_RULES, SEVERITY, validateField } from '../../lib/validation/fieldRules'

/**
 * One text box, and the only place a partner is ever told they are
 * wrong.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHEN THE MESSAGE APPEARS, AND WHY NOT SOONER
 * ══════════════════════════════════════════════════════════════════════
 *
 * Validating on every keystroke means telling somebody their email is
 * invalid while they are still typing the "r" of "ravi". That is the
 * commonest way a correct form feels hostile, and people learn to
 * ignore the red.
 *
 * So: nothing is said until the field has been BLURRED once. After
 * that, it re-checks as they type, because now the message is help —
 * they are fixing something they have been told about, and the error
 * clearing as they correct it is the confirmation they need.
 *
 * `showAll` overrides this. When somebody presses Continue on a step
 * with an empty required field, that field has never been touched and
 * would say nothing at all — the button would simply not work, which is
 * a dead control. Continue sets `showAll` and every problem appears at
 * once.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A WARNING IS NOT AN ERROR AND MUST NOT LOOK LIKE ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 *   error   saffron, an icon, and Continue is blocked
 *   warn    ink, an icon, Continue works — "that is unusual, is it right?"
 *   ok      a tick, only once they have typed something real
 *
 * Red is deliberately absent. Nothing on a setup form is an alarm; it is
 * a correction, and the app's saffron already means "needs attention".
 */

const inputBase =
  'w-full rounded-[14px] border-0 bg-white px-3.5 py-3 text-[14px] text-ink ' +
  'placeholder:text-ink-faint focus:outline-none focus:ring-2'

/* ── A warning gets a NEUTRAL ring ────────────────────────────────────
   These were both saffron, differing only by ring width, and on a
   screenshot at phone size they were indistinguishable: "Hotel 7 Hills"
   looked exactly as broken as a nine-digit phone number. If a partner
   cannot tell at a glance which boxes are stopping them, the severity
   split does no work.

   So the amber ring means one thing and one thing only: this is why
   Continue will not move. A warning is a note in the margin. */
const RING = {
  [SEVERITY.OK]: 'ring-1 ring-ink/[0.10] focus:ring-plum-500',
  [SEVERITY.WARN]: 'ring-1 ring-ink/[0.10] focus:ring-plum-500',
  [SEVERITY.ERROR]: 'ring-2 ring-saffron-400 focus:ring-saffron-500',
}

export default function ValidatedField({
  field,
  value,
  onChange,
  ctx = {},
  showAll = false,
  label,
  hint,
  placeholder,
  multiline = false,
  autoComplete,
  inputMode,
  rows = 4,
  onValidity,
}) {
  const rule = FIELD_RULES[field] ?? {}
  const [touched, setTouched] = useState(false)
  const id = useId()

  const raw = value ?? ''
  const result = validateField(field, raw, ctx)
  const show = (touched || showAll) && String(raw).length >= 0
  const severity = show ? result.severity : SEVERITY.OK

  /* The tick is earned, not default. It appears only once something has
     actually been typed and checked out — a green tick on an empty
     optional box is noise. */
  const settled = show && result.severity === SEVERITY.OK && String(raw).trim().length > 0

  const commit = next => {
    onChange?.(next)
    onValidity?.(validateField(field, next, ctx))
  }

  const Tag = multiline ? 'textarea' : 'input'

  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-extrabold text-ink">
          {label ?? rule.label ?? field}
          {!rule.required && (
            <span className="ml-1.5 font-semibold text-ink-mute">optional</span>
          )}
        </span>
        {rule.max && String(raw).length > rule.max * 0.8 && (
          <span className={`text-[10.5px] tabular-nums ${
            String(raw).length > rule.max ? 'text-saffron-800' : 'text-ink-mute'
          }`}>
            {String(raw).length}/{rule.max}
          </span>
        )}
      </span>

      <span className="relative block">
        <Tag
          id={id}
          className={`${inputBase} ${RING[severity]} ${multiline ? 'min-h-[96px] leading-relaxed' : ''} ${settled ? 'pr-10' : ''}`}
          value={raw}
          rows={multiline ? rows : undefined}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={severity === SEVERITY.ERROR}
          aria-describedby={show && result.says ? `${id}-msg` : undefined}
          onChange={e => commit(e.target.value)}
          onBlur={() => {
            setTouched(true)
            /* Normalise on the way out, not on the way in. Rewriting
               "+91 98450" to "98450" mid-keystroke moves the caret and
               makes the box feel possessed. */
            const cleaned = validateField(field, raw, ctx).value
            if (cleaned !== raw) onChange?.(cleaned)
          }}
        />
        {settled && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-forest-600">
            <Check size={16} strokeWidth={3} />
          </span>
        )}
      </span>

      {show && result.says ? (
        <span
          id={`${id}-msg`}
          role={severity === SEVERITY.ERROR ? 'alert' : undefined}
          className={`mt-1 flex items-start gap-1.5 text-[11.5px] leading-snug ${
            severity === SEVERITY.ERROR ? 'text-saffron-800' : 'text-ink-mute'
          }`}
        >
          {severity === SEVERITY.ERROR
            ? <AlertCircle size={12} className="mt-0.5 shrink-0" />
            : <Info size={12} className="mt-0.5 shrink-0" />}
          {result.says}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-[11.5px] leading-snug text-ink-mute">{hint}</span>
      ) : null}
    </label>
  )
}
