/**
 * "Make it yours": any design in any of the palettes, in any of the
 * fonts, previewed live on the card above. Used by the invitation
 * builder's design sheet and by the edit screen.
 *
 *   <LookPicker base={template} look={{ pal, font }} onChange={look => …} />
 */
import { Check } from 'lucide-react'
import { FONTS, PALETTES } from '../data/inviteTemplates'
import { FONT } from './InviteCard'

export default function LookPicker({ base, look, onChange, only = null }) {
  return (
    <div data-look-picker>
      {only !== 'fonts' && <>
      {!only && <p className="text-[13.5px] font-extrabold text-[#1C1033]">Colours</p>}
      <div className={'cx-noscroll -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 ' + (only ? '' : 'mt-2')}>
        <Swatch on={!look.pal} onClick={() => onChange({ ...look, pal: null })} label="Original" style={{ background: base.bg }} />
        {PALETTES.map(p => (
          <Swatch key={p.id} on={look.pal === p.id} onClick={() => onChange({ ...look, pal: p.id })} label={p.name}
            style={{ background: `linear-gradient(135deg, ${p.swatch[0]} 0 55%, ${p.swatch[1]} 55% 100%)` }} />
        ))}
      </div>
      </>}
      {only !== 'colours' && <>
      {!only && <p className="mt-3 text-[13.5px] font-extrabold text-[#1C1033]">Font style</p>}
      <div className={'cx-noscroll -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 ' + (only ? '' : 'mt-2')}>
        {[[null, 'Original'], ...FONTS].map(([id, l]) => {
          const on = (look.font ?? null) === id
          return (
            <button key={l} type="button" onClick={() => onChange({ ...look, font: id })} aria-pressed={on} data-font={id ?? 'original'}
              className={'cx-press flex h-[62px] w-[76px] shrink-0 flex-col items-center justify-center rounded-[14px] transition ' + (on ? 'bg-[#F3ECFF] shadow-[inset_0_0_0_2px_#7C3AED]' : 'bg-[#F6F3FA]')}>
              <span className="text-[22px] leading-none text-[#1C1033]" style={{ fontFamily: FONT[id ?? base.font] }}>Aa</span>
              <span className={'mt-1 text-[10.5px] font-extrabold ' + (on ? 'text-[#5B21B6]' : 'text-[var(--ink-3)]')}>{l}</span>
            </button>
          )
        })}
      </div>
      </>}
    </div>
  )
}

function Swatch({ on, onClick, label, style }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={label} className="cx-press flex w-[56px] shrink-0 flex-col items-center gap-1" data-swatch={label}>
      <span className={'relative grid h-11 w-11 place-items-center rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)] transition ' + (on ? 'ring-[2.5px] ring-[#7C3AED] ring-offset-2' : '')} style={style}>
        {on && <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[#7C3AED] shadow"><Check size={12} strokeWidth={3.4} /></span>}
      </span>
      <span className={'line-clamp-2 text-center text-[10px] font-extrabold leading-tight ' + (on ? 'text-[#5B21B6]' : 'text-[var(--ink-3)]')}>{label}</span>
    </button>
  )
}
