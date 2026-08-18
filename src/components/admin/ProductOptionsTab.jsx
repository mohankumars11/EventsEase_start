import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, Trash2, ChevronUp, ChevronDown, Loader2, X, Check, AlertTriangle,
  Save, Layers, Store, Package, Info, GripVertical, Copy,
} from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { formatINR } from '../../utils/format'
import {
  fetchOptionGroups, saveOptionGroup, deleteOptionGroup, reorderOptionGroup,
  OPTION_TEMPLATES, slugify,
} from '../../lib/productOptions'
import { buildOptionGroups } from '../../config/customizers'

/**
 * "What can a customer change about this?" — as a form.
 *
 * ── The thing this screen has to get right ───────────────────────────────
 * The person using it is not a developer, and the single most expensive
 * mistake available here is the difference between an option that ADDS to the
 * price and one that REPLACES it. Get it backwards on a size ladder and a
 * ₹1,200 saree sells for ₹2,400, or a ₹2,400 one sells for ₹1,200, and nobody
 * finds out until an order arrives.
 *
 * So that choice is not a checkbox labelled "absolute". It is two radio
 * buttons with the resulting price printed live underneath — "customer pays
 * ₹1,499" — for every row, from the product's own price. You cannot get it
 * wrong without seeing the wrong number first.
 *
 * ── Three scopes, one editor ─────────────────────────────────────────────
 * A question can belong to this product, to its whole shelf, or to the shop.
 * They are tabs rather than a dropdown on the form, because "am I editing this
 * cake or every cake" is the thing you must not be unsure about while typing.
 * Inherited groups are always visible, greyed, with the scope they came from —
 * otherwise an admin adds "Gift wrap" to a product that already inherits it
 * and the customer gets asked twice.
 */
export default function ProductOptionsTab({ product }) {
  const toast = useToast()
  const [scope, setScope] = useState('product')   // 'product' | 'category' | 'shop'
  const [groups, setGroups] = useState([])
  const [inherited, setInherited] = useState([])
  // `null` until the first read answers. Starting at `true` renders the whole
  // editor for a beat and then replaces it with the migration banner on a
  // database without 053, which reads as the screen crashing; starting at
  // `false` flashes the banner at everyone whose migration IS applied.
  // Neither is known yet, so neither is claimed.
  const [installed, setInstalled] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)     // group object or 'new'
  const [templatesOpen, setTemplatesOpen] = useState(false)

  const scopeArgs = useMemo(() => (
    scope === 'product' ? { productId: product.id }
      : scope === 'category' ? { category: product.category }
        : {}
  ), [scope, product.id, product.category])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const mine = await fetchOptionGroups(scopeArgs)
      setGroups(mine.groups)
      setInstalled(mine.installed)

      // Everything BROADER than the current scope, so the editor can show what
      // is already being asked and stop the admin duplicating it.
      const broader = []
      if (mine.installed) {
        if (scope === 'product') {
          const shelf = await fetchOptionGroups({ category: product.category })
          const shop  = await fetchOptionGroups({})
          broader.push(...shelf.groups.map(g => ({ ...g, _from: 'this shelf' })))
          broader.push(...shop.groups.map(g => ({ ...g, _from: 'the whole shop' })))
        } else if (scope === 'category') {
          const shop = await fetchOptionGroups({})
          broader.push(...shop.groups.map(g => ({ ...g, _from: 'the whole shop' })))
        }
      }
      setInherited(broader)
    } catch (err) {
      toast.error(friendlyError(err, 'Could not load the options.'))
    } finally {
      setLoading(false)
    }
  }, [scopeArgs, scope, product.category, toast])

  useEffect(() => { load() }, [load])

  // The four coded builders. Shown read-only so an admin can see that a cake
  // ALREADY asks for weight and flavour before adding a third size question.
  const codeGroups = useMemo(() => buildOptionGroups(product), [product])

  async function remove(group) {
    if (!confirm(`Remove “${group.label}”? Customers will stop being asked it.`)) return
    try {
      await deleteOptionGroup(group.id)
      toast.success('Removed.')
      await load()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not remove that.'))
    }
  }

  async function applyTemplate(tpl) {
    try {
      await saveOptionGroup(tpl.group, tpl.values, scopeArgs)
      setTemplatesOpen(false)
      await load()
      toast.success(`“${tpl.group.label}” added — open it to set the prices.`)
    } catch (err) {
      toast.error(friendlyError(err, 'Could not add that.'))
    }
  }

  if (installed === null) {
    return (
      <div className="space-y-3">
        {[0, 1].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}
      </div>
    )
  }
  if (!installed) return <OptionsMigrationBanner />

  const overridden = new Set(groups.map(g => g.key))

  return (
    <div className="space-y-4">
      {/* ── Scope ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 p-4">
        <h4 className="text-sm font-extrabold text-plum-950">Who gets asked this?</h4>
        <p className="mt-0.5 text-xs text-gray-500">
          Write it once at the widest level that is true. A question about delivery belongs to
          the whole shop; “blouse piece included?” belongs to one saree.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <ScopeButton
            active={scope === 'product'} onClick={() => setScope('product')}
            icon={Package} label="Only this product" sub={product.name}
          />
          <ScopeButton
            active={scope === 'category'} onClick={() => setScope('category')}
            icon={Layers} label="Everything on this shelf" sub={product.category}
          />
          <ScopeButton
            active={scope === 'shop'} onClick={() => setScope('shop')}
            icon={Store} label="Every product in the shop" sub="All shelves"
          />
        </div>
      </div>

      {/* ── Already asked in code ──────────────────────────────────── */}
      {codeGroups.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
            <Info size={13} /> This product already asks {codeGroups.length} built-in question{codeGroups.length === 1 ? '' : 's'}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {codeGroups.map(g => (
              <span key={g.id} className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                overridden.has(g.id)
                  ? 'bg-plum-100 text-plum-700 line-through decoration-plum-400'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200'
              }`}>
                {g.label}
                {overridden.has(g.id) && <span className="ml-1 no-underline">→ replaced below</span>}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
            Anything you add here appears alongside them. To change one of these instead,
            give your question the same name — <code className="font-mono">{codeGroups[0].id}</code> —
            and yours takes its place.
          </p>
        </div>
      )}

      {/* ── Inherited ─────────────────────────────────────────────── */}
      {inherited.length > 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 p-4">
          <p className="text-xs font-bold text-gray-600">Also asked, from a wider setting</p>
          <div className="mt-2 space-y-1.5">
            {inherited.map(g => (
              <div key={g.id} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px]">{g.key}</span>
                <span className="font-semibold text-gray-700">{g.label}</span>
                <span className="text-gray-400">from {g._from}</span>
                {overridden.has(g.key) && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                    replaced here
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── This scope's groups ────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-extrabold text-plum-950">
          {scope === 'product' ? 'Questions for this product'
            : scope === 'category' ? `Questions for every ${product.category} product`
              : 'Questions for every product'}
        </h4>
        <div className="flex gap-2">
          <button
            onClick={() => setTemplatesOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-plum-200 px-3 py-1.5 text-xs font-semibold text-plum-700 hover:border-plum-400"
          >
            <Copy size={13} /> Start from a template
          </button>
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 rounded-xl bg-plum-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-plum-700"
          >
            <Plus size={13} /> Add a question
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <p className="text-sm font-bold text-gray-700">Nothing asked here yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-500">
            A size, a colour, a wrap, a message, an add-on — anything a customer has to tell
            you before you can make it. Templates below get the shape right; you fill in the
            words and the prices.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((g, i) => (
            <GroupRow
              key={g.id}
              group={g}
              product={product}
              first={i === 0}
              last={i === groups.length - 1}
              onEdit={() => setEditing(g)}
              onDelete={() => remove(g)}
              onUp={async () => setGroups(await reorderOptionGroup(groups, g.id, 'up'))}
              onDown={async () => setGroups(await reorderOptionGroup(groups, g.id, 'down'))}
            />
          ))}
        </div>
      )}

      {templatesOpen && (
        <TemplatePicker onClose={() => setTemplatesOpen(false)} onPick={applyTemplate} />
      )}

      {editing && (
        <GroupEditor
          group={editing === 'new' ? null : editing}
          product={product}
          scopeArgs={scopeArgs}
          scopeLabel={
            scope === 'product' ? product.name
              : scope === 'category' ? `every ${product.category} product`
                : 'every product in the shop'
          }
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load() }}
        />
      )}
    </div>
  )
}

/* ── Scope picker ─────────────────────────────────────────────────────── */

function ScopeButton({ active, onClick, icon: Icon, label, sub }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-w-[9rem] flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors ${
        active ? 'border-plum-600 bg-plum-600 text-white' : 'border-gray-200 bg-white hover:border-plum-300'
      }`}
    >
      <span className={`flex items-center gap-1.5 text-xs font-bold ${active ? 'text-white' : 'text-gray-700'}`}>
        <Icon size={13} /> {label}
      </span>
      <span className={`max-w-[10rem] truncate text-[11px] ${active ? 'text-white/70' : 'text-gray-400'}`}>{sub}</span>
    </button>
  )
}

/* ── One question in the list ─────────────────────────────────────────── */

const TYPE_LABEL = {
  single: 'Pick one',
  multi:  'Pick several',
  text:   'They type it',
  info:   'Just a note',
}

const ROLE_LABEL = {
  spec:     'part of what it is',
  addon:    'an extra',
  schedule: 'when it arrives',
  note:     'a message',
}

function GroupRow({ group, product, first, last, onEdit, onDelete, onUp, onDown }) {
  const values = group.values ?? []
  const base = Number(product.price) || 0

  return (
    <div className="rounded-2xl border border-gray-200 p-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col">
          <button onClick={onUp} disabled={first} aria-label="Move up"
            className="rounded p-0.5 text-gray-300 hover:text-plum-600 disabled:opacity-30">
            <ChevronUp size={14} />
          </button>
          <GripVertical size={13} className="mx-auto text-gray-200" />
          <button onClick={onDown} disabled={last} aria-label="Move down"
            className="rounded p-0.5 text-gray-300 hover:text-plum-600 disabled:opacity-30">
            <ChevronDown size={14} />
          </button>
        </div>

        <button onClick={onEdit} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold text-plum-950">{group.label}</span>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">{group.key}</span>
            <span className="rounded bg-plum-50 px-1.5 py-0.5 text-[10px] font-bold text-plum-700">
              {TYPE_LABEL[group.type]}
            </span>
            <span className="text-[10px] text-gray-400">{ROLE_LABEL[group.role]}</span>
            {group.is_active === false && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">Off</span>
            )}
          </div>
          {group.help && <p className="mt-0.5 text-xs text-gray-500">{group.help}</p>}

          {values.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {values.slice(0, 6).map(v => (
                <span key={v.id} className="rounded-lg bg-gray-50 px-1.5 py-0.5 text-[11px] text-gray-600 ring-1 ring-gray-200">
                  {v.is_default && <span className="mr-1 text-plum-600">●</span>}
                  {v.label}
                  {v.absolute != null
                    ? <span className="ml-1 font-bold text-plum-700">{formatINR(Number(v.absolute))}</span>
                    : Number(v.price) > 0
                      ? <span className="ml-1 font-bold text-plum-700">+{formatINR(Number(v.price))}</span>
                      : null}
                </span>
              ))}
              {values.length > 6 && <span className="text-[11px] text-gray-400">+{values.length - 6} more</span>}
            </div>
          )}

          {/* The cheapest thing this product can be, given this question. It is
              the number the shelf tile prints as "from ₹…", so it is worth
              seeing while setting the prices rather than afterwards. */}
          {values.some(v => v.absolute != null) && (
            <p className="mt-1.5 text-[11px] text-gray-500">
              Cheapest option makes this product{' '}
              <strong className="text-plum-700">
                {formatINR(Math.min(...values.filter(v => v.absolute != null).map(v => Number(v.absolute))))}
              </strong>
              {' '}(catalogue price {formatINR(base)})
            </p>
          )}
        </button>

        <button onClick={onDelete} aria-label="Remove"
          className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

/* ── Templates ────────────────────────────────────────────────────────── */

function TemplatePicker({ onClose, onPick }) {
  return (
    <Sheet title="Start from a template" onClose={onClose}>
      <p className="text-xs leading-relaxed text-gray-500">
        Each one creates a real question you can then edit — the labels, the prices and the
        order are all yours. Nothing is charged until you type a number.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {OPTION_TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => onPick(t)}
            className="rounded-2xl border border-gray-200 p-3 text-left transition-colors hover:border-plum-400 hover:bg-plum-50/40"
          >
            <p className="text-sm font-bold text-plum-950">{t.icon} {t.title}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{t.blurb}</p>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

/* ── The editor ───────────────────────────────────────────────────────── */

function GroupEditor({ group, product, scopeArgs, scopeLabel, onClose, onSaved }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(() => ({
    key: group?.key ?? '',
    label: group?.label ?? '',
    help: group?.help ?? '',
    type: group?.type ?? 'single',
    role: group?.role ?? 'addon',
    max_select: group?.max_select ?? '',
    max_length: group?.max_length ?? 120,
    required: group?.required ?? false,
    sort_order: group?.sort_order ?? 100,
    is_active: group?.is_active !== false,
  }))
  const [values, setValues] = useState(() =>
    (group?.values ?? []).map(v => ({
      key: v.key, label: v.label, note: v.note ?? '',
      price: v.price ?? 0,
      absolute: v.absolute ?? '',
      is_default: v.is_default,
      // The radio the admin actually reasons about. Derived from the data
      // rather than stored, so an imported or templated group opens with the
      // right one already chosen.
      mode: v.absolute != null ? 'absolute' : 'add',
    }))
  )

  const set = patch => setForm(f => ({ ...f, ...patch }))
  const needsValues = form.type === 'single' || form.type === 'multi'
  const base = Number(product.price) || 0

  function setValue(i, patch) {
    setValues(vs => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)))
  }

  function addValue() {
    setValues(vs => [...vs, { key: '', label: '', note: '', price: 0, absolute: '', is_default: vs.length === 0, mode: 'add' }])
  }

  async function save() {
    setBusy(true)
    try {
      await saveOptionGroup(
        form,
        values.map(v => ({
          ...v,
          // One of the two, never both — `computeOrder` checks `absolute` first
          // and would silently ignore a price sitting beside it.
          price:    v.mode === 'absolute' ? 0 : v.price,
          absolute: v.mode === 'absolute' ? v.absolute : null,
        })),
        scopeArgs,
      )
      toast.success('Saved. Customers see it on their next page load.')
      await onSaved()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not save that question.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title={group ? `Edit “${group.label}”` : 'A new question'} onClose={onClose}>
      <p className="rounded-xl bg-plum-50 px-3 py-2 text-[11px] font-semibold text-plum-800">
        Asked of {scopeLabel}.
      </p>

      <div className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Labelled label="What are you asking?" hint="The heading the customer reads">
            <input
              autoFocus value={form.label}
              onChange={e => set({
                label: e.target.value,
                // The slug follows the label until the group has been saved
                // once. After that it is frozen: it is what the cart signature
                // hashes and what a narrower scope overrides by, so changing it
                // silently detaches both.
                key: group ? form.key : slugify(e.target.value),
              })}
              placeholder="e.g. Size, Gift wrapping, Colour"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-plum-400 focus:outline-none"
            />
          </Labelled>
          <Labelled label="Short name" hint={group ? 'Fixed once saved — it links this to carts and overrides' : 'Made from the label; edit if you like'}>
            <input
              value={form.key} disabled={!!group}
              onChange={e => set({ key: slugify(e.target.value) })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 font-mono text-sm disabled:bg-gray-50 disabled:text-gray-500 focus:border-plum-400 focus:outline-none"
            />
          </Labelled>
        </div>

        <Labelled label="Helper line" hint="Optional. Shown under the heading — or inside the box, for a typed answer">
          <input
            value={form.help} onChange={e => set({ help: e.target.value })}
            placeholder="e.g. Leave blank for none"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-plum-400 focus:outline-none"
          />
        </Labelled>

        <div>
          <p className="mb-1 text-xs font-bold text-gray-700">How do they answer it?</p>
          <div className="grid gap-1.5 sm:grid-cols-4">
            {[
              ['single', 'Pick one', 'Radio buttons'],
              ['multi',  'Pick several', 'Tick boxes'],
              ['text',   'They type it', 'A message'],
              ['info',   'Just a note', 'Nothing to answer'],
            ].map(([id, label, sub]) => (
              <button
                key={id} onClick={() => set({ type: id })}
                className={`rounded-xl border px-2.5 py-2 text-left transition-colors ${
                  form.type === id ? 'border-plum-600 bg-plum-600 text-white' : 'border-gray-200 hover:border-plum-300'
                }`}
              >
                <span className="block text-xs font-bold">{label}</span>
                <span className={`block text-[10px] ${form.type === id ? 'text-white/70' : 'text-gray-400'}`}>{sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-bold text-gray-700">
            How should the answer reach whoever makes it?
          </p>
          <div className="grid gap-1.5 sm:grid-cols-4">
            {[
              ['spec',     'Part of what it is', '“2 kg · Eggless”'],
              ['addon',    'An extra', 'Itemised by name'],
              ['schedule', 'When it arrives', 'Its own line'],
              ['note',     'A message', 'Quoted first'],
            ].map(([id, label, sub]) => (
              <button
                key={id} onClick={() => set({ role: id })}
                className={`rounded-xl border px-2.5 py-2 text-left transition-colors ${
                  form.role === id ? 'border-plum-600 bg-plum-600 text-white' : 'border-gray-200 hover:border-plum-300'
                }`}
              >
                <span className="block text-xs font-bold">{label}</span>
                <span className={`block text-[10px] ${form.role === id ? 'text-white/70' : 'text-gray-400'}`}>{sub}</span>
              </button>
            ))}
          </div>
        </div>

        {form.type === 'multi' && (
          <Labelled label="Most they can tick" hint="Leave blank for no limit">
            <input
              type="number" min="1" value={form.max_select}
              onChange={e => set({ max_select: e.target.value })}
              className="w-28 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-plum-400 focus:outline-none"
            />
          </Labelled>
        )}

        {form.type === 'text' && (
          <Labelled label="Longest they can type" hint="Characters. A cake message is usually 40–60.">
            <input
              type="number" min="10" value={form.max_length}
              onChange={e => set({ max_length: e.target.value })}
              className="w-28 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-plum-400 focus:outline-none"
            />
          </Labelled>
        )}

        {/* ── The answers ────────────────────────────────────────── */}
        {needsValues && (
          <div className="rounded-2xl border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-700">The choices</p>
              <button onClick={addValue}
                className="flex items-center gap-1 rounded-lg border border-plum-200 px-2 py-1 text-[11px] font-bold text-plum-700 hover:border-plum-400">
                <Plus size={12} /> Add a choice
              </button>
            </div>

            {values.length === 0 ? (
              <p className="mt-3 text-center text-xs text-gray-400">No choices yet — add at least one.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {values.map((v, i) => (
                  <ValueRow
                    key={i}
                    value={v}
                    index={i}
                    base={base}
                    isSingle={form.type === 'single'}
                    onChange={patch => setValue(i, patch)}
                    onDefault={() => setValues(vs => vs.map((x, j) => ({ ...x, is_default: j === i })))}
                    onRemove={() => setValues(vs => vs.filter((_, j) => j !== i))}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.is_active}
            onChange={e => set({ is_active: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-plum-600" />
          <span className="text-xs font-semibold text-gray-700">Ask this question</span>
          <span className="text-[11px] text-gray-400">Untick to hide it without deleting it</span>
        </label>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3">
        <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={busy || !form.label.trim() || (needsValues && values.filter(v => v.label.trim()).length === 0)}
          className="flex items-center gap-2 rounded-xl bg-plum-600 px-4 py-2 text-sm font-bold text-white hover:bg-plum-700 disabled:opacity-40"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
        </button>
      </div>
    </Sheet>
  )
}

/**
 * One choice, and the one control on this screen that can cost real money.
 *
 * "Adds to the price" vs "Is the price" is two radio buttons rather than a
 * checkbox called `absolute`, and the resulting number is printed under both
 * of them from the product's own price. An admin building a size ladder sees
 * "customer pays ₹2,400" before they save, which is the only reliable way to
 * catch the inverted case.
 */
function ValueRow({ value: v, index, base, isSingle, onChange, onDefault, onRemove }) {
  const resulting = v.mode === 'absolute'
    ? Number(v.absolute || 0)
    : base + Number(v.price || 0)

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-2.5">
      <div className="flex items-center gap-2">
        {isSingle && (
          <button
            onClick={onDefault}
            title="Chosen by default"
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
              v.is_default ? 'border-plum-600 bg-plum-600 text-white' : 'border-gray-300 bg-white hover:border-plum-400'
            }`}
          >
            {v.is_default && <Check size={11} strokeWidth={3} />}
          </button>
        )}
        <input
          value={v.label}
          onChange={e => onChange({ label: e.target.value, key: v.key || slugify(e.target.value) })}
          placeholder={`Choice ${index + 1} — e.g. "2 kg", "Premium fabric wrap"`}
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-plum-400 focus:outline-none"
        />
        <button onClick={onRemove} aria-label="Remove choice"
          className="rounded-lg p-1 text-gray-300 hover:bg-red-50 hover:text-red-600">
          <Trash2 size={14} />
        </button>
      </div>

      <input
        value={v.note}
        onChange={e => onChange({ note: e.target.value })}
        placeholder="Optional line underneath — what makes this one different"
        className="mt-1.5 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:border-plum-400 focus:outline-none"
      />

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-gray-200">
          <button
            onClick={() => onChange({ mode: 'add' })}
            className={`px-2 py-1 text-[11px] font-bold ${v.mode === 'add' ? 'bg-plum-600 text-white' : 'bg-white text-gray-600'}`}
          >
            Adds to the price
          </button>
          <button
            onClick={() => onChange({ mode: 'absolute' })}
            className={`px-2 py-1 text-[11px] font-bold ${v.mode === 'absolute' ? 'bg-plum-600 text-white' : 'bg-white text-gray-600'}`}
          >
            Is the price
          </button>
        </div>

        {v.mode === 'absolute' ? (
          <input
            type="number" min="0" value={v.absolute}
            onChange={e => onChange({ absolute: e.target.value })}
            placeholder="₹ total"
            className="w-28 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-plum-400 focus:outline-none"
          />
        ) : (
          <input
            type="number" value={v.price}
            onChange={e => onChange({ price: e.target.value })}
            placeholder="+ ₹0"
            className="w-28 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-plum-400 focus:outline-none"
          />
        )}

        <span className="text-[11px] font-semibold text-gray-500">
          Customer pays{' '}
          <strong className={resulting < 0 ? 'text-red-600' : 'text-plum-700'}>
            {formatINR(Math.max(0, resulting))}
          </strong>
          {v.mode === 'add' && Number(v.price || 0) === 0 && <span className="text-gray-400"> (no change)</span>}
        </span>
      </div>
    </div>
  )
}

/* ── Shared ───────────────────────────────────────────────────────────── */

function Labelled({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-gray-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-gray-400">{hint}</span>}
    </label>
  )
}

function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-plum-950/40 backdrop-blur-sm sm:items-center sm:p-6"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-3.5 backdrop-blur">
          <h3 className="text-base font-extrabold text-plum-950">{title}</h3>
          <button onClick={onClose} aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function OptionsMigrationBanner() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
        <div className="text-sm">
          <p className="font-bold text-amber-900">Customisations need one file run once</p>
          <p className="mt-1 leading-relaxed text-amber-800">
            Open the Supabase dashboard → SQL Editor, paste{' '}
            <code className="rounded bg-amber-100 px-1 font-mono text-xs">supabase/migrations/053_product_options.sql</code>,
            and run it. Until then products customise exactly as they do today, from the
            built-in builders — nothing is broken, this editor simply has nowhere to save to.
          </p>
        </div>
      </div>
    </div>
  )
}
