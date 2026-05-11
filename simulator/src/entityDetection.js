/**
 * Entity detection for traffic lights.
 *
 * Determines which lights have an entity present based on:
 * - Vehicle positions within detection zones (for path-based traffic lights)
 * - One-shot manual requests (for bus/bicycle/pedestrian request buttons)
 */

import { getCars } from './carManager.js';
import { MANUAL_LIGHTS, getSignalIds } from './paths.js';

const manualRequests = {};

for (const id of Object.keys(MANUAL_LIGHTS)) {
  manualRequests[id] = {
    pending: false,
    servedThisGreen: false,
    lastRequestedAt: 0,
  };
}

export function requestManualEntity(id) {
  if (!(id in manualRequests)) return;
  const state = manualRequests[id];
  if (state.pending) return;
  state.pending = true;
  state.servedThisGreen = false;
  state.lastRequestedAt = Date.now();
}

export function getManualEntity(id) {
  return manualRequests[id]?.pending || false;
}

export function getManualRequestState(id) {
  return manualRequests[id] || { pending: false, servedThisGreen: false, lastRequestedAt: 0 };
}

export function updateManualRequestStates(lightStates) {
  for (const [id, state] of Object.entries(manualRequests)) {
    const ls = lightStates[id] || 0;

    if (!state.pending) {
      state.servedThisGreen = false;
      continue;
    }

    if (ls === 2 && Date.now() - state.lastRequestedAt > 500) {
      state.servedThisGreen = true;
      state.pending = false;
    }
  }
}

/**
 * Compute entity presence for all controller-facing traffic lights.
 *
 * Path-based lights are aggregated per parent signal ID so multiple frontend-only
 * route variants still map back to one controller signal.
 */
export function computeEntities(paths) {
  const entities = {};
  const cars = getCars();

  for (const signalId of getSignalIds()) {
    entities[signalId] = false;
  }

  for (const car of cars) {
    if (!car.alive) continue;
    const p = paths[car.variantKey] || car.path;
    const vehicleLength = car.length || 20;
    if (car.dist >= p.detectDist && car.dist <= p.stopDist + vehicleLength) {
      entities[car.signalId] = true;
    }
  }

  for (const id of Object.keys(MANUAL_LIGHTS)) {
    entities[id] = (entities[id] || false) || manualRequests[id]?.pending || false;
  }

  return entities;
}
