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
| cornell-vegetable-planting.pdf | Cornell Cooperative Extension | NYC Area Vegetable Planting Guide | https://harvestny.cce.cornell.edu/uploads/doc_160.pdf | 2026-04-27 | Land-grant Smith-Lever publication; redistributable with attribution | bt | 2026-04-27 |
| umaine-vegetable-growing-chart.pdf | University of Maine Cooperative Extension | Vegetable Growing Chart | https://extension.umaine.edu/gardening/wp-content/uploads/sites/5/2016/02/Vegetable-growing-chart.pdf | 2026-04-27 | Land-grant Smith-Lever publication; redistributable with attribution | bt | 2026-04-27 |
| usu-vegetable-planting.pdf | Utah State University Extension | Wasatch Front Vegetable Chart (Suggested Vegetable Planting Dates) | https://extension.usu.edu/yardandgarden/files/Planting-Guide.pdf | 2026-04-27 | Land-grant Smith-Lever publication; redistributable with attribution | bt | 2026-04-27 |
| psu-vegetable-seed-planting-guide.pdf | Penn State Extension (York County Master Gardeners) | Vegetable Seed Planting Guide | https://extension.psu.edu/programs/master-gardener/counties/york/vegetable-guides/vegetable-seed-planting-guide/@@download/file/Vegetable-Seed-Planting-Guide.pdf | 2026-04-27 | Land-grant Smith-Lever publication; redistributable with attribution | bt | 2026-04-27 |
| ucanr-sacramento-germination.pdf | UC ANR Cooperative Extension (Sacramento County) | Vegetable Seed Germination — Days to Emerge at Different Soil Temperatures | https://ucanr.edu/sites/default/files/2017-11/164220.pdf | 2026-04-27 | Land-grant Smith-Lever publication; redistributable with attribution | bt | 2026-04-27 |
| csu-cmg-gardennotes-720.pdf | Colorado State University Extension (Master Gardener) | CMG GardenNotes #720 — Vegetable Planting Guide | https://cmg.extension.colostate.edu/Gardennotes/720.pdf | 2026-04-27 | Land-grant Smith-Lever publication; redistributable with attribution | bt | 2026-04-27 |
| wsu-soil-temp-germination.pdf | Washington State University Extension | Soil Temperature Conditions for Vegetable Seed Germination | https://wpcdn.web.wsu.edu/extension/uploads/sites/43/2024/04/Soil-Temperature-Conditions-for-Vegetable-Seed-Germination.pdf | 2026-04-27 | Land-grant Smith-Lever publication; redistributable with attribution | bt | 2026-04-27 |
| uga-c963-vegetable-chart.pdf | University of Georgia Extension | Vegetable Production Chart (C963) | https://secure.caes.uga.edu/extension/publications/files/html/C963/C963VegeChart.pdf | 2026-04-27 | Land-grant Smith-Lever publication; redistributable with attribution | bt | 2026-04-27 |
| csu-cmg-gardennotes-731-herbs.pdf | Colorado State University Extension (Master Gardener) | CMG GardenNotes #731 — Herb Gardening | https://cmg.extension.colostate.edu/Gardennotes/731.pdf | 2026-04-27 | CSU Extension; reproducible without change for nonprofit educational use with attribution | bt | 2026-04-27 |
| okstate-culinary-herbs-hla6037.pdf | Oklahoma State University Extension | Culinary Herbs for Oklahoma Gardens (HLA-6037) | https://extension.okstate.edu/fact-sheets/culinary-herbs-for-oklahoma-gardens.html | 2026-04-27 | Land-grant Smith-Lever publication; redistributable with attribution | bt | 2026-04-27 |
| osu-growing-herbs.pdf | Oregon State University Extension | Growing Herbs (OSU Master Gardener / 10-Minute University) | https://extension.oregonstate.edu/sites/extd8/files/documents/12281/growingherbs.pdf | 2026-04-27 | Land-grant Smith-Lever publication; redistributable with attribution | bt | 2026-04-27 |

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
