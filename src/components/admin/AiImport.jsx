import { useState, useRef, useMemo } from 'react'
import {
  Sparkles, Upload, FileText, Globe, ClipboardPaste, Loader2, X, Check,
  AlertTriangle, Trash2, Plus, ShieldCheck, Image as ImageIcon,
} from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { formatINR } from '../../utils/format'
import { importProducts } from '../../lib/productStudio'
import {
  extractProducts, researchProducts, toReviewRows,
  describeFile, checkFile, ACCEPT_ATTR,
} from '../../lib/aiCatalog'
import { Modal } from './ProductStudio'

/**
 * Fill the catalogue from whatever the owner already has.
 *
 * ── The problem this solves ──────────────────────────────────────────────
 * The person running this shop has the catalogue already — in a supplier's
 * PDF, in a photograph of a price list, in a Word document somebody emailed,
 * in their head. What they do not have is the patience to retype three hundred
 * products into a form, and they do not write code, so the usual escape hatch
 * (a script, a CSV massaged in a text editor) is not available to them.
 *
 * So: hand it the file, and it reads it.
 *
 * ── Why there is a review step, and why it is not optional ───────────────
 * The ask was for something that never makes a mistake. Nothing that reads a
 * blurry photograph of handwriting can promise that, and a tool that claims it
 * is more dangerous than one that doesn't — it gets trusted, and the wrong
 * price reaches a customer.
 *
 * What is achievable is making every mistake visible and cheap. So the model
 * never writes to the catalogue. It fills in a table, marks each row with how
 * sure it was and says what it was unsure about, and the rows sit there — fully
 * editable — until a person presses the button. Rows it could not price cannot
 * be imported at all until someone types the number. The model does the typing;
 * the shop owner keeps the decision.
 */

const SOURCES = [
  { id: 'files',    label: 'From a file',        icon: Upload,
    hint: 'A supplier PDF, a photo of a price list, a Word document. It reads all of them.' },
  { id: 'text',     label: 'From pasted text',   icon: ClipboardPaste,
    hint: 'A WhatsApp message, an email, notes — anything with products in it.' },
  { id: 'research', label: 'Find it online',     icon: Globe,
    hint: 'Describe what you want to sell. It searches the web for real items and current prices.' },
]

export default function AiImport({ categories = [], onClose, onDone }) {
  const toast = useToast()
  const fileInput = useRef(null)

  const [source, setSource] = useState('files')
  const [files, setFiles] = useState([])
  const [text, setText] = useState('')
  const [instructions, setInstructions] = useState('')
  const [defaultCategory, setDefaultCategory] = useState(categories[0]?.id ?? '')

  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [rows, setRows] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [importing, setImporting] = useState(false)

  const categoryIds = useMemo(() => categories.map(c => c.id), [categories])

  function addFiles(list) {
    const next = []
    for (const f of Array.from(list)) {
      const problem = checkFile(f)
      if (problem) { toast.error(problem); continue }
      next.push(f)
    }
    if (next.length) setFiles(prev => [...prev, ...next])
  }

  async function run() {
    setBusy(true)
    setProgress('Starting…')
    setRows(null)
    setWarnings([])
    try {
      const result = source === 'research'
        ? await researchProducts({ instructions, categories: categoryIds })
        : await extractProducts({
            files: source === 'files' ? files : [],
            text:  source === 'text' ? text : '',
            instructions,
            categories: categoryIds,
            onProgress: setProgress,
          })

      const reviewed = toReviewRows(result.products ?? [], {
        defaultCategory: defaultCategory || null,
        knownCategories: categoryIds,
      })

      setRows(reviewed)
      setWarnings(result.warnings ?? [])

      if (!reviewed.length) {
        toast.info('Nothing was found in that. Try a clearer file, or say more about what to look for.')
      }
    } catch (err) {
      toast.error(friendlyError(err, 'Could not read that.'))
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  /** Edit one cell, then re-validate that row so the badge tracks the edit. */
  function editRow(line, patch) {
    setRows(prev => prev.map(r => {
      if (r._line !== line) return r
      const next = { ...r, ...patch }
      const errors = []
      if (!next.name?.trim()) errors.push('No name')
      if (!(Number(next.price) > 0)) errors.push('Needs a price')
      if (!next.category) errors.push('No shelf')
      else if (!categoryIds.includes(next.category)) errors.push(`"${next.category}" is not one of your shelves`)
      return { ...next, errors, _edited: true }
    }))
  }

  const ready = rows?.filter(r => !r.errors.length) ?? []
  const blocked = rows?.filter(r => r.errors.length) ?? []

  async function doImport() {
    setImporting(true)
    try {
      const { inserted, failures } = await importProducts(ready)
      if (failures.length) toast.error(`${inserted.length} added; some rows failed: ${failures[0].message}`)
      await onDone(inserted.length)
    } catch (err) {
      toast.error(friendlyError(err, 'Could not add those products.'))
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal title="Fill the catalogue with AI" onClose={onClose} wide>
      <div className="space-y-4">
        {/* The promise this screen makes, stated before anything is uploaded
            rather than discovered afterwards. */}
        <div className="flex items-start gap-3 rounded-xl border border-plum-100 bg-plum-50/50 p-3">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-plum-600" />
          <p className="text-xs leading-relaxed text-plum-900">
            <strong>Nothing is added until you press the button.</strong> Whatever you give it comes
            back as a table you can edit, with a mark on every row saying how sure it was and what it
            wasn't sure about. Anything it couldn't find a price for can't be added until you type one.
          </p>
        </div>

        {!rows && (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              {SOURCES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSource(s.id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    source === s.id
                      ? 'border-plum-500 bg-plum-50'
                      : 'border-gray-200 bg-white hover:border-plum-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <s.icon size={15} className={source === s.id ? 'text-plum-700' : 'text-gray-400'} />
                    <span className={`text-sm font-bold ${source === s.id ? 'text-plum-900' : 'text-gray-700'}`}>
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{s.hint}</p>
                </button>
              ))}
            </div>

            {source === 'files' && (
              <div>
                <div
                  onClick={() => fileInput.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center transition-colors hover:border-plum-400 hover:bg-plum-50/30"
                >
                  <Upload size={26} className="mx-auto text-gray-300" />
                  <p className="mt-2 text-sm font-bold text-gray-700">Drop files here, or click to choose</p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    PDF, photos, Word (.docx), text and CSV · up to 8 MB each
                  </p>
                </div>
                <input
                  ref={fileInput} type="file" multiple accept={ACCEPT_ATTR} className="hidden"
                  onChange={e => { addFiles(e.target.files); e.target.value = '' }}
                />

                {files.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {files.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                        <FileText size={14} className="shrink-0 text-plum-600" />
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-700">{f.name}</span>
                        <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                          {describeFile(f)}
                        </span>
                        <span className="shrink-0 text-[11px] text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                        <button
                          onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                          className="shrink-0 rounded p-1 text-gray-300 hover:text-red-600" aria-label="Remove"
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {source === 'text' && (
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={7}
                placeholder="Paste the message, email or notes here…"
                className="w-full rounded-xl border border-gray-200 p-3 text-sm leading-relaxed focus:border-plum-400 focus:outline-none"
              />
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-gray-700">
                {source === 'research' ? 'What do you want to sell?' : 'Anything it should know? (optional)'}
              </span>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={source === 'research' ? 4 : 2}
                placeholder={
                  source === 'research'
                    ? 'e.g. "Twelve Diwali gift hampers under ₹2000 that a Bengaluru supplier could actually deliver — dry fruits, diyas, sweets, and a couple of premium ones."'
                    : 'e.g. "Only the cakes, skip the beverages" or "prices are per kilo"'
                }
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-plum-400 focus:outline-none"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold text-gray-600">Shelf for anything it can't place:</label>
              <select
                value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-semibold"
              >
                <option value="">— leave blank —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
            </div>

            {source === 'research' && (
              <p className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[11px] leading-relaxed text-amber-900">
                <strong>On the photos.</strong> It won't take pictures off other people's websites — those
                aren't ours to publish. It suggests a search term per product instead, and the studio pulls
                a licensed photo, marked <em>Representative image</em> until you replace it with a
                photograph of the real thing.
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
              <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">
                Cancel
              </button>
              <button
                onClick={run}
                disabled={busy || (source === 'files' && !files.length) || (source === 'text' && !text.trim()) || (source === 'research' && !instructions.trim())}
                className="flex items-center gap-2 rounded-xl bg-plum-600 px-4 py-2 text-sm font-bold text-white hover:bg-plum-700 disabled:opacity-40"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {busy ? (progress || 'Working…') : source === 'research' ? 'Search and suggest' : 'Read it'}
              </button>
            </div>

            {busy && (
              <p className="text-center text-[11px] text-gray-400">
                {source === 'research'
                  ? 'Searching the web and checking prices — this takes up to a minute.'
                  : 'Reading — a long PDF can take half a minute.'}
              </p>
            )}
          </>
        )}

        {rows && (
          <ReviewTable
            rows={rows}
            categories={categories}
            warnings={warnings}
            ready={ready}
            blocked={blocked}
            importing={importing}
            onEdit={editRow}
            onDrop={line => setRows(prev => prev.filter(r => r._line !== line))}
            onBack={() => { setRows(null); setWarnings([]) }}
            onImport={doImport}
          />
        )}
      </div>
    </Modal>
  )
}

/* ── The review table ────────────────────────────────────────────────────
   Every cell is editable, because the most common outcome is not "it was
   wrong" but "it read a price list that didn't print prices" — and typing
   twelve numbers into a table beats retyping twelve products into a form. */

function ReviewTable({ rows, categories, warnings, ready, blocked, importing, onEdit, onDrop, onBack, onImport }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
          {ready.length} ready to add
        </span>
        {blocked.length > 0 && (
          <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
            {blocked.length} need a fix first
          </span>
        )}
        <button onClick={onBack} className="ml-auto text-xs font-semibold text-gray-500 hover:text-plum-700">
          ← Start over
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
            <AlertTriangle size={13} /> What it wants you to know
          </p>
          <ul className="mt-1.5 space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-[11px] leading-relaxed text-amber-900">· {w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="max-h-[52vh] overflow-auto rounded-xl border border-gray-200">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-2 py-2 font-bold">Sure?</th>
              <th className="px-2 py-2 font-bold">Name</th>
              <th className="px-2 py-2 font-bold">Price</th>
              <th className="px-2 py-2 font-bold">Shelf</th>
              <th className="px-2 py-2 font-bold">What it wasn't sure about</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r._line} className={r.errors.length ? 'bg-amber-50/40' : ''}>
                <td className="px-2 py-1.5 align-top">
                  <ConfidenceDot level={r.confidence} edited={r._edited} />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={r.name ?? ''}
                    onChange={e => onEdit(r._line, { name: e.target.value })}
                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-semibold text-gray-800 hover:border-gray-200 focus:border-plum-400 focus:bg-white focus:outline-none"
                  />
                  {r.description && (
                    <p className="mt-0.5 line-clamp-2 px-1 text-[10px] leading-relaxed text-gray-400">{r.description}</p>
                  )}
                  {r.image_query && (
                    <p className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-gray-400">
                      <ImageIcon size={9} /> photo search: “{r.image_query}”
                    </p>
                  )}
                </td>
                <td className="px-2 py-1.5 align-top">
                  <div className="flex items-center gap-0.5">
                    <span className="text-gray-400">₹</span>
                    <input
                      type="number" min="1"
                      value={r.price ?? ''}
                      onChange={e => onEdit(r._line, { price: e.target.value === '' ? undefined : Number(e.target.value) })}
                      placeholder="—"
                      className={`w-20 rounded border px-1 py-0.5 tabular-nums focus:border-plum-400 focus:outline-none ${
                        r.price > 0 ? 'border-transparent bg-transparent hover:border-gray-200 focus:bg-white' : 'border-amber-300 bg-amber-50'
                      }`}
                    />
                  </div>
                  {r.mrp > 0 && <p className="px-1 text-[10px] text-gray-400 line-through">{formatINR(r.mrp)}</p>}
                </td>
                <td className="px-2 py-1.5 align-top">
                  <select
                    value={categories.some(c => c.id === r.category) ? r.category : ''}
                    onChange={e => onEdit(r._line, { category: e.target.value })}
                    className={`rounded border px-1 py-0.5 font-semibold focus:border-plum-400 focus:outline-none ${
                      r.errors.some(e => e.includes('shelf')) ? 'border-amber-300 bg-amber-50' : 'border-transparent bg-transparent hover:border-gray-200'
                    }`}
                  >
                    <option value="">— pick —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5 align-top">
                  {r.errors.length > 0 && (
                    <p className="font-semibold text-amber-700">{r.errors.join(' · ')}</p>
                  )}
                  {r.note && <p className="text-[11px] leading-relaxed text-gray-500">{r.note}</p>}
                  {!r.errors.length && !r.note && <span className="text-gray-300">—</span>}
                </td>
                <td className="px-1 py-1.5 align-top">
                  <button
                    onClick={() => onDrop(r._line)}
                    className="rounded p-1 text-gray-300 hover:text-red-600" aria-label="Drop this row"
                  >
                    <X size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
        <p className="text-[11px] leading-relaxed text-gray-500">
          Rows with a price and a shelf get added. The rest stay here until you fill them in —
          nothing is lost by pressing the button.
        </p>
        <button
          onClick={onImport}
          disabled={importing || !ready.length}
          className="ml-auto flex items-center gap-2 rounded-xl bg-plum-600 px-4 py-2 text-sm font-bold text-white hover:bg-plum-700 disabled:opacity-40"
        >
          {importing ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Add {ready.length} product{ready.length === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  )
}

/**
 * How sure it was, at a glance.
 *
 * An edited row shows as "yours" rather than keeping the model's confidence —
 * once a person has typed in the cell, the model's opinion about it is no
 * longer the interesting fact.
 */
function ConfidenceDot({ level, edited }) {
  if (edited) {
    return (
      <span className="flex items-center gap-1 rounded bg-plum-100 px-1.5 py-0.5 text-[10px] font-bold text-plum-700">
        <Check size={9} strokeWidth={3} /> Yours
      </span>
    )
  }
  const tone = {
    high:   ['bg-emerald-100 text-emerald-700', 'From the source'],
    medium: ['bg-amber-100 text-amber-800',     'Interpreted'],
    low:    ['bg-red-100 text-red-700',         'Guessed — check it'],
  }[level] ?? ['bg-gray-100 text-gray-500', 'Unknown']

  return (
    <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold ${tone[0]}`}>
      {tone[1]}
    </span>
  )
}
