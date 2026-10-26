/**
 * One category: every occasion in it, as 3D illustrated cards, three
 * across. The ones families plan most come first; the rest keep the
 * catalogue's order.
 */
import { Navigate, useParams } from 'react-router-dom'
import { CATEGORY } from '../data/occasions'
import { categoryArt } from '../data/art'
import { BackHeader } from '../ui/kit'
import { ArtFill, OccasionCard, Rotator } from '../ui/art'

export default function Category() {
  const { categoryId } = useParams()
  const c = CATEGORY[categoryId]
  if (!c) return <Navigate to="/" replace />
  const list = [...c.occasions.filter(o => o.featured), ...c.occasions.filter(o => !o.featured)]
  return (
    <main className="cx-enter cx-cream min-h-[100dvh] cx-bottom-pad-bar">
      <BackHeader title={c.short} sub={`${c.occasions.length} occasions`} />
      <section className="relative mx-3 mt-1 flex h-[118px] items-center overflow-hidden rounded-[22px]" style={{ background: c.tone }}>
        <div className="relative z-10 max-w-[58%] pl-4">
          <p className="text-[19px] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#1E0B4B]">What are you celebrating?</p>
          <p className="mt-1 text-[12px] font-extrabold text-[#0B6B3D]"><Rotator items={['Ready to book in minutes', 'Enjoy 10% off your first', 'Every master in one plan']} every={2600} /></p>
          <p className="mt-1 text-[11.5px] font-semibold leading-snug text-[#5B4A86]">{c.line}</p>
        </div>
        <ArtFill art={categoryArt(c)} tone="transparent" className="absolute bottom-0 right-0 h-full w-[46%] [mask-image:linear-gradient(90deg,transparent_0%,#000_30%)]" inset="8%" />
      </section>
      <div className="mt-5 grid grid-cols-3 gap-2 px-3">
        {list.map((o, i) => <OccasionCard key={o.id} occasion={o} index={i} />)}
      </div>
    </main>
  )
}
