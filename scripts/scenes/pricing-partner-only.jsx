/**
 * The pricing rule editor, both modes, at phone width.
 *
 * It read "You earn ₹5,000 · customer pays ₹5,435 (8% Sambramo fee)".
 * The customer total is computed by the marketplace from the rate, the
 * market and the booking — stating it on the screen where a partner
 * decides their own rate presents a number they do not set.
 */
import React from 'react'
import PricingRulesEditor from '../../src/components/vendor/listing/PricingRulesEditor'

export default function Scene() {
  /* The real prop shape: config.pricing.kinds drives which rule cards
     render, and `rules` is keyed by kind. */
  const [rules, setRules] = React.useState({
    per_person: { on: true, price_mode: 'target_net', amount_paise: 500000 },
    hour: { on: true, price_mode: 'customer', amount_paise: 600000 },
  })
  const [answers, setAnswers] = React.useState({})
  const config = { pricing: { kinds: ['per_person', 'hour'] } }
  return (
    <div style={{ maxWidth: 430, margin: '0 auto', padding: 12, background: '#fff', minHeight: 640 }}>
      <PricingRulesEditor
        config={config}
        rules={rules}
        setRules={setRules}
        answers={answers}
        setAnswers={setAnswers}
        fee={0.08}
        tried={false}
        trade="bridal_makeup_hair"
      />
      <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 6 }}>rendered</p>
    </div>
  )
}
