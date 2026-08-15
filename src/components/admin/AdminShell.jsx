import { useState, useEffect, useMemo, useRef } from 'react'
import { Menu, X, Search, RefreshCw, Command, ChevronRight, LogOut } from 'lucide-react'
import { BRAND } from '../../config/sambramo'
import { INK, STATUS } from '../../config/dataviz'
import { NAV, NAV_BY_ID } from '../../config/adminNav'
import SambramoMark from '../ui/SambramoMark'

/**
 * The frame the whole console sits in.
 *
 * ── What it is for ───────────────────────────────────────────────────────
 * The previous shell was a white sidebar of eighteen identical rows on a grey
 * page. Nothing about it said whose product it was, nothing separated one
 * subject from another, and every item looked exactly as important as every
 * other — so finding anything meant reading the list top to bottom.
 *
 * Three things fix that, and none of them is decoration:
 *
 *   GROUND. The rail is dark plum; the work is on light. That single contrast
 *     does the job a hundred borders were failing at — you always know which
 *     part of the screen is navigation and which part is the business.
 *
 *   GROUPS. Six subjects with their own headings, so the eye lands on a
 *     heading first and reads four items instead of scanning eighteen. The
 *     grouping is by SUBJECT (config/adminNav), which is why every question
 *     is answerable without leaving its group.
 *
 *   A HEADER THAT SAYS WHERE YOU ARE. Group › Screen, the screen's name at
 *     display size, and one sentence saying what it is for. The old shell put
 *     the brand name at the top of every page, which is the one fact the
 *     person looking at it already knew.
 *
 * ── The brand is in the rail, not on every page ──────────────────────────
 * The kolam mark and the wordmark sit once, at the top of the rail, with the
 * founder's own name and role at the bottom. That is where identity belongs in
 * a tool: present, permanent, and never competing with the screen's own title
 * for the top of the page.
 *
 * ── ⌘K ───────────────────────────────────────────────────────────────────
 * Eighteen screens is past the point where a mouse is the fastest route.
 * The palette searches names, descriptions and group labels, so "refund"
 * finds Returns & Refunds without knowing which group it lives in.
 */

export default function AdminShell({
  activeNav, onNavigate, badges = {}, profile,
  onRefresh, refreshing, notifications, children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const active = NAV_BY_ID[activeNav] ?? NAV_BY_ID.overview

  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function go(id) {
    onNavigate(id)
    setSidebarOpen(false)
    setPaletteOpen(false)
  }

  return (
    <div className="flex bg-[#FCFAFF]" style={{ minHeight: 'calc(100vh - 64px)' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── The rail ─────────────────────────────────────────────────── */}
      <aside
        className={[
          'fixed top-0 left-0 h-full w-[248px] z-40 flex flex-col',
          'transform transition-transform duration-300 ease-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'md:sticky md:top-0 md:translate-x-0 md:z-auto',
        ].join(' ')}
        style={{
          // Plum is the product's brand colour everywhere outside the shop.
          // A vertical ramp rather than a flat fill so the rail has a top and
          // a bottom — the founder block at the foot sits in the deepest part.
          background: 'linear-gradient(175deg, #FAF7FE 0%, #F5F0FC 45%, #F1EAFA 100%)',
          maxHeight: '100vh',
        }}
      >
        {/* Brand */}
        <div className="px-4 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <SambramoMark size={30} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold text-ink leading-none tracking-tight">
                {BRAND.name}
              </div>
              <div className="text-[10px] mt-1 tracking-wide" style={{ color: 'rgb(var(--ink-mute))' }}>
                Operations Console
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-ink-mute hover:text-ink p-1"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          </div>

          <button
            onClick={() => setPaletteOpen(true)}
            className="mt-4 w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-colors"
            style={{ background: 'rgb(var(--surface-sunk) / 0.07)' }}
          >
            <Search size={13} className="text-ink-mute shrink-0" />
            <span className="text-[11px] text-ink-mute flex-1">Jump to…</span>
            <kbd className="text-[9px] font-sans px-1 py-0.5 rounded text-ink-mute"
                 style={{ background: 'rgb(var(--surface-sunk) / 0.10)' }}>
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-4 admin-rail-scroll">
          {NAV.map(group => (
            <div key={group.id}>
              {/* No emoji on the group heading. At 10px a colour emoji is a
                  speck of noise rather than an icon, and the items below
                  already carry one each — two rows of pictures competing is
                  what made the old rail hard to scan. The heading is type. */}
              <div className="px-2.5 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.09em]"
                      style={{ color: 'rgb(var(--ink-mute))' }}>
                  {group.label}
                </span>
              </div>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const on = activeNav === item.id
                  const count = item.badge ? badges[item.badge] ?? 0 : 0
                  return (
                    <button
                      key={item.id}
                      onClick={() => go(item.id)}
                      aria-current={on ? 'page' : undefined}
                      title={item.description}
                      className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] text-left transition-all"
                      style={{
                        // The active item is a filled pill, not a coloured
                        // word: on a dark ground a colour change alone is far
                        // too quiet to find at a glance.
                        background: on ? 'rgb(var(--accent) / 0.12)' : 'transparent',
                        color: on ? 'rgb(var(--accent))' : 'rgb(var(--ink-soft))',
                        fontWeight: on ? 600 : 500,
                      }}
                      onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'rgb(var(--surface-sunk) / 0.06)' }}
                      onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}
                    >
                      <span className="text-[13px] shrink-0 w-[18px] text-center" aria-hidden="true">{item.emoji}</span>
                      <span className="truncate flex-1">{item.label}</span>
                      {count > 0 && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shrink-0"
                          style={{ background: STATUS.critical, color: '#fff' }}
                        >
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Who is signed in. The founder's own name, at the foot of the rail —
            identity belongs here, not competing with each page's title. */}
        <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid rgb(var(--hairline) / 0.10)' }}>
          <div className="flex items-center gap-2.5">
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-ink shrink-0"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #FB7185)' }}
              aria-hidden="true"
            >
              {initials(profile?.full_name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-ink truncate">
                {profile?.full_name ?? 'Admin'}
              </div>
              <div className="text-[10px] truncate" style={{ color: 'rgb(var(--ink-mute))' }}>
                {roleLabel(profile?.role)}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── The work ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/85 backdrop-blur-md border-b border-gray-200/70 sticky top-0 z-20">
          <div className="px-4 sm:px-7 py-3.5 flex items-start gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-500 hover:text-gray-700 p-1 mt-0.5"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>

            <div className="flex-1 min-w-0">
              {/* Breadcrumb: which subject, then which screen. Two levels is
                  enough — a third would be depth for its own sake. */}
              <div className="flex items-center gap-1 text-[11px] mb-0.5" style={{ color: INK.muted }}>
                <span>{active.groupLabel}</span>
                <ChevronRight size={11} />
                <span className="font-semibold" style={{ color: INK.secondary }}>{active.label}</span>
              </div>
              <h1 className="text-[19px] sm:text-[21px] font-bold text-gray-900 leading-tight tracking-tight truncate">
                {active.emoji} {active.title}
              </h1>
              <p className="text-[12px] mt-0.5 max-w-2xl" style={{ color: INK.secondary }}>
                {active.description}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setPaletteOpen(true)}
                title="Jump to a screen (⌘K)"
                className="hidden sm:flex p-2 rounded-xl text-gray-500 hover:text-plum-700 hover:bg-plum-50 transition-colors"
              >
                <Command size={16} />
              </button>
              <button
                onClick={onRefresh}
                disabled={refreshing}
                title="Reload everything"
                className="p-2 rounded-xl text-gray-500 hover:text-plum-700 hover:bg-plum-50 disabled:opacity-40 transition-colors"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
              {notifications}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-7 py-6 overflow-auto">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onSelect={go}
          badges={badges}
          activeNav={activeNav}
        />
      )}
    </div>
  )
}

/* ── ⌘K ────────────────────────────────────────────────────────────────── */

/**
 * Search across name, description AND group label, so a word from any of the
 * three finds the screen. "refund" is in the description of Returns & Refunds;
 * "concierge" is in the Events group hint. Neither is in a nav label, and both
 * are what somebody would actually type.
 */
function CommandPalette({ onClose, onSelect, badges, activeNav }) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = NAV.flatMap(g =>
      g.items.map(i => ({ ...i, groupLabel: g.label, groupHint: g.hint ?? '' })),
    )
    if (!q) return all
    return all.filter(i =>
      i.label.toLowerCase().includes(q) ||
      i.title.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.groupLabel.toLowerCase().includes(q) ||
      i.groupHint.toLowerCase().includes(q))
  }, [query])

  useEffect(() => { setCursor(0) }, [query])

  function onKeyDown(e) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && results[cursor]) { e.preventDefault(); onSelect(results[cursor].id) }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[80] flex items-start justify-center pt-[12vh] px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
          <Search size={16} className="text-gray-300 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a screen…"
            className="flex-1 text-sm outline-none placeholder-gray-300"
          />
          <kbd className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">esc</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm" style={{ color: INK.muted }}>
              Nothing matches “{query}”.
            </p>
          ) : (
            results.map((r, i) => {
              const count = r.badge ? badges[r.badge] ?? 0 : 0
              return (
                <button
                  key={r.id}
                  onClick={() => onSelect(r.id)}
                  onMouseEnter={() => setCursor(i)}
                  className={`w-full flex items-start gap-2.5 px-4 py-2 text-left transition-colors ${
                    i === cursor ? 'bg-plum-50' : ''
                  }`}
                >
                  <span className="text-base shrink-0 mt-0.5" aria-hidden="true">{r.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-gray-900">{r.label}</span>
                      <span className="text-[10px]" style={{ color: INK.muted }}>{r.groupLabel}</span>
                      {r.id === activeNav && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-plum-100 text-plum-700">HERE</span>
                      )}
                    </span>
                    <span className="block text-[11px] truncate" style={{ color: INK.muted }}>{r.description}</span>
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-ink shrink-0 mt-0.5"
                          style={{ background: STATUS.critical }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-3 text-[10px]"
             style={{ color: INK.muted, background: INK.plane }}>
          <span>↑↓ to move</span>
          <span>↵ to open</span>
          <span className="ml-auto">{results.length} screen{results.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  )
}

/* ── Bits ──────────────────────────────────────────────────────────────── */

function initials(name) {
  if (!name) return 'A'
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || 'A'
}

/**
 * What to call the person in the rail.
 *
 * 'admin' on this product is the founder — there is one of them, and "Admin"
 * is what a permissions table calls a person, not what a person is. The label
 * follows `profile.role` rather than being hardcoded, so a coordinator hired
 * next month is not greeted as the founder.
 */
function roleLabel(role) {
  if (role === 'admin') return 'Founder & CEO'
  if (role === 'event_coordinator') return 'Coordinator'
  return role ? role.replace(/_/g, ' ') : 'Operations'
}
