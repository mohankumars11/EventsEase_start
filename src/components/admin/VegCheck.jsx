import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast, friendlyError } from '../../context/ToastContext'

/**
 * Veg check — certifying which dishes really are vegetarian, one menu at
 * a time, so Sambramo's own vegetarian menus can reach vegetarian
 * customers (migrations 205, 207).
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT THE "APPROVE" BUTTON
 * ══════════════════════════════════════════════════════════════════════
 * Since 205 an unreviewed dish is not vegetarian — the brief requires it —
 * and all 46 Sambramo veg menus held at least one (430 dishes). Approve in
 * the main list only ever said "this is a real dish"; it gave no way to
 * say "this is real, and it has egg in it". Here every action IS a diet:
 * Pure veg, Contains egg, Non-veg. Saying egg corrects the tag instead of
 * forcing a choice between certifying it wrong and hiding it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY MENU BY MENU
 * ══════════════════════════════════════════════════════════════════════
 * Measured on the live catalogue: the 200 dishes that block the most
 * menus unblock ZERO of them — each menu has its own tail. Finishing the
 * closest menu first: 4 dishes → 1 menu, 31 → 5, 113 → 15.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TWO KINDS OF DISH
 * ══════════════════════════════════════════════════════════════════════
 * Most are plain — Sambar, Curd, Jalebi — and go in a tick-list confirmed
 * in one press. The list starts ticked, so the press is the act: untick
 * anything you are not sure of and it stays in the queue. The rest are
 * shown one at a time with the reason they are flagged, because a name
 * like "Butter Naan" or "Cream of Tomato Soup" is where a vegetarian tag
 * most often hides egg, stock or fish sauce. The flags are a hint about
 * where to look, never a verdict: nothing is certified without a person.
 */

const FLAGS = [
  [/\b(egg|omelet+e?|anda)\b/i, 'Named for egg'],
  [/\b(mayo|mayonnaise)\b/i, 'Mayonnaise usually contains egg'],
  [/\b(cakes?|pastry|pastries|brownies?|cookies?|muffins?|buns?|bread|pav|naan|croissant|waffles?|pancakes?)\b/i, 'Baked goods are often made with egg'],
  [/\b(noodles?|hakka|chow ?mein)\b/i, 'Egg noodles are common'],
  [/\b(manchurian|schezwan|szechuan|chilli|chili|thai|oyster)\b/i, 'Indo-Chinese and Thai sauces can contain fish or oyster sauce'],
  [/\b(soup|broth|stock)\b/i, 'Can be made with meat or chicken stock'],
  [/\b(pudding|mousse|panna cotta|jelly|cheesecake|marshmallow|tiramisu|gumm(y|ies))\b/i, 'Can be set with gelatin'],
  [/\b(caesar|pesto|worcestershire|parmesan)\b/i, 'Can contain anchovy, or cheese made with animal rennet'],
  [/\b(kebab|kabab|keema|kheema|chicken|mutton|fish|prawn|shrimp|meat)\b/i, 'Usually a meat dish'],
]

export function flagFor(d) {
  if (!d.suggested_diet) return 'No diet recorded'
  if (d.suggested_diet !== 'veg') return `Tagged ${d.suggested_diet.replace('_', '-')} — but it is in a vegetarian menu`
  const text = [d.name, ...(d.aliases ?? [])].join(' ')
  return FLAGS.find(([re]) => re.test(text))?.[1] ?? null
}

const VERDICTS = [['veg', 'Pure veg', 'bg-forest-700 text-white'], ['egg', 'Contains egg', 'bg-amber-100 text-amber-900 ring-1 ring-amber-200'],
  ['non_veg', 'Non-veg', 'bg-rose-50 text-rose-700 ring-1 ring-rose-200']]

const left = m => m.to_review + m.needs_swap

export default function VegCheck({ onNavigate }) {
  const toast = useToast()
  const [menus, setMenus] = useState(null)
  const [sel, setSel] = useState(null)
  const [dishes, setDishes] = useState([])
  const [ticked, setTicked] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const loadMenus = useCallback(async () => {
    const { data, error } = await supabase.from('sambramo_diet_review_by_menu')
      .select('template_id, name, diet, dishes, to_review, needs_swap, review_ids, swap_ids')
    if (error) {
      setErr(/does not exist|schema cache/i.test(error.message)
        ? 'Paste supabase/migrations/207_dish_diet_review.sql in the SQL editor first.' : friendlyError(error))
      setMenus([]); return []
    }
    const rows = [...(data ?? [])].sort((a, b) => left(a) - left(b) || a.name.localeCompare(b.name))
    setMenus(rows)
    return rows
  }, [])

  /* Closest-to-done menu that still has something to REVIEW. A menu whose
     only problem is a swap is not a reviewer's job, so it is not opened
     by default — it is listed below with the way to fix it. */
  const pick = useCallback((rows, keep) => {
    const still = rows.find(m => m.template_id === keep && m.to_review > 0)
    setSel(still?.template_id ?? rows.find(m => m.to_review > 0)?.template_id ?? null)
  }, [])

  useEffect(() => { loadMenus().then(rows => pick(rows)) }, [loadMenus, pick])

  const menu = menus?.find(m => m.template_id === sel) ?? null

  useEffect(() => {
    if (!menu) { setDishes([]); return }
    const ids = [...menu.review_ids, ...menu.swap_ids]
    if (!ids.length) { setDishes([]); return }
    supabase.from('sambramo_master_dishes')
      .select('id, name, aliases, description, suggested_diet, review_status, category_id')
      .in('id', ids)
      .then(({ data, error }) => {
        if (error) { setErr(friendlyError(error)); return }
        const list = (data ?? []).sort((a, b) => a.name.localeCompare(b.name))
        setDishes(list)
        setTicked(new Set(list.filter(d => d.review_status === 'needs_review' && !flagFor(d)).map(d => d.id)))
      })
  }, [menu?.template_id, menu?.review_ids?.join(), menu?.swap_ids?.join()]) // eslint-disable-line react-hooks/exhaustive-deps

  const toReview = dishes.filter(d => d.review_status === 'needs_review')
  const plain = toReview.filter(d => !flagFor(d))
  const careful = toReview.filter(d => flagFor(d))
  const swaps = dishes.filter(d => d.review_status !== 'needs_review')

  const summary = useMemo(() => {
    if (!menus) return null
    const usable = menus.filter(m => left(m) === 0).length
    return { usable, total: menus.length, dishes: new Set(menus.flatMap(m => m.review_ids)).size }
  }, [menus])

  async function certify(ids, verdict) {
    if (!ids.length || busy) return
    setBusy(true)
    const { data, error } = await supabase.rpc('sambramo_review_dish_diet', { p_dish_ids: ids, p_verdict: verdict })
    setBusy(false)
    if (error) { toast.error(friendlyError(error)); return }
    toast.success(`${data} dish${data === 1 ? '' : 'es'} certified ${verdict === 'veg' ? 'pure vegetarian' : verdict === 'egg' ? 'as containing egg' : 'non-vegetarian'}`)
    const rows = await loadMenus()
    pick(rows, sel)
  }

  if (menus === null) return <p className="mt-4 text-[13px] font-bold text-ink/50">Loading vegetarian menus…</p>
  const pending = menus.filter(m => left(m) > 0)
  const swapOnly = menus.filter(m => m.to_review === 0 && m.needs_swap > 0)

  return (
    <div className="mt-4" data-veg-check>
      {err && <p className="rounded-2xl bg-amber-50 p-3 text-[12.5px] font-bold text-amber-900">{err}</p>}
      {summary && (
        <p className="text-[13px] font-bold text-ink/70" data-veg-summary>
          <span className="text-forest-700">{summary.usable} of {summary.total}</span> vegetarian menus can reach vegetarian
          customers · {summary.dishes} dish{summary.dishes === 1 ? '' : 'es'} still to check
        </p>
      )}

      {pending.length > 0 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" data-veg-menus>
          {pending.filter(m => m.to_review > 0).map(m => (
            <button key={m.template_id} type="button" onClick={() => setSel(m.template_id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${
                sel === m.template_id ? 'bg-plum-700 text-white' : 'bg-ink/[0.04] text-ink/70 ring-1 ring-ink/[0.06]'}`}>
              {m.name} · {left(m)}
            </button>
          ))}
        </div>
      )}

      {menu && (
        <section className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-ink/[0.06]" data-veg-menu={menu.template_id}>
          <h2 className="text-[17px] font-extrabold text-plum-950">{menu.name}</h2>
          <p className="text-[12px] font-semibold text-ink/50">
            {menu.dishes} dishes · {menu.to_review} to check{menu.needs_swap ? ` · ${menu.needs_swap} to swap` : ''}
          </p>

          {careful.length > 0 && (
            <div className="mt-4" data-veg-careful>
              <h3 className="text-[13px] font-extrabold text-ink">Look at these one at a time</h3>
              <p className="text-[11.5px] text-ink/50">Not sure? Leave it — it stays in the queue and the menu waits.</p>
              <div className="mt-2 space-y-1.5">
                {careful.map(d => (
                  <div key={d.id} className="rounded-2xl bg-amber-50/40 p-3 ring-1 ring-amber-200/60" data-veg-dish={d.id}>
                    <p className="text-[14px] font-extrabold text-ink">{d.name}</p>
                    {d.aliases?.length > 0 && <p className="text-[11px] text-ink/40">also “{d.aliases.join('”, “')}”</p>}
                    {d.description && <p className="mt-0.5 text-[12px] leading-snug text-ink/60">{d.description}</p>}
                    <p className="mt-1 text-[11.5px] font-bold text-amber-900">{flagFor(d)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {VERDICTS.map(([v, label, cls]) => (
                        <button key={v} type="button" disabled={busy} onClick={() => certify([d.id], v)} data-verdict={v}
                          className={`rounded-full px-3 py-1.5 text-[11.5px] font-extrabold disabled:opacity-50 ${cls}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plain.length > 0 && (
            <div className="mt-5" data-veg-plain>
              <h3 className="text-[13px] font-extrabold text-ink">Everyday dishes</h3>
              <p className="text-[11.5px] text-ink/50">Untick anything you are not sure is pure vegetarian — it stays in the queue.</p>
              <ul className="mt-2 divide-y divide-ink/[0.05] rounded-2xl ring-1 ring-ink/[0.06]">
                {plain.map(d => (
                  <li key={d.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-3 py-2">
                      <input type="checkbox" className="mt-1 h-4 w-4 accent-[#0e523c]" checked={ticked.has(d.id)}
                        onChange={() => setTicked(t => { const n = new Set(t); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n })} />
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-bold text-ink">{d.name}</span>
                        {d.description && <span className="block text-[11.5px] leading-snug text-ink/50">{d.description}</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <button type="button" disabled={busy || ticked.size === 0}
                onClick={() => certify(plain.filter(d => ticked.has(d.id)).map(d => d.id), 'veg')} data-veg-confirm
                className="mt-2 rounded-full bg-forest-700 px-4 py-2 text-[12.5px] font-extrabold text-white disabled:opacity-40">
                Confirm {plain.filter(d => ticked.has(d.id)).length} as pure vegetarian
              </button>
            </div>
          )}

          {swaps.length > 0 && <SwapList swaps={swaps} onNavigate={onNavigate} />}
        </section>
      )}

      {!menu && pending.length === 0 && (
        <p className="mt-4 rounded-2xl bg-forest-700/[0.06] p-4 text-[13px] font-bold text-forest-700">
          Every vegetarian menu is ready for vegetarian customers.
        </p>
      )}

      {swapOnly.length > 0 && (
        <section className="mt-5" data-veg-swap-only>
          <h3 className="text-[13px] font-extrabold text-ink">Checked — but these menus need a different dish</h3>
          <p className="text-[11.5px] text-ink/50">Each holds a dish that was reviewed and is not vegetarian. Swap it out in the menu catalogue.</p>
          <ul className="mt-2 space-y-1">
            {swapOnly.map(m => (
              <li key={m.template_id} className="text-[12.5px] font-bold text-ink/70">{m.name} · {m.needs_swap} to swap</li>
            ))}
          </ul>
          {onNavigate && <button type="button" onClick={() => onNavigate('menu-catalogue')}
            className="mt-2 rounded-full bg-ink/[0.05] px-4 py-2 text-[12.5px] font-extrabold text-ink ring-1 ring-ink/[0.07]">Open menu catalogue</button>}
        </section>
      )}
    </div>
  )
}

function SwapList({ swaps, onNavigate }) {
  return (
    <div className="mt-5" data-veg-swaps>
      <h3 className="text-[13px] font-extrabold text-rose-700">This menu needs a different dish</h3>
      <p className="text-[11.5px] text-ink/50">Reviewed, and not vegetarian — reviewing again will not fix it; the menu has to change.</p>
      <ul className="mt-2 space-y-1">
        {swaps.map(d => (
          <li key={d.id} className="text-[12.5px] font-bold text-ink/70">
            {d.name} · {d.review_status === 'rejected' ? 'hidden from the catalogue' : `reviewed as ${String(d.suggested_diet).replace('_', '-')}`}
          </li>
        ))}
      </ul>
      {onNavigate && <button type="button" onClick={() => onNavigate('menu-catalogue')}
        className="mt-2 rounded-full bg-ink/[0.05] px-4 py-2 text-[12.5px] font-extrabold text-ink ring-1 ring-ink/[0.07]">Open menu catalogue</button>}
    </div>
  )
}
