// src/app/App.tsx
// Source: [VERIFIED: react-router 7 declarative HashRouter via Context7 /remix-run/react-router]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Placeholder Route Copy]
//
// Plan 07 created this with Loading… placeholders for /, /plan, *.
// Plan 08 wires <GanttView/> into those three routes — Phase 1 success criterion #1.
import { Route, Routes } from 'react-router';
import { AppShell } from './AppShell';
import { ErrorBoundary } from './ErrorBoundary';
import { PlaceholderRoute } from './PlaceholderRoute';
import { GanttView } from '../features/gantt/GanttView';

export function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <Routes>
          {/* Default + /plan: render the static gantt */}
          <Route path="/" element={<GanttView />} />
          <Route path="/plan" element={<GanttView />} />
          <Route
            path="/setup"
            element={
              <PlaceholderRoute
                heading="Setup — Coming soon"
                body="This view lights up in Phase 2. The Setup Wizard will walk you through ZIP entry, frost-date confirmation, and your first plant picks."
              />
            }
          />
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
