/**
 * Every kind of document Sambramo can ask a partner for.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE REGISTRY, AND NO RULE IN A COMPONENT
 * ══════════════════════════════════════════════════════════════════════
 *
 * What a document needs — two sides or one, a number or not, an expiry
 * date, a holder name, whether a face has to match it — is a property of
 * the DOCUMENT, not of the screen showing it. Put any of it in a React
 * component and the partner app, the operator queue and the test suite
 * immediately hold three different opinions about an Aadhaar card.
 *
 * `kind` must be a value `vendor_documents.kind` accepts. Migration 142
 * widened that CHECK to twelve; anything added here needs a migration
 * first or the insert fails at upload time with a constraint error that
 * reads like a bug in the uploader.
 *
 * ══════════════════════════════════════════════════════════════════════
 * `verificationProvider` IS A PROMISE ABOUT WHAT CAN BE CHECKED
 * ══════════════════════════════════════════════════════════════════════
 *
 *   'checksum'  the number checks itself — Verhoeff, mod-36, structure.
 *               Real today, offline, free. src/lib/validation/identity.js
 *   'digilocker'| a licensed route exists and is not contracted yet. The
 *   'nsdl'      | adapter reports `not_checked` until one is, and the UI
 *   'gstn'      | says "checked", never "verified".
 *   'parivahan' |
 *   'fssai'     |
 *   'penny_drop'|
 *   'manual'    only a human can judge this one — a lease, a fire NOC,
 *               a portfolio. No API will ever settle it.
 *
 * Nothing here may be labelled "Government Verified" on the strength of
 * a checksum. See the labels in `verificationLabel()`.
 */

/** The maximum a partner can upload. Matches partnerDocuments.js:146. */
const MAX_BYTES = 10 * 1024 * 1024
const IMAGE = ['image/jpeg', 'image/png', 'image/webp']
const IMAGE_OR_PDF = [...IMAGE, 'application/pdf']

/**
 * ══════════════════════════════════════════════════════════════════════
 * `detectAs` — WHAT THE CLASSIFIER SHOULD SEE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The values api/verify-document.js is allowed to answer with, for a
 * photograph filed under this requirement. A reading outside the list
 * is refused, and the refusal NAMES what was seen instead.
 *
 * ── Absent on purpose, in eight places ──────────────────────────────
 * A type with no `detectAs` is never refused on content. A liquor
 * permit, a PUC certificate, a transport permit, an electrical licence,
 * a property document, an occupancy certificate, a fire NOC and a work
 * portfolio have no consistent national format -- they are state forms,
 * municipal letters and PDFs, and they look different in every district.
 *
 * Asserting "that is not a fire NOC" about a document we cannot reliably
 * recognise would refuse real documents from real partners, which is a
 * far worse failure than letting one through to a human. Silence is the
 * honest answer where there is no reliable one.
 *
 * ── shop_licence takes three ────────────────────────────────────────
 * "Proof you are a registered business" is satisfied by a trade licence,
 * an Udyam certificate or a GST certificate, and a partner who uploads
 * whichever one they actually hold is not making a mistake.
 */
export const DOCUMENT_TYPES = {
  /* ── Identity ──────────────────────────────────────────────────── */
  aadhaar: {
    kind: 'aadhaar',
    detectAs: ['aadhaar'],
    label: 'Aadhaar',
    hint: 'The whole card, both sides, with the number readable.',
    frontRequired: true,
    backRequired: true,
    numberRequired: true,
    checksumKind: 'aadhaar',
    expiryRequired: false,
    holderNameRequired: true,
    issuingAuthorityRequired: false,
    verificationProvider: 'digilocker',
    faceMatchRequired: true,
    businessMatchRequired: false,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE,
    maximumFileSize: MAX_BYTES,
    /* Never stored in full. 093 has `number_last4` and deliberately no
       `number` column — the Aadhaar Act restricts holding the number,
       and nothing operational needs it. */
    storeNumber: 'last4',
  },

  pan: {
    kind: 'pan',
    detectAs: ['pan'],
    label: 'PAN',
    hint: 'The card itself, not a photocopy of a photocopy.',
    frontRequired: true,
    backRequired: false,
    numberRequired: true,
    checksumKind: 'pan',
    expiryRequired: false,
    holderNameRequired: true,
    issuingAuthorityRequired: false,
    verificationProvider: 'nsdl',
    faceMatchRequired: false,
    businessMatchRequired: false,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE,
    maximumFileSize: MAX_BYTES,
    storeNumber: 'last4',
  },

  selfie: {
    kind: 'selfie',
    detectAs: ['selfie'],
    label: 'A photo of you',
    hint: 'Face the camera in good light. This is matched against your ID.',
    frontRequired: true,
    backRequired: false,
    numberRequired: false,
    expiryRequired: false,
    holderNameRequired: false,
    issuingAuthorityRequired: false,
    verificationProvider: 'face_match',
    faceMatchRequired: true,
    businessMatchRequired: false,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE,
    maximumFileSize: MAX_BYTES,
    /* A screenshot of a photo defeats the whole point. */
    rejectScreenshots: true,
    /* The FRONT camera. `capture="environment"` was hardcoded on the
       input, so asking a partner for a photo of themselves opened the
       rear camera and they photographed the ceiling. */
    captureFacing: 'user',
    /* Comparing a face with a government ID photo is biometric
       processing. BiometricConsent has to be answered before the camera
       opens, and answering no is free -- see migration 150. */
    needsConsent: 'face_match',
  },

  /* ── Business ──────────────────────────────────────────────────── */
  gst: {
    kind: 'gst',
    detectAs: ['gst_certificate'],
    label: 'GST registration',
    hint: 'Only if you are registered. Most partners under the turnover threshold are not.',
    frontRequired: true,
    backRequired: false,
    numberRequired: true,
    checksumKind: 'gst',
    expiryRequired: false,
    holderNameRequired: false,
    issuingAuthorityRequired: false,
    verificationProvider: 'gstn',
    faceMatchRequired: false,
    businessMatchRequired: true,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE_OR_PDF,
    maximumFileSize: MAX_BYTES,
    storeNumber: 'last4',
  },

  udyam: {
    kind: 'udyam',
    detectAs: ['udyam'],
    label: 'Udyam registration',
    hint: 'The MSME certificate, if you have one.',
    frontRequired: true, backRequired: false,
    numberRequired: true, checksumKind: 'udyam',
    expiryRequired: false, holderNameRequired: false,
    issuingAuthorityRequired: false,
    verificationProvider: 'manual',
    faceMatchRequired: false, businessMatchRequired: true,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE_OR_PDF, maximumFileSize: MAX_BYTES,
    storeNumber: 'last4',
  },

  shop_licence: {
    kind: 'shop_licence',
    detectAs: ['shop_licence', 'udyam', 'gst_certificate'],
    label: 'Proof of business',
    hint: 'A municipal licence, a registration certificate, or anything official in your business name.',
    frontRequired: true, backRequired: false,
    numberRequired: false,
    expiryRequired: true, minimumValidityDays: 30,
    holderNameRequired: false,
    issuingAuthorityRequired: true,
    verificationProvider: 'manual',
    faceMatchRequired: false, businessMatchRequired: true,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE_OR_PDF, maximumFileSize: MAX_BYTES,
  },

  /* ── Food ──────────────────────────────────────────────────────── */
  fssai: {
    kind: 'fssai',
    detectAs: ['fssai_licence'],
    label: 'FSSAI licence',
    hint: 'The 14-digit registration or licence. Legally required to serve food.',
    frontRequired: true, backRequired: false,
    numberRequired: true, checksumKind: 'fssai',
    expiryRequired: true, minimumValidityDays: 30,
    holderNameRequired: false,
    issuingAuthorityRequired: false,
    verificationProvider: 'fssai',
    faceMatchRequired: false, businessMatchRequired: true,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE_OR_PDF, maximumFileSize: MAX_BYTES,
    storeNumber: 'last4',
  },

  liquor_permit: {
    kind: 'other',
    label: 'Permission to serve alcohol',
    hint: 'The event licence or your standing permit, whichever applies.',
    frontRequired: true, backRequired: false,
    numberRequired: false,
    expiryRequired: true, minimumValidityDays: 1,
    holderNameRequired: false, issuingAuthorityRequired: true,
    verificationProvider: 'manual',
    faceMatchRequired: false, businessMatchRequired: true,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE_OR_PDF, maximumFileSize: MAX_BYTES,
  },

  /* ── Driving ───────────────────────────────────────────────────── */
  dl: {
    kind: 'dl',
    detectAs: ['driving_licence'],
    label: 'Driving licence',
    hint: 'Both sides, with the validity dates readable.',
    frontRequired: true, backRequired: true,
    numberRequired: true, checksumKind: 'dl',
    expiryRequired: true, minimumValidityDays: 30,
    holderNameRequired: true, issuingAuthorityRequired: false,
    verificationProvider: 'parivahan',
    faceMatchRequired: true, businessMatchRequired: false,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE, maximumFileSize: MAX_BYTES,
    storeNumber: 'last4',
  },

  rc: {
    kind: 'rc',
    detectAs: ['vehicle_rc'],
    label: 'Vehicle registration (RC)',
    hint: 'The RC book or card for the vehicle you will use.',
    frontRequired: true, backRequired: true,
    numberRequired: true, checksumKind: 'rc',
    expiryRequired: false,
    holderNameRequired: true, issuingAuthorityRequired: false,
    verificationProvider: 'parivahan',
    faceMatchRequired: false, businessMatchRequired: false,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE, maximumFileSize: MAX_BYTES,
    storeNumber: 'last4',
  },

  insurance: {
    kind: 'insurance',
    detectAs: ['insurance_policy'],
    label: 'Vehicle insurance',
    hint: 'Current policy. An expired one cannot be accepted.',
    frontRequired: true, backRequired: false,
    numberRequired: false,
    expiryRequired: true, minimumValidityDays: 15,
    holderNameRequired: false, issuingAuthorityRequired: true,
    verificationProvider: 'manual',
    faceMatchRequired: false, businessMatchRequired: false,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE_OR_PDF, maximumFileSize: MAX_BYTES,
  },

  puc: {
    kind: 'other',
    label: 'Pollution certificate (PUC)',
    hint: 'The current PUC for the same vehicle.',
    frontRequired: true, backRequired: false,
    numberRequired: false,
    expiryRequired: true, minimumValidityDays: 7,
    holderNameRequired: false, issuingAuthorityRequired: false,
    verificationProvider: 'manual',
    faceMatchRequired: false, businessMatchRequired: false,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE_OR_PDF, maximumFileSize: MAX_BYTES,
  },

  permit: {
    kind: 'other',
    label: 'Commercial permit or fitness',
    hint: 'Needed where the vehicle carries passengers or goods for hire.',
    frontRequired: true, backRequired: false,
    numberRequired: false,
    expiryRequired: true, minimumValidityDays: 15,
    holderNameRequired: false, issuingAuthorityRequired: true,
    verificationProvider: 'manual',
    faceMatchRequired: false, businessMatchRequired: false,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE_OR_PDF, maximumFileSize: MAX_BYTES,
  },

  /* ── Public safety ─────────────────────────────────────────────── */
  psara: {
    kind: 'other',
    detectAs: ['psara_licence'],
    label: 'PSARA licence',
    hint: 'Statutory for a private security agency under the PSARA Act 2005.',
    frontRequired: true, backRequired: false,
    numberRequired: false,
    expiryRequired: true, minimumValidityDays: 30,
    holderNameRequired: false, issuingAuthorityRequired: true,
    verificationProvider: 'manual',
    faceMatchRequired: false, businessMatchRequired: true,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE_OR_PDF, maximumFileSize: MAX_BYTES,
  },

  electrical_licence: {
    kind: 'other',
    label: 'Electrical contractor licence',
    hint: 'For temporary power, generators and rigged lighting.',
    frontRequired: true, backRequired: false,
    numberRequired: false,
    expiryRequired: true, minimumValidityDays: 30,
    holderNameRequired: false, issuingAuthorityRequired: true,
    verificationProvider: 'manual',
    faceMatchRequired: false, businessMatchRequired: true,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE_OR_PDF, maximumFileSize: MAX_BYTES,
  },

  liability_insurance: {
    kind: 'insurance',
    detectAs: ['insurance_policy'],
    label: 'Public liability insurance',
    hint: 'Cover for injury or damage at an event you are working.',
    frontRequired: true, backRequired: false,
    numberRequired: false,
    expiryRequired: true, minimumValidityDays: 15,
    holderNameRequired: false, issuingAuthorityRequired: true,
    verificationProvider: 'manual',
    faceMatchRequired: false, businessMatchRequired: true,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE_OR_PDF, maximumFileSize: MAX_BYTES,
  },

  police_clearance: {
    kind: 'police_clearance',
    detectAs: ['police_clearance'],
    label: 'Police clearance certificate',
    hint: 'From your local police station or a Passport Seva Kendra.',
    frontRequired: true, backRequired: false,
    numberRequired: false,
    expiryRequired: true, minimumValidityDays: 30,
    holderNameRequired: true, issuingAuthorityRequired: true,
    verificationProvider: 'manual',
    faceMatchRequired: false, businessMatchRequired: false,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE_OR_PDF, maximumFileSize: MAX_BYTES,
    /* ── Declining this is allowed ────────────────────────────────
       A background check cannot be compelled: DPDP 2023 requires
       consent to be free and withdrawable, and every screening vendor
       requires it contractually. So this requirement carries
       `declinable` and the engine scopes the partner down rather than
       blocking the account. A partner may also satisfy it by bringing
       a PCC they obtained themselves, which needs no consent from us
       at all — that is why the provider here is 'manual'. */
    declinable: true,
  },

  /* ── Premises ──────────────────────────────────────────────────── */
  property_proof: {
    kind: 'other',
    label: 'Proof you can let this venue',
    hint: 'Ownership papers, a lease, or written authorisation from the owner.',
    frontRequired: true, backRequired: false,
    numberRequired: false,
    expiryRequired: false,
    holderNameRequired: false, issuingAuthorityRequired: false,
    verificationProvider: 'manual',
    faceMatchRequired: false, businessMatchRequired: true,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE_OR_PDF, maximumFileSize: MAX_BYTES,
  },

  occupancy_certificate: {
    kind: 'other',
    label: 'Occupancy certificate',
    hint: 'Issued by the local authority for the building.',
    frontRequired: true, backRequired: false,
    numberRequired: false,
    expiryRequired: false,
    holderNameRequired: false, issuingAuthorityRequired: true,
    verificationProvider: 'manual',
    faceMatchRequired: false, businessMatchRequired: true,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE_OR_PDF, maximumFileSize: MAX_BYTES,
  },

  fire_noc: {
    kind: 'other',
    label: 'Fire safety NOC',
    hint: 'From the fire service, for a venue hosting gatherings.',
    frontRequired: true, backRequired: false,
    numberRequired: false,
    expiryRequired: true, minimumValidityDays: 30,
    holderNameRequired: false, issuingAuthorityRequired: true,
    verificationProvider: 'manual',
    faceMatchRequired: false, businessMatchRequired: true,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE_OR_PDF, maximumFileSize: MAX_BYTES,
  },

  /* ── Evidence of work ──────────────────────────────────────────── */
  portfolio: {
    kind: 'other',
    label: 'Samples of your work',
    hint: 'A few photographs of events you have actually done.',
    frontRequired: true, backRequired: false,
    numberRequired: false,
    expiryRequired: false,
    holderNameRequired: false, issuingAuthorityRequired: false,
    verificationProvider: 'manual',
    faceMatchRequired: false, businessMatchRequired: false,
    manualReviewAllowed: true,
    allowedFileTypes: IMAGE, maximumFileSize: MAX_BYTES,
  },
}

/**
 * The label a screen may use, given what actually happened.
 *
 * Precise, and never "Government Verified" unless a licensed provider
 * returned a success for this exact document.
 */
export function verificationLabel({ status, providerStatus, checksumOk, documentType }) {
  if (status === 'rejected') return 'Sent back'
  if (providerStatus === 'mismatch') return 'Does not match your details'
  if (providerStatus === 'not_found') return 'Not found at the issuer'

  if (providerStatus === 'verified') {
    const t = DOCUMENT_TYPES[documentType]
    if (t?.businessMatchRequired) return 'Business registration verified'
    if (documentType === 'aadhaar' || documentType === 'selfie') return 'Identity verified'
    return 'Document verified'
  }

  if (status === 'accepted') return 'Document verified'
  if (status === 'pending' && checksumOk) return 'Number checks out — being reviewed'
  if (status === 'pending') return 'Pending verification'
  if (providerStatus === 'unavailable' || providerStatus === 'error') return 'Manual review required'
  return 'Not started'
}
