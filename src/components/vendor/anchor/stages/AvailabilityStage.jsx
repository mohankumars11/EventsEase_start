/**
 * Stage 8 · Availability & travel.
 *
 * Dates live in the Calendar and nowhere else: "Open my calendar" opens the
 * Calendar tab itself, full screen, on the same availability rows. This
 * stage only adds the limits the booking engine needs around those dates,
 * and how travel outside the partner's area is charged.
 */
import { useState } from 'react'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { Card, Label, TextField, ChipRow, Toggle, OptionCard, SectionTitle } from '../ui'
import { NOTICE_DAYS, HORIZON_MONTHS, REST_HOURS, MAX_CONSECUTIVE, TRAVEL_MODELS } from '../options'
import CalendarFullScreen from '../../../partner/calendar/CalendarFullScreen'
import { useVendorAccount } from '../../../../hooks/useVendorAccount'

function CalendarLauncher({ onClose }) {
  const acc = useVendorAccount()
  return (
    <CalendarFullScreen onBack={onClose}
      vendorId={acc.vendor?.id} vendor={acc.vendor}
      availability={acc.availability} weeklyRules={acc.weeklyRules} availabilityError={acc.availabilityError}
      onSetDay={acc.setDayStatus} onSetRange={acc.setRangeStatus} onClearDays={acc.clearDays} onSaveWeeklyRules={acc.saveWeeklyRules} />
  )
}

const digits = x => x.replace(/\D/g, '').slice(0, 7)

export default function AvailabilityStage({ value, set, calendarSummary }) {
  const v = value ?? {}
  const [cal, setCal] = useState(false)
  return (
    <>
      <SectionTitle title="Availability & travel" sub="Your dates live in your Calendar. Here you set the limits around them." />

      <button type="button" onClick={() => setCal(true)}
        className="flex w-full items-center gap-3 rounded-[22px] bg-gradient-to-br from-plum-700 to-plum-900 p-4 text-left text-white shadow-[0_12px_28px_-14px_rgba(91,33,182,0.9)]">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><CalendarDays size={20} /></span>
        <span className="flex-1">
          <span className="block text-[15px] font-extrabold">Open my calendar</span>
          <span className="block text-[12px] text-plum-100">{calendarSummary ?? 'Mark available, limited or blocked dates.'}</span>
        </span>
        <ChevronRight size={18} />
      </button>

      <Card className="mt-3">
        <Label required hint="How far ahead a customer must book.">Minimum notice</Label>
        <ChipRow size="sm" options={NOTICE_DAYS} value={v.min_notice_days} onChange={x => set({ ...v, min_notice_days: x })}
          format={d => d === 0 ? 'Same day' : `${d} day${d > 1 ? 's' : ''}`} />
        <div className="mt-4" />
        <Label required hint="How far into the future you take bookings.">Booking window</Label>
        <ChipRow size="sm" options={HORIZON_MONTHS} value={v.horizon_months} onChange={x => set({ ...v, horizon_months: x })} format={m => `${m} months`} />
        <div className="mt-4" />
        <Label required>Most hours on stage in one go</Label>
        <ChipRow size="sm" options={MAX_CONSECUTIVE} value={v.max_consecutive_hours} onChange={x => set({ ...v, max_consecutive_hours: x })} format={h => `${h} hrs`} />
        <div className="mt-4" />
        <Label required hint="Gap you need between two bookings, travel included.">Rest between bookings</Label>
        <ChipRow size="sm" options={REST_HOURS} value={v.rest_hours} onChange={x => set({ ...v, rest_hours: x })} format={h => h === 0 ? 'None' : `${h} hr${h > 1 ? 's' : ''}`} />
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[13.5px] font-extrabold text-ink">More than one booking a day</span>
          <Toggle on={!!v.multiple_per_day} label="More than one booking a day" onChange={x => set({ ...v, multiple_per_day: x })} />
        </div>
      </Card>

      <Card className="mt-3">
        <Label required hint="For events outside the distance you chose on the Location step.">Travel outside your area</Label>
        <div className="space-y-2">
          {TRAVEL_MODELS.map(t => (
            <OptionCard key={t.id} on={v.travel_model === t.id} title={t.title} body={t.body} onClick={() => set({ ...v, travel_model: t.id })} />
          ))}
        </div>
        {v.travel_model === 'flat' && (
          <div className="mt-3"><Label required>Outstation fee, you earn</Label>
            <TextField prefix="₹" inputMode="numeric" value={v.travel_fee} onChange={x => set({ ...v, travel_fee: digits(x) })} placeholder="15000" /></div>
        )}
        {v.travel_model === 'per_km' && (
          <div className="mt-3"><Label required>Per km beyond your area, you earn</Label>
            <TextField prefix="₹" inputMode="numeric" value={v.travel_per_km} onChange={x => set({ ...v, travel_per_km: digits(x) })} placeholder="20" /></div>
        )}
        {['flat', 'per_km', 'customer_arranged'].includes(v.travel_model) && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[13px] font-bold text-ink">Needs a hotel for overnight events</span>
            <Toggle on={!!v.hotel_required} label="Hotel required" onChange={x => set({ ...v, hotel_required: x })} />
          </div>
        )}
      </Card>

      {cal && <CalendarLauncher onClose={() => setCal(false)} />}
    </>
  )
}

export const availabilityDone = v => v?.min_notice_days != null && !!v?.horizon_months && !!v?.max_consecutive_hours
  && v?.rest_hours != null && !!v?.travel_model
  && (v.travel_model !== 'flat' || Number(v.travel_fee) > 0)
  && (v.travel_model !== 'per_km' || Number(v.travel_per_km) > 0)
