import React from 'react'

/** Compact pricing/control-center illustration; deliberately not a trade photo. */
export default function PricingPictogram() {
  return (
    <span
      aria-hidden="true"
      className="relative flex h-[64px] w-[76px] shrink-0 items-center justify-center"
    >
      <span className="absolute left-1 top-3 h-[50px] w-[58px] -rotate-[7deg] rounded-[14px] bg-gradient-to-br from-fuchsia-200 via-violet-300 to-violet-500 p-[5px] shadow-[0_10px_18px_rgba(24,7,70,.28)]">
        <span className="flex h-full w-full flex-col rounded-[10px] bg-white/95 p-2">
          <span className="mb-1 flex items-center justify-between">
            <span className="h-1.5 w-5 rounded-full bg-violet-300" />
            <span className="h-3 w-3 rounded-full bg-violet-500" />
          </span>
          <span className="grid grid-cols-3 gap-1">
            <span className="h-2.5 rounded bg-violet-100" />
            <span className="h-2.5 rounded bg-violet-200" />
            <span className="h-2.5 rounded bg-violet-100" />
            <span className="h-2.5 rounded bg-violet-200" />
            <span className="h-2.5 rounded bg-violet-500" />
            <span className="h-2.5 rounded bg-violet-200" />
          </span>
        </span>
      </span>
      <span className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-300 to-violet-700 text-white shadow-[0_8px_15px_rgba(24,7,70,.32)]">
        <span className="text-[17px] font-black">₹</span>
      </span>
      <span className="absolute right-1 top-0 text-[13px] text-yellow-200">✦</span>
    </span>
  )
}
