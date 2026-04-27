# Phase 4: Polish, Mobile & Ship - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 04-polish-mobile-ship
**Areas discussed:** Mobile drag/edit model, Onboarding flow shape, Empty/error/loading + confirm pattern, Export-reminder UX

---

## Mobile drag/edit model

### Q1 — How should bar editing work on a phone-sized viewport?

| Option | Description | Selected |
|--------|-------------|----------|
| Tap-to-edit modal | Phone: tap a bar → modal with date pickers + lock toggle. Cascade preview as text. No touch-drag on phones. Desktop/tablet keeps full drag. | ✓ |
| Full touch drag | Re-use @dnd-kit PointerSensor on phones with long-press disambiguation. Risk: scroll/drag conflict, ghost overlay tuning. | |
| Landscape-only drag, portrait read-only | Phones portrait = read-only; rotate = drag enabled. Orientation-dependent UX surprise. | |
| Calendar-only on phones | Phones default to calendar; gantt route is desktop/tablet only. Smallest surface, loudest UX statement. | |

**User's choice:** Tap-to-edit modal
**Notes:** Phone path goes through a modal — date pickers + lock toggle + delete. Cascade preview rendered as text summary inside the modal.

### Q2 — Where's the mobile/desktop breakpoint?

| Option | Description | Selected |
|--------|-------------|----------|
| 640px (Tailwind sm) | <640 phone, 640+ desktop. Matches Phase 3 D-28 matchMedia hint. | ✓ |
| 768px (Tailwind md) | <768 phone. Pulls iPad portrait into mobile mode. | |
| Pointer-coarse media query | Touch-primary devices get phone behavior regardless of size. Less predictable. | |

**User's choice:** 640px (Tailwind sm)
**Notes:** Single magic number; one `useIsMobile()` hook drives D-01, D-04, CAL-04, D-03.

### Q3 — Where does the lock toggle live on mobile?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside the edit modal | Lock toggle is a row in the tap-to-edit modal alongside dates. Filled-lock indicator on bar still shows status. | ✓ |
| Long-press on bar opens lock-only menu | Tap = edit modal; long-press = lock toggle. Risk: iOS text-select conflict. | |
| Persistent lock icon on every bar at <640px | Drop hover-reveal on phones; always render lock icon; tap toggles. | |

**User's choice:** Inside the edit modal
**Notes:** No second mobile gesture to learn. Phase 3 carry-forward "tap-and-hold equivalent" is mooted.

### Q4 — What does "gantt readable in landscape on phones" mean?

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal scroll, fixed day-width | Existing tokens unchanged; gantt overflows horizontally; sticky plant-name column on left. | ✓ |
| Pinch-zoom + horizontal scroll | Add pinch-zoom on SVG. Fiddly; conflicts with browser defaults. | |
| Fit-to-viewport (compress day-width) | Auto-shrink day-width so season fits phone landscape. Bars become barely-distinguishable bands. | |

**User's choice:** Horizontal scroll, fixed day-width
**Notes:** Sticky left-side plant-name column so plant context survives scroll. No pinch-zoom.

---

## Onboarding flow shape

### Q1 — What's the onboarding shape between "wizard done" and "first usable gantt"?

| Option | Description | Selected |
|--------|-------------|----------|
| Starter pack picker step in wizard | Add wizard step: pick a pre-bundled plant list (salsa garden, salad garden, etc.). | |
| Coach marks on the empty gantt | Overlay tooltips pointing at "Add plants here", "Drag to adjust", "Click to lock". Dismissible. | ✓ |
| Both — starter pack + coach marks | Starter pack populates gantt; coach marks teach interactions. More work. | |
| Empty-state CTA only | No starter pack, no coach marks. Big "Pick your first plant" CTA on empty gantt. | |

**User's choice:** Coach marks on the empty gantt
**Notes:** Starter-pack picker explicitly rejected. Onboarding stays cleanup-scoped, not flow-additive.

### Q2 — Where do tutorial / coach-mark dismissals persist?

| Option | Description | Selected |
|--------|-------------|----------|
| uiStore + persist | onboarding flags in uiStore, persisted via Zustand persist. Settings "Reset onboarding" button re-arms. | ✓ |
| Separate localStorage key | Top-level `garden-gantt:onboarding`. Doesn't bloat plan schema; new I/O boundary. | |
| Inferred from plan state | If plan has 0 plantings, show marks; once they add a plant, never reappear. Loses "never show again". | |

**User's choice:** uiStore + persist
**Notes:** No new I/O boundary. Settings page gets a "Reset onboarding" button.

### Q3 — Which surfaces get coach marks, and when?

| Option | Description | Selected |
|--------|-------------|----------|
| Gantt-only, first visit | Marks on first /plan visit only. Single dismissal flag. Tasks + Calendar self-explain. | ✓ |
| Per-route, first-visit each | Gantt + Tasks + Calendar each have their own marks + dismissed flags. ~3x design + copy work. | |
| Single first-session tour | Sequenced walkthrough across all three views with skip option. More flow logic. | |

**User's choice:** Gantt-only, first visit
**Notes:** Cheapest scope that closes POL-02. One global flag; first dismissal kills the entire set.

### Q4 — Should the wizard re-trigger when plan is reset / cleared?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, settings "Clear plan" → wizard | Cleared plan re-runs SetupWizard. Coach marks do NOT re-show; "Reset Onboarding" is separate. | ✓ |
| No — Settings "Clear plan" lands on empty gantt | Reuse existing location; skip wizard. More frictionless; loses "help me start over". | |

**User's choice:** Yes, settings "Clear plan" → wizard
**Notes:** Clear plan and Reset onboarding are deliberately distinct affordances.

---

## Empty/error/loading + confirm pattern

### Q1 — Loading-state style

| Option | Description | Selected |
|--------|-------------|----------|
| Skeletons for catalog + ZIP-derive; spinner button for Permapeople | Three distinct affordances matched to surface. | ✓ |
| Spinner everywhere | One Loading… spinner reused everywhere. Less polished feel. | |
| Skeletons everywhere | Skeleton variants of every async surface, including Enrich button (awkward). | |

**User's choice:** Skeletons for catalog + ZIP-derive; spinner button for Permapeople

### Q2 — Destructive-action pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Toast-with-undo for reversible; modal for irreversible | Delete planting/custom task → toast w/ undo; clear plan/overwrite import/delete custom plant → modal. | ✓ |
| Modal-confirm everywhere | Every destructive op gets a confirm dialog. Conservative, slower. | |
| Toast-with-undo everywhere | Lean entirely on zundo. Risk: import-overwrite panic moments deserve a confirm. | |

**User's choice:** Toast-with-undo for reversible; modal for irreversible
**Notes:** Toast wires to `temporal.getState().undo()`. Cmd-Z remains as second safety net.

### Q3 — Error-state style

| Option | Description | Selected |
|--------|-------------|----------|
| Inline near the input/action | Red text under ZIP input; pill on enrichment row; inline import error; storage-full = top banner. | ✓ |
| Toast for transient, modal for blocking | Permapeople fail = toast; storage-full = blocking modal. Risk: toast fatigue on flaky API. | |
| Single ErrorBoundary catch-all + inline for known | Known errors inline; unknown falls to top-level boundary. Less granular. | |

**User's choice:** Inline near the input/action

### Q4 — Empty-state copy/CTA tone

| Option | Description | Selected |
|--------|-------------|----------|
| Action-first, terse | "No plants yet. Add your first plant →". One sentence + one button. | ✓ |
| Friendly/themed | "Your garden is bare 🌱 Pick something to grow." Risk: cute fades fast. | |
| Minimal — just a button | No prose, just a button. Loses orientation for first-time users. | |

**User's choice:** Action-first, terse

---

## Export-reminder UX

### Q1 — What triggers an export reminder?

| Option | Description | Selected |
|--------|-------------|----------|
| Dirty-since-last-export, after N edits | Show when ≥20 dirty edits OR ≥14 days since last export AND dirty>0. | ✓ |
| Time-based only | Every 7/14/30 days regardless of activity. Nags inactive users. | |
| Edit-count only | Every Nth save. Over-reminds during heavy planning, under-reminds during quiet stretches. | |
| On-demand only | No auto-reminders; permanent header affordance only. Loses safety net. | |

**User's choice:** Dirty-since-last-export, after N edits

### Q2 — How does the reminder appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Non-blocking banner above content | Slim banner above AppShell content. [Export plan] [Remind me later] [Don't remind 30 days]. | ✓ |
| Modal on app load | Modal fires on next load when threshold met. More forceful; interruptive. | |
| Toast on transition | Toast on navigate-away / beforeunload. Unreliable across browsers. | |
| Header pill / status indicator | Persistent pill: "Last exported 14 days ago". Quietest; relies on noticing. | |

**User's choice:** Non-blocking banner above content

### Q3 — What counts as a "dirty edit"?

| Option | Description | Selected |
|--------|-------------|----------|
| Coarse: drag-commit, planting add/remove, custom plant/task CRUD, location | Schema-meaningful mutations only. Task completion + lock toggle + undo/redo do NOT count. | ✓ |
| Per zundo history entry | Every temporal entry = one dirty edit. Inflates with task-completion toggles. | |
| Per persist write | Every Zustand persist write counts. Inflates on incidental writes. | |

**User's choice:** Coarse mutations only

### Q4 — Where does export-reminder logic land in the schema?

| Option | Description | Selected |
|--------|-------------|----------|
| uiStore: lastExportedAt + dirtySinceExport + snoozedUntil | Bookkeeping in uiStore (already persisted). No plan-schema bump. | ✓ |
| planStore: under plan.metadata | Stick bookkeeping inside plan; export+import preserves it. Forces schema v3→v4; weird import semantics. | |
| Separate localStorage key | Top-level `garden-gantt:export-reminder`. Independent; new I/O boundary. | |

**User's choice:** uiStore + persist
**Notes:** No plan-schema bump. `exportPlan()` gets post-download side effect: `setLastExportedAt(nowISOString())` + `resetDirtyCounter()`.

---

## Claude's Discretion

Areas where the planner picks during planning:

- POL-07 verification method (manual checkpoint + DevTools Performance trace + 200-event fixture)
- POL-08 keyboard drag implementation details (roving tabindex, focus-ring, ARIA announcements, zundo integration)
- POL-09 WCAG AA audit tool selection (axe-core / Lighthouse / manual) and specific token tweaks
- DEPLOY-01 wiring: Cloudflare Pages git integration vs GH Actions + Wrangler
- DEPLOY-03 `public/_headers` file syntax for index.html no-cache rule
- ConstraintTooltip a11y plumbing (`aria-live`, Esc, tab focus)
- Modal copy + native `<input type=date>` integration
- Toast UX details (timeout, animation, position)
- Coach-mark visual style (speech-bubble vs callout vs Linear-style hotspots)
- Sticky plant-name column width tuning
- Skeleton component shape — single primitive vs purpose-built variants
- Banner stack ordering (storage-full > iOS Private > export-reminder)

## Deferred Ideas

See `04-CONTEXT.md` &lt;deferred&gt; section for the canonical list. Highlights:

- Touch drag on phones (rejected; v1.1 maybe)
- Pinch-zoom on the gantt (rejected; v1.1 maybe)
- Starter-pack picker (rejected; v1.1 catalog feature)
- Per-route coach marks (rejected; tasks + calendar self-explain)
- Single first-session tour (rejected for scope)
- PWA / service worker (PROJECT.md POWER-V2-03; v2)
- Print + PDF export (SHARE-V2-01/02; v2)
- Custom domain registration (out of v1; planner wires if user supplies)
- Per-PR preview deploys (planner's call; not required)
- Tooltip frost-date uncertainty band (discretionary; planner picks if scope allows)
- Themed/cute empty-state copy (rejected)
- Per-mark coach mark dismissal granularity (rejected — single global flag)
