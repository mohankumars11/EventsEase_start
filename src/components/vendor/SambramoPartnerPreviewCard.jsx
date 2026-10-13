import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, CalendarDays, Camera, Check, ChevronLeft, ChevronRight, Clock3, Image as ImageIcon, Images, MapPin, Play, Plus, ShieldCheck, Star, Truck, Users, Video } from 'lucide-react'
import './SambramoPartnerPreviewCard.css'
import { fetchWork, signedUrlsFor } from '../../lib/partnerWork'
import PartnerAvatarInput from './PartnerAvatarInput'

export const SAMBRAMO_EVENT_OPTIONS = [
  'Birthday','Wedding','Engagement','Reception','Baby Shower','Naming Ceremony',
  'Housewarming','Anniversary','Mehendi','Haldi','Sangeet','Roka','Cradle Ceremony',
  'Saree / Dhoti Ceremony','Religious Event','Festival Celebration','Corporate Event',
  'Product Launch','Conference','Exhibition','Team Event','Weekend Party',
  'Private Party','Other Celebration',
]

export function readSupportedEvents(tradeInputs = {}) {
  const raw = tradeInputs.supported_events ?? tradeInputs.event_types ?? tradeInputs.events ?? tradeInputs.event_type ?? tradeInputs.function
  const values = Array.isArray(raw) ? raw : String(raw ?? '').split(',').map(x => x.trim()).filter(Boolean)
  return Array.from(new Set(values))
}

function isVerified(vendor) {
  const state = String(vendor?.verification_status ?? '').toLowerCase()
  return vendor?.is_verified === true || vendor?.verified === true || ['verified','approved','live'].includes(state)
}
function mediaUrl(item) { return item?.url || item?.signed_url || item?.public_url || '' }
function packagePrice(pkg) {
  if (pkg?.price?.rate_paise != null) return Math.round(Number(pkg.price.rate_paise) / 100)
  if (pkg?.base_price != null && pkg.base_price !== '') return Number(pkg.base_price)
  return null
}
function unitLabel(unit) {
  const map={per_event:'Per Event',per_hour:'Per Hour',per_day:'Per Day',per_guest:'Per Guest',per_person:'Per Person',per_plate:'Per Plate',package:'Per Package',per_trip:'Per Trip',per_item:'Per Item',per_piece:'Per Piece',per_function:'Per Function',per_project:'Per Project'}
  return map[unit] ?? String(unit || 'Per Event').replace(/_/g,' ').replace(/^./,c=>c.toUpperCase())
}
function formatINR(v){return '₹'+Number(v||0).toLocaleString('en-IN')}
function initials(name){return String(name||'P').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,1).toUpperCase()||'P'}
function iconFor(label,index){
  const v=String(label||'').toLowerCase()
  if(v.includes('event')||v.includes('function')) return <CalendarDays/>
  if(v.includes('photo')||v.includes('camera')) return <Camera/>
  if(v.includes('video')) return <Video/>
  if(v.includes('hour')||v.includes('duration')||v.includes('window')||v.includes('timeline')) return <Clock3/>
  if(v.includes('people')||v.includes('photographer')||v.includes('crew')||v.includes('staff')) return <Users/>
  if(v.includes('truck')||v.includes('vehicle')||v.includes('transport')) return <Truck/>
  if(v.includes('image')||v.includes('album')||v.includes('deliver')) return <ImageIcon/>
  return [<CalendarDays/>,<Camera/>,<Clock3/>,<Users/>,<ImageIcon/>][index%5]
}
function MediaViewer({items=[],index=0,onClose,onChange}){
  if(!items.length) return null
  const item=items[Math.max(0,Math.min(index,items.length-1))]
  const prev=()=>onChange?.((index-1+items.length)%items.length)
  const next=()=>onChange?.((index+1)%items.length)
  return <div className="sppc-media-modal" role="dialog" aria-modal="true" onClick={onClose}>
    <button type="button" className="sppc-media-close" onClick={onClose}>Close ✕</button>
    <div className="sppc-media-dialog" onClick={e=>e.stopPropagation()}>
      <div className="sppc-media-stage">
        <button type="button" className="sppc-media-nav left" onClick={prev} aria-label="Previous media"><ChevronLeft size={24}/></button>
        {item.kind==='video'?<video src={mediaUrl(item)} controls autoPlay playsInline className="sppc-media-full"/>:<img src={mediaUrl(item)} alt={item.caption||'Partner portfolio'} className="sppc-media-full"/>}
        <button type="button" className="sppc-media-nav right" onClick={next} aria-label="Next media"><ChevronRight size={24}/></button>
      </div>
      <div className="sppc-media-index">{index+1} / {items.length}</div>
      {item.caption?<p>{item.caption}</p>:null}
    </div>
  </div>
}

export default function SambramoPartnerPreviewCard({vendor,service,config,draft={},packages=[],addons=[],media=[],onManageMedia,onEdit,onBookingPreview,compact=false}){
  const [selectedMediaIndex,setSelectedMediaIndex]=useState(null)
  const [loadedMedia,setLoadedMedia]=useState([])
  useEffect(()=>{
    let alive=true
    async function load(){
      if(media?.length || !vendor?.id){setLoadedMedia(media||[]);return}
      const {rows}=await fetchWork(vendor.id)
      const live=(rows??[]).filter(row=>row.review_status==='live'&&['photo','video'].includes(row.kind))
      const urls=await signedUrlsFor(live.map(row=>row.storage_path),900)
      if(alive)setLoadedMedia(live.map(row=>({...row,url:urls[row.storage_path]||''})).filter(row=>row.url))
    }
    load().catch(()=>{if(alive)setLoadedMedia([])})
    return()=>{alive=false}
  },[vendor?.id,media])
  const displayMedia=media?.length?media:loadedMedia
  const businessName=vendor?.business_name||vendor?.name||draft?.trade_inputs?.business_name||draft?.trade_inputs?.stage_name||draft?.profile?.stage_name||service?.name||'Your business'
  const location=[vendor?.area,vendor?.city,vendor?.state].filter(Boolean).join(', ')||vendor?.location||'Location not added'
  const verified=isVerified(vendor)
  const events=readSupportedEvents(draft?.trade_inputs??{})
  const visibleEvents=events.length?events:[draft?.trade_inputs?.event_type||draft?.trade_inputs?.function||'Celebrations']
  const hero=displayMedia[0]
  const thumbCandidates=displayMedia.slice(1,3)
  if(!thumbCandidates.some(item=>item?.kind==='video')){const video=displayMedia.find((item,i)=>i>2&&item?.kind==='video');if(video)thumbCandidates[1]=video}
  const thumbs=thumbCandidates
  const activePackages=useMemo(()=>{
    const loaded=(packages??[]).filter(p=>p&&!['ARCHIVED','PAUSED'].includes(p.status))
    const current=draft?.id||draft?.name||draft?.base_price?[{id:draft.id||'current',name:draft.name||'Featured Package',description:draft.description||'',status:draft.status||'DRAFT',price:draft.base_price?Number(draft.base_price):null,unit:draft.pricing_unit||'',minimum:draft.minimum_order||null,duration:draft.included_duration||null,addons:draft.addons||[]}]:[]
    return Array.from(new Map([...current,...loaded].map(p=>[String(p.id)+'|'+String(p.name),p])).values())
  },[packages,draft])
  const current=activePackages[0]||null
  const exactPrice=packagePrice(current)
  const specs=(Array.isArray(config?.fields)?config.fields:[]).map(f=>[f.label,draft?.trade_inputs?.[f.key]]).filter(([,v])=>v!==''&&v!=null&&!Array.isArray(v))
  const finalSpecs=specs
  const inclusionItems=Array.from(new Set((Array.isArray(current?.commercial_inputs?.inclusions) && current.commercial_inputs.inclusions.length ? current.commercial_inputs.inclusions : Array.isArray(draft?.commercial_inputs?.inclusions) ? draft.commercial_inputs.inclusions : []).filter(Boolean)))
  const chargeRows = [
    exactPrice != null && { label: unitLabel(current?.unit || draft.pricing_unit), value: formatINR(exactPrice) },
    draft?.minimum_order != null && draft.minimum_order !== '' && { label: 'Minimum order', value: String(draft.minimum_order) + ' ' + (draft.pricing_unit || 'units') },
    Number(draft?.additional_unit_rate) > 0 && { label: 'Additional unit', value: formatINR(draft.additional_unit_rate) + ' / ' + (draft.pricing_unit || 'unit') },
    Number(draft?.additional_duration_rate) > 0 && { label: 'Additional duration', value: formatINR(draft.additional_duration_rate) + ' / time unit' },
    draft?.lead_time != null && draft.lead_time !== '' && { label: 'Minimum notice', value: String(draft.lead_time) + ' day(s)' },
  ].filter(Boolean)
  const orderRows = activePackages.map(pkg => ({ name: pkg.name || pkg.title || 'Package', price: packagePrice(pkg), unit: unitLabel(pkg.unit || draft.pricing_unit) }))
  const activeAddons=(addons?.length?addons:(current?.addons??draft?.addons??[])).filter(a=>a?.active!==false&&a?.name)
  const rating=vendor?.rating??vendor?.rating_avg??vendor?.average_rating
  const reviewCount=vendor?.review_count??vendor?.reviews_count
  const completedEvents=vendor?.events_completed??vendor?.completed_events
  const yearsExperience=vendor?.years_experience??vendor?.years_active??draft?.trade_inputs?.years_experience??draft?.trade_inputs?.years_active
  return <>
    <article className={'sambramo-partner-preview-card'+(compact?' is-compact':'')}>
      <header className="sppc-header">
        <div className="sppc-header-spacer" />
        <div className="sppc-wordmark">SAMBRAMO</div><div className="sppc-header-spacer"/>
      </header>
      <section className="sppc-partner">
        <PartnerAvatarInput vendor={vendor} draft={draft} businessName={businessName} editable={!!onEdit} compact={compact} />
        <div className="sppc-partner-copy">
          <h2>{businessName}</h2><p>{config?.name||service?.name||'Event Partner'}</p>
          <p className="sppc-location"><MapPin size={14}/> {location}</p>
          <div className="sppc-stats">
            {rating!=null?<span><Star size={14} fill="currentColor"/><b>{Number(rating).toFixed(1)}</b>{reviewCount!=null?' ('+reviewCount+')':''}</span>:null}
            {completedEvents!=null?<><i/><span>{completedEvents}+ Events</span></>:null}
            {yearsExperience!=null&&Number(yearsExperience)>0?<><i/><span>{Number(yearsExperience)}+ years experience</span></>:null}
          </div>
        </div>
        <div className="sppc-badge-stack">
          <span className={'sppc-verified '+(verified?'is-verified':'is-pending')}><BadgeCheck size={16}/>{verified?'Verified by Sambramo':'Verification in review'}</span>
          {rating!=null&&Number(rating)>=4.7?<span className="sppc-top-rated"><Star size={14} fill="currentColor"/>Top Rated Partner</span>:null}
        </div>
      </section>
      <section className="sppc-gallery">
        <div className="sppc-hero-wrap">
          {hero&&mediaUrl(hero)?hero.kind==='video'?<button type="button" className="sppc-media-button" onClick={()=>setSelectedMediaIndex(0)}><video src={mediaUrl(hero)} muted playsInline className="sppc-hero-image"/><span className="sppc-video-chip"><Play size={11} fill="currentColor"/>Video</span></button>:<button type="button" className="sppc-media-button" onClick={()=>setSelectedMediaIndex(0)}><img src={mediaUrl(hero)} alt={hero.caption||businessName+' work'} className="sppc-hero-image"/></button>:<button type="button" className="sppc-empty-media" onClick={()=>onManageMedia?.('media')}><Images size={30}/><b>Add real photos of your work</b><span>Approved portfolio items become your featured cover on the live marketplace.</span></button>}
          {hero&&hero.review_status!=='live'?<span className="sppc-review-chip">{hero.review_status==='rejected'?'Needs changes':hero.review_status==='under_review'?'Awaiting approval':'New upload · review pending'}</span>:null}
          <span className="sppc-featured">FEATURED PACKAGE</span>
          <div className="sppc-hero-caption"><strong>{current?.name||draft?.name||'Featured Package'}</strong><span>{current?.description||draft?.description||'Professional event service with a clear scope, premium execution and coordinated event-day delivery.'}</span></div>
          {displayMedia.length?<span className="sppc-counter">1/{displayMedia.length}</span>:null}
        </div>
        <div className="sppc-thumb-stack">
          {thumbs.map((item,i)=><button type="button" key={item.id||item.storage_path||i} className="sppc-thumb-button" onClick={()=>setSelectedMediaIndex(displayMedia.indexOf(item))}>{item.kind==='video'?<video src={mediaUrl(item)} muted playsInline className="sppc-thumb"/>:<img src={mediaUrl(item)} alt="" className="sppc-thumb"/>}{item.kind==='video'?<span className="sppc-video-chip small"><Play size={10} fill="currentColor"/>Video</span>:null}{item.review_status!=='live'?<span className="sppc-thumb-review">{item.review_status==='rejected'?'Changes needed':'Review pending'}</span>:null}{i===1&&displayMedia.length>3?<span className="sppc-photo-count">+{displayMedia.length-2} more</span>:null}</button>)}
          {!thumbs.length?<button type="button" className="sppc-thumb-placeholder" onClick={()=>onManageMedia?.('media')}><Images size={19}/><span>Add work</span></button>:null}
        </div>
      </section>
      {activePackages.length > 0 && (
        <section className="sppc-section">
          <div className="sppc-section-heading"><div><h3>Popular Packages</h3><p>Compare every saved package and its inclusions.</p></div></div>
          <div className="mt-3 space-y-2.5">
            {activePackages.map((pkg,i)=>{
              const price=packagePrice(pkg)
              const items=Array.from(new Set([...(Array.isArray(pkg?.commercial_inputs?.inclusions)?pkg.commercial_inputs.inclusions:[]),...(Array.isArray(pkg?.inclusions)?pkg.inclusions:[])].filter(Boolean)))
              const popular=pkg?.is_popular===true||pkg?.is_featured===true||pkg?.commercial_inputs?.is_popular===true
              const duration=pkg?.duration??pkg?.included_duration??pkg?.trade_inputs?.duration_hours
              const image=displayMedia[i%Math.max(displayMedia.length,1)]
              const tone=["bg-gradient-to-r from-[#eaf4ff] to-[#f8fbff] ring-[#dceaff]","bg-gradient-to-r from-[#f0e7ff] to-[#fcf9ff] ring-[#e5d7ff]","bg-gradient-to-r from-[#fff4dc] to-[#fffbf2] ring-[#f5e2ba]"][i%3]
              const accent=i===1?"text-[#6b2bdf]":i===2?"text-[#a46808]":"text-[#1761cb]"
              return <div key={pkg.id||pkg.name||i} className={"relative w-full overflow-hidden rounded-[20px] p-2.5 ring-1 "+tone}>
                {popular?<span className="absolute left-2.5 top-1.5 z-10 rounded-full bg-[#6d35e9] px-2 py-1 text-[8px] font-extrabold text-white">★ Partner pick</span>:null}
                <div className={"grid grid-cols-[58px_minmax(84px,1fr)_minmax(80px,1fr)] items-center gap-2.5 max-[380px]:grid-cols-[46px_minmax(66px,1fr)_minmax(62px,.9fr)] max-[380px]:gap-1.5 "+(popular?"pt-5":"")}>
                  <div className="h-[76px] w-[58px] overflow-hidden rounded-[13px] bg-white/80 ring-1 ring-white max-[380px]:h-[64px] max-[380px]:w-[46px]">
                    {image?.url?<img src={image.url} alt="" className="h-full w-full object-cover"/>:<span className="grid h-full place-items-center text-[#327ee3]"><Package size={21}/></span>}
                  </div>
                  <div className="min-w-0"><p className={"break-words text-[12px] font-black leading-tight "+accent}>{pkg.name||pkg.title||"Package"}</p><p className="mt-1 break-words text-[16px] font-black leading-tight tracking-tight text-[#101f50] max-[380px]:text-[13px]">{price!=null?formatINR(price):"Price on request"}</p><p className="mt-1 text-[9px] font-semibold leading-tight text-[#556586]">{duration?String(duration)+(typeof duration==="number"?" hours":"") : unitLabel(pkg.unit||draft.pricing_unit)}</p></div>
                  <div className="min-w-0 space-y-1">{(items.length?items.slice(0,3):[pkg.description||"Details as listed"]).map((item,j)=><p key={j} className="flex min-w-0 items-start gap-1 text-[9px] font-semibold leading-tight text-[#2f426d] max-[380px]:text-[8px]"><Check size={10} strokeWidth={3} className={"mt-0.5 shrink-0 "+(i===1?"text-[#7537e8]":i===2?"text-[#b4760e]":"text-[#176de1]")}/><span>{typeof item==="string"?item:item?.label??item?.name??item?.id??"Included service"}</span></p>)}</div>
                </div>
                <p className="mt-2 text-right text-[8px] font-extrabold uppercase text-[#687b9a]">{String(pkg.status||"Saved").replace(/_/g," ")}</p>
              </div>
            })}
          </div>
        </section>
      )}
      <section className="sppc-package-hero"><button type="button" className="sppc-edit-button" onClick={()=>onEdit?.('package')}>Edit</button>
        <div className="sppc-package-copy"><span className="sppc-popular-pill">{current?.is_popular===true||current?.is_featured===true?'PARTNER PICK':'PACKAGE HIGHLIGHT'}</span><h3>{current?.name||draft?.name||'Featured Package'}</h3><p>{current?.description||draft?.description||'Premium event service, thoughtfully configured for your celebration.'}</p></div>
        <div className="sppc-price"><strong>{exactPrice!=null?formatINR(exactPrice):'Price not set'}</strong><span>{unitLabel(current?.unit||draft.pricing_unit)}</span></div>
      </section>
      <section className="sppc-detail-grid"><button type="button" className="sppc-floating-edit" onClick={()=>onEdit?.('details')}>Edit</button>
        <button type="button" className="sppc-detail-card tone-0" onClick={()=>onManageMedia?.('events')}><span className="sppc-detail-icon"><CalendarDays/></span><span><small>Event Type</small><b>{visibleEvents.join(', ')}</b></span><ChevronRight size={16}/></button>
        {finalSpecs.map(([label,value],i)=><div key={label+i} className={'sppc-detail-card tone-'+((i+1)%5)}><span className="sppc-detail-icon">{iconFor(label,i)}</span><span><small>{label}</small><b>{String(value)}</b></span></div>)}
      </section>
      <section className="sppc-section sppc-rate-sections">
        <div className="sppc-section-heading"><div><h3>How they charge</h3><p>Clear rates and minimums before you book.</p></div></div>
        {chargeRows.length ? <div className="sppc-rate-list">{chargeRows.map(row=><div key={row.label}><span>{row.label}</span><b>{row.value}</b></div>)}</div> : <p className="sppc-rate-empty">Package pricing is shown above. Additional rates appear when configured.</p>}
      </section>
      <section className="sppc-section sppc-rate-sections">
        <div className="sppc-section-heading"><div><h3>What you can order</h3><p>Compare saved packages and their rates.</p></div></div>
        {orderRows.length ? <div className="sppc-order-list">{orderRows.map((row,i)=><div key={row.name+'-'+i}><span><b>{row.name}</b><small>{row.unit}</small></span><strong>{row.price!=null?formatINR(row.price):'Price pending'}</strong></div>)}</div> : <p className="sppc-rate-empty">Add a package to show customers what they can order.</p>}
      </section>
      <section className="sppc-section"><div className="sppc-section-heading"><div><h3>What’s included</h3><p>Everything your customer can understand at a glance.</p></div><button type="button" className="sppc-view-details sppc-edit-link" onClick={()=>onEdit?.('details')}>Edit <ChevronRight size={16}/></button></div><div className="sppc-inclusions">{inclusionItems.map((item,i)=><div key={i}><Check size={15}/><span>{typeof item==='string'?item:item?.label??item?.name??String(item)}</span></div>)}</div></section>
      <section className="sppc-section sppc-addons"><div className="sppc-section-heading"><div><h3><Plus size={18}/> Popular add-ons</h3><p>Optional upgrades with their own exact prices.</p></div><button type="button" className="sppc-view-details sppc-edit-link" onClick={()=>onEdit?.('addons')}>Edit add-ons<ChevronRight size={16}/></button></div><div className="sppc-addon-grid">{activeAddons.length?activeAddons.map((addon,i)=><button type="button" key={addon.id||i} className={'sppc-addon-card tone-'+(i%3)} onClick={()=>onManageMedia?.('addon:'+addon.name)}><span className="sppc-addon-icon"><Plus size={16}/></span><span><b>{addon.name}</b><strong>+{formatINR(Math.round(Number(addon.rate_paise??addon.rate??0)/(addon.rate_paise!=null?100:1)))}</strong></span></button>):<div className="sppc-addon-empty">No add-ons configured for this package.</div>}</div></section>
      <section className="sppc-manage-media"><div><b>Manage your customer gallery</b><small>Add, remove and review the approved photos and videos shown in this catalogue.</small></div><button type="button" onClick={()=>onManageMedia?.('media')}>Manage media <Images size={15}/></button></section>
      <section className="sppc-trust"><div><ShieldCheck size={21}/><span><b>Secure booking flow</b><small>Final amount confirmed at checkout</small></span></div><div><BadgeCheck size={21}/><span><b>{verified?'Verified by Sambramo':'Verification status'}</b><small>{verified?'Partner verification complete':'Approval shown before publish'}</small></span></div><div><Users size={21}/><span><b>{completedEvents!=null&&Number(completedEvents)>0?'Completed '+completedEvents+'+ events':'Made for your event'}</b><small>{rating!=null&&Number(rating)>0?Number(rating).toFixed(1)+' partner rating':'Review and package details above'}</small></span></div></section>

    </article>
    {selectedMediaIndex !== null ? <MediaViewer items={displayMedia} index={selectedMediaIndex} onChange={setSelectedMediaIndex} onClose={()=>setSelectedMediaIndex(null)}/> : null}
  </>
}
