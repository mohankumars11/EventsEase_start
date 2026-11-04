import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { MapPin, Utensils, MessageCircle } from 'lucide-react'
import { BRAND } from '../../config/sambramo'
import { OCCASION } from '../data/occasions'
import { usePlan } from '../state/PlanContext'
import { savedWhere } from '../lib/where'
import { BackHeader, ActionBar } from '../ui/kit'

const DIETS = [['any','Any preference'],['veg','Vegetarian'],['non_veg','Non-vegetarian'],['mixed','Both']]
const MEALS = [['breakfast','Breakfast'],['lunch','Lunch'],['dinner','Dinner'],['snacks','Snacks / refreshments']]
const FULFILMENT = [['delivery','Deliver to my venue'],['pickup','I will collect']]

export default function RestaurantOrder() {
  const { occasionId } = useParams()
  const occasion = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const event = plan.event
  const place = plan.place?.lat ? plan.place : savedWhere()
  const saved = plan.needsOf(occasionId, 'restaurant')
  const [cuisine, setCuisine] = useState(saved.cuisine ?? '')
  const [diet, setDiet] = useState(saved.diet ?? 'any')
  const [meal, setMeal] = useState(saved.meal ?? 'dinner')
  const [fulfilment, setFulfilment] = useState(saved.fulfilment ?? 'delivery')
  const [quantity, setQuantity] = useState(Number(saved.quantity) || Number(event.guests) || 25)
  const [notes, setNotes] = useState(saved.notes ?? '')

  const message = useMemo(() => [
    'Hi Sambramo, please source restaurant options as a separate restaurant order (not event catering).',
    occasion ? `Occasion: ${occasion.name}` : null,
    event.date ? `Date: ${event.date}` : null,
    event.time ? `Time: ${event.time}` : null,
    `Quantity: ${quantity} people`,
    place?.area ? `Location: ${place.area}` : null,
    cuisine.trim() ? `Cuisine: ${cuisine.trim()}` : null,
    `Food preference: ${DIETS.find(x => x[0] === diet)?.[1] ?? diet}`,
    `Meal: ${MEALS.find(x => x[0] === meal)?.[1] ?? meal}`,
    `Fulfilment: ${FULFILMENT.find(x => x[0] === fulfilment)?.[1] ?? fulfilment}`,
    notes.trim() ? `Notes: ${notes.trim()}` : null,
    'Please share real restaurant menus, prices, minimum quantities, delivery availability and order cut-off before I decide.',
  ].filter(Boolean).join('\n'), [occasion, event.date, event.time, quantity, place?.area, cuisine, diet, meal, fulfilment, notes])

  if (!occasion) return <Navigate to="/" replace />

  const save = () => plan.setNeeds(`${occasionId}:restaurant`, { cuisine, diet, meal, fulfilment, quantity, notes })
  const sourceUrl = `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(message)}`

  return (
    <main className="cx-enter min-h-[100dvh] bg-white pb-[calc(env(safe-area-inset-bottom,0px)+110px)]" data-restaurant-order>
      <BackHeader title="Order from a restaurant" sub="Food & dining" onBack={() => navigate(-1)} />
      <section className="mx-4 mt-4 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#F8F3FF] via-white to-[#EFE6FF] p-4 shadow-[0_0_0_1px_#EDE3FB]">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-white text-[#5B21B6]"><Utensils size={22}/></span>
          <div><h1 className="text-[20px] font-black leading-tight">Restaurant orders, not catering</h1><p className="mt-1 text-[12px] font-semibold leading-snug text-[var(--ink-2)]">Choose the food you want. We’ll source restaurants with their own menus and prices separately from caterers.</p></div>
        </div>
        <p className="mt-3 rounded-[13px] bg-white/80 px-3 py-2 text-[11px] font-semibold leading-snug text-[#6B5A83]">Restaurant ordering is not yet connected to live restaurant listings in this build. This request does not place an order or confirm a price.</p>
      </section>

      <section className="mx-4 mt-5 space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-[15px] font-extrabold">Order details</h2><span className="text-[11px] font-bold text-[var(--ink-3)]">{occasion.name}</span></div>
        <Field label="How many people?" hint="Use the expected order quantity, not necessarily the full guest count.">
          <input type="number" min="1" max="100000" value={quantity} onChange={e => setQuantity(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))} className="h-12 w-full rounded-[13px] bg-white px-3 text-[15px] font-bold shadow-[inset_0_0_0_1px_#E9E3F2]" />
        </Field>
        <Field label="Cuisine or restaurant style" hint="Optional — e.g. Karnataka meals, biryani, North Indian, pizza.">
          <input value={cuisine} onChange={e => setCuisine(e.target.value.slice(0,80))} placeholder="What would you like to eat?" className="h-12 w-full rounded-[13px] bg-white px-3 text-[14px] font-semibold shadow-[inset_0_0_0_1px_#E9E3F2]" />
        </Field>
        <Field label="Food preference"><Chips items={DIETS} value={diet} onPick={setDiet}/></Field>
        <Field label="Meal"><Chips items={MEALS} value={meal} onPick={setMeal}/></Field>
        <Field label="How should you receive it?"><Chips items={FULFILMENT} value={fulfilment} onPick={setFulfilment}/></Field>
        <Field label="Anything else?" hint="Allergies, packaging, delivery instructions or preferred restaurants.">
          <textarea value={notes} onChange={e => setNotes(e.target.value.slice(0,400))} rows={3} placeholder="Add a note (optional)" className="w-full rounded-[13px] bg-white p-3 text-[13px] font-semibold shadow-[inset_0_0_0_1px_#E9E3F2]" />
        </Field>
        <div className="flex items-start gap-2 rounded-[14px] bg-[#F7F4FB] p-3 text-[11.5px] font-semibold text-[var(--ink-2)]"><MapPin size={15} className="mt-0.5 shrink-0 text-[#7C3AED]"/><span>{place?.area ? `Delivery / pickup area: ${place.area}` : 'Add your event location to help source nearby restaurants.'} {event.date ? `Event date: ${event.date}.` : ''}</span></div>
      </section>

      <ActionBar note="No order is placed until you review a real restaurant menu, its price and delivery terms.">
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" onClick={save} className="cx-press cx-cta flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" data-source-restaurant>
          <MessageCircle size={18}/> Ask Sambramo to source restaurants
        </a>
      </ActionBar>
    </main>
  )
}

function Field({label,hint,children}) {
  return <div><p className="mb-1.5 text-[13px] font-extrabold">{label}</p>{children}{hint && <p className="mt-1 text-[10.5px] font-semibold text-[var(--ink-3)]">{hint}</p>}</div>
}
function Chips({items,value,onPick}) {
  return <div className="flex flex-wrap gap-1.5">{items.map(([id,label])=><button key={id} type="button" aria-pressed={value===id} onClick={()=>onPick(id)} className={'cx-press rounded-full px-3 py-2 text-[11.5px] font-bold '+(value===id?'bg-[#EEE5FF] text-[#4C1D95] shadow-[inset_0_0_0_1.5px_#7C3AED]':'bg-white text-[var(--ink-2)] shadow-[inset_0_0_0_1px_#E9E3F2]')}>{label}</button>)}</div>
}
