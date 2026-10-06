# Editing trades, services and their questions

The listing catalogue — 26 trades, 68 services, and every question a partner
is asked — lives in **JavaScript under `src/`**, not in the database. The
`listing_*` tables are a generated mirror of it.

So changing a question is a code edit followed by four commands. It is not a
console job yet, and the last section says when that changes.

**Read the one rule at the bottom before you rename anything.** It is the only
way to break this badly.

---

## 1 · Where each thing lives

| What you want to change | File |
|---|---|
| Which trade a service belongs to · **add a service** · **add a trade** | `src/config/vendor.js` → `TRADE_FOR_SERVICE` |
| A service's display name, emoji, unit and base price | `src/data/servicePricing.js` → `SERVICE_GROUPS` |
| The questions asked for a **trade** | `src/data/partnerSpecs.js` |
| The questions asked for **one service** | `src/data/partnerServiceSpecs.js` |
| The "how you work" screens (limits, notice, scale…) | `src/data/partnerOperations.js` |

### There is no list of trades to edit

`TRADES` is derived, in `src/data/partnerCatalogue.js`:

```js
export const TRADES = [...new Set(Object.values(TRADE_FOR_SERVICE))].sort()
```

A trade exists because a service names it. So **adding a trade and adding a
service are the same edit**:

```js
// src/config/vendor.js
export const TRADE_FOR_SERVICE = {
  drone_shots: 'Videography',      // new service, trade already exists
  pet_care:    'Pet Services',     // ← this line creates the trade
}
```

`vendor_services.category` stores that trade **name**, and `match_partners`
joins on it. A service with no entry here is quotable and matchable by
nobody — a partner lists it and is never offered a job, with nothing on
screen saying why.

---

## 2 · The shape of a question

Plain objects. No SQL, no schema.

```js
{
  id: 'medium',                       // the KEY — see the rule below
  question: 'What do you work in?',
  hint: 'Tick everything you actually do.',   // optional
  type: 'multi',                      // 'multi' | 'one'
  choices: [
    { id: 'balloons', label: 'Balloons' },
    { id: 'fabric',   label: 'Fabric draping', scan: 'Satin, chiffon, saree panels' },
  ],
}
```

`ServiceSpecs.jsx` renders this generically — it reads `question`, branches on
`type`, and draws `choices`. It does not know what a balloon is. That is why
adding a question needs no component work.

`scan` is the small grey line under a label, for when the label alone is
ambiguous.

---

## 3 · The four commands, in order

```bash
node scripts/generate-catalogue-ids.mjs      # mint SBM- ids for anything new
node scripts/generate-catalogue-seed.mjs     # regenerate migration 107
node scripts/apply-catalogue-seed.mjs --apply    # push the rows to Supabase
npm run build                                # the deploy gate
```

Then `git push`.

**Ids are append-only.** `generate-catalogue-ids.mjs` reads the existing ledger
in `src/data/catalogueIds.generated.js`, finds each prefix's high-water mark
and continues from it. It never renumbers. A retired entry keeps its id
forever so a partner who ticked it keeps their label.

**`npm run build`, never `vite build`.** The npm script runs
`build-api-bundle.mjs --check` first, and a stale `api/_lib/pricing.bundle.js`
stops the chain. `vite build` skips that check and ships a stale API bundle.

### Partners get it without an app update

The partner APK runs in **remote mode** — it loads
`sambramo-partners.vercel.app` at launch. So a Vercel deploy reaches every
installed app on its next open. No APK build, no Play Store, no reinstall.

An APK is only needed when something **native** changes: permissions, a
plugin, the icon, the deep-link scheme.

---

## 4 · Run the guards before you push

```bash
node scripts/check-listing-keys.mjs        # two things sharing one key
node scripts/check-listing-options.mjs     # duplicate or synonymous options
node scripts/check-service-questions.mjs   # every service asks its own, once
node scripts/check-flow-renders.mjs        # all 26 trades still open
node scripts/check-listing-answer-ids.mjs  # every answer resolves to an id
```

`check-listing-keys` is the important one. Every answer a partner gives lands
in **one flat `specs` object**, so two questions sharing an `id` means the
second silently destroys the first. That guard exists because eight
collisions had already done exactly that.

---

## 5 · The rule

> **Never rename an existing `id`, `group_key` or `answer_key`.**

`vendor_services.specs` is literally:

```json
{ "medium": ["balloons", "fresh"], "kitchen": "pure_veg" }
```

Those strings **are** the ids. Rename one and every partner who ticked it has
an answer that resolves to nothing — `describeSpecs()` returns null,
`specProgress()` reports the group unanswered, and a completed listing quietly
reads as incomplete with nothing on screen explaining it.

| Field | Change it? |
|---|---|
| `question`, `hint`, `label`, `scan`, order | **Free.** This is the 90% case. |
| `id`, `group_key`, `answer_key`, `service_key` | **Never.** Deprecate and mint a new one. |
| `listing_trades.name` / a trade string | **Never.** `match_partners` joins on it; every listing under it is orphaned. |
| `type: 'multi'` → `'one'` | **No.** Silently drops every partner's second and later ticks. |
| Removing an option nobody has ticked | Fine. |
| Removing an option partners **have** ticked | Leave it. Their saved answer becomes an id with no label. |

**A key is an API. A label is content.** That is the same contract every
translation system runs on, and it is what makes editing wording safe.

---

## 6 · When this should stop being a code edit

Build the console editor when somebody who is **not an engineer** needs to
change wording without you. That is an organisational trigger, not a
technical one — today the loop above is about three minutes, and the guards
catch the dangerous class of mistake in a way no admin UI would.

When it comes, the order is:

1. **Migration** — `source`, `is_active`, `edited_at`, `edited_by`,
   `image_url` on the six `listing_*` tables; a version row bumped by a
   **statement-level** trigger; an overlay view returning only rows that
   differ; operator id prefixes disjoint from the JS ledger's.
   The edit-stamp trigger must guard on `auth.uid() IS NOT NULL`, or the next
   seed run stamps all 5,755 rows as operator-edited and freezes the seed.
2. **Stop the seed clobbering** — `generate-catalogue-seed.mjs` emits
   `ON CONFLICT … DO UPDATE … WHERE edited_at IS NULL`.
   **Trap:** `apply-catalogue-seed.mjs` replays through PostgREST, which has
   no equivalent of `ON CONFLICT … WHERE`, and its regex discards everything
   after `ON CONFLICT`. It must filter protected ids client-side or it
   clobbers edits while the reviewed SQL claims it cannot.
3. **The read path** — `src/data/listingOverlay.js`, copying the silent-failure
   contract of `src/data/catalogueAdditions.js`: JS is the skeleton, the DB is
   an overlay, and a caterer on two bars of signal gets today's app rather
   than an empty wizard. Cache in memory + `localStorage`, revalidate against
   the version stamp at app boot, read **synchronously** at wizard mount.
   Acceptance test: with zero overlay rows the app behaves byte-identically.
4. **The editor** — refusing every rename in the table above.

`src/data/catalogueAdditions.js` already does all of this for dishes. It is
the working precedent to copy, not a design to invent.
