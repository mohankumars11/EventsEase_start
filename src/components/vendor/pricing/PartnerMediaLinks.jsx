import { useEffect, useState } from 'react'
import { ExternalLink, FileText, Image as ImageIcon, Loader2, Music2, PlayCircle } from 'lucide-react'
import { fetchWork, signedUrlsFor } from '../../../lib/partnerWork'

const safeHref = value => typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null

function PreviewSection({ children }) {
  return <section className="overflow-hidden rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.07]">
    <h3 className="mb-2 flex items-center gap-2 text-[13.5px] font-extrabold text-plum-950"><ImageIcon size={16} className="text-plum-700" />Explore partner media</h3>
    {children}
  </section>
}

export default function PartnerMediaLinks({ vendor, profile = {}, visibility = 'partner' }) {
  const [media, setMedia] = useState({ loading: true, rows: [], urls: {}, unavailable: false })

  useEffect(() => {
    let alive = true
    async function load() {
      if (!vendor?.id) {
        setMedia({ loading: false, rows: [], urls: {}, unavailable: false })
        return
      }
      try {
        const result = await fetchWork(vendor.id)
        const rows = (result.rows ?? []).filter(row => ['photo', 'document', 'video', 'audio'].includes(row.kind)
          && (visibility !== 'customer' || row.review_status === 'live'))
        const urls = await signedUrlsFor(rows.map(row => row.storage_path), 600)
        if (alive) setMedia({ loading: false, rows, urls, unavailable: !!result.unavailable })
      } catch {
        if (alive) setMedia({ loading: false, rows: [], urls: {}, unavailable: false })
      }
    }
    load()
    return () => { alive = false }
  }, [vendor?.id, visibility])

  const photos = media.rows.filter(row => row.kind === 'photo')
  const documents = media.rows.filter(row => row.kind === 'document')
  const videos = media.rows.filter(row => row.kind === 'video')
  const audioRows = media.rows.filter(row => row.kind === 'audio')
  const audioUrl = safeHref(profile.audio_url || profile.audio_sample_url || profile.voice_sample_url)
  const catalogUrl = safeHref(profile.catalog_url || profile.catalogue_url || profile.portfolio_url)
  const groups = [
    { key: 'catalog', title: 'View photo catalog & portfolio', description: `${photos.length} photos · ${documents.length} catalog/document files`, icon: ImageIcon, rows: [...photos, ...documents] },
    { key: 'audio', title: 'Listen to audio samples', description: `${audioRows.length} uploaded audio sample${audioRows.length === 1 ? '' : 's'}`, icon: Music2, direct: audioUrl, rows: audioRows },
    { key: 'video', title: 'Watch performance video', description: `${videos.length} uploaded video${videos.length === 1 ? '' : 's'}`, icon: PlayCircle, rows: videos },
    { key: 'catalog-link', title: 'Open external catalog', description: 'Catalog link saved in the listing profile', icon: ExternalLink, direct: catalogUrl },
  ].filter(group => group.direct || group.rows?.some(row => media.urls[row.storage_path]))

  return (
    <PreviewSection>
      {media.loading
        ? <div className="py-4 text-center text-[12px] text-ink/55"><Loader2 size={16} className="mr-2 inline animate-spin" />Loading uploaded media…</div>
        : groups.length
          ? <div className="space-y-2">
            {groups.map(group => {
              const GroupIcon = group.icon
              const visibleRows = (group.rows ?? []).filter(row => media.urls[row.storage_path])
              return (
                <div key={group.key} className="rounded-2xl bg-[#faf9fd] p-3 ring-1 ring-ink/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-plum-50 text-plum-700"><GroupIcon size={17} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-extrabold text-ink">{group.title}</p>
                      <p className="text-[11px] text-ink/55">{group.description}</p>
                    </div>
                    {group.direct && <a href={group.direct} target="_blank" rel="noreferrer" className="shrink-0 rounded-full bg-white px-3 py-2 text-[11px] font-extrabold text-plum-700 ring-1 ring-plum-200">Open</a>}
                    {!group.direct && <span className="shrink-0 text-[10.5px] font-bold text-ink/45">{visibleRows.length} file{visibleRows.length === 1 ? '' : 's'}</span>}
                  </div>
                  {!!visibleRows.length && (
                    <div className="mt-2 space-y-1.5">
                      {visibleRows.map(row => {
                        const RowIcon = row.kind === 'video' ? PlayCircle : row.kind === 'document' ? FileText : row.kind === 'audio' ? Music2 : ImageIcon
                        const state = row.review_status === 'live' ? 'Live' : row.review_status === 'under_review' ? 'In review' : row.review_status || 'Saved'
                        const tone = row.review_status === 'live' ? 'bg-emerald-50 text-emerald-800' : row.review_status === 'under_review' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'
                        return (
                          <a key={row.id} href={media.urls[row.storage_path]} target="_blank" rel="noreferrer"
                            className="flex min-h-10 items-center gap-2 rounded-xl bg-white px-2.5 py-2 text-[11.5px] font-bold text-plum-800 ring-1 ring-ink/[0.05]">
                            <RowIcon size={14} className="shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{row.caption || (row.kind === 'video' ? 'Performance video' : row.kind === 'document' ? 'Catalog document' : row.kind === 'audio' ? 'Audio sample' : 'Portfolio photograph')}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${tone}`}>{state}</span>
                            <ExternalLink size={13} className="shrink-0" />
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          : <div className="rounded-2xl bg-[#faf9fd] p-4 text-[12px] text-ink/55">{media.unavailable ? 'Media library is not enabled in this environment yet.' : 'No uploaded portfolio media is available for this listing yet.'}</div>}
      <p className="mt-3 text-[11px] leading-relaxed text-ink/50">{visibility === 'customer' ? 'Only approved media is shown in this live customer listing.' : 'Only approved media is customer-visible. Files awaiting review are marked above and should not be treated as published.'}</p>
    </PreviewSection>
  )
}
