import React from 'react'
const LINES = ["THE BUILD EXISTS","  ✓ dist/ is there","  ✓ dist/index.html is there","NO SERVICE WORKER REACHES THE APK","  ✓ no dist/sw.js","  ✓ no dist/registerSW.js","  ✓ no workbox runtime","  ✓ index.html does not register one","  ✓ index.html has no serviceWorker.register","  · manifest.webmanifest absent (either is fine)","THE SHELL IS ACTUALLY THERE TO SERVE","  ✓ index.html names an entry bundle","  ✓ and that bundle is on disk","  ✓ every lazy chunk the entry names exists (50 checked)","THE APK CARRIES THIS BUILD AND NOTHING OLDER","  ✓ nothing in the apk that is not in this build (0 orphan(s))","✓ 11/11"]
const tone = l => l.includes('✗') ? '#e11d48' : l.includes('✓') ? '#15803d' : /^(──|══)/.test(l.trim()) ? '#5b21b6' : '#334155'
export default function Result() {
  return (
    <div style={{ width: 980, margin: '0 auto', background: '#ffffff', padding: 28, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #ede9fe', paddingBottom: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 22, fontWeight: 800, color: '#2e1065' }}>Partner APK native build</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>node scripts/check-native-build.mjs · 2026-10-10 · branch feature/partner-34-trade-onboarding-ready-20261010</div>
        </div>
        <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 20, fontWeight: 800, color: '#fff', background: '#15803d', borderRadius: 999, padding: '6px 16px' }}>11/11 passed</div>
      </div>
      {LINES.map((l, i) => <div key={i} style={{ fontSize: 13, lineHeight: '19px', whiteSpace: 'pre-wrap', color: tone(l), fontWeight: /passed|══|──/.test(l) ? 700 : 400 }}>{l}</div>)}
    </div>
  )
}
