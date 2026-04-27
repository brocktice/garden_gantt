// scripts/import-all.ts
// Orchestrator: run every extension-publication parser, merge results, and
// emit the curated catalog to src/assets/catalog.generated.ts.
//
// Run: npm run import:catalog
//
// CONFLICT RESOLUTION
//   1. If one entry is verified=true and the other isn't → verified wins.
//   2. If both are verified=true → first parser in PARSERS wins; collision logged.
//   3. If both are verified=false → FIELD-LEVEL OVERLAY:
//      - Existing wins by default (parser order).
//      - For each field listed in new entry's provenance.verifiedFields,
//        copy the new entry's value over the existing one (the new source
//        actually backs that field; existing source likely used a default).
//      - verifiedFields are unioned. Notes are concatenated. Source label
//        becomes "<existing> + <new>".
//      - If the union of verifiedFields covers every field in CRITICAL_FIELDS,
//        the merged entry flips to verified=true.

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plant, PlantTiming } from '../src/domain/types';
import { parseCornellExtension } from './import/cornell-extension';
import { parseCsuExtension } from './import/csu-extension';
import { parseExtensionPsu } from './import/psu-extension';
import { parseUgaExtension } from './import/uga-extension';
import { parseUmaineExtension } from './import/umaine-extension';
import { parseUsuExtension } from './import/usu-extension';

/** Fields that must each be backed by at least one source for a Plant to
 *  be considered verified. If the union of `verifiedFields` across merged
 *  sources covers this set, the entry flips to verified=true.
 *
 *  daysToGermination is intentionally NOT in this set: germination timing
 *  is the least harvest-critical field (wrong by ±1 week shifts a small
 *  display event, doesn't risk losing the harvest window), and our
 *  CROP_DEFAULTS germination values are extension-consensus cross-checked
 *  during catalog design. The hard requirements are:
 *    - startMethod (direct-sow vs indoor-start fundamentally affects schedule)
 *    - daysToMaturity (drives harvest-before-fall-frost calculation)
 *    - frostTolerance (drives planting-window calculation)
 *    - season (cool/warm classification, drives succession logic)
 */
const CRITICAL_FIELDS: readonly (keyof PlantTiming)[] = [
  'startMethod',
  'daysToMaturity',
  'frostTolerance',
  'season',
] as const;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../src/assets/catalog.generated.ts');

// List parsers in priority order. First-listed wins among same-verification
// entries; field-level overlay merge is the norm for unverified entries.
// Cornell: frost-window + start-method + frost tolerance + season
// UMaine: weeksIndoorBeforeLastFrost + daysToGermination (range)
// USU: daysToMaturity
// PSU: season + daysToGermination + daysToMaturity +
//      directSowOffsetDaysFromLastFrost + harvestWindowDays (~30 crops)
const PARSERS: Array<() => Promise<Plant[]>> = [
  parseCornellExtension,
  parseUmaineExtension,
  parseUsuExtension,
  parseExtensionPsu,
  parseCsuExtension,
  parseUgaExtension,
];

async function main() {
  const merged = new Map<string, Plant>();
  let totalEmitted = 0;
  let collisionsSkipped = 0;

  for (const parse of PARSERS) {
    const plants = await parse();
    totalEmitted += plants.length;
    for (const p of plants) {
      if (!p.provenance) {
        throw new Error(
          `[import-all] parser emitted "${p.id}" with no provenance — every imported entry MUST cite a source`,
        );
      }
      const existing = merged.get(p.id);
      if (!existing) {
        merged.set(p.id, p);
        continue;
      }
      const existingVerified = existing.provenance?.verified === true;
      const newVerified = p.provenance?.verified === true;
      if (newVerified && !existingVerified) {
        merged.set(p.id, p);
        collisionsSkipped += 1;
        continue;
      }
      if (existingVerified && !newVerified) {
        collisionsSkipped += 1;
        continue;
      }
      if (existingVerified && newVerified) {
        // Both verified — parser order rules; keep existing.
        collisionsSkipped += 1;
        continue;
      }
      // Both unverified — field-level overlay.
      merged.set(p.id, mergeUnverified(existing, p));
      collisionsSkipped += 1;
    }
  }

  const output = renderCatalog(Array.from(merged.values()));
  writeFileSync(OUTPUT_PATH, output, 'utf-8');

  console.log(`[import-all] parsers ran: ${PARSERS.length}`);
  console.log(`[import-all] entries emitted: ${totalEmitted}`);
  console.log(`[import-all] entries kept after de-dup: ${merged.size}`);
  console.log(`[import-all] collisions skipped: ${collisionsSkipped}`);
  console.log(`[import-all] wrote ${OUTPUT_PATH}`);
}

/** Field-level overlay merge for two unverified entries. New entry's
 *  verifiedFields (the fields it actually backs) overlay the existing entry.
 *  verifiedFields are unioned. Notes/sources are concatenated.
 *  If the union covers CRITICAL_FIELDS, the result flips to verified=true. */
function mergeUnverified(existing: Plant, incoming: Plant): Plant {
  const existingProv = existing.provenance;
  const incomingProv = incoming.provenance;
  if (!existingProv || !incomingProv) return existing;

  const incomingFields = incomingProv.verifiedFields ?? [];
  const existingFields = existingProv.verifiedFields ?? [];
  const unionFields = Array.from(new Set([...existingFields, ...incomingFields]));

  // Overlay timing fields: copy from incoming for each field incoming verifies.
  const mergedTiming: PlantTiming = { ...existing.timing };
  for (const field of incomingFields) {
    const v = (incoming.timing as unknown as Record<string, unknown>)[field];
    if (v !== undefined) {
      (mergedTiming as unknown as Record<string, unknown>)[field] = v;
    }
  }

  const becomesVerified = CRITICAL_FIELDS.every((f) =>
    unionFields.includes(f as string),
  );

  const concatNote = [existingProv.note, incomingProv.note]
    .filter((s) => s && s.length > 0)
    .join(' | ');

  const concatSource = [existingProv.source, incomingProv.source]
    .filter((s, i, arr) => s && arr.indexOf(s) === i)
    .join(' + ');

  const merged: Plant = {
    ...existing,
    timing: mergedTiming,
    provenance: {
      ...existingProv,
      verified: becomesVerified,
      source: concatSource,
      ...(concatNote ? { note: concatNote } : {}),
      verifiedFields: unionFields,
      // Preserve existing publication/url/page (the entry's "primary" citation);
      // incoming source identity is captured in the concatenated source string.
    },
  };
  return merged;
}

function renderCatalog(plants: Plant[]): string {
  const sorted = [...plants].sort((a, b) => a.id.localeCompare(b.id));
  return `// src/assets/catalog.generated.ts
// AUTO-GENERATED by scripts/import-all.ts. Do not edit by hand.
//
// Re-run \`npm run import:catalog\` after updating any extension PDF or parser.
// Generated at: ${new Date().toISOString()}
// Entry count: ${sorted.length}

import type { Plant } from '../domain/types';

export const generatedCatalog: readonly Plant[] = ${JSON.stringify(sorted, null, 2)} as const;
`;
}

main().catch((err) => {
  console.error('[import-all] failed:', err);
  process.exit(1);
});
