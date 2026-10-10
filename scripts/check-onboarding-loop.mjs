/**
 * The partner entry, trade-opening, submission and payout contract.
 *
 *   entry        /partner/setup and /partner/services → ServiceSelector,
 *                "What services do you offer?", the 34 registry trades
 *   a trade      /partner/onboard/<registry id> opens that trade's own
 *                existing flow directly (draft resumed by key) — never a
 *                dashboard tab, never More
 *   submit ok    → Jobs (/dashboard/vendor?submitted=…) with a server-read
 *                  confirmation; account queued with submit_for_review()
 *   submit fail  → stays in the flow with the error, nothing navigates
 *   identity &   completed INSIDE the trade's "Identity Verification & Bank
 *   bank         Details" step with the existing verification, bank list,
 *                IFSC lookup and payout record; activation through the
 *                existing Route setup; instant booking needs Razorpay
 *                route_status = 'activated' (migration 20261010_15)
 *
 * Every assertion reads the code that does the thing (comments stripped),
 * plus the pure status functions run for real.
 *
 *   node scripts/check-onboarding-loop.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (n, cond, d = '') => { ran++; if (!cond) bad++; console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`) }

/* Comments describe the behaviour; code causes it. */
const code = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

const app = code('src/App.jsx')
const stage = code('src/lib/partnerStage.js')
const sel = code('src/pages/partner/ServiceSelector.jsx')
const list = code('src/components/vendor/VendorServiceList.jsx')
const flow = code('src/components/vendor/listing/ListingOnboardingFlow.jsx')
const anchor = code('src/components/vendor/anchor/AnchorOnboardingFlow.jsx')
const payoutStage = code('src/components/vendor/anchor/stages/PayoutReviewStages.jsx')
const payouts = code('src/pages/partner/Payouts.jsx')
const card = code('src/components/partner/SubmittedCard.jsx')
const dash = code('src/pages/dashboard/VendorDashboard.jsx')
const routes = code('src/lib/tradeRoutes.js')
const onboard = code('src/pages/partner/TradeOnboarding.jsx')
const form = code('src/components/vendor/bank/PayoutOnboardingForm.jsx')
const picker = code('src/components/vendor/bank/BankPicker.jsx')
const idPanel = code('src/components/partner/identity/IdentityPanel.jsx')
const reqList = code('src/components/partner/identity/RequirementList.jsx')
const pricing = code('src/components/vendor/SambramoPricingStudio.jsx')
const tradePricing = code('src/components/vendor/TradePricingStudio.jsx')
const has = (s, needle) => s.includes(needle)

console.log('\nTHE ENTRY IS THE SERVICE SELECTOR, NOT THE FIVE-SECTION OVERVIEW\n')
ok('/partner/setup renders ServiceSelector', /path="\/partner\/setup" element=\{[\s\S]{0,120}<ServiceSelector \/>/.test(app))
ok('/partner/services renders the same ServiceSelector', /path="\/partner\/services" element=\{[\s\S]{0,120}<ServiceSelector \/>/.test(app))
ok('the legacy overview is not routed anywhere', !/PartnerSetupIntro/.test(app) && !existsSync('src/pages/partner/PartnerSetupIntro.jsx'))
ok('a partner with no vendor row or no services lands on the selector',
   /case STAGE\.NEW:\s*return '\/partner\/setup'/.test(stage) && /case STAGE\.CHOOSE_TRADES: return '\/partner\/setup'/.test(stage))
ok('a partner with submitted or live listings lands on Jobs', /default:\s*return '\/dashboard\/vendor'/.test(stage))

console.log('\nTHE SELECTOR\n')
ok('reads the canonical registry, in registry order', has(sel, 'TRADE_CONFIGS.slice().sort((a, b) => a.order - b.order)'))
ok('says "What services do you offer?"', has(sel, 'What services do you offer?'))
ok('search placeholder "Search for a service..."', has(sel, 'placeholder="Search for a service..."'))
ok('empty search says "No services found. Try another name."', has(sel, 'No services found. Try another name.'))
ok('multi-select toggles, with a selected count', has(sel, 'setPicked(p => (p.includes(name)') && has(sel, "selected` : 'Select at least one service to continue.'"))
ok('Continue is disabled with nothing picked, and says why', has(sel, 'disabled={!picked.length || busy}'))
ok('the sticky action reads "Continue with Selected Services"', has(sel, 'Continue with Selected Services'))
ok('a summary "Let\'s set up your N services" precedes the first trade', has(sel, "Let's set up your"))
ok('no identity or bank inputs on the selector', !/account_number|ifsc|aadhaar|<input[^>]*type="password"/i.test(sel))
ok('its account rows are status only — they do not send anyone to More', !/ACCOUNT_LINKS|tab=account/.test(sel))

console.log('\nA TRADE OPENS ITS OWN ONBOARDING DIRECTLY\n')
ok('/partner/onboard/:tradeId is routed to TradeOnboarding', /path="\/partner\/onboard\/:tradeId" element=\{[\s\S]{0,120}<TradeOnboarding \/>/.test(app))
ok('the path is built from the canonical registry id', has(routes, 'configFor(trade)?.id'))
ok('TradeOnboarding resolves the trade from the id and opens the existing flow', has(onboard, 'configFor(decodeURIComponent(tradeId') && has(onboard, '<AddItemFlow'))
ok('a trade already listed opens that listing (edit), never a second one',
   has(onboard, 'services.find(s => s.category === config.name)') && has(sel, 'if (listed[name]) { navigate(onboardPath(name)); return }'))
ok('selector Continue, Jobs card and More → My services all open it',
   has(sel, 'navigate(onboardPath(first))') && has(card, 'navigate(onboardPath(next))') && has(dash, 'onOpenTrade={trade => navigate(onboardPath(trade))}'))
ok('no trade is opened through a dashboard tab any more',
   ![sel, card].some(x => x.includes('tab=list&start=')) && !has(dash, 'onOpenTrade={trade => setParams'))
ok('the tab bar is hidden on a trade onboarding', has(code('src/components/layout/PartnerBottomNav.jsx'), "'/partner/onboard'"))

console.log('\nSUBMIT GOES TO JOBS — ONLY WHEN THE SERVER SAID YES\n')
const submitBody = flow.slice(flow.indexOf('async function submit()'), flow.indexOf('const answersSet'))
ok('listing flow: an RPC error stays in the flow', has(submitBody, 'if (error) { setSubmitError(friendlyError(error)); return }'))
ok('listing flow: hands back (next, data) only after that check',
   submitBody.indexOf('onClose?.(nextTrade || undefined, data)') > submitBody.indexOf('if (error) { setSubmitError'))
ok('anchor flow: hands back (next, data) after its RPC', has(anchor, 'onClose?.(nextTrade || undefined, data)'))
ok('Save & exit closes with no result', has(flow, 'saveDraft({ answers: a, step }); onClose?.()'))
const closes = [...list.matchAll(/onClose=\{\([^)]*\) => \{[\s\S]{0,200}?onSubmitted/g)]
ok('both Listing-tab AddItemFlow instances route a submitted result to onSubmitted', closes.length === 2, `${closes.length} found`)
ok('a submission lands on Jobs with ?submitted= (Listing tab and direct route alike)',
   has(routes, 'navigate(`/dashboard/vendor?${q}`') && has(routes, 'submitted: trade') && has(list, 'afterSubmission(navigate') && has(onboard, 'afterSubmission(navigate'))
ok('and puts the account in the review queue (existing RPC)', has(routes, "supabase.rpc('submit_for_review')"))
ok('Jobs renders the confirmation card', has(dash, "tab === 'offers' && <SubmittedCard"))
ok('the card reads the version status back from the server', has(card, "from('sambramo_listing_versions').select('status, vendor_service_id')"))
ok('the card offers the next selected service and Add Another Service', /Continue Setting Up Another Service/.test(card) && /Add Another Service/.test(card))

console.log('\nIDENTITY AND BANK DETAILS ARE COMPLETED INSIDE THE STEP\n')
ok('titled "Identity Verification & Bank Details"', has(payoutStage, 'title="Identity Verification & Bank Details"'))
ok('the step renders the identity section and the payout form inline', has(payoutStage, '<IdentitySection') && has(payoutStage, '<PayoutOnboardingForm'))
ok('the step never navigates away (no More tab, no Razorpay login)', !/useNavigate|navigate\(/.test(payoutStage) && !/login/i.test(payoutStage + form))
ok('identity uses the existing chooser, Aadhaar flow and uploads', has(idPanel, '<IdentityChoice') && has(reqList, '<AadhaarOtpVerification') && has(reqList, '<DocumentCapture'))
ok('statuses come from the backend rows, in the step\'s words', has(idPanel, 'evaluateAll(reqs') && has(idPanel, "checked: 'Verification in progress'"))
ok('steps 2–4: PAN, bank, UPI, saved by "Save Bank & UPI Details"',
   has(form, 'title="PAN and tax details"') && has(form, 'title="Bank account details"') && has(form, 'title="UPI details"') && has(form, 'Save Bank &amp; UPI Details'))
ok('one payout record per partner (upsert on vendor_id)', has(form, ".from('vendor_payout_details').upsert(payload, { onConflict: 'vendor_id' })"))
ok('bank list and IFSC lookup are the existing ones, shared with More', has(picker, "from '../../../data/indianBanks'") && has(picker, 'lookupIfsc(code)') && has(code('src/components/vendor/PayoutDetails.jsx'), 'useIfscLookup(ifsc, bank, setBank)'))
ok('the bank list is searchable', has(picker, 'data-testid="bank-search"'))
ok('account number typed twice; UPI confirmed; consent asked', has(form, 'account_number_confirm') && has(form, 'upiMismatch') && has(form, 'data-testid="bank-consent"'))
ok('never asks for a PIN or password', !/type="password"|label[^>]*>[^<]*(PIN|password)/i.test(form))
ok('saving starts payout activation through the existing Route setup', has(payoutStage, "routeSetup('setup')") && has(code('src/lib/payoutRoute.js'), 'op=route-setup'))
ok('Payouts sends "add bank / PAN first" to the form that has a PAN field', /screen=bank/.test(payouts) && /pan/.test(code('src/components/vendor/PayoutDetails.jsx')))
ok('Razorpay is credited with its own logo', existsSync('src/assets/brand/razorpay-logo.svg') && /RazorpayBadge/.test(payoutStage))

const S = await import(pathToFileURL(resolve('src/lib/partnerAccountStatus.js')).href)
ok('saved bank details are NOT active', S.payoutStatus({ method: 'bank', verified_at: null }, null) === 'details_saved')
ok('a created Razorpay account is NOT active', S.payoutStatus({ method: 'bank' }, { route_account_id: 'acc_x', route_status: 'created' }) === 'activation_pending')
ok('only route_status activated is active', S.payoutStatus({ method: 'bank' }, { route_account_id: 'acc_x', route_status: 'activated' }) === 'active')
ok('suspended / rejected are restricted', ['suspended', 'rejected'].every(r => S.payoutStatus({}, { route_status: r }) === 'restricted'))
ok('an uploaded ID is pending, not verified', S.identityStatus({ is_verified: false }, { 'VER-ID-IDENTITY': 'pending' }) === 'pending')
ok('a trade licence never counts as identity', S.identityStatus({ is_verified: false }, { 'VER-TRADE-FSSAI': 'accepted' }) === 'not_started')
ok('operator-verified identity is verified', S.identityStatus({ is_verified: true }, {}) === 'verified')
const m15 = readFileSync('supabase/migrations/20261010_15_payout_ready_means_activated.sql', 'utf8')
ok('migration 15 makes the server require route_status = activated', m15.includes("replace(def, 'pa.route_account_id is not null', 'pa.route_status = ''activated''')"))

console.log('\nPRICING AND EDITING CONTRACTS\n')
ok('SambramoPricingStudio passes the trade config into TradePricingStudio', /<TradePricingStudio[\s\S]*?config=\{config\}/.test(pricing))
ok('TradePricingStudio requires its trade config', /function TradePricingStudio\(\{ vendor, service, config,/.test(tradePricing))
ok('Vendor dashboard forwards the exact edit target', has(dash, "editListing={params.get('edit')}"))
ok('Listing tab consumes the edit target and opens editing mode', has(list, 'setEditing(current => current === editListing ? current : editListing)'))
ok('a tab switch keeps the query it must keep', /setTab = id =>\s*setParams\(keepReturn\(/.test(dash))

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
process.exitCode = bad ? 1 : 0
