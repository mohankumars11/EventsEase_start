/**
 * The customer's brief, as a master reads it (2026-11-02): every choice on
 * its own line — food, meal, how it is served, the menu course by course,
 * the theme, colours, the name board, the cake — and the reference
 * photographs the customer picked, shown as pictures rather than links.
 *
 * The customer app writes the brief as "A · B · C" (customer/lib/brief.js);
 * a reference is "(reference: pexels.com/photo/<id>)" for a Sambramo
 * inspiration photo, or a plain https link for a photo the customer
 * uploaded. Contact details never reach here: notes are scrubbed on write
 * (migrations 068/073).
 */
const PEXELS = /\(reference: pexels\.com\/photo\/(\d+)\)/g
const LINK = /\(reference: (https:\/\/[^\s)]+)\)/g

export default function BriefNote({ text, className = '' }) {
  if (!text) return null
  const photos = [
    ...[...text.matchAll(PEXELS)].map(m => ({ key: m[1], src: `https://images.pexels.com/photos/${m[1]}/pexels-photo-${m[1]}.jpeg?auto=compress&cs=tinysrgb&w=320` })),
    ...[...text.matchAll(LINK)].map(m => ({ key: m[1], src: m[1] })),
  ]
  const lines = text.replace(PEXELS, '').replace(LINK, '').split(' · ').map(x => x.replace(/^Needs: /, '').trim()).filter(Boolean)
  return (
    <div className={'rounded-2xl bg-surface p-3 ' + className} data-brief>
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-ink-mute">What the customer wants</p>
      <ul className="mt-1.5 space-y-1">
        {lines.map((l, i) => <li key={i} className="text-[12.5px] leading-snug text-ink-soft">{l}</li>)}
      </ul>
      {photos.length > 0 && (
        <div className="mt-2.5 flex gap-2 overflow-x-auto" data-brief-photos>
          {photos.map(p => <img key={p.key} src={p.src} alt="Customer’s reference" loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover" />)}
        </div>
      )}
    </div>
  )
}
