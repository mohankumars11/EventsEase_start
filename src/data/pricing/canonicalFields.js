export const CANONICAL_FIELDS = Object.freeze({
  event_date: { type: "date", requiredFor: ["availability", "pricing"] },
  start_time: { type: "time", requiredFor: ["availability", "pricing"] },
  end_time: { type: "time", requiredFor: ["availability", "pricing"] },
  service_area: { type: "geo", requiredFor: ["matching", "travel"] },
  guest_count: { type: "integer", min: 1, requiredFor: ["matching", "pricing"] },
  quantity: { type: "number", min: 1, requiredFor: ["pricing"] },
  duration_hours: { type: "number", min: 0.25, requiredFor: ["pricing"] },
  lead_time_days: { type: "integer", min: 0, requiredFor: ["eligibility", "rush"] },
  max_capacity: { type: "number", min: 1, requiredFor: ["eligibility"] },
  crew_count: { type: "integer", min: 1, requiredFor: ["pricing", "capacity"] },
  vehicle_class: { type: "string", requiredFor: ["matching", "pricing"] },
  route_distance_km: { type: "number", min: 0, requiredFor: ["travel"] },
  load_weight_kg: { type: "number", min: 0, requiredFor: ["eligibility", "pricing"] },
  load_volume_m3: { type: "number", min: 0, requiredFor: ["eligibility", "pricing"] },
  access_constraints: { type: "array", requiredFor: ["eligibility", "quote"] },
  inclusions: { type: "array", requiredFor: ["scope"] },
  exclusions: { type: "array", requiredFor: ["scope"] },
});
export const LEGACY_FIELD_ALIASES = Object.freeze({
  notice: "lead_time_days", team: "crew_count", scale: "max_capacity",
  distance: "route_distance_km", where: "service_area", events_per_day: "max_capacity",
});
export function canonicalFieldId(id) { return LEGACY_FIELD_ALIASES[id] || id; }
