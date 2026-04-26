# Phase 2 Discussion Log

**Date:** 2026-04-26
**Phase:** 2 — Data Layer & First End-to-End
**Mode:** default (advisor mode disabled at user-profile request: "no comparison tables, just recommendations")

---

## Gray areas presented

1. Setup Wizard flow — single screen vs multi-step; first-run vs always; sample-data path
2. Catalog sourcing strategy — manually curated vs Permapeople bulk vs hybrid; format
3. Plant picker UX — search-and-add vs filtered grid vs both; added-state affordance
4. Permapeople CORS spike + fallback — when to spike; what to do if CORS blocks

User selected: **all 4**.

---

## Round 1: Setup Wizard + Catalog sourcing

| Question | Options | Selection |
|---|---|---|
| Setup Wizard flow shape? | Multi-step (3 screens) (Recommended) / Single page / Multi-step + skip-to-finish | **Multi-step (3 screens)** |
| First-run: 'Try with sample plan'? | Yes (Recommended) / No | **Yes** |
| Catalog sourcing strategy? | Manually curated 50 plants (Recommended) / Hybrid 30+Permapeople / Permapeople-first | **Manually curated 50 plants** |
| Catalog file format? | TS const (Recommended) / JSON+Zod / MDX | **TS const** |

→ D-01..D-09 captured.

## Round 2: Plant picker + Permapeople

| Question | Options | Selection |
|---|---|---|
| Plant picker UX? | Search + filter chips (Recommended) / Two-pane / Pure search | **Search + filter chips** |
| When a plant is added? | Card flips + counter pill (Recommended) / Sidebar | **Card flips + counter pill** |
| Permapeople CORS spike timing? | Wave 1 (Recommended) / Inline | **Wave 1 spike** |
| If CORS blocks, fallback? | Worker proxy (Recommended) / Drop CAT-06 / Manual paste | **Cloudflare Worker proxy** |

→ D-10..D-19 captured.

## Unselected gray areas (sensible defaults applied)

- **Custom plant authoring UX:** Modal opened from a "+ Add custom plant" card pinned top-left of catalog grid. "Duplicate from catalog" pre-fill dropdown. Edit/delete from each Custom-badged card. → D-13..D-15.
- **Succession UX & visual treatment:** Toggle on planting card in "My Plan" panel; one row per succession in gantt with subtle left-edge accent. Engine cap at first-fall-frost. → D-20..D-22.
- **Gantt visual treatment:** Extend Phase 1 bare SVG; add monthly axis labels + weekly subticks; season-spanning auto-zoom; lifecycle palette from Phase 1 UI-SPEC. → D-23..D-26.
- **Export/Import UX:** Single button each in /settings. Filename `garden-gantt-plan-{YYYY-MM-DD}.json`. Import preview modal shows planting/custom-plant counts + ZIP, full-overwrite confirm. Schema migration v1→v2 in planStore. → D-27..D-29.

## Deferred ideas captured

- Drag (Phase 3), calendar (Phase 3), tasks (Phase 3), gantt library spike (Phase 3), CAT-V2-01..03 (V2), PWA (Phase 4), encrypted Gist sync (V2 if validated).

## Scope creep redirected

None this session — user stayed on-topic.

## Notes / open items

- Wave 1 CORS spike output goes to `02-CORS-SPIKE.md` and drives whether D-17 (Worker proxy) triggers.
- Phase 1's `samplePlan` doubles as the "Try with sample plan" payload — no duplication.
- Plant id format expands from species-level to variety-level kebab-case during D-29's 1→2 migration.

---

*Phase: 02-data-layer-first-end-to-end*
*Discussion completed: 2026-04-26*
