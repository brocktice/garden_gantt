// src/app/Banner.tsx
// iOS Private Mode banner. Renders when useUIStore.isStorageAvailable === false.
// Per .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §iOS Private Mode Banner Copy
import { X } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

export function Banner() {
  const isStorageAvailable = useUIStore((s) => s.isStorageAvailable);
  const bannerDismissed = useUIStore((s) => s.bannerDismissed);
  const setBannerDismissed = useUIStore((s) => s.setBannerDismissed);

  if (isStorageAvailable || bannerDismissed) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="sticky top-0 z-30 w-full bg-amber-100 text-amber-800 border-b border-amber-200 px-4 md:px-4 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Heads up — your changes won't be saved</p>
          <p className="mt-1 text-sm font-normal">
            This browser session can't write to local storage (likely iOS Safari Private
            Browsing). You can still explore the app, but anything you change will be gone
            when you close the tab.
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss banner"
          onClick={() => setBannerDismissed(true)}
          className="shrink-0 mt-0.5 rounded p-1 text-amber-800 hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
