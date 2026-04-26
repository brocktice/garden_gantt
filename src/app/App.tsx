// src/app/App.tsx
// Source: [VERIFIED: react-router 7 declarative HashRouter via Context7 /remix-run/react-router]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Placeholder Route Copy]
import { Route, Routes } from 'react-router';
import { AppShell } from './AppShell';
import { ErrorBoundary } from './ErrorBoundary';
import { PlaceholderRoute } from './PlaceholderRoute';

export function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <Routes>
          {/* Default: redirect-by-render to /plan */}
          <Route
            path="/"
            element={
              <PlaceholderRoute
                heading="Plan — Loading…"
                body="The static gantt loads here. (Plan 08 wires it.)"
              />
            }
          />
          <Route
            path="/plan"
            element={
              <PlaceholderRoute
                heading="Plan — Loading…"
                body="The static gantt loads here. (Plan 08 wires it.)"
              />
            }
          />
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
          {/* Catch-all: same as /plan placeholder */}
          <Route
            path="*"
            element={
              <PlaceholderRoute
                heading="Plan — Loading…"
                body="The static gantt loads here. (Plan 08 wires it.)"
              />
            }
          />
        </Routes>
      </AppShell>
    </ErrorBoundary>
  );
}
