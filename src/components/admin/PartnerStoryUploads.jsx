import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * Upload the slides the partner app shows in its four guide stories.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FOUR KEYS COME FROM THE APP, NOT FROM HERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * PartnerStories.jsx hardcodes four stories whose ids are repeated
 * below and again in migration 170's CHECK constraint. They are not a
 * taxonomy this screen invented and they are not editable here: a fifth
 * story is a change to the partner app.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS SCREEN WILL AND WILL NOT CLAIM
 * ══════════════════════════════════════════════════════════════════════
 *
 * It can prove a row was written and an object was stored. It cannot
 * prove a given phone has fetched it: PartnerStories.jsx reads the
 * table when the Jobs tab mounts, not continuously. So the banner says
 * "next time a partner opens the Jobs tab" and nothing here says
 * "live" — a screen that promised instant would be the reason someone
 * stares at an open app waiting for a card that arrives on next open.
 *
 * ══════════════════════════════════════════════════════════════════════
 * UPLOAD ORDER: OBJECT FIRST, ROW SECOND
 * ══════════════════════════════════════════════════════════════════════
 *
 * Copied from src/lib/partnerDocuments.js. If the row insert fails the
 * object is deleted, because an orphaned row pointing at nothing renders
 * as a broken slide, whereas an orphaned object is invisible and cheap.
 */

/* Labels and order are the partner app's rail, left to right. `key` is
   what the table's CHECK accepts — see SLIDE_KEY in PartnerStories.jsx.
   `live-tracking` is the key that holds "Jobs received": the two names
   were written by different hands, and the operator should only ever
   see the one the partner sees. */
export const STORIES = [
  { key: 'instant-booking', label: 'Instant bookings', blurb: 'From discovery to booking' },
  { key: 'live-tracking', label: 'Jobs received', blurb: 'Every detail in one place' },
  { key: 'start-trip', label: 'Start your trip', blurb: 'Keep the customer in the loop' },
  { key: 'event-complete', label: 'Event done · Payment', blurb: 'Wrap up with confidence' },
]

const BUCKET = 'partner-story-media'
const MAX_BYTES = 40 * 1024 * 1024

const kindOf = file =>
  file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : null

const extOf = (file) => {
  const fromName = (file.name.split('.').pop() || '').toLowerCase()
  if (fromName && fromName.length <= 5) return fromName
  return file.type.split('/')[1] || 'bin'
}

const prettyBytes = n =>
  n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`

/* The table stores a full public URL. Deleting the object needs the
   key back, which is everything after `/<bucket>/`. */
function pathOf(url) {
  const marker = `/${BUCKET}/`
  const i = String(url || '').indexOf(marker)
  return i === -1 ? null : String(url).slice(i + marker.length)
}

function publicUrl(path) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
}

export default function PartnerStoryUploads() {
  const [storyKey, setStoryKey] = useState(STORIES[0].key)
  const [slides, setSlides] = useState(null)
  const [error, setError] = useState(null)
  const [migrationMissing, setMigrationMissing] = useState(false)

  const [queue, setQueue] = useState([])
  const [heading, setHeading] = useState('')
  const [body, setBody] = useState('')
  const [publishNow, setPublishNow] = useState(true)
  const [busy, setBusy] = useState(null)
  const [done, setDone] = useState(null)
  const fileInput = useRef(null)

  const [editing, setEditing] = useState(null)       // slide id being renamed
  const [draft, setDraft] = useState({ title: '', description: '' })
  const [showArchived, setShowArchived] = useState(false)
  const [history, setHistory] = useState(null)       // slide id -> events, or null
  const [historyFor, setHistoryFor] = useState(null)
  const [hasHistory, setHasHistory] = useState(true) // until 171 says otherwise

  const load = useCallback(async () => {
    setError(null)
    /* `deleted_at` only exists once 171 is pasted. Asking for a column
       that is not there fails the whole select with 42703, so the
       narrower select is the fallback and archiving is hidden. */
    const COLS = 'id, story_key, position, title, description, media_url, media_type, is_published, created_at'
    let { data, error: e } = await supabase
      .from('partner_story_slides')
      .select(`${COLS}, deleted_at`)
      .order('story_key', { ascending: true })
      .order('position', { ascending: true })

    if (e && (e.code === '42703' || /deleted_at/.test(e.message || ''))) {
      setHasHistory(false)
      ;({ data, error: e } = await supabase
        .from('partner_story_slides')
        .select(COLS)
        .order('story_key', { ascending: true })
        .order('position', { ascending: true }))
    } else if (!e) {
      setHasHistory(true)
    }

    if (e) {
      /* 42P01 is "relation does not exist" — 169 is not pasted yet. That
         is a different sentence from "no slides", and an operator who
         cannot tell them apart will wait for an upload that can never
         succeed. */
      const missing = e.code === '42P01' || /does not exist/i.test(e.message || '')
      setMigrationMissing(missing)
      setError(missing ? null : (e.message || 'Could not read the slides.'))
      setSlides([])
      return
    }
    setMigrationMissing(false)
    setSlides(data ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  const forStory = useMemo(
    () => (slides ?? []).filter(s => s.story_key === storyKey && (showArchived ? s.deleted_at : !s.deleted_at)),
    [slides, storyKey, showArchived],
  )
  const archivedCount = useMemo(
    () => (slides ?? []).filter(s => s.story_key === storyKey && s.deleted_at).length,
    [slides, storyKey],
  )

  function addFiles(fileList) {
    const picked = Array.from(fileList || []).map(file => {
      const kind = kindOf(file)
      const error = !kind ? 'Not an image or a video.'
        : file.size > MAX_BYTES ? `${prettyBytes(file.size)} — the bucket limit is 40 MB.`
          : null
      return { file, kind, error }
    })
    setDone(null)
    setQueue(q => [...q, ...picked])
  }

  async function upload() {
    const good = queue.filter(q => !q.error)
    if (!good.length) return
    setBusy('uploading'); setError(null); setDone(null)

    const nextPosition = forStory.reduce((m, s) => Math.max(m, s.position ?? 0), -1) + 1
    let written = 0

    for (const [i, item] of good.entries()) {
      const path = `${storyKey}/${Date.now()}-${i}.${extOf(item.file)}`

      const put = await supabase.storage.from(BUCKET)
        .upload(path, item.file, { contentType: item.file.type, upsert: false })
      if (put.error) { setError(`Upload failed: ${put.error.message}`); break }

      setBusy('saving')
      const row = await supabase.from('partner_story_slides').insert({
        story_key: storyKey,
        position: nextPosition + i,
        /* title and description are NOT NULL in the live table, so an
             empty box becomes a dash rather than a failed insert. */
        title: heading.trim() || '—',
        description: body.trim() || '—',
        media_url: publicUrl(path) ?? path,
        media_type: item.kind,
        is_published: publishNow,
      })

      if (row.error) {
        /* The object is live and nothing points at it. Remove it rather
           than leaving a file nobody can find. */
        await supabase.storage.from(BUCKET).remove([path])
        /* 23514 here means one thing only: the live CHECK on story_key
           still predates 170, so three of the four app ids are refused.
           The raw message does not say that, and an operator reading it
           would think their file was wrong. */
        setError(row.error.code === '23514'
          ? `“${story.label}” is not accepted by the database yet. Paste supabase/migrations/170_partner_story_alignment.sql — it widens story_key to the four ids the partner app uses.`
          : `Stored the file but not the slide: ${row.error.message}`)
        break
      }
      written += 1
      setBusy('uploading')
    }

    setBusy(null)
    if (written) {
      const label = STORIES.find(s => s.key === storyKey).label
      setDone(`${written} slide${written === 1 ? '' : 's'} added to ${label}.`)
      setQueue([]); setHeading(''); setBody('')
      if (fileInput.current) fileInput.current.value = ''
      load()
    }
  }

  async function setPublished(slide, next) {
    const { error: e } = await supabase
      .from('partner_story_slides')
      .update({ is_published: next, updated_at: new Date().toISOString() })
      .eq('id', slide.id)
    if (e) { setError(e.message); return }
    load()
  }

  /* Rename / retitle. The trigger in 171 records the before and after,
     so there is no need to write a history row from here. */
  async function saveEdit(slide) {
    const title = draft.title.trim() || '—'
    const description = draft.description.trim() || '—'
    if (title === slide.title && description === slide.description) { setEditing(null); return }
    const { error: e } = await supabase
      .from('partner_story_slides')
      .update({ title, description, updated_at: new Date().toISOString() })
      .eq('id', slide.id)
    if (e) { setError(e.message); return }
    setEditing(null)
    setDone('Renamed.')
    load()
  }

  /* Archive, not delete.
     The media object is kept: restoring a row that points at a deleted
     file would restore a broken card. `is_published` goes false in the
     same update because the APKs already on phones filter on that
     column alone and would keep showing an archived card otherwise. */
  async function archive(slide) {
    if (!hasHistory) {
      setError('Archiving needs migration 171. Paste supabase/migrations/171_partner_story_history.sql first.')
      return
    }
    const { error: e } = await supabase
      .from('partner_story_slides')
      .update({ deleted_at: new Date().toISOString(), is_published: false, updated_at: new Date().toISOString() })
      .eq('id', slide.id)
    if (e) { setError(e.message); return }
    setDone('Moved to archive. It is in the history and can be restored.')
    load()
  }

  async function restore(slide) {
    const { error: e } = await supabase
      .from('partner_story_slides')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', slide.id)
    if (e) { setError(e.message); return }
    setDone('Restored as a draft. Publish it when you want partners to see it.')
    load()
  }

  async function openHistory(slide) {
    setHistoryFor(slide.id); setHistory(null); setError(null)
    const { data, error: e } = await supabase
      .from('partner_story_slide_events')
      .select('id, action, changed, at')
      .eq('slide_id', slide.id)
      .order('at', { ascending: false })
    if (e) {
      setError(/does not exist/i.test(e.message || '')
        ? 'History needs migration 171. Paste supabase/migrations/171_partner_story_history.sql first.'
        : e.message)
      setHistoryFor(null)
      return
    }
    setHistory(data ?? [])
  }

  if (slides === null) return <p className="p-6 text-sm text-gray-500">Loading story slides…</p>

  const story = STORIES.find(s => s.key === storyKey)
  const ready = queue.some(q => !q.error) && !busy

  return (
    <div className="space-y-6 p-1">
      <header>
        <h2 className="text-[20px] font-bold text-gray-900">Partner story uploads</h2>
        <p className="mt-1 text-[13px] text-gray-500">
          The four guide stories a partner sees on the Jobs tab. Upload a photo, a reel or a video to any of them.
        </p>
      </header>

      {migrationMissing && (
        <p className="rounded-xl bg-amber-50 p-3 text-[13px] text-amber-900 ring-1 ring-amber-200">
          <b>Migration 170 is not applied yet.</b> Paste <code>supabase/migrations/170_partner_story_alignment.sql</code> into
          the Supabase SQL editor. Until then nothing can be uploaded, and this list is empty because the table does
          not exist — not because there are no slides.
        </p>
      )}

      <p className="rounded-xl bg-sky-50 p-3 text-[13px] text-sky-900 ring-1 ring-sky-200">
        <b>Published slides reach the partner app</b> the next time a partner opens the Jobs tab — no new APK.
        Drafts stay hidden. Needs the APK built from commit e0d762c or later; Build #755 cannot show them.
        {!hasHistory && <> <b>Archive and history need migration 171</b> — paste{' '}
        <code>supabase/migrations/171_partner_story_history.sql</code>; until then a slide can only be unpublished.</>}
      </p>

      {error && (
        <p className="rounded-xl bg-rose-50 p-3 text-[13px] text-rose-900 ring-1 ring-rose-200">{error}</p>
      )}
      {done && (
        <p className="rounded-xl bg-emerald-50 p-3 text-[13px] text-emerald-900 ring-1 ring-emerald-200">{done}</p>
      )}

      <nav className="flex flex-wrap gap-2">
        {STORIES.map(s => {
          /* Live slides only. Counting archived rows here made the tab
             read 3 while the list below it read 2. */
          const n = (slides ?? []).filter(x => x.story_key === s.key && !x.deleted_at).length
          const on = s.key === storyKey
          return (
            <button
              key={s.key} type="button" onClick={() => { setStoryKey(s.key); setDone(null) }}
              className={`rounded-xl px-3 py-2 text-left text-[13px] font-semibold ring-1 transition ${on
                ? 'bg-violet-50 text-violet-900 ring-violet-300'
                : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'}`}
            >
              {s.label}
              <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${on
                ? 'bg-violet-200 text-violet-900' : 'bg-gray-100 text-gray-500'}`}
              >{n}</span>
            </button>
          )
        })}
      </nav>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Add to “{story.label}”
        </h3>
        <p className="mt-1 text-[12px] text-gray-500">{story.blurb}</p>

        <input
          ref={fileInput} type="file" multiple
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
          onChange={e => addFiles(e.target.files)}
          className="mt-3 block w-full text-[13px] text-gray-600 file:mr-3 file:rounded-xl file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-white hover:file:bg-violet-700"
        />
        <p className="mt-1.5 text-[12px] text-gray-400">
          Photos, reels and videos. JPG, PNG, WebP, GIF, MP4, MOV, WebM — up to 40 MB each. Pick several at once.
        </p>

        {queue.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {queue.map((q, i) => (
              <li
                key={i}
                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[13px] ring-1 ${q.error
                  ? 'bg-rose-50 text-rose-900 ring-rose-200' : 'bg-gray-50 text-gray-700 ring-gray-200'}`}
              >
                <span className="min-w-0 flex-1 truncate">
                  <b className="font-semibold">{q.file.name}</b>
                  <span className="ml-2 text-gray-500">
                    {q.kind === 'video' ? 'Video' : q.kind === 'image' ? 'Photo' : '—'} · {prettyBytes(q.file.size)}
                  </span>
                  {q.error && <span className="ml-2 font-semibold">{q.error}</span>}
                </span>
                <button
                  type="button" onClick={() => setQueue(list => list.filter((_, j) => j !== i))}
                  className="shrink-0 text-[12px] font-bold text-gray-500 hover:text-gray-800"
                >Remove</button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={heading} onChange={e => setHeading(e.target.value)}
            placeholder="Heading (optional)"
            className="rounded-xl bg-gray-50 px-3 py-2 text-[14px] text-gray-900 ring-1 ring-gray-200 placeholder:text-gray-400"
          />
          <input
            value={body} onChange={e => setBody(e.target.value)}
            placeholder="Description (optional)"
            className="rounded-xl bg-gray-50 px-3 py-2 text-[14px] text-gray-900 ring-1 ring-gray-200 placeholder:text-gray-400"
          />
        </div>
        <p className="mt-1 text-[12px] text-gray-400">
          The heading and description apply to every file in this batch.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700">
            <input
              type="checkbox" checked={publishNow} onChange={e => setPublishNow(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-violet-600"
            />
            Publish immediately
          </label>
          <button
            type="button" onClick={upload} disabled={!ready}
            className="rounded-xl bg-violet-600 px-4 py-2 text-[13px] font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
          >
            {busy === 'uploading' ? 'Uploading…' : busy === 'saving' ? 'Saving…' : 'Upload'}
          </button>
        </div>
      </section>

      {historyFor && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Change history</h3>
            <button type="button" onClick={() => { setHistoryFor(null); setHistory(null) }}
              className="text-[12px] font-bold text-gray-500 hover:text-gray-800">Close</button>
          </div>
          {history === null ? (
            <p className="mt-2 text-[13px] text-gray-500">Loading…</p>
          ) : history.length === 0 ? (
            <p className="mt-2 text-[13px] text-gray-500">
              Nothing recorded for this slide. History starts at the moment 171 was applied, so
              anything older than that is not here.
            </p>
          ) : (
            <ol className="mt-2 space-y-2">
              {history.map(h => (
                <li key={h.id} className="flex gap-3 rounded-xl bg-gray-50 p-2.5 text-[13px] ring-1 ring-gray-200">
                  <span className={`h-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    h.action === 'archived' ? 'bg-rose-100 text-rose-800'
                      : h.action === 'published' ? 'bg-emerald-100 text-emerald-800'
                        : h.action === 'created' ? 'bg-violet-100 text-violet-800'
                          : 'bg-gray-200 text-gray-700'}`}
                  >{h.action}</span>
                  <span className="min-w-0 flex-1">
                    {Object.entries(h.changed ?? {}).length === 0
                      ? <span className="text-gray-500">—</span>
                      : Object.entries(h.changed).map(([field, v]) => (
                        <span key={field} className="block truncate text-gray-700">
                          <b className="font-semibold">{field}</b>{': '}
                          <span className="text-gray-400 line-through">{String(v?.from ?? '')}</span>
                          {' → '}
                          <span className="text-gray-900">{String(v?.to ?? '')}</span>
                        </span>
                      ))}
                    <span className="mt-0.5 block text-[11px] text-gray-400">
                      {new Date(h.at).toLocaleString()}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <section>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          {showArchived ? 'Archived' : 'Slides'} in “{story.label}” ({forStory.length})
        </h3>
        {hasHistory && (archivedCount > 0 || showArchived) && (
          <button
            type="button" onClick={() => { setShowArchived(v => !v); setEditing(null) }}
            className="mt-1 text-[12px] font-bold text-violet-700 hover:text-violet-900"
          >
            {showArchived ? '← Back to live slides' : `View archive (${archivedCount})`}
          </button>
        )}

        {forStory.length === 0 ? (
          <p className="mt-2 rounded-xl bg-gray-50 p-3 text-[13px] text-gray-500 ring-1 ring-gray-200">
            {showArchived
              ? 'Nothing archived in this story.'
              : 'Nothing uploaded to this story yet. The partner app is showing its built-in slides.'}
          </p>
        ) : (
          <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {forStory.map(s => {
              const url = s.media_url
              return (
                <li key={s.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
                  <div className="aspect-[9/16] bg-gray-900">
                    {s.media_type === 'video'
                      ? <video src={url} controls playsInline className="h-full w-full object-cover" />
                      : <img src={url} alt={s.title || 'Story slide'} className="h-full w-full object-cover" />}
                  </div>
                  <div className="space-y-1 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.is_published
                        ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}
                      >{s.is_published ? 'Published' : 'Draft'}</span>
                      <span className="text-[11px] font-semibold text-gray-400">
                        #{s.position} · {s.media_type === 'video' ? 'Video' : 'Photo'}
                      </span>
                    </div>
                    {editing === s.id ? (
                      <div className="space-y-1.5 pt-1">
                        <input
                          autoFocus value={draft.title}
                          onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                          placeholder="Name"
                          className="w-full rounded-lg bg-gray-50 px-2 py-1.5 text-[14px] font-bold text-gray-900 ring-1 ring-gray-300"
                        />
                        <input
                          value={draft.description}
                          onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                          placeholder="Description"
                          className="w-full rounded-lg bg-gray-50 px-2 py-1.5 text-[13px] text-gray-700 ring-1 ring-gray-300"
                        />
                        <div className="flex gap-3 pt-0.5">
                          <button type="button" onClick={() => saveEdit(s)}
                            className="text-[12px] font-bold text-emerald-700 hover:text-emerald-900">Save</button>
                          <button type="button" onClick={() => setEditing(null)}
                            className="text-[12px] font-bold text-gray-500 hover:text-gray-800">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {s.title && s.title !== '—' && <p className="text-[14px] font-bold text-gray-900">{s.title}</p>}
                        {s.description && s.description !== '—' && <p className="text-[13px] text-gray-600">{s.description}</p>}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                          {s.deleted_at ? (
                            <button
                              type="button" onClick={() => restore(s)}
                              className="text-[12px] font-bold text-emerald-700 hover:text-emerald-900"
                            >Restore</button>
                          ) : (
                            <>
                              <button
                                type="button" onClick={() => setPublished(s, !s.is_published)}
                                className="text-[12px] font-bold text-violet-700 hover:text-violet-900"
                              >{s.is_published ? 'Unpublish' : 'Publish'}</button>
                              <button
                                type="button"
                                onClick={() => { setEditing(s.id); setDraft({
                                  title: s.title === '—' ? '' : (s.title ?? ''),
                                  description: s.description === '—' ? '' : (s.description ?? ''),
                                }) }}
                                className="text-[12px] font-bold text-gray-700 hover:text-gray-900"
                              >Rename</button>
                              <button
                                type="button" onClick={() => archive(s)}
                                className="text-[12px] font-bold text-rose-600 hover:text-rose-800"
                              >Archive</button>
                            </>
                          )}
                          {hasHistory && (
                            <button
                              type="button" onClick={() => openHistory(s)}
                              className="text-[12px] font-bold text-gray-500 hover:text-gray-800"
                            >History</button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
