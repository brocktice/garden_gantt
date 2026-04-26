// src/app/App.tsx
// Source: [VERIFIED: react-router 7 declarative HashRouter via Context7 /remix-run/react-router]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Placeholder Route Copy]
//
// Plan 07 created this with Loading… placeholders for /, /plan, *.
// Plan 01-08 wired <GanttView/> into / and /plan. Plan 02-08 wired <SetupWizard/> into /setup.
// Plan 02-10 (this plan) adds /catalog → <CatalogBrowser/>; updates /tasks placeholder copy.
// Plan 02-11 will swap /settings → <SettingsPanel/> in a follow-up wave (depends_on 02-10).
import { Route, Routes } from 'react-router';
import { AppShell } from './AppShell';
import { ErrorBoundary } from './ErrorBoundary';
import { PlaceholderRoute } from './PlaceholderRoute';
import { GanttView } from '../features/gantt/GanttView';
import { SetupWizard } from '../features/setup/SetupWizard';
import { CatalogBrowser } from '../features/catalog/CatalogBrowser';

export function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <Routes>
          {/* Default + /plan: render the gantt */}
          <Route path="/" element={<GanttView />} />
          <Route path="/plan" element={<GanttView />} />
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
          <Route
            path="/settings"
            element={
              <PlaceholderRoute
                heading="Settings — Coming soon"
                body="Import / export and preferences land in the next plan (02-11)."
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
