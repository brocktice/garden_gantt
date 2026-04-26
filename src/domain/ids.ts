// src/domain/ids.ts
// Deterministic id helpers. Output is JSON-serializable + stable across runs.
// Purity invariant: zero runtime imports.

/**
 * Construct a planting id from a plant id + succession index.
 * Examples: plantingId('tomato', 0) -> 'p-tomato'
 *           plantingId('lettuce', 1) -> 'p-lettuce-s1'
 */
export function plantingId(plantId: string, successionIndex = 0): string {
  return successionIndex === 0 ? `p-${plantId}` : `p-${plantId}-s${successionIndex}`;
}

/**
 * Construct an event id from a planting id + event type. Deterministic.
 * Example: eventId('p-tomato', 'transplant') -> 'p-tomato:transplant'
 *
 * Multi-event types (e.g. multiple `water-seedlings` per planting) append an index:
 *   eventId('p-tomato', 'water-seedlings', 3) -> 'p-tomato:water-seedlings:3'
 */
export function eventId(planting: string, eventType: string, index?: number): string {
  return index === undefined ? `${planting}:${eventType}` : `${planting}:${eventType}:${index}`;
}
