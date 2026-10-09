/**
 * An Anchor & MC partner as a customer sees them.
 *
 * Built only from PUBLIC fields: the listing version's profile and its
 * live packages. Legal name, bank details, documents and review notes are
 * not in that data at all, so they cannot leak through this card. Used by
 * the partner's "Preview my customer profile" and by the customer page.
 */
import { Languages, MapPin, Users, Star, Youtube, Check, Crown } from 'lucide-react'
import { rupees } from '../../lib/tierPackages'
import { EVENT_GROUPS_V3 } from '../vendor/anchor/options'

const EVENT_LABEL = Object.fromEntries(EVENT_GROUPS_V3.flatMap(g => g.items.map(i => [i.id, i.label])))
const ROLE = { anchor: 'Anchor', mc: 'MC', both: 'Anchor & MC' }

export default function AnchorProfileCard({ profile = {}, packages = [], city, rating, onPick, selectedTier }) {
  const p = profile
  return (
    <div className="overflow-hidden rounded-[26px] bg-white ring-1 ring-ink/[0.07]">
      <div className="bg-gradient-to-br from-plum-700 to-plum-950 p-5 text-white">
        <div className="flex items-center gap-3.5">
          <span className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white/15 ring-2 ring-white/40">
            {p.avatar_url
              ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
              : <span className="flex h-full w-full items-center justify-center text-[20px] font-extrabold">{(p.stage_name ?? '?').slice(0, 2).toUpperCase()}</span>}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[18px] font-extrabold">{p.stage_name}</p>
            <p className="text-[12.5px] text-plum-100">{p.role === 'other' ? p.role_other : ROLE[p.role] ?? 'Anchor & MC'} · {p.years} yrs</p>
            {rating ? <p className="mt-0.5 flex items-center gap-1 text-[12px] font-bold text-amber-300"><Star size={12} fill="currentColor" />{rating}</p> : null}
          </div>
        </div>
        {p.tagline && <p className="mt-3 text-[13px] font-semibold text-plum-50">{p.tagline}</p>}
      </div>

      <div className="space-y-2 p-4 text-[12.5px] text-ink/75">
        {p.bio && <p className="leading-relaxed text-ink/70">{p.bio}</p>}
        {city && <p className="flex items-center gap-2"><MapPin size={14} className="text-plum-600" />{city}</p>}
        {p.languages?.length > 0 && <p className="flex items-center gap-2"><Languages size={14} className="text-plum-600" />{p.languages.map(l => l.name).join(' · ')}</p>}
        {p.max_audience && <p className="flex items-center gap-2"><Users size={14} className="text-plum-600" />Up to {Number(p.max_audience).toLocaleString('en-IN')} guests</p>}
        {p.video_url && <a href={p.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-bold text-plum-700"><Youtube size={14} />Watch performance video</a>}
        {p.events?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {p.events.slice(0, 8).map(e => <span key={e} className="rounded-full bg-plum-50 px-2.5 py-1 text-[11px] font-bold text-plum-800">{EVENT_LABEL[e] ?? e}</span>)}
          </div>
        )}
      </div>

      {packages.length > 0 && (
        <div className="space-y-2 border-t border-ink/[0.06] p-4">
          {packages.map(k => {
            const sel = selectedTier === k.tier
            return (
              <button key={k.tier} type="button" disabled={!onPick} onClick={() => onPick?.(k)}
                className={`relative w-full rounded-2xl p-3.5 text-left transition ${sel ? 'bg-plum-50 ring-2 ring-plum-600' : 'bg-[#faf9fd] ring-1 ring-ink/[0.06]'}`}>
                {k.tier === 'SIGNATURE' && <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-plum-700 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white"><Crown size={10} />Popular</span>}
                <p className="text-[14px] font-extrabold text-ink">{k.name}</p>
                <p className="text-[11.5px] font-bold text-ink/50">{k.hours} hours</p>
                <p className="mt-1.5 text-[20px] font-extrabold text-ink">{rupees(k.customer_paise)}</p>
                {k.inclusions?.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {k.inclusions.map(i => <p key={i} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink/70"><Check size={11} className="text-forest-600" strokeWidth={3} />{i}</p>)}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
