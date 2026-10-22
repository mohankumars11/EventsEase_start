/** One category: its featured occasions as tiles, then every occasion in it. */
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { CATEGORY, occasionLine } from '../data/occasions'
import { photoFor } from '../data/photos.generated'
import { OccasionTile } from '../ui/cards'
import { BackHeader, Photo, SectionHead } from '../ui/kit'

export default function Category() {
  const { categoryId } = useParams()
  const c = CATEGORY[categoryId]
  if (!c) return <Navigate to="/" replace />
  const p = photoFor(`cat:${c.id}`)
  const featured = c.occasions.filter(o => o.featured)
  return (
    <main className="cx-enter cx-bottom-pad-bar">
      <div className="relative">
        <div className="cx-tile cx-scrim-strong aspect-[5/4] !rounded-none !rounded-b-[32px]" style={{ '--tone': p?.tone }}>
          <Photo src={p?.url} alt={p?.alt} eager />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-white/75">{c.occasions.length} occasions</p>
            <h1 className="cx-display mt-1 text-[32px]">{c.label}</h1>
            <p className="mt-1.5 text-[13.5px] font-semibold text-white/85">{c.line}</p>
          </div>
        </div>
        <div className="absolute inset-x-0 top-0"><BackHeader transparent /></div>
      </div>

      {featured.length > 0 && (
        <>
          <SectionHead className="mt-6" title="Start here" sub="The ones families plan most" />
          <div className="grid grid-cols-2 gap-3 px-4">{featured.map(o => <OccasionTile key={o.id} occasion={o} />)}</div>
        </>
      )}

      <SectionHead className="mt-8" title={`All ${c.occasions.length}`} sub="Each one planned to exactly what it needs" />
      <ul className="mx-4 overflow-hidden rounded-[24px] shadow-[0_0_0_1px_var(--line)]">
        {c.occasions.map((o, i) => {
          const thumb = photoFor(o.id) ?? photoFor(`trade:${o.must[0]}`)
          return (
            <li key={o.id} className={i ? 'border-t border-[var(--line)]' : ''}>
              <Link to={`/o/${o.id}`} className="cx-press flex items-center gap-3 bg-white px-3 py-2.5 active:bg-[var(--soft)]" data-occasion-row={o.id}>
                <span className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[15px] bg-[var(--soft)]">
                  <Photo src={thumb?.url} className="absolute inset-0 h-full w-full object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold tracking-[-0.015em]">{o.name}</span>
                  <span className="block truncate text-[12px] font-semibold text-[var(--ink-3)]">{occasionLine(o)}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-[var(--ink-3)]" />
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
