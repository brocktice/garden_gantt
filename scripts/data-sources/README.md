# scripts/data-sources/

Raw, committed inputs for the ZIP → zone + frost-date pipeline.

These files are inputs to `scripts/build-zone-data.ts`. They are **committed to git** so the
build is reproducible offline. Refresh annually (each spring) when upstream sources update.

## Files

| File | Source | Purpose |
|------|--------|---------|
| `frostline.csv` | `https://raw.githubusercontent.com/waldoj/frostline/master/zipcodes.csv` (or `combined_zipcodes.csv`) joined with PRISM USDA zone data | Columns: `zip,zone,lat,lon`. ~42K US ZIP codes mapped to USDA Plant Hardiness Zone + lat/lon centroid. |
| `noaa-normals-ann.csv` | NOAA NCEI 1991–2020 Climate Normals annual products `ANN-TMIN-PRBLST-T28FP90` (50% probability of last spring 32°F freeze, MM-DD) and `ANN-TMIN-PRBFST-T28FP90` (50% probability of first fall 32°F freeze, MM-DD). Download via `https://www.ncei.noaa.gov/products/coordinates/frost-freeze` or the bulk normals product CSV portal at `https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/`. | Columns: `station_id,lat,lon,last_spring_50_mmdd,first_fall_50_mmdd`. ~9K weather stations with 50%-probability frost dates. |
| `SEED_FALLBACK.json` | Hand-curated fallback covering ≥3000 ZIPs across 50 largest US metros. Zone values from USDA Plant Hardiness Zone Map (planthardiness.ars.usda.gov). Frost dates from NOAA Climate Normals + Old Farmer's Almanac. | Used when the raw CSVs are missing or empty. Build script reads this if either CSV is unavailable. |

## Refresh Cadence

Run `npm run acquire:data` annually (each spring) when sources update. The script downloads to
`frostline.csv` and `noaa-normals-ann.csv`. Inspect, then `git add` the refreshed CSVs.

## License Notes

- **frostline** (waldoj/frostline) — MIT license. ZIP centroid + USDA hardiness zone data.
- **NOAA Climate Normals** — public-domain US Government data (no license required).
- **SEED_FALLBACK.json** — synthesized from the above public sources; same license posture.

## Why Two Scripts (Acquire vs Build)?

`acquire-zone-data.ts` performs network I/O. It runs once at execute time (or annual refresh).
`build-zone-data.ts` is pure offline transform — re-runnable on any machine without internet
because the inputs are committed. This split keeps CI deterministic and offline-friendly.
