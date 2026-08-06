// Centralized form validators. Indian mobile numbers are 10 digits
// starting 6-9; pincodes are 6 digits — same pattern already used in
// VendorOnboarding.jsx, now shared instead of re-implemented per form.

import { isPilotCity } from './cityPilot'

export function scrubDigits(value, maxLen) {
  return value.replace(/\D/g, '').slice(0, maxLen)
}

export function isValidMobile(phone) {
  return /^[6-9]\d{9}$/.test(phone ?? '')
}

export function isValidPincode(pincode) {
  return /^\d{6}$/.test(pincode ?? '')
}

export function getAddressErrors({ name, phone, line, city, pincode }) {
  const errors = {}
  if (!name?.trim())               errors.name = 'Name is required'
  if (!phone?.trim())               errors.phone = 'Mobile number is required'
  else if (!isValidMobile(phone))   errors.phone = 'Enter a valid 10-digit mobile number'
  if (!line?.trim())                errors.line = 'Address is required'
  if (!city?.trim())                errors.city = 'City is required'
  else if (!isPilotCity(city))      errors.city = "We don't deliver here yet — currently live in Bengaluru & Mysore only"
  if (!pincode?.trim())             errors.pincode = 'Pincode is required'
  else if (!isValidPincode(pincode)) errors.pincode = 'Enter a valid 6-digit pincode'
  return errors
}
