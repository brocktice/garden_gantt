# Extension publication PDFs — license + provenance log

Each PDF in this directory MUST be listed below before being checked in. Per-file
license confirmation is the gate for redistribution. Acceptable licenses:

- **Public domain** (US federal government work, e.g. USDA publications)
- **Land-grant extension publications with explicit redistribution language** —
  most US land-grant universities publish under Smith-Lever Act funding with
  attribution-friendly terms; **read each publication's masthead/copyright
  notice before adding** — some are "All rights reserved" (e.g. UMN as of 2026)
  and require permission to redistribute the underlying data.
- **Creative Commons (CC0, CC-BY, CC-BY-SA)**

Unacceptable:

- "All rights reserved" without explicit permission
- Old Farmer's Almanac, seed-vendor catalogs (Burpee, Johnny's), commercial
  garden planners

## Inventory

<!-- One row per committed PDF. Append when adding a new source. -->

| Filename | Source institution | Publication | URL | Retrieved | License posture | Reviewer initials | Date |
|---|---|---|---|---|---|---|---|
| _example_ | _Utah State University Extension_ | _Vegetable Planting Guide_ | _https://extension.usu.edu/...pdf_ | _2026-04-27_ | _Land-grant, redistributable with attribution per Smith-Lever_ | _bt_ | _2026-04-27_ |

## Why these PDFs are committed to the repo

Same rationale as `scripts/data-sources/frostline.csv` and the NOAA normals CSV
(see `scripts/data-sources/README.md`): committing the raw input makes the
build deterministic and re-runnable offline, and pins the version we cite in
each plant's `provenance` metadata. Without committing, `provenance.retrieved`
would point at a moving target.

## Refresh cadence

Annually each spring, or whenever the upstream publication is revised. Re-run
the relevant parser, diff the generated catalog, and commit both the new PDF
and the regenerated `src/assets/catalog.generated.ts`.
