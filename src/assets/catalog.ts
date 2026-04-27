// src/assets/catalog.ts
// Live curated catalog. Re-exports the auto-generated catalog produced by
// `scripts/import-all.ts` from committed extension-publication PDFs in
// `scripts/data-sources/extension-pdfs/`.
//
// Every entry carries provenance metadata. Entries with
// `provenance.verified === true` have all CRITICAL_FIELDS (startMethod,
// daysToMaturity, frostTolerance, season) backed by at least one
// land-grant extension publication; the union of source `verifiedFields`
// covers the critical set. Entries with `verified === false` surface a
// "pending verification" badge in the UI.
//
// To refresh: edit a parser or update a PDF, then run
//   npm run import:catalog
// and commit the regenerated `catalog.generated.ts`.
//
// Purity: only `import type` from ../domain/types — no React, no I/O.

import type { Plant } from '../domain/types';
import { generatedCatalog } from './catalog.generated';

export const curatedCatalog: readonly Plant[] = generatedCatalog;

export const sampleCatalog: ReadonlyMap<string, Plant> = new Map<string, Plant>(
  curatedCatalog.map((p) => [p.id, p]),
);
