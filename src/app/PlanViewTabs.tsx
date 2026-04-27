// src/app/PlanViewTabs.tsx
// Underlined tab strip — Gantt | Calendar — wired to ?view= URL search param.
// Per CONTEXT D-27 + UI-SPEC §5.
// Source: [CITED: src/app/AppShell.tsx lines 67-82 (active-link pattern reused verbatim)]

import { useSearchParams } from 'react-router';
import { BarChart3, Calendar } from 'lucide-react';
import { cn } from '../ui/cn';

const TABS = [
  { id: 'gantt' as const, label: 'Gantt', Icon: BarChart3 },
  { id: 'calendar' as const, label: 'Calendar', Icon: Calendar },
];

export function PlanViewTabs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'calendar' ? 'calendar' : 'gantt';

  function setView(next: 'gantt' | 'calendar') {
    const sp = new URLSearchParams(searchParams);
    if (next === 'gantt') sp.delete('view');
    else sp.set('view', next);
    // Drop ?date= when switching views (drawer is calendar-specific).
    if (next === 'gantt') sp.delete('date');
    setSearchParams(sp);
  }

  return (
    <div
      className="flex items-center gap-6 border-b border-stone-200 px-4 h-[var(--spacing-tab-strip-h,44px)]"
      role="tablist"
      aria-label="View mode"
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setView(id)}
            className={cn(
              'inline-flex items-center gap-1 text-sm font-medium h-full -mb-px',
              active
                ? 'text-stone-900 border-b-2 border-green-700'
                : 'text-stone-600 hover:text-stone-900',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
