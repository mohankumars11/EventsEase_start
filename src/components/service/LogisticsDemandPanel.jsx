import { useMemo } from 'react'
import { MapPin, Users, Package, Warehouse, Boxes } from 'lucide-react'

const DEFINITIONS = {
  mini_truck: {
    title: 'What are you moving?',
    description: 'Give us the cargo and route basics so we can find a suitable small goods vehicle.',
    fields: [
      { id: 'cargo', type: 'multi', label: 'Cargo type', options: [
        ['decor', 'Decor / floral'], ['food', 'Packed food / catering gear'], ['av', 'Event equipment'],
        ['furniture', 'Chairs / tables / furniture'], ['materials', 'Bulk event materials'],
      ]},
      { id: 'weight_kg', type: 'number', label: 'Approximate load weight (kg)', placeholder: 'e.g. 350' },
      { id: 'route_km', type: 'number', label: 'Approximate total route (km)', placeholder: 'e.g. 24' },
    ],
  },
  goods_vehicle: {
    title: 'Tell us about the cargo',
    description: 'Heavy or bulky loads need the vehicle, payload and handling requirement to match.',
    fields: [
      { id: 'weight_kg', type: 'number', label: 'Approximate load weight (kg)', placeholder: 'e.g. 2500' },
      { id: 'dimensions', type: 'text', label: 'Largest item dimensions', placeholder: 'e.g. 12 ft × 4 ft × 3 ft' },
      { id: 'handling', type: 'multi', label: 'Handling', options: [
        ['fragile', 'Fragile / secured'], ['oversize', 'Oversized'], ['heavy', 'Heavy equipment'],
        ['closed', 'Closed-body required'], ['tail_lift', 'Tail lift / loading equipment'],
      ]},
      { id: 'route_km', type: 'number', label: 'Approximate total route (km)', placeholder: 'e.g. 36' },
    ],
  },
  passenger_transport: {
    title: 'How will guests travel?',
    description: 'Tell us the group size, stops and duration so we can match the right passenger vehicle.',
    fields: [
      { id: 'passengers', type: 'number', label: 'Guests travelling', placeholder: 'e.g. 28' },
      { id: 'stops', type: 'number', label: 'Pickup / drop locations', placeholder: 'e.g. 3' },
      { id: 'duration_hours', type: 'number', label: 'Approximate duty duration (hours)', placeholder: 'e.g. 8' },
      { id: 'route_km', type: 'number', label: 'Approximate total route (km)', placeholder: 'e.g. 110' },
    ],
  },
  event_equipment: {
    title: 'What equipment do you need?',
    description: 'Pick the equipment type and quantity. Specialist AV, lighting and power stay in their dedicated trades.',
    fields: [
      { id: 'assets', type: 'multi', label: 'Equipment type', options: [
        ['barriers', 'Crowd barriers'], ['queue', 'Queue stanchions'], ['tables', 'Utility tables'],
        ['trolleys', 'Transport trolleys'], ['racks', 'Display / storage racks'],
      ]},
      { id: 'quantity', type: 'number', label: 'Approximate quantity', placeholder: 'e.g. 20' },
      { id: 'days', type: 'number', label: 'Rental days', placeholder: 'e.g. 1' },
      { id: 'setup', type: 'multi', label: 'Delivery / setup', options: [
        ['delivery', 'Delivery'], ['setup', 'Setup'], ['pickup', 'Pickup / strike'],
      ]},
    ],
  },
  loading_crew: {
    title: 'What work should the crew do?',
    description: 'Crew size, shift duration and access determine the right team.',
    fields: [
      { id: 'crew', type: 'number', label: 'Crew needed', placeholder: 'e.g. 6' },
      { id: 'duration_hours', type: 'number', label: 'Shift duration (hours)', placeholder: 'e.g. 4' },
      { id: 'work', type: 'multi', label: 'Work', options: [
        ['loading', 'Loading'], ['unloading', 'Unloading'], ['movement', 'Internal movement'],
        ['setup', 'Event setup / strike'], ['packing', 'Packing / consolidation'],
      ]},
      { id: 'access', type: 'multi', label: 'Access', options: [
        ['lift', 'Lift available'], ['stairs', 'Stairs'], ['long_carry', 'Long carry'],
      ]},
    ],
  },
  warehouse_storage: {
    title: 'How much storage do you need?',
    description: 'Storage is priced from space, duration and handling—not from guest count.',
    fields: [
      { id: 'space_sqft', type: 'number', label: 'Storage space (sq ft)', placeholder: 'e.g. 500' },
      { id: 'months', type: 'number', label: 'Storage duration (months)', placeholder: 'e.g. 1' },
      { id: 'handling', type: 'multi', label: 'Handling / access', options: [
        ['in', 'Inbound handling'], ['out', 'Outbound handling'], ['pickup', 'Pickup / delivery'],
        ['cctv', 'CCTV / restricted access'],
      ]},
      { id: 'conditions', type: 'multi', label: 'Conditions', options: [
        ['dry', 'Dry / weather protected'], ['temperature', 'Temperature controlled'],
      ]},
    ],
  },
  event_materials: {
    title: 'What materials do you need?',
    description: 'Catalogue or bulk-material requests can be quoted from the exact quantity and material type.',
    fields: [
      { id: 'materials', type: 'multi', label: 'Material type', options: [
        ['packing', 'Packing materials'], ['print', 'Paper / print inputs'], ['floral', 'Floral inputs'],
        ['fabric', 'Textiles'], ['consumables', 'Event consumables'], ['hardware', 'Fixtures / hardware'],
      ]},
      { id: 'quantity', type: 'number', label: 'Approximate quantity', placeholder: 'e.g. 500' },
      { id: 'custom', type: 'multi', label: 'Requirement', options: [
        ['catalogue', 'Catalogue item'], ['bulk', 'Bulk quantity'], ['bespoke', 'Custom sourcing / production'],
      ]},
    ],
  },
  event_logistics: {
    title: 'How complex is the logistics plan?',
    description: 'Multi-vendor movement is quoted from the actual project plan rather than a flat rate.',
    fields: [
      { id: 'pickups', type: 'number', label: 'Pickup locations', placeholder: 'e.g. 6' },
      { id: 'drops', type: 'number', label: 'Drop / placement locations', placeholder: 'e.g. 2' },
      { id: 'storage_days', type: 'number', label: 'Storage days needed', placeholder: 'e.g. 1' },
      { id: 'scope', type: 'multi', label: 'Scope', options: [
        ['consolidation', 'Consolidation'], ['delivery', 'Venue delivery'], ['setup', 'Setup / placement'],
        ['strike', 'Strike / reverse pickup'], ['crew', 'Loading crew'],
      ]},
    ],
  },
}

function validValue(field, value) {
  if (field.type === 'multi') return Array.isArray(value) && value.length > 0
  if (field.type === 'number') return Number(value) > 0
  return String(value ?? '').trim().length > 0
}

export default function LogisticsDemandPanel({ serviceId, value = {}, onChange }) {
  const definition = DEFINITIONS[serviceId]
  const complete = useMemo(
    () => !!definition && definition.fields.every(f => validValue(f, value[f.id])),
    [definition, value],
  )

  if (!definition) return null

  const toggle = (id, option) => {
    const current = Array.isArray(value[id]) ? value[id] : []
    onChange({
      ...value,
      [id]: current.includes(option) ? current.filter(v => v !== option) : [...current, option],
    })
  }

  return (
    <section className="px-4">
      <div className="home-card p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plum-50 text-plum-700">
            {serviceId === 'passenger_transport' ? <Users size={18} />
              : serviceId === 'warehouse_storage' ? <Warehouse size={18} />
              : serviceId === 'event_equipment' || serviceId === 'event_materials' ? <Package size={18} />
              : serviceId === 'loading_crew' ? <Boxes size={18} />
              : <MapPin size={18} />}
          </span>
          <div>
            <h2 className="text-[15px] font-extrabold text-ink">{definition.title}</h2>
            <p className="mt-0.5 text-[11.5px] leading-snug text-ink-mute">{definition.description}</p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {definition.fields.map(field => (
            <div key={field.id}>
              <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">
                {field.label}
              </label>

              {field.type === 'multi' ? (
                <div className="flex flex-wrap gap-1.5">
                  {field.options.map(([id, label]) => {
                    const on = Array.isArray(value[field.id]) && value[field.id].includes(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggle(field.id, id)}
                        className={'rounded-full px-3 py-2 text-[12px] font-bold ring-1 transition ' + (
                          on ? 'bg-forest-600 text-white ring-forest-600'
                            : 'bg-surface-sunk/[0.06] text-ink-soft ring-hairline/10'
                        )}
                        aria-pressed={on}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  min={field.type === 'number' ? 1 : undefined}
                  value={value[field.id] ?? ''}
                  onChange={e => onChange({ ...value, [field.id]: e.target.value })}
                  placeholder={field.placeholder}
                  inputMode={field.type === 'number' ? 'decimal' : 'text'}
                  className="w-full rounded-2xl bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink ring-1 ring-hairline/10 placeholder:text-ink-mute"
                />
              )}
            </div>
          ))}
        </div>

        <div className={'mt-4 rounded-xl px-3 py-2.5 text-[11px] leading-snug ' + (
          complete ? 'bg-forest-50 text-forest-800' : 'bg-amber-50 text-amber-900'
        )}>
          {complete ? 'Requirements captured. We can add this logistics request to your cart.' : 'Complete the required logistics details above.'}
        </div>
      </div>
    </section>
  )
}

export function logisticsDemandIsComplete(serviceId, value) {
  const definition = DEFINITIONS[serviceId]
  return !!definition && definition.fields.every(f => validValue(f, value?.[f.id]))
}
