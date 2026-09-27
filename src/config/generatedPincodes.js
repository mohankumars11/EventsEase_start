// GENERATED bootstrap — replaced by scripts/refresh-pincodes.mjs.
//
// ── What this is ─────────────────────────────────────────────────────
// The Bengaluru pincodes the pilot actually needs, each pointing at a
// locality centroid verified against real geodesic distances (see
// scripts/data/bengaluru-localities.json).
//
// It exists so the booking flow works TODAY. The authoritative source is
// the All-India Pincode Directory on data.gov.in; add DATA_GOV_IN_API_KEY
// to .env and run:
//
//     node scripts/refresh-pincodes.mjs
//
// which overwrites this file with every pincode in the state rather than
// the 88 hand-mapped here.
//
// ── Accuracy, stated honestly ────────────────────────────────────────
// A pincode resolves to the CENTROID of the locality it covers, not to a
// building. Good to roughly two kilometres. That is the right precision
// for "is this job near enough for a master to take" and the wrong
// precision for navigation — which is why the exact address is collected
// separately and released only after payment (migration 068).

export const PINCODE_SOURCE = {
  "source": "bootstrap — hand-mapped from verified Bengaluru localities",
  "state": "Karnataka",
  "asOf": null,
  "total": 88,
  "located": 88
}

export const PINCODES = {
 "560001": {
  "area": "Ulsoor",
  "district": "Bengaluru Urban",
  "lat": 12.982,
  "lng": 77.627
 },
 "560002": {
  "area": "Basavanagudi",
  "district": "Bengaluru Urban",
  "lat": 12.9422,
  "lng": 77.5738
 },
 "560003": {
  "area": "Malleshwaram",
  "district": "Bengaluru Urban",
  "lat": 13.0035,
  "lng": 77.5709
 },
 "560004": {
  "area": "Basavanagudi",
  "district": "Bengaluru Urban",
  "lat": 12.9422,
  "lng": 77.5738
 },
 "560005": {
  "area": "Frazer Town",
  "district": "Bengaluru Urban",
  "lat": 13.0002,
  "lng": 77.615
 },
 "560008": {
  "area": "Ulsoor",
  "district": "Bengaluru Urban",
  "lat": 12.982,
  "lng": 77.627
 },
 "560009": {
  "area": "Ulsoor",
  "district": "Bengaluru Urban",
  "lat": 12.982,
  "lng": 77.627
 },
 "560010": {
  "area": "Rajajinagar",
  "district": "Bengaluru Urban",
  "lat": 12.9916,
  "lng": 77.5526
 },
 "560011": {
  "area": "Jayanagar",
  "district": "Bengaluru Urban",
  "lat": 12.925,
  "lng": 77.5938
 },
 "560012": {
  "area": "Malleshwaram",
  "district": "Bengaluru Urban",
  "lat": 13.0035,
  "lng": 77.5709
 },
 "560013": {
  "area": "Jalahalli",
  "district": "Bengaluru Urban",
  "lat": 13.045,
  "lng": 77.52
 },
 "560014": {
  "area": "Jalahalli",
  "district": "Bengaluru Urban",
  "lat": 13.045,
  "lng": 77.52
 },
 "560015": {
  "area": "Jalahalli",
  "district": "Bengaluru Urban",
  "lat": 13.045,
  "lng": 77.52
 },
 "560016": {
  "area": "KR Puram",
  "district": "Bengaluru Urban",
  "lat": 13.007,
  "lng": 77.696
 },
 "560017": {
  "area": "CV Raman Nagar",
  "district": "Bengaluru Urban",
  "lat": 12.985,
  "lng": 77.665
 },
 "560019": {
  "area": "Basavanagudi",
  "district": "Bengaluru Urban",
  "lat": 12.9422,
  "lng": 77.5738
 },
 "560020": {
  "area": "Rajajinagar",
  "district": "Bengaluru Urban",
  "lat": 12.9916,
  "lng": 77.5526
 },
 "560021": {
  "area": "Rajajinagar",
  "district": "Bengaluru Urban",
  "lat": 12.9916,
  "lng": 77.5526
 },
 "560022": {
  "area": "Peenya",
  "district": "Bengaluru Urban",
  "lat": 13.028,
  "lng": 77.519
 },
 "560024": {
  "area": "Jalahalli",
  "district": "Bengaluru Urban",
  "lat": 13.045,
  "lng": 77.52
 },
 "560025": {
  "area": "Ulsoor",
  "district": "Bengaluru Urban",
  "lat": 12.982,
  "lng": 77.627
 },
 "560026": {
  "area": "Vijayanagar",
  "district": "Bengaluru Urban",
  "lat": 12.9719,
  "lng": 77.53
 },
 "560027": {
  "area": "Basavanagudi",
  "district": "Bengaluru Urban",
  "lat": 12.9422,
  "lng": 77.5738
 },
 "560029": {
  "area": "Bannerghatta Road",
  "district": "Bengaluru Urban",
  "lat": 12.89,
  "lng": 77.597
 },
 "560030": {
  "area": "BTM Layout",
  "district": "Bengaluru Urban",
  "lat": 12.9166,
  "lng": 77.6101
 },
 "560032": {
  "area": "RT Nagar",
  "district": "Bengaluru Urban",
  "lat": 13.0206,
  "lng": 77.5945
 },
 "560033": {
  "area": "Frazer Town",
  "district": "Bengaluru Urban",
  "lat": 13.0002,
  "lng": 77.615
 },
 "560034": {
  "area": "Koramangala",
  "district": "Bengaluru Urban",
  "lat": 12.9352,
  "lng": 77.6245
 },
 "560035": {
  "area": "Sarjapur Road",
  "district": "Bengaluru Urban",
  "lat": 12.901,
  "lng": 77.6874
 },
 "560036": {
  "area": "KR Puram",
  "district": "Bengaluru Urban",
  "lat": 13.007,
  "lng": 77.696
 },
 "560037": {
  "area": "Marathahalli",
  "district": "Bengaluru Urban",
  "lat": 12.9591,
  "lng": 77.6974
 },
 "560038": {
  "area": "Indiranagar",
  "district": "Bengaluru Urban",
  "lat": 12.9784,
  "lng": 77.6408
 },
 "560039": {
  "area": "Vijayanagar",
  "district": "Bengaluru Urban",
  "lat": 12.9719,
  "lng": 77.53
 },
 "560040": {
  "area": "Vijayanagar",
  "district": "Bengaluru Urban",
  "lat": 12.9719,
  "lng": 77.53
 },
 "560041": {
  "area": "Jayanagar",
  "district": "Bengaluru Urban",
  "lat": 12.925,
  "lng": 77.5938
 },
 "560042": {
  "area": "Ulsoor",
  "district": "Bengaluru Urban",
  "lat": 12.982,
  "lng": 77.627
 },
 "560043": {
  "area": "Banaswadi",
  "district": "Bengaluru Urban",
  "lat": 13.014,
  "lng": 77.651
 },
 "560045": {
  "area": "Frazer Town",
  "district": "Bengaluru Urban",
  "lat": 13.0002,
  "lng": 77.615
 },
 "560046": {
  "area": "Frazer Town",
  "district": "Bengaluru Urban",
  "lat": 13.0002,
  "lng": 77.615
 },
 "560047": {
  "area": "Ejipura",
  "district": "Bengaluru Urban",
  "lat": 12.942,
  "lng": 77.627
 },
 "560048": {
  "area": "Hoodi",
  "district": "Bengaluru Urban",
  "lat": 12.992,
  "lng": 77.716
 },
 "560050": {
  "area": "Banashankari",
  "district": "Bengaluru Urban",
  "lat": 12.925,
  "lng": 77.5667
 },
 "560051": {
  "area": "Ulsoor",
  "district": "Bengaluru Urban",
  "lat": 12.982,
  "lng": 77.627
 },
 "560052": {
  "area": "Ulsoor",
  "district": "Bengaluru Urban",
  "lat": 12.982,
  "lng": 77.627
 },
 "560054": {
  "area": "Malleshwaram",
  "district": "Bengaluru Urban",
  "lat": 13.0035,
  "lng": 77.5709
 },
 "560055": {
  "area": "Malleshwaram",
  "district": "Bengaluru Urban",
  "lat": 13.0035,
  "lng": 77.5709
 },
 "560056": {
  "area": "Kengeri",
  "district": "Bengaluru Urban",
  "lat": 12.9082,
  "lng": 77.4855
 },
 "560057": {
  "area": "Peenya",
  "district": "Bengaluru Urban",
  "lat": 13.028,
  "lng": 77.519
 },
 "560058": {
  "area": "Peenya",
  "district": "Bengaluru Urban",
  "lat": 13.028,
  "lng": 77.519
 },
 "560059": {
  "area": "Kengeri",
  "district": "Bengaluru Urban",
  "lat": 12.9082,
  "lng": 77.4855
 },
 "560060": {
  "area": "Uttarahalli",
  "district": "Bengaluru Urban",
  "lat": 12.908,
  "lng": 77.546
 },
 "560061": {
  "area": "Uttarahalli",
  "district": "Bengaluru Urban",
  "lat": 12.908,
  "lng": 77.546
 },
 "560062": {
  "area": "Uttarahalli",
  "district": "Bengaluru Urban",
  "lat": 12.908,
  "lng": 77.546
 },
 "560064": {
  "area": "Yelahanka",
  "district": "Bengaluru Urban",
  "lat": 13.1007,
  "lng": 77.5963
 },
 "560066": {
  "area": "Whitefield",
  "district": "Bengaluru Urban",
  "lat": 12.9698,
  "lng": 77.75
 },
 "560067": {
  "area": "Kadugodi",
  "district": "Bengaluru Urban",
  "lat": 12.995,
  "lng": 77.76
 },
 "560068": {
  "area": "Bommanahalli",
  "district": "Bengaluru Urban",
  "lat": 12.901,
  "lng": 77.62
 },
 "560069": {
  "area": "JP Nagar",
  "district": "Bengaluru Urban",
  "lat": 12.9063,
  "lng": 77.5857
 },
 "560070": {
  "area": "Banashankari",
  "district": "Bengaluru Urban",
  "lat": 12.925,
  "lng": 77.5667
 },
 "560071": {
  "area": "Domlur",
  "district": "Bengaluru Urban",
  "lat": 12.9608,
  "lng": 77.6387
 },
 "560072": {
  "area": "Nagarbhavi",
  "district": "Bengaluru Urban",
  "lat": 12.96,
  "lng": 77.51
 },
 "560073": {
  "area": "Nagarbhavi",
  "district": "Bengaluru Urban",
  "lat": 12.96,
  "lng": 77.51
 },
 "560075": {
  "area": "CV Raman Nagar",
  "district": "Bengaluru Urban",
  "lat": 12.985,
  "lng": 77.665
 },
 "560076": {
  "area": "BTM Layout",
  "district": "Bengaluru Urban",
  "lat": 12.9166,
  "lng": 77.6101
 },
 "560078": {
  "area": "JP Nagar",
  "district": "Bengaluru Urban",
  "lat": 12.9063,
  "lng": 77.5857
 },
 "560079": {
  "area": "Rajajinagar",
  "district": "Bengaluru Urban",
  "lat": 12.9916,
  "lng": 77.5526
 },
 "560080": {
  "area": "Malleshwaram",
  "district": "Bengaluru Urban",
  "lat": 13.0035,
  "lng": 77.5709
 },
 "560082": {
  "area": "Kanakapura Road",
  "district": "Bengaluru Urban",
  "lat": 12.89,
  "lng": 77.55
 },
 "560083": {
  "area": "Bannerghatta Road",
  "district": "Bengaluru Urban",
  "lat": 12.89,
  "lng": 77.597
 },
 "560084": {
  "area": "Frazer Town",
  "district": "Bengaluru Urban",
  "lat": 13.0002,
  "lng": 77.615
 },
 "560085": {
  "area": "Banashankari",
  "district": "Bengaluru Urban",
  "lat": 12.925,
  "lng": 77.5667
 },
 "560086": {
  "area": "Rajajinagar",
  "district": "Bengaluru Urban",
  "lat": 12.9916,
  "lng": 77.5526
 },
 "560087": {
  "area": "Bellandur",
  "district": "Bengaluru Urban",
  "lat": 12.926,
  "lng": 77.6762
 },
 "560091": {
  "area": "Kengeri",
  "district": "Bengaluru Urban",
  "lat": 12.9082,
  "lng": 77.4855
 },
 "560092": {
  "area": "Yelahanka",
  "district": "Bengaluru Urban",
  "lat": 13.1007,
  "lng": 77.5963
 },
 "560093": {
  "area": "CV Raman Nagar",
  "district": "Bengaluru Urban",
  "lat": 12.985,
  "lng": 77.665
 },
 "560094": {
  "area": "Hebbal",
  "district": "Bengaluru Urban",
  "lat": 13.0358,
  "lng": 77.597
 },
 "560095": {
  "area": "Koramangala",
  "district": "Bengaluru Urban",
  "lat": 12.9352,
  "lng": 77.6245
 },
 "560097": {
  "area": "Yelahanka",
  "district": "Bengaluru Urban",
  "lat": 13.1007,
  "lng": 77.5963
 },
 "560098": {
  "area": "Kengeri",
  "district": "Bengaluru Urban",
  "lat": 12.9082,
  "lng": 77.4855
 },
 "560099": {
  "area": "Begur",
  "district": "Bengaluru Urban",
  "lat": 12.865,
  "lng": 77.625
 },
 "560100": {
  "area": "Electronic City",
  "district": "Bengaluru Urban",
  "lat": 12.8452,
  "lng": 77.6602
 },
 "560102": {
  "area": "HSR Layout",
  "district": "Bengaluru Urban",
  "lat": 12.9116,
  "lng": 77.6389
 },
 "560103": {
  "area": "Bellandur",
  "district": "Bengaluru Urban",
  "lat": 12.926,
  "lng": 77.6762
 },
 "560105": {
  "area": "Sarjapur Road",
  "district": "Bengaluru Urban",
  "lat": 12.901,
  "lng": 77.6874
 },
 "560111": {
  "area": "Uttarahalli",
  "district": "Bengaluru Urban",
  "lat": 12.908,
  "lng": 77.546
 },
 "560300": {
  "area": "Devanahalli",
  "district": "Bengaluru Urban",
  "lat": 13.249,
  "lng": 77.711
 },
 "562106": {
  "area": "Anekal",
  "district": "Bengaluru Urban",
  "lat": 12.711,
  "lng": 77.696
 }
}
