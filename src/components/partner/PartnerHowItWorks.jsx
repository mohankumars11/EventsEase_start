import { ArrowRight, CheckCircle2, CircleDot, MapPin, Navigation, WalletCards, X } from 'lucide-react'

const STEPS = [
  ['1', 'JOB RECEIVED', 'A matched event opportunity appears in Jobs.'],
  ['2', 'ACCEPT OR PASS', 'Review the event, price and expected earnings, then accept or pass.'],
  ['3', 'CONFIRMED', 'Once the customer payment is confirmed, the job is locked for you.'],
  ['4', 'START TRIP', 'On the event day, start the active trip when you are ready to move.'],
  ['5', 'NAVIGATE & ARRIVE', 'Use real navigation and live trip status to reach the event location.'],
  ['6', 'DONE → EARN', 'Complete the event and the completed job moves into your earnings flow.'],
]

export default function PartnerHowItWorks({ open, onClose }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-plum-950/60 p-3 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-labelledby="how-jobs-title">
      <div className="max-h-[88vh] w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-plum-950 px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-saffron-300">SAMBRAMO PARTNER</p>
            <h2 id="how-jobs-title" className="mt-1 text-[21px] font-black">How your jobs work</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <p className="text-[13px] leading-relaxed text-ink-mute">
            From your first matched opportunity to completed-event earnings, SAMBRAMO keeps the workflow in one place.
          </p>

          <div className="mt-5 space-y-3">
            {STEPS.map(([number, title, body], index) => (
              <div key={number} className="relative flex gap-3 rounded-[18px] bg-ink/[0.035] p-3.5 ring-1 ring-ink/[0.06]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-plum-700 text-[12px] font-black text-white">{number}</div>
                <div className="min-w-0">
                  <p className="text-[12px] font-black tracking-wide text-plum-900">{title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-mute">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[20px] bg-yellow-300 p-4 text-plum-950">
            <p className="text-[13px] font-black">One simple goal</p>
            <p className="mt-1 text-[12px] font-semibold leading-snug">Accept the right event, show up ready, complete it well and keep building your SAMBRAMO track record.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
