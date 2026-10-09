/**
 * Stage 3 · Experience & events.
 *
 * What they host, how many people, and in what setting. A custom event
 * type is saved for review exactly as typed; it does not become a
 * bookable category on its own.
 */
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Search } from 'lucide-react'
import { Card, Label, TextField, Chip, ChipRow, Sheet, SectionTitle } from '../ui'
import { EVENT_GROUPS_V3, AUDIENCE, FORMATS } from '../options'

export default function EventsStage({ value, set }) {
  const v = value ?? {}
  const events = v.events ?? []
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(['weddings', 'corporate'])
  const [otherFor, setOtherFor] = useState(null)
  const [otherText, setOtherText] = useState('')
  const toggle = id => set({ ...v, events: events.includes(id) ? events.filter(x => x !== id) : [...events, id] })

  const groups = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return EVENT_GROUPS_V3
    return EVENT_GROUPS_V3.map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(t)) })).filter(g => g.items.length)
  }, [q])

  return (
    <>
      <SectionTitle title="Which events do you host?" sub="Pick all that apply. Customers only see you for these." />

      <Card>
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[#f7f6fb] px-3.5 ring-1 ring-ink/[0.06]">
          <Search size={16} className="text-ink/40" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search events"
            className="h-[46px] w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-ink/30" />
        </div>
        <div className="space-y-2">
          {groups.map(g => {
            const isOpen = q.trim() || open.includes(g.id)
            const n = g.items.filter(i => events.includes(i.id)).length + (v.events_other?.[g.id]?.length ?? 0)
            return (
              <div key={g.id} className="overflow-hidden rounded-2xl bg-[#faf9fd] ring-1 ring-ink/[0.05]">
                <button type="button" onClick={() => setOpen(o => o.includes(g.id) ? o.filter(x => x !== g.id) : [...o, g.id])}
                  className="flex w-full items-center justify-between px-3.5 py-3">
                  <span className="text-[13.5px] font-extrabold text-plum-800">{g.label}</span>
                  <span className="flex items-center gap-2">
                    {n > 0 && <span className="rounded-full bg-plum-700 px-2 py-0.5 text-[11px] font-extrabold text-white">{n}</span>}
                    <motion.span animate={{ rotate: isOpen ? 45 : 0 }} className="text-ink/40"><Plus size={18} /></motion.span>
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="flex flex-wrap gap-2 px-3.5 pb-3.5">
                        {g.items.map(i => <Chip key={i.id} size="sm" on={events.includes(i.id)} onClick={() => toggle(i.id)}>{i.label}</Chip>)}
                        {(v.events_other?.[g.id] ?? []).map(t => (
                          <Chip key={t} size="sm" on onClick={() => set({ ...v, events_other: { ...v.events_other, [g.id]: v.events_other[g.id].filter(x => x !== t) } })}>{t}</Chip>
                        ))}
                        <button type="button" onClick={() => { setOtherText(''); setOtherFor(g.id) }}
                          className="rounded-full border border-dashed border-plum-300 px-3 py-1.5 text-[12.5px] font-bold text-plum-700">+ Other</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="mt-3">
        <Label required hint="The largest crowd you comfortably hold. Bigger events come to you as a custom quote.">How many guests can you host?</Label>
        <ChipRow size="sm" options={AUDIENCE.map(a => a.id)} value={v.audience} format={id => AUDIENCE.find(a => a.id === id).label}
          onChange={x => set({ ...v, audience: x, max_audience: AUDIENCE.find(a => a.id === x)?.max ?? v.max_audience })} />
        {v.audience === 'custom' && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <TextField inputMode="numeric" value={v.min_audience} placeholder="Minimum" onChange={x => set({ ...v, min_audience: x.replace(/\D/g, '') })} />
            <TextField inputMode="numeric" value={v.max_audience} placeholder="Maximum" onChange={x => set({ ...v, max_audience: x.replace(/\D/g, '') })} />
          </div>
        )}
      </Card>

      <Card className="mt-3">
        <Label required>Where do you host?</Label>
        <ChipRow multi size="sm" options={FORMATS} value={v.formats ?? []} onChange={x => set({ ...v, formats: x })} />
      </Card>

      <Sheet open={!!otherFor} onOpenChange={o => !o && setOtherFor(null)} title="Add another event type">
        <p className="mb-2 text-[12px] text-ink/55">We review new event types before customers can book them.</p>
        <div className="flex gap-2">
          <div className="flex-1"><TextField value={otherText} onChange={setOtherText} placeholder="Type the event" max={40} /></div>
          <button type="button" disabled={otherText.trim().length < 2} onClick={() => {
            const cur = v.events_other?.[otherFor] ?? []
            const t = otherText.trim()
            if (!cur.includes(t)) set({ ...v, events_other: { ...(v.events_other ?? {}), [otherFor]: [...cur, t] } })
            setOtherFor(null)
          }} className="h-[50px] rounded-2xl bg-plum-700 px-5 text-[13.5px] font-extrabold text-white disabled:opacity-30">Add</button>
        </div>
      </Sheet>
    </>
  )
}

export const eventsDone = v => (v?.events?.length ?? 0) > 0 && !!v?.audience && Number(v?.max_audience) > 0 && (v?.formats?.length ?? 0) > 0
