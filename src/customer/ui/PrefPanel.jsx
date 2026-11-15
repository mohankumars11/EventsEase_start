/**
 * One service's preferences, drawn from its spec (data/prefSpecs): a few
 * priceable questions, each answered with an icon tile or a stepper,
 * every tile question typeable. The experience (migration 208) comes
 * first where a trade has one; décor asks for moments; catering opens
 * the menu card; a venue points at the venues screen.
 *
 * Answers live on the plan under `needs[occasion:trade]`:
 *   partner questions (`map`)  the partner's key, always an ARRAY of ids,
 *                              so lib/needs can match them
 *   $hours · $qty · $tables …  what the estimate multiplies by
 *   $extras                    add-on ids the masters price
 *   $moments / services        the décor set-ups, and their partner ids
 *   everything else            words for the brief
 *
 * Defaults (hours from the event, counts sized from the guests) are
 * written to the plan the first time the panel opens, so the quotation
 * and the live match read the same numbers the customer saw.
 */
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Cake, Check, ChevronRight, Clock3, Minus, PenLine, Plus, Users } from 'lucide-react'
import { IconTiles, OTHER, isOther, otherText, labelOf } from './choiceTiles'
import { RefPhotos, Thumb } from './prefs'
import TierCards, { GENERIC_TIERS } from './TierCards'
import MenuPick from './MenuPick'
import { needsFor as tradeQuestions, experienceTiers } from '../lib/needs'
import { hoursOf } from '../lib/experience'
import { specFor, pickId, experienceFor } from '../data/prefSpecs'
import { momentsFor } from '../data/decorMoments'
import { peopleLine } from '../data/occasionProfile'
import { COLOURS } from '../data/visualCatalogue'
import { requiredFor } from '../data/requiredAnswers'
import Glyph3D from './Glyph3D'

const HOUR_WORD = h => (h === 12 ? 'Full day' : h === 24 ? '2 days' : `${h} ${h === 1 ? 'hour' : 'hours'}`)
const EDITION_WORD = { veg: 'Veg', non_veg: 'Non-veg', jain: 'Jain', satvik: 'Satvik' }
/** "Let the master suggest" — a count the customer leaves to the professional. */
export const MASTER = 'master'
/** What the estimate multiplies by: the counts the customer set, summed; none set → null. */
export const qtyOfItems = items => { const ns = Object.values(items ?? {}).map(Number).filter(n => n > 0); return ns.length ? ns.reduce((a, b) => a + b, 0) : null }
/** "Tables / chairs" → "sets"; "Mist fans / coolers" → "units"; "Chairs" → "chairs". */
const unitOf = label => { const l = String(label ?? 'items').toLowerCase(); return /\//.test(l) ? (/table|chair/.test(l) ? 'sets' : 'units') : l.replace(/ & .*$/, '').replace(/ \(.*$/, '').slice(0, 14) }
const ONE = { people: 'person', staff: 'staff', 'sq ft': 'sq ft', crew: 'crew' }
const UNIT = (n, unit) => (n === 1 ? ONE[unit] ?? unit.replace(/s$/, '') : unit)

/** The partner's own options for a mapped question, narrowed to the spec's pick list. */
export function partnerOptions(tradeId, q) {
  const all = tradeQuestions(tradeId).find(x => x.key === q.k)?.options ?? []
  if (!q.pick) return all.slice(0, 8).map(o => ({ id: o.id, label: o.label }))
  /* A pick is an id, or [id, label, line] — the partner's option in the
     customer's words ("Couple portraits" is the partner's "Portrait"). */
  return q.pick.map(x => { const o = all.find(y => y.id === pickId(x)); return o && (Array.isArray(x) ? { id: o.id, label: x[1] ?? o.label, line: x[2] ?? null } : { id: o.id, label: o.label }) }).filter(Boolean)
}

/** The spec for this trade — or, for a trade without one, its one required partner question. */
export function questionsFor(o, tradeId, ev) {
  const s = specFor(o, tradeId, ev)
  if (s.qs.length) return s
  const k = requiredFor(tradeId)[0]
  const pq = k ? tradeQuestions(tradeId).find(x => x.key === k) : null
  return { line: s.line, qs: pq ? [{ k, type: pq.kind === 'single' ? 'one' : 'many', map: true, label: pq.title, other: true, price: 'match' }] : [] }
}

/** The answers as words, for the quotation card and the brief: [{ label, value }]. */
export function linesFor(o, tradeId, cur, ev) {
  const { qs } = questionsFor(o, tradeId, ev)
  const out = []
  const tier = experienceTiers(tradeId).find(x => x.tier === cur.$tier) ?? GENERIC_TIERS.find(x => x.tier === cur.$level)
  const xp = experienceFor(o, tradeId, ev)
  if (tier && xp) out.push({ label: 'Level', value: xp[String(tier.tier).toUpperCase()]?.[0] ?? tier.name })
  for (const q of qs) {
    const v = cur[q.k]
    if (q.type === 'menu') {
      const st = cur.$studio
      if (st) out.push({ label: 'Menu', value: `${st.name}${st.edition && st.edition !== 'veg' ? ` · ${EDITION_WORD[st.edition]} edition` : ''} · ${st.sections.reduce((n, s) => n + s.items.length, 0)} dishes, ${st.sections.length} courses`, qty: ev.guests, unit: 'plates' })
      if (cur.$serve) out.push({ label: 'Served', value: cur.$serve.replace(/^\w/, c => c.toUpperCase()) })
      if (cur.$staff) out.push({ label: 'Serving staff', value: 'Yes', qty: Math.max(2, Math.ceil((Number(ev.guests) || 50) / 25)), unit: 'staff' })
      continue
    }
    if (q.type === 'venue') continue
    if (q.words && cur[q.words.k]) out.push({ label: 'Words on the cake', value: `“${String(cur[q.words.k]).trim()}”` })
    if (q.also && cur[q.also.k]?.length) out.push({ label: q.also.label, value: cur[q.also.k].map(id => q.also.options.find(x => x.id === id)?.label ?? id).join(', ') })
    if (q.type === 'egg') {
      const d = cur.dietary ?? []
      const word = d.includes('vegan') ? 'Vegan' : d.includes('eggless') ? 'Eggless' : cur.$egg === 'with_egg' ? 'With egg' : null
      if (word) out.push({ label: 'Egg', value: [word, d.includes('sugar_reduced') && 'sugar-reduced'].filter(Boolean).join(', ') })
      continue
    }
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue
    if (q.type === 'hours') { out.push({ label: q.label, value: HOUR_WORD(Number(v)) }); continue }
    if (q.type === 'count') { out.push(v === MASTER ? { label: q.label, value: 'Master suggests how many' } : { label: q.label, value: `${Number(v).toLocaleString('en-IN')} ${UNIT(Number(v), q.unit)}`, qty: Number(v), unit: UNIT(Number(v), q.unit) }); continue }
    if (q.type === 'items') {
      const opts = partnerOptions(tradeId, q)
      for (const id of v) {
        if (isOther(id)) { out.push({ label: q.label, value: otherText(id) }); continue }
        const n = cur.$items?.[id], name = opts.find(x => x.id === id)?.label ?? id
        out.push(n === MASTER || n == null ? { label: name, value: 'Master suggests how many' } : { label: name, value: `${Number(n).toLocaleString('en-IN')} ${unitOf(name)}`, qty: Number(n), unit: unitOf(name) })
      }
      continue
    }
    if (q.type === 'yesno') { out.push({ label: q.label, value: v ? 'Yes' : 'No' }); continue }
    if (q.type === 'text') { out.push({ label: q.label, value: String(v) }); continue }
    if (q.type === 'colours') { out.push({ label: 'Colours', value: v.map(id => COLOURS.find(c => c.id === id)?.label ?? id).join(', ') }); continue }
    if (q.type === 'moments') { const ms = momentsFor(o, ev); out.push({ label: 'Set-ups', value: (cur.$moments ?? []).map(id => (isOther(id) ? otherText(id) : ms.find(m => m.id === id)?.label ?? id)).filter(Boolean).join(', ') }); continue }
    const items = q.map ? partnerOptions(tradeId, q) : q.options ?? []
    /* A typed number gets its unit: "6" is "6 kg" (Mohan, 2026-11-13). */
    const typed = x => { const t = otherText(x).trim(); return q.unit && /^[d.,]+$/.test(t) ? `${t} ${q.unit}` : t }
    const vals = (Array.isArray(v) ? v : [v]).map(x => labelOf(items, x) ?? (isOther(x) ? typed(x) : null)).filter(Boolean)
    if (vals.length) out.push({ label: q.label, value: vals.join(', ') })
  }
  return out
}

export default function PrefPanel({ o, t, ev, place, plan, answers = {}, video = false, onVideo = () => {} }) {
  const cur = plan.needsOf(o.id, t)
  const set = patch => plan.setNeeds(`${o.id}:${t}`, { ...plan.needsOf(o.id, t), ...patch })
  const { qs } = questionsFor(o, t, ev)
  /* The trade's own experience rows, else the three generic levels (stored
     as $level, so matching never looks for a package that does not exist). */
  const own = experienceTiers(t)
  const tiers = own.length ? own : GENERIC_TIERS
  const levelKey = own.length ? '$tier' : '$level'
  const xp = experienceFor(o, t, ev)

  /* Defaults onto the plan, once, so every later reading agrees with the screen. */
  useEffect(() => {
    const patch = {}
    for (const q of qs) {
      if ((q.type === 'hours' || q.type === 'count') && q.def != null && cur[q.k] == null) patch[q.k] = Number(q.def)
      if (q.type === 'hours' && cur[q.k] != null && typeof cur[q.k] !== 'number') patch[q.k] = hoursOf(cur[q.k]) ?? Number(q.def) ?? 4
      /* Every chosen item gets its sized count once; an older plan without counts learns them here. */
      if (q.type === 'items') {
        const sizes = q.sizes(ev), items = { ...(cur.$items ?? {}) }
        let changed = false
        for (const id of (cur[q.k] ?? []).filter(x => !isOther(x))) if (items[id] == null) { items[id] = MASTER; changed = true }
        if (changed) { patch.$items = items; patch.$qty = qtyOfItems(items) }
      }
    }
    if (Object.keys(patch).length) set(patch)
  }, [t]) // eslint-disable-line react-hooks/exhaustive-deps

  const pickExperience = x => {
    if (!x) { set({ [levelKey]: null }); return }
    const patch = { [levelKey]: x.tier }
    if (x.model === 'PARTNER_PACKAGE' && x.min_hours && (hoursOf(cur.$hours) ?? 0) < Number(x.min_hours)) patch.$hours = Number(x.min_hours)
    set(patch)
  }

  return (
    <div className="space-y-5" data-pref-panel={t}>
      {xp && (
        <Field label="Choose your experience" sub="Samples only — every master’s package includes more. Customise it, or ask the masters what they offer.">
          <TierCards tiers={tiers.map(x => ({ ...x, name: xp[String(x.tier).toUpperCase()]?.[0] ?? x.name }))} value={cur[levelKey] ?? null} onPick={pickExperience} lines={Object.fromEntries(Object.entries(xp).map(([k, v]) => [k, v[1]]))} />
        </Field>
      )}
      {qs.map(q => <Question key={q.k} o={o} t={t} q={q} ev={ev} place={place} cur={cur} set={set} answers={answers} />)}
      {t === 'photography' && (
        <button type="button" role="switch" aria-checked={video} onClick={() => onVideo(!video)} data-video-toggle
          className="cx-press flex w-full items-center gap-3 rounded-[16px] bg-white p-3 text-left shadow-[inset_0_0_0_1.5px_#ECE6F4]">
          <Thumb o={o} t="videography" className="h-12 w-12 shrink-0 rounded-[12px]" />
          <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold">Add video coverage</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">Film, highlights and reels — priced on its own card</span></span>
          <span className={'relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ' + (video ? 'bg-[#7C3AED]' : 'bg-[#E4DDF0]')}><span className={'absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ' + (video ? 'right-[3px]' : 'left-[3px]')} /></span>
        </button>
      )}
      {!['catering_food', 'venue', 'restaurant'].includes(t) && <RefPhotos refs={cur.$refs ?? []} onChange={refs => set({ $refs: refs })} />}
    </div>
  )
}

function Field({ label, sub = null, optional = false, children }) {
  return (
    <section data-field={label}>
      <p className="text-[15px] font-black tracking-[-0.02em]">{label}{optional && <span className="ml-1.5 text-[11px] font-bold text-[var(--ink-3)]">optional</span>}</p>
      {sub && <p className="text-[11.5px] font-semibold text-[var(--ink-3)]">{sub}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  )
}

function Question({ o, t, q, ev, place, cur, set, answers }) {
  const v = cur[q.k]
  switch (q.type) {
    case 'menu': return <MenuPick o={o} ev={ev} place={place} needs={cur} set={set} answers={answers} />
    case 'venue': return (
      <Link to={`/o/${o.id}/venues`} className="cx-press flex items-center gap-3 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#5B21B6] to-[#8B5CF6] p-3 text-white" data-venue-entry>
        <Glyph3D id="venue" size={52} lift />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#FFE071]">Verified venue partners</span>
          <span className="block text-[16px] font-black leading-tight">Choose your venue</span>
          <span className="block text-[11.5px] font-semibold text-white/85">Halls, lawns and rooftops that hold {Number(ev.guests).toLocaleString('en-IN')} guests — exact prices for your date</span>
        </span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#5B21B6]"><ChevronRight size={18} strokeWidth={2.8} /></span>
      </Link>
    )
    case 'hours': {
      const n = Number(v) || Number(q.def) || 4
      const custom = !q.picks.includes(n)
      return (
        <Field label={q.label} sub={q.sub}>
          <IconTiles data={q.k} cols={3} compact value={custom ? 'custom' : String(n)}
            items={[...q.picks.map(h => ({ id: String(h), label: HOUR_WORD(h), icon: Clock3 })), { id: 'custom', label: custom ? HOUR_WORD(n) : 'Custom', icon: PenLine }]}
            onChange={x => { if (x === 'custom') set({ [q.k]: q.picks.includes(n) ? n + 1 : n }); else if (x) set({ [q.k]: Number(x) }) }} />
          {custom && <Stepper value={n} min={1} max={72} step={1} unit="hours" onChange={x => set({ [q.k]: x })} />}
        </Field>
      )
    }
    case 'count': {
      const master = v === MASTER
      const n = Number(v ?? q.def) || q.min || 1
      return (
        <Field label={q.label} sub={q.sub ? `${q.sub} — we sized it for ${peopleLine(o, ev).replace(/^Just/, 'just')}` : `Sized for ${peopleLine(o, ev).replace(/^Just/, 'just')} — adjust if you like`}>
          {!master && <Stepper value={n} min={q.min ?? 1} max={q.max ?? 5000} step={q.step ?? 1} unit={q.unit} onChange={x => set({ [q.k]: x })} icon={Users} />}
          <MasterSuggests on={master} onToggle={() => set({ [q.k]: master ? (Number(q.def) || q.min || 1) : MASTER })} what={q.unit} o={o} ev={ev} data="count" />
        </Field>
      )
    }
    case 'items': {
      /* Several things, each with its own count — or left to the master. */
      const opts = partnerOptions(t, q)
      const chosen = Array.isArray(v) ? v : []
      const counts = cur.$items ?? {}
      const sizes = q.sizes(ev)
      const setChosen = ids => {
        const next = { ...counts }
        /* New picks are the master's call until the customer sets a number (Mohan, 2026-11-14). */
        for (const id of ids) if (!isOther(id) && next[id] == null) next[id] = MASTER
        for (const id of Object.keys(next)) if (!ids.includes(id)) delete next[id]
        set({ [q.k]: ids, $items: next, $qty: qtyOfItems(next) })
      }
      const setCount = (id, n) => { const next = { ...counts, [id]: n }; set({ $items: next, $qty: qtyOfItems(next) }) }
      const real = chosen.filter(id => !isOther(id))
      return (
        <>
          <Field label={q.label} sub={q.sub}>
            <IconTiles data={q.k} multi cols={q.cols ?? 2} compact={opts.length > 6} value={chosen} items={opts} other={q.other} onChange={setChosen} />
          </Field>
          {real.length > 0 && (
            <Field label="How many of each?" sub="Leave it to the master, or set a number">
              <div className="mb-2 flex items-center gap-2.5 rounded-[14px] bg-[#E9F8EF] p-2.5 shadow-[inset_0_0_0_1.5px_#BBE5CB]" data-items-master-note>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#0B7A45]"><Users size={17} /></span>
                <span className="min-w-0 text-[11.5px] font-semibold leading-snug text-[#0B4F2A]"><b className="font-black">Not sure how many? Let the master suggest.</b> They size it for {peopleLine(o, ev).replace(/^Just/, 'just')}, price it in their reply, and you fine-tune it with them in chat once they accept.</span>
              </div>
              <ul className="space-y-2" data-items>
                {real.map(id => {
                  const opt = opts.find(x => x.id === id), n = counts[id], master = n === MASTER || n == null
                  return (
                    <li key={id} className={'rounded-[16px] p-2.5 ' + (master ? 'bg-[#F3FBF5] shadow-[inset_0_0_0_1.5px_#BBE5CB]' : 'bg-white shadow-[inset_0_0_0_1.5px_#ECE6F4]')} data-item={id} data-item-count={master ? 'master' : n}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-[13.5px] font-extrabold text-[#1C1033]">{opt?.label ?? id}</span>
                        <button type="button" onClick={() => setCount(id, master ? (sizes[id] === MASTER || sizes[id] == null ? 1 : sizes[id]) : MASTER)} aria-pressed={master} data-item-master
                          className={'cx-press shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition-colors ' + (master ? 'bg-[#16A34A] text-white shadow-[0_6px_14px_-8px_rgba(22,163,74,.9)]' : 'bg-[#16A34A]/10 text-[#0B7A45] shadow-[inset_0_0_0_1.5px_#86EFAC]')}>
                          {master ? 'Master suggests ✓' : 'Let the master suggest'}
                        </button>
                      </div>
                      {master
                        ? <p className="mt-1 text-[11px] font-semibold text-[var(--ink-3)]">The master works out how many for {peopleLine(o, ev).replace(/^Just/, 'just')} and prices it in their reply.</p>
                        : <div className="mt-2"><Stepper value={Number(n) || 1} min={1} max={10000} step={Number(n) >= 100 ? 10 : 1} unit={unitOf(opt?.label)} onChange={x => setCount(id, x)} icon={Users} /></div>}
                    </li>
                  )
                })}
              </ul>
            </Field>
          )}
        </>
      )
    }
    case 'yesno': return (
      <Field label={q.label} sub={q.sub}>
        <IconTiles data={q.k} cols={2} compact value={v === true ? 'yes' : v === false ? 'no' : null} items={[{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]} onChange={x => set({ [q.k]: x === 'yes' ? true : x === 'no' ? false : null })} />
      </Field>
    )
    case 'text': return (
      <Field label={q.label} optional={q.optional}>
        <input value={v ?? ''} onChange={e => set({ [q.k]: e.target.value.slice(0, 80) })} placeholder={q.placeholder}
          className="h-12 w-full rounded-[14px] bg-white px-3.5 text-[14px] font-semibold shadow-[inset_0_0_0_1.5px_#E9E3F2] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]" data-text={q.k} />
      </Field>
    )
    case 'colours': return (
      <Field label={q.label} sub={q.sub} optional>
        <div className="flex flex-wrap gap-2" data-colours>
          {COLOURS.map(col => {
            const sel = (cur.$colours ?? []).includes(col.id)
            return (
              <button key={col.id} type="button" aria-pressed={sel} data-colour={col.id}
                onClick={() => set({ $colours: sel ? cur.$colours.filter(x => x !== col.id) : [...(cur.$colours ?? []), col.id].slice(-2) })}
                className={'cx-press flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 text-[12.5px] font-bold ' + (sel ? 'bg-[#F1E9FF] shadow-[inset_0_0_0_2px_#7C3AED]' : 'bg-white shadow-[inset_0_0_0_1.5px_#ECE6F4]')}>
                <span className="flex -space-x-1">{col.swatch.map(s => <span key={s} className="h-5 w-5 rounded-full ring-2 ring-white" style={{ background: s, boxShadow: 'inset 0 0 0 1px rgba(28,16,51,.18)' }} />)}</span>{col.label}
              </button>
            )
          })}
        </div>
      </Field>
    )
    case 'moments': {
      /* The moments of this occasion; each one is a decorator's own service. */
      const ms = momentsFor(o, ev)
      const all = tradeQuestions(t).find(x => x.key === 'services')?.options ?? []
      const idOf = m => all.find(x => x.label === m.svc)?.id ?? null
      const chosen = cur.$moments ?? []
      const pick = ids => set({ $moments: ids, services: [...new Set(ids.map(id => (isOther(id) ? id : idOf(ms.find(m => m.id === id) ?? {}))).filter(Boolean))] })
      return (
        <Field label={q.label} sub={q.sub}>
          <IconTiles data="moments" multi cols={2} value={chosen} other="A set-up we didn’t list" items={ms.map(m => ({ id: m.id, label: m.label, line: m.line, icon: m.icon }))} onChange={pick} />
        </Field>
      )
    }
    case 'egg': {
      /* India's first cake filter, as one clear choice (Mohan, 2026-11-14). */
      const d = Array.isArray(cur.dietary) ? cur.dietary : []
      const now = d.includes('vegan') ? 'vegan' : d.includes('eggless') ? 'eggless' : cur.$egg === 'with_egg' ? 'with_egg' : null
      const sugar = d.includes('sugar_reduced')
      const pickEgg = id => set({ $egg: id, dietary: [...(id === 'eggless' ? ['eggless'] : id === 'vegan' ? ['vegan'] : []), ...(sugar ? ['sugar_reduced'] : [])] })
      const EGG = [['eggless', 'Eggless', '#0B7A45', '#E9F8EF'], ['with_egg', 'With egg', '#B45309', '#FFF4E5'], ['vegan', 'Vegan', '#0F766E', '#E0F5F5']]
      return (
        <Field label={q.label} sub={q.sub}>
          <div className="grid grid-cols-3 gap-2" data-egg>
            {EGG.map(([id, word, ink, tint]) => {
              const on = now === id
              return (
                <button key={id} type="button" onClick={() => pickEgg(id)} aria-pressed={on} data-egg-pick={id}
                  className={'cx-press flex h-[58px] flex-col items-center justify-center gap-1 rounded-[16px] text-[13.5px] font-black transition-[background,box-shadow] ' + (on ? 'text-white' : 'bg-white')}
                  style={on ? { background: ink, boxShadow: `0 12px 22px -12px ${ink}` } : { boxShadow: `inset 0 0 0 1.5px ${tint === '#E9F8EF' ? '#BBE5CB' : '#ECE6F4'}`, color: ink }}>
                  <span className={'grid h-4 w-4 place-items-center rounded-[3px] ring-[1.5px] ' + (on ? 'ring-white' : '')} style={on ? {} : { boxShadow: `inset 0 0 0 1.5px ${ink}` }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: on ? '#FFFFFF' : ink }} />
                  </span>{word}
                </button>
              )
            })}
          </div>
          <button type="button" role="switch" aria-checked={sugar} onClick={() => set({ dietary: sugar ? d.filter(x => x !== 'sugar_reduced') : [...d, 'sugar_reduced'] })} data-sugar
            className="cx-press mt-2 flex items-center gap-2 text-[12.5px] font-extrabold text-[var(--ink-2)]">
            <span className={'relative h-[22px] w-[38px] rounded-full transition-colors ' + (sugar ? 'bg-[#7C3AED]' : 'bg-[#E4DDF0]')}><span className={'absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all ' + (sugar ? 'right-[3px]' : 'left-[3px]')} /></span>
            Less sugar
          </button>
        </Field>
      )
    }
    default: {
      const items = q.map ? partnerOptions(t, q) : q.options ?? []
      /* Options that are photographs (the cake's look) show as pictures. */
      if (!q.map && items.some(x => x.photo)) {
        return (
          <Field label={q.label} sub={q.sub} optional={q.optional}>
            <div className="grid grid-cols-3 gap-2" data-photo-tiles={q.k}>
              {items.map(x => {
                const on = v === x.id
                return (
                  <button key={x.id} type="button" onClick={() => set({ [q.k]: on ? null : x.id })} aria-pressed={on} data-opt={x.id}
                    className={'cx-press relative overflow-hidden rounded-[16px] bg-white text-left transition-shadow ' + (on ? 'shadow-[0_0_0_2.5px_#7C3AED,0_12px_22px_-12px_rgba(91,33,182,.9)]' : 'shadow-[0_0_0_1.2px_#ECE6F6]')}>
                    <span className="relative block aspect-square bg-[#FBF8FF]">
                      {x.photo ? <img src={x.photo.url ?? x.photo} alt={x.photo.alt ?? ''} loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : <span className="absolute inset-0 grid place-items-center text-[#C4B5FD]"><Cake size={30} /></span>}
                      {on && <span className="cx-pop absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#7C3AED] text-white"><Check size={12} strokeWidth={3.4} /></span>}
                    </span>
                    <span className="block truncate px-2 py-1.5 text-[11.5px] font-extrabold text-[#1C1033]">{x.label}</span>
                  </button>
                )
              })}
            </div>
            {q.words && (
              <label className="mt-3 block">
                <span className="text-[13px] font-black text-[#1C1033]">Words on the cake <span className="font-semibold text-[var(--ink-3)]">optional</span></span>
                <input value={cur[q.words.k] ?? ''} onChange={e => set({ [q.words.k]: e.target.value.slice(0, 60) })} placeholder={q.words.placeholder} data-cake-words
                  className="mt-1.5 h-11 w-full rounded-[14px] bg-white px-3.5 text-[14px] font-semibold shadow-[inset_0_0_0_1.5px_#E9E3F2] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]" />
              </label>
            )}
          </Field>
        )
      }
      /* A question with no options to show is not asked as a bare text box (Mohan, 2026-11-13). */
      if (!items.length) return null
      const multi = q.type === 'many'
      /* A partner question is always an array on the plan (lib/needs matches arrays). */
      const value = q.map ? (multi ? v ?? [] : (v ?? [])[0] ?? null) : multi ? v ?? [] : v ?? null
      const onChange = x => set({ [q.k]: q.map ? (multi ? x : x == null ? [] : [x]) : x })
      return (
        <Field label={q.label} sub={q.sub} optional={q.optional}>
          <IconTiles data={q.k} multi={multi} cols={q.cols ?? null} compact={items.length > 6} value={value} items={items} other={q.other} onChange={onChange} />
          {q.also && (
            <div className="mt-3" data-also={q.also.k}>
              <p className="text-[12.5px] font-black text-[#1C1033]">{q.also.label} <span className="font-semibold text-[var(--ink-3)]">optional</span></p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {q.also.options.map(x => {
                  const list = cur[q.also.k] ?? [], on = list.includes(x.id)
                  return <button key={x.id} type="button" aria-pressed={on} onClick={() => set({ [q.also.k]: on ? list.filter(y => y !== x.id) : [...list, x.id] })} data-also-pick={x.id}
                    className={'cx-press flex h-9 items-center gap-1 rounded-full px-3 text-[12.5px] font-extrabold ' + (on ? 'bg-[#1C1033] text-white' : 'bg-white text-[#2E1A4F] shadow-[inset_0_0_0_1.5px_#E9E3F2]')}>{on ? <Check size={13} strokeWidth={3} /> : <Plus size={13} />}{x.label}</button>
                })}
              </div>
            </div>
          )}
        </Field>
      )
    }
  }
}

/* "Not sure? Let the master suggest" — the count becomes the professional's call. */
function MasterSuggests({ on, onToggle, what, o, ev, data }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} data-master-suggests={data}
      className={'cx-press mt-2 flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left transition-colors ' + (on ? 'bg-[#E9F8EF] shadow-[inset_0_0_0_1.5px_#BBE5CB]' : 'bg-[#FAF8FD] shadow-[inset_0_0_0_1px_#EEE9F5]')}>
      <span className={'grid h-7 w-7 shrink-0 place-items-center rounded-full ' + (on ? 'bg-[#16A34A] text-white' : 'bg-white text-[#7C3AED] shadow-[0_0_0_1px_#E9E3F2]')}><Users size={14} /></span>
      <span className="min-w-0 flex-1">
        <span className={'block text-[12.5px] font-extrabold ' + (on ? 'text-[#0B6B3D]' : 'text-[#2E1A4F]')}>{on ? `The master suggests how many ${what}` : 'Not sure? Let the master suggest'}</span>
        <span className="block text-[11px] font-semibold text-[var(--ink-3)]">{on ? `Sized by the professional for ${peopleLine(o, ev).replace(/^Just/, 'just')} · tap to set it yourself` : 'They size it for your event and price it in their reply'}</span>
      </span>
    </button>
  )
}

/* How many — a big number with minus and plus, typeable. */
function Stepper({ value, min, max, step, unit, onChange, icon: Icon = Clock3 }) {
  const clamp = n => Math.max(min, Math.min(max, n))
  return (
    <div className="cx-rise flex items-center justify-between gap-2 rounded-[18px] bg-gradient-to-br from-[#F7F2FF] to-[#EFE6FF] p-2" data-stepper={unit}>
      <button type="button" onClick={() => onChange(clamp(value - step))} aria-label="Fewer" className="cx-press grid h-11 w-11 place-items-center rounded-[14px] bg-white text-[#5B21B6] shadow-[0_6px_14px_-10px_rgba(58,18,144,.8)]"><Minus size={18} strokeWidth={2.6} /></button>
      <span className="flex min-w-0 items-center gap-2">
        <Icon size={16} className="shrink-0 text-[#7C5BC7]" />
        <input inputMode="numeric" value={value} aria-label={unit} onChange={e => onChange(clamp(Number(e.target.value.replace(/\D/g, '')) || min))}
          className="cx-num w-[72px] bg-transparent text-center text-[26px] font-black leading-none tracking-[-0.03em] text-[#2E1065] outline-none" />
        <span className="text-[12px] font-black uppercase tracking-[0.1em] text-[#7C5BC7]">{unit}</span>
      </span>
      <button type="button" onClick={() => onChange(clamp(value + step))} aria-label="More" className="cx-press grid h-11 w-11 place-items-center rounded-[14px] bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white shadow-[0_8px_16px_-8px_rgba(91,33,182,.95)]"><Plus size={18} strokeWidth={2.6} /></button>
    </div>
  )
}

export { OTHER }
