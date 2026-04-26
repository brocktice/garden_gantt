# Requirements: Garden Gantt

**Defined:** 2026-04-26
**Core Value:** Plug in your ZIP and your plants → get a correct, draggable lifecycle gantt for the season.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Location & Climate

- [ ] **LOC-01**: User can enter a ZIP/postal code and the app derives USDA hardiness zone, average last spring frost, and average first fall frost
- [ ] **LOC-02**: ZIP → zone/frost data is bundled into the app (no runtime API dependency); built from `waldoj/frostline` + NOAA frost-date statistics at build time
- [ ] **LOC-03**: User can manually override any of the auto-derived values (zone, last frost, first fall frost) to account for microclimate
- [ ] **LOC-04**: App handles unrecognized/missing ZIPs gracefully — surfaces an error and falls back to manual zone+frost entry
- [ ] **LOC-05**: Setup wizard (first run) walks the user from ZIP → starter plants → first gantt with one continuous flow

### Plant Catalog

- [ ] **CAT-01**: App ships a curated catalog of ~50 common vegetables and herbs (variety-level entries, not just species)
- [ ] **CAT-02**: Each catalog plant has the timing fields needed to schedule it: `weeks_indoors_before_last_frost`, `transplant_offset_days_after_last_frost`, `days_to_germinate`, `days_to_maturity`, `succession_interval_days`, `frost_tolerance` (tender/half-hardy/hardy), `season` (cool/warm)
- [ ] **CAT-03**: User can search and filter the catalog by name and category
- [ ] **CAT-04**: User can add a custom plant with the same fields as catalog entries; custom plants are first-class (same scheduling math)
- [ ] **CAT-05**: User can edit and delete their own custom plants
- [ ] **CAT-06**: User can optionally enrich a custom plant by fetching from the Permapeople API (botanical metadata, descriptions); enrichment is opt-in per plant, never blocks scheduling
- [ ] **CAT-07**: App degrades gracefully if Permapeople is unreachable — enrichment buttons surface the failure but core flows continue
- [ ] **CAT-08**: Permapeople-sourced data displays the required CC BY-SA 4.0 attribution

### Schedule Engine

- [x] **SCH-01**: For each planting in the plan, the engine computes a per-plant lifecycle: indoor-start window → harden-off window → transplant date → harvest window
- [x] **SCH-02**: All scheduling math is pure functions over `(plan, catalog) → ScheduleEvent[]` with no I/O dependencies
- [x] **SCH-03**: All dates stored and computed as UTC noon to avoid timezone/DST drift; no raw `new Date(string)` outside a single wrapper module
- [x] **SCH-04**: Engine respects frost tolerance: tender plants clamp transplant ≥ last frost; hardy plants allow transplant before last frost by their tolerance offset
- [x] **SCH-05**: Year-rollover crops (fall garlic, overwintered alliums) compute correctly across calendar boundaries
- [ ] **SCH-06**: Engine supports succession planting — given an interval (days) and a season cutoff, it generates additional plantings of the same crop until none can reach harvest before first fall frost
- [x] **SCH-07**: Engine emits auto-derived task events alongside lifecycle events (water seedlings during indoor phase, fertilize at flowering, harden off before transplant, etc.)
- [x] **SCH-08**: Snapshot tests cover known plants (tomato, lettuce, broccoli, garlic) plus DST-crossing and leap-year fixtures

### Gantt View

- [ ] **GANTT-01**: Plan renders as a horizontal-bar gantt chart with one row per planting (succession plantings get their own rows)
- [ ] **GANTT-02**: Each plant bar is segmented by lifecycle phase (indoor / harden-off / transplant→establish / harvest), color-coded
- [ ] **GANTT-03**: Time axis spans the gardening season for the user's location with sensible default zoom
- [ ] **GANTT-04**: User can drag any phase boundary or whole-bar to adjust dates
- [ ] **GANTT-05**: Drag respects constraints: cannot drag transplant of frost-tender plant before last frost; harden-off must precede transplant; harvest must follow transplant by at least DTM
- [ ] **GANTT-06**: Drag shows a ghost/preview of affected downstream events during the drag (cascade preview)
- [ ] **GANTT-07**: Releasing a drag commits a sparse `ScheduleEdit`; downstream events that weren't manually pinned reflow accordingly
- [ ] **GANTT-08**: User can lock individual events (pin) so cascade reflow won't move them
- [ ] **GANTT-09**: When a drag would violate a constraint, the bar snaps to the constraint boundary and surfaces a tooltip explaining why
- [ ] **GANTT-10**: Undo (Cmd/Ctrl-Z, ≥20 levels) reverses any drag or schedule edit; redo (Cmd/Ctrl-Shift-Z) re-applies it

### Calendar View

- [ ] **CAL-01**: User can toggle between gantt timeline view and calendar view; both views read from the same underlying schedule events
- [ ] **CAL-02**: Calendar offers month and week views
- [ ] **CAL-03**: Clicking a day shows all schedule events and tasks for that day in a detail panel
- [ ] **CAL-04**: Calendar is the default view on narrow (mobile) viewports

### Tasks

- [ ] **TASK-01**: Auto-derived garden tasks (from `SCH-07`) appear on the calendar and in the task dashboard
- [ ] **TASK-02**: User can add custom one-off or recurring tasks tied to a planting or free-floating
- [ ] **TASK-03**: User can edit and delete custom tasks
- [ ] **TASK-04**: All tasks (auto + custom) are checkable; completion state persists
- [ ] **TASK-05**: "Today / This Week" dashboard shows tasks due today and within the next 7 days, plus overdue tasks
- [ ] **TASK-06**: Dashboard groups tasks by plant or category and supports bulk check-off

### Persistence & Portability

- [x] **DATA-01**: Plan state (location, plantings, custom plants, schedule edits, custom tasks, completed task ids, settings) persists to browser localStorage on every change
- [x] **DATA-02**: Persisted state carries a `schemaVersion`; migration framework runs registered migration functions on load
- [x] **DATA-03**: App detects when localStorage is unavailable (iOS Safari Private Browsing → quota=0) and surfaces a non-blocking banner explaining what won't persist
- [ ] **DATA-04**: User can export the entire plan to a JSON file (one click)
- [ ] **DATA-05**: User can import a JSON file; import validates with Zod against the current schema and shows a preview before overwriting current state
- [x] **DATA-06**: Multi-tab `storage` events keep open tabs reconciled (no silent overwrites)
- [x] **DATA-07**: Bad/corrupt import shows a clear error without corrupting current state

### Polish & Share-Worthy v1

- [ ] **POL-01**: Mobile-responsive layout: calendar default on phones; gantt readable in landscape on phones; full editing on desktop/tablet
- [ ] **POL-02**: First-run onboarding walks new users from blank slate to first gantt without dead ends
- [ ] **POL-03**: Real empty states with a clear next-step CTA on every primary view (catalog empty, plan empty, dashboard empty)
- [ ] **POL-04**: Real error states for: bad ZIP, network failure on Permapeople, localStorage full, corrupt import
- [ ] **POL-05**: Loading states for any async operation (Permapeople fetch, ZIP lookup if any)
- [ ] **POL-06**: Confirmation dialogs before destructive actions (delete planting, clear plan, overwrite-on-import) with undo where possible
- [ ] **POL-07**: Modern typography, no jank during drag (60fps target on the gantt)
- [ ] **POL-08**: Keyboard accessibility: tab order, Enter to add, Escape to cancel, keyboard-driven drag fallback for the gantt
- [ ] **POL-09**: Color contrast meets WCAG AA on all text and interactive elements
- [ ] **POL-10**: Visible export prompt periodically (or on-demand) to mitigate localStorage-clear data loss

### Deployment

- [ ] **DEPLOY-01**: Static-site deploy to Cloudflare Pages with CI/CD on push to main
- [x] **DEPLOY-02**: Hash-based routing so deep links (`#/plan`, `#/setup`, `#/tasks`, `#/settings`) work after refresh on any static host
- [ ] **DEPLOY-03**: Hashed asset filenames; index.html uncached so deploys propagate without stale cache

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Catalog & Plants

- **CAT-V2-01**: Permapeople bulk import for catalog gaps (beyond per-plant enrichment)
- **CAT-V2-02**: Days-to-maturity overrides per planting (variety variation without polluting catalog)
- **CAT-V2-03**: Frost-tolerance override per planting

### Sharing & Output

- **SHARE-V2-01**: Print stylesheet — one-page season summary
- **SHARE-V2-02**: PDF export of season chart
- **SHARE-V2-03**: "Why this date?" math tooltip on every phase boundary

### Power Features

- **POWER-V2-01**: Notes per plant/planting (text only)
- **POWER-V2-02**: Multi-frost-source / per-bed frost overrides
- **POWER-V2-03**: PWA / installable web app with service worker
- **POWER-V2-04**: Multiple plans per browser

### Internationalization

- **I18N-V2-01**: Canadian postal codes
- **I18N-V2-02**: UK and EU postal-code → frost-date support

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multi-user accounts / authentication | Single-user local app per Core Value; backend kills the no-signup differentiator |
| 2D garden layout / square-foot grid / bed designer | Doing one thing well > doing both poorly; competitors that try are reviewed as clunky |
| Multi-bed timing tracking (in v1) | Scope discipline; export/import of separate JSON files covers the use case |
| Companion-planting recommendations | Contested science, opinion-as-fact risk, balloons the data model |
| Live weather API / dynamic frost forecasts | Avg frost dates are 90% as useful; adds API keys, rate limits, fragility |
| Plant identification (image upload) | Wrong product category — that's PlantNet/PictureThis territory |
| Public sharing / shareable plan URLs | Requires backend; export JSON covers the share use case |
| Native iOS/Android apps | Mobile-responsive web is enough; native doubles the build |
| Push notifications / email reminders | Native push from a static SPA needs a service worker + subscription endpoint; dashboard suffices |
| Photo upload / plant journal | Pulls product toward "journal" and away from "season planner"; localStorage capacity issue |
| Crop rotation history / multi-year tracking | Requires bed-layout (excluded) and year-over-year persistence |
| AI chatbot / "Growbot" assistant | Out of place for a no-backend free app; tooltips give the same trust signal |
| Ad networks / 3rd-party analytics | Violates the privacy-respecting stance |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LOC-01 | Phase 2 | Pending |
| LOC-02 | Phase 2 | Pending |
| LOC-03 | Phase 2 | Pending |
| LOC-04 | Phase 2 | Pending |
| LOC-05 | Phase 2 | Pending |
| CAT-01 | Phase 2 | Pending |
| CAT-02 | Phase 2 | Pending |
| CAT-03 | Phase 2 | Pending |
| CAT-04 | Phase 2 | Pending |
| CAT-05 | Phase 2 | Pending |
| CAT-06 | Phase 2 | Pending |
| CAT-07 | Phase 2 | Pending |
| CAT-08 | Phase 2 | Pending |
| SCH-01 | Phase 1 | Complete |
| SCH-02 | Phase 1 | Complete |
| SCH-03 | Phase 1 | Complete |
| SCH-04 | Phase 1 | Complete |
| SCH-05 | Phase 1 | Complete |
| SCH-06 | Phase 2 | Pending |
| SCH-07 | Phase 1 | Complete |
| SCH-08 | Phase 1 | Complete |
| GANTT-01 | Phase 2 | Pending |
| GANTT-02 | Phase 2 | Pending |
| GANTT-03 | Phase 2 | Pending |
| GANTT-04 | Phase 3 | Pending |
| GANTT-05 | Phase 3 | Pending |
| GANTT-06 | Phase 3 | Pending |
| GANTT-07 | Phase 3 | Pending |
| GANTT-08 | Phase 3 | Pending |
| GANTT-09 | Phase 3 | Pending |
| GANTT-10 | Phase 3 | Pending |
| CAL-01 | Phase 3 | Pending |
| CAL-02 | Phase 3 | Pending |
| CAL-03 | Phase 3 | Pending |
| CAL-04 | Phase 4 | Pending |
| TASK-01 | Phase 3 | Pending |
| TASK-02 | Phase 3 | Pending |
| TASK-03 | Phase 3 | Pending |
| TASK-04 | Phase 3 | Pending |
| TASK-05 | Phase 3 | Pending |
| TASK-06 | Phase 3 | Pending |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 2 | Pending |
| DATA-05 | Phase 2 | Pending |
| DATA-06 | Phase 1 | Complete |
| DATA-07 | Phase 1 | Complete |
| POL-01 | Phase 4 | Pending |
| POL-02 | Phase 4 | Pending |
| POL-03 | Phase 4 | Pending |
| POL-04 | Phase 4 | Pending |
| POL-05 | Phase 4 | Pending |
| POL-06 | Phase 4 | Pending |
| POL-07 | Phase 4 | Pending |
| POL-08 | Phase 4 | Pending |
| POL-09 | Phase 4 | Pending |
| POL-10 | Phase 4 | Pending |
| DEPLOY-01 | Phase 4 | Pending |
| DEPLOY-02 | Phase 1 | Complete |
| DEPLOY-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 61 total
- Mapped to phases: 61
- Unmapped: 0

**Distribution by phase:**
- Phase 1 (Foundation & Schedule Engine): 13 requirements
- Phase 2 (Data Layer & First End-to-End): 19 requirements
- Phase 3 (Drag, Cascade, Calendar & Tasks): 16 requirements
- Phase 4 (Polish, Mobile & Ship): 13 requirements

---
*Requirements defined: 2026-04-26*
*Last updated: 2026-04-26 after roadmap creation (traceability filled)*
