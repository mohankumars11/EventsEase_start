/**
 * Every place a partner types something, and where it goes.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS DATA
 * ══════════════════════════════════════════════════════════════════════
 *
 * The field inventory and the traceability matrix are generated from
 * this file (scripts/gen-validation-docs.mjs), and three test suites read
 * it: the rule matrix, the server parity and direct-write checks, and the
 * browser suite. A field added to a screen without an entry here fails
 * check-validation-inventory.mjs, which scans the partner surfaces for
 * inputs. So the documents cannot describe a form that no longer exists,
 * and a new box cannot ship untested.
 *
 * Each entry:
 *
 *   id         unique, stable; the `name`/`data-field` on the input where
 *              one box reuses a rule (two phones)
 *   screen     where a partner finds it
 *   step       the onboarding step id when it is one of the six
 *   label      what the screen calls it
 *   rule       the FIELD_RULES key that checks it (null: nothing to check)
 *   kind       what sort of value, which decides which test categories
 *              apply (see scripts/validation/catalogue.mjs)
 *   required   as the screen presents it
 *   component  the file that renders it
 *   save       table.column, rpc(name), json(path) or 'not saved'
 *   server     the partner_field_error id migration 159 checks it with,
 *              or null with `serverNote` saying why not
 */

const S = {
  step1: 'Setup · 1 Business & Services',
  step2: 'Setup · 2 Partner Details',
  step3: 'Setup · 3 Service Area & Availability',
  step4: 'Setup · 4 Verification & Compliance',
  step5: 'Setup · 5 Bank & Payments',
  step6: 'Setup · 6 Review & Publish',
  profile: 'More · Partner profile',
  business: 'More · Business profile',
  area: 'More · Availability & service area',
  verification: 'More · Verification & documents',
  bank: 'More · Bank & payments',
  services: 'More · My services (and step 1)',
  messages: 'More · Messages',
  settings: 'More · Settings',
  calendar: 'Calendar tab',
  jobs: 'Jobs tab',
  entry: 'Sign in',
  setup: 'Setup intro',
  referral: 'More · Referral & rewards',
  earnings: 'Earnings tab',
}

const F = (o) => ({ required: false, server: null, serverNote: null, ctx: null, ...o })

const JSON_SPECS = 'Stored inside vendor_services.specs (JSON); checked in the app and reviewed by the listings team before anything is shown.'

export const FIELD_INVENTORY = [
  /* ── 1 · Business & Services (the listing flow, also More → My services) ── */
  F({ id: 'item_price', screen: S.step1, step: 'business', label: 'Your price', rule: 'item_price', kind: 'amount',
      component: 'src/components/vendor/AddItemFlow.jsx', save: 'vendor_services.price', server: 'item_price' }),
  F({ id: 'min_order', screen: S.step1, step: 'business', label: 'Smallest order you will take', rule: 'min_order', kind: 'mixed-number',
      component: 'src/components/vendor/AddItemFlow.jsx', save: 'vendor_services.min_quantity / specs.min_order_note',
      serverNote: JSON_SPECS }),
  F({ id: 'exact_quantity', screen: S.step1, step: 'business', label: 'Exact number (listing questions)', rule: 'exact_quantity', kind: 'int',
      component: 'src/components/vendor/AddItemFlow.jsx', save: 'json(vendor_services.specs)', serverNote: JSON_SPECS }),
  F({ id: 'other_choice', screen: S.step1, step: 'business', label: 'Something else? Type it here', rule: 'other_choice', kind: 'short-text',
      component: 'src/components/vendor/AddItemFlow.jsx', save: 'json(vendor_services.specs)', serverNote: JSON_SPECS }),
  F({ id: 'catering_note', screen: S.step1, step: 'business', label: 'Your specialities (catering)', rule: 'catering_note', kind: 'prose',
      component: 'src/components/vendor/CateringFunnel.jsx', save: 'json(vendor_services.specs)', serverNote: JSON_SPECS }),
  F({ id: 'menu_rate', screen: S.step1, step: 'business', label: 'Your rate per plate, per menu', rule: 'rate_amount', kind: 'amount',
      component: 'src/components/vendor/PriceGuidance.jsx', save: 'json(vendor_services.specs)', serverNote: JSON_SPECS }),
  F({ id: 'distance_rate', screen: S.step1, step: 'business', label: 'Rate by distance (transport)', rule: 'rate_amount', kind: 'amount',
      component: 'src/components/vendor/DistanceRates.jsx', save: 'json(vendor_services.specs)', serverNote: JSON_SPECS }),
  F({ id: 'logistics_base_rate', screen: S.step1, step: 'business', label: 'Logistics base rate', rule: 'rate_amount', kind: 'amount',
      component: 'src/components/vendor/LogisticsPriceBook.jsx', save: 'json(vendor_services.specs.logistics_rates)', serverNote: JSON_SPECS }),
  F({ id: 'logistics_distance_rate', screen: S.step1, step: 'business', label: 'Logistics distance rate', rule: 'rate_amount', kind: 'amount',
      component: 'src/components/vendor/LogisticsPriceBook.jsx', save: 'json(vendor_services.specs.logistics_rates)', serverNote: JSON_SPECS }),
  F({ id: 'logistics_operational_rate', screen: S.step1, step: 'business', label: 'Logistics operational rate', rule: 'rate_amount', kind: 'amount',
      component: 'src/components/vendor/LogisticsPriceBook.jsx', save: 'json(vendor_services.specs.logistics_rates)', serverNote: JSON_SPECS }),
  F({ id: 'venue_money', screen: S.step1, step: 'business', label: 'Venue rent, deposit and extras', rule: 'item_price', kind: 'amount',
      component: 'src/components/vendor/VenueTerms.jsx', save: 'json(vendor_services.specs)', serverNote: JSON_SPECS }),
  F({ id: 'venue_count', screen: S.step1, step: 'business', label: 'Venue hours / guests terms', rule: 'exact_quantity', kind: 'int',
      component: 'src/components/vendor/VenueTerms.jsx', save: 'json(vendor_services.specs)', serverNote: JSON_SPECS }),
  F({ id: 'venue_other_note', screen: S.step1, step: 'business', label: 'Anything else you charge', rule: 'venue_note', kind: 'prose',
      component: 'src/components/vendor/VenueTerms.jsx', save: 'json(vendor_services.specs)', serverNote: JSON_SPECS }),
  F({ id: 'listing_signature', screen: S.step1, step: 'business', label: 'Your full name (listing signature)', rule: 'signature_name', kind: 'name-person', required: true,
      component: 'src/components/vendor/HoldToSign.jsx', save: 'json(listing signature)', serverNote: JSON_SPECS }),
  F({ id: 'work_caption', screen: S.services, step: 'business', label: 'Photo or video caption', rule: 'caption', kind: 'short-text',
      component: 'src/components/vendor/WorkUpload.jsx', save: 'partner_work.caption', server: 'caption' }),
  F({ id: 'testimonial_body', screen: S.services, step: 'business', label: 'What they said', rule: 'testimonial_body', kind: 'prose',
      component: 'src/components/vendor/WorkUpload.jsx', save: 'partner_work.body', server: 'testimonial_body' }),
  F({ id: 'testimonial_by', screen: S.services, step: 'business', label: 'Who said it', rule: 'testimonial_by', kind: 'name-person',
      component: 'src/components/vendor/WorkUpload.jsx', save: 'partner_work.said_by', server: 'testimonial_by' }),
  F({ id: 'testimonial_about', screen: S.services, step: 'business', label: 'At what event', rule: 'testimonial_about', kind: 'short-text',
      component: 'src/components/vendor/WorkUpload.jsx', save: 'partner_work.said_about', server: 'testimonial_about' }),
  F({ id: 'library_caption', screen: S.services, label: 'Caption (saved work, edited in place)', rule: 'caption', kind: 'short-text',
      component: 'src/components/vendor/WorkLibrary.jsx', save: 'partner_work.caption', server: 'caption' }),

  /* ── 2 · Partner details ── */
  F({ id: 'business_name', screen: S.step2, step: 'details', label: 'Business name', rule: 'business_name', kind: 'name-business', required: true,
      component: 'src/pages/partner/steps/PartnerDetailsStep.jsx', save: 'vendors.business_name', server: 'business_name' }),
  F({ id: 'contact_phone', screen: S.step2, step: 'details', label: 'Contact number', rule: 'contact_phone', kind: 'phone', required: true,
      component: 'src/pages/partner/steps/PartnerDetailsStep.jsx', save: 'vendors.contact_phone', server: 'contact_phone' }),
  F({ id: 'years_active', screen: S.step2, step: 'details', label: 'Years doing this', rule: 'years_active', kind: 'int',
      component: 'src/pages/partner/steps/PartnerDetailsStep.jsx', save: 'vendors.years_active', server: 'years_active' }),
  F({ id: 'description', screen: S.step2, step: 'details', label: 'About your business', rule: 'description', kind: 'prose',
      component: 'src/pages/partner/steps/PartnerDetailsStep.jsx', save: 'vendors.description', server: 'description' }),
  F({ id: 'instagram_url', screen: S.step2, step: 'details', label: 'Instagram', rule: 'instagram_url', kind: 'handle',
      component: 'src/pages/partner/steps/PartnerDetailsStep.jsx', save: 'vendors.instagram_url', server: 'instagram_url' }),

  /* ── 3 · Service area ── */
  F({ id: 'lead_time_days', screen: S.step3, step: 'area', label: 'Notice you need', rule: 'lead_time_days', kind: 'int',
      component: 'src/pages/partner/steps/ServiceAreaStep.jsx', save: 'vendors.lead_time_days', server: 'lead_time_days' }),
  F({ id: 'service_radius_km', screen: S.step3, step: 'area', label: 'How far you travel (slider)', rule: 'service_radius_km', kind: 'slider',
      component: 'src/components/partner/ServiceArea.jsx', save: 'vendors.service_radius_km', server: 'service_radius_km' }),

  /* ── 4 · Verification & compliance, and More → Verification ── */
  F({ id: 'doc_number', screen: S.step4, step: 'compliance', label: '<Document> number', rule: 'doc_number', kind: 'id-number',
      component: 'src/components/partner/DocumentCapture.jsx', save: 'vendor_documents.number_last4 (last four only)',
      serverNote: 'Only the last four characters are stored (Aadhaar Act); 093 CHECKs their shape. The full number never leaves the device, so its checksum can only be checked there.' }),
  F({ id: 'doc_holder_name', screen: S.step4, step: 'compliance', label: 'Name exactly as printed', rule: 'doc_holder_name', kind: 'name-person',
      component: 'src/components/partner/DocumentCapture.jsx', save: 'vendor_documents.holder_name', server: 'doc_holder_name' }),
  F({ id: 'doc_authority', screen: S.step4, step: 'compliance', label: 'Who issued it', rule: 'doc_authority', kind: 'short-text',
      component: 'src/components/partner/DocumentCapture.jsx', save: 'vendor_documents.issuing_authority', server: 'doc_authority' }),
  F({ id: 'doc_issue_date', screen: S.step4, step: 'compliance', label: 'Issued on', rule: 'doc_issue_date', kind: 'date',
      component: 'src/components/partner/DocumentCapture.jsx', save: 'vendor_documents.issue_date', server: 'doc_issue_date' }),
  F({ id: 'doc_expiry_date', screen: S.step4, step: 'compliance', label: 'Expires on', rule: 'doc_expiry_date', kind: 'date',
      component: 'src/components/partner/DocumentCapture.jsx', save: 'vendor_documents.expires_on', server: 'doc_expiry_date' }),

  /* ── 5 · Bank ── */
  F({ id: 'upi_id', screen: S.step5, step: 'bank', label: 'UPI id', rule: 'upi_id', kind: 'upi', required: true,
      component: 'src/pages/partner/steps/BankPaymentsStep.jsx', save: 'vendor_payout_details.upi_id', server: 'upi_id' }),
  F({ id: 'account_name', screen: S.step5, step: 'bank', label: 'Name on the account', rule: 'account_name', kind: 'name-person', required: true,
      component: 'src/pages/partner/steps/BankPaymentsStep.jsx', save: 'vendor_payout_details.account_name', server: 'account_name' }),
  F({ id: 'account_number', screen: S.step5, step: 'bank', label: 'Account number', rule: 'account_number', kind: 'digits', required: true,
      component: 'src/pages/partner/steps/BankPaymentsStep.jsx', save: 'vendor_payout_details.account_number', server: 'account_number' }),
  F({ id: 'ifsc', screen: S.step5, step: 'bank', label: 'IFSC', rule: 'ifsc', kind: 'id-code', required: true,
      component: 'src/pages/partner/steps/BankPaymentsStep.jsx', save: 'vendor_payout_details.ifsc', server: 'ifsc' }),

  /* ── 6 · Review & publish ── */
  F({ id: 'terms_signature', screen: S.step6, step: 'review', label: 'Your full name (partner terms)', rule: 'signature_name', kind: 'name-person', required: true,
      component: 'src/components/vendor/HoldToSign.jsx (TermsGate)', save: 'vendors.terms_* (signature)',
      serverNote: 'The signed name is recorded with the terms version by the terms flow; the app checks the name before a hold can sign.' }),

  /* ── More · Profile ── */
  F({ id: 'full_name', screen: S.profile, label: 'Your name', rule: 'full_name', kind: 'name-person', required: true,
      component: 'src/components/vendor/PartnerAccount.jsx (OwnerDetails)', save: 'profiles.full_name', server: 'full_name' }),
  F({ id: 'owner_phone', screen: S.profile, label: 'Your phone', rule: 'owner_phone', kind: 'phone',
      component: 'src/components/vendor/PartnerAccount.jsx (OwnerDetails)', save: 'profiles.phone', server: 'owner_phone' }),
  F({ id: 'more_contact_phone', screen: S.profile, label: 'Phone customers call', rule: 'contact_phone', kind: 'phone', required: true,
      component: 'src/components/vendor/PartnerAccount.jsx (ContactDetails)', save: 'vendors.contact_phone', server: 'contact_phone' }),
  F({ id: 'whatsapp_phone', screen: S.profile, label: 'WhatsApp number', rule: 'whatsapp_phone', kind: 'phone',
      component: 'src/components/vendor/PartnerAccount.jsx (ContactDetails)', save: 'vendors.whatsapp_phone', server: 'whatsapp_phone' }),
  F({ id: 'website_url', screen: S.profile, label: 'Website', rule: 'website_url', kind: 'url',
      component: 'src/components/vendor/PartnerAccount.jsx (ContactDetails)', save: 'vendors.website_url', server: 'website_url' }),
  F({ id: 'more_instagram_url', screen: S.profile, label: 'Instagram', rule: 'instagram_url', kind: 'handle',
      component: 'src/components/vendor/PartnerAccount.jsx (ContactDetails)', save: 'vendors.instagram_url', server: 'instagram_url' }),
  F({ id: 'avatar', screen: S.profile, label: 'Photo or logo', rule: null, kind: 'file',
      component: 'src/components/vendor/PartnerAvatar.jsx', save: 'storage + vendors.avatar_url',
      serverNote: 'An image upload: size and type are checked by the existing upload path and the storage bucket policy.' }),

  /* ── More · Business profile ── */
  F({ id: 'more_business_name', screen: S.business, label: 'Business name', rule: 'business_name', kind: 'name-business', required: true,
      component: 'src/components/vendor/PartnerAccount.jsx (BusinessDetails)', save: 'vendors.business_name', server: 'business_name' }),
  F({ id: 'category', screen: S.business, label: 'Your trade', rule: 'trade_name', kind: 'select',
      component: 'src/components/vendor/PartnerAccount.jsx (BusinessDetails)', save: 'vendors.category', server: 'trade_name' }),
  F({ id: 'more_description', screen: S.business, label: 'About your business', rule: 'description', kind: 'prose',
      component: 'src/components/vendor/PartnerAccount.jsx (BusinessDetails)', save: 'vendors.description', server: 'description' }),
  F({ id: 'years_experience', screen: S.business, label: 'Years doing this', rule: 'years_active', kind: 'int',
      component: 'src/components/vendor/PartnerAccount.jsx (BusinessDetails)', save: 'vendors.years_experience', server: 'years_active' }),
  F({ id: 'starting_price', screen: S.business, label: 'Starting price', rule: 'starting_price', kind: 'amount',
      component: 'src/components/vendor/PartnerAccount.jsx (BusinessDetails)', save: 'vendors.starting_price', server: 'starting_price' }),

  /* ── More · Availability & service area ── */
  F({ id: 'pincode', screen: S.area, label: 'Pincode', rule: 'pincode', kind: 'pincode', required: true,
      component: 'src/components/vendor/PartnerAccount.jsx (ReachDetails)', save: 'rpc(set_partner_location) → vendors.pincode', server: 'pincode' }),
  F({ id: 'area', screen: S.area, label: 'Area', rule: 'area', kind: 'short-text',
      component: 'src/components/vendor/PartnerAccount.jsx (ReachDetails)', save: 'vendors.area', server: 'area' }),
  F({ id: 'daily_capacity', screen: S.area, label: 'Jobs a day', rule: 'daily_capacity', kind: 'int',
      component: 'src/components/vendor/PartnerAccount.jsx (ReachDetails)', save: 'vendors.daily_capacity', server: 'daily_capacity' }),

  /* ── More · Bank & payments ── */
  F({ id: 'po_upi', screen: S.bank, label: 'Your UPI ID', rule: 'upi_id', kind: 'upi',
      component: 'src/components/vendor/PayoutDetails.jsx', save: 'vendor_payout_details.upi_id', server: 'upi_id' }),
  F({ id: 'po_ifsc', screen: S.bank, label: 'IFSC code', rule: 'ifsc', kind: 'id-code',
      component: 'src/components/vendor/PayoutDetails.jsx', save: 'vendor_payout_details.ifsc', server: 'ifsc' }),
  F({ id: 'po_name', screen: S.bank, label: 'Name on the account', rule: 'account_name', kind: 'name-person',
      component: 'src/components/vendor/PayoutDetails.jsx', save: 'vendor_payout_details.account_name', server: 'account_name' }),
  F({ id: 'po_account', screen: S.bank, label: 'Account number', rule: 'account_number', kind: 'digits',
      component: 'src/components/vendor/PayoutDetails.jsx', save: 'vendor_payout_details.account_number', server: 'account_number' }),
  F({ id: 'po_account_confirm', screen: S.bank, label: 'Account number again', rule: 'account_number_confirm', kind: 'confirm',
      component: 'src/components/vendor/PayoutDetails.jsx', save: 'not saved (compared with the first)', serverNote: 'Compared on the device; only the first box is stored.' }),
  F({ id: 'po_pan', screen: S.bank, label: 'PAN (optional for now)', rule: 'payout_pan', kind: 'id-code',
      component: 'src/components/vendor/PayoutDetails.jsx', save: 'vendor_payout_details.pan', server: 'pan' }),
  F({ id: 'po_bank', screen: S.bank, label: 'Your bank', rule: null, kind: 'select',
      component: 'src/components/vendor/PayoutDetails.jsx', save: 'not saved (checks the IFSC prefix)', serverNote: 'Used only to cross-check the IFSC on the device.' }),

  /* ── More · Messages, Settings ── */
  F({ id: 'partner_message', screen: S.messages, label: 'Message to Sambramo', rule: 'partner_message', kind: 'prose', required: true,
      component: 'src/components/vendor/PartnerMessages.jsx', save: 'partner_messages.body', server: 'partner_message' }),
  F({ id: 'closure_reason', screen: S.settings, label: 'Why you are leaving', rule: 'closure_reason', kind: 'prose',
      component: 'src/components/vendor/PartnerAccount.jsx (DangerZone)', save: 'vendors.closure_reason', server: 'closure_reason' }),

  /* ── Calendar ── */
  F({ id: 'day_slots', screen: S.calendar, label: 'Most jobs you will take that day', rule: 'daily_slots', kind: 'int',
      component: 'src/components/partner/DayDetailSheet.jsx', save: 'vendor_availability.slots_total', server: 'daily_slots' }),
  F({ id: 'day_reason', screen: S.calendar, label: 'Reason, in your own words', rule: 'reason_detail', kind: 'short-text',
      component: 'src/components/partner/DayDetailSheet.jsx', save: 'vendor_availability.reason_detail', server: 'reason_detail' }),
  F({ id: 'day_note', screen: S.calendar, label: 'Private note', rule: 'availability_note', kind: 'short-text',
      component: 'src/components/partner/DayDetailSheet.jsx', save: 'vendor_availability.note', server: 'availability_note' }),
  F({ id: 'day_hours', screen: S.calendar, label: 'Hours on this day', rule: 'time_to', kind: 'time',
      component: 'src/components/partner/DayDetailSheet.jsx', save: 'vendor_availability.hours (JSON)', serverNote: 'Stored as JSON; the weekly rules (below) are the checked column.' }),
  F({ id: 'range_dates', screen: S.calendar, label: 'From / To (range sheet)', rule: 'date_to', kind: 'date', required: true,
      component: 'src/components/partner/AvailabilityRangeSheet.jsx', save: 'vendor_availability.slot_date (one row per day)', serverNote: 'Each date is a row key; the app caps and orders the range.' }),
  F({ id: 'range_slots', screen: S.calendar, label: 'Jobs you will take each day', rule: 'daily_slots', kind: 'int',
      component: 'src/components/partner/AvailabilityRangeSheet.jsx', save: 'vendor_availability.slots_total', server: 'daily_slots' }),
  F({ id: 'range_note', screen: S.calendar, label: 'Private note (range)', rule: 'availability_note', kind: 'short-text',
      component: 'src/components/partner/AvailabilityRangeSheet.jsx', save: 'vendor_availability.note', server: 'availability_note' }),
  F({ id: 'set_note', screen: S.calendar, label: 'Note (set availability)', rule: 'availability_note', kind: 'short-text', ctx: { max: 120 },
      component: 'src/components/partner/SetAvailability.jsx', save: 'vendor_availability.note', server: 'availability_note' }),
  F({ id: 'week_hours', screen: S.calendar, label: 'Weekly start / end time', rule: 'time_to', kind: 'time',
      component: 'src/components/partner/RecurringAvailability.jsx', save: 'vendor_weekly_rules.end_time', server: 'time_to' }),
  F({ id: 'week_dates', screen: S.calendar, label: 'Weekly starting / until', rule: 'date_to', kind: 'date',
      component: 'src/components/partner/RecurringAvailability.jsx', save: 'vendor_weekly_rules.effective_from / effective_to', serverNote: 'Range order is enforced by the app; the rows are dated keys.' }),
  F({ id: 'daystatus_note', screen: S.calendar, label: 'Note for yourself', rule: 'availability_note', kind: 'short-text', ctx: { max: 120 },
      component: 'src/components/vendor/DayStatusSheet.jsx', save: 'vendor_availability.note', server: 'availability_note' }),

  /* ── Jobs ── */
  F({ id: 'cancel_reason', screen: S.jobs, label: 'Why you cannot do it', rule: 'cancel_reason', kind: 'prose', required: true,
      component: 'src/components/vendor/MyJobs.jsx', save: 'rpc(partner_cancel_line) → booking_lines.cancellation_reason',
      serverNote: 'partner_cancel_line (083) refuses under 10 characters. Booking functions are outside this change.' }),
  F({ id: 'chat_message', screen: S.jobs, label: 'Message to the customer', rule: 'chat_message', kind: 'prose', required: true,
      component: 'src/components/partner/JobChat.jsx', save: 'line_messages.body', server: 'chat_message' }),

  /* ── Venue (a trade) ── */
  F({ id: 'space_name', screen: S.services, label: 'Hall name', rule: 'space_name', kind: 'short-text', required: true,
      component: 'src/components/vendor/VenueSpaces.jsx', save: 'venue_spaces.space_name', server: 'space_name' }),
  F({ id: 'venue_capacity', screen: S.services, label: 'Standing / Seated guests', rule: 'venue_capacity', kind: 'int',
      component: 'src/components/vendor/VenueSpaces.jsx', save: 'venue_spaces.floating_capacity / seated_capacity', server: 'venue_capacity' }),
  F({ id: 'venue_name', screen: S.services, label: 'Venue name (propose)', rule: 'venue_name', kind: 'short-text', required: true,
      component: 'src/components/vendor/VenueClaim.jsx', save: 'rpc(propose_venue) → venues.name', server: 'venue_name' }),
  F({ id: 'venue_pincode', screen: S.services, label: 'Pincode (optional)', rule: 'venue_pincode', kind: 'pincode',
      component: 'src/components/vendor/VenueClaim.jsx', save: 'rpc(propose_venue) → venues.pincode', server: 'pincode' }),

  /* ── Sign in, invitations ── */
  F({ id: 'login_email', screen: S.entry, label: 'Your email', rule: 'login_email', kind: 'email', required: true,
      component: 'src/pages/partner/PartnerEntry.jsx', save: 'Supabase Auth (email OTP)', serverNote: 'Supabase Auth validates the address and sends the code.' }),
  F({ id: 'otp_code', screen: S.entry, label: 'Six-digit code', rule: 'otp_code', kind: 'code', required: true, ctx: { length: 6 },
      component: 'src/pages/partner/PartnerEntry.jsx', save: 'Supabase Auth verifyOtp', serverNote: 'Supabase Auth is the only thing that can say whether a code is right; it is never bypassed.' }),
  F({ id: 'invite_code', screen: S.setup, label: 'Invitation code', rule: 'invite_code', kind: 'code',
      component: 'src/components/partner/referrals/InviteCodeEntry.jsx', save: 'rpc(claim_referral_code)', serverNote: 'claim_referral_code (158) validates the code and answers with one uniform refusal.' }),

  /* ── Not saved: searches and filters ── */
  F({ id: 'referral_search', screen: S.referral, label: 'Search referrals', rule: null, kind: 'search',
      component: 'src/components/partner/referrals/TradeChampion.jsx', save: 'not saved (filters the list on the device)' }),
  F({ id: 'trade_search', screen: S.step1, label: 'Search every trade and service', rule: null, kind: 'search',
      component: 'src/components/vendor/TradeGrid.jsx', save: 'not saved' }),
  F({ id: 'catalogue_search', screen: S.step1, label: 'Search the catalogue', rule: null, kind: 'search',
      component: 'src/components/vendor/AddFromCatalogue.jsx', save: 'not saved' }),
  F({ id: 'cuisine_search', screen: S.step1, label: 'Search cuisines', rule: null, kind: 'search',
      component: 'src/components/vendor/CateringFunnel.jsx', save: 'not saved' }),
  F({ id: 'venue_search', screen: S.services, label: 'Find your venue', rule: null, kind: 'search',
      component: 'src/components/vendor/VenueClaim.jsx', save: 'not saved (search only)' }),
  F({ id: 'earnings_range', screen: S.earnings, label: 'From / To (earnings filter)', rule: null, kind: 'date',
      component: 'src/components/vendor/earnings/RangeFilter.jsx', save: 'not saved (filters the view)' }),
  F({ id: 'earnings_search', screen: S.earnings, label: 'Search a job, occasion or area', rule: null, kind: 'search',
      component: 'src/components/vendor/earnings/Transactions.jsx', save: 'not saved' }),
]

/* Inputs the scan finds that are not free entry, each with the reason. */
export const NOT_FREE_ENTRY = {
  'src/components/partner/ServiceArea.jsx': 'range slider, 1–100; the radius is still checked by rule and server',
  'src/components/partner/ImageCropper.jsx': 'zoom slider for cropping an image; not a value that is saved',
  'src/components/partner/DocumentCapture.jsx#file': 'file picker; the photo is checked by imageQuality before upload',
  'src/components/vendor/MenuUpload.jsx': 'file picker for menu photos',
  'src/components/vendor/PartnerAvatar.jsx': 'file picker for the profile photo',
  'src/components/vendor/WorkUpload.jsx#file': 'file pickers for photos and video',
  'src/components/vendor/VenueCalendar.jsx': 'select of the partner\'s own spaces',
  'src/components/vendor/VendorAvailability.jsx': 'not rendered anywhere (legacy); unreachable',
  'src/pages/partner/steps/ComplianceStep.jsx': 'choice of identity document, a fixed list',
  'src/components/vendor/SambramoPricingStudio.jsx': 'pricing studio fields are validated by the server write path; search/filter controls are local-only',
  'src/components/vendor/CustomQuoteInbox.jsx': 'custom-quote fields are validated by the authenticated submit-custom-quote server endpoint; the countdown and text areas are request data, not a second pricing source',
}

export const inventoryById = Object.fromEntries(FIELD_INVENTORY.map(f => [f.id, f]))
