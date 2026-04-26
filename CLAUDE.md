<!-- GSD:project-start source:PROJECT.md -->
## Project

**Garden Gantt**

A single-user web app that turns a ZIP code and a plant list into an interactive, drag-adjustable
Gantt chart of the gardening season — indoor seed starting, hardening off, transplant, harvest,
succession plantings, and checkable garden tasks. Built for a hobby gardener who wants to replace
spreadsheets and seed-packet math with a visual schedule that's actually trustworthy enough to
recommend to other gardeners.

**Core Value:** **Plug in your ZIP and your plants → get a correct, draggable lifecycle gantt for the season.**

Everything else (tasks, calendar view, custom plants, succession) is supporting cast. If the
core scheduling math is wrong or the gantt isn't usable, the app fails.

### Constraints

- **Single-user:** No backend with user data; everything in browser localStorage.
- **No accounts:** No auth, no server-side persistence, no shared state between devices.
- **Tech stack:** Open — research selects modern stack appropriate for a drag-gantt + localStorage
  web app (e.g., React + Vite + TS, Svelte, etc.).
- **Hosting:** Likely static-site (GitHub Pages / Netlify / Cloudflare Pages); compatible with
  zero-backend deployment.
- **Polish target:** Share-worthy — not a throwaway prototype. UI/UX needs to be tight enough
  the user would recommend it.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Bottom Line (TL;DR)
| Concern | Choice | Why |
|---|---|---|
| Framework | **React 19 + Vite 7 + TypeScript 6** | Best gantt/calendar ecosystem; well-known; excellent DX with Vite |
| Gantt | **SVAR React Gantt** (`@svar-ui/react-gantt` v2.6) — fallback: **Frappe Gantt** v1.0.3 | MIT, modern, drag/cascade built-in; Frappe as lightweight backup |
| Calendar | **FullCalendar 6.1** (`@fullcalendar/react`) | Mature, free for non-resource-timeline use, month/week/day views |
| Dates | **date-fns v4** + **@date-fns/utc** | Tree-shakable; v4 timezone-clean; safe for frost-date math |
| State | **Zustand v5** with `persist` middleware | Built-in localStorage persistence; perfect for cascade computations |
| Styling | **Tailwind CSS v4** | Fast iteration to share-worthy polish; tiny prod bundles |
| ZIP data | **Static JSON ship** built from `waldoj/frostline` (zones) + NOAA frost-date GHCN | No runtime API dependency; offline-capable |
| Plant API | **Permapeople** (graceful fallback; manual key approval) | Only enrichment; curated catalog is the source of truth |
| Hosting | **Cloudflare Pages** | Unlimited bandwidth on free tier, fast global edge |
| Test | **Vitest 4 + Playwright 1.59** | Vite-native; Vitest 4 browser mode covers drag testing |
## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **React** | `19.2.5` | UI framework | Largest ecosystem of gantt/calendar/DnD libraries. The interactive gantt question alone tilts the framework decision — Frappe, SVAR, FullCalendar, vis-timeline all have first-class React support. Solo dev productivity is highest in the framework with the most working examples and the most LLM training mass. |
| **Vite** | `7.0.0+` | Dev server + build | Standard 2026 default. Instant HMR critical for iterating drag interactions. `vite build` outputs static assets that drop into any static host. |
| **TypeScript** | `6.0.3` | Type safety | Required for share-worthy polish. Frost-date math, plant timing, and cascade computations all benefit from strict typing. Catches the "I forgot succession was an array" bugs at compile time. |
| **React Router** | `7.14.2` | Client-side routing | Toggling timeline ↔ calendar views, plant detail panes, settings — even single-user apps need URL-as-state for back button + shareable internal nav. Use in SPA mode (no SSR). |
### Gantt Chart (the most consequential pick)
| Library | Version | Recommendation |
|---------|---------|---------------|
| **SVAR React Gantt** (`@svar-ui/react-gantt`) | `2.6.1` | **PRIMARY CHOICE** |
| **Frappe Gantt** | `1.0.3` | **FALLBACK** if SVAR maintenance proves shaky |
| dhtmlx-gantt (GPL build) | `8.5.0` | Avoid for this project |
| Bryntum Gantt | `7.2.3` | Avoid (commercial, expensive) |
| gantt-schedule-timeline-calendar | `3.42.11` | Avoid (AGPL-3.0 commercial license required) |
| vis-timeline | `8.5.0+` | Acceptable fallback for timeline-only (no dependency cascade) |
| Custom (@dnd-kit + interact.js) | — | Last resort — significant build cost |
- MIT license (re-licensed at v2.4) — usable in any deployment
- Built specifically for React with TypeScript types
- Drag-to-adjust + dependency support OOTB
- Configurable time scales (days/weeks/months) — needed for a season view zoomed at the day level
- Active development; the open-source community edition includes the interactions Garden Gantt needs (move task, drag-resize, dependencies). Auto-scheduling is PRO-only — Garden Gantt does its own cascade math anyway, so this is fine.
- Battle-tested (5.9k stars, 42k weekly downloads), MIT, simple
- v1.0.3 (Feb 2025) added `move_dependencies` for cascade — it works
- BUT: bare-DOM (SVG + vanilla JS); React wrappers (`frappe-gantt-react`, `react-frappe-gantt`) are community-maintained and lag the core
- Use Frappe if SVAR's MCP-server-and-dual-license vibe is too much; you ship a slightly less polished but rock-solid widget
### Calendar View
| Library | Version | Recommendation |
|---------|---------|---------------|
| **FullCalendar** | `6.1.20` | **PRIMARY** |
| react-big-calendar | `1.19.4` | Alternative if FullCalendar feels heavy |
- Premium plugins (resource timelines, etc.) cost money — Garden Gantt does NOT need any of those. The free `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction` plugins cover month/week views and event-clicking.
- Most mature calendar component; "looks like a calendar" out of the box (share-worthy polish goal)
- Works fine with Vite SPA + React 19
### Dates
| Library | Version | Purpose |
|---------|---------|---------|
| **date-fns** | `4.1.5` | Pure date arithmetic |
| **@date-fns/utc** | `2.1.1` | UTC `Date` wrapper for timezone-safe storage |
- Temporal hit Stage 4 in March 2026 and is shipping in Firefox 139, Chrome 144 — but Safari has it under a flag, mobile coverage is partial
- The `temporal-polyfill` (0.3.2) and `@js-temporal/polyfill` are ~20KB and ~60KB respectively — significant for a static SPA
- date-fns v4 + `@date-fns/utc` is 13–17KB tree-shaken, mature, zero gotchas, well-known
- **Action:** Migrate to native Temporal in a v2 milestone after Safari ships unflagged. For v1, date-fns is the boring correct choice.
- Moment is officially deprecated — never start a new project with it
- Day.js is fine but smaller surface area; date-fns has stronger UTC story for "store dates as UTC, render in user TZ" — exactly what Garden Gantt needs (frost dates are local-noon UTC events)
- Luxon is 23KB and built around the `DateTime` object — heavier; better when you need extensive localization (Garden Gantt is single-user English)
### State Management
| Library | Version | Purpose |
|---------|---------|---------|
| **Zustand** | `5.0.12` | Global state with localStorage persistence |
| **immer** | (bundled with Zustand `immer` middleware) | Immutable updates for nested plant/task data |
- Built-in `persist` middleware → wires up localStorage in 4 lines
- Reactive subscriptions match the cascade need: drag a bar → `setBarStart(plant_id, date)` → derived selectors recompute downstream events → only affected components re-render
- ~1KB; no Provider wrapper required (matters less here, but means fewer rebuilds while iterating)
- Best ecosystem for the "single store, lots of derived state" pattern this app needs
- **Jotai** — atomic stores excel when state is scattered; Garden Gantt has one cohesive plan document, not 50 independent atoms. `atomWithStorage` works but `persist` is more ergonomic for whole-document save.
- **Redux Toolkit** — overkill, more ceremony than this app needs
- **React Context + useReducer** — workable, but you'll reinvent persistence and reactivity primitives; better to lean on Zustand
- **Svelte stores** — only relevant if you picked Svelte (we didn't)
### UI / Styling
| Tool | Version | Purpose |
|------|---------|---------|
| **Tailwind CSS** | `4.2.4` | Utility-first styling |
| **shadcn/ui** | (copy-paste, no version) | Pre-built accessible components |
| **lucide-react** | latest | Icons (gardening icons + UI chrome) |
- v4 ships a new Vite-native engine; sub-100ms style rebuilds
- Tiny production CSS (~10kB typical for an app this size) — share-worthy load times
- Pairs with shadcn/ui — pre-built buttons/dialogs/dropdowns get you to share-worthy polish in days, not weeks
- For a solo dev with no design budget, Tailwind + shadcn/ui = "looks designed"
- CSS Modules — more verbose for a polish-driven app; you'll write more CSS than necessary
- Vanilla Extract — beautiful tooling but heavier setup; overkill for this
- PandaCSS — modern but smaller community; Tailwind has more LLM training mass for AI-assisted iteration
- Pico — easy but generic; harder to make share-worthy unique
### ZIP → Zone + Frost Dates Data
| Source | Data | Strategy |
|--------|------|----------|
| **waldoj/frostline** ([GitHub](https://github.com/waldoj/frostline)) | ZIP → USDA Hardiness Zone | Build-time: parse to `data/zones.json` |
| **NOAA NCEI GHCN frost statistics** ([NOAA Climate](https://www.ncei.noaa.gov/products/coordinates/frost-freeze)) | ZIP → 50%-probability last spring & first fall freeze | Build-time: derive from nearest weather station per ZIP |
| **AWS Marketplace USDA Plant Hardiness Zones by ZIP** | Updated monthly | Optional fresher fallback if frostline is stale |
- A zero-backend SPA with a runtime API dependency is fragile — phzmapi.org could go dark, kill your app
- Total dataset for ~42k US ZIPs at zone + 2 frost dates = ~2-3 MB JSON; gzipped ~300-500 KB, lazy-loaded on demand
- Better UX: instant zone lookup, works offline once cached
- Build a small node script `scripts/build-zone-data.ts` that fetches sources at build time → emits `public/data/zones.{firstChar}.json` (split by first ZIP digit so each chunk is ~30 KB)
### Plant Data: Permapeople API
| Item | Finding |
|------|---------|
| Auth | Header-based: `x-permapeople-key-id` + `x-permapeople-key-secret` |
| Base URL | `https://permapeople.org/api` |
| Rate limits | **NOT documented**. Treat as unknown — implement client-side throttle + retry-with-backoff |
| CORS | **Not documented**. CRITICAL RISK: if no CORS, browser-only call is impossible |
| License | CC BY-SA 4.0 (attribution + share-alike required); commercial use needs permission |
| Timing data? | **NO** — only botanical metadata (Edible, Growth, Water, Light, USDA zone, Layer, Soil, Family, Edible parts). **No sow/transplant/harvest dates.** |
| Last doc update | May 2021 — stale documentation |
- Permapeople CANNOT supply timing constants. The curated catalog is THE source of timing truth.
- Permapeople is enrichment-only: descriptions, images, family/genus, alternate names
- Design the app to work fully without Permapeople. Optional toggle in settings.
- Test CORS behavior early (Phase 1) — if CORS blocks browser calls, you need either (a) a proxy (breaks no-backend constraint) or (b) drop the API entirely.
- Add attribution UI: "Plant data enriched by Permapeople.org (CC BY-SA 4.0)"
### Hosting
| Platform | Recommendation |
|----------|---------------|
| **Cloudflare Pages** | **PRIMARY** — unlimited bandwidth free tier, 300+ edge locations, sub-50ms global latency |
| Netlify | Acceptable, more polished UI, but bandwidth limits matter if app gets recommended widely |
| GitHub Pages | Workable but no rewrites for SPA routing without hash mode; worse perf |
| Vercel | Overkill (no need for Next.js features); free tier bandwidth limited |
- Free tier: unlimited bandwidth + 500 builds/month + 100 sites — comfortable headroom for "recommend to other gardeners"
- SPA fallback rewrite (`/* → /index.html`) is one-line config
- No serverless functions needed (zero backend), so Vercel/Netlify advantages don't apply
### Testing
| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | `4.1.0` | Unit + integration tests for date math, cascade logic |
| **@vitest/browser** + Playwright | Vitest 4 native browser mode | Component tests with real DOM (gantt drag) |
| **Playwright** | `1.59.1` | E2E tests (5-10 critical paths only) |
| **MSW** | latest | Mock Permapeople API in tests |
## Installation
# Scaffold (preserves Vite + React + TS)
# Core
# State
# Dates
# Gantt + calendar
# Styling
# Testing
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| React + Vite | SvelteKit (static adapter) | Solo dev who already knows Svelte well; willing to write own gantt or live with `wx-svelte-gantt` (SVAR Svelte equivalent). Better runtime perf but smaller gantt/calendar ecosystem. |
| React + Vite | SolidJS | Performance-critical UI with deep custom rendering; SVAR also has Solid bindings. Acceptable but smaller community. |
| React + Vite | Vanilla TS | A toy project. Garden Gantt's interactivity bar is too high. |
| SVAR React Gantt | Frappe Gantt | If SVAR shows maintenance issues; or you want zero-React-coupling. Pair with `frappe-gantt-react` wrapper. |
| FullCalendar | react-big-calendar | If you want zero license worries about premium plugins; willing to do more visual polish work. |
| date-fns v4 | Temporal API (polyfilled) | Wait until Safari ships unflagged + you want native long-term solution. Add to v2 milestone. |
| Zustand | Jotai (`atomWithStorage`) | If you find the cascade easier to express as derived atoms (graph-of-atoms) than as a single store. |
| Tailwind v4 | CSS Modules | Strong design opinions, you want hand-crafted CSS, willing to write more code. |
| Cloudflare Pages | Netlify | You want deploy previews + form handling + GUI dashboard polish, OK with bandwidth caps. |
| Vitest | Jest | Existing Jest expertise + non-Vite project (not us). |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **dhtmlx-gantt (commercial editions)** | Costs money, overkill for this app | SVAR React Gantt (MIT) |
| **Bryntum Gantt** | Commercial, expensive licensing for what is essentially a hobby app | SVAR or Frappe |
| **gantt-schedule-timeline-calendar** | AGPL-3.0 — viral copyleft will scare off recommendations / share-worthiness; commercial license required to avoid | SVAR (MIT) |
| **Moment.js** | Officially deprecated; bundle-bloat | date-fns v4 |
| **Redux + Redux Toolkit** | Excessive ceremony for a single-user app with one document | Zustand |
| **Next.js / Remix / React Router 7 framework mode** | SSR features useless for a no-backend SPA; build complexity for nothing | Vite + React Router (SPA mode) |
| **Create React App** | Officially sunset; deprecated | Vite |
| **Material UI** | Heavy bundle, generic look — opposite of "share-worthy unique" | Tailwind + shadcn/ui (copy-paste components) |
| **Live OpenFarm API** | Service shut down April 2025 | Static curated JSON catalog |
| **phzmapi.org runtime calls** | Single-source-of-failure dependency for a "no backend" app | Ship the data as static JSON |
| **Permapeople as primary plant data source** | Doesn't have timing data; CORS unverified; key approval is manual | Curated JSON is primary; Permapeople is optional enrichment |
| **localForage with IndexedDB** | Overkill; data fits in 5MB localStorage budget for any realistic plan | localStorage via Zustand `persist` |
## Stack Patterns by Variant
- Drop Permapeople from v1; curated catalog only
- Or: build a tiny Cloudflare Worker proxy (still effectively zero-backend; ~10 lines of code)
- Add `vite-plugin-pwa` for service worker
- Cache the static zone data + plant catalog
- Sync model already works offline (localStorage)
- The Zustand JSON state is portable. Layer in something like Yjs + a CRDT sync server, or simpler: encrypted backup to user's own GitHub Gist via personal access token
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| react@19 | react-router@7 | RR7 declares React 19 dep |
| vite@7 | react@19 | Standard combo as of 2026 |
| tailwindcss@4 | vite@7 | Use `@tailwindcss/vite` plugin (NOT the legacy PostCSS pipeline) |
| @fullcalendar/react@6.1 | react@19 | Confirmed working; ensure all `@fullcalendar/*` plugins are same major version |
| @svar-ui/react-gantt@2.6 | react@19 | TypeScript types included |
| date-fns@4 | @date-fns/utc, @date-fns/tz | v4 introduced first-class time-zone classes |
| zustand@5 | react@19 | v5 dropped React 17 support; React 18+ only |
| vitest@4 | vite@7 | Major versions tracked together |
## Sources
- npm registry (live queries 2026-04-26) — react@19.2.5, vite@8.0.10, typescript@6.0.3, zustand@5.0.12, tailwindcss@4.2.4, date-fns@4.1.5, vitest@4.1.0, @svar-ui/react-gantt@2.6.1, frappe-gantt@1.2.2, @fullcalendar/react@6.1.20, react-router@7.14.2, @playwright/test@1.59.1, temporal-polyfill@0.3.2 — HIGH confidence
- [PkgPulse: State of React State Management 2026](https://www.pkgpulse.com/blog/state-of-react-state-management-2026) — MEDIUM
- [Frontend Tools: React vs Vue vs Svelte vs SolidJS 2025](https://www.frontendtools.tech/blog/best-frontend-frameworks-2025-comparison) — MEDIUM
- [Strapi: Svelte vs React in 2026](https://strapi.io/blog/svelte-vs-react-comparison) — MEDIUM
- [SVAR React Gantt repo](https://github.com/svar-widgets/react-gantt) — MIT confirmed, drag/dependencies confirmed
- [SVAR Gantt 2.4 announcement (MIT relicense)](https://dev.to/olga_tash/svar-gantt-24-a-free-modern-gantt-chart-for-react-svelte-2e07) — HIGH
- [Frappe Gantt repo](https://github.com/frappe/gantt) — MIT, v1.0.3 (Feb 2025), `move_dependencies` confirmed — HIGH
- [Bryntum: Top 5 JavaScript Gantt chart libraries in 2026](https://bryntum.com/blog/top-5-javascript-gantt-chart-libraries/) — MEDIUM (vendor blog)
- [DHTMLX: Top 8 JavaScript Gantt Chart Libraries 2026](https://dhtmlx.com/blog/top-8-javascript-gantt-chart-libraries-2026/) — MEDIUM (vendor blog)
- [Bryntum: React FullCalendar vs Big Calendar](https://bryntum.com/blog/react-fullcalendar-vs-big-calendar/) — MEDIUM
- [LogRocket: Best React scheduler component libraries](https://blog.logrocket.com/best-react-scheduler-component-libraries/) — MEDIUM
- [date-fns v4 timezone support](https://blog.date-fns.org/v40-with-time-zone-support/) — HIGH (official)
- [PkgPulse: date-fns v4 vs Temporal API vs Day.js 2026](https://www.pkgpulse.com/blog/date-fns-v4-vs-temporal-api-vs-dayjs-date-handling-2026) — MEDIUM
- [Bryntum: JavaScript Temporal in 2026](https://bryntum.com/blog/javascript-temporal-is-it-finally-here/) — MEDIUM
- [TC39 Temporal proposal](https://github.com/tc39/proposal-temporal) — HIGH (official)
- [DEV: State Management in 2026 — Zustand vs Jotai vs Redux Toolkit](https://dev.to/jsgurujobs/state-management-in-2026-zustand-vs-jotai-vs-redux-toolkit-vs-signals-2gge) — MEDIUM
- [Zustand persist middleware docs](https://zustand-demo.pmnd.rs/) — HIGH (official)
- [Frontend Hero: Tailwind v4 vs CSS Modules 2026](https://frontend-hero.com/tailwind-vs-css-modules) — MEDIUM
- [LogRocket: A dev's guide to Tailwind CSS in 2026](https://blog.logrocket.com/tailwind-css-guide/) — MEDIUM
- [USDA Plant Hardiness Zone Map (official)](https://planthardiness.ars.usda.gov/) — HIGH (official)
- [waldoj/frostline](https://github.com/waldoj/frostline) — MIT, parses PRISM data — HIGH (verified)
- [Old Farmer's Almanac frost dates](https://www.almanac.com/gardening/frostdates) — MEDIUM (commercial site, no public API)
- [NOAA Climate Frost/Freeze](https://www.ncei.noaa.gov/products/coordinates/frost-freeze) — HIGH (official source)
- [Permapeople API docs](https://permapeople.org/knowledgebase/api-docs/) — HIGH (direct fetch). Key facts: header auth, no rate limit docs, no CORS docs, only botanical metadata, last updated May 2021, manual key approval, CC BY-SA 4.0.
- [DanubeData: Cloudflare Pages vs Netlify vs Vercel 2026](https://danubedata.ro/blog/cloudflare-pages-vs-netlify-vs-vercel-static-hosting-2026) — MEDIUM
- [HostMeloud: Cloudflare Pages 2026 Guide](https://hostmeloud.com/cloudflare-pages-2026-guide/) — MEDIUM
- [agentdeals: Hosting Free Tier Comparison 2026](https://agentdeals.dev/hosting-free-tier-comparison-2026) — MEDIUM
- [PkgPulse: Vitest 3 vs Jest 30: Testing in 2026](https://www.pkgpulse.com/blog/vitest-3-vs-jest-30-2026) — MEDIUM
- [Vitest browser mode docs](https://vitest.dev/config/browser/playwright) — HIGH (official)
- [DEV: Vitest vs Jest 30 — Year of Browser-Native Testing](https://dev.to/dataformathub/vitest-vs-jest-30-why-2026-is-the-year-of-browser-native-testing-2fgb) — MEDIUM
## Risks & Watch-Outs (Bake Into Roadmap)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
