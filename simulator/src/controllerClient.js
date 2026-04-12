/**
 * Controller communication.
 *
 * Posts traffic light entity states to the controller via the Node.js proxy
 * (avoids CORS issues when connecting to controllers on other machines).
 *
 * Receives back the current light states (0=red, 1=orange, 2=green).
 */

import { RAW_PATHS, MANUAL_LIGHTS } from './paths.js';
import { computeEntities } from './entityDetection.js';

const entityTimestamps = {};

/**
 * POST current entity states to the controller.
 *
 * @param {Object} paths - map of computed paths
 * @param {Object} lightStates - will be mutated with updated states from controller
 * @returns {boolean} true if the POST succeeded
 */
export async function postToController(paths, lightStates) {
  const entities = computeEntities(paths);
  const now = Date.now();
  const trafficLights = [];

  const allIds = [...Object.keys(RAW_PATHS), ...Object.keys(MANUAL_LIGHTS)];

  for (const id of allIds) {
    const hasEntity = entities[id] || false;
    if (hasEntity && !entityTimestamps[id]) entityTimestamps[id] = now;
    if (!hasEntity) delete entityTimestamps[id];

    trafficLights.push({
      id,
      hasEntity,
      triggeredTimestamp: entityTimestamps[id] || now,
    });
  }

  try {
    const resp = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentTimestamp: now, trafficLights, trainArrivalTimestamp: 1 }),
    });

    const data = await resp.json();
    if (data.error) throw new Error(data.error);

    if (data.trafficLights) {
      for (const [id, val] of Object.entries(data.trafficLights)) {
        lightStates[id] = val;
      }
    }

    return true;
  } catch (e) {
    return false;
  }
}
