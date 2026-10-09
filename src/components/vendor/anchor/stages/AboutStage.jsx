/**
 * Stage 1 · About you.
 *
 * The public face (name, role, tagline, bio, years, photos, links) and,
 * apart from it, the legal name, which is stored in an owner-only table
 * and never shown to customers. A performance video is either a link
 * (validated, openable) or an upload; neither pretends to be the other.
 */
import { useRef, useState } from 'react'
import { Camera, Youtube, Instagram, Linkedin, Music, ExternalLink, Lock } from 'lucide-react'
import { Card, Label, TextField, ChipRow, Segmented, SectionTitle } from '../ui'
import { ROLES, YEARS } from '../options'
import WorkUpload from '../../WorkUpload'
import { uploadAvatar, initialsFor } from '../../../../lib/partnerAvatar'

const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/i
const VIDEO_RE = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\/\S+$/i

function LinkRow({ icon: Icon, value, onChange, placeholder, test = URL_RE }) {
  const ok = test.test(value ?? '')
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="flex h-[50px] w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4f2f9] text-plum-700"><Icon size={18} /></span>
      <div className="min-w-0 flex-1"><TextField value={value} onChange={x => onChange(x.trim())} placeholder={placeholder} inputMode="url" valid={ok} /></div>
      {ok && (
        <a href={value} target="_blank" rel="noreferrer" aria-label="Open link"
          className="flex h-[50px] w-11 shrink-0 items-center justify-center rounded-2xl bg-plum-50 text-plum-700"><ExternalLink size={16} /></a>
      )}
    </div>
  )
}

export default function AboutStage({ value, set, vendorId }) {
  const v = value ?? {}
  const fileIn = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [videoMode, setVideoMode] = useState(v.video_upload ? 'upload' : 'link')

  async function pickAvatar(file) {
    if (!file) return
    setBusy(true); setErr('')
    const r = await uploadAvatar(vendorId, file)
    setBusy(false)
    if (r.ok) set({ ...v, avatar_url: r.url }); else setErr(r.says)
  }

  return (
    <>
      <SectionTitle title="About you" sub="What customers see first. Your legal name stays private." />

      <Card>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileIn.current?.click()}
            className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-plum-100 to-plum-200 ring-4 ring-white shadow-[0_6px_20px_-8px_rgba(91,33,182,0.5)]">
            {v.avatar_url
              ? <img src={v.avatar_url} alt="" className="h-full w-full object-cover" />
              : <span className="flex h-full w-full items-center justify-center text-[24px] font-extrabold text-plum-700">{initialsFor(v.stage_name || 'A M')}</span>}
            <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-plum-700 text-white ring-2 ring-white"><Camera size={14} /></span>
          </button>
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-ink">{busy ? 'Uploading…' : 'Profile photo'}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-ink/55">Clear and front-facing. Cropped to a circle.</p>
            {err && <p className="mt-1 text-[12px] font-bold text-rose-600">{err}</p>}
          </div>
          <input ref={fileIn} type="file" accept="image/*" hidden onChange={e => pickAvatar(e.target.files?.[0])} />
        </div>
      </Card>

      <Card className="mt-3">
        <Label required>Name customers see</Label>
        <TextField value={v.stage_name} onChange={x => set({ ...v, stage_name: x })} placeholder="e.g. Anchor Rhea Live" max={50} />
        <div className="mt-4" />
        <Label required>You are</Label>
        <ChipRow options={ROLES.map(r => r.id)} value={v.role} format={id => ROLES.find(r => r.id === id).label}
          onChange={x => set({ ...v, role: x })} />
        {v.role === 'other' && <div className="mt-2"><TextField value={v.role_other} onChange={x => set({ ...v, role_other: x })} placeholder="e.g. Quizmaster" max={40} /></div>}
        <div className="mt-4" />
        <Label required>Years hosting events</Label>
        <ChipRow options={YEARS} value={v.years} onChange={x => set({ ...v, years: x })} format={x => `${x} yrs`} />
        <div className="mt-4" />
        <Label hint="One line a client remembers.">Tagline</Label>
        <TextField value={v.tagline} onChange={x => set({ ...v, tagline: x })} placeholder="High-energy wedding & corporate host" max={100} />
        <div className="mt-4" />
        <Label required hint="At least 40 characters. Experience, style, the crowd you are best with.">Tell customers about yourself</Label>
        <TextField multiline value={v.bio} onChange={x => set({ ...v, bio: x })} max={500}
          placeholder="8 years hosting weddings and corporate galas across Karnataka…" />
      </Card>

      <Card className="mt-3 bg-[#faf9fd]">
        <Label required hint="As on your PAN. Only Sambramo sees this.">
          <span className="inline-flex items-center gap-1.5"><Lock size={13} className="text-ink/45" />Legal name</span>
        </Label>
        <TextField value={v.legal_name} onChange={x => set({ ...v, legal_name: x })} placeholder="Full legal name" max={80} />
      </Card>

      <Card className="mt-3">
        <Label required>Performance video</Label>
        <Segmented id="video-mode" value={videoMode} onChange={setVideoMode}
          options={[{ value: 'link', label: 'YouTube / Vimeo link' }, { value: 'upload', label: 'Upload video' }]} />
        <div className="mt-3">
          {videoMode === 'link'
            ? <LinkRow icon={Youtube} value={v.video_url} test={VIDEO_RE} placeholder="https://youtube.com/watch?v=…" onChange={x => set({ ...v, video_url: x })} />
            : <p className="text-[12px] leading-snug text-ink/55">Add it under Performance clips below. It uploads to Sambramo, not YouTube.</p>}
        </div>
        <div className="mt-4" />
        <Label hint="Optional.">Audio sample & profiles</Label>
        <LinkRow icon={Music} value={v.audio_url} placeholder="Audio sample link (SoundCloud, Drive…)" onChange={x => set({ ...v, audio_url: x })} />
        <LinkRow icon={Instagram} value={v.instagram} placeholder="Instagram profile link" onChange={x => set({ ...v, instagram: x })} />
        <LinkRow icon={Linkedin} value={v.linkedin} placeholder="LinkedIn profile link" onChange={x => set({ ...v, linkedin: x })} />
      </Card>

      <div className="mt-3">
        <WorkUpload value={v.work ?? []} onChange={w => set({ ...v, work: w, video_upload: w.some(x => x.kind === 'video') })} trade="Anchor & MC"
          copy={{ photoTitle: 'Stage photos', photoHint: 'Three to six. Mix formal and traditional looks.', videoTitle: 'Performance clips', videoHint: 'Upload a clip if you have no YouTube link.' }} />
      </div>
    </>
  )
}

export const aboutDone = v => !!(v?.stage_name?.trim() && v?.role && v?.years
  && (v?.bio?.trim()?.length ?? 0) >= 40 && v?.legal_name?.trim()
  && (VIDEO_RE.test(v?.video_url ?? '') || v?.video_upload))
