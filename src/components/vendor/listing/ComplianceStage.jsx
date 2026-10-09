/**
 * Licences & documents for THIS service only — the ones the trade's own
 * answers call for (bar + alcohol → liquor licence, a drone → its permit…).
 *
 * The rows come from requirementsFor(), the same engine the partner's
 * account verification uses, so a document uploaded here is the same row
 * (vendor_documents.requirement_id) everywhere. Upload is optional to
 * submit: a missing licence keeps the listing to custom quotes until it is
 * accepted, and the server says so in listing_readiness().
 */
import { useEffect, useState } from 'react'
import { FileCheck2, FileClock, FileWarning, ChevronRight } from 'lucide-react'
import { Card, Sheet, SectionTitle } from '../anchor/ui'
import DocumentCapture from '../../partner/DocumentCapture'
import { requirementsFor } from '../../../lib/verification/requirements'
import { complianceFor, complianceFlags } from '../../../data/trades'
import { supabase } from '../../../lib/supabase'

export function useDocumentStatus(vendorId) {
  const [rows, setRows] = useState({})
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!vendorId) return
    supabase.from('vendor_documents').select('requirement_id, status').eq('vendor_id', vendorId)
      .then(({ data }) => setRows(Object.fromEntries((data ?? []).map(r => [r.requirement_id, r.status]))))
  }, [vendorId, tick])
  return [rows, () => setTick(t => t + 1)]
}

export function complianceRows(config, answers) {
  const wanted = complianceFor(config, answers)
  const reqs = requirementsFor({ trades: [config.name], answers: complianceFlags(config, answers) })
  return wanted.map(w => ({ ...w, requirement: reqs.find(r => r.id === w.doc) ?? null })).filter(w => w.requirement)
}

const STATE = {
  accepted: { I: FileCheck2, cls: 'bg-forest-50 text-forest-700', text: 'Accepted' },
  pending: { I: FileClock, cls: 'bg-amber-50 text-amber-700', text: 'Being checked' },
  rejected: { I: FileWarning, cls: 'bg-rose-50 text-rose-700', text: 'Needs a new upload' },
  missing: { I: FileWarning, cls: 'bg-[#f4f2f9] text-ink/60', text: 'Not uploaded' },
}

export default function ComplianceStage({ config, answers, vendorId }) {
  const rows = complianceRows(config, answers)
  const [status, refresh] = useDocumentStatus(vendorId)
  const [open, setOpen] = useState(null)
  return (
    <>
      <SectionTitle title="Licences & documents" sub="Only what this service needs. You can submit now; anything marked “Needed for instant booking” keeps you on custom quotes until it is accepted." />
      {rows.length === 0 && <Card><p className="text-[13px] font-bold text-ink/60">Nothing extra is needed for the way you have set up this service.</p></Card>}
      {rows.map(r => {
        const st = STATE[status[r.doc] ?? 'missing'] ?? STATE.missing
        return (
          <button key={r.doc} type="button" onClick={() => setOpen(r)} className="mt-3 block w-full text-left">
            <Card>
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${st.cls}`}><st.I size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-extrabold text-ink">{r.requirement.label}</p>
                  <p className="text-[12px] font-bold text-ink/50">{st.text}{r.blocksInstant && status[r.doc] !== 'accepted' ? ' · Needed for instant booking' : ''}</p>
                  {r.requirement.why && <p className="mt-0.5 text-[11.5px] leading-snug text-ink/45">{r.requirement.why}</p>}
                </div>
                <ChevronRight size={17} className="text-ink/30" />
              </div>
            </Card>
          </button>
        )
      })}
      <Sheet open={!!open} onOpenChange={o => { if (!o) setOpen(null) }} title={open?.requirement.label ?? ''}>
        {open && (
          <DocumentCapture requirement={{ ...open.requirement, trade: config.name }} vendorId={vendorId} listingId={null}
            onUploaded={() => { refresh(); setOpen(null) }} onClose={() => setOpen(null)} />
        )}
      </Sheet>
    </>
  )
}
