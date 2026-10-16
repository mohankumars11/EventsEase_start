/**
 * The trade's own list — menus, cakes, rental items, vehicles, spaces,
 * ceremonies, packages — edited one item at a time in a bottom sheet.
 *
 * Each item's answers are the trade file's `catalogue.fields`. The payload
 * (./payload.js) reads its name, price, stock and limits from them; every
 * other answer travels as the item's attributes.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { Card, Sheet, SectionTitle } from '../anchor/ui'
import QuestionRenderer, { questionsDone } from './QuestionRenderer'
import { itemName, itemPricePaise } from './payload'

const rupees = p => `₹${Math.round(Number(p) / 100).toLocaleString('en-IN')}`

export const catalogueDone = (cat, items) => !cat || ((items ?? []).length >= (cat.min ?? 1)
  && items.every(it => questionsDone(cat.fields, it.answers)))

export default function CatalogueEditor({ cat, items = [], set, trade, tried }) {
  const [open, setOpen] = useState(null)      // index being edited, or 'new'
  const [draft, setDraft] = useState({})
  const [triedItem, setTriedItem] = useState(false)

  const start = i => { setOpen(i); setDraft(i === 'new' ? {} : items[i].answers); setTriedItem(false) }
  function save() {
    if (!questionsDone(cat.fields, draft)) { setTriedItem(true); return }
    if (open === 'new') set([...items, { item_key: `${cat.key}_${Date.now().toString(36)}`, answers: draft }])
    else set(items.map((it, i) => (i === open ? { ...it, answers: draft } : it)))
    setOpen(null)
  }
  const remove = i => set(items.filter((_, j) => j !== i))

  return (
    <>
      <SectionTitle title={cat.title} sub={cat.sub ?? `Add each ${cat.noun} customers can book. You can add more any time.`} />
      <AnimatePresence initial={false}>
        {items.map((it, i) => {
          const ok = questionsDone(cat.fields, it.answers)
          const price = itemPricePaise(cat, it.answers)
          return (
            <motion.div key={it.item_key} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
              <Card className={`mt-3 ${tried && !ok ? 'ring-2 ring-rose-300' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-plum-50 text-plum-700"><Package size={19} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-extrabold text-ink">{itemName(cat, it.answers) || `Unnamed ${cat.noun}`}</p>
                    <p className="text-[12px] font-bold text-ink/50">
                      {price ? `${rupees(price)} you earn` : 'No price yet'}{!ok && ' · needs details'}
                    </p>
                  </div>
                  <button type="button" aria-label="Edit" onClick={() => start(i)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f2f9] text-plum-700"><Pencil size={15} /></button>
                  <button type="button" aria-label="Remove" onClick={() => remove(i)} className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 size={15} /></button>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </AnimatePresence>

      <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => start('new')}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-plum-300 bg-white py-4 text-[14px] font-extrabold text-plum-700">
        <Plus size={17} /> Add {items.length ? 'another' : 'a'} {cat.noun}
      </motion.button>
      {tried && items.length < (cat.min ?? 1) && (
        <p className="mt-2 text-center text-[12px] font-bold text-rose-600">Add at least {cat.min ?? 1} {cat.min > 1 ? cat.nounPlural : cat.noun}.</p>
      )}

      <Sheet open={open !== null} onOpenChange={o => { if (!o) setOpen(null) }} title={open === 'new' ? `New ${cat.noun}` : `Edit ${cat.noun}`}>
        <QuestionRenderer questions={cat.fields} answers={draft} set={setDraft} trade={trade} tried={triedItem} />
        <button type="button" onClick={save}
          className="mt-4 h-[52px] w-full rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15px] font-extrabold text-white">
          Save {cat.noun}
        </button>
      </Sheet>
    </>
  )
}
