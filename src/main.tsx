// src/main.tsx
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Code Examples lines 631–660]
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import { App } from './app/App';
import { probeStorage, withStorageDOMEvents } from './data/storage';
import { useCatalogStore } from './stores/catalogStore';
import { usePlanStore } from './stores/planStore';
import { useUIStore } from './stores/uiStore';
import './index.css';

// 1. Probe storage availability BEFORE Zustand persist hydrates.
const isStorageAvailable = probeStorage();
useUIStore.getState().setStorageAvailable(isStorageAvailable);

// 2. Wire multi-tab `storage` event listener (D-15 / DATA-06) for BOTH persist stores.
//    Phase 2 adds catalogStore alongside planStore so customPlants + permapeopleCache
//    sync across tabs.
withStorageDOMEvents(usePlanStore);
withStorageDOMEvents(useCatalogStore);

// 3. Render hash-router shell.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
