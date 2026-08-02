import { useNavigate } from 'react-router-dom'
import { EVENT_LIST } from '../../data/eventServicesData'
import CustomerLayout from '../../components/customer/CustomerLayout'

export default function ServicesPicker() {
  const navigate = useNavigate()

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">What do you need help with?</h1>
          <p className="text-gray-500 text-sm">
            Pick your function or festival — we'll show you exactly what's typically needed:
            cooks, priests, pooja items, decorations and more. Add only what you want.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EVENT_LIST.map(ev => (
            <button
              key={ev.id}
              onClick={() => navigate(`/dashboard/customer/events/${ev.id}`)}
              className={`text-left rounded-2xl p-5 border-2 ${ev.borderColor} ${ev.bgColor} hover:shadow-md hover:-translate-y-0.5 transition-all group`}
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{ev.emoji}</div>
              <p className={`font-bold text-sm ${ev.textColor}`}>{ev.name}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{ev.tagline}</p>
              <p className="text-[11px] text-gray-400 mt-2">{ev.services.length} services · {ev.packages.length} packages</p>
            </button>
          ))}
        </div>
      </div>
    </CustomerLayout>
  )
}
