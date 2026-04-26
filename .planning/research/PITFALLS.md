# Pitfalls Research

**Domain:** Garden-planning gantt SPA (single-user, browser-only, localStorage)
**Researched:** 2026-04-26
**Confidence:** HIGH (domain pitfalls confirmed by official sources + community wisdom; verified for date-handling, USDA/frost-date semantics, Permapeople licensing, GitHub Pages SPA routing, iOS Safari quirks)

---

## Critical Pitfalls

These cause rewrites, "core math is wrong" disasters, or destroy user trust.

### Pitfall 1: Conflating USDA Hardiness Zone with Frost Dates

**What goes wrong:**
Engineer treats "USDA zone" as the primary input to the schedule engine and pulls frost dates from a zone-to-frost lookup table. Schedule is wrong by 2-4 weeks for many users — sometimes catastrophically wrong (recommends transplanting before last frost, killing tomatoes).

**Why it happens:**
USDA hardiness zones describe **average annual extreme minimum winter temperature** (perennial winter survival). They do NOT describe spring/fall frost timing. Two ZIPs in the same zone (e.g., coastal Oregon and inland Oregon both 8b) have wildly different frost dates because frost timing depends on spring/fall temperature patterns, geography, and microclimate — not winter minimums.

**How to avoid:**
- Treat USDA zone as a **separate** data field used only for "will this perennial survive winter here?" decisions
- Source frost dates from a **frost-date dataset** (NOAA climate normals, Old Farmer's Almanac scrape, or curated ZIP→frost CSV) that gives last spring frost + first fall frost directly
- Schedule engine takes `last_frost_date` and `first_frost_date` as primary inputs, never `zone`
- If using a third-party frost API, verify it's NOAA-derived, not zone-derived

**Warning signs:**
- A function named `getZoneFrostDates(zone)` or a table mapping zone → frost dates
- Two users in the same zone but different climates getting identical schedules
- "Frost date" varies only with hardiness zone in the test fixtures

**Phase to address:** Phase 2 — Schedule engine / data sourcing. Lock the data model so `frost_dates` and `zone` are independent fields with independent sources before any engine code is written.

---

### Pitfall 2: Off-by-One Errors in "Weeks Before Last Frost" Math

**What goes wrong:**
Indoor seed-start dates land a week early or late. Compound errors cascade through harden-off → transplant → first harvest. User loses a season.

**Why it happens:**
Multiple subtle issues converge:
1. `subWeeks(lastFrost, 6)` interprets weeks differently across libraries (some use 7-day intervals, some calendar weeks).
2. Inclusive vs exclusive bounds: "6 weeks before last frost" — is the start date day 0 or day -42?
3. JavaScript `Date` arithmetic with DST: subtracting 42 days that cross a DST boundary yields a date 1 hour off, which when formatted to `YYYY-MM-DD` in local time can flip to the previous/next day.
4. UTC vs local: `new Date('2026-04-15')` is parsed as UTC midnight — in PT this becomes Apr 14 at 5pm.

**How to avoid:**
- Use **`Temporal.PlainDate`** (or polyfill via `@js-temporal/polyfill`) for all garden dates — no time, no timezone, no DST surprises
- Define one canonical helper: `daysBeforeFrost(frostDate: PlainDate, days: number): PlainDate`
- All "weeks before X" math goes through `days` (multiply by 7 explicitly) — no `subWeeks` from any library
- Unit test the schedule engine with fixtures that span DST boundaries (March + November in US), leap years, and year-rollover (fall crops scheduled in following calendar year)
- Never use `new Date('YYYY-MM-DD')` — use `Temporal.PlainDate.from('YYYY-MM-DD')` or library equivalent

**Warning signs:**
- Any use of `new Date(string)` in the schedule engine
- Tests pass in summer but fail when run in March (after spring DST)
- Dates display correctly in dev (Pacific time) but shift by a day for users in UTC+ timezones
- User opens app at 11pm and the schedule shifts overnight

**Phase to address:** Phase 1 — Foundations. Lock the date primitive (Temporal or wrapper) and the "no `new Date(string)`" rule before any business logic.

---

### Pitfall 3: localStorage Data Loss = Lost Garden Plan

**What goes wrong:**
User spends an hour building a 30-plant succession plan. They clear browser data, switch to private mode, hit a quota limit, or open in iOS Safari Private Browsing. Plan is gone forever, no recovery, no backup. They never come back.

**Why it happens:**
- localStorage is **not durable** — users (and browsers) clear it routinely
- iOS Safari Private Browsing: localStorage exists but writes throw `QuotaExceededError` (quota = 0)
- 5-10 MB quota across origin — a busy plan + plant cache could hit this
- No multi-tab consistency by default
- "It's just my hobby garden app" mental model means users don't think to back up

**How to avoid:**
- Implement **autosave + autoexport** strategy: every save writes to localStorage AND offers a `Download backup` toast every N edits or on each session-end
- **Detect storage availability** at boot: try `setItem('__test', '1'); removeItem('__test')` in a try/catch. If it throws, render a banner: "Storage is unavailable (private mode?). Your plan won't persist. Export to JSON often."
- Use **IndexedDB** for the primary plan store (50%+ of disk available, async, robust) and localStorage only for small UI state (preferences). The 5 MB limit is real and easy to hit with full plant catalogs cached client-side. Wrap with a tiny library like `idb-keyval` to keep the DX simple.
- **Storage event listener** for cross-tab sync: when one tab edits, others reload from storage
- Show "last saved" timestamp prominently — establishes the user's mental model that this is local
- Onboarding includes "Your plan lives in this browser. Export to JSON to back up."

**Warning signs:**
- No try/catch around `localStorage.setItem`
- No "export your plan" CTA visible without digging into a menu
- App boots and immediately writes — no availability check
- Single tab assumption (no `storage` event listener)

**Phase to address:** Phase 1 — Foundations. Persistence layer with availability detection, IndexedDB wrapper, and export-encouragement UX must be in place before any feature builds on it.

---

### Pitfall 4: Schema Migrations Break Saved Plans

**What goes wrong:**
v1 ships, user saves a plan. v1.1 changes the data model (renames a field, splits a structure). User opens app, gets a blank canvas or a crash. They lose trust — "this app deletes my data on update."

**Why it happens:**
No migration system in place. Saved JSON has no version field. Old data shapes silently mis-deserialize.

**How to avoid:**
- Every persisted blob (localStorage AND export JSON) has a **`schemaVersion` field** from day 1
- Build a `migrations[]` array of pure functions: `(oldData) => newData`. On load, run all migrations from `oldData.schemaVersion` to current.
- Migration functions are **never deleted**, only added — old exports must always import
- Test fixture: keep at least one saved plan from each version checked into the repo, run import tests against all of them
- When in doubt, never break a field — add a new one and deprecate

**Warning signs:**
- No `version` or `schemaVersion` field in saved JSON
- Schema changes don't trigger a migration code review
- No test that loads an old fixture and verifies it parses

**Phase to address:** Phase 1 — Foundations. Schema versioning and migration framework before any data is persisted.

---

### Pitfall 5: Cascade-on-Drag Surprises (User Drags One Bar, Three Move)

**What goes wrong:**
User drags transplant bar 5 days later. Indoor-start, harden-off, AND first-harvest all jump unexpectedly. User undoes (no undo!), rage-quits, tells nobody about the app.

**Why it happens:**
The cascade is the feature, but with no preview, no explanation, and no undo, it feels like the app is "messing with their plan." Constraint-based reflow is unintuitive without affordances.

**How to avoid:**
- **Drag preview**: show ghost bars for all affected events during drag (not just the dragged one). User sees the cascade before they commit.
- **Per-event lock toggle**: pin an event to opt out of cascade. UI surfaces locked events visually (chain icon).
- **Mandatory undo/redo**: command-pattern history with at least 50 levels. Cmd/Ctrl-Z must work. This is non-negotiable for any drag UI.
- **Cascade explanation tooltip**: hover an affected event during drag — show "Linked to transplant — moves with it because plant needs 4 weeks indoor before transplant."
- **Constraint conflict UI**: if user tries to drag transplant before last frost for a frost-tender plant, snap-back with a clear "Can't transplant tomato before May 15 (last frost). Override?" — never silently refuse.

**Warning signs:**
- No undo/redo
- Drag commits immediately with no preview
- No visual indication of which events are linked
- Constraint violations either silently fail or silently succeed

**Phase to address:** Phase 4 — Gantt interactions. Cascade UX is where the app earns or loses recommendations.

---

## Date / Time Pitfalls

### Pitfall 6: Timezone Shift Makes Dates Display Off by One Day

**What goes wrong:**
User in PT enters last-frost as April 15. App stores `new Date('2026-04-15')` (parsed as UTC midnight). When formatted with default `toLocaleDateString` in PT, it renders as "April 14." User says "the app changed my date."

**Why it happens:**
ISO date strings without time are parsed as UTC by JS `Date`. Any user west of UTC sees the previous day when formatted in local time.

**How to avoid:**
- Use `Temporal.PlainDate` everywhere (date-only, no zone) — see Pitfall 2
- If using strings, **never** mix them with `Date` objects. Treat `'YYYY-MM-DD'` as opaque, format with explicit locale-aware date-only formatter
- Lint rule / grep: ban `new Date(` outside one allowed wrapper module

**Warning signs:** Schedule looks correct in dev, wrong in production for users in different timezones. Dates flip overnight when local clock crosses UTC midnight.

**Phase to address:** Phase 1 — date primitive choice locks this in.

---

### Pitfall 7: DST Transitions Drop or Add an Hour to "X Days Before"

**What goes wrong:**
Schedule engine subtracts 42 days from last-frost date using `Date` arithmetic. The 42-day window crosses spring DST. Result is off by 1 hour, which when truncated to date becomes off by one day for users in some timezones.

**Why it happens:**
JS `Date` is millisecond-based. `setDate(getDate() - 42)` on a `Date` near a DST boundary does the wrong thing because the day length isn't 24 hours on the boundary.

**How to avoid:** Same fix as Pitfall 2 — `Temporal.PlainDate` doesn't have hours. Or use `date-fns`'s `subDays` with date-only awareness, but Temporal is cleaner.

**Phase to address:** Phase 1.

---

### Pitfall 8: Year-Rollover for Fall/Winter Crops

**What goes wrong:**
User in zone 9 plans garlic (planted October, harvested July of *next* year). Schedule engine assumes single calendar year, garlic harvest displays as July of the same year — so it shows up *before* planting on the gantt.

**Why it happens:**
Naive engine: "season = current year." Multi-year crops aren't handled.

**How to avoid:**
- Schedule engine works in **plain dates anchored to season**, not calendar year
- `Season` model: `{ startDate: PlainDate, endDate: PlainDate }` where end can be in the following year
- Garlic and other overwintering crops have a `crosses_year: true` flag in the catalog
- Gantt timeline X-axis is "season window" not "Jan-Dec"
- Test fixture: garlic plan starting Oct 2026, harvesting Jul 2027

**Warning signs:** Engine code uses `getFullYear()` or `setYear`. UI labels show "2026" hardcoded. Garlic test fixture missing.

**Phase to address:** Phase 2 — Schedule engine.

---

### Pitfall 9: "Date" vs "Datetime" Confusion in the Data Model

**What goes wrong:**
Some events stored as full `Date` objects with random times (whenever the user clicked). Sorting/comparison across events becomes flaky. Two events on "the same day" don't equal each other.

**Why it happens:**
Default JS Date is a datetime. Without discipline, time creeps in.

**How to avoid:**
- **Type-level enforcement**: schedule events use `PlainDate` (or branded type `GardenDate`) — TS won't let you assign a `Date` to it
- Tasks-with-time (e.g., "water at 6pm") are a separate `dueAt: ZonedDateTime` field, distinct from `dueDate: PlainDate`
- All comparisons use `PlainDate.compare()` — never `>`/`<` on `Date`

**Phase to address:** Phase 1.

---

## Garden-Domain Pitfalls

### Pitfall 10: Microclimate Variance Within a ZIP Code

**What goes wrong:**
User in San Francisco hill neighborhood enters their ZIP. App says "last frost: Feb 1." Their actual last frost (foggy hilltop) is March 15. They lose seedlings.

**Why it happens:**
ZIP codes span large areas with dramatic microclimates. Dataset gives one number per ZIP.

**How to avoid:**
- **Be explicit about precision**: UI shows "Estimated last frost: Apr 15 (typical for ZIP 12345). Your actual frost may vary by 2-3 weeks based on elevation and microclimate."
- Allow user to **override** the frost date manually (with a "auto from ZIP" toggle)
- Surface a frost-confidence input (10%/50%/90% — see next pitfall)

**Warning signs:** UI presents frost date as a single authoritative number with no caveats. No manual override.

**Phase to address:** Phase 2 — frost-date sourcing UX.

---

### Pitfall 11: Frost-Date Statistical Confidence Confusion (10% / 50% / 90%)

**What goes wrong:**
NOAA frost-date data comes with probability bands: "10% chance of frost after this date" (aggressive), "50%" (typical), "90%" (conservative). App picks one (often 50%) and presents as "the" frost date. Risk-averse users plant by it and lose plants in cold years.

**Why it happens:**
The dataset has multiple values; the UI surfaces one without explanation.

**How to avoid:**
- Store all three bands per ZIP
- Default to 50% but offer a "Risk tolerance" preference: Aggressive (10%) / Typical (50%) / Conservative (90%)
- Frost-tender plants (tomato, basil) auto-default to 50% or 90% — never aggressive
- Tooltip: "There's a 50% chance your last spring frost falls before this date — half the years you'll be safe, half you'll see a late frost."

**Warning signs:** Single frost date per ZIP in the dataset. No "risk" preference.

**Phase to address:** Phase 2.

---

### Pitfall 12: Frost-Tender vs Cold-Hardy Plants Need Different Transplant Rules

**What goes wrong:**
Engine applies "transplant on last frost date" universally. Lettuce (cold-hardy) gets transplanted way too late; tomato (frost-tender) gets transplanted on the actual frost date and dies.

**Why it happens:**
"Last frost" is the anchor for the schedule engine, but different plants want different offsets from it.

**How to avoid:**
- Catalog field: `frost_tolerance: 'tender' | 'half-hardy' | 'hardy' | 'very-hardy'`
- Engine uses tolerance to pick offset:
  - `tender` → transplant 1-2 weeks AFTER last frost
  - `half-hardy` → transplant ON last frost
  - `hardy` → transplant 2-4 weeks BEFORE last frost
  - `very-hardy` → transplant 4-6 weeks BEFORE last frost (or as soon as soil workable)
- Per-plant `transplant_offset_days` overrides the tolerance default

**Warning signs:** Catalog has no frost tolerance field. All plants have the same transplant offset.

**Phase to address:** Phase 2 — catalog schema + engine.

---

### Pitfall 13: Days-to-Maturity Is Variety-Specific (Not Plant-Species-Specific)

**What goes wrong:**
Catalog has one entry for "Tomato" with `days_to_maturity: 75`. User plants Roma (75 days) — works. User plants Brandywine (90 days) — harvest predicted 2 weeks too early; they lose their first-frost window for ripening.

**Why it happens:**
Averaging across varieties hides 30%+ variance. Permapeople and other databases often have variety-level entries; catalog flattens.

**How to avoid:**
- Catalog supports **variety as first-class**: parent = "Tomato" (species-level metadata), children = varieties with their own DTM
- User picks a variety; if they don't know, default to "Generic Tomato" with a clear caveat: "Days to maturity varies by variety — choose a specific one for accuracy"
- Custom plants always require DTM (no default that hides ignorance)

**Warning signs:** Catalog flat list with one entry per crop. No variety dropdown when picking a plant.

**Phase to address:** Phase 2 — catalog data model.

---

### Pitfall 14: Indoor Seed-Starting Is a Window, Not a Date

**How to avoid:**
"Start tomato indoors 6-8 weeks before last frost" is a range. Engine that picks a single date misses early-bird vs cautious planting strategies.

**What goes wrong:**
User can't see flexibility. They want to start a week earlier than the recommendation but the gantt shows one fixed bar.

**How to avoid:**
- Catalog stores `weeks_indoor_before_last_frost: { min: 6, max: 8 }` as a range
- Gantt renders the indoor-start as a **shaded window**, with a primary marker at midpoint (or user preference: early/typical/late)
- Drag operates on the marker; window stays visible

**Warning signs:** Single integer for indoor weeks. Gantt bars are point-in-time only, no ranges.

**Phase to address:** Phase 3 — gantt rendering + Phase 2 catalog.

---

### Pitfall 15: Hardening-Off Period Missing from the Schedule

**What goes wrong:**
Engine produces: indoor-start → transplant → harvest. User does no hardening off, transplants seedlings directly outdoors, loses them to wind/sun shock. App's schedule contributed to the failure.

**Why it happens:**
Hardening off is "common knowledge" to experienced gardeners and easy to leave out of an event model focused on "planting milestones."

**How to avoid:**
- Schedule engine emits a **`harden_off`** event type, default 7-14 days before transplant
- Visible bar on gantt with task list ("Day 1: 1hr shade", "Day 4: 4hr partial sun", etc.)
- Default ON for any plant with `requires_hardening: true` (essentially all indoor-started plants)
- Tied to transplant — moves with cascade

**Warning signs:** Event types include `indoor_start`, `transplant`, `harvest` — no `harden_off`. No "harden off" task templates.

**Phase to address:** Phase 2 — schedule engine event types.

---

### Pitfall 16: Photoperiod-Sensitive Crops (Onions, Etc.) Bulb Wrong by Latitude

**What goes wrong:**
User in zone 9 Florida (28°N latitude) plants Walla Walla long-day onion. Walla Walla needs 14-16 hours of daylight to bulb. Florida summer max is ~13 hours. Onions never bulb. User gets green onions instead.

**Why it happens:**
Photoperiod (day length) is determined by **latitude**, not zone or frost date. Schedule engine using only frost-date inputs cannot model this.

**How to avoid:**
- Catalog has `photoperiod: 'short-day' | 'intermediate' | 'long-day' | 'day-neutral'` for relevant crops
- User's latitude derived from ZIP (separate field from zone/frost)
- Engine warns at plant-add time: "Long-day onions don't bulb well below 37°N latitude. You're at 28°N — pick short-day instead." Suggest alternatives.
- Don't try to schedule something that won't work — guide the user away

**Warning signs:** No `photoperiod` field in catalog. No latitude derived from ZIP. No incompatibility warnings at plant selection.

**Phase to address:** Phase 2 — catalog schema. Phase 3 — plant-selection UX.

---

### Pitfall 17: Succession-Planting Interval vs DTM Confusion

**What goes wrong:**
User wants 4 successions of lettuce. Engine spaces them by DTM (50 days) so they all mature back-to-back — but the user wanted continuous *fresh* harvest, not successional batches starting at maturity. Or the opposite: spaces by 14-day intervals when crop has 60-day DTM, so user has 5 simultaneous crops at the same maturity.

**Why it happens:**
Two different concepts:
- **Succession interval** = how often you plant a new batch (e.g., every 2 weeks)
- **DTM** = how long until that batch matures
Engineers conflate them.

**How to avoid:**
- Catalog has both: `succession_interval_days` (typical: 14-21) AND `days_to_maturity`
- Engine clearly separates: succession plantings are spaced by `interval`, each gets its own DTM-derived harvest
- UI explains: "Plant every 14 days — each batch matures in 50 days, giving continuous harvest from day 50 to day 64+ of first planting"

**Warning signs:** Single `interval` field used for both. Successions visualized as same-mature with no overlap.

**Phase to address:** Phase 2 — schedule engine.

---

## localStorage / Persistence Pitfalls

### Pitfall 18: iOS Safari Private Browsing Silently Breaks the App

**What goes wrong:**
User opens app in iOS Safari Private mode. localStorage exists (typeof check passes) but writes throw `QuotaExceededError`. App crashes or silently fails to save.

**How to avoid:**
- Boot-time storage check: try `setItem('__test', '1')` in try/catch. If it fails, set app state to `storageUnavailable: true` and render a banner.
- Make export/import work even without storage — user can paste JSON in/out
- Render a warning banner explaining the situation when storage is unavailable

**Warning signs:** No try/catch around setItem. App doesn't differentiate "storage unavailable" from "no data yet."

**Phase to address:** Phase 1.

---

### Pitfall 19: Multi-Tab Race Conditions Corrupt the Plan

**What goes wrong:**
User opens app in two tabs. Edits in tab A, edits in tab B. Last write wins, half the changes are gone.

**How to avoid:**
- Listen to `storage` event in every tab; on change, reload state from storage
- On focus, reload — don't trust in-memory state if tab was backgrounded
- Lock per-edit: timestamp last write; if incoming change has older timestamp, refuse and prompt to reload
- Easier: use `BroadcastChannel` for active tab coordination

**Warning signs:** No `storage` event listener. App opens with stale data when you switch tabs.

**Phase to address:** Phase 1.

---

### Pitfall 20: Export/Import Format Lacks Versioning, Can't Round-Trip Across Releases

**What goes wrong:**
User exports plan from v1.0. App updates to v1.5 with new schema. They re-import — silent data loss or crash.

**How to avoid:**
- Export JSON includes `appVersion`, `schemaVersion`, `exportedAt` at the top
- Import flow runs schema migrations (same migration array as Pitfall 4) before applying
- Surface conflicts: "This plan is from v1.0. We've migrated it to v1.5. Some fields were updated. Review before saving."
- Reject exports newer than current app version with a clear error

**Warning signs:** Export has no version field. Import silently overwrites.

**Phase to address:** Phase 1 — same persistence work as Pitfall 4.

---

### Pitfall 21: Corrupt JSON Import Crashes the App

**What goes wrong:**
User edits export JSON by hand or has a partial download. Import wipes their existing plan with a half-valid structure, or crashes on parse.

**How to avoid:**
- Wrap `JSON.parse` in try/catch with friendly error
- **Validate** with a schema validator (Zod, Valibot) before applying
- Import flow: parse → validate → migrate → preview diff → user confirms → apply
- **Never** overwrite the existing plan until user confirms — keep an undo snapshot for at least one session

**Warning signs:** Direct `JSON.parse` + assign. No schema validation. No preview before import.

**Phase to address:** Phase 1.

---

## Gantt UX Pitfalls

### Pitfall 22: No Drag Affordance — Users Don't Know They Can Drag

**What goes wrong:**
User stares at the gantt for 30 seconds, never tries to drag. App's killer feature goes undiscovered.

**How to avoid:**
- Hover state on bars shows draggable cursor (`grab`) and visible drag handles (small grip icon on left/right edges)
- First-run tooltip on the first bar: "Drag to adjust. Linked events update automatically."
- "Undo last change" button visible immediately after first edit (reinforces it's safe)

**Phase to address:** Phase 4 — gantt UX.

---

### Pitfall 23: Resize vs Move Ambiguity on Bar Drag

**What goes wrong:**
User drags the middle of a bar to move it; sometimes the app interprets as resize. Or drags an edge intending resize, app moves instead. Frustrating.

**How to avoid:**
- Distinct interaction zones with cursor changes:
  - Edges (left/right ~8px): `ew-resize` cursor → resize
  - Middle: `move` cursor → move
- Visible affordance (grip icons on edges)
- Touch: long-press in middle = move; pinch on edges = resize (or use explicit handles)

**Phase to address:** Phase 4.

---

### Pitfall 24: Snap-to-Day vs Snap-to-Week Ambiguity

**What goes wrong:**
User drags bar 3 days. App snaps to the nearest week, jumping by 4 days. User thinks the app is broken.

**How to avoid:**
- Default snap: **day**. Garden timing rarely benefits from week-snap.
- Snap setting in preferences (day / 3-day / week) — but day is default
- Show snap preview during drag: ghost line at where it'll land

**Phase to address:** Phase 4.

---

### Pitfall 25: Touch / Mobile Drag Conflicts with Page Scroll

**What goes wrong:**
On mobile, dragging a bar sometimes scrolls the page instead. Or scrolling to see more crops triggers drag. UX is broken on phones.

**How to avoid:**
- Use a drag library that handles touch correctly (`@dnd-kit/core` is the current de-facto standard, `react-dnd` is legacy)
- Drag only initiates after a long-press threshold (250-500ms) or from a dedicated handle on mobile
- During drag, prevent default touch scroll; outside drag, allow scroll
- Test on actual phones, not just devtools — touch events differ

**Phase to address:** Phase 4.

---

### Pitfall 26: 200+ Events on the Gantt Tank Performance

**What goes wrong:**
User adds 50 plantings × 4 successions = 200 events. App lags on every drag, scroll, and re-render.

**How to avoid:**
- **Virtualize** the gantt rows (only render visible). `react-virtuoso` or `@tanstack/react-virtual`.
- During drag, only re-render the actively dragged row + its dependents — not the whole timeline
- Memoize event computations; recompute only when frost date or plant changes
- Set perf budget: 60fps drag with 200 events. Test with synthetic 200-event fixture before shipping.

**Warning signs:** No virtualization. Every drag re-renders all rows. No perf test fixture.

**Phase to address:** Phase 4.

---

## Plant-Data Pitfalls

### Pitfall 27: Permapeople API Outage / Schema Drift Breaks the Whole App

**What goes wrong:**
Permapeople API goes down or changes schema. App can't load any plants. Users see a blank catalog.

**How to avoid:**
- **Curated catalog is primary**, Permapeople is enrichment-only — never required for core flow
- Cache Permapeople responses to localStorage/IndexedDB indefinitely; treat as best-effort
- App boot succeeds with curated catalog only; Permapeople fetch is async + non-blocking
- Show "couldn't reach extended plant DB — using local catalog" toast, not a crash
- Schema validate every Permapeople response (Zod) — discard invalid rows rather than crash

**Phase to address:** Phase 2 — catalog architecture.

---

### Pitfall 28: Permapeople CC BY-SA 4.0 Attribution Not Implemented

**What goes wrong:**
Permapeople data licensed CC BY-SA 4.0 — requires attribution AND share-alike. App doesn't credit Permapeople; doesn't license its own derivative data CC BY-SA. Legal exposure, plus violation of explicit Permapeople community ask.

**How to avoid:**
- Footer link: "Plant data partially from [Permapeople](https://permapeople.org)" on every page
- On any plant card showing Permapeople data, attribute inline: "Source: Permapeople (CC BY-SA 4.0)"
- LICENSE notes that exported user plans containing Permapeople-derived data inherit CC BY-SA 4.0
- README documents this and the dual-licensing situation
- **Verify Permapeople terms before commercial use** — their ToS state non-commercial only without explicit permission

**Warning signs:** Footer doesn't mention Permapeople. Plant cards don't show data source. README silent on data licensing.

**Phase to address:** Phase 2 — when Permapeople integration ships.

---

### Pitfall 29: Curated Catalog Goes Stale ("Last Updated 2018")

**What goes wrong:**
Curated catalog ships with v1, never updated. Two years later, varieties are outdated, climate-shift adjustments missing, user trust erodes.

**How to avoid:**
- Catalog is a versioned JSON file checked into the repo
- Catalog has a `lastReviewed: '2026-04'` field, displayed in plant card
- Maintenance schedule: reviewed each spring (annual), recorded in CHANGELOG
- Community contributions encouraged via PRs — schema validation in CI

**Phase to address:** Phase 2 — catalog. Followed by ongoing maintenance commitment.

---

### Pitfall 30: Custom Plants with Bad/Missing Timing Data Crash the Engine

**What goes wrong:**
User adds custom "Mystery Squash" with no DTM. Engine divides by zero or produces NaN dates. Whole gantt breaks.

**How to avoid:**
- Custom plant form **requires** DTM, frost tolerance, and indoor-start window before saving
- Schedule engine guards every input: missing field → produce a "needs data" event placeholder, never crash
- Validation at save and at engine entry (defense in depth)

**Phase to address:** Phase 2 — engine + custom plant form.

---

### Pitfall 31: Unit Confusion — cm/in, F/C, Dates in DD/MM vs MM/DD

**What goes wrong:**
Permapeople returns plant spacing in cm. App displays as "12" (with no unit) or assumes inches. User plants 12 inches apart instead of 12 cm.

**How to avoid:**
- All numeric fields stored with unit metadata: `{ value: 30, unit: 'cm' }`
- Display layer converts to user's preferred unit (with preference UI)
- Default unit derived from locale (US → in/F, EU → cm/C)
- Date format: always show with explicit format `Apr 15` (locale-aware month name) — never bare `04/15` (ambiguous internationally)

**Phase to address:** Phase 2 — data model. Phase 3 — display.

---

## Polish / Share-Worthy Pitfalls

### Pitfall 32: Hostile Empty State on First Visit

**What goes wrong:**
First-time user lands on a blank gantt. No idea what to do. Bounces immediately.

**How to avoid:**
- Onboarding flow: step 1 ZIP, step 2 pick from "Starter pack" (10 common plants pre-selected), step 3 see gantt
- Skippable but recommended
- Empty state shows screenshot/illustration of what the app does + a clear "Start with my ZIP" CTA
- Never present blank app to a first-time user

**Phase to address:** Phase 5 — onboarding & polish.

---

### Pitfall 33: Mobile Gantt Is Unusable

**What goes wrong:**
Gantt designed desktop-first. On mobile, bars are 4px tall, drag is impossible, scrolling is fighting.

**How to avoid:**
- On narrow viewports, **switch to a different view** by default: list-of-events grouped by month, or simplified single-plant-zoom view
- Gantt remains available on mobile but hidden behind a "see full timeline" CTA, with rotation prompt
- Touch targets ≥44px
- Test on real phone, in landscape and portrait
- Calendar view is the mobile-friendly fallback

**Phase to address:** Phase 5 — responsive design.

---

### Pitfall 34: Print/PDF Output Not Considered — Gardeners Want Paper Plans

**What goes wrong:**
User wants to take their plan to the garden, print it. Hits Cmd-P, gets a half-rendered gantt with sidebar cut off.

**How to avoid:**
- `@media print` CSS that hides chrome (header, sidebar, controls)
- Print-optimized layout: simplified gantt + table of events with dates and tasks
- Test in browser print preview each milestone
- "Export to PDF" option (use `print()` or `react-to-print`)

**Phase to address:** Phase 5 — polish.

---

### Pitfall 35: Accessibility Treated as Afterthought (Especially Drag)

**What goes wrong:**
Keyboard-only or screen-reader user can't operate the gantt. Project becomes uninstallable for them.

**How to avoid:**
- Every drag interaction has a **keyboard equivalent**: focus a bar, arrow keys to nudge by day, Enter to commit
- Screen reader: events expose name, date, dependencies via ARIA labels
- `@dnd-kit` has built-in keyboard sensor — use it
- Calendar view is the more accessible default for SR users
- Color contrast on gantt bars meets WCAG AA — don't rely on color alone for status

**Warning signs:** No keyboard nav for drag. ARIA labels missing. Tab key skips the gantt entirely.

**Phase to address:** Phase 4 (drag a11y) + Phase 5 (audit).

---

### Pitfall 36: No Sharing Mechanism Beyond JSON Export

**What goes wrong:**
User wants to send their plan to a gardening friend. JSON file is technical-feeling and uninvestable. Friend never imports.

**How to avoid:**
- "Share plan" button → URL-encode plan into a fragment hash (`#plan=<base64-zstd-encoded-json>`)
- For plans too large for URL: copy to clipboard + paste-import dialog
- Friend opens URL → app pre-loads the shared plan into a "preview" mode (read-only) → "Import to my plan" CTA
- Documents that this isn't multi-user collab — it's a one-shot snapshot

**Phase to address:** Phase 5 — polish (this is "share-worthy v1" stretch).

---

## Static-Site Deployment Pitfalls

### Pitfall 37: GitHub Pages 404 on Hard Refresh of Sub-Routes

**What goes wrong:**
App uses client-side routing (`/plan/123`). User refreshes — GitHub Pages looks for a `/plan/123/index.html`, doesn't exist, returns 404.

**How to avoid:**
- During build, copy `index.html` → `404.html`. GitHub Pages serves `404.html` for unknown paths; SPA boots and router resolves.
- Or use **hash routing** (`/#/plan/123`) which sidesteps the issue entirely — recommended for this single-user app since SEO is irrelevant
- Document the choice in README

**Warning signs:** Hard refresh on a non-root path 404s in production.

**Phase to address:** Phase 6 — deployment.

---

### Pitfall 38: CDN Cache Serves Stale JS Bundles After Deploy

**What goes wrong:**
User visits app. CDN serves cached old `index.html` referencing old `app.abc123.js`. New deploy already wrote `app.def456.js` and removed old. App fails to load.

**How to avoid:**
- Build tool emits hashed asset names (Vite/Webpack default)
- `index.html` is **not** cached aggressively (Cache-Control: no-cache or short max-age)
- Hashed assets get long max-age (immutable)
- Service worker (if used) has skip-waiting + claim flow on update
- Add a version-check ping: "New version available — refresh"

**Phase to address:** Phase 6 — deployment.

---

### Pitfall 39: CORS Blocks Permapeople API in Browser

**What goes wrong:**
Direct browser calls to Permapeople API fail with CORS error. App can't fetch plant data.

**How to avoid:**
- **Verify** Permapeople sends CORS headers for browser origins — read their API docs first; if not, the integration approach changes fundamentally
- If CORS not allowed: proxy via a Cloudflare Worker / Netlify Function (cheap, free tier covers it)
- If CORS allowed: still cache aggressively (rate limits + offline support)
- Document the proxy in README; deployment instructions cover it

**Warning signs:** First Permapeople fetch in dev fails with CORS error and isn't a known issue. No proxy plan.

**Phase to address:** Phase 2 — Permapeople integration. **Verify before committing to Permapeople** (PROJECT.md flags this explicitly).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use `Date` instead of Temporal | Familiar API | Timezone bugs forever; expensive to refactor schedule engine | Never for a date-heavy app |
| Skip schema versioning ("we'll add it later") | Faster v1 | Every schema change after v1 is a migration disaster; users lose plans | Never |
| Use localStorage as primary store, not IndexedDB | Simpler API | 5MB ceiling, sync writes block UI, hard to add multi-key queries | Only for tiny plans (<50 events) and only if IndexedDB cost is real (it's not) |
| No undo/redo in drag UI | Save 1 day of dev | Users won't trust the app to drag; biggest feature feels scary | Never for this product |
| Hardcode frost dates per zone | Fast schedule engine v1 | Wrong for 30%+ of users; user trust destroyed when they catch the error | Only as a *fallback* when frost-date dataset lookup fails, with a warning |
| Permapeople as required dependency | Fewer plants to curate | Single point of failure; outage breaks app | Never — make it enrichment-only |
| Skip storage availability detection | Cleaner boot | iOS Safari Private Browsing crashes silently | Never |
| One-DTM-per-species (no varieties) | Simpler catalog | Wrong by 30%+ for varieties of the same species; harvest dates lie | Acceptable in MVP if catalog is small AND each entry is variety-specific (e.g., "Roma Tomato" not "Tomato") |
| Single calendar year assumption | Simpler engine | Garlic and overwintering crops break | Never for a v1 that wants gardener trust |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Permapeople API | Treating as required, not handling outage | Curated primary; Permapeople async enrichment with fallback |
| Permapeople API | Skipping CC BY-SA attribution | Footer + plant-card source label + LICENSE doc |
| Permapeople API | Direct browser fetch (CORS may block) | Verify CORS first; if blocked, deploy a Worker/Function proxy |
| ZIP-to-frost dataset | Using a zone-derived approximation | Use NOAA-derived dataset with last-spring/first-fall + confidence bands |
| ZIP-to-coordinates | Assuming all ZIPs map to one lat/long | Pick centroid; show user a "your microclimate may differ" caveat |
| GitHub Pages | Standard SPA routing fails on refresh | Hash routing OR `index.html → 404.html` build step |
| LocalStorage | No availability check at boot | try/catch a test write; fall back gracefully |
| LocalStorage | No `storage` event listener | Listen + reload state on cross-tab edits |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-render whole gantt on every drag tick | Stuttery drag, fan spins | Memoize rows; only re-render dragged + dependents | ~50 events |
| Unvirtualized gantt rows | Slow initial render, slow scroll | `react-virtuoso` or `@tanstack/react-virtual` | ~100 events |
| Recompute schedule on every state change | Type-lag, drag stutter | Memoize derived schedule; recompute only when inputs change | Any plan size |
| Synchronous `localStorage.setItem` on every keystroke | UI freezes briefly | Debounce writes (250-500ms); use IndexedDB async | High-frequency edits |
| Loading full Permapeople catalog upfront | Slow first paint | Lazy-load on plant search; keep curated catalog inline | Always (Permapeople has 10k+ plants) |
| Drag without `requestAnimationFrame` | Drag lags behind pointer | Use rAF or library that does (dnd-kit) | ~30 events |

---

## Security / Privacy Mistakes

Domain-specific issues for a single-user local-only app.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Importing JSON without schema validation | Malicious JSON could XSS via injected HTML in plant names | Zod-validate; sanitize string fields when rendering (React's default escaping helps but custom HTML rendering doesn't) |
| URL-encoded share links bloat the URL | Plan grows without bound; URL DoS | Cap encoded plan size; fall back to clipboard JSON if too big |
| Storing user ZIP in plain localStorage | Limited risk (it's their own browser) but ZIP is mildly PII | Document this in privacy notes; offer "anonymous mode" that drops ZIP after deriving frost dates |
| Permapeople API key (if required) committed to repo | Key leaked, abuse | Verify Permapeople's auth model — if API key needed, requires backend proxy. If anonymous, fine. |
| External plant images loaded from Permapeople CDN | CDN tracking pixels; broken images on outage | Self-host a thumbnail set OR use `loading="lazy"` + fallback placeholder |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Cascade with no preview | "App randomly moves my plants" | Ghost-bars during drag showing all affected events |
| No undo | "I'm scared to drag anything" | Cmd-Z works on every action; visible undo button after edits |
| Frost date shown without confidence | "App said it was safe and I lost my tomatoes" | Show 50% by default + "Risk tolerance" preference + tooltip explaining bands |
| One DTM number for "Tomato" | "Harvest predictions are off by 2 weeks" | Variety-level entries; require user to pick variety |
| No empty state for new users | First impression: blank canvas, bounce | Onboarding wizard: ZIP → starter plants → see gantt |
| Mobile gantt is desktop gantt at 320px | Unusable on phones | Different view on narrow viewports (calendar/list); gantt as opt-in |
| No print stylesheet | Plan unprintable for garden use | `@media print` simplified layout; "Export to PDF" |
| No keyboard nav for drag | Inaccessible for keyboard/SR users | Arrow keys nudge focused bar; Enter commits |
| Saving = "no feedback" | User doesn't trust persistence | "Saved 2s ago" timestamp; subtle toast on save |
| Implicit unit display | "Did the app mean cm or in?" | Always show unit; preference picker |

---

## "Looks Done But Isn't" Checklist

Things that appear complete in dev but reveal gaps when shipped.

- [ ] **Schedule engine:** Often missing year-rollover handling — verify with garlic test fixture (Oct → Jul next year)
- [ ] **Schedule engine:** Often missing photoperiod warnings — verify by adding a long-day onion at southern latitude
- [ ] **Frost-date logic:** Often confuses zone with frost date — verify two ZIPs in same zone get different schedules
- [ ] **Drag UX:** Often missing keyboard equivalent — verify Tab + Arrow keys can move bars
- [ ] **Drag UX:** Often missing undo — verify Cmd-Z reverts the last drag
- [ ] **Persistence:** Often missing storage-unavailable handling — verify in iOS Safari Private mode
- [ ] **Persistence:** Often missing schema migration — verify v0 export imports cleanly into v1+
- [ ] **Import:** Often missing validation — verify pasting random JSON produces a friendly error, not a crash
- [ ] **Permapeople:** Often missing attribution — verify footer + plant card credit + LICENSE doc
- [ ] **Permapeople:** Often missing fallback — verify app works fully with Permapeople fetch failing
- [ ] **Catalog:** Often missing variety distinction — verify each catalog entry is one variety, not "Tomato"
- [ ] **Frost dates:** Often missing confidence bands — verify UI surfaces 10/50/90% or has a risk pref
- [ ] **Gantt:** Often missing harden-off events — verify schedule for tomato includes harden-off bar
- [ ] **Gantt:** Often missing virtualization — verify 200-event plan stays at 60fps
- [ ] **Mobile:** Often unusable — verify on actual phone, not just devtools resize
- [ ] **Print:** Often broken — verify Cmd-P preview is usable
- [ ] **Empty state:** Often hostile — verify first-time user has a clear path forward
- [ ] **Deploy:** Often broken on hard-refresh — verify `/plan/123` reloads cleanly on GitHub Pages
- [ ] **Deploy:** Often stale — verify cache headers return fresh `index.html` after redeploy

---

## Recovery Strategies

When pitfalls land in production despite prevention.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Schedule engine math wrong (frost-date confusion) | HIGH | Push a "schedule recalculated" toast on next open; run migration that regenerates events from frost dates; provide a "before/after" diff |
| Schema breaks saved plans (no migration) | HIGH | Emergency migration release; if data corrupted, salvage what's possible from the JSON; user-facing apology + import old format |
| localStorage quota hit | MEDIUM | Detect at write time; offer auto-export + clear-cache flow; switch to IndexedDB on next release |
| Permapeople CORS broken | MEDIUM | Stand up a proxy (Cloudflare Worker takes ~30 min); ship + redirect API calls |
| GitHub Pages 404 on refresh | LOW | Add `404.html` copy step to build OR switch to hash routing; redeploy |
| Permapeople API outage | LOW (if planned) | Already handled — curated catalog still works; show degraded-mode banner |
| Drag perf tanks at scale | MEDIUM | Add virtualization; profile and memoize hot paths; ship as patch release |
| iOS Safari Private mode crashes | LOW | Add availability check + graceful fallback banner; ship as patch |

---

## Pitfall-to-Phase Mapping

How roadmap phases prevent each pitfall.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Zone vs frost date conflation | Phase 2 (data sourcing) | Two ZIPs same zone produce different schedules |
| 2. Off-by-one weeks-before-frost | Phase 1 (date primitive) | DST + leap-year + year-rollover unit tests pass |
| 3. localStorage data loss | Phase 1 (persistence) | iOS Private mode handled; export CTA visible |
| 4. Schema migration missing | Phase 1 (persistence) | Old fixture imports cleanly |
| 5. Cascade-on-drag surprises | Phase 4 (gantt UX) | Drag preview + undo + lock toggles ship |
| 6. Timezone date display shift | Phase 1 (date primitive) | Cross-tz tests pass |
| 7. DST transition bugs | Phase 1 (date primitive) | March/Nov tests pass |
| 8. Year-rollover for fall crops | Phase 2 (engine) | Garlic Oct→Jul fixture |
| 9. Date vs datetime confusion | Phase 1 (types) | TS won't allow Date in PlainDate slot |
| 10. Microclimate variance | Phase 2 (frost UX) | Manual override + caveat shown |
| 11. Frost confidence bands | Phase 2 (frost UX) | Risk pref present |
| 12. Frost tolerance per plant | Phase 2 (catalog) | Tomato vs lettuce transplant offsets differ |
| 13. Variety-specific DTM | Phase 2 (catalog) | Catalog entries are variety-level |
| 14. Indoor-start window vs date | Phase 2 + Phase 3 | Window rendered as range |
| 15. Hardening-off missing | Phase 2 (engine) | harden_off event type emitted |
| 16. Photoperiod / latitude | Phase 2 + Phase 3 | Long-day onion warning at southern lat |
| 17. Succession vs DTM confusion | Phase 2 (engine) | Both fields present, distinct in UI |
| 18. iOS Safari private mode | Phase 1 (persistence) | Banner shows; app doesn't crash |
| 19. Multi-tab race | Phase 1 (persistence) | Storage event handled |
| 20. Export versioning | Phase 1 (persistence) | Round-trip across versions tested |
| 21. Corrupt JSON import | Phase 1 (persistence) | Bad JSON shows friendly error |
| 22. No drag affordance | Phase 4 (gantt UX) | Hover cursor + handles + first-run tip |
| 23. Resize vs move ambiguity | Phase 4 (gantt UX) | Distinct cursor zones |
| 24. Snap ambiguity | Phase 4 (gantt UX) | Day-snap default |
| 25. Touch drag conflicts | Phase 4 (gantt UX) | Real-phone testing |
| 26. Perf at 200+ events | Phase 4 (gantt UX) | 200-event fixture at 60fps |
| 27. Permapeople outage | Phase 2 (catalog arch) | Curated catalog works without Permapeople |
| 28. CC BY-SA attribution | Phase 2 (Permapeople integration) | Footer + plant card + LICENSE |
| 29. Stale catalog | Phase 2 (catalog) | `lastReviewed` field shown; CHANGELOG noted |
| 30. Bad custom plant data | Phase 2 (engine + form) | Required fields enforced |
| 31. Unit confusion | Phase 2 + Phase 3 | Unit metadata + display |
| 32. Hostile empty state | Phase 5 (polish) | Onboarding wizard ships |
| 33. Mobile gantt unusable | Phase 5 (responsive) | Calendar fallback on narrow viewports |
| 34. Print/PDF broken | Phase 5 (polish) | `@media print` shipped |
| 35. Accessibility missing | Phase 4 + Phase 5 | Keyboard drag works; ARIA labels present |
| 36. No share mechanism | Phase 5 (polish) | URL-encoded share links |
| 37. GitHub Pages 404 | Phase 6 (deploy) | Hard refresh on sub-route works |
| 38. Stale CDN cache | Phase 6 (deploy) | Hashed assets + uncached index.html |
| 39. Permapeople CORS | Phase 2 (verify before commit) | First fetch in dev succeeds OR proxy ready |

---

## Sources

- [Permapeople API Docs (License & Attribution)](https://permapeople.org/knowledgebase/api-docs/) — confirms CC BY-SA 4.0 + non-commercial default
- [Permapeople Database FAQ](https://permapeople.org/knowledgebase/database-faq.html) — attribution requirements
- [Hardiness Zone vs Frost Date — Wyse Guide](https://www.wyseguide.com/hardiness-zone-vs-frost-date/) — confirms zone ≠ frost date
- [USDA Plant Hardiness Zone Map](https://planthardiness.ars.usda.gov/) — official zone definitions (avg minimum winter temp)
- [Old Farmer's Almanac Frost Dates](https://www.almanac.com/gardening/frostdates) — risk-based probability bands
- [Cornell Cooperative Extension First Planting Dates](http://ccecolumbiagreene.org/gardening/food-gardening/first-planting-dates) — frost-tolerance categories
- [Johnny's Seeds Onion Daylength Map](https://www.johnnyseeds.com/growers-library/vegetables/onions/onion-bulbing-daylength-latitude-map.html) — latitude/photoperiod for onions
- [Maryland Grows: Onions and day length](https://marylandgrows.umd.edu/2018/04/06/onions-and-day-length/) — photoperiod sensitivity confirmation
- [SeedSavers: Hardening Off and Transplant](https://seedsavers.org/how-to-harden-off-and-transplant-your-seedlings/) — hardening-off as standard practice
- [Sow Right Seeds: Don't Skip Hardening Off](https://sowrightseeds.com/blogs/planters-library/hardening-off-plants-toughen-up-your-babies-for-the-real-world) — confirms commonly-missed step
- [date-fns v4.0 Time Zones](https://blog.date-fns.org/v40-with-time-zone-support/) — modern date handling
- [Temporal API: Replace Moment.js and date-fns (2026)](https://www.pkgpulse.com/blog/temporal-api-replace-momentjs-date-fns-2026) — Temporal.PlainDate for date-only
- [TrackJS: Failed to execute setItem on Storage](https://trackjs.com/javascript-errors/failed-to-execute-setitem-on-storage/) — iOS Safari Private quota=0
- [Atomic Spin: iOS Private Browsing + localStorage](https://spin.atomicobject.com/2013/01/23/ios-private-browsing-localstorage/) — localStorage write throws in private mode
- [MDN: Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — localStorage 5-10 MB limits
- [web.dev: Storage for the web](https://web.dev/articles/storage-for-the-web) — IndexedDB recommendations
- [GitHub Community: SPA routing on Pages](https://github.com/orgs/community/discussions/64096) — 404.html fallback workaround
- [Handling 404 in SPA on GitHub Pages](https://dev.to/lico/handling-404-error-in-spa-deployed-on-github-pages-246p) — implementation pattern
- Personal experience / community wisdom — gantt UX patterns (drag affordance, cascade preview, undo)

---
*Pitfalls research for: Garden Gantt — single-user, browser-only, garden-planning gantt SPA*
*Researched: 2026-04-26*
