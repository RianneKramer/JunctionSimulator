/**
 * Entity detection for traffic lights.
 *
 * Determines which lights have an entity present based on:
 * - Car positions within detection zones (for car lights)
 * - Manual toggle state (for bus/bicycle/pedestrian lights)
 */

import { getCars, CAR_LENGTH } from './carManager.js';
import { RAW_PATHS, MANUAL_LIGHTS } from './paths.js';

const manualEntities = {};

// Initialize manual entity states
for (const id of Object.keys(MANUAL_LIGHTS)) {
  manualEntities[id] = false;
}

/**
 * Toggle entity presence for a manual light.
 *
 * @param {string} id - light ID
 */
export function toggleManualEntity(id) {
  if (id in manualEntities) {
    manualEntities[id] = !manualEntities[id];
  }
}

/**
 * Get current manual entity state for a light.
 *
 * @param {string} id
 * @returns {boolean}
 */
export function getManualEntity(id) {
  return manualEntities[id] || false;
}

/**
 * Compute entity presence for all traffic lights.
 *
 * For car lights: checks if any car on that path is within the detection zone
 * (between detectDist and stopDist + car length).
 *
 * For manual lights: returns the toggled state.
 *
 * @param {Object} paths - map of computed paths
 * @returns {Object} map of light ID -> boolean
 */
export function computeEntities(paths) {
  const entities = {};
  const cars = getCars();

  for (const id of Object.keys(RAW_PATHS)) {
    const p = paths[id];
    let hasEntity = false;
    for (const car of cars) {
      if (!car.alive || car.pathId !== id) continue;
      if (car.dist >= p.detectDist && car.dist <= p.stopDist + CAR_LENGTH) {
        hasEntity = true;
        break;
      }
    }
    entities[id] = hasEntity;
  }

  for (const id of Object.keys(MANUAL_LIGHTS)) {
    entities[id] = manualEntities[id] || false;
  }

  return entities;
}
