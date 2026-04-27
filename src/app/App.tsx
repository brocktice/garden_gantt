// src/app/App.tsx
// Source: [VERIFIED: react-router 7 declarative HashRouter via Context7 /remix-run/react-router]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Placeholder Route Copy]
//
// Plan 07 created this with Loading… placeholders for /, /plan, *.
// Plan 01-08 wired <GanttView/> into / and /plan. Plan 02-08 wired <SetupWizard/> into /setup.
// Plan 02-10 added /catalog → <CatalogBrowser/>; updated /tasks placeholder copy.
// Plan 02-11 (this plan) swaps /settings → <SettingsPanel/> (export/import surface, D-27/28/29).
import { Route, Routes } from 'react-router';
import { AppShell } from './AppShell';
import { ErrorBoundary } from './ErrorBoundary';
import { PlaceholderRoute } from './PlaceholderRoute';
import { DragLayer } from '../features/gantt/drag/DragLayer';
import { SetupWizard } from '../features/setup/SetupWizard';
import { CatalogBrowser } from '../features/catalog/CatalogBrowser';
import { SettingsPanel } from '../features/settings/SettingsPanel';

export function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <Routes>
          {/* Default + /plan: render the interactive (drag-enabled) gantt — Phase 3 Plan 03-03 */}
          <Route path="/" element={<DragLayer />} />
          <Route path="/plan" element={<DragLayer />} />
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/catalog" element={<CatalogBrowser />} />
          <Route
            path="/tasks"
            element={
              <PlaceholderRoute
                heading="Tasks — Coming soon"
                body="This view lights up in Phase 3. Today's tasks, this week's tasks, and overdue tasks will live here, derived from your schedule."
              />
            }
          />
          <Route path="/settings" element={<SettingsPanel />} />
          {/* Catch-all → gantt */}
          <Route path="*" element={<DragLayer />} />
        </Routes>
      </AppShell>
    </ErrorBoundary>
  );
}
