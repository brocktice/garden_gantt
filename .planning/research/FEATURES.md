# Feature Research

**Domain:** Garden-planning web app (single-user, hobby gardener) — gantt + calendar visualization driven by ZIP/frost-date math.
**Researched:** 2026-04-26
**Confidence:** HIGH

## Apps Surveyed

Direct surface review of: GrowVeg / Mother Earth News Garden Planner, Old Farmer's Almanac
Garden Planner, Seedtime, Smart Gardener, From Seed to Spoon, Planter (planter.garden),
Veggie Garden Planner, Sprout Robot, Hortisketch / Garden Savvy, GardenPuzzle, Gardenize,
GrowNotes, BioGarden365, Planta, Fryd, Croppa, Kitchen Garden Planner (Gardener's Supply),
plus Johnny's Selected Seeds calculators (seed-starting, succession, seed quantity), Seeds for
Generations succession calculator, Bloom Manager succession calculator, Floricult dynamic
spreadsheet, Clyde's Garden Planner (physical), and the dominant spreadsheet-based DIY pattern.

The single closest analog to this project is **Seedtime** — they explicitly built a
"horizontal timeline view to compare planting schedules and create or edit succession
plantings." It's the only competitor with a real timeline-as-primary-affordance product.
Everyone else is bed-layout-first or calendar-only.

## Feature Landscape

### Table Stakes (Users Expect These)

If these are missing or broken, hobby gardeners abandon and go back to their spreadsheet.

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| ZIP/postal-code → frost dates → growing-zone derivation | Every comparable app does it; users won't enter dates manually if they have to do their own zone lookup. | LOW | `phzmapi.org/{zip}.json` exists (PRISM/USDA data). Frost-date data is the harder half — needs separate dataset (NOAA/Almanac-style), not part of the USDA zone API. Plan for a static JSON of `zip → {zone, last_spring_frost, first_fall_frost}`. |
| Per-plant lifecycle scheduling (sow indoor → transplant → harvest) | The single thing every calculator does; this is the product's reason to exist. | MEDIUM | Standard formula: `indoor_start = last_frost - (weeks_indoors * 7) - days_to_germination`; `transplant = last_frost + offset`; `harvest = transplant + days_to_maturity`. Frost-tender vs cold-hardy plants need different transplant offsets. |
| Curated plant database (50–100 common veggies/herbs) with sane defaults | Nobody wants to type DTM/spacing/timing for tomatoes; database is the on-ramp. | MEDIUM | Real apps range 100 (Planter free) → 250 (Almanac) → 2,670+ (Seedtime). At 50 well-curated entries this app covers 90% of home gardens. Common 1-star complaint across apps: missing X, Y, Z plant — overdeliver on common varieties before chasing breadth. |
| Custom plant entry | Every database has gaps; users always hit them. Locking custom plants behind paywall (Seedtime, Seed to Spoon) is a top complaint. | LOW | Just an editable form with the same fields as the curated record. Treat custom plants as first-class — same scheduling math runs against them. |
| Calendar / month view of when to do what | Spreadsheet replacement target; every competitor has one. | MEDIUM | Toggle between gantt and calendar is already in scope and is unambiguously expected. |
| Garden tasks with checkboxes ("water seedlings", "fertilize", "scout for pests") | Planta, WaterMe, Plantir, Smart Gardener all have this; users equate "planner" with "reminders/checklist". | LOW-MEDIUM | Auto-derived recurring tasks per plant + custom one-offs. Don't need push notifications in v1 (web app, not native) — a "due today / this week" dashboard tile is enough. |
| Drag-to-adjust timeline bars | This *is* the differentiator (see below) but at the same time, once a user sees a gantt they expect to drag it. Static gantt would feel broken. | HIGH | Must reflow downstream events (move transplant → harvest moves). Must enforce constraints (can't transplant tomato before last frost). Must snap to date and show what shifted. |
| Persistence between sessions | Re-entering plants every page load = abandonment in 30 seconds. | LOW | localStorage works. The only failure mode worth designing for is "user clears browser data" — make export/import obvious. |
| Mobile-responsive layout | ~50% of users will check on phone. Gantt does NOT need full editing on mobile, but must be readable. Smart Gardener gets nuked in reviews specifically for "doesn't fit on phone, can't zoom." | MEDIUM | View-mostly on mobile, edit on desktop is acceptable. Calendar view should be the default mobile presentation. |
| Search / filter the plant catalog | Smart Gardener got hammered in reviews for forcing a manual scroll: *"there's no search function so you need to manually scroll and select each variety."* | LOW | Substring filter on plant name + common synonyms. |
| Polished visual design (not Windows 95) | Direct quote from review of the category: *"interfaces on them are often clunky and feel a little bit like time warp back to Windows 95."* This is the bar for "share-worthy." | MEDIUM | Modern type, sane spacing, real iconography, smooth interactions. Not flashy — just not ugly. |
| Zero-effort start (no signup, no email collect) | Major complaint vector across Seedtime/Seed to Spoon/Smart Gardener/Planter — users hit a paywall or signup wall before seeing value. | LOW | Project already constrains this — single-user, no auth. Lean into it as a marketing point: "no account needed." |

### Differentiators (Competitive Advantage)

What would make THIS app share-worthy where existing apps aren't.

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| **Full-lifecycle gantt as the primary view** | Almost every competitor leads with a 2D garden layout (Planter, GrowVeg, Smart Gardener, Hortisketch, GardenPuzzle, Seed to Spoon). Seedtime is the only timeline-first product, and even theirs reads like a calendar list. A real interactive Gantt — bars per plant, lifecycle phases shown as phase segments — is unoccupied territory. | HIGH | This is the core. Phase segments per plant: indoor-start, harden-off, transplant→establish, harvest window. Color or pattern per phase. Vertical row per plant (or per planting if succession). |
| **Drag-to-adjust with constraint-aware reflow** | Reviewers consistently praise Seedtime's "click & drop" rescheduling and complain when GrowVeg's schedule doesn't recover from real-world changes (*"when weather or location factors changed, the whole schedule was thrown off"*). A drag that respects frost constraints AND reflows downstream is a real moat. | HIGH | Constraints to enforce: transplant ≥ last_frost (frost-tender) or ≥ last_frost - tolerance (hardy); harden-off precedes transplant; harvest after transplant + DTM. When user drags a bar past a constraint, snap to constraint and show why. |
| **Succession planting as a first-class object** | Most apps barely support it. Johnny's calculator does it as a separate workflow. Seedtime supports it but charges for advanced. Treating successions as additional rows on the same gantt (with interval picker: every 14d, every 21d, until cutoff) is rare and obviously useful for the visualization. | MEDIUM | Each succession = its own row/instance with its own draggable lifecycle. Compute from interval + season cutoff (don't schedule a succession that can't reach harvest before first fall frost). |
| **Polish bar — built like a 2026 web app, not 2010** | Direct user complaints repeated across Smart Gardener, Veggie Garden Planner, GardenPuzzle: clunky UI, freezing, can't zoom, tiny text, crashes. The bar to clear is genuinely low. | MEDIUM | Ongoing effort across the project, not one feature. Means: keyboard accessibility, no jank during drag, sensible empty states, real loading/error UI. |
| **No account, no paywall, no subscription** | Every competitor's review section has a "had to pay $X / had to give email / lost my data when I stopped paying" complaint. Free + local + portable export is a stance. | LOW | Project is already structured this way; just make it visible. "Your data lives in your browser. Export anytime." |
| **JSON export/import for portability** | Gardenize and a few others offer CSV export; almost no one does round-trippable JSON. Pairs with the no-account stance: your data is yours, take it. | LOW | Same shape as localStorage payload. Versioned schema. |
| **Today / This Week dashboard** | Smart Gardener has a weekly task list and gets credit for it; it just executes badly. A clean "what do I need to do this week" panel that pulls from the gantt is high-perceived-value, low-effort. | LOW-MEDIUM | Computed view over plantings + tasks where date falls in current week. |
| **Click a calendar day → see all plant events that day** | Calendar view is table-stakes, but the interaction is usually a week list. Click-into-day for a daily detail panel is genuinely useful and uncommon. | LOW | View-layer feature; data already exists. |
| **Print view / single-page season summary** | GrowVeg gets dinged hard for poor printing (*"had to fuss around to get my entire garden printed out"*); Clyde's Garden Planner is a printable wall chart and people pay money for it. A clean print stylesheet that produces a one-page season schedule is uniquely valued. | LOW-MEDIUM | CSS print stylesheet over the gantt + a task-list-by-month section. Can come post-v1. |
| **Permapeople enrichment for plant catalog breadth** | Lets the curated 50 stay tight while still covering oddball plants users add. Ties to "no missing plants" complaint vector. | MEDIUM | Verify rate-limits/auth before committing per PROJECT.md note. Users hit it on demand from the "add custom plant" flow, not on every page load. |
| **Honest scheduling: show the math** | Gardeners are a curious, distrustful audience — a tooltip explaining "Indoor start = May 15 - 8 weeks - 7 days germination" earns trust the way Johnny's calculator does. | LOW | Tooltip / "why this date?" affordance per phase bar. |

### Anti-Features (Commonly Requested, Often Problematic — and Out-of-Scope per PROJECT.md)

These either bloat the product, blur the value prop, or are explicitly excluded by user
direction. Documenting them so they don't sneak back in.

| Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| **2D garden layout / square-foot grid / bed designer** | Every competitor has one; users coming from Planter/GrowVeg expect to "place" plants. | Out of scope per PROJECT.md. Adds enormous UX surface (drawing tools, irrigation routing, scaling). Existing tools that try to do both timing AND layout are the ones reviewers call clunky and unwieldy. Doing one thing well > doing both poorly. | Be explicit on the landing page: *"Garden Gantt is about timing, not space. For bed layout, use [tool]."* |
| **Companion planting recommendations** | Planter, GrowVeg, Smart Gardener, Fryd all push this; users assume gardening apps "should" have it. | Out of scope per PROJECT.md. Companion planting science is contested (see permies forum debates), encodes opinions as if they're facts, and balloons the data model. | None for v1. If users ask, point them at Planter/Fryd. |
| **Multi-bed tracking / multi-garden plans** | Real gardeners often have multiple beds; competitor free tiers cap at 1 garden specifically to upsell. | Out of scope per PROJECT.md. Two beds doubles the model complexity without doubling the value for v1's hobbyist target. Single-plan keeps the gantt readable. | One plan per browser; export/import lets a user maintain "front-yard.json" and "raised-bed.json" externally. |
| **Auth / accounts / cloud sync** | Users coming from cross-device habit ask for it. | Out of scope per PROJECT.md. Drives backend, infra, privacy, and pricing complexity that kills the "no signup" differentiator. Competitor reviews are full of "lost my data when subscription lapsed." | Export/import JSON. "Sync" means "drop the JSON in your Dropbox." |
| **Live weather API / dynamic frost forecasts** | Sprout Robot promotes this; users assume "smart" gardening needs real-time weather. | Out of scope per PROJECT.md. Adds API key management, rate limits, network fragility, and a paid dependency for a single-user free app. Average frost dates are 90% as useful for planning. | Static frost dates in v1. Document that the gantt is a *plan* not a forecast. |
| **Plant identification (image upload)** | Every "best gardening app" listicle ranks PlantNet/Picture This high. | Wrong product category. Identification is consumption (what is this plant?), not planning (when do I plant?). | Out — point users at PlantNet. |
| **Public sharing / shareable plan URLs** | "I want to send my plan to my buddy" is a real desire. | Out of scope per PROJECT.md. URL-shareable plans require a backend; rich-share (image/PDF) duplicates print-view work. | Export JSON. Print view as a sharable PDF (post-v1). |
| **AI chatbot ("Growbot"-style assistant)** | Seed to Spoon's "Growbot" is their headline 2024 feature. | Out of place in a single-user, no-backend, free app. Adds API costs and a feature surface that competes with the core (gantt) for attention. | Honest scheduling tooltips ("show the math") give the same trust signal without an LLM bill. |
| **Push notifications / email reminders** | Users equate "task list" with "phone buzzes me." | Native push from a static web app is awkward (web push needs a service worker + permission flow + subscription endpoint). Email needs a backend. | "Today/This Week" dashboard works without it. Web push could come post-v1 as PWA enhancement. |
| **Photo upload for plant journal** | Gardenize, BioGarden365, GrowNotes all lead with this. | localStorage caps at ~5–10MB; photos blow that out fast. Pulls the product toward "garden journal" and away from "season planner." | Out for v1. If users add notes, plain text only. |
| **Crop rotation history / multi-year tracking** | GrowVeg's "you planted potatoes here last year" warning is a real differentiator for them. | Requires bed-layout (already excluded) AND year-over-year persistence (multi-plan). Big lift for limited value to a hobbyist target. | Out — power users keep notes externally. |
| **Native iOS/Android apps** | App Store presence is "discoverability." | Out of scope per PROJECT.md. Doubles the build, adds review processes, splits surface area. PWA-installable from the web is enough. | Mobile-responsive web. |
| **Ad networks / analytics tracking** | Free apps usually ad-supported. | Violates "share-worthy / privacy-respecting" stance. Reviewers actively complain about Seedtime/Seed to Spoon ads. | None. Anonymous self-hosted Plausible-style telemetry only if needed; never ad networks. |

## Feature Dependencies

```
ZIP entry → Frost-date dataset lookup
                └──> Per-plant lifecycle math
                          ├──> Gantt rendering
                          │       └──> Drag-to-adjust
                          │              └──> Constraint-aware reflow
                          │
                          ├──> Calendar view (alt presentation of same data)
                          │
                          ├──> Auto-derived garden tasks
                          │       └──> "Today / This Week" dashboard
                          │
                          └──> Succession planning
                                  └──> Stacked rows / multi-instance display

Curated plant DB ─┐
Custom plants    ─┼──> Plant catalog UI
Permapeople API  ─┘        └──> "Add to plan" action

Plan state ──> localStorage persistence
   └──> JSON export / import (round-trip)

Polish/UX work  ──enhances──> EVERY feature above
Print view      ──depends-on──> Gantt + Calendar render
```

### Dependency Notes

- **Frost-date lookup blocks everything.** No frost dates → no scheduling → no gantt. This is
  the gating feature; quality of frost-date data caps the quality of every other output.
- **Plant catalog blocks lifecycle math.** Without per-plant constants
  (`weeks_indoors`, `transplant_offset_days`, `days_to_maturity`, `succession_interval_days`,
  `frost_tolerance`), the formula has no inputs. Curated DB MUST come before gantt rendering.
- **Drag-to-adjust requires the gantt render.** Gantt → drag → reflow → constraints is a strict
  pipeline. Don't try to ship constraint-aware reflow before basic drag works.
- **Succession planting depends on base scheduling.** Successions are just more lifecycle
  instances with offset start dates. Implement single planting first, then generalize to N.
- **Calendar view shares data with gantt.** Same underlying event model; different render. Build
  the event model once, project into both views.
- **Garden tasks cluster around plantings but are independent.** Auto-derived tasks (e.g.,
  "water seedlings weekly while indoors") attach to a planting via its phase windows. Custom
  one-off tasks are free-floating. Both feed the dashboard.
- **localStorage persistence is foundational.** Every feature above writes to it; export/import
  is just serializing that shape.
- **Permapeople enrichment is opt-in.** It enhances catalog breadth but isn't required for
  curated plants to work. Wire it as an "enrich custom plant" action, not as a page-load fetch.

## MVP Definition

### Launch With (v1)

The minimum bar to be share-worthy to another gardener:

- [ ] **ZIP → frost-date lookup** — works for US ZIPs at minimum. Foundation; no frost dates means no scheduling.
- [ ] **Curated plant catalog (~50 entries)** — common veggies and herbs only. Search/filter from day one.
- [ ] **Custom plant entry** — same fields as curated, persists. Closes the "you don't have my plant" complaint vector.
- [ ] **Per-plant lifecycle math** — sow indoor → harden off → transplant → harvest, computed from frost dates and plant constants. The product's reason to exist.
- [ ] **Gantt timeline view** — phase segments per plant, season-spanning. The differentiator.
- [ ] **Drag-to-adjust** — with constraint enforcement (frost-tender plants can't pre-date last frost) and downstream reflow. Without this the gantt is wallpaper.
- [ ] **Calendar view (toggleable)** — month view; click a day to see events. User explicitly wanted both views.
- [ ] **Succession planting** — interval picker, multi-instance display. Per user direction.
- [ ] **Auto-derived garden tasks + custom tasks, checkable** — water/fertilize/scout, plus user-added one-offs.
- [ ] **"Today / This Week" dashboard** — what do I need to do right now. Highest-leverage UX win for low effort.
- [ ] **localStorage persistence** — silent, automatic, every change.
- [ ] **JSON export/import** — visible "Export plan" + "Import plan" buttons. Privacy + portability stance.
- [ ] **Mobile-responsive layout** — calendar usable on phone; gantt readable (read-mostly OK).
- [ ] **Polish pass** — modern type, no jank during drag, real empty states, error states, accessibility basics. The bar competitors keep failing.

### Add After Validation (v1.x)

- [ ] **Permapeople API enrichment** — "fetch from Permapeople" button on add-custom flow once API contract is verified. Trigger: users repeatedly hit catalog gaps.
- [ ] **Print stylesheet / one-page season chart** — the Clyde's-Garden-Planner-on-paper experience. Trigger: user feedback wanting a refrigerator-magnet view.
- [ ] **"Why this date?" math tooltips** — show the formula behind each phase boundary. Trigger: trust questions in feedback.
- [ ] **Notes per plant/planting (text only)** — lightweight observation field on each row. Trigger: users asking for journaling.
- [ ] **Multiple frost-date sources / overrides** — let user override the default frost dates if their microclimate differs. Trigger: power users in cold pockets.
- [ ] **PWA / installable web app** — service worker, true offline, "add to home screen." Trigger: user request for offline reliability.
- [ ] **Days-to-maturity overrides per planting** — let a user pick a specific tomato variety with custom DTM without polluting the catalog. Trigger: succession-planters with multiple varieties of one crop.

### Future Consideration (v2+)

- [ ] **Localization beyond US (Canadian postal codes, UK, EU)** — defer until US flow is proven. Frost-date data exists for other regions, but ZIP→frost mapping is US-specific.
- [ ] **Multiple plans per browser** — defer until users actually ask. Most don't.
- [ ] **Multi-bed timing-only segmentation** — if the no-layout stance starts costing users, allow tagging plantings with bed names without becoming a layout tool.
- [ ] **Web push for due tasks** — if PWA lands, leverage for opt-in reminders.
- [ ] **Crop-rotation flag (no layout, just "you grew tomatoes last year")** — would require plan history; only justifiable if a year-over-year story emerges.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---|---|---|---|
| ZIP → frost-date lookup | HIGH | LOW | **P1** |
| Curated plant catalog (50 entries) | HIGH | MEDIUM | **P1** |
| Per-plant lifecycle math | HIGH | MEDIUM | **P1** |
| Gantt timeline view | HIGH | HIGH | **P1** |
| Drag-to-adjust with constraints | HIGH | HIGH | **P1** |
| Calendar view | HIGH | MEDIUM | **P1** |
| Succession planting | HIGH | MEDIUM | **P1** |
| Custom plant entry | HIGH | LOW | **P1** |
| Auto-derived garden tasks | HIGH | LOW-MEDIUM | **P1** |
| Custom one-off tasks | MEDIUM | LOW | **P1** |
| "Today / This Week" dashboard | HIGH | LOW | **P1** |
| localStorage persistence | HIGH | LOW | **P1** |
| JSON export/import | MEDIUM | LOW | **P1** |
| Mobile-responsive layout | HIGH | MEDIUM | **P1** |
| Polish (typography, no-jank, a11y) | HIGH | MEDIUM (ongoing) | **P1** |
| Plant catalog search/filter | MEDIUM | LOW | **P1** |
| Permapeople enrichment | MEDIUM | MEDIUM | P2 |
| "Why this date?" math tooltips | MEDIUM | LOW | P2 |
| Print view | MEDIUM | LOW-MEDIUM | P2 |
| Notes per planting | MEDIUM | LOW | P2 |
| Frost-date override | LOW-MEDIUM | LOW | P2 |
| PWA / offline | MEDIUM | MEDIUM | P3 |
| Multi-plan support | LOW | MEDIUM | P3 |
| Internationalization | LOW (for v1 audience) | HIGH | P3 |

**Priority key:**
- P1: Must have for v1. Cutting any of these breaks the share-worthiness bar or the core value.
- P2: Should land soon after v1 launches based on real user feedback.
- P3: Defer until product-market fit signal exists.

## Competitor Feature Analysis

| Feature | Seedtime | GrowVeg | Smart Gardener | Planter | Seed to Spoon | Sprout Robot | Garden Gantt (us) |
|---|---|---|---|---|---|---|---|
| Primary view | Calendar + horizontal timeline | 2D bed layout | 2D layout | 2D layout (sq-ft) | 2D layout | Email calendar | **Interactive Gantt** (timeline-first) |
| Secondary view | List | Calendar | Weekly task list | Plant info cards | Visual layout | None | Calendar (toggleable) |
| Drag-to-reschedule | Click & drop on calendar | Limited | No | No | No | No | **Yes, with constraint reflow** |
| Succession support | Yes (paid for advanced) | Yes (criticized as fragile) | Limited | No | No | No | **First-class** |
| Indoor → harden → transplant → harvest lifecycle | Calendar entries per phase | Schedule list | Weekly tasks | Plant page only | Plant page only | Email per stage | **Visualized as one bar with phase segments** |
| Custom plants | Paid only | Yes | Yes | Limited | Yes | No | **Free, first-class** |
| Plant DB size | 2,670+ | 135+ | ~150 | 100+ | ~100 | ~50 | 50 curated + Permapeople + custom |
| Frost-date input | ZIP (auto) | Postal code | ZIP | GPS | GPS, override | ZIP | ZIP (auto) |
| Account required | Yes (free tier) | Free trial → paid | Paid | Free + IAP | Free + premium | Email signup | **None** |
| Pricing | Free tier + $7/mo+ | $29/yr | $10/qtr | Free + IAP | $4.99/mo+ | Subscription seed boxes | **Free, no tier** |
| Data export | Print views | None notable | None notable | None | None | None | **JSON round-trip** |
| Mobile | iOS, Android, web | Web (mobile-responsive) | iOS, Android | iOS, Android | iOS, Android, web | Email | **Responsive web** |
| Print | Printable views | Poor (per reviews) | Tiny print (per reviews) | None | None | None | **First-class print stylesheet (P2)** |
| Companion planting | No | Yes | Yes | Yes | Yes (warnings) | No | **No (out of scope)** |
| 2D layout | Optional add-on | Core | Core | Core | Core | None | **No (out of scope)** |

**Where we win:** Timeline-as-first-class (only Seedtime competes; theirs is calendar-first).
Drag-to-adjust with constraint reflow (nobody does this well — GrowVeg's reschedule is fragile,
others don't have it). No account/no paywall (every paid competitor draws complaints here).
Modern polish (the entire category looks dated per reviews).

**Where we don't try to compete:** 2D bed layout (Hortisketch, Planter, GrowVeg, GardenPuzzle
own this). Plant ID (PlantNet/PictureThis own this). Companion planting science (Planter,
Fryd, Smart Gardener own this). Native mobile (Seed to Spoon, Planter own this). Massive plant
DB breadth (Seedtime owns this with 2,670+).

## Polish Checklist (the "share-worthy" bar)

Cross-cutting requirements pulled from competitor failure modes — not features themselves but
quality dimensions that will make or break recommendations to other gardeners:

- [ ] **No jank during drag.** Smart Gardener and Veggie Garden Planner reviews repeatedly cite "freezing," "crashes," "buttons finicky." A drag operation must be visibly smooth.
- [ ] **Real empty states.** Add explanation + CTA for empty plant list, empty plan, empty dashboard. Competitors drop users into blank screens.
- [ ] **Real error states.** Bad ZIP, network failure on Permapeople, localStorage full — all need user-facing messages, not silent failures.
- [ ] **Keyboard accessibility on the catalog and forms.** Tab order, Enter to add, Escape to cancel. Power users will appreciate; a11y compliance is bonus.
- [ ] **Click targets sized for touch.** Multiple competitor reviews mention finicky tap targets on mobile.
- [ ] **Readable type at default zoom.** Smart Gardener got hammered for "tiny words, can't zoom over 100%."
- [ ] **Loading states for the only async operation (frost-date lookup, Permapeople enrich).** Users notice when they don't exist.
- [ ] **Confirmation before destructive actions.** Delete planting, clear plan, overwrite on import — confirm with a way to undo.
- [ ] **Honest about limits.** Single-user, browser-only, no cloud — say it on the landing page. Don't surprise users who expected sync.
- [ ] **Visible export prompt periodically.** Reduce risk of localStorage-clear-induced data loss without being a nag.

## Sources

- [GrowVeg / Mother Earth News Garden Planner — feature comparison](https://www.growveg.com/garden-planner-reviews.aspx)
- [GrowVeg subscription / FAQ](https://www.growveg.com/subscribeinfo.aspx)
- [Seedtime — official site](https://seedtime.us/)
- [Seedtime pricing](https://seedtime.us/pricing)
- [Seedtime on Trustpilot](https://www.trustpilot.com/review/seedtime.us)
- [Seed to Spoon — app highlights](https://www.seedtospoon.net/app/)
- [Seed to Spoon — App Store reviews](https://apps.apple.com/us/app/seed-to-spoon-garden-planner/id1312538762?see-all=reviews)
- [Sprout Robot review (Cheap Vegetable Gardener)](https://www.cheapvegetablegardener.com/plan-your-garden-with-sprout-robot/)
- [Sprout Robot — Organic Authority](https://www.organicauthority.com/live-grow/sproutrobot-what-to-plant-when)
- [Johnny's Selected Seeds — Seed-Starting Date Calculator](https://www.johnnyseeds.com/growers-library/seed-planting-schedule-calculator.html)
- [Johnny's Selected Seeds — Online Tools](https://www.johnnyseeds.com/growers-library/online-tools-calculators.html)
- [Johnny's — Succession-Planting Methods](https://www.johnnyseeds.com/growers-library/methods-tools-supplies/succession-planting/succession-planting-methods-for-providing-a-continuous-supply.html)
- [Planter (planter.garden) — official](https://planter.garden/)
- [Planter — Apple App Store](https://apps.apple.com/us/app/planter-garden-planner/id1542642210)
- [Smart Gardener — official](https://www.smartgardener.com/)
- [5 Vegetable Garden Planner Apps Compared — Food Gardening Network](https://foodgardening.mequoda.com/daily/garden-design/vegetable-garden-planner-apps/)
- [Best Garden Planner Template Tools for 2025](https://homegrown-garden.com/blogs/blog/garden-planner-template)
- [Best Gardening Apps in 2026 — myplantin](https://myplantin.com/blog/best-gardening-apps)
- [Best Garden Planning Apps — Leaftide](https://leaftide.com/learn/best-garden-planning-apps/)
- [11 Free Garden Planners — Trees.com](https://www.trees.com/gardening-and-landscaping/free-garden-planners)
- [GardenPuzzle — Apple App Store](https://apps.apple.com/us/app/gardenpuzzle-plan-a-garden/id1090920347)
- [Hortisketch — Garden Savvy](https://gardensavvy.com/hortisketch/)
- [Gardenize — Apple App Store](https://apps.apple.com/us/app/gardenize-plant-care-gardening/id1118448120)
- [GrowNotes — Apple App Store](https://apps.apple.com/us/app/grownotes-garden-journal/id6479220212)
- [BioGarden365](https://www.biogarden365.com/en/garden-journal-app-gardening-log/)
- [Planta](https://getplanta.com/)
- [Fryd vegetable garden planner](https://fryd.app/en)
- [Old Farmer's Almanac Garden Planner](https://gardenplanner.almanac.com/)
- [Clyde's Garden Planner (printable wall chart)](https://clydesvegetableplantingchart.com/)
- [Free Garden Planner — gardenplanner.net (no-signup web app)](https://gardenplanner.net/)
- [Floricult Dynamic Garden Calendar (spreadsheet)](https://www.floricult.com/gardencalendar)
- [Gardener.org spreadsheet thread](https://garden.org/thread/view/189583/Software-applications-for-gardeners/)
- [Permies — companion-planting / planner discussion](https://permies.com/t/41092/permaculture/companion-planting-garden-planner-software)
- [Hardening off — Penn State Extension](https://extension.psu.edu/hardening-transplants)
- [Hardening off — University of Maryland Extension](https://extension.umd.edu/resource/hardening-vegetable-seedlings-home-garden)
- [phzmapi.org — USDA Plant Hardiness Zone API by ZIP](https://planthardiness.ars.usda.gov/) (per third-party referencing; project-internal lookup confirmed phzmapi.org/{zip}.json format)
- [Frost dates by ZIP — zipcodegarden](https://zipcodegarden.com/frost-dates.html)
- [Gardenly hardiness zone finder](https://gardenly.app/free-tools/hardiness-zone-finder)
- [Days-to-maturity formula — Garden Truth](https://gardentruth.com/seed-starting-date-calculator/)
- [Gardening Math seed-starting chart](https://gardeningmath.com/blog/seed-starting-chart-indoor/)
- [Robbins Farm Garden — "Scheduling with a Garden Gantt Chart"](https://robbinsfarmgarden.org/scheduling-with-a-garden-gantt-chart/)
- [Seeds for Generations succession calculator](https://seedsforgenerations.com/succession-planting-calculator/)
- [Bloom Manager succession calculator](https://blog.bloommanager.com/succession-planting-calculator-free-tool/)

---
*Feature research for: garden-planning web app (single-user, hobby gardener, gantt + calendar)*
*Researched: 2026-04-26*
