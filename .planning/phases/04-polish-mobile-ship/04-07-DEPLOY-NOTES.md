# Phase 4 Plan 04-07 — Deploy Notes

Status: **code complete; manual perf + deploy gates DEFERRED to user**

This document captures the manual steps the user must perform to close out the
three checkpoint tasks of Plan 04-07 (POL-07 perf check, DEPLOY-01 Cloudflare
Pages connection, DEPLOY-03 cache-header verification + smoke).

The autonomous code-side of the plan (stress fixture, `?stress=1` hook, `_headers`)
is already shipped — see commits `ac63873`, `dc40837`, `5b6feeb`. After the user
performs the steps below they should record results here and re-run
`/gsd-verify-phase 4`.

---

## Task 2 — POL-07 perf checkpoint (DEFERRED — needs headed Chrome)

### Status

`human-action-deferred` — DevTools Performance trace cannot be captured in this
sandbox (no headed Chrome binary). Code-side ready: stress fixture committed,
`?stress=1` URL hook wired into AppShell.

### Steps to perform locally

```bash
npm run dev
# Open in Chrome:
# http://localhost:5173/?stress=1#/plan
```

The `?stress=1` query param triggers `AppShell.tsx`'s `import.meta.env.DEV`-gated
hook, which calls `planStore.replacePlan(stressFixture)` before the gantt mounts.
The page should render ~500 schedule bars (heterogeneous types: indoor-start,
transplant, direct-sow, harvest-window, harden-off-day, water-seedlings, etc.).

Then, in Chrome DevTools:

1. Open **Performance** tab → click **Record**
2. Tab into the gantt (skip-to-main → Tab to first bar)
3. Hold `ArrowRight` for ~3 seconds (pending-edit staging via `useKeyboardBarDrag`)
4. Press `Enter` to commit
5. Press `ArrowLeft` a few times then `Esc` to cancel
6. Stop the recording

### What to record

Append the following block to this file:

```
### POL-07 trace results (filled in by user)

- Date: YYYY-MM-DD
- Browser: Chrome XXX
- Median frame time during arrow-key spam: __ ms
- Max frame time: __ ms
- Long tasks (>50ms) on main thread: __ count
- Lighthouse Performance score (Slow 4G + Mid-tier mobile): __ / 100
- Verdict: pass | fail
- Screenshot path (if saved): __
```

Acceptance per plan: median frame time ≤ 20ms (50fps); ideally ≤ 16.7ms (60fps).
If perf is unacceptable, surface remediation suggestions here (memoization,
virtualization, rAF batch tuning) before resuming.

### Why deferred

Auto-mode rule: `For perf checkpoints with measurable thresholds: if you can
simulate the stress in tests, do so… If only manual verification is possible,
document and mark as deferred.` Sandboxed CI cannot run a Performance trace.

### POL-07 trace results (filled in by user)

- Date: 2026-04-27
- Browser: Chrome DevTools trace (exact Chrome version not present in trace metadata)
- Trace file: `Trace-20260427T115427.json.gz`
- Median frame time during arrow-key spam: 9.37 ms
- Max frame time: 26.93 ms during primary arrow-key hold; 128.20 ms across the full interaction window including commit/cancel
- Long tasks (>50ms) on main thread: 0 during primary arrow-key hold; 2 across the full interaction window, both around commit/cancel key events
- Lighthouse Performance score (Slow 4G + Mid-tier mobile): 92 / 100 on production preview (`http://10.3.0.132:4174/`)
- Invalid dev-server Lighthouse runs: 35 / 100 initial run with cache-clearing timeout; 44 / 100 clean Incognito rerun without cache warning, but both were captured against the Vite dev server rather than a production build
- Lighthouse report file: `10.3.0.132_5173-20260427T120225.json`
- Verdict: pass

Notes:

- The keyboard-drag trace itself satisfies the median frame-time and primary arrow-key long-task criteria.
- The Lighthouse JSON shows the low score was dominated by dev-server artifacts: `@vite/client`, `@react-refresh`, 141 script requests, 5.7 MiB of script transfer, and unminified/unused JavaScript warnings. Do not use that score as the production deploy gate.
- `npm run build` initially exposed a TypeScript exact-optional-props error in `CustomPlantModal.tsx`; fixed locally by omitting `onRequestDelete` when undefined. Production build then passed.
- Production preview is available at `http://10.3.0.132:4174/`. The `?stress=1` fixture hook is dev-only, so the production Lighthouse run measures the normal production app bundle while the DevTools trace measures the stress fixture keyboard-drag path.

---

## Task 3 — DEPLOY-01 Cloudflare Pages connection (DEFERRED — needs OAuth)

### Status

`human-action-deferred` — Cloudflare Pages git integration requires the user to
OAuth GitHub from the Cloudflare dashboard. Code-side ready: `_headers`,
`_redirects`, and a clean `npm run build → dist/` are all committed and
verified locally.

### Steps to perform

1. Open <https://dash.cloudflare.com/>
2. **Workers & Pages → Create → Pages → Connect to Git**
3. Authorize Cloudflare to access your GitHub account; select the `garden_gantt` repo
4. Configure the build:
   - **Production branch:** `main`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** leave blank (default = repo root)
5. Add environment variable (required for Vite 7+ / TS 6 toolchain):
   - **Name:** `NODE_VERSION`
   - **Value:** `20` (or `22` for safety)
   - **Where:** Project settings → Environment variables → **Production**
6. Click **Save and Deploy**. First build takes ~2–4 minutes.
7. Once green, the deployed URL is `https://{project-name}.pages.dev`.

### What to record

Append to this file:

```
### DEPLOY-01 result (filled in by user)

- Deployed URL: https://__.pages.dev
- First-build status: green | failed
- First-build duration: __ minutes
- NODE_VERSION confirmed in build log: yes | no
- Verdict: pass | fail
```

If the build fails with a Node-version error, that's the most common cause —
double-check `NODE_VERSION=20` is set as a **Production** env var (not Preview).

### Why deferred

Auto-mode rule: `For human-action gates that require credentials/auth (e.g.,
Cloudflare API token, deploy commands requiring secrets, GitHub Actions secret
setup): DO NOT attempt to bypass them.` Cloudflare Pages git integration cannot
be triggered programmatically — it requires the user's GitHub OAuth + dashboard
project creation.

---

## Task 4 — DEPLOY-03 cache headers + deploy smoke (DEFERRED — depends on Task 3)

### Status

`human-action-deferred` — depends on a live deployed URL from Task 3.

### Verification commands

```bash
# Replace {project} with the actual Cloudflare Pages project name from Task 3.
DEPLOY_URL="https://{project}.pages.dev"

# 1. /index.html cache header — expect: cache-control: no-cache, no-store, must-revalidate
curl -I "$DEPLOY_URL/index.html" | grep -i cache-control

# 2. /assets/* cache header — expect: cache-control: public, max-age=31536000, immutable
ASSET_PATH=$(curl -s "$DEPLOY_URL/" | grep -oP 'assets/\S+?\.js' | head -1)
curl -I "$DEPLOY_URL/$ASSET_PATH" | grep -i cache-control
```

If either header is wrong, `_headers` did not propagate. Verify `dist/_headers`
exists post-build (it does locally — checked at commit `dc40837`) and that the
Pages dashboard shows the headers under Project → Functions → Headers.

### Functional smoke (manual at deployed URL)

Tick each box. If anything fails, note details.

- [ ] `/setup` wizard works (enter ZIP → derives zone + frost dates)
- [ ] `/plan` renders gantt with the user's plant choices
- [ ] Drag a bar (desktop) — cascades and snaps to constraints
- [ ] `/tasks` shows Today / This Week / Overdue sections
- [ ] Switch to calendar tab → events visible
- [ ] Settings → Export plan → JSON downloads → confirmation toast
- [ ] Settings → Reset onboarding → revisit `/plan` → coach mark 1 appears
- [ ] Settings → Clear plan → modal-confirm appears; cancel works
- [ ] Resize <640px (or DevTools mobile emulation): default view = calendar; gantt has sticky plant column + tap-to-edit modal

### A11y smoke (manual at deployed URL)

- [ ] Tab from page top → Skip-to-main link visible + focused
- [ ] Tab again → focuses something inside `<main>`
- [ ] Visit `/plan`, Tab to first bar, ArrowRight 3×, Enter → commits via keyboard drag
- [ ] Esc on a constraint violation tooltip → tooltip dismisses

### Deploy propagation test

1. Make a trivial code change (e.g., add a comment to a file)
2. `git push` to main
3. Wait ~3 minutes for Cloudflare Pages to rebuild
4. Hard-refresh the deployed URL → verify the change appears

### What to record

Append to this file:

```
### DEPLOY-03 + smoke results (filled in by user)

- /index.html cache-control: __
- /assets/* cache-control: __
- Functional smoke: __ / 9 pass
- A11y smoke: __ / 4 pass
- Propagation test: pass | fail (round-trip __ minutes)
- Verdict: pass | fail
```

---

## Summary of human-action gates in Plan 04-07

| Gate | Type | Reason | Code-side ready? |
|------|------|--------|------------------|
| Task 2 — POL-07 perf | human-action-deferred | Needs headed Chrome DevTools Performance trace | Yes (stress fixture + `?stress=1` hook) |
| Task 3 — DEPLOY-01 | human-action-deferred | Needs Cloudflare GitHub OAuth + dashboard config | Yes (`_headers`, `_redirects`, clean build) |
| Task 4 — DEPLOY-03 + smoke | human-action-deferred | Needs deployed URL from Task 3 | Yes (curl recipes + smoke checklist) |

After completing the manual steps above and recording results, run
`/gsd-verify-phase 4` to gate Phase 4 closure.
