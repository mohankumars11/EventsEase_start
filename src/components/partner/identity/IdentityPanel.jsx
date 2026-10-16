import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import IdentityChoice from '../IdentityChoice'
import { Section } from './RequirementList'
import { requirementsFor } from '../../../data/compliance'
import { evaluateAll } from '../../../lib/verification/satisfaction'
import { fetchVerificationPolicy } from '../../../lib/verificationPolicy'
import { fetchVerificationRequirements } from '../../../lib/verification/edge'
import { fetchDocuments } from '../../../lib/partnerDocuments'
import { supabase } from '../../../lib/supabase'

/**
 * The partner's identity and PAN, collected inside a trade's onboarding.
 *
 * Everything here is the existing verification system, not a copy of it:
 * the requirement engine (lib/verification/requirements), the server's
 * accepted identity options (the sambramo-verification-v2 function), the
 * document chooser (IdentityChoice, persisted on vendors.identity_document),
 * the Aadhaar flow (AadhaarOtpVerification — it refuses with "not connected"
 * when no authorised provider is configured, and never verifies on a typed
 * number), and the private upload + server stamp (DocumentCapture).
 *
 * Statuses are read back from vendor_documents (an operator's `status`, a
 * provider's `provider_status`) — never set by this screen.
 *
 * Identity and PAN belong to the ACCOUNT: a partner's second trade shows
 * what the first one already filed, with its state, instead of asking again.
 */

/** The words the step uses for a requirement's real state. */
export const STATE_LABEL = {
  none: 'Not started',
  incomplete: 'Details required',
  pending: 'Submitted for verification',
  checked: 'Verification in progress',
  verified: 'Verified',
  rejected: 'Action required',
  expired: 'Action required',
}

export function useIdentityRequirements(vendorId) {
  const [vendor, setVendor] = useState(null)
  const [docs, setDocs] = useState({ byRequirement: {} })
  const [policy, setPolicy] = useState(null)
  const [server, setServer] = useState({ requirements: null, identityOptions: null })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!vendorId) { setLoading(false); return }
    const [{ data: v }, d] = await Promise.all([
      supabase.from('vendors').select('id, is_verified, identity_document').eq('id', vendorId).maybeSingle(),
      fetchDocuments(vendorId),
    ])
    setVendor(v ?? null); setDocs(d); setLoading(false)
  }, [vendorId])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    let dead = false
    fetchVerificationPolicy().then(r => { if (!dead) setPolicy(r.policy) }).catch(() => {})
    fetchVerificationRequirements()
      .then(r => { if (!dead && r?.ok) setServer({ requirements: r.requirements ?? null, identityOptions: r.identityOptions ?? null }) })
      .catch(() => {})
    return () => { dead = true }
  }, [])

  const choice = vendor?.identity_document ?? null
  const reqs = useMemo(() => {
    const local = requirementsFor({ trades: [], policy, answers: { identity_document: choice, identity_needs_face: choice === 'dl' } })
    const allowed = server.requirements?.length ? new Set(server.requirements.map(r => r.id)) : null
    return local.filter(r => (r.id.startsWith('VER-ID') || r.id === 'VER-TAX-PAN') && (!allowed || allowed.has(r.id) || r.id === 'VER-TAX-PAN'))
  }, [policy, choice, server.requirements])
  const evaluated = useMemo(() => evaluateAll(reqs, docs.byRequirement ?? {}), [reqs, docs])

  const setChoice = async kind => {
    await supabase.from('vendors').update({ identity_document: kind }).eq('id', vendorId)
    await refresh()
  }

  const identity = reqs.filter(r => r.id.startsWith('VER-ID'))
  const pan = reqs.filter(r => r.id === 'VER-TAX-PAN')
  const stateOf = id => evaluated.results?.[id]?.state ?? 'none'
  return { loading, vendor, docs, reqs, identity, pan, evaluated, choice, setChoice, refresh, identityOptions: server.identityOptions, stateOf }
}

/** Step 1: the identity document chooser and its requirement rows. */
export function IdentitySection({ idr, vendorId }) {
  const [openId, setOpenId] = useState(null)
  const identityReq = idr.identity.find(r => r.id === 'VER-ID-IDENTITY') ?? null
  const uploaded = !!idr.docs.byRequirement?.['VER-ID-IDENTITY']
  const shared = {
    docs: idr.evaluated.results ?? {}, openId, vendorId,
    onOpen: id => setOpenId(cur => (cur === id ? null : id)),
    onUploaded: idr.refresh, listingFor: () => null,
    identityDoc: idr.docs.byRequirement?.['VER-ID-IDENTITY'] ?? null,
  }
  return (
    <div data-section="identity">
      <IdentityChoice
        value={idr.choice}
        options={idr.identityOptions?.length
          ? idr.identityOptions.map(o => ({ kind: o.kind, label: o.label, hint: o.recommended ? 'Recommended for the fastest identity verification.' : 'Accepted for identity verification.' }))
          : (identityReq?.acceptsTypes ?? [])}
        locked={uploaded}
        onChange={idr.setChoice}
      />
      <Section title="Identity" items={idr.identity} {...shared} />
      <RefreshButton onClick={idr.refresh} />
    </div>
  )
}

/** Step 2: the PAN document requirement (the PAN number itself is on the payout form). */
export function PanDocumentSection({ idr, vendorId }) {
  const [openId, setOpenId] = useState(null)
  if (!idr.pan.length) return null
  return (
    <div data-section="pan-document" className="mt-3">
      <Section title="PAN card" items={idr.pan} docs={idr.evaluated.results ?? {}} openId={openId} vendorId={vendorId}
        onOpen={id => setOpenId(cur => (cur === id ? null : id))} onUploaded={idr.refresh} listingFor={() => null} identityDoc={null} />
    </div>
  )
}

function RefreshButton({ onClick }) {
  const [busy, setBusy] = useState(false)
  return (
    <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onClick() } finally { setBusy(false) } }}
      className="-mt-2 mb-1 inline-flex items-center gap-1.5 rounded-full bg-plum-50 px-3 py-1.5 text-[12px] font-extrabold text-plum-700">
      <RefreshCw size={13} className={busy ? 'animate-spin' : ''} /> Refresh status
    </button>
  )
}
