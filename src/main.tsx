// src/main.tsx
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Code Examples lines 631–660]
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import { App } from './app/App';
import { probeStorage, watchQuotaExceeded, withStorageDOMEvents } from './data/storage';
import { useCatalogStore } from './stores/catalogStore';
import { usePlanStore } from './stores/planStore';
import { useUIStore } from './stores/uiStore';
import './index.css';

// 1. Probe storage availability BEFORE Zustand persist hydrates.
const isStorageAvailable = probeStorage();
useUIStore.getState().setStorageAvailable(isStorageAvailable);

// 1a. Watch for QuotaExceededError on subsequent writes (D-10 storage-full banner).
//     Mirrors the failure into uiStore.isStorageFull so the banner can render.
watchQuotaExceeded(() => useUIStore.getState().setStorageFull(true));

// 2. Wire multi-tab `storage` event listener (D-15 / DATA-06) for ALL persist stores.
//    Phase 4 adds uiStore alongside planStore + catalogStore so onboarding +
//    exportReminder slices sync across tabs.
withStorageDOMEvents(usePlanStore);
withStorageDOMEvents(useCatalogStore);
withStorageDOMEvents(useUIStore);

// 3. Render hash-router shell.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
