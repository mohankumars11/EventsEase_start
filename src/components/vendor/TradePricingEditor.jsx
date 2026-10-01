import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Eye, PackagePlus, Plus, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import { tradePricingDefinition } from '../../data/tradePricingStudio'

const blank = def => ({
  id:null, source:'PARTNER_CUSTOM', template_id:null,
  name:def.templates[0] ?? 'My Package', description:'',
  commercial_inputs:{
    base_price:'', pricing_unit:def.unit, minimum_order:'1', included_quantity:'1',
    included_duration:'', additional_unit_rate:'', additional_duration_rate:'',
    setup_fee:'', teardown_fee:'', travel_policy:'zone_based', lead_time:'',
  },
  trade_inputs:Object.fromEntries(def.fields.map(x=>[x,''])),
  addons:[],
  status:'DRAFT', revision_round:0,
})

export default function TradePricingEditor({ vendor, service, onBack, onOpenListings }) {
  const def=useMemo(()=>tradePricingDefinition(service?.category),[service?.category])
  const [packages,setPackages]=useState([])
  const [editing,setEditing]=useState(null)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [preview,setPreview]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')

  const load=useCallback(async()=>{
    if(!service?.id){setPackages([]);setLoading(false);return}
    setLoading(true);setError('')
    try{
      const {data,error}=await supabase.from('sambramo_trade_packages')
        .select('*, addons:sambramo_trade_package_addons(*), price_versions:sambramo_trade_price_versions(*)')
        .eq('vendor_service_id',service.id)
        .order('updated_at',{ascending:false})
      if(error) throw error
      setPackages(data??[])
    }catch(e){setError(e?.message??'Could not load pricing for this listing.')}
    finally{setLoading(false)}
  },[service?.id])

  useEffect(()=>{load()},[load])

  const openNew=(source='PARTNER_CUSTOM',template=null)=>{
    const next=blank(def)
    next.source=source
    next.template_id=template
    next.name=template || ''
    setNotice('');setPreview(false);setEditing(next)
  }

  const openExisting=p=>{
    const latest=(p.price_versions??[]).filter(v=>v.status!=='SUPERSEDED').sort((a,b)=>Number(b.version)-Number(a.version))[0]
    setNotice('');setPreview(false);setEditing({
      id:p.id,source:p.source,template_id:p.template_id,name:p.name,description:p.description??'',
      commercial_inputs:p.commercial_inputs??{},trade_inputs:p.trade_inputs??{},
      addons:(p.addons??[]).filter(x=>x.active!==false).map(x=>({name:x.name,unit:x.unit,rate:String(Math.round(Number(x.rate_paise||0)/100)),minimum_quantity:String(x.minimum_quantity??1),included_quantity:String(x.included_quantity??0)})),
      status:p.status,revision_round:Number(p.revision_round||0),price_version:latest?.version??0,
    })
  }

  const patch=(path,value)=>{
    setEditing(e=>{
      const [a,b]=path.split('.')
      if(a==='commercial_inputs') return {...e,commercial_inputs:{...e.commercial_inputs,[b]:value}}
      if(a==='trade_inputs') return {...e,trade_inputs:{...e.trade_inputs,[b]:value}}
      return {...e,[a]:value}
    })
  }

  const addAddon=()=>setEditing(e=>({...e,addons:[...e.addons,{name:'',unit:'per_event',rate:'',minimum_quantity:'1',included_quantity:'0'}]}))
  const removeAddon=i=>setEditing(e=>({...e,addons:e.addons.filter((_,n)=>n!==i)}))

  const save=async(status='DRAFT')=>{
    if(!editing?.name?.trim()) {setError('Give this package a customer-facing name.');return}
    if(status==='UNDER_REVIEW' && Number(editing.commercial_inputs.base_price||0)<=0){setError('Add the supply-side base price before sending this package for review.');return}
    setSaving(true);setError('');setNotice('')
    try{
      const pkg={...editing,status,revision_round:status==='UNDER_REVIEW'?Number(editing.revision_round||0)+1:Number(editing.revision_round||0)}
      const addons=(editing.addons??[]).map((x,i)=>({
        name:x.name,unit:x.unit||'per_event',rate_paise:Math.round(Number(x.rate||0)*100),
        minimum_quantity:Number(x.minimum_quantity||1),included_quantity:Number(x.included_quantity||0),active:true,sort_order:i
      }))
      const {data,error}=await supabase.rpc('save_sambramo_trade_package',{
        p_vendor_service_id:service.id,p_package_id:editing.id,p_package:{
          name:pkg.name,source:pkg.source,template_id:pkg.template_id,description:pkg.description,
          commercial_inputs:pkg.commercial_inputs,trade_inputs:pkg.trade_inputs,status,
          revision_round:pkg.revision_round,
        },p_addons:addons,p_pricing:{...pkg.commercial_inputs}
      })
      if(error) throw error
      setNotice(status==='UNDER_REVIEW'?'Submitted. Sambramo review is required before this becomes customer-live.':'Draft saved.')
      setEditing(e=>({...e,id:data?.package_id??e.id,status}))
      await load()
    }catch(e){setError(e?.message??'Could not save this package.')}
    finally{setSaving(false)}
  }

  if(!editing){
    return <div className="space-y-4 pb-6">
      <div className="flex items-center gap-2">
        <button onClick={onBack} type="button" aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-ink/[0.08]"><ArrowLeft size={18}/></button>
        <div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-plum-600">Pricing · {service?.category}</p><h2 className="truncate text-[22px] font-extrabold text-plum-950">{service?.name||service?.category}</h2></div>
      </div>
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-plum-950 via-plum-800 to-violet-700 p-5 text-white">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/60">Listing-scoped pricing</p>
        <h3 className="mt-1 text-[22px] font-extrabold">Build pricing for this listing.</h3>
        <p className="mt-2 text-[12px] leading-relaxed text-white/75">Only this partner service can be priced here. Sambramo's other trades stay completely outside this screen.</p>
      </section>
      <section className="rounded-[24px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">Start your packages</p>
        <h3 className="mt-1 text-[19px] font-extrabold text-ink">You control the offer. Sambramo controls the structure.</h3>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-mute">Use a ready-made {service?.category} package, create your own, or mix both. The package is trade-specific on screen and canonical underneath.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button onClick={()=>openNew('SAMBRAMO_TEMPLATE',def.templates[0])} className="rounded-[20px] bg-plum-50 p-4 text-left ring-1 ring-plum-100"><Sparkles size={19} className="text-plum-700"/><b className="mt-3 block text-[13px] text-plum-950">Use a Sambramo package</b><span className="mt-1 block text-[11px] leading-relaxed text-ink-mute">Ready-made structure for {service?.category}. You still set your actual rates.</span></button>
          <button onClick={()=>openNew('PARTNER_CUSTOM')} className="rounded-[20px] bg-white p-4 text-left ring-1 ring-ink/[0.08]"><PackagePlus size={19} className="text-plum-700"/><b className="mt-3 block text-[13px] text-ink">Create your own package</b><span className="mt-1 block text-[11px] leading-relaxed text-ink-mute">Build your own customer-facing offer using guided fields.</span></button>
        </div>
        <button onClick={()=>openNew('SAMBRAMO_TEMPLATE',def.templates[0])} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3 text-[12px] font-extrabold text-plum-950"><Plus size={15}/> Use both / add another package</button>
      </section>
      {error&&<p className="rounded-2xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-800">{error}</p>}
      {loading?<div className="rounded-[24px] bg-white p-10 text-center text-[12px] text-ink-mute">Loading this listing's pricing…</div>:
        packages.length?<div className="space-y-2.5">{packages.map(p=><button key={p.id} onClick={()=>openExisting(p)} className="w-full rounded-[24px] bg-white p-4 text-left ring-1 ring-ink/[0.07]"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-plum-50 text-plum-700"><PackagePlus size={18}/></span><span className="min-w-0 flex-1"><b className="block truncate text-[14px]">{p.name}</b><small className="text-[11px] text-ink-mute">{p.source==='SAMBRAMO_TEMPLATE'?'Sambramo template':'Your package'} · {p.status}</small></span><ChevronRight size={17}/></div></button>)}</div>:
        <div className="rounded-[24px] border border-dashed border-plum-200 bg-plum-50/40 p-5 text-[12px] text-ink-soft">No package yet for this listing. Start with a Sambramo structure or create your own.</div>}
      <div className="rounded-[24px] bg-surface p-4"><div className="flex items-center gap-2 text-[12px] font-extrabold"><ShieldCheck size={15} className="text-plum-700"/>Review gate is part of pricing</div><p className="mt-1.5 text-[11px] leading-relaxed text-ink-mute">Draft → submit → Sambramo review → approved/live. A partner cannot publish pricing directly.</p></div>
      {onOpenListings&&<button type="button" onClick={onOpenListings} className="w-full rounded-2xl bg-white py-3 text-[12px] font-extrabold text-plum-700 ring-1 ring-ink/[0.08]">Edit the listing itself</button>}
    </div>
  }

  return <div className="space-y-4 pb-6">
    <div className="flex items-center justify-between gap-2"><button type="button" onClick={()=>setEditing(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-ink/[0.08]"><ArrowLeft size={18}/></button><div className="flex items-center gap-2"><span className="rounded-full bg-ink/[0.05] px-2.5 py-1 text-[10px] font-extrabold">{editing.status}</span><button type="button" onClick={()=>setPreview(v=>!v)} className="flex items-center gap-1.5 rounded-full bg-plum-50 px-3 py-2 text-[11px] font-extrabold text-plum-700"><Eye size={14}/>{preview?'Edit':'Preview'}</button></div></div>
    {preview?<PreviewCard service={service} draft={editing}/>:<EditorForm service={service} def={def} draft={editing} patch={patch} addAddon={addAddon} removeAddon={removeAddon}/>}
    {error&&<p className="rounded-2xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-800">{error}</p>}
    {notice&&<p className="rounded-2xl bg-forest-50 p-3 text-[11px] font-semibold text-forest-800">{notice}</p>}
    <div className="flex gap-2 pt-2"><button type="button" disabled={saving} onClick={()=>save('DRAFT')} className="flex-1 rounded-2xl bg-white py-3 text-[12px] font-extrabold text-ink ring-1 ring-ink/[0.08]">{saving?'Saving…':'Save draft'}</button><button type="button" disabled={saving} onClick={()=>save('UNDER_REVIEW')} className="flex-[1.4] rounded-2xl bg-plum-700 py-3 text-[12px] font-extrabold text-white">{saving?'Submitting…':'Submit for Sambramo review'}</button></div>
  </div>
}

function EditorForm({service,def,draft,patch,addAddon,removeAddon}){
  return <div className="rounded-[24px] bg-white p-4 ring-1 ring-ink/[0.06]">
    <div><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-plum-600">Trade-specific package</p><h2 className="mt-1 text-[21px] font-extrabold text-plum-950">{service?.category}</h2><p className="mt-1 text-[11px] text-ink-mute">Your package name and rates remain yours. The fields below are mapped to the canonical Sambramo pricing structure.</p></div>
    {draft.source==='SAMBRAMO_TEMPLATE'&&<label className="mt-4 block text-[11px] font-bold text-ink-mute">Sambramo template<select value={draft.name} onChange={e=>patch('name',e.target.value)} className="mt-1.5 w-full rounded-xl border-0 bg-surface px-3 py-3 text-[13px] font-extrabold text-ink ring-1 ring-ink/[0.06]">{def.templates.map(x=><option key={x}>{x}</option>)}</select></label>}
    <div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Customer-facing package name" value={draft.name} onChange={v=>patch('name',v)}/><Field label="Base supply rate (₹)" type="number" value={draft.commercial_inputs.base_price} onChange={v=>patch('commercial_inputs.base_price',v)}/><Field label="Included quantity" type="number" value={draft.commercial_inputs.included_quantity} onChange={v=>patch('commercial_inputs.included_quantity',v)}/><Field label="Included duration" value={draft.commercial_inputs.included_duration} onChange={v=>patch('commercial_inputs.included_duration',v)}/><Field label="Additional unit rate (₹)" type="number" value={draft.commercial_inputs.additional_unit_rate} onChange={v=>patch('commercial_inputs.additional_unit_rate',v)}/><Field label="Additional duration rate (₹)" type="number" value={draft.commercial_inputs.additional_duration_rate} onChange={v=>patch('commercial_inputs.additional_duration_rate',v)}/><Field label="Setup fee (₹)" type="number" value={draft.commercial_inputs.setup_fee} onChange={v=>patch('commercial_inputs.setup_fee',v)}/><Field label="Teardown fee (₹)" type="number" value={draft.commercial_inputs.teardown_fee} onChange={v=>patch('commercial_inputs.teardown_fee',v)}/><Field label="Lead time" value={draft.commercial_inputs.lead_time} onChange={v=>patch('commercial_inputs.lead_time',v)}/><Field label="Minimum order" type="number" value={draft.commercial_inputs.minimum_order} onChange={v=>patch('commercial_inputs.minimum_order',v)}/></div>
    <label className="mt-3 block text-[11px] font-bold text-ink-mute">Pricing unit<select value={draft.commercial_inputs.pricing_unit||def.unit} onChange={e=>patch('commercial_inputs.pricing_unit',e.target.value)} className="mt-1.5 w-full rounded-xl border-0 bg-surface px-3 py-3 text-[13px] font-extrabold text-ink ring-1 ring-ink/[0.06]">{['package','event','hour','day','person','guest','item','trip','shift','kg','box','vehicle-day','month','project','per-unit'].map(x=><option key={x}>{x}</option>)}</select></label>
    <div className="mt-5 border-t border-ink/[0.06] pt-4"><p className="text-[12px] font-extrabold text-ink">Trade-specific inputs</p><div className="mt-2 grid gap-3 sm:grid-cols-2">{def.fields.map(f=><Field key={f} label={f} value={draft.trade_inputs[f]??''} onChange={v=>patch('trade_inputs.'+f,v)}/>)}</div></div>
    <div className="mt-5 border-t border-ink/[0.06] pt-4"><div className="flex items-center justify-between"><div><p className="text-[12px] font-extrabold text-ink">Add-ons</p><p className="text-[10px] text-ink-mute">Optional upgrades calculated separately.</p></div><button type="button" onClick={addAddon} className="rounded-full bg-plum-50 p-2 text-plum-700"><Plus size={15}/></button></div>{(draft.addons??[]).map((a,i)=><div key={i} className="mt-2 rounded-xl bg-surface p-3"><div className="grid gap-2 sm:grid-cols-2"><Field label="Name" value={a.name} onChange={v=>{const x=[...draft.addons];x[i]={...x[i],name:v};/* parent patch through JSON */}}/><Field label="Rate (₹)" value={a.rate} onChange={v=>{const x=[...draft.addons];x[i]={...x[i],rate:v};}}/></div><button type="button" onClick={()=>removeAddon(i)} className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600"><Trash2 size={13}/>Remove</button></div>)}</div>
    <p className="mt-4 rounded-xl bg-amber-50 p-3 text-[10.5px] leading-relaxed text-amber-900">Partner rate → Sambramo pricing engine. The customer price is not typed here. Runtime eligibility can still switch this package to quote/survey when the request needs more information.</p>
  </div>
}

function Field({label,value,onChange,type='text'}){return <label className="block text-[11px] font-bold text-ink-mute">{label}<input type={type} value={value??''} onChange={e=>onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border-0 bg-surface px-3 py-2.5 text-[12px] font-semibold text-ink ring-1 ring-ink/[0.06] outline-none focus:ring-2 focus:ring-plum-300"/></label>}

function PreviewCard({service,draft}){return <section className="overflow-hidden rounded-[26px] bg-white ring-1 ring-ink/[0.08]"><div className="h-36 bg-gradient-to-br from-plum-950 via-plum-800 to-violet-600 p-4 text-white"><span className="text-[9px] font-extrabold tracking-[0.15em] text-white/65">SAMBRAMO · {service?.category?.toUpperCase()}</span><h3 className="mt-9 text-[20px] font-extrabold">{draft.name||'Your package'}</h3></div><div className="p-4"><p className="text-[11px] leading-relaxed text-ink-mute">{draft.description||'Trade-specific service package with structured inclusions and optional upgrades.'}</p><div className="mt-4 rounded-2xl bg-surface p-3"><span className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">Starting from</span><b className="mt-1 block text-[22px] font-extrabold text-plum-900">{formatINR(Number(draft.commercial_inputs.base_price||0))}</b><span className="text-[10px] text-ink-mute">{draft.commercial_inputs.pricing_unit||'package'}</span></div><div className="mt-4 space-y-2">{Object.entries(draft.trade_inputs??{}).filter(([,v])=>String(v).trim()).slice(0,5).map(([k,v])=><div key={k} className="flex justify-between gap-4 text-[10.5px]"><span className="text-ink-mute">{k}</span><b className="text-right text-ink">{v}</b></div>)}</div></div></section>}
