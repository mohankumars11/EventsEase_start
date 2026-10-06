import { useCallback, useEffect, useState } from 'react'
import { Images, Loader2, Trash2, Check, Clock, AlertCircle, Plus } from 'lucide-react'
import Fold from './Fold'
import WorkUpload from './WorkUpload'
import { workPromptsFor } from '../../data/workPrompts'
import { useToast, friendlyError } from '../../context/ToastContext'
import {
  fetchWork, signedUrlsFor, addWork, updateWork, removeWork,
} from '../../lib/partnerWork'

/**
 * The place three different screens have been promising for months.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "YOU CAN ADD THIS LATER FROM YOUR LISTING TAB"
 * ══════════════════════════════════════════════════════════════════════
 *
 * AddItemFlow says it twice and WorkUpload says it once, and until this
 * file there was no such place. `WorkUpload` was reachable from exactly
 * one screen — the `work` step of the add flow — and that step is
 * skipped when a listing is edited. So a partner uploaded their
 * photographs once, during the creation of their first listing, and
 * could never see them, correct a caption, or add one more.
 *
 * Nothing read `partner_work` at all, so their work was also invisible
 * to the operator reviewing them and to the customer deciding whether
 * to pay. It was storage cost.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A FOLD, AND WHY THAT IS RIGHT HERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The listing cards fold because they are the screen's subject and a
 * partner opens this tab to check one. This is not the subject — it is
 * the thing they do once and revisit rarely — so it takes a settings
 * row's shape, which is exactly what `Fold` is for. The listing card
 * needed its own collapse because it carries a per-state colour; this
 * genuinely wants Fold's fixed white shell.
 *
 * It opens by itself when there is nothing in it, because a partner who
 * has never added a photograph is the one who most needs to see the
 * offer — and closed once there is, because then it is reference.
 */
export default function WorkLibrary({ vendor }) {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [urls, setUrls] = useState({})
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [busy, setBusy] = useState(null)
  const [pending, setPending] = useState([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!vendor?.id) return
    setLoading(true)
    const { rows: got, unavailable: gone } = await fetchWork(vendor.id)
    setRows(got)
    setUnavailable(gone)
    /* One request for the whole gallery. Twenty singular calls is
       twenty round trips on a phone. */
    setUrls(await signedUrlsFor(got.map(r => r.storage_path)))
    setLoading(false)
  }, [vendor?.id])

  useEffect(() => { load() }, [load])

  const photos = rows.filter(r => r.kind === 'photo' || r.kind === 'document')
  const videos = rows.filter(r => r.kind === 'video')
  const words  = rows.filter(r => r.kind === 'testimonial')
  const waiting = rows.filter(r => r.review_status === 'under_review').length

  const summary = unavailable
    ? 'Not available on this database yet'
    : loading ? 'Loading…'
    : rows.length === 0
      ? 'Nothing yet — this is what wins the job'
      : [
          photos.length && `${photos.length} photo${photos.length === 1 ? '' : 's'}`,
          videos.length && `${videos.length} video${videos.length === 1 ? '' : 's'}`,
          words.length && `${words.length} quote${words.length === 1 ? '' : 's'}`,
          waiting && `${waiting} waiting`,
        ].filter(Boolean).join(' · ')

  async function save() {
    if (!pending.length) return
    setSaving(true)
    const { added, error } = await addWork(vendor.id, pending, rows.length)
    setSaving(false)
    if (error) { toast.error(friendlyError(error, 'Could not save that.')); return }
    setPending([])
    toast.success(`${added} added. Our team reads these before customers see them.`)
    await load()
  }

  async function drop(row) {
    setBusy(row.id)
    try { await removeWork(row); setRows(r => r.filter(x => x.id !== row.id)) }
    catch (err) { toast.error(friendlyError(err, 'Could not remove that.')) }
    finally { setBusy(null) }
  }

  async function caption(row, text) {
    if ((row.caption ?? '') === text) return
    try { await updateWork(row.id, { caption: text || null }) }
    catch (err) { toast.error(friendlyError(err, 'Could not save that caption.')) }
  }

  return (
    <Fold
      icon={Images}
      title="Your work"
      summary={summary}
      tone={rows.length === 0 ? 'nudge' : 'good'}
      defaultOpen={!loading && rows.length === 0}
    >
      {unavailable ? (
        <p className="text-[12.5px] leading-snug text-ink-mute">
          This needs migration 110, which has not been applied to this database.
          Nothing is lost — it will appear once it is.
        </p>
      ) : loading ? (
        <p className="flex items-center gap-2 text-[12.5px] text-ink-mute">
          <Loader2 size={14} className="animate-spin" /> Loading your work…
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-[12px] leading-snug text-ink-mute">
            Photographs of work you have really done. A customer sees these at the
            moment they are deciding whether to book you, so one real photograph of
            your own is worth ten from the internet.
          </p>

          {rows.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {rows.map(r => (
                <li key={r.id} className="overflow-hidden rounded-xl bg-ink/[0.03] ring-1 ring-ink/[0.06]">
                  <div className="relative aspect-square">
                    {r.kind === 'testimonial' ? (
                      <p className="line-clamp-4 p-2 text-[10.5px] leading-snug text-ink">
                        “{r.body}”
                      </p>
                    ) : urls[r.storage_path] ? (
                      r.kind === 'video' ? (
                        <video src={urls[r.storage_path]} className="h-full w-full object-cover" muted />
                      ) : (
                        <img src={urls[r.storage_path]} alt={r.caption ?? ''} className="h-full w-full object-cover" />
                      )
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-ink-mute">
                        no preview
                      </span>
                    )}

                    {/* The review state, on the tile. A partner who has
                        uploaded ten photographs needs to know which of
                        them a customer can actually see. */}
                    <span className={`absolute left-1 top-1 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${
                      r.review_status === 'live' ? 'bg-forest-600 text-white'
                      : r.review_status === 'rejected' ? 'bg-rose-600 text-white'
                      : 'bg-amber-500 text-white'
                    }`}>
                      {r.review_status === 'live' ? <><Check size={8} /> Live</>
                        : r.review_status === 'rejected' ? <><AlertCircle size={8} /> No</>
                        : <><Clock size={8} /> Reading</>}
                    </span>

                    <button
                      type="button" onClick={() => drop(r)} disabled={busy === r.id}
                      aria-label="Remove"
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-rose-700 disabled:opacity-50"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {r.kind !== 'testimonial' && (
                    <input
                      defaultValue={r.caption ?? ''}
                      onBlur={e => caption(r, e.target.value.trim())}
                      placeholder="Caption"
                      className="w-full bg-transparent px-2 py-1.5 text-[10.5px] text-ink placeholder:text-ink-mute"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* WorkUpload verbatim. Reusing it means no second compress
              path, no second camera-vs-gallery branch and no second
              40MB check -- one upload implementation, which is the only
              way the two stay in step. */}
          <div className="border-t border-ink/[0.06] pt-3">
            <WorkUpload
              value={pending}
              onChange={setPending}
              trade={vendor?.category}
              copy={workPromptsFor(vendor?.category)}
            />
            {pending.length > 0 && (
              <button
                type="button" onClick={save} disabled={saving}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-forest-600 py-2.5 text-[13px] font-extrabold text-white disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Save {pending.length} to my work
              </button>
            )}
          </div>
        </div>
      )}
    </Fold>
  )
}
