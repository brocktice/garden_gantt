// src/main.tsx — initial scaffold; Plan 07 replaces with HashRouter shell
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <h1>Garden Gantt — boot OK</h1>
  </StrictMode>,
);
