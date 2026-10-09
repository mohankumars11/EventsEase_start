/**
 * Steps 1–4: who you are, what you host, what you take home, what extras
 * you sell. Each step is handed its slice of the answers and a setter.
 */
import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Camera, Plus, Youtube, Instagram, Link2, Trash2 } from 'lucide-react'
import {
  Card, Label, TextField, Chip, ChipRow, Segmented, Toggle, StopSlider, Sheet, SectionTitle,
} from './ui'
import {
  YEARS, EVENT_GROUPS, LANGUAGES, PROFICIENCY, STYLES, MIN_HOURS, MAX_HOURS, VIP_STOPS, ADDONS,
} from './options'
import { customerPaise, rupees, tierPreview } from '../../../lib/tierPackages'
import LocationAutocomplete from '../../common/LocationAutocomplete'
import WorkUpload from '../WorkUpload'
import { uploadAvatar, initialsFor } from '../../../lib/partnerAvatar'

const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/i

/* ═══ 1 · Identity & media ═══════════════════════════════════════════ */
export function IdentityStep({ value, set, vendorId }) {
  const v = value ?? {}
  const fileIn = useRef(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarErr, setAvatarErr] = useState('')

  async function pickAvatar(file) {
    if (!file) return
    setAvatarBusy(true); setAvatarErr('')
    const r = await uploadAvatar(vendorId, file)
    setAvatarBusy(false)
    if (r.ok) set({ ...v, avatar_url: r.url })
    else setAvatarErr(r.says)
  }

  return (
    <>
      <SectionTitle title="Identity & media" sub="Your public profile. This is what families and companies see first." />

      <Card>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileIn.current?.click()}
            className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-plum-100 to-plum-200 ring-4 ring-white shadow-[0_6px_20px_-8px_rgba(91,33,182,0.5)]">
            {v.avatar_url
              ? <img src={v.avatar_url} alt="" className="h-full w-full object-cover" />
              : <span className="flex h-full w-full items-center justify-center text-[24px] font-extrabold text-plum-700">
                  {initialsFor(v.stage_name || 'A M')}
                </span>}
            <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-plum-700 text-white ring-2 ring-white">
              <Camera size={14} />
            </span>
          </button>
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-ink">{avatarBusy ? 'Uploading…' : 'Profile photo'}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-ink/55">A clear, front-facing photo. Square works best.</p>
            {avatarErr && <p className="mt-1 text-[12px] font-bold text-rose-600">{avatarErr}</p>}
          </div>
          <input ref={fileIn} type="file" accept="image/*" hidden onChange={e => pickAvatar(e.target.files?.[0])} />
        </div>
      </Card>

      <Card className="mt-3">
        <Label required>Stage or brand name</Label>
        <TextField value={v.stage_name} onChange={x => set({ ...v, stage_name: x })} placeholder="e.g. Anchor Rhea Live" max={50} />
        <div className="mt-4" />
        <Label hint="One line a client remembers.">Tagline</Label>
        <TextField value={v.tagline} onChange={x => set({ ...v, tagline: x })} placeholder="High-energy wedding & corporate host" max={100} />
        <div className="mt-4" />
        <Label required hint="At least 40 characters. Experience, style, the crowd you are best with.">About you</Label>
        <TextField multiline value={v.bio} onChange={x => set({ ...v, bio: x })} max={500}
          placeholder="8 years hosting weddings and corporate galas across Karnataka…" />
      </Card>

      <Card className="mt-3">
        <Label required>Base city</Label>
        <LocationAutocomplete value={v.city} onChange={x => set({ ...v, city: x })} />
      </Card>

      <Card className="mt-3">
        <Label hint="Paste a link. A green tick means it looks right.">Showreel & socials</Label>
        {[
          ['showreel', 'YouTube showreel link', Youtube],
          ['instagram', 'Instagram profile link', Instagram],
          ['other_link', 'Any other link', Link2],
        ].map(([k, ph, Icon]) => (
          <div key={k} className="mb-2.5 flex items-center gap-2.5">
            <span className="flex h-[50px] w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4f2f9] text-plum-700"><Icon size={18} /></span>
            <div className="flex-1">
              <TextField value={v[k]} onChange={x => set({ ...v, [k]: x.trim() })} placeholder={ph} inputMode="url"
                valid={URL_RE.test(v[k] ?? '')} />
            </div>
          </div>
        ))}
      </Card>

      <div className="mt-3">
        <WorkUpload value={v.work ?? []} onChange={w => set({ ...v, work: w })} trade="Anchor & MC"
          copy={{ photoTitle: 'Stage photos', photoHint: 'Three or more. Mix formal and traditional looks.', videoTitle: 'Performance clips', videoHint: 'A short clip of you on stage.' }} />
      </div>
    </>
  )
}

export const identityDone = v =>
  !!(v?.stage_name?.trim() && (v?.bio?.trim()?.length ?? 0) >= 40 && (v?.city?.city || v?.city?.label))

/* ═══ 2 · Skills ═══════════════════════════════════════════════════════ */
export function SkillsStep({ value, set }) {
  const v = value ?? {}
  const events = v.events ?? []
  const langs = v.languages ?? []
  const [langSheet, setLangSheet] = useState(false)
  const [otherSheet, setOtherSheet] = useState(null) // group id
  const [otherText, setOtherText] = useState('')
  const [openGroups, setOpenGroups] = useState(['weddings', 'corporate'])

  const toggleEvent = id => set({ ...v, events: events.includes(id) ? events.filter(x => x !== id) : [...events, id] })
  const unused = LANGUAGES.filter(l => !langs.some(x => x.name === l))

  return (
    <>
      <SectionTitle title="Skills & languages" sub="What you host, and how. Families filter on these." />

      <Card>
        <Label required>Years on stage</Label>
        <ChipRow options={YEARS} value={v.years} onChange={x => set({ ...v, years: x })} format={x => `${x} yrs`} />
      </Card>

      <Card className="mt-3">
        <Label required right={events.length ? `${events.length} picked` : null}>Events you host</Label>
        <div className="space-y-2">
          {EVENT_GROUPS.map(g => {
            const open = openGroups.includes(g.id)
            const n = g.items.filter(i => events.includes(i.id)).length + (v.events_other?.[g.id]?.length ?? 0)
            return (
              <div key={g.id} className="overflow-hidden rounded-2xl bg-[#faf9fd] ring-1 ring-ink/[0.05]">
                <button type="button" onClick={() => setOpenGroups(o => open ? o.filter(x => x !== g.id) : [...o, g.id])}
                  className="flex w-full items-center justify-between px-3.5 py-3">
                  <span className="text-[13.5px] font-extrabold text-plum-800">{g.label}</span>
                  <span className="flex items-center gap-2">
                    {n > 0 && <span className="rounded-full bg-plum-700 px-2 py-0.5 text-[11px] font-extrabold text-white">{n}</span>}
                    <motion.span animate={{ rotate: open ? 45 : 0 }} className="text-ink/40"><Plus size={18} /></motion.span>
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="flex flex-wrap gap-2 px-3.5 pb-3.5">
                        {g.items.map(i => (
                          <Chip key={i.id} size="sm" on={events.includes(i.id)} onClick={() => toggleEvent(i.id)}>{i.label}</Chip>
                        ))}
                        {(v.events_other?.[g.id] ?? []).map(t => (
                          <Chip key={t} size="sm" on onClick={() => set({ ...v, events_other: { ...v.events_other, [g.id]: v.events_other[g.id].filter(x => x !== t) } })}>{t}</Chip>
                        ))}
                        <button type="button" onClick={() => { setOtherText(''); setOtherSheet(g.id) }}
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
        <Label required hint="How well you can hold a whole event in each.">Languages</Label>
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {langs.map((l, i) => (
              <motion.div key={l.name} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
                className="rounded-2xl bg-[#faf9fd] p-3 ring-1 ring-ink/[0.05]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[14px] font-extrabold text-ink">{l.name}</span>
                  <button type="button" aria-label={`Remove ${l.name}`} onClick={() => set({ ...v, languages: langs.filter((_, j) => j !== i) })}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink/35 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                </div>
                <Segmented id={`lang-${l.name}`} options={PROFICIENCY} value={l.level}
                  onChange={lv => set({ ...v, languages: langs.map((x, j) => j === i ? { ...x, level: lv } : x) })} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <button type="button" onClick={() => setLangSheet(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-plum-200 py-3 text-[13px] font-extrabold text-plum-700">
          <Plus size={16} /> Add language
        </button>
      </Card>

      <Card className="mt-3">
        <Label required right={`${(v.styles ?? []).length}/3`} hint="Pick up to three. This is what clients compare.">Your style</Label>
        <ChipRow multi max={3} options={STYLES} value={v.styles ?? []} onChange={x => set({ ...v, styles: x })} size="sm" />
      </Card>

      <Sheet open={langSheet} onOpenChange={setLangSheet} title="Add a language">
        <div className="flex flex-wrap gap-2">
          {unused.map(l => (
            <Chip key={l} onClick={() => { set({ ...v, languages: [...langs, { name: l, level: 'fluent' }] }); setLangSheet(false) }}>{l}</Chip>
          ))}
        </div>
        <p className="mt-4 text-[12px] font-bold text-ink/50">Not listed? Type it.</p>
        <OtherAdd onAdd={t => { if (!langs.some(x => x.name === t)) set({ ...v, languages: [...langs, { name: t, level: 'fluent' }] }); setLangSheet(false) }} />
      </Sheet>

      <Sheet open={!!otherSheet} onOpenChange={o => !o && setOtherSheet(null)} title="Add another event type">
        <OtherAdd value={otherText} setValue={setOtherText} onAdd={t => {
          const cur = v.events_other?.[otherSheet] ?? []
          if (!cur.includes(t)) set({ ...v, events_other: { ...(v.events_other ?? {}), [otherSheet]: [...cur, t] } })
          setOtherSheet(null)
        }} />
      </Sheet>
    </>
  )
}

function OtherAdd({ onAdd, value, setValue }) {
  const [own, setOwn] = useState('')
  const text = value ?? own
  const setText = setValue ?? setOwn
  const t = text.trim()
  return (
    <div className="mt-2 flex gap-2">
      <div className="flex-1"><TextField value={text} onChange={setText} placeholder="Type here" max={40} /></div>
      <button type="button" disabled={t.length < 2} onClick={() => { onAdd(t); setText('') }}
        className="h-[50px] rounded-2xl bg-plum-700 px-5 text-[13.5px] font-extrabold text-white disabled:opacity-30">Add</button>
    </div>
  )
}

export const skillsDone = v =>
  !!(v?.years && ((v?.events?.length ?? 0) + Object.values(v?.events_other ?? {}).flat().length) > 0
    && (v?.languages?.length ?? 0) > 0 && (v?.styles?.length ?? 0) > 0)

/* ═══ 3 · Pricing baseline ═════════════════════════════════════════════ */
export function PricingStep({ value, set }) {
  const v = value ?? {}
  const take = Number(v.take_home_per_hour) || 0
  const tiers = tierPreview(v)
  return (
    <>
      <SectionTitle title="Your take-home" sub="Tell us what you want to earn. We work out the customer prices." />

      <Card className="bg-gradient-to-br from-plum-700 to-plum-900 !ring-0">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-plum-200">Take-home per hour</p>
        <div className="mt-2 flex items-baseline gap-1 text-white">
          <span className="text-[30px] font-extrabold">₹</span>
          <input inputMode="numeric" value={v.take_home_per_hour ?? ''} placeholder="0"
            onChange={e => set({ ...v, take_home_per_hour: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            className="w-full bg-transparent text-[42px] font-extrabold leading-none tracking-tight text-white outline-none placeholder:text-white/30" />
        </div>
        <div className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-[12.5px] font-semibold text-plum-50">
          {take > 0
            ? <>Customer pays <b className="text-white">{rupees(customerPaise(take))}</b>/hr · you always receive <b className="text-white">₹{take.toLocaleString('en-IN')}</b></>
            : 'Sambramo adds its 8% fee on top. You always receive this amount.'}
        </div>
      </Card>

      <Card className="mt-3">
        <Label required hint="The shortest booking you will take.">Minimum booking</Label>
        <ChipRow options={MIN_HOURS} value={Number(v.min_duration_hours) || null} format={h => `${h} hr${h > 1 ? 's' : ''}`}
          onChange={h => set({ ...v, min_duration_hours: h, max_duration_hours: Math.max(Number(v.max_duration_hours) || 0, h * 2) || v.max_duration_hours })} />
        <div className="mt-5" />
        <Label required hint="Must be at least twice the minimum, so a Signature package fits.">Longest single event</Label>
        <ChipRow options={MAX_HOURS} value={Number(v.max_duration_hours) || null} format={h => `${h} hrs`}
          isDisabled={h => (Number(v.min_duration_hours) || 0) * 2 > h}
          onChange={h => set({ ...v, max_duration_hours: h })} />
      </Card>

      <Card className="mt-3">
        <Label required hint="How much more work a premium full-day event is than a normal hour.">VIP effort</Label>
        <StopSlider stops={VIP_STOPS} value={Number(v.vip_multiplier) || 4} format={x => `${x}×`}
          onChange={x => set({ ...v, vip_multiplier: x })} />
      </Card>

      <AnimatePresence>
        {tiers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-3 grid grid-cols-3 gap-2">
            {tiers.map(t => (
              <div key={t.tier} className={`rounded-2xl p-3 text-center ${t.tier === 'SIGNATURE' ? 'bg-plum-50 ring-2 ring-plum-500' : 'bg-[#faf9fd] ring-1 ring-ink/[0.06]'}`}>
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-ink/50">{t.name}</p>
                <motion.p key={t.price_paise} initial={{ scale: 0.9, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }}
                  className="mt-1 text-[15px] font-extrabold text-ink">{rupees(t.price_paise)}</motion.p>
                <p className="text-[11px] font-bold text-ink/45">{t.duration_hours} hrs</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export const pricingDone = v => tierPreview(v ?? {}).length === 3
  && (Number(v.max_duration_hours) >= Number(v.min_duration_hours) * 2)

/* ═══ 4 · Add-ons ══════════════════════════════════════════════════════ */
export function AddonsStep({ value, set }) {
  const v = value ?? {}
  const on = v.on ?? {}
  return (
    <>
      <SectionTitle title="Add-ons & extras" sub="Switch on what you offer. Clients add these to any package." />
      <div className="space-y-2.5">
        {ADDONS.map(a => {
          const active = a.id in on
          return (
            <motion.div key={a.id} layout
              className={`rounded-[20px] p-3.5 transition-colors ${active ? 'bg-white ring-2 ring-forest-500/60' : 'bg-white ring-1 ring-ink/[0.07]'}`}>
              <div className="flex items-center justify-between gap-3">
                <span className={`text-[13.5px] font-extrabold ${active ? 'text-ink' : 'text-ink/70'}`}>{a.label}</span>
                <Toggle on={active} label={a.label} onChange={x => {
                  const next = { ...on }
                  if (x) next[a.id] = String(a.suggest); else delete next[a.id]
                  set({ ...v, on: next })
                }} />
              </div>
              <AnimatePresence initial={false}>
                {active && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[12px] font-bold text-ink/50">Your fee</span>
                      <div className="flex-1"><TextField prefix="₹" inputMode="numeric" value={on[a.id]}
                        onChange={x => set({ ...v, on: { ...on, [a.id]: x.replace(/\D/g, '').slice(0, 6) } })} /></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      <Card className="mt-4 bg-amber-50/60 !ring-amber-200">
        <Label required hint="Charged per extra hour beyond the package. Protects your time.">Overtime rate</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1"><TextField prefix="₹" inputMode="numeric" value={v.overtime}
            onChange={x => set({ ...v, overtime: x.replace(/\D/g, '').slice(0, 6) })} placeholder="5000" /></div>
          <span className="text-[12.5px] font-bold text-ink/50">per hour</span>
        </div>
      </Card>
    </>
  )
}

export const addonsDone = v => Number(v?.overtime) > 0
  && Object.values(v?.on ?? {}).every(f => String(f).trim() !== '' && Number(f) >= 0)

