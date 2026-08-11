// The category-agnostic half of the customiser.
//
// Cakes proved the shape of this: a product is not a thing you add, it is a
// thing you specify, and the specification has to reach the kitchen, the
// price, and the cart line's identity. Party decor, pooja kits and gift
// hampers all have the same problem — a balloon arch has a colour theme and
// a "do you install it or do I", a havan kit has a tradition and a pandit,
// a hamper has a tier and an engraved name — so none of that logic should
// live inside a file called cakeCustomizer.
//
// What is shared is everything below: how a group of options is answered,
// what it costs, how the answer is written down, and how two different
// answers stay two different cart lines. What is NOT shared is which groups
// a product gets — that is per category, in the sibling modules.
//
// ── Group types ────────────────────────────────────────────────────────
//   single  radio; exactly one selection, always has a default
//   multi   checkbox capped at `max`; may be empty
//   text    free text capped at `maxLength`
//   info    no input — a fact the customer needs before choosing
//
// ── Group roles ────────────────────────────────────────────────────────
// `role` decides how an answer is written into the order note, and it exists
// so this file never has to know what a "flavour" or a "havan kit" is:
//
//   spec      part of what the item fundamentally IS — joined into one line
//             ("2 kg · Red velvet · Eggless · Heart"). Always recorded, even
//             when it cost nothing, because it is the build instruction.
//   addon     an extra, itemised by name.
//   schedule  when it arrives or is set up; recorded last, on its own line.
//   note      free text, quoted first — it is the thing most often got wrong.
//
// A group with no role is treated as an addon, which is the safe default:
// worst case an extra shows up in the itemised list rather than the spec
// line, and nothing is silently dropped.

export const GROUP_ROLES = ['spec', 'addon', 'schedule', 'note']

export function defaultSelections(groups) {
  const out = {}
  for (const g of groups) {
    if (g.type === 'single') out[g.id] = (g.options.find(o => o.default) ?? g.options[0]).id
    else if (g.type === 'multi') out[g.id] = []
    else if (g.type === 'text') out[g.id] = ''
  }
  return out
}

/**
 * Price and describe a configured product.
 *
 * An option may be `absolute`, meaning it REPLACES the base price rather than
 * adding to it. A cake's weight works that way — the catalogue price is
 * already a price for a specific weight — and so does a hamper's tier and a
 * decor package's size. Treating those as add-ons is how a 2kg cake ends up
 * costing base + 2kg instead of 2kg, so the distinction is carried in the
 * data rather than special-cased per category.
 */
export function computeOrder(product, groups, selections) {
  let base = Number(product.price) || 0
  const lines = []

  const push = (group, label, price, extra = {}) => lines.push({
    groupId: group.id,
    groupLabel: group.label,
    role: group.role ?? 'addon',
    label,
    price,
    ...extra,
  })

  for (const group of groups) {
    if (group.type === 'single') {
      const option = group.options.find(o => o.id === selections[group.id])
      if (!option) continue
      if (option.absolute != null) {
        base = option.absolute
        push(group, option.label, null)
      } else {
        // A ₹0 default still belongs in the summary when it is part of the
        // spec — "Eggless" and "Round" are facts about the order, not silent
        // non-choices.
        push(group, option.label, option.price ?? 0)
      }
    } else if (group.type === 'multi') {
      for (const id of selections[group.id] ?? []) {
        const option = group.options.find(o => o.id === id)
        if (option) push(group, option.label, option.price ?? 0)
      }
    } else if (group.type === 'text') {
      const value = (selections[group.id] ?? '').trim()
      if (value) push(group, value, 0, { isText: true })
    }
  }

  const addOnTotal = lines.reduce((sum, l) => sum + (l.price ?? 0), 0)
  return { base, addOnTotal, unitPrice: base + addOnTotal, lines }
}

/**
 * A stable identity for one configuration.
 *
 * Two products that differ only in one option are two different things to
 * whoever fulfils them and must be two different cart lines — otherwise
 * adding a second, differently-configured item silently overwrites the
 * first. Sorting the multi-select arrays keeps the key stable regardless of
 * the order boxes were ticked in.
 */
export function selectionSignature(selections) {
  const parts = Object.keys(selections).sort().map(key => {
    const value = selections[key]
    if (Array.isArray(value)) return `${key}:${[...value].sort().join('+')}`
    return `${key}:${String(value ?? '').trim()}`
  })
  // Short, stable, and only ever compared for equality — a cheap FNV-style
  // hash is enough, and keeps localStorage cart keys readable.
  let hash = 0
  for (const ch of parts.join('|')) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash.toString(36)
}

/**
 * The configuration as whoever packs the box will read it, for
 * order_items.customization.
 *
 * Human-readable on purpose: the reader is a person, not a parser. Driven
 * entirely off `role`, so adding a category never means editing this.
 */
export function describeSelections(lines) {
  const notes    = lines.filter(l => l.role === 'note')
  const spec     = lines.filter(l => l.role === 'spec').map(l => l.label)
  const addOns   = lines.filter(l => (l.role ?? 'addon') === 'addon')
  const schedule = lines.filter(l => l.role === 'schedule')

  const out = []
  for (const n of notes)  out.push(`${n.groupLabel}: "${n.label}"`)
  if (spec.length)        out.push(spec.join(' · '))
  if (addOns.length)      out.push(`Add-ons: ${addOns.map(a => a.label).join(', ')}`)
  for (const s of schedule) out.push(`${s.groupLabel}: ${s.label}`)
  return out.join('\n')
}

/**
 * The lines worth repeating back on a cart row.
 *
 * The cart shows a compressed version — everything that defines the item,
 * everything that costs money, and anything typed by hand. A ₹0 add-on the
 * customer didn't pick is noise; a ₹0 *spec* choice is not.
 */
export function summaryLines(lines) {
  return lines.filter(l => l.isText || l.price > 0 || l.role === 'spec')
}

/* ── Shared helpers for the per-category builders ───────────────────── */

export const roundTo10 = n => Math.round(n / 10) * 10

/**
 * Turn a tier ladder into `absolute`-priced options, re-based so the tier the
 * product already is costs exactly its catalogue price.
 *
 * Rounding a recomputed price is what turned a ₹1,199 cake into ₹1,200 the
 * moment its sheet opened — a broken promise for one rupee — so the product's
 * own tier is never recomputed at all.
 */
export function scaledOptions({ steps, multipliers, current, price, label, note }) {
  const baseMult = multipliers[current] ?? current
  const ladder = steps.includes(current) ? steps : [...new Set([...steps, current])].sort((a, b) => a - b)

  return ladder.map(step => {
    const value = step === current
      ? price
      : roundTo10(price * ((multipliers[step] ?? step) / baseMult))
    return {
      id: String(step),
      label: label(step),
      note: note?.(step),
      absolute: value,
      price: value - price,
      default: step === current,
    }
  })
}
