/**
 * Path entity management: spawning, movement, queuing, and collision avoidance.
 *
 * Supports multiple frontend-only route variants under a single controller
 * traffic light. The controller still only sees the parent signal ID.
 */

import { posAt, getSignalVariantKeys } from './pathMath.js';
import { RAIL_SIGNAL_ID } from './paths.js';

const CAR_LENGTH = 20;
const CAR_WIDTH = 10;
const BUS_LENGTH = 28;
const BUS_WIDTH = 12;
const BIKE_LENGTH = 14;
const BIKE_WIDTH = 6;
const PEDESTRIAN_LENGTH = 7;
const PEDESTRIAN_WIDTH = 7;
const COLLISION_RADIUS = 16;

let entities = [];
let idCounter = 0;

function isVulnerableRoadUser(entity) {
  return entity.entityType === 'bike' || entity.entityType === 'pedestrian';
}

function getEntityProfile(signalId, path) {
  if (signalId === '42') {
    return {
      vehicleType: 'bus',
      length: BUS_LENGTH,
      width: BUS_WIDTH,
      minGap: 32,
      speed: 1.1 + Math.random() * 0.25,
    };
  }

  if (path.entityType === 'bike') {
    return {
      vehicleType: 'bike',
      length: BIKE_LENGTH,
      width: BIKE_WIDTH,
      minGap: 18,
      speed: 1.25 + Math.random() * 0.25,
    };
  }

  if (path.entityType === 'pedestrian') {
    return {
      vehicleType: 'pedestrian',
      length: PEDESTRIAN_LENGTH,
      width: PEDESTRIAN_WIDTH,
      minGap: 14,
      speed: 0.65 + Math.random() * 0.18,
    };
  }

  return {
    vehicleType: 'car',
    length: CAR_LENGTH,
    width: CAR_WIDTH,
    minGap: 30,
    speed: 1.5 + Math.random() * 0.5,
  };
}

function pickVariantKey(signalId, paths) {
  const variants = getSignalVariantKeys(paths, signalId);
  if (!variants.length) return null;
  return variants[Math.floor(Math.random() * variants.length)];
}

/**
 * Spawn a vehicle for a given controller signal.
 *
 * @param {string} signalId - controller-facing signal ID (e.g. "5.1")
 * @param {Object} paths - map of computed variant paths
 */
export function spawnCar(signalId, paths) {
  return spawnEntity(signalId, paths);
}

/**
 * Spawn a path entity for a given controller signal.
 *
 * @param {string} signalId - controller-facing signal ID (e.g. "5.1")
 * @param {Object} paths - map of computed variant paths
 */
export function spawnEntity(signalId, paths) {
  const variantKey = pickVariantKey(signalId, paths);
  if (!variantKey) return false;

  const path = paths[variantKey];
  const profile = getEntityProfile(signalId, path);

  entities.push({
    id: ++idCounter,
    signalId,
    pathId: signalId,
    variantKey,
    path,
    entityType: path.entityType || profile.vehicleType,
    vehicleType: profile.vehicleType,
    length: profile.length,
    width: profile.width,
    minGap: profile.minGap,
    dist: 0,
    speed: profile.speed,
    x: path.points[0][0],
    y: path.points[0][1],
    angle: 0,
    alive: true,
  });
  return true;
}

/**
 * Spawn a vehicle on a random signal, if there is room at the spawn point.
 */
export function spawnRandom(signalIds, paths) {
  if (!signalIds.length) return;
  const signalId = signalIds[Math.floor(Math.random() * signalIds.length)];
  const variants = getSignalVariantKeys(paths, signalId);
  const firstVariant = variants.length ? paths[variants[0]] : null;
  const needsGap = !firstVariant || !['bike', 'pedestrian'].includes(firstVariant.entityType);
  const tooClose = needsGap && entities.some((c) => c.alive && variants.includes(c.variantKey) && c.dist < 40);
  if (!tooClose) spawnEntity(signalId, paths);
}

function isSignalGreen(signalId, lightStates) {
  const ls = lightStates[signalId] || 0;
  if (signalId === '42') {
    return ls === 1 || ls === 2;
  }
  return ls === 2;
}

/**
 * Update a single vehicle for one frame.
 */
export function updateCar(entity, lightStates) {
  return updateEntity(entity, lightStates);
}

/**
 * Update a single path entity for one frame.
 */
export function updateEntity(entity, lightStates, paths) {
  if (!entity.alive) return;

  const beforeStop = entity.dist < entity.path.stopDist;

  if (beforeStop && !isSignalGreen(entity.signalId, lightStates)) {
    if (entity.dist + entity.speed >= entity.path.stopDist) {
      entity.dist = entity.path.stopDist - 1;
      syncPosition(entity);
      return;
    }
  }

  if (shouldStopForRail(entity, lightStates)) {
    entity.dist = entity.path.railStopDist - 1;
    syncPosition(entity);
    return;
  }

  const ahead = findCarAhead(entity);
  if (ahead && (ahead.dist - entity.dist) < entity.minGap) {
    syncPosition(entity);
    return;
  }

  if (entity.dist >= entity.path.stopDist && shouldYield(entity)) {
    syncPosition(entity);
    return;
  }

  entity.dist += entity.speed;
  if (entity.dist >= entity.path.totalLength) {
    if (transitionToNextPath(entity, paths)) {
      return;
    }
    entity.alive = false;
    return;
  }
  syncPosition(entity);
}

function shouldStopForRail(entity, lightStates) {
  if (!isVulnerableRoadUser(entity)) return false;
  if (!Number.isFinite(entity.path.railStopDist)) return false;
  if (isSignalGreen(RAIL_SIGNAL_ID, lightStates)) return false;
  if (entity.dist >= entity.path.railStopDist) return false;

  return entity.dist + entity.speed >= entity.path.railStopDist;
}

function transitionToNextPath(entity, paths) {
  if (entity.entityType !== 'pedestrian' || !entity.path.nextSignalId || !paths) {
    return false;
  }

  const variantKey = pickVariantKey(entity.path.nextSignalId, paths);
  if (!variantKey) return false;

  const path = paths[variantKey];
  const profile = getEntityProfile(entity.path.nextSignalId, path);

  entity.signalId = entity.path.nextSignalId;
  entity.pathId = entity.signalId;
  entity.variantKey = variantKey;
  entity.path = path;
  entity.entityType = path.entityType || profile.vehicleType;
  entity.vehicleType = profile.vehicleType;
  entity.length = profile.length;
  entity.width = profile.width;
  entity.minGap = profile.minGap;
  entity.speed = profile.speed;
  entity.dist = 0;
  entity.x = path.points[0][0];
  entity.y = path.points[0][1];
  entity.angle = 0;

  return true;
}

function shouldYield(entity) {
  const nextPos = posAt(entity.path, entity.dist + entity.speed);
  const fwd = posAt(entity.path, entity.dist + 10);
  const myDirX = fwd.x - entity.x;
  const myDirY = fwd.y - entity.y;

  for (const other of entities) {
    if (other === entity || !other.alive || other.variantKey === entity.variantKey) continue;
    if (isVulnerableRoadUser(entity) && isVulnerableRoadUser(other)) continue;
    if (other.dist <= other.path.stopDist - 5) continue;

    const dx = nextPos.x - other.x;
    const dy = nextPos.y - other.y;

    if (dx * dx + dy * dy >= COLLISION_RADIUS * COLLISION_RADIUS) continue;

    const toDx = other.x - entity.x;
    const toDy = other.y - entity.y;
    const dot = toDx * myDirX + toDy * myDirY;

    if (dot > 0 && entity.id > other.id) {
      return true;
    }
  }

  return false;
}

function findCarAhead(entity) {
  if (isVulnerableRoadUser(entity)) return null;

  let best = null;
  let bestGap = Infinity;

  for (const c of entities) {
    if (c === entity || !c.alive || c.variantKey !== entity.variantKey) continue;
    const gap = c.dist - entity.dist;
    if (gap > 0 && gap < bestGap) {
      best = c;
      bestGap = gap;
    }
  }

  return best;
}

function syncPosition(car) {
  const p = posAt(car.path, car.dist);
  car.x = p.x;
  car.y = p.y;
  car.angle = p.angle;
}

export function updateAll(lightStates, paths) {
  for (const entity of entities) {
    updateEntity(entity, lightStates, paths);
  }
  entities = entities.filter((c) => c.alive);
}

export function getCars() {
  return entities;
}

export function getEntities() {
  return entities;
}

export function getTotalSpawned() {
  return idCounter;
}

export {
  CAR_LENGTH,
  CAR_WIDTH,
  BUS_LENGTH,
  BUS_WIDTH,
  BIKE_LENGTH,
  BIKE_WIDTH,
  PEDESTRIAN_LENGTH,
  PEDESTRIAN_WIDTH,
};
