// src/features/settings/exportPlan.ts
// Pure browser-API export. Builds envelope, validates via Zod, triggers anchor-click download.
// Source: [CITED: 02-RESEARCH.md §Pattern 6]
//         [CITED: 02-11-PLAN.md Task 1]
//         [CITED: 02-CONTEXT.md D-27]
//
// D-27: envelope = { app: 'garden-gantt', version: '0.3', schemaVersion: 3, exportedAt, plan }
// downloaded as garden-gantt-plan-{YYYY-MM-DD}.json.
//
// Pitfall E: this module never duplicates migration logic — exports always emit the current
// (v3) shape; the migration path lives only in src/domain/migrations.ts (consumed by importPlan
// and planStore.persist.migrate).

import { usePlanStore } from '../../stores/planStore';
import { useUIStore } from '../../stores/uiStore';
import { ExportEnvelopeSchema } from '../../domain/schemas';
import { nowISOString } from '../../domain/dateWrappers';
import { CURRENT_SCHEMA_VERSION } from '../../domain/migrations';

const APP_VERSION = '0.3';

export function exportPlan(): { ok: true; filename: string } | { ok: false; reason: string } {
  const plan = usePlanStore.getState().plan;
  if (!plan) {
    return { ok: false, reason: 'No plan to export' };
  }

  const envelope = {
    app: 'garden-gantt' as const,
    version: APP_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION as 3,
    exportedAt: nowISOString(),
    plan,
  };

  // Defense in depth — fail loudly if the envelope shape ever drifts from the schema.
  const result = ExportEnvelopeSchema.safeParse(envelope);
  if (!result.success) {
    return {
      ok: false,
      reason: `Internal error: ${result.error.issues[0]?.message ?? 'invalid envelope'}`,
    };
  }

  const json = JSON.stringify(envelope, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStr = nowISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `garden-gantt-plan-${dateStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  // D-15 (Plan 04-05): post-export bookkeeping — single side-effect site for "plan
  // exported". Resets the dirty counter and stamps lastExportedAt. ONLY on the success
  // branch — failure paths above leave the counter untouched (preserves "didn't really
  // export" semantics; T-04-05-05 mitigation).
  useUIStore.getState().setLastExportedAt(nowISOString());
  useUIStore.getState().resetDirty();

  return { ok: true, filename };
}
