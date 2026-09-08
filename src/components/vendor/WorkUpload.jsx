import React, { useRef, useState } from 'react'
import {
  Camera, ImagePlus, Video, Loader2, X, FileText, Quote, Plus, Play,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { prepareImage } from '../../lib/imageUpload'
import { useToast, friendlyError } from '../../context/ToastContext'

/**
 * "Show them, do not describe it."
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY EVERY TRADE NEEDS THIS AND ONLY CATERING HAD IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * MenuUpload exists because a caterer already has their menu printed.
 * The same argument is true of every other trade and was never followed:
 * a photographer has a portfolio, a decorator has last Saturday's
 * mandap, a venue has the hall — and none of them could put any of it
 * on their listing.
 *
 * A family choosing between two decorators is not comparing tick boxes.
 * They are asking what it looked like. Ticks are what dispatch MATCHES
 * on; this is what wins the job once it has been matched, and a platform
 * that collects only the first is asking partners to compete with one
 * hand tied.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE KINDS, BECAUSE THEY ARE NOT THE SAME THING
 * ══════════════════════════════════════════════════════════════════════
 *
 *   photo        the work, still
 *   video        the work, moving — the most convincing thing a venue
 *                or a decorator owns, and the thing no form can capture
 *   testimonial  what a customer said. Typed, not uploaded: a
 *                screenshot of a WhatsApp message cannot be read by
 *                search, cannot be shown at a sensible size on a phone,
 *                and carries somebody else's phone number into our
 *                storage.
 *
 * ── Captions are asked for, not required ────────────────────────────
 * A folder of eighty images called IMG_2841 is not a portfolio. But a
 * partner standing in a kitchen will not caption eighty photographs, and
 * a form that insists will get eight. So the box is there, it is
 * optional, and it says what it is for.
 *
 * ── Compressed before it leaves the phone ───────────────────────────
 * Same reason as MenuUpload: a 5 MB photo over a Bengaluru mobile
 * connection is a partner watching a spinner and deciding the app is
 * broken. Video cannot be re-encoded in the browser cheaply, so it is
 * size-checked instead and refused with a number rather than a failure.
 */

const MAX_VIDEO = 40 * 1024 * 1024      // matches the bucket, migration 110

export default function WorkUpload({
  value = [], onChange, trade,
  /* What this trade's work is called, so the screen speaks the partner's
     language rather than ours. */
  copy = {},
}) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const photoIn = useRef(null)
  const cameraIn = useRef(null)
  const videoIn = useRef(null)

  const photos = value.filter(v => v.kind === 'photo' || v.kind === 'document')
  const videos = value.filter(v => v.kind === 'video')
  const words = value.filter(v => v.kind === 'testimonial')

  async function add(files, kind) {
    if (!files?.length) return
    setBusy(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sign in again to upload.')

      const added = []
      for (const file of files) {
        const isVideo = file.type.startsWith('video/')
        const isPdf = file.type === 'application/pdf'

        if (isVideo && file.size > MAX_VIDEO) {
          toast.error(`${file.name} is ${Math.round(file.size / 1048576)} MB.`
            + ' Videos have to be under 40 MB — a 30 second clip is plenty.')
          continue
        }

        /* Video and PDF go up as they are: there is nothing to compress
           in the browser without a re-encode that would take longer than
           the upload it saves. */
        const body = (isVideo || isPdf)
          ? file
          : (await prepareImage(file, { mode: 'balanced' })).blob
        const ext = isVideo ? (file.name.split('.').pop() || 'mp4')
          : isPdf ? 'pdf' : 'jpg'
        const path = `${user.id}/work/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

        const { error } = await supabase.storage
          .from('partner-uploads')
          .upload(path, body, { contentType: file.type || 'image/jpeg' })
        if (error) throw error

        added.push({
          path,
          kind: isVideo ? 'video' : isPdf ? 'document' : 'photo',
          name: file.name,
          caption: '',
        })
      }
      if (added.length) {
        onChange([...value, ...added])
        toast.success(added.length === 1 ? 'Added.' : `${added.length} added.`)
      }
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setBusy(false)
      if (photoIn.current) photoIn.current.value = ''
      if (cameraIn.current) cameraIn.current.value = ''
      if (videoIn.current) videoIn.current.value = ''
    }
  }

  async function remove(item) {
    onChange(value.filter(v => v !== item))
    if (item.path) {
      await supabase.storage.from('partner-uploads').remove([item.path]).catch(() => {})
    }
  }

  const setField = (item, field, v) =>
    onChange(value.map(x => (x === item ? { ...x, [field]: v } : x)))

  return (
    <div className="space-y-3">
      {/* ── The photographs ─────────────────────────────────────────── */}
      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <p className="text-[14px] font-extrabold leading-tight text-ink">
          {copy.photoTitle ?? 'Photographs of your work'}
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">
          {copy.photoHint ?? 'Jobs you have already done. This is what a family '
            + 'looks at before they choose, and ticks cannot do it for you.'}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            ref={photoIn} type="file" accept="image/*,application/pdf" multiple hidden
            onChange={e => add([...e.target.files], 'photo')}
          />
          <input
            ref={cameraIn} type="file" accept="image/*" capture="environment" hidden
            onChange={e => add([...e.target.files], 'photo')}
          />
          {/* Two controls, not one. `capture` REPLACES the chooser with
              the camera on Android, so a single button hides the gallery
              a partner's portfolio actually lives in. MenuUpload learnt
              this from a bug report; the same mistake is not repeated. */}
          <button
            type="button" disabled={busy} onClick={() => photoIn.current?.click()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-ink/[0.04] py-3 text-[13px] font-extrabold text-ink ring-1 ring-ink/[0.08] disabled:opacity-50"
          >
            <ImagePlus size={16} /> From gallery
          </button>
          <button
            type="button" disabled={busy} onClick={() => cameraIn.current?.click()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-ink/[0.04] py-3 text-[13px] font-extrabold text-ink ring-1 ring-ink/[0.08] disabled:opacity-50"
          >
            <Camera size={16} /> Take a photo
          </button>
        </div>

        {photos.length > 0 && (
          <div className="mt-3 space-y-2">
            {photos.map((p, i) => (
              <Row key={p.path} item={p} onRemove={remove}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink/[0.04] text-ink-mute">
                  {p.kind === 'document' ? <FileText size={16} /> : <ImagePlus size={16} />}
                </span>
                <input
                  value={p.caption ?? ''}
                  onChange={e => setField(p, 'caption', e.target.value)}
                  placeholder={copy.captionHint ?? `What is this? (optional)`}
                  className="min-w-0 flex-1 rounded-xl bg-ink/[0.02] px-3 py-2 text-[12.5px] font-semibold text-ink ring-1 ring-ink/[0.06] placeholder:font-normal placeholder:text-ink-mute"
                />
              </Row>
            ))}
          </div>
        )}
      </div>

      {/* ── The video ───────────────────────────────────────────────── */}
      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <p className="text-[14px] font-extrabold leading-tight text-ink">
          {copy.videoTitle ?? 'A short video'}
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">
          {copy.videoHint ?? 'Thirty seconds is plenty. Under 40 MB.'}
        </p>
        <input
          ref={videoIn} type="file" accept="video/*" hidden
          onChange={e => add([...e.target.files], 'video')}
        />
        <button
          type="button" disabled={busy} onClick={() => videoIn.current?.click()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink/[0.04] py-3 text-[13px] font-extrabold text-ink ring-1 ring-ink/[0.08] disabled:opacity-50"
        >
          <Video size={16} /> Add a video
        </button>

        {videos.length > 0 && (
          <div className="mt-3 space-y-2">
            {videos.map(v => (
              <Row key={v.path} item={v} onRemove={remove}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink/[0.04] text-ink-mute">
                  <Play size={16} />
                </span>
                <input
                  value={v.caption ?? ''}
                  onChange={e => setField(v, 'caption', e.target.value)}
                  placeholder="What is in it? (optional)"
                  className="min-w-0 flex-1 rounded-xl bg-ink/[0.02] px-3 py-2 text-[12.5px] font-semibold text-ink ring-1 ring-ink/[0.06] placeholder:font-normal placeholder:text-ink-mute"
                />
              </Row>
            ))}
          </div>
        )}
      </div>

      {/* ── What customers said ─────────────────────────────────────── */}
      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <p className="text-[14px] font-extrabold leading-tight text-ink">
          What your customers said
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">
          Typed, not a screenshot — a screenshot cannot be read at a
          sensible size and carries somebody else's phone number with it.
        </p>

        {words.map(w => (
          <div key={w.key} className="mt-2.5 rounded-2xl bg-ink/[0.02] p-3 ring-1 ring-ink/[0.06]">
            <div className="flex items-start gap-2">
              <Quote size={14} className="mt-1 shrink-0 text-ink-mute" />
              <textarea
                value={w.body ?? ''}
                onChange={e => setField(w, 'body', e.target.value)}
                rows={2}
                placeholder="What they said"
                className="min-w-0 flex-1 resize-none rounded-xl bg-white px-3 py-2 text-[12.5px] font-semibold text-ink ring-1 ring-ink/[0.06] placeholder:font-normal placeholder:text-ink-mute"
              />
              <button
                type="button" onClick={() => remove(w)} aria-label="Remove"
                className="mt-1 shrink-0 rounded-full p-1 text-ink-mute hover:bg-ink/[0.05]"
              >
                <X size={15} />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                value={w.said_by ?? ''}
                onChange={e => setField(w, 'said_by', e.target.value)}
                placeholder="Who said it"
                className="rounded-xl bg-white px-3 py-2 text-[12.5px] font-semibold text-ink ring-1 ring-ink/[0.06] placeholder:font-normal placeholder:text-ink-mute"
              />
              <input
                value={w.said_about ?? ''}
                onChange={e => setField(w, 'said_about', e.target.value)}
                placeholder="At what event"
                className="rounded-xl bg-white px-3 py-2 text-[12.5px] font-semibold text-ink ring-1 ring-ink/[0.06] placeholder:font-normal placeholder:text-ink-mute"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => onChange([...value, {
            kind: 'testimonial', key: `t${Date.now()}`, body: '', said_by: '', said_about: '',
          }])}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink/[0.04] py-3 text-[13px] font-extrabold text-ink ring-1 ring-ink/[0.08]"
        >
          <Plus size={16} /> Add what somebody said
        </button>
      </div>

      {busy && (
        <p className="flex items-center justify-center gap-2 text-[12.5px] font-semibold text-ink-mute">
          <Loader2 size={14} className="animate-spin" /> Uploading…
        </p>
      )}

      {/* Never a gate. A partner on a weak connection who cannot upload
          today should still be able to finish and come back. */}
      <p className="text-center text-[11.5px] leading-snug text-ink-mute">
        All of this is optional and can be added later from your listing.
      </p>
    </div>
  )
}

function Row({ item, onRemove, children }) {
  return (
    <div className="flex items-center gap-2">
      {children}
      <button
        type="button" onClick={() => onRemove(item)} aria-label={`Remove ${item.name ?? 'file'}`}
        className="shrink-0 rounded-full p-1.5 text-ink-mute hover:bg-ink/[0.05]"
      >
        <X size={15} />
      </button>
    </div>
  )
}
