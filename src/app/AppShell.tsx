// src/app/AppShell.tsx
// Layout shell per .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Layout Shell
// Phase 2 (Plan 02-10): adds /catalog nav link, MyPlanPill (top-right of header), MyPlanPanel
// drawer (Radix portal), and PermapeopleAttributionFooter (CC BY-SA 4.0; conditional).
//
// Source: [CITED: 02-UI-SPEC.md §Component Inventory item 10]
//         [CITED: 02-PATTERNS.md src/app/AppShell.tsx (EXTEND)]
//         [CITED: 02-10-PLAN.md Task 2 Step 2]
import { useEffect, useState, type ReactNode } from 'react';
import { Banner } from './Banner';
import { MyPlanPill } from '../features/catalog/MyPlanPill';
import { MyPlanPanel } from '../features/catalog/MyPlanPanel';
import { PermapeopleAttributionFooter } from './PermapeopleAttributionFooter';
import { usePlanStore } from '../stores/planStore';

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

  // UI-SPEC §10 line 517: hide MyPlanPill on /setup when plan === null (first-run).
  // Once a plan exists (Step 1 done) OR the user is anywhere outside the wizard, show it.
  const hideMyPlanPill = plan === null && currentHash.startsWith('#/setup');

  return (
    <>
      <Banner />
      <header className="sticky top-0 z-20 w-full bg-white border-b border-stone-200 h-[60px] px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-semibold text-stone-900">Garden Gantt</span>
            <span className="hidden md:inline text-sm font-normal text-stone-600">
              Plug in your ZIP and your plants. Get a season schedule.
            </span>
          </div>
          <div className="flex items-center gap-6">
            <nav>
              <ul className="flex items-center gap-6">
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
            {!hideMyPlanPill && <MyPlanPill />}
          </div>
        </div>
      </header>
      <main id="main" className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {children}
      </main>
      {/* Radix Dialog portals to body — placement here is conventional */}
      <MyPlanPanel />
      <PermapeopleAttributionFooter />
    </>
  );
}
