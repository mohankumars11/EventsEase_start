import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

/**
 * Grouped settings rows — one heading, one stack of identical rows.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EXTRACTED, NOT INVENTED
 * ══════════════════════════════════════════════════════════════════════
 *
 * This shape already existed as two file-local functions at the bottom
 * of `pages/customer/Account.jsx`, whose comment says it best: "One Row,
 * so every entry on this screen has the same height, the same tap target
 * and the same chevron."
 *
 * The partner More tab needed the same thing and would otherwise have
 * grown a second, slightly different version of it — the duplication
 * this consolidation exists to remove. So it moves here and both screens
 * use it.
 *
 * Two changes the partner side needs:
 *
 *   `onClick`  a partner row may open a sheet rather than a route, and a
 *              `<Link>` with no destination is a dead control. One of
 *              `to` or `onClick` is required; the element rendered
 *              follows from which one is given.
 *
 *   `tone`     a badge that means "three documents missing" must not
 *              look like a badge that means "two unread". Saffron for
 *              attention, plum for a count, rose for something wrong.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A ROW WITH NOTHING TO SAY SAYS NOTHING
 * ══════════════════════════════════════════════════════════════════════
 *
 * `badge` is for the rows where being wrong costs the partner something
 * — unverified documents, unverified bank details, a service still in
 * draft. Everything else is a label and a chevron.
 *
 * That is the whole design: if every row carried a value, none of them
 * would stand out, and the one that needs attention would be one grey
 * line among twelve.
 */

const TONE = {
  attention: 'bg-saffron-400 text-plum-950',
  count:     'bg-plum-100 text-plum-800',
  bad:       'bg-rose-100 text-rose-800',
  good:      'bg-forest-50 text-forest-700',
}

export function Group({ title, hint, children }) {
  return (
    <section>
      <h2 className="px-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">
        {title}
      </h2>
      {hint && <p className="mt-0.5 px-1 text-[11px] text-ink-mute">{hint}</p>}
      {/* One card, rows divided inside it — rather than a stack of
          separate cards, which at eleven rows reads as eleven things to
          decide between instead of one list to scan. */}
      <div className="mt-1.5 divide-y divide-ink/[0.06] overflow-hidden rounded-[18px] bg-white ring-1 ring-ink/[0.07]">
        {children}
      </div>
    </section>
  )
}

export function Row({ to, onClick, icon: Icon, label, badge, tone = 'count', danger }) {
  const inner = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${
        danger
          ? 'bg-rose-50 text-rose-600 ring-rose-200'
          : 'bg-plum-50 text-plum-700 ring-plum-100'}`}>
        <Icon size={16} />
      </span>

      <span className={`min-w-0 flex-1 truncate text-[14px] font-bold ${
        danger ? 'text-rose-700' : 'text-ink'}`}>
        {label}
      </span>

      {badge != null && badge !== '' && badge !== 0 && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${TONE[tone] ?? TONE.count}`}>
          {badge}
        </span>
      )}

      <ChevronRight size={16} className="shrink-0 text-ink/30" />
    </>
  )

  /* 52px of row. Below about 48 a thumb misses it, and every row on the
     screen has to be the same height or the list stops reading as a
     list. */
  /* The separators come from the Group's divide-y, not from the row:
     a sibling selector keyed on an arbitrary class string is a rule
     nobody can grep for when it stops matching. */
  const cls = 'flex w-full items-center gap-3 px-3.5 py-3 text-left '
    + 'transition-colors active:bg-ink/[0.03]'

  if (to) return <Link to={to} className={cls}>{inner}</Link>
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>
}
