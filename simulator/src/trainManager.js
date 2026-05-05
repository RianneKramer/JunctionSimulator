/**
 * Train scheduling and animation state.
 *
 * Protocol constraint: trainArrivalTimestamp is the moment the train nose
 * appears at the editable train-path start point. The controller uses that as
 * the anchor for SP preemption. The train then continues across the full path
 * until its tail is fully off-screen.
 */

import { RAIL_LAYOUT } from './paths.js';
import { buildPath, posAt } from './pathMath.js';

let trainLeadMs = 5000;
let trainActiveMs = 6000;
let nextTrainSpawnAt = 0;
let currentTrainSpawnAt = 0;
let currentTrainActiveUntil = 0;

const DEFAULT_NEXT_TRAIN_GAP_MS = 60000;
const TRAIN_CABIN_COUNT = 3;
const TRAIN_CABIN_SPACING = 110;
const TRAIN_CABIN_LENGTH = 108;

function pickNextGapMs() {
  return DEFAULT_NEXT_TRAIN_GAP_MS + Math.round(Math.random() * 20000);
}

function getTrainLengthPx() {
  return TRAIN_CABIN_LENGTH / 2 + (TRAIN_CABIN_COUNT - 1) * TRAIN_CABIN_SPACING + TRAIN_CABIN_LENGTH / 2;
}

function buildExtendedTrainPath() {
  const rawPoints = structuredClone(RAIL_LAYOUT.trainPath.points);
  if (rawPoints.length < 2) {
    return buildPath({ points: [[0, 0], [1, 0]], stopIdx: 1, detectIdx: 0, color: '#5dade2', desc: 'train' });
  }

  const n = rawPoints.length - 1;
  const last = rawPoints[n];
  const prev = rawPoints[n - 1];
  const dx = last[0] - prev[0];
  const dy = last[1] - prev[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const extendBy = getTrainLengthPx();

  rawPoints.push([
    Math.round(last[0] + ux * extendBy),
    Math.round(last[1] + uy * extendBy),
  ]);

  return buildPath({
    points: rawPoints,
    stopIdx: Math.max(1, rawPoints.length - 1),
    detectIdx: Math.max(0, rawPoints.length - 2),
    color: '#5dade2',
    desc: 'train',
  });
}

function ensureScheduled(now = Date.now()) {
  if (!nextTrainSpawnAt && !currentTrainActiveUntil) {
    nextTrainSpawnAt = now + pickNextGapMs();
  }
}

export function configureTrain(options = {}) {
  if (Number.isFinite(options.trainLeadMs) && options.trainLeadMs > 0) {
    trainLeadMs = options.trainLeadMs;
  }
  if (Number.isFinite(options.trainActiveMs) && options.trainActiveMs > 0) {
    trainActiveMs = options.trainActiveMs;
  }
  ensureScheduled();
}

export function scheduleTrainAfter(delayMs) {
  const now = Date.now();
  nextTrainSpawnAt = now + Math.max(delayMs, trainLeadMs + 1000);
}

export function triggerTrainSoon() {
  scheduleTrainAfter(trainLeadMs + 3000);
}

export function tickTrainSchedule(now = Date.now()) {
  ensureScheduled(now);

  if (!currentTrainSpawnAt && nextTrainSpawnAt && now >= nextTrainSpawnAt) {
    currentTrainSpawnAt = nextTrainSpawnAt;
    currentTrainActiveUntil = currentTrainSpawnAt + trainActiveMs;
    nextTrainSpawnAt = 0;
  }

  if (currentTrainActiveUntil && now > currentTrainActiveUntil) {
    currentTrainSpawnAt = 0;
    currentTrainActiveUntil = 0;
    nextTrainSpawnAt = now + pickNextGapMs();
  }
}

export function getNextTrainArrivalTimestamp() {
  if (currentTrainSpawnAt) return currentTrainSpawnAt;
  return nextTrainSpawnAt || 0;
}

export function getTrainScheduleState(now = Date.now()) {
  tickTrainSchedule(now);

  const activeSpawn = currentTrainSpawnAt || nextTrainSpawnAt;
  const untilSpawn = activeSpawn ? activeSpawn - now : 0;

  return {
    nextArrivalAt: nextTrainSpawnAt,
    currentArrivalAt: currentTrainSpawnAt,
    currentActiveUntil: currentTrainActiveUntil,
    trainLeadMs,
    trainActiveMs,
    untilArrival: untilSpawn,
    isCrossing: !!currentTrainActiveUntil,
    cabinCount: TRAIN_CABIN_COUNT,
    cabinSpacing: TRAIN_CABIN_SPACING,
    cabinLength: TRAIN_CABIN_LENGTH,
  };
}

export function getTrainRenderState(now = Date.now()) {
  tickTrainSchedule(now);

  if (!currentTrainSpawnAt) {
    return {
      visible: false,
      x: 0,
      y: 0,
      angle: Math.PI,
      progress: 0,
      cabinCount: TRAIN_CABIN_COUNT,
      cabinSpacing: TRAIN_CABIN_SPACING,
      cabinLength: TRAIN_CABIN_LENGTH,
      renderTotalMs: trainActiveMs,
    };
  }

  const elapsed = now - currentTrainSpawnAt;
  const progress = Math.min(1, Math.max(0, elapsed / Math.max(1, trainActiveMs)));
  const trainPath = buildExtendedTrainPath();
  const noseDist = trainPath.totalLength * progress;
  const nose = posAt(trainPath, noseDist);

  return {
    visible: now <= currentTrainActiveUntil,
    x: nose.x,
    y: nose.y,
    angle: nose.angle,
    progress,
    cabinCount: TRAIN_CABIN_COUNT,
    cabinSpacing: TRAIN_CABIN_SPACING,
    cabinLength: TRAIN_CABIN_LENGTH,
    renderTotalMs: trainActiveMs,
  };
}
