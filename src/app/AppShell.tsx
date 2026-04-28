// src/app/AppShell.tsx
// Layout shell per .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Layout Shell
// Phase 2 (Plan 02-10): adds /catalog nav link, MyPlanPill (top-right of header), MyPlanPanel
// drawer (Radix portal), and PermapeopleAttributionFooter (CC BY-SA 4.0; conditional).
//
// Phase 3 (Plan 03-06):
// - Mounts useHistoryKeybindings (Cmd-Z / Cmd-Shift-Z / Ctrl-Y) at the shell level (D-18).
// - Mounts useLockKeybinding (document Alt-click → toggle lock) at the shell level (D-11).
// - Renders Undo / Redo header buttons on /plan and /tasks routes (UI-SPEC §11) — disabled
//   when the respective stack is empty. Native `title` tooltip is used for hover hint;
//   the Radix Tooltip 200ms-delay polish per UI-SPEC §11 is a Phase 4 follow-up.
// - Mounts <ConstraintTooltip /> at the top level (portaled — outlives any route mount).
//   Replaces the temporary mount inside DragLayer.tsx from Plan 03-03.
//
// Source: [CITED: 02-UI-SPEC.md §Component Inventory item 10]
//         [CITED: 02-PATTERNS.md src/app/AppShell.tsx (EXTEND)]
//         [CITED: 02-10-PLAN.md Task 2 Step 2]
//         [CITED: 03-CONTEXT.md D-11, D-18]
//         [CITED: 03-UI-SPEC.md §11 Header undo/redo affordance]
import { useEffect, useState, type ReactNode } from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { Banner } from './Banner';
import { StorageFullBanner } from './StorageFullBanner';
import { ExportReminderBanner } from '../features/export-reminder/ExportReminderBanner';
import { MyPlanPill } from '../features/catalog/MyPlanPill';
import { MyPlanPanel } from '../features/catalog/MyPlanPanel';
import { PermapeopleAttributionFooter } from './PermapeopleAttributionFooter';
import { CoachMarks } from '../features/onboarding/CoachMarks';
import { ToastHost } from '../ui/toast/ToastHost';
import { SkipToMain } from '../ui/SkipToMain';
import { useUIStore } from '../stores/uiStore';
import { useShouldShowExportReminder } from '../features/export-reminder/useExportReminder';
import { usePlanStore, useTemporalStore, getTemporal } from '../stores/planStore';
import { useHistoryKeybindings } from '../stores/historyBindings';
import { useLockKeybinding } from '../features/gantt/lock/useLockKeybinding';
import { ConstraintTooltip } from '../features/gantt/tooltip/ConstraintTooltip';
import { cn } from '../ui/cn';

// Plan 04-07 Task 2 — POL-07 perf-checkpoint loader.
// Dev-only `?stress=1` URL hook: imports the 200-event stress fixture and
// replaces the planStore so DevTools Performance traces have a realistic
// stress surface (~500 schedule events). Tree-shaken from production builds
// via the import.meta.env.DEV gate. The dynamic import keeps tests/ out of
// the production bundle entirely.
if (
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('stress')
) {
  void import('../../tests/fixtures/200-event-stress').then(({ stressFixture }) => {
    usePlanStore.getState().replacePlan(stressFixture);
  });
}

interface NavLink {
  href: string;
  label: string;
  hash: string;
}

const NAV_LINKS: NavLink[] = [
  { href: '#/setup', label: 'Setup', hash: '#/setup' },
  { href: '#/plan', label: 'Plan', hash: '#/plan' },
  { href: '#/catalog', label: 'Catalog', hash: '#/catalog' },
  { href: '#/tasks', label: 'Tasks', hash: '#/tasks' },
  { href: '#/settings', label: 'Settings', hash: '#/settings' },
];

function useCurrentHash(): string {
  const [hash, setHash] = useState<string>(() =>
    typeof window === 'undefined' ? '' : window.location.hash || '#/plan',
  );
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/plan');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const currentHash = useCurrentHash();
  const plan = usePlanStore((s) => s.plan);

  // Phase 3 Plan 03-06: mount global keybindings + Alt-click lock listener once.
  useHistoryKeybindings();
  useLockKeybinding();

  // Phase 4 Plan 04-06 — banner-stack selector. Priority order (UI-SPEC §Banner stack,
  // RESEARCH Open Question 1 recommendation a): storage-full > iOS Private > export-reminder.
  // Only ONE banner renders at a time so the user never sees a stack of competing alerts.
  const isStorageFull = useUIStore((s) => s.isStorageFull);
  const isStorageAvailable = useUIStore((s) => s.isStorageAvailable);
  const bannerDismissed = useUIStore((s) => s.bannerDismissed);
  const exportReminder = useShouldShowExportReminder();

  let banner: ReactNode = null;
  if (isStorageFull) banner = <StorageFullBanner />;
  else if (!isStorageAvailable && !bannerDismissed) banner = <Banner />;
  else if (exportReminder.shouldShow) banner = <ExportReminderBanner />;

  // UI-SPEC §10 line 517: hide MyPlanPill on /setup when plan === null (first-run).
  // Once a plan exists (Step 1 done) OR the user is anywhere outside the wizard, show it.
  const hideMyPlanPill = plan === null && currentHash.startsWith('#/setup');

  // Phase 3 Plan 03-06 — UI-SPEC §11: visible Undo/Redo only on /plan and /tasks routes.
  const showHistoryButtons =
    currentHash.startsWith('#/plan') || currentHash.startsWith('#/tasks');
  const canUndo = useTemporalStore((s) => s.pastStates.length > 0);
  const canRedo = useTemporalStore((s) => s.futureStates.length > 0);
  // WR-06 (REVIEW Phase 4): navigator.platform is deprecated and returns
  // empty/inconsistent strings on modern browsers. Prefer userAgentData.platform
  // (Chromium 2023+) and fall back to userAgent regex for Safari/Firefox.
  const isMac = (() => {
    if (typeof navigator === 'undefined') return false;
    const uaData = (
      navigator as Navigator & { userAgentData?: { platform?: string } }
    ).userAgentData;
    if (uaData?.platform) return /mac/i.test(uaData.platform);
    return /Mac|iPhone|iPad/i.test(navigator.userAgent);
  })();
  const undoHint = isMac ? 'Undo (⌘Z)' : 'Undo (Ctrl+Z)';
  const redoHint = isMac ? 'Redo (⌘⇧Z)' : 'Redo (Ctrl+Shift+Z)';

  return (
    <>
      <SkipToMain />
      {banner}
      <header className="sticky top-0 z-20 w-full bg-white border-b border-stone-200 px-4 md:h-[60px] md:px-6">
        <div className="max-w-7xl mx-auto flex h-full flex-col gap-2 py-2 md:flex-row md:items-center md:justify-between md:gap-6 md:py-0">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xl font-semibold text-stone-900">Garden Gantt</span>
              <span className="hidden md:inline text-sm font-normal text-stone-600">
                Plug in your ZIP and your plants. Get a season schedule.
              </span>
            </div>
            {!hideMyPlanPill && (
              <div className="shrink-0 md:hidden">
                <MyPlanPill />
              </div>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-3 md:gap-6">
            <nav className="min-w-0 flex-1 overflow-x-auto md:flex-initial md:overflow-visible">
              <ul className="flex min-w-max items-center gap-4 pr-1 md:gap-6 md:pr-0">
                {NAV_LINKS.map((link) => {
                  const isActive = currentHash === link.hash;
                  const className = isActive
                    ? 'text-sm font-medium text-green-700 underline underline-offset-4 decoration-2'
                    : 'text-sm font-medium text-stone-600 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700';
                  return (
                    <li key={link.hash}>
                      <a href={link.href} className={className}>
                        {link.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
            {showHistoryButtons && (
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => getTemporal().undo()}
                  disabled={!canUndo}
                  aria-label="Undo last change"
                  title={undoHint}
                  className={cn(
                    'inline-flex items-center justify-center w-9 h-9 rounded-md',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700',
                    canUndo
                      ? 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                      : 'text-stone-400 cursor-not-allowed',
                  )}
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => getTemporal().redo()}
                  disabled={!canRedo}
                  aria-label="Redo last change"
                  title={redoHint}
                  className={cn(
                    'inline-flex items-center justify-center w-9 h-9 rounded-md',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700',
                    canRedo
                      ? 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                      : 'text-stone-400 cursor-not-allowed',
                  )}
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>
            )}
            {!hideMyPlanPill && (
              <div className="hidden md:block">
                <MyPlanPill />
              </div>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {children}
      </main>
      {/* Radix Dialog portals to body — placement here is conventional */}
      <MyPlanPanel />
      <PermapeopleAttributionFooter />
      {/* Phase 3 Plan 03-06: top-level ConstraintTooltip mount (portaled).
          Replaces the temporary in-DragLayer mount from Plan 03-03. */}
      <ConstraintTooltip />
      {/* Phase 4 Plan 04-06 — sr-only live region for keyboard-drag screen-reader
          announcements (POL-08). Written to by useKeyboardBarDrag in GanttView. */}
      <div aria-live="polite" className="sr-only" id="kbd-drag-announcer" />
      {/* Phase 4 Plan 04-04 / 04-06 — onboarding coach marks (route-gated internally). */}
      <CoachMarks />
      {/* Phase 4 Plan 04-03 / 04-06 — programmatic toast viewport. */}
      <ToastHost />
    </>
  );
}
