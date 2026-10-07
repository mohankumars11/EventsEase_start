import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Eye, Globe2, MapPin, Mic2, Save, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const templates = [
  { id:'professional_anchor', name:'Professional Anchor', desc:'Standard event hosting for weddings, receptions and corporate events.', icon:Mic2 },
  { id:'bilingual_anchor', name:'Bilingual Anchor', desc:'Multi-language hosting for events needing two or more languages.', icon:Globe2 },
  { id:'premium_event_host', name:'Premium Event Host', desc:'Premium hosting with coordination and advanced event flow.', icon:Sparkles },
]
const languages=['English','Kannada','Hindi','Tamil','Telugu','Malayalam','Marathi','Urdu']
const events=['Wedding','Reception','Sangeet','Engagement','Corporate','Launch','Birthday','College / School','Religious']
const styles=['Formal','Traditional','Bilingual','Fun & interactive','Comedy','Corporate-scripted']
const included=['Event announcements','Audience interaction','Games & activities','DJ coordination','Stage coordination','Event flow management']
const durations=[['2h','2 hours'],['3h','3 hours'],['4h','4 hours'],['full','Full event']]
const addonSeed=[['extra_hour','Extra hour','per hour'],['rehearsal','Rehearsal','per session'],['additional_anchor','Additional anchor','per event'],['custom_script','Custom script','one-time']]
const blank=id=>({templateId:id,languages:['English','Kannada'],eventTypes:['Wedding','Reception'],hostingStyles:['Formal'],inclusions:['Event announcements','Audience interaction','DJ coordination'],durations:{'2h':'','3h':'','4h':'','full':''},addons:addonSeed.map(x=>({key:x[0],name:x[1],unit:x[2],enabled:false,price:''})),serviceArea:'Bengaluru',radius:25,bookingNotice:2,maxEventsPerDay:1,workingDays:['Mon','Tue','Wed','Thu','Fri','Sat'],startTime:'09:00',endTime:'22:00',outstation:false})
const money=v=>v?'₹'+Number(v).toLocaleString('en-IN'):'₹—'

export default function AnchorMcTradeSetup(){
 const {user}=useAuth()
 const navigate=useNavigate()
 const [step,setStep]=useState(0)
 const [selected,setSelected]=useState(['professional_anchor'])
 const [active,setActive]=useState('professional_anchor')
 const [data,setData]=useState({professional_anchor:blank('professional_anchor')})
 const [vendor,setVendor]=useState(null)
 const [service,setService]=useState(null)
 const [status,setStatus]=useState('DRAFT')
 const [busy,setBusy]=useState(true)
 const [msg,setMsg]=useState('')
 const [preview,setPreview]=useState('customer')
 const cur=data[active]||blank(active)
 const tpl=templates.find(x=>x.id===active)||templates[0]

 useEffect(()=>{let dead=false;(async()=>{
   if(!user?.id){setBusy(false);return}
   const vr=await supabase.from('vendors').select('*').eq('profile_id',user.id).maybeSingle()
   if(dead)return
   if(vr.error){setMsg(vr.error.message);setBusy(false);return}
   setVendor(vr.data)
   if(vr.data){
     const sr=await supabase.from('vendor_services').select('*').eq('vendor_id',vr.data.id).eq('category','Anchor & MC').order('created_at',{ascending:false}).limit(1).maybeSingle()
     if(dead)return
     setService(sr.data||null)
     const p=sr.data?.specs?.sambramoTradeSetup
     if(p){setData({[p.templateId]:{...blank(p.templateId),...p}});setActive(p.templateId);setSelected([p.templateId]);setStatus(sr.data.review_status||'DRAFT')}
   }
   setBusy(false)
 })().catch(e=>{if(!dead)setMsg(e.message)});return()=>{dead=true}},[user?.id])

 const patch=p=>setData(x=>({...x,[active]:{...cur,...p}}))
 const toggle=(field,value)=>patch({[field]:(cur[field]||[]).includes(value)?cur[field].filter(x=>x!==value):[...(cur[field]||[]),value]})
 const valid=useMemo(()=>({
   service:cur.languages.length>0&&cur.eventTypes.length>0&&cur.hostingStyles.length>0,
   package:cur.inclusions.length>0,
   pricing:Object.values(cur.durations).some(Boolean)&&Object.values(cur.durations).filter(Boolean).every(v=>Number(v)>0),
   rules:Boolean(cur.serviceArea)&&Number(cur.bookingNotice)>=0&&Number(cur.maxEventsPerDay)>=1
 }),[cur])

 async function save(submit=false){
   if(!vendor){setMsg('Complete your partner profile first.');return}
   if(!valid.service||!valid.package||!valid.pricing||!valid.rules){setMsg('Complete all required sections before saving.');return}
   setBusy(true);setMsg('')
   try{
     const specs={...(service?.specs||{}),sambramoTradeSetup:cur,contractVersion:'2026-10-07.anchor-mc.v1'}
     const base={name:tpl.name,category:'Anchor & MC',description:tpl.desc,price:Number(Object.values(cur.durations).find(Boolean))||null,unit:'per event',lead_time_days:Number(cur.bookingNotice),is_active:false,specs}
     let s=service
     if(s){const r=await supabase.from('vendor_services').update(base).eq('id',s.id).eq('vendor_id',vendor.id).select().single();if(r.error)throw r.error;s=r.data}
     else{const r=await supabase.from('vendor_services').insert({...base,vendor_id:vendor.id,min_quantity:1}).select().single();if(r.error)throw r.error;s=r.data}
     setService(s)
     const trade_inputs={trade:'Anchor & MC',templateId:active,languages:cur.languages,eventTypes:cur.eventTypes,hostingStyles:cur.hostingStyles,inclusions:cur.inclusions,durations:cur.durations,serviceArea:cur.serviceArea,serviceRadiusKm:Number(cur.radius),bookingNoticeDays:Number(cur.bookingNotice),maxEventsPerDay:Number(cur.maxEventsPerDay),workingDays:cur.workingDays,workingHours:{start:cur.startTime,end:cur.endTime},outstation:cur.outstation,instantBookingEligible:!cur.outstation&&!cur.addons.some(a=>a.key==='custom_script'&&a.enabled),contractVersion:'2026-10-07.anchor-mc.v1'}
     const commercial_inputs={currency:'INR',pricingUnit:'event_variant',durations:Object.fromEntries(Object.entries(cur.durations).map(x=>[x[0],Number(x[1])*100]))}
     const existing=await supabase.from('sambramo_trade_packages').select('id,revision_round,status').eq('vendor_id',vendor.id).eq('vendor_service_id',s.id).eq('template_id',active).order('created_at',{ascending:false}).limit(1).maybeSingle()
     if(existing.error)throw existing.error
     const packagePayload={vendor_id:vendor.id,vendor_service_id:s.id,template_id:active,source:'SAMBRAMO_TEMPLATE',name:tpl.name,description:tpl.desc,commercial_inputs,trade_inputs,status:submit?'UNDER_REVIEW':'DRAFT',revision_round:submit?Number(existing.data?.revision_round||0)+1:Number(existing.data?.revision_round||0),submitted_at:submit?new Date().toISOString():existing.data?.submitted_at||null}
     let pkg
     if(existing.data){const pr=await supabase.from('sambramo_trade_packages').update(packagePayload).eq('id',existing.data.id).select().single();if(pr.error)throw pr.error;pkg=pr.data}
     else{const pr=await supabase.from('sambramo_trade_packages').insert(packagePayload).select().single();if(pr.error)throw pr.error;pkg=pr.data}
     await supabase.from('sambramo_trade_package_addons').delete().eq('package_id',pkg.id)
     const addons=cur.addons.filter(a=>a.enabled&&Number(a.price)>0).map((a,i)=>({package_id:pkg.id,name:a.name,unit:a.unit,rate_paise:Number(a.price)*100,minimum_quantity:1,included_quantity:0,active:true,sort_order:i}))
     if(addons.length){const ar=await supabase.from('sambramo_trade_package_addons').insert(addons);if(ar.error)throw ar.error}
     setStatus(submit?'UNDER_REVIEW':'DRAFT');setMsg(submit?'Submitted to Sambramo for review.':'Package saved as draft.');setStep(6)
   }catch(e){setMsg(e.message||'Could not save package.')}finally{setBusy(false)}
 }

 if(!user)return <div className="min-h-screen grid place-items-center bg-[#faf8ff]"><button className="bg-[#2A085C] text-white px-6 py-3 rounded-2xl font-bold" onClick={()=>navigate('/login')}>Sign in</button></div>
 if(busy&&!vendor)return <div className="min-h-screen grid place-items-center bg-[#faf8ff] text-slate-500 text-sm">Loading Anchor & MC setup…</div>
 if(!vendor)return <div className="min-h-screen grid place-items-center bg-[#faf8ff] p-6 text-center"><div><h1 className="text-2xl font-black">Partner profile required</h1><p className="text-slate-500 my-3">Complete your partner profile before configuring a trade.</p><button className="bg-[#2A085C] text-white px-6 py-3 rounded-2xl font-bold" onClick={()=>navigate('/onboarding/vendor')}>Set up profile</button></div></div>

 const labels=['Packages','Service','Package','Pricing','Rules','Preview','Control Center']
 return <div className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,#efe5ff,#faf8ff_36%,#fff_100%)] text-[#171221] pb-8">
  <style>{'.amc-scroll::-webkit-scrollbar{display:none}.amc-chip{transition:.18s}.amc-card{box-shadow:0 12px 40px rgba(42,8,92,.07)}'}</style>
  <header className="sticky top-0 z-20 bg-[#faf8ff]/90 backdrop-blur-xl border-b border-[#eee8f8]">
   <div className="max-w-[720px] mx-auto px-4 py-3">
    <div className="flex items-center justify-between gap-3"><button className="w-10 h-10 grid place-items-center rounded-[14px] border border-[#e5def1] bg-white text-[#2A085C]" onClick={()=>navigate('/dashboard/vendor')}><ArrowLeft size={18}/></button><b className="text-[#2A085C] text-sm">SAMBRAMO · PARTNER</b><span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-1">LIVE SETUP</span></div>
    <div className="grid grid-cols-7 gap-1 mt-3">{labels.map((_,i)=><i key={i} className={'h-1 rounded-full '+(i<=step?'bg-[#2A085C]':'bg-[#e8e2f0]')}/>)}</div>
   </div>
  </header>
  <main className="max-w-[720px] mx-auto px-4 py-6">
   <section className="pb-4"><small className="uppercase tracking-[.12em] text-[10px] font-black text-[#7955a6]">{step===0?'Anchor & MC':labels[step]}</small><h1 className="text-[29px] leading-[1.06] tracking-[-.045em] font-black mt-2">{step===0?'Set up your Anchor & MC service':step===1?'What can you provide?':step===2?'What is included?':step===3?'Configure your rate card':step===4?'Set your operating rules':step===5?'See what the customer will book':'Your Anchor & MC control center'}</h1><p className="text-sm leading-6 text-slate-500 mt-2">{step===0?'Sambramo provides the package structure. You configure what you actually offer, what it costs, and when you can take bookings.':step===1?'Choose structured capabilities. These values become customer matching inputs.':step===2?'Configure the standardized package rather than writing a free-form listing.':step===3?'Durations are standardized variants. You only enter your actual partner-side rates.':step===4?'These inputs drive availability, eligibility and the Instant Book / Quote path.':step===5?'Sambramo generates the marketplace card from your structured configuration.':'The setup is now a managed package. Future edits happen here; live changes can follow review.'}</p></section>

   {step===0&&<section className="amc-card bg-white/95 border border-[#ebe4f5] rounded-3xl p-4">{templates.map(t=>{const I=t.icon,on=selected.includes(t.id);return <button key={t.id} onClick={()=>setSelected(p=>on?p.filter(x=>x!==t.id):[...p,t.id])} className={'w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left mb-2 '+(on?'border-[#7b48d1] bg-[#fbf8ff] shadow-[0_0_0_3px_#eee4ff]':'border-[#e9e2f3] bg-white')}><span className="w-12 h-12 rounded-2xl grid place-items-center bg-[#eee2ff] text-[#2A085C] shrink-0"><I size={22}/></span><span className="min-w-0"><small className="block uppercase tracking-wide text-[9px] font-black text-slate-400">Sambramo package</small><strong className="block text-sm font-black mt-1">{t.name}</strong><em className="block not-italic text-[11px] text-slate-500 leading-4 mt-1">{t.desc}</em></span><span className={'ml-auto w-6 h-6 rounded-lg grid place-items-center '+(on?'bg-[#2A085C] text-white':'border border-slate-200')}>{on&&<Check size={14}/>}</span></button>})}<div className="mt-3 p-3 rounded-2xl bg-[#f7f2ff] border border-[#e9dcfb] text-[11px] text-[#6c5785]"><b>{selected.length} package{selected.length===1?'':'s'} selected.</b> Partners cannot create arbitrary package structures.</div></section>}

   {step===1&&<Card><Group title="Languages you host in"><Chips values={languages} selected={cur.languages} on={v=>toggle('languages',v)}/></Group><Group title="Event types you host"><Chips values={events} selected={cur.eventTypes} on={v=>toggle('eventTypes',v)}/></Group><Group title="Hosting style"><Chips values={styles} selected={cur.hostingStyles} on={v=>toggle('hostingStyles',v)}/></Group></Card>}

   {step===2&&<Card><Chips values={included} selected={cur.inclusions} on={v=>toggle('inclusions',v)}/><Group title="Optional services">{cur.addons.map(a=><div key={a.key} className="flex items-center justify-between gap-3 py-3 border-b border-slate-100 last:border-0"><span><b className="block text-xs">{a.name}</b><small className="text-[10px] text-slate-400">{a.unit}</small></span><button onClick={()=>patch({addons:cur.addons.map(x=>x.key===a.key?{...x,enabled:!x.enabled}:x)})} className={'w-11 h-6 rounded-full p-1 flex '+(a.enabled?'justify-end bg-[#2A085C]':'bg-slate-200')}><i className="w-4 h-4 bg-white rounded-full shadow-sm"/></button></div>)}</Group></Card>}

   {step===3&&<Card><Group title="Package variants">{durations.map(x=><div key={x[0]} className="grid grid-cols-[1fr_120px] gap-2 items-center py-2.5 border-b border-slate-100 last:border-0"><span><b className="block text-xs">{x[1]}</b><small className="text-[10px] text-slate-400">Package variant</small></span><input className="h-12 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-purple-500" inputMode="numeric" placeholder="₹ amount" value={cur.durations[x[0]]} onChange={e=>patch({durations:{...cur.durations,[x[0]]:e.target.value.replace(/\\D/g,'')}})}/></div>)}</Group><Group title="Add-on pricing">{cur.addons.filter(a=>a.enabled).map(a=><div key={a.key} className="grid grid-cols-[1fr_120px] gap-2 items-center py-2.5 border-b border-slate-100 last:border-0"><span><b className="block text-xs">{a.name}</b><small className="text-[10px] text-slate-400">{a.unit}</small></span><input className="h-12 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none" inputMode="numeric" placeholder="₹ amount" value={a.price} onChange={e=>patch({addons:cur.addons.map(x=>x.key===a.key?{...x,price:e.target.value.replace(/\\D/g,'')}:x)})}/></div>)}</Group></Card>}

   {step===4&&<Card><Group title="Service area"><div className="grid grid-cols-2 gap-2"><Field label="Primary city"><input value={cur.serviceArea} onChange={e=>patch({serviceArea:e.target.value})}/></Field><Field label="Radius (km)"><input inputMode="numeric" value={cur.radius} onChange={e=>patch({radius:e.target.value.replace(/\\D/g,'')})}/></Field></div></Group><Group title="Booking notice & capacity"><div className="grid grid-cols-2 gap-2"><Field label="Minimum notice (days)"><input inputMode="numeric" value={cur.bookingNotice} onChange={e=>patch({bookingNotice:e.target.value.replace(/\\D/g,'')})}/></Field><Field label="Events per day"><input inputMode="numeric" value={cur.maxEventsPerDay} onChange={e=>patch({maxEventsPerDay:e.target.value.replace(/\\D/g,'')})}/></Field></div></Group><Group title="Working days"><Chips values={['Mon','Tue','Wed','Thu','Fri','Sat','Sun']} selected={cur.workingDays} on={v=>toggle('workingDays',v)}/></Group><Group title="Working hours"><div className="grid grid-cols-2 gap-2"><input className="h-12 rounded-xl border border-slate-200 px-3" type="time" value={cur.startTime} onChange={e=>patch({startTime:e.target.value})}/><input className="h-12 rounded-xl border border-slate-200 px-3" type="time" value={cur.endTime} onChange={e=>patch({endTime:e.target.value})}/></div></Group><div className="flex items-center justify-between gap-3 py-3"><span><b className="block text-xs">Outstation / destination work</b><small className="text-[10px] text-slate-400">May route unresolved travel or stay to quote.</small></span><button onClick={()=>patch({outstation:!cur.outstation})} className={'w-11 h-6 rounded-full p-1 flex '+(cur.outstation?'justify-end bg-[#2A085C]':'bg-slate-200')}><i className="w-4 h-4 bg-white rounded-full shadow-sm"/></button></div></Card>}

   {step===5&&<><div className="flex bg-[#f4eff9] rounded-xl p-1"><button onClick={()=>setPreview('partner')} className={'flex-1 py-2 rounded-lg text-[11px] font-black '+(preview==='partner'?'bg-white text-[#2A085C] shadow':'text-slate-500')}>Partner Preview</button><button onClick={()=>setPreview('customer')} className={'flex-1 py-2 rounded-lg text-[11px] font-black '+(preview==='customer'?'bg-white text-[#2A085C] shadow':'text-slate-500')}>Customer Preview</button></div><div className="overflow-hidden rounded-3xl bg-white border border-[#e7dfef] shadow-xl mt-3"><div className="h-44 bg-gradient-to-br from-[#2A085C] to-[#7141aa] flex items-end justify-between p-5 text-white"><div><small className="text-[9px] font-black opacity-70">SAMBRAMO · VERIFIED PACKAGE</small><h2 className="text-2xl font-black tracking-tight mt-1">{tpl.name}</h2><span className="text-[11px] opacity-85">{cur.languages.slice(0,3).join(' · ')}</span></div><div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#cba8ff] to-[#7d49ba] grid place-items-center shadow-2xl"><Mic2 size={36}/></div></div><div className="p-4"><div className="flex justify-between items-center"><b className="text-[9px] bg-emerald-50 text-emerald-700 rounded-full px-2 py-1">{cur.outstation?'GET QUOTE':'INSTANT BOOK ELIGIBLE'}</b><small className="text-slate-500 flex items-center gap-1"><ShieldCheck size={13}/> Structured package</small></div><div className="flex flex-wrap gap-2 mt-3">{cur.eventTypes.slice(0,5).map(x=><span key={x} className="text-[10px] font-bold bg-[#f0e7ff] text-[#2A085C] rounded-lg px-2 py-1.5">{x}</span>)}</div><h4 className="text-xs font-black mt-4 mb-2">Select duration</h4><div className="grid grid-cols-3 gap-2">{durations.slice(0,3).map(x=><div key={x[0]} className="p-2.5 border rounded-xl text-center"><small className="block text-[9px] text-slate-400">{x[1]}</small><b className="block text-xs text-[#2A085C] mt-1">{money(cur.durations[x[0]])}</b></div>)}</div><h4 className="text-xs font-black mt-4 mb-2">Included</h4><div className="grid grid-cols-2 gap-2">{cur.inclusions.slice(0,6).map(x=><span key={x} className="text-[10px] text-slate-600 flex gap-1 items-center"><CheckCircle2 size={13} className="text-purple-600"/>{x}</span>)}</div><div className="flex items-center justify-between gap-3 border-t mt-4 pt-3"><div><small className="block text-[9px] text-slate-400">Starting package rate</small><strong className="text-xl text-[#2A085C]">{money(Object.values(cur.durations).find(Boolean))}</strong></div><button className="bg-[#2A085C] text-white rounded-xl px-5 h-11 font-black text-xs">{cur.outstation?'Get Quote':'Book Now'}</button></div></div></div></>}

   {step===6&&<><div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3"><CheckCircle2 size={18}/>{msg||'Package is saved.'}</div><Card><div className="flex justify-between items-center py-3 border-b border-slate-100"><span><small className="block text-[10px] text-slate-400">Package</small><b>{tpl.name}</b></span><mark className="bg-[#f0e7ff] text-[#2A085C] rounded-full px-2 py-1 text-[9px] font-black">{status}</mark></div><div className="flex justify-between items-center py-3 border-b border-slate-100"><span><small className="block text-[10px] text-slate-400">Variants configured</small><b>{Object.values(cur.durations).filter(Boolean).length}</b></span><Zap size={19} className="text-purple-600"/></div><div className="flex justify-between items-center py-3 border-b border-slate-100"><span><small className="block text-[10px] text-slate-400">Booking mode</small><b>{cur.outstation?'Quote-first':'Instant Book candidate'}</b></span><CalendarDays size={19} className="text-purple-600"/></div><div className="flex justify-between items-center py-3"><span><small className="block text-[10px] text-slate-400">Service area</small><b>{cur.serviceArea} · {cur.radius} km</b></span><MapPin size={19} className="text-purple-600"/></div></Card></>}

   {msg&&step!==6&&<div className="mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">{msg}</div>}
   <div className="sticky bottom-0 -mx-4 mt-6 px-4 py-3 bg-[#faf8ff]/95 backdrop-blur-xl border-t border-[#eee8f8] flex gap-2">
    {step>0&&step<6&&<button className="px-4 h-12 rounded-2xl bg-white border border-slate-200 font-bold text-xs flex items-center gap-1" onClick={()=>setStep(step-1)}><ArrowLeft size={15}/>Back</button>}
    {step===0&&<button className="flex-1 h-12 rounded-2xl bg-[#2A085C] text-white font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50" disabled={!selected.length} onClick={()=>{setActive(selected[0]);setStep(1)}}>Configure selected package{selected.length>1?'s':''}<ArrowRight size={16}/></button>}
    {step>0&&step<5&&<button className="flex-1 h-12 rounded-2xl bg-[#2A085C] text-white font-black text-xs flex items-center justify-center gap-2" onClick={()=>setStep(step+1)}>Continue<ArrowRight size={16}/></button>}
    {step===5&&<><button className="px-4 h-12 rounded-2xl bg-white border border-slate-200 font-bold text-xs flex items-center gap-1" onClick={()=>setStep(3)}><Eye size={15}/>Edit</button><button className="flex-1 h-12 rounded-2xl bg-[#2A085C] text-white font-black text-xs flex items-center justify-center gap-2" disabled={busy} onClick={()=>save(false)}><Save size={16}/>{busy?'Saving…':'Save Package'}</button></>}
    {step===6&&<><button className="px-4 h-12 rounded-2xl bg-white border border-slate-200 font-bold text-xs flex items-center gap-1" onClick={()=>setStep(5)}><Eye size={15}/>Preview</button><button className="flex-1 h-12 rounded-2xl bg-[#2A085C] text-white font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50" disabled={busy||status==='UNDER_REVIEW'} onClick={()=>save(true)}><ShieldCheck size={16}/>{status==='UNDER_REVIEW'?'Under Review':'Submit for Review'}</button></>}
   </div>
  </main>
 </div>
}
function Card({children}){return <section className="amc-card bg-white/95 border border-[#ebe4f5] rounded-3xl p-4">{children}</section>}
function Group({title,children}){return <div className="mt-5 first:mt-0"><h3 className="text-xs font-black mb-2">{title}</h3>{children}</div>}
function Field({label,children}){return <label className="grid gap-1.5"><small className="text-[10px] text-slate-400">{label}</small>{children}</label>}
function Chips({values,selected,on}){return <div className="flex flex-wrap gap-2">{values.map(v=><button key={v} onClick={()=>on(v)} className={'amc-chip min-h-10 rounded-xl px-3 text-[11px] font-bold border '+(selected.includes(v)?'bg-[#f0e7ff] border-[#8b5bd1] text-[#2A085C]':'bg-white border-[#e1d9ed] text-slate-600')}>{selected.includes(v)&&<span className="inline-grid place-items-center w-3.5 h-3.5 rounded-full bg-[#2A085C] text-white mr-1"><Check size={9}/></span>}{v}</button>)}</div>}
