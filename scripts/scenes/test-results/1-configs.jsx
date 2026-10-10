import React from 'react'
const LINES = ["check-trade-configs: 4027/4027 passed","  ✓ 4,027 structural checks (ids, options, showWhen refs, units, compliance, no copied questions)"]
const tone = l => l.includes('✗') ? '#e11d48' : l.includes('✓') ? '#15803d' : /^(──|══)/.test(l.trim()) ? '#5b21b6' : '#334155'
export default function Result() {
  return (
    <div style={{ width: 980, margin: '0 auto', background: '#ffffff', padding: 28, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #ede9fe', paddingBottom: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 22, fontWeight: 800, color: '#2e1065' }}>Trade questionnaires — structure of all 34 trades</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>node scripts/check-trade-configs.mjs · 2026-10-10 · branch feature/partner-34-trade-onboarding-ready-20261010</div>
        </div>
        <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 20, fontWeight: 800, color: '#fff', background: '#15803d', borderRadius: 999, padding: '6px 16px' }}>4027/4027 passed</div>
      </div>
      {LINES.map((l, i) => <div key={i} style={{ fontSize: 13, lineHeight: '19px', whiteSpace: 'pre-wrap', color: tone(l), fontWeight: /passed|══|──/.test(l) ? 700 : 400 }}>{l}</div>)}
    </div>
  )
}
