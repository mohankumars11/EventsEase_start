import { useId, useState } from 'react'
import { AlertCircle, Info } from 'lucide-react'
import { SEVERITY, validateField } from '../../lib/validation/fieldRules'
import { parseServerError } from '../../lib/validation/serverError'

/**
 * ValidatedField's behaviour, for inputs that cannot become one.
 *
 * Most boxes in the app are ValidatedField. Some are not, for good
 * reasons: a price typed inside a pill beside ₹, a date picker, a rate
 * box eighty pixels wide in a grid. Rebuilding those as ValidatedField
 * would change how the screens look, which this work must not do. So
 * the behaviour is lent to them instead:
 *
 *   const price = useFieldCheck('item_price', value, { showAll })
 *   <input {...price.inputProps} className={existing + price.ring} … />
 *   <FieldMessage check={price} />
 *
 * Same timing as ValidatedField: quiet until the box is left once, then
 * live as the partner corrects it; `showAll` (a pressed Save) reveals
 * everything. A `serverError` shows until the value changes.
 */
export function useFieldCheck(field, value, { ctx = {}, showAll = false, serverError = null, testId, name } = {}) {
  const [touched, setTouched] = useState(false)
  const id = useId()

  const result = validateField(field, value ?? '', ctx)
  const show = touched || showAll
  /* A server refusal belongs to the value it refused: the form clears it
     (useServerErrors().clear) as soon as that value is edited, and the
     local rules speak again. */
  const server = serverError || null

  const severity = server ? SEVERITY.ERROR : show ? result.severity : SEVERITY.OK
  const says = server ?? (show ? result.says : null)
  const msgId = `${id}-msg`

  return {
    id, field, result, severity, says, msgId,
    isError: result.severity === SEVERITY.ERROR || !!server,
    ring: severity === SEVERITY.ERROR ? ' ring-2 ring-saffron-400' : '',
    touch: () => setTouched(true),
    inputProps: {
      id,
      'data-field': name ?? field,
      'data-testid': testId ?? `field-${name ?? field}`,
      'aria-invalid': severity === SEVERITY.ERROR ? true : undefined,
      'aria-describedby': says ? msgId : undefined,
      onBlur: () => setTouched(true),
    },
  }
}

export function FieldMessage({ check, className = '' }) {
  if (!check?.says) return null
  const isError = check.severity === SEVERITY.ERROR
  return (
    <span
      id={check.msgId}
      role={isError ? 'alert' : undefined}
      data-field-message={check.field}
      className={`mt-1 flex items-start gap-1.5 text-[11.5px] leading-snug ${isError ? 'text-saffron-800' : 'text-ink-mute'} ${className}`}
    >
      {isError ? <AlertCircle size={12} className="mt-0.5 shrink-0" /> : <Info size={12} className="mt-0.5 shrink-0" />}
      {check.says}
    </span>
  )
}

/**
 * On a refused save: move to the first box that is wrong, so a partner
 * at the bottom of a long form is not left looking at a dead button.
 */
export function focusFirstInvalid(root = typeof document !== 'undefined' ? document : null) {
  const el = root?.querySelector?.('[aria-invalid="true"]')
  if (!el) return false
  el.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  el.focus?.({ preventScroll: true })
  return true
}

/**
 * A drop-in <input> with its check and message, for boxes rendered in a
 * list (a rate per menu, a rate per distance band) where a hook per item
 * is not possible. Every other prop — the existing className included —
 * passes straight through, so the box looks exactly as it did.
 *
 * `messageClassName` places the message when the input sits in a row.
 */
export function CheckedInput({
  field, name, value, onChange, showAll = false, ctx, serverError, messageClassName = '', className = '',
  children, as: Tag = 'input', ...rest
}) {
  const check = useFieldCheck(field, value, { showAll, ctx, serverError, name })
  return (
    <>
      <Tag
        {...rest}
        {...check.inputProps}
        onBlur={e => { check.touch(); rest.onBlur?.(e) }}
        className={className + check.ring}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      />
      {/* What sits after the box in its row ("a plate", "km"), before the
          message, so the message wraps under the whole row. */}
      {children}
      <FieldMessage check={check} className={`basis-full ${messageClassName}`} />
    </>
  )
}

/** Does this value fail its rule outright? For a form's own gate. */
export const fails = (field, value, ctx) => validateField(field, value ?? '', ctx ?? {}).severity === SEVERITY.ERROR

/** True when any of these checks is an error right now. */
export const anyError = (...checks) => checks.some(c => c?.isError)

/**
 * Server refusals for one form, keyed by field id.
 *
 *   const server = useServerErrors()
 *   try { await save() } catch (e) { if (!server.take(e)) setBanner(e.message) }
 *   <ValidatedField serverError={server.errors.business_name} onChange={v => { server.clear('business_name'); … }} />
 *
 * `take` returns true when the error was placed on a field (and moves
 * focus there), false when it is a network or other failure for the
 * form's own banner.
 */
export function useServerErrors() {
  const [errors, setErrors] = useState({})
  return {
    errors,
    clear: field => setErrors(e => (e[field] ? { ...e, [field]: undefined } : e)),
    reset: () => setErrors({}),
    take(e) {
      /* Wrapped by asFormError, or the raw PostgREST error that
         useVendorAccount.updateVendor rethrows as it is. */
      const s = e?.server ?? (e?.code ? parseServerError(e) : null)
      if (s?.kind !== 'field' || !s.field) return false
      setErrors(prev => ({ ...prev, [s.field]: s.says }))
      setTimeout(() => focusFirstInvalid(), 0)
      return true
    },
  }
}
