// src/app/App.tsx
// Source: [VERIFIED: react-router 7 declarative HashRouter via Context7 /remix-run/react-router]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Placeholder Route Copy]
//
// Plan 07 created this with Loading… placeholders for /, /plan, *.
// Plan 01-08 wires <GanttView/> into those three routes — Phase 1 success criterion #1.
// Plan 02-08 wires <SetupWizard/> into /setup. Plan 02-10 wires the remaining Phase 2 routes
// (/catalog, /settings) and replaces the /tasks placeholder copy.
import { Route, Routes } from 'react-router';
import { AppShell } from './AppShell';
import { ErrorBoundary } from './ErrorBoundary';
import { PlaceholderRoute } from './PlaceholderRoute';
import { GanttView } from '../features/gantt/GanttView';
import { SetupWizard } from '../features/setup/SetupWizard';

export function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <Routes>
          {/* Default + /plan: render the static gantt */}
          <Route path="/" element={<GanttView />} />
          <Route path="/plan" element={<GanttView />} />
          <Route path="/setup" element={<SetupWizard />} />
          <Route
            path="/tasks"
            element={
              <PlaceholderRoute
                heading="Tasks — Coming soon"
                body="This view lights up in Phase 3. Today's tasks, this week's tasks, and overdue tasks will live here, derived from your schedule."
              />
            }
          />
          <Route
            path="/settings"
            element={
              <PlaceholderRoute
                heading="Settings — Coming soon"
                body="This view lights up in Phase 2 (import/export) and Phase 4 (preferences). Nothing here yet."
              />
            }
          />
          {/* Catch-all → gantt */}
          <Route path="*" element={<GanttView />} />
        </Routes>
      </AppShell>
    </ErrorBoundary>
  );
}
