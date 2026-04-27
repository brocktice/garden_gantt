// scripts/import/usu-extension.ts
// Parser for Utah State University Extension's "Vegetable Planting Guide" PDF.
//
// USAGE
//   1. Confirm the publication is redistributable (see scripts/data-sources/extension-pdfs/LICENSES.md)
//   2. Download the PDF to scripts/data-sources/extension-pdfs/usu-vegetable-planting.pdf
//   3. Append a row to LICENSES.md inventory
//   4. Run: npm run import:catalog
//
// PARSER STATUS: STUB
// This file is scaffolding. The actual extraction logic depends on the PDF's
// table layout (column positions, header rows, multi-page tables) and must be
// tailored to the specific publication once it's downloaded. The shape below
// shows the contract every parser must implement; fill in the body by:
//   1. Read the committed PDF bytes via Node fs
//   2. Use pdfjs-dist to extract text-with-coordinates
//   3. Identify the planting-guide table by anchor strings
//   4. For each data row, normalize columns into the helpers in _shared.ts
//   5. Return Plant[] with provenance pointing at this publication
//
// See scripts/import-all.ts for the orchestrator that calls each parser.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plant } from '../../src/domain/types';
// import { buildCuratedPlant, timingFromIndoorStart, timingFromDirectSow } from './_shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_PATH = resolve(
  __dirname,
  '../data-sources/extension-pdfs/usu-vegetable-planting.pdf',
);

const PROVENANCE_BASE = {
  source: 'Utah State University Extension',
  publication: 'Vegetable Planting Guide',
  // FILL IN at parse time:
  url: 'https://extension.usu.edu/...',
  retrieved: '2026-04-27', // override with actual retrieval date
  license:
    'Land-grant Smith-Lever publication; redistributable with attribution. Verify per-PDF copyright notice.',
} as const;

export async function parseUsuExtension(): Promise<Plant[]> {
  if (!existsSync(PDF_PATH)) {
    console.warn(
      `[usu-extension] PDF not found at ${PDF_PATH} — skipping. Download per LICENSES.md to enable.`,
    );
    return [];
  }

  // Stub: extraction lives here.
  //
  // Sketch of the extraction algorithm:
  //
  //   const buf = readFileSync(PDF_PATH);
  //   const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  //   const doc = await pdfjs.getDocument({ data: buf }).promise;
  //   for (let p = 1; p <= doc.numPages; p++) {
  //     const page = await doc.getPage(p);
  //     const text = await page.getTextContent();
  //     // text.items has { str, transform: [...,x,y] }
  //     // Group items by approximate y-coordinate to recover rows.
  //     // Identify the planting-guide table by header-anchor matching.
  //     // For each row → normalize columns → buildCuratedPlant({...})
  //   }
  //
  // Each emitted Plant looks like:
  //
  //   buildCuratedPlant({
  //     commonName: 'Tomato',
  //     varietal: 'Cherokee Purple',
  //     scientificName: 'Solanum lycopersicum',
  //     category: 'fruiting-vegetable',
  //     timing: timingFromIndoorStart({ ... }),
  //     provenance: { ...PROVENANCE_BASE, verified: true, page: 14 },
  //   })

  // Suppress unused-variable lint until extraction is implemented.
  void readFileSync;
  void PROVENANCE_BASE;

  return [];
}
