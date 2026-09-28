/**
 * What the server said about a field, in a shape a form can place.
 *
 * Migration 159 refuses a bad value with SQLSTATE 22023, message
 * 'invalid_field', and a JSON DETAIL of { field, rule, says, table,
 * column }. PostgREST passes that through as `error.code`,
 * `error.message` and `error.details`.
 *
 * Three answers, kept apart because the screen says each differently:
 *
 *   { kind: 'field', field, column, says }   show it under that input
 *   { kind: 'network', says }                nothing reached the server
 *   { kind: 'other', says }                  it did, and said no for
 *                                            another reason
 *
 * The raw Postgres text is never shown: it can carry a value, and a
 * partner learns nothing from "violates check constraint".
 */
export function parseServerError(error) {
  if (!error) return null
  const code = error.code ?? ''
  const message = String(error.message ?? '')

  if (code === '22023' && message === 'invalid_field') {
    try {
      const d = JSON.parse(error.details ?? '{}')
      return { kind: 'field', field: d.field ?? null, column: d.column ?? null, rule: d.rule ?? null,
               says: d.says ?? error.hint ?? 'Please check this value.' }
    } catch {
      return { kind: 'field', field: null, column: null, rule: null, says: error.hint ?? 'Please check this value.' }
    }
  }

  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (offline || /Failed to fetch|NetworkError|Network request failed|Load failed|timeout/i.test(message)) {
    return { kind: 'network', says: 'Could not reach Sambramo. Nothing was saved — check your connection and try again.' }
  }
  return { kind: 'other', says: 'That did not save. Please try again in a moment.' }
}

/**
 * For the save handlers that `throw new Error(error.message)`: keep the
 * structured error on the thrown object so the form can still place it.
 */
export function asFormError(error) {
  const parsed = parseServerError(error)
  const e = new Error(parsed?.says ?? 'That did not save.')
  e.server = parsed
  return e
}
