// src/app/App.tsx
// Source: [VERIFIED: react-router 7 declarative HashRouter via Context7 /remix-run/react-router]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Placeholder Route Copy]
//
// Plan 07 created this with Loading… placeholders for /, /plan, *.
// Plan 01-08 wired <GanttView/> into / and /plan. Plan 02-08 wired <SetupWizard/> into /setup.
// Plan 02-10 added /catalog → <CatalogBrowser/>; updated /tasks placeholder copy.
// Plan 02-11 swapped /settings → <SettingsPanel/> (export/import surface, D-27/28/29).
// Plan 03-07 (this plan): /plan now renders <PlanRoute/> (PlanViewTabs + view-conditional
//   DragLayer or lazy CalendarView); /tasks now renders the real <TasksDashboard/>.
//
// Pitfall 6 (RESEARCH): React.lazy + Suspense + the existing top-level ErrorBoundary
// covers stale-cache chunk-load failure. Phase 4 polish may add a calendar-specific
// "Calendar didn't load — switch to Gantt" recovery UI per UI-SPEC §Error states.
import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useSearchParams } from 'react-router';
import { AppShell } from './AppShell';
import { ErrorBoundary } from './ErrorBoundary';
import { PlanViewTabs } from './PlanViewTabs';
import { usePlanStore } from '../stores/planStore';

// Lazy-loaded calendar — Vite emits a separate chunk so first /plan paint stays small.
const CalendarView = lazy(() => import('../features/calendar/CalendarView'));
const DragLayer = lazy(() =>
  import('../features/gantt/drag/DragLayer').then((m) => ({ default: m.DragLayer })),
);
const SetupWizard = lazy(() =>
  import('../features/setup/SetupWizard').then((m) => ({ default: m.SetupWizard })),
);
const CatalogBrowser = lazy(() =>
  import('../features/catalog/CatalogBrowser').then((m) => ({ default: m.CatalogBrowser })),
);
const TasksDashboard = lazy(() =>
  import('../features/tasks/TasksDashboard').then((m) => ({ default: m.TasksDashboard })),
);
const SettingsPanel = lazy(() =>
  import('../features/settings/SettingsPanel').then((m) => ({ default: m.SettingsPanel })),
);

// UI-SPEC §6: stone-100 grid placeholder at calendar dimensions; no shimmer (Phase 4 polish).
function CalendarSkeleton() {
  return (
    <div className="px-4 py-4">
      <div
        className="bg-stone-100 rounded-md"
        style={{ minHeight: '600px' }}
        aria-hidden="true"
      >
        <span className="sr-only">Loading calendar…</span>
      </div>
    </div>
  );
}

function RouteSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-8 w-48 rounded-md bg-stone-100" />
      <div className="h-40 rounded-md bg-stone-100" />
    </div>
  );
}

// First-run gate: redirect to /setup until the user has set a location.
// /setup and /settings stay open (settings hosts the import-plan path that
// can also produce a non-null plan).
function RequireSetup({ children }: { children: ReactNode }) {
  const plan = usePlanStore((s) => s.plan);
  if (plan === null) {
    return <Navigate to="/setup" replace />;
  }
  return <>{children}</>;
}

function PlanRoute() {
  const [searchParams] = useSearchParams();
  // Collapse any value to the safe enum — no injection surface (T-03-07-02).
  const view = searchParams.get('view') === 'calendar' ? 'calendar' : 'gantt';
  return (
    <>
      <PlanViewTabs />
      {view === 'calendar' ? (
        <Suspense fallback={<CalendarSkeleton />}>
          <CalendarView />
        </Suspense>
      ) : (
        <Suspense fallback={<RouteSkeleton />}>
          <DragLayer />
        </Suspense>
      )}
    </>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <Routes>
          {/* Default + /plan: Phase 3 PlanRoute (tabs + view-conditional Gantt | Calendar).
              Guarded by RequireSetup so first-time users land on /setup. */}
          <Route path="/" element={<RequireSetup><PlanRoute /></RequireSetup>} />
          <Route path="/plan" element={<RequireSetup><PlanRoute /></RequireSetup>} />
          <Route path="/setup" element={<Suspense fallback={<RouteSkeleton />}><SetupWizard /></Suspense>} />
          <Route path="/catalog" element={<RequireSetup><Suspense fallback={<RouteSkeleton />}><CatalogBrowser /></Suspense></RequireSetup>} />
          <Route path="/tasks" element={<RequireSetup><Suspense fallback={<RouteSkeleton />}><TasksDashboard /></Suspense></RequireSetup>} />
          {/* /settings stays open: import-plan flow can run before setup. */}
          <Route path="/settings" element={<Suspense fallback={<RouteSkeleton />}><SettingsPanel /></Suspense>} />
          {/* Catch-all → PlanRoute (also guarded). */}
          <Route path="*" element={<RequireSetup><PlanRoute /></RequireSetup>} />
        </Routes>
      </AppShell>
    </ErrorBoundary>
  );
}
