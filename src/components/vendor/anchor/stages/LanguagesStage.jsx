/**
 * Stage 4 · Languages & styles.
 *
 * Each language carries how well they can hold a whole event in it. Styles
 * help customers choose; on their own they never change a price.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Trash2, Search } from 'lucide-react'
import { Card, Label, TextField, Chip, ChipRow, Segmented, Sheet, SectionTitle } from '../ui'
import { LANGUAGES_V3, PROFICIENCY_V3, STYLES_V3 } from '../options'

export default function LanguagesStage({ value, set }) {
  const v = value ?? {}
  const langs = v.languages ?? []
  const [sheet, setSheet] = useState(false)
  const [q, setQ] = useState('')
  const has = name => langs.some(l => l.name.toLowerCase() === name.toLowerCase())
  const add = name => { if (!has(name)) set({ ...v, languages: [...langs, { name, level: 'fluent' }] }); setSheet(false); setQ('') }
  const list = LANGUAGES_V3.filter(l => !has(l) && l.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <>
      <SectionTitle title="Languages & style" sub="Customers filter on language first." />

      <Card>
        <Label required hint="Only languages you can host a whole event in.">Languages you host in</Label>
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {langs.map((l, i) => (
              <motion.div key={l.name} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
                className="rounded-2xl bg-[#faf9fd] p-3 ring-1 ring-ink/[0.05]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[14px] font-extrabold text-ink">{l.name}</span>
                  <button type="button" aria-label={`Remove ${l.name}`} onClick={() => set({ ...v, languages: langs.filter((_, j) => j !== i) })}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink/35"><Trash2 size={15} /></button>
                </div>
                <Segmented id={`lv-${l.name}`} options={PROFICIENCY_V3} value={l.level}
                  onChange={lv => set({ ...v, languages: langs.map((x, j) => j === i ? { ...x, level: lv } : x) })} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <button type="button" onClick={() => setSheet(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-plum-200 py-3 text-[13px] font-extrabold text-plum-700">
          <Plus size={16} /> Add language
        </button>
      </Card>

      <Card className="mt-3">
        <Label required right={`${(v.styles ?? []).length}/3`} hint="Pick up to three.">Your strongest hosting styles</Label>
        <ChipRow multi max={3} size="sm" options={STYLES_V3} value={v.styles ?? []} onChange={x => set({ ...v, styles: x })} />
        <div className="mt-3"><TextField value={v.style_other} onChange={x => set({ ...v, style_other: x })} placeholder="Other style (optional)" max={40} /></div>
      </Card>

      <Sheet open={sheet} onOpenChange={setSheet} title="Add a language">
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[#f7f6fb] px-3.5 ring-1 ring-ink/[0.06]">
          <Search size={16} className="text-ink/40" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search or type a language"
            className="h-[46px] w-full bg-transparent text-[14px] font-semibold outline-none" />
        </div>
        <div className="flex flex-wrap gap-2">
          {list.map(l => <Chip key={l} onClick={() => add(l)}>{l}</Chip>)}
          {q.trim().length > 1 && !LANGUAGES_V3.some(l => l.toLowerCase() === q.trim().toLowerCase()) && !has(q.trim()) && (
            <Chip on onClick={() => add(q.trim())}>Add “{q.trim()}”</Chip>
          )}
        </div>
      </Sheet>
    </>
  )
}

export const languagesDone = v => (v?.languages?.length ?? 0) > 0 && ((v?.styles?.length ?? 0) > 0 || !!v?.style_other?.trim())
