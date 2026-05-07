/**
 * Vehicle management: spawning, movement, queuing, and collision avoidance.
 *
 * Supports multiple frontend-only route variants under a single controller
 * traffic light. The controller still only sees the parent signal ID.
 */

import { posAt, getSignalVariantKeys } from './pathMath.js';

const CAR_LENGTH = 20;
const CAR_WIDTH = 10;
const BUS_LENGTH = 28;
const BUS_WIDTH = 12;
const MIN_GAP = 30;
const COLLISION_RADIUS = 16;

let cars = [];
let idCounter = 0;

function getVehicleProfile(signalId) {
  if (signalId === '42') {
    return {
      vehicleType: 'bus',
      length: BUS_LENGTH,
      width: BUS_WIDTH,
      speed: 1.1 + Math.random() * 0.25,
    };
  }

  return {
    vehicleType: 'car',
    length: CAR_LENGTH,
    width: CAR_WIDTH,
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
  const variantKey = pickVariantKey(signalId, paths);
  if (!variantKey) return;

  const path = paths[variantKey];
  const profile = getVehicleProfile(signalId);

  cars.push({
    id: ++idCounter,
    signalId,
    pathId: signalId,
    variantKey,
    path,
    vehicleType: profile.vehicleType,
    length: profile.length,
    width: profile.width,
    dist: 0,
    speed: profile.speed,
    x: path.points[0][0],
    y: path.points[0][1],
    angle: 0,
    alive: true,
  });
}

/**
 * Spawn a vehicle on a random signal, if there is room at the spawn point.
 */
export function spawnRandom(signalIds, paths) {
  const signalId = signalIds[Math.floor(Math.random() * signalIds.length)];
  const variants = getSignalVariantKeys(paths, signalId);
  const tooClose = cars.some((c) => c.alive && variants.includes(c.variantKey) && c.dist < 40);
  if (!tooClose) spawnCar(signalId, paths);
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
export function updateCar(car, lightStates) {
  if (!car.alive) return;

  const beforeStop = car.dist < car.path.stopDist;

  if (beforeStop && !isSignalGreen(car.signalId, lightStates)) {
    if (car.dist + car.speed >= car.path.stopDist) {
      car.dist = car.path.stopDist - 1;
      syncPosition(car);
      return;
    }
  }

  const ahead = findCarAhead(car);
  if (ahead && (ahead.dist - car.dist) < MIN_GAP) {
    syncPosition(car);
    return;
  }

  if (car.dist >= car.path.stopDist && shouldYield(car)) {
    syncPosition(car);
    return;
  }

  car.dist += car.speed;
  if (car.dist >= car.path.totalLength) {
    car.alive = false;
    return;
  }
  syncPosition(car);
}

function shouldYield(car) {
  const nextPos = posAt(car.path, car.dist + car.speed);
  const fwd = posAt(car.path, car.dist + 10);
  const myDirX = fwd.x - car.x;
  const myDirY = fwd.y - car.y;

  for (const other of cars) {
    if (other === car || !other.alive || other.variantKey === car.variantKey) continue;
    if (other.dist <= other.path.stopDist - 5) continue;

    const dx = nextPos.x - other.x;
    const dy = nextPos.y - other.y;

    if (dx * dx + dy * dy >= COLLISION_RADIUS * COLLISION_RADIUS) continue;

    const toDx = other.x - car.x;
    const toDy = other.y - car.y;
    const dot = toDx * myDirX + toDy * myDirY;

    if (dot > 0 && car.id > other.id) {
      return true;
    }
  }

  return false;
}

function findCarAhead(car) {
  let best = null;
  let bestGap = Infinity;

  for (const c of cars) {
    if (c === car || !c.alive || c.variantKey !== car.variantKey) continue;
    const gap = c.dist - car.dist;
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

export function updateAll(lightStates) {
  for (const car of cars) {
    updateCar(car, lightStates);
  }
  cars = cars.filter((c) => c.alive);
}

export function getCars() {
  return cars;
}

export function getTotalSpawned() {
  return idCounter;
}

export { CAR_LENGTH, CAR_WIDTH, BUS_LENGTH, BUS_WIDTH };
