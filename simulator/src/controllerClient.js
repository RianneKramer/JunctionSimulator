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
const CONTROLLER_TIMEOUT_MS = 7000;

let failureCount = 0;
let nextAllowedAttemptAt = 0;

function fetchWithTimeout(url, options = {}, timeoutMs = CONTROLLER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

/**
 * POST current entity states to the controller.
 *
 * @param {Object} paths - map of computed paths
 * @param {Object} lightStates - will be mutated with updated states from controller
 * @returns {boolean} true if the POST succeeded
 */
export async function postToController(paths, lightStates) {
  const now = Date.now();
  if (now < nextAllowedAttemptAt) return false;

  const entities = computeEntities(paths);
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
    const resp = await fetchWithTimeout('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentTimestamp: now, trafficLights, trainArrivalTimestamp: 1 }),
    });

    if (!resp.ok) {
      throw new Error(`Proxy returned HTTP ${resp.status}`);
    }

    const data = await resp.json();
    if (data.error) throw new Error(data.error);

    if (data.trafficLights) {
      for (const [id, val] of Object.entries(data.trafficLights)) {
        lightStates[id] = val;
      }
    }

    failureCount = 0;
    nextAllowedAttemptAt = 0;
    return true;
  } catch (e) {
    failureCount += 1;
    const backoffMs = Math.min(1000 * 2 ** Math.min(failureCount, 5), 15000);
    nextAllowedAttemptAt = Date.now() + backoffMs;
    return false;
  }
}
