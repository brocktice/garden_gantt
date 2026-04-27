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
import { lazy, Suspense } from 'react';
import { Route, Routes, useSearchParams } from 'react-router';
import { AppShell } from './AppShell';
import { ErrorBoundary } from './ErrorBoundary';
import { PlanViewTabs } from './PlanViewTabs';
import { DragLayer } from '../features/gantt/drag/DragLayer';
import { SetupWizard } from '../features/setup/SetupWizard';
import { CatalogBrowser } from '../features/catalog/CatalogBrowser';
import { SettingsPanel } from '../features/settings/SettingsPanel';
import { TasksDashboard } from '../features/tasks/TasksDashboard';

// Lazy-loaded calendar — Vite emits a separate chunk so first /plan paint stays small.
const CalendarView = lazy(() => import('../features/calendar/CalendarView'));

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
        <DragLayer />
      )}
    </>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <Routes>
          {/* Default + /plan: Phase 3 PlanRoute (tabs + view-conditional Gantt | Calendar). */}
          <Route path="/" element={<PlanRoute />} />
          <Route path="/plan" element={<PlanRoute />} />
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/catalog" element={<CatalogBrowser />} />
          <Route path="/tasks" element={<TasksDashboard />} />
          <Route path="/settings" element={<SettingsPanel />} />
          {/* Catch-all → PlanRoute */}
          <Route path="*" element={<PlanRoute />} />
        </Routes>
      </AppShell>
    </ErrorBoundary>
  );
}
