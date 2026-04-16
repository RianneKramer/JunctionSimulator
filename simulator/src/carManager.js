/**
 * Car management: spawning, movement, queuing, and collision avoidance.
 *
 * Collision avoidance strategy:
 * 1. Cars queue behind other cars on the same path (simple gap check).
 * 2. In the intersection, cars yield to other-path cars that are ahead
 *    of them spatially. Deadlock is prevented by a deterministic tiebreaker:
 *    the car with the lower ID always has right of way.
 * 3. This naturally produces zipper merge behavior on converging exit lanes.
 */

import { posAt } from './pathMath.js';

const CAR_LENGTH = 20;
const CAR_WIDTH = 10;
const MIN_GAP = 30;
const COLLISION_RADIUS = 16;

let cars = [];
let idCounter = 0;

/**
 * Spawn a car on a given path.
 *
 * @param {string} pathId - traffic light ID (e.g. "1.1")
 * @param {Object} paths - map of computed paths
 */
export function spawnCar(pathId, paths) {
  const path = paths[pathId];
  if (!path) return;

  cars.push({
    id: ++idCounter,
    pathId,
    path,
    dist: 0,
    speed: 1.5 + Math.random() * 0.5,
    x: path.points[0][0],
    y: path.points[0][1],
    angle: 0,
    alive: true,
  });
}

/**
 * Spawn a car on a random path, if there is room at the spawn point.
 *
 * @param {string[]} pathIds - list of valid path IDs
 * @param {Object} paths - map of computed paths
 */
export function spawnRandom(pathIds, paths) {
  const id = pathIds[Math.floor(Math.random() * pathIds.length)];
  const tooClose = cars.some(c => c.alive && c.pathId === id && c.dist < 40);
  if (!tooClose) spawnCar(id, paths);
}

/**
 * Update a single car's position for one frame.
 *
 * @param {Object} car
 * @param {Object} lightStates - map of light ID -> state (0/1/2)
 */
export function updateCar(car, lightStates) {
  if (!car.alive) return;

  const ls = lightStates[car.pathId] || 0;
  const beforeStop = car.dist < car.path.stopDist;

  // Stop at red/orange before the stop line
  if (beforeStop && ls !== 2) {
    if (car.dist + car.speed >= car.path.stopDist) {
      car.dist = car.path.stopDist - 1;
      syncPosition(car);
      return;
    }
  }

  // Queue behind car ahead on the same path
  const ahead = findCarAhead(car);
  if (ahead && (ahead.dist - car.dist) < MIN_GAP) {
    syncPosition(car);
    return;
  }

  // Intersection collision avoidance (only after the stop line)
  if (car.dist >= car.path.stopDist && shouldYield(car)) {
    syncPosition(car);
    return;
  }

  // All clear, move forward
  car.dist += car.speed;
  if (car.dist >= car.path.totalLength) {
    car.alive = false;
    return;
  }
  syncPosition(car);
}

/**
 * Check if a car should yield to another car in the intersection.
 * Uses directional check + deterministic ID tiebreaker.
 */
function shouldYield(car) {
  const nextPos = posAt(car.path, car.dist + car.speed);
  const fwd = posAt(car.path, car.dist + 10);
  const myDirX = fwd.x - car.x;
  const myDirY = fwd.y - car.y;

  for (const other of cars) {
    if (other === car || !other.alive || other.pathId === car.pathId) continue;
    if (other.dist <= other.path.stopDist - 5) continue;

    const dx = nextPos.x - other.x;
    const dy = nextPos.y - other.y;

    if (dx * dx + dy * dy >= COLLISION_RADIUS * COLLISION_RADIUS) continue;

    // Check if other car is ahead of us
    const toDx = other.x - car.x;
    const toDy = other.y - car.y;
    const dot = toDx * myDirX + toDy * myDirY;

    // Other car is ahead and close: yield only if we have lower priority
    if (dot > 0 && car.id > other.id) {
      return true;
    }
  }

  return false;
}

/**
 * Find the nearest car ahead on the same path.
 */
function findCarAhead(car) {
  let best = null;
  let bestGap = Infinity;

  for (const c of cars) {
    if (c === car || !c.alive || c.pathId !== car.pathId) continue;
    const gap = c.dist - car.dist;
    if (gap > 0 && gap < bestGap) {
      best = c;
      bestGap = gap;
    }
  }

  return best;
}

/**
 * Sync a car's x/y/angle from its current distance along its path.
 */
function syncPosition(car) {
  const p = posAt(car.path, car.dist);
  car.x = p.x;
  car.y = p.y;
  car.angle = p.angle;
}

/**
 * Run one update tick for all cars.
 *
 * @param {Object} lightStates - current traffic light states
 */
export function updateAll(lightStates) {
  for (const car of cars) {
    updateCar(car, lightStates);
  }
  cars = cars.filter(c => c.alive);
}

/** Get the current list of living cars. */
export function getCars() {
  return cars;
}

/** Get how many cars have been spawned total. */
export function getTotalSpawned() {
  return idCounter;
}

/** Exported constants for rendering. */
export { CAR_LENGTH, CAR_WIDTH };
