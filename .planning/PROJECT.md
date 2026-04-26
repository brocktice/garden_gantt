# Garden Gantt

## What This Is

A single-user web app that turns a ZIP code and a plant list into an interactive, drag-adjustable
Gantt chart of the gardening season — indoor seed starting, hardening off, transplant, harvest,
succession plantings, and checkable garden tasks. Built for a hobby gardener who wants to replace
spreadsheets and seed-packet math with a visual schedule that's actually trustworthy enough to
recommend to other gardeners.

## Core Value

**Plug in your ZIP and your plants → get a correct, draggable lifecycle gantt for the season.**

Everything else (tasks, calendar view, custom plants, succession) is supporting cast. If the
core scheduling math is wrong or the gantt isn't usable, the app fails.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User enters ZIP/postal code; app derives USDA zone and frost dates (last spring, first fall)
- [ ] User picks plants from a curated catalog (~50-100 common veggies/herbs)
- [ ] User can add custom plants with their own timing data
- [ ] Optional enrichment from Permapeople API for additional plant details
- [ ] App computes a full-lifecycle gantt per plant: indoor start → harden off → transplant → harvest
- [ ] Succession planting support (multiple plantings of the same crop across the season)
- [ ] Auto-derived garden tasks appear on the schedule (water seedlings, fertilize, etc.)
- [ ] User can add custom one-off or recurring tasks
- [ ] Tasks are checkable; dashboard shows what's due today / this week
- [ ] Visual: classic horizontal-bar gantt timeline view
- [ ] Visual: month/week calendar view, toggleable with timeline
- [ ] Drag-to-adjust on the gantt: move bars, downstream events recalculate within frost-date constraints
- [ ] Plan persists in browser localStorage; export/import JSON for backup
- [ ] Polish bar high enough to recommend to another gardener (share-worthy v1)

### Out of Scope

- Multi-user accounts / authentication — single-user local app, no server-side state
- Multi-bed tracking or 2D garden layout / square-foot grid — timing only, not space
- Companion planting recommendations — out of scope (timing-focused product)
- Native mobile app — web only; mobile-responsive is fine but not native
- Public sharing / shareable links — single-user local; export/import JSON is the share mechanism
- Live weather API integration — frost dates from ZIP lookup are sufficient for v1
- Plant identification (image upload) — not the product
- Selling seeds / e-commerce — not the product

## Context

- **User:** Hobby gardener replacing spreadsheets/notebooks with a visual schedule.
- **Data sources surveyed:**
  - OpenFarm — sunset April 2025, not viable
  - Permapeople API — active, CC BY-SA 4.0, gardening-focused (chosen for enrichment)
  - Trefle — botanical, light on sow/transplant/harvest timing
  - USDA PLANTS — taxonomy only, no timing
  - Curated JSON — most reliable for core (~50 plants covers most home gardens)
- **Timing math:** Most lifecycle dates derive from `last_frost_date`, `first_frost_date`, and
  per-plant constants (`weeks_indoor_before_last_frost`, `transplant_offset_days`,
  `days_to_maturity`, `succession_interval_days`). USDA zone + ZIP gives frost dates.
- **Permapeople API status (researcher should verify):** confirm rate limits, auth model, and
  whether it returns sow/transplant/harvest timing or just botanical metadata before committing.
- **Drag interaction:** dragging an event needs to respect constraints (can't transplant before
  last frost for a frost-tender plant), and downstream events should reflow.

## Constraints

- **Single-user:** No backend with user data; everything in browser localStorage.
- **No accounts:** No auth, no server-side persistence, no shared state between devices.
- **Tech stack:** Open — research selects modern stack appropriate for a drag-gantt + localStorage
  web app (e.g., React + Vite + TS, Svelte, etc.).
- **Hosting:** Likely static-site (GitHub Pages / Netlify / Cloudflare Pages); compatible with
  zero-backend deployment.
- **Polish target:** Share-worthy — not a throwaway prototype. UI/UX needs to be tight enough
  the user would recommend it.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single-user local-only (no auth) | Solo hobby use; remove backend complexity | — Pending |
| Hybrid plant data: curated + Permapeople + user custom | Curated for reliability, API for breadth, custom for edge cases | — Pending |
| ZIP-based frost-date lookup | Simplest UX; covers US and most postal systems | — Pending |
| Timing-only (no beds/layout) | Keeps v1 scope tight; layout can come later if validated | — Pending |
| Both timeline + calendar views | User explicitly wanted both; reasonable to ship together | — Pending |
| Drag-to-adjust with reactive cascade | Makes the gantt actually useful, not just a render | — Pending |
| Browser localStorage persistence | No-backend constraint; export/import JSON for backup | — Pending |
| Stack chosen by research | User has no strong preference; let researchers pick best fit | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-26 after initialization*
