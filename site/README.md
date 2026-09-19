# sambramo.com

The public marketing site. 153 static pages, no framework, no runtime
JavaScript, deployed to its own Vercel project on its own domain.

```
npm install          # esbuild only, ~10 MB, and only for the content step
npm run content      # ../src/**  ->  content/*.json      (local / CI only)
npm run build        # content/*.json  ->  dist/          (this is what Vercel runs)
npm run serve        # http://localhost:4321
npm run check        # drift + build + html + jsonld + links + claims
```

---

## The one rule

**Merges flow app branch → `site/www`. Never the reverse.**

Nothing under `site/` is imported by the app and nothing in the app imports
from `site/`. They build separately, deploy to different Vercel projects and
answer on different hostnames. Merging `site/www` into an app branch would put
this `vercel.json` one directory away from the app's, and 153 pages of
marketing HTML into the customer bundle's repository.

If it happens: `git revert -m 1 <merge>`. Nothing is lost.

To refresh the content snapshot from the live app branch:

```bash
git fetch origin
git merge --no-ff origin/feature/without-shopping -m "Refresh app sources"
cd site && npm run content && npm run check
cd .. && git add site/content && git commit -m "Content snapshot: $(date +%F)"
```

Stage named files. Never `git add -A` — the tree is shared with a worktree
that holds other work. Before every commit:

```bash
git diff --cached --name-only | grep -v '^site/' && echo "STOP — something outside site/ is staged"
```

---

## Why it is built this way

**Static HTML is mandatory, not a preference.** GPTBot, OAI-SearchBot,
ClaudeBot, PerplexityBot, CCBot and the rest do not execute JavaScript. They
fetch bytes and parse them. The single loudest requirement for this site is
that an AI assistant can answer "who arranges celebrations in Bengaluru" with
Sambramo — and no configuration of a client-rendered app makes that possible.
Everything else here follows from that one fact.

So: zero `<script>` tags on content pages, enforced by `check-html.mjs`, which
is what makes `script-src 'none'` safe to ship in `vercel.json`. The one
exception is `api/interest.js`, a single serverless function behind a plain
`<form method="post">` that works with scripting disabled.

**A custom generator rather than Astro or Eleventy.** Not because they are bad
— Eleventy in particular would have been a fair choice — but because their
ergonomic path is Markdown content collections, and the moment content lives
in Markdown it is a hand-maintained copy of `EVENT_DATA` that drifts. This
generator reads the real files. It also lets the build FAIL on an invented
review or an unverifiable superlative, which a framework cannot do.

**Hand-written CSS rather than Tailwind.** The app's `tailwind.config.js` is
tuned for a 430px shell and carries six colour ramps this site never draws.
Its *values* transfer perfectly as custom properties; its *utilities* do not.
`styles/tokens.css` transcribes the palette, and `check-drift.mjs` hashes
`tailwind.config.js` so a palette change fails the build rather than leaving
the site quietly off-brand.

---

## The two-stage content pipeline

Vercel builds with Root Directory `site`, so `../src` is not uploaded and
`build.mjs` cannot read it. Same problem `api/_lib/pricing.bundle.js` has at
the repo root, and the same answer: **commit the extract, gate it for
staleness.**

| Step | Runs | Does |
|---|---|---|
| `scripts/pull-content.mjs` | local / CI | esbuild-bundles `../src/**` via `scripts/lib/loadSrc.mjs`, writes ten narrow projections into `content/` plus `_stamp.json` |
| `build.mjs` | **Vercel** | `content/*.json` → `dist/`, plus sitemap, robots, llms.txt, llms-full.txt |
| `scripts/check-drift.mjs` | local / CI | re-hashes the sources, fails if the snapshot is stale |

`pull-content.mjs` must go through esbuild rather than plain `import()`:
`src/config/sambramo.js:3` is `import { LIVE_CITIES } from './cities'`,
extensionless, which Vite resolves and Node's ESM resolver refuses.

**Do not enable Vercel's "Include source files outside the Root Directory".**
It uploads 100+ MB per deploy and couples this site's deploy health to the
app's source compiling.

---

## Things that are deliberate and look like omissions

- **No reviews, ratings, testimonials or vendor counts.** Sambramo has no
  customers. `check-jsonld.mjs` fails the build if `aggregateRating`,
  `review`, `ratingValue` or `reviewCount` appears anywhere. See
  `src/components/layout/EventFooter.jsx:27-33`.
- **No `PostalAddress` in schema.** `src/config/legal.js` has
  `registeredAddress: null`. An invented business address is the fastest route
  to a suspended Google Business Profile. It starts emitting automatically the
  day `legal.json` has one.
- **No `WebSite.SearchAction`.** There is no `/search/` endpoint, so declaring
  one would be a false statement in structured data.
- **No `Offer` on service pages.** `eventServicesData.js` calls its own
  `priceMin`/`priceMax` "researched India market-rate ESTIMATES". They are
  shown on the page, captioned as indicative, and kept out of schema. The tier
  `coordinationFee` figures are product facts, so those *do* get a
  `PriceSpecification`.
- **Bengaluru only.** `src/config/cities.js` still has Mysore `live: true` and
  `BRAND.pilotCities` derives from it, so `pull-content.mjs` uses its own
  allowlist and `check-claims.mjs` treats Mysore and Mysuru as banned coverage
  terms. A content refresh cannot quietly put a second city back.
- **`BRAND.descriptor` is not used.** It reads "India's human-assisted
  concierge celebration service"; `sambramo.js` itself documents why "India's"
  was removed from the other category lines. `SITE_DESCRIPTOR` in
  `pull-content.mjs` replaces it.
- **The tier `royal_mysuru` renders as "Arasu Vaibhava".** It is a size
  metaphor, not a coverage claim, but it appeared in the footer of all 153
  pages. The tier already carried that Kannada name; nothing was invented.
- **No link to `sambramoh.vercel.app`.** Neither app has shipped. Every call
  to action is a waitlist.

---

## The waitlist

Two audiences, two existing tables, one function.

| Page | Writes to |
|---|---|
| `/waitlist/` | `city_interest_requests` (migration 020) |
| `/for-partners/join/` | intended for `partner_market_interest` (migration 121) |

`api/interest.js` uses the **anon** key, not the service role: migration 020
already grants anon INSERT with admin-only SELECT, so the anon key can write
and cannot read. A service-role key would bypass every RLS policy in the
database from the most publicly reachable surface the company owns.

**`db/130_a_waiting_list_needs_a_name.sql` must be applied by hand** in the
Supabase SQL editor before the form can capture anything. Additive and
nullable, so the app's own `CityInterestForm.jsx` keeps working untouched.

---

## Deploying

Second Vercel project, same repo. Root Directory `site`, Framework `Other`,
Build `node build.mjs`, Output `dist`, Production Branch `site/www`, Node 22.

Root Directory `site` means the repo-root `vercel.json` is never parsed — so
the app's SPA rewrite does not turn all 153 pages into the app shell, and the
`/api/dispatch-waves` cron is not duplicated. **Check Settings → Cron Jobs on
the new project shows none.**

Ignored Build Step on `sambramo-www` — note the polarity, it is inverted from
intuition and getting it backwards is the commonest mistake:
**exit 0 CANCELS, exit 1 PROCEEDS.**

```bash
bash -c 'if [ "$VERCEL_GIT_COMMIT_REF" = "site/www" ]; then exit 1; else exit 0; fi'
```

And on the existing `sambramoh` project, so pushes here never trigger an app
build:

```bash
bash -c 'case "$VERCEL_GIT_COMMIT_REF" in site/*) exit 0 ;; *) exit 1 ;; esac'
```

Environment: `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Nothing else.

Also check **Settings → Firewall** is not blocking AI bots. Vercel's managed
bot ruleset will 403 GPTBot while `robots.txt` says yes, and nothing will tell
you.

---

## Verifying

```bash
npm run check                                    # all five gates
npm run serve

# The test that decides the whole project: content present without JS.
curl -s -A "…GPTBot/1.1…" https://sambramo.com/occasions/wedding/ | grep -c Sambramo

node scripts/shoot-page.mjs / shots/home.png --desktop
node scripts/shoot-page.mjs /occasions/wedding/ shots/w-nojs.png --no-js
# The site ships no JS, so the --no-js shot must be identical. That is the proof.
```

One browser launch per route, sequential. This is a 3.9 GB box and the app's
own `scripts/shoot.mjs` records what happens otherwise.
