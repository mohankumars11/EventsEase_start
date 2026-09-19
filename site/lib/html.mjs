/**
 * The smallest amount of HTML machinery this site can be built with.
 *
 * No template engine. Pages are functions that return strings, because that
 * is all a static site is, and because an engine's output carries its own
 * attributes and comments — noise in the markup that search and AI crawlers
 * parse, on a site whose entire argument is that the markup is clean.
 */

/** Escape for HTML text content and double-quoted attribute values. */
export function esc(value) {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Mark a string as already-safe HTML so `h` will not escape it again. */
export class Raw { constructor(s) { this.s = s } toString() { return this.s } }
export const raw = s => new Raw(s)

/**
 * Tagged template that escapes every interpolation.
 *
 *   h`<p>${userText}</p>`                    escaped
 *   h`<div>${raw(alreadyRenderedHtml)}</div>` not escaped
 *
 * Arrays are joined with no separator, so `${items.map(renderItem)}` works
 * and each element is escaped unless it is Raw. `null`, `undefined` and
 * `false` render as nothing, which makes `${cond && h`...`}` read correctly.
 */
export function h(strings, ...values) {
  let out = strings[0]
  for (let i = 0; i < values.length; i++) {
    out += render(values[i]) + strings[i + 1]
  }
  return new Raw(out)
}

function render(v) {
  if (v == null || v === false || v === true) return ''
  if (v instanceof Raw) return v.s
  if (Array.isArray(v)) return v.map(render).join('')
  return esc(v)
}

/** Render an attribute only when it has a value: `${attr('title', maybe)}`. */
export const attr = (name, value) =>
  value == null || value === false || value === '' ? raw('') : raw(` ${name}="${esc(value)}"`)

/**
 * Serialise JSON-LD for a <script> block.
 *
 * The `<`, `>` and `&` escapes are not decoration. A description containing
 * "</script>" — or an ampersand, which half the trade names have — ends the
 * script element early and silently breaks the whole graph. Every structured
 * data validator then reports nothing wrong with the part it can still see,
 * which is the worst failure mode available. JSON parsers read < as the
 * character it stands for, so the data is unchanged.
 *
 * Keys with null/undefined values are dropped recursively: schema.org treats
 * an absent property and a null one very differently, and emitting
 * "address": null on a business with no registered address is a claim.
 */
export function jsonld(graph) {
  return new Raw(JSON.stringify(prune(graph))
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026'))
}

function prune(v) {
  if (Array.isArray(v)) {
    const a = v.map(prune).filter(x => x != null)
    return a.length ? a : undefined
  }
  if (v && typeof v === 'object') {
    const o = {}
    for (const [k, val] of Object.entries(v)) {
      const p = prune(val)
      if (p != null) o[k] = p
    }
    return Object.keys(o).length ? o : undefined
  }
  if (v === '' ) return undefined
  return v
}

/** Join with an Oxford-free serial comma: ["a","b","c"] → "a, b and c". */
export function list(items, conj = 'and') {
  const a = items.filter(Boolean)
  if (a.length === 0) return ''
  if (a.length === 1) return a[0]
  return `${a.slice(0, -1).join(', ')} ${conj} ${a[a.length - 1]}`
}
