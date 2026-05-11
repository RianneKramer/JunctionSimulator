/**
 * Train scheduling and animation state.
 *
 * Protocol constraint: trainArrivalTimestamp is t=0: the moment the train
 * crossing is closed and the train starts passing. Warning and lowering start
 * before that timestamp; only the t=0 timestamp is sent to the controller.
 */

import { RAIL_LAYOUT } from "./paths.js";
import { buildPath, posAt } from "./pathMath.js";

let trainIntervalMs = 90000;
let trainWarningMs = 5000;
let trainLoweringMs = 15000;
let trainClosedMs = 30000;
let trainRaisingMs = 15000;
let nextTrainArrivalAt = 0;
let currentTrainArrivalAt = 0;

const TRAIN_CABIN_COUNT = 3;
const TRAIN_CABIN_SPACING = 110;
const TRAIN_CABIN_LENGTH = 108;

function getProcedureDurationMs() {
  return trainWarningMs + trainLoweringMs + trainClosedMs + trainRaisingMs;
}

function getPreArrivalDurationMs() {
  return trainWarningMs + trainLoweringMs;
}

function getProcedureStartAt(arrivalAt) {
  return arrivalAt - getPreArrivalDurationMs();
}

function getProcedureEndAt(arrivalAt) {
  return arrivalAt + trainClosedMs + trainRaisingMs;
}

function getClosedStartOffsetMs() {
  return 0;
}

function getRaisingStartOffsetMs() {
  return trainClosedMs;
}

function getPhaseAt(now, arrivalAt) {
  if (!arrivalAt) return "waiting";
  const elapsed = now - getProcedureStartAt(arrivalAt);
  if (elapsed < 0) return "waiting";
  if (elapsed < trainWarningMs) return "warning";
  if (elapsed < getPreArrivalDurationMs()) return "lowering";
  if (elapsed < getPreArrivalDurationMs() + trainClosedMs) return "closed";
  if (elapsed < getProcedureDurationMs()) return "raising";
  return "waiting";
}

function normalizePositiveMs(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getTrainLengthPx() {
  return (
    TRAIN_CABIN_LENGTH / 2 +
    (TRAIN_CABIN_COUNT - 1) * TRAIN_CABIN_SPACING +
    TRAIN_CABIN_LENGTH / 2
  );
}

function buildExtendedTrainPath() {
  const rawPoints = structuredClone(RAIL_LAYOUT.trainPath.points);
  if (rawPoints.length < 2) {
    return buildPath({
      points: [
        [0, 0],
        [1, 0],
      ],
      stopIdx: 1,
      detectIdx: 0,
      color: "#5dade2",
      desc: "train",
    });
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
    color: "#5dade2",
    desc: "train",
  });
}

function ensureScheduled(now = Date.now()) {
  if (!nextTrainArrivalAt && !currentTrainArrivalAt) {
    nextTrainArrivalAt = now + trainIntervalMs;
  }
}

export function configureTrain(options = {}) {
  trainIntervalMs = normalizePositiveMs(
    options.trainIntervalMs,
    trainIntervalMs,
  );
  trainWarningMs = normalizePositiveMs(options.trainWarningMs, trainWarningMs);
  trainLoweringMs = normalizePositiveMs(
    options.trainLoweringMs,
    trainLoweringMs,
  );
  trainClosedMs = normalizePositiveMs(options.trainClosedMs, trainClosedMs);
  trainRaisingMs = normalizePositiveMs(options.trainRaisingMs, trainRaisingMs);
  ensureScheduled();
}

export function scheduleTrainAfter(delayMs) {
  const now = Date.now();
  nextTrainArrivalAt = now + Math.max(0, delayMs);
  currentTrainArrivalAt = 0;
}

export function triggerTrainSoon() {
  scheduleTrainAfter(getPreArrivalDurationMs() + 5000);
}

export function tickTrainSchedule(now = Date.now()) {
  ensureScheduled(now);

  if (
    !currentTrainArrivalAt &&
    nextTrainArrivalAt &&
    now >= getProcedureStartAt(nextTrainArrivalAt)
  ) {
    currentTrainArrivalAt = nextTrainArrivalAt;
    nextTrainArrivalAt = 0;
  }

  if (
    currentTrainArrivalAt &&
    now >= getProcedureEndAt(currentTrainArrivalAt)
  ) {
    const previousArrivalAt = currentTrainArrivalAt;
    currentTrainArrivalAt = 0;
    nextTrainArrivalAt = previousArrivalAt + trainIntervalMs;
    while (nextTrainArrivalAt <= now) {
      nextTrainArrivalAt += trainIntervalMs;
    }
  }
}

export function getNextTrainArrivalTimestamp() {
  if (currentTrainArrivalAt) return currentTrainArrivalAt;
  return nextTrainArrivalAt || 0;
}

export function getTrainScheduleState(now = Date.now()) {
  tickTrainSchedule(now);

  const procedureDurationMs = getProcedureDurationMs();
  const closedStartAt = currentTrainArrivalAt
    ? currentTrainArrivalAt + getClosedStartOffsetMs()
    : 0;
  const closedUntil = currentTrainArrivalAt
    ? currentTrainArrivalAt + getRaisingStartOffsetMs()
    : 0;
  const procedureStartAt = currentTrainArrivalAt
    ? getProcedureStartAt(currentTrainArrivalAt)
    : 0;
  const loweringStartAt = procedureStartAt
    ? procedureStartAt + trainWarningMs
    : 0;
  const redUntil = currentTrainArrivalAt
    ? getProcedureEndAt(currentTrainArrivalAt)
    : 0;
  const phase = getPhaseAt(now, currentTrainArrivalAt);
  const activeArrival = currentTrainArrivalAt || nextTrainArrivalAt;
  const untilArrival = activeArrival ? activeArrival - now : 0;

  return {
    nextArrivalAt: nextTrainArrivalAt,
    currentArrivalAt: currentTrainArrivalAt,
    procedureStartAt,
    loweringStartAt,
    currentActiveUntil: redUntil,
    closedStartAt,
    closedUntil,
    redUntil,
    trainIntervalMs,
    trainWarningMs,
    trainLoweringMs,
    trainClosedMs,
    trainRaisingMs,
    procedureDurationMs,
    untilArrival,
    phase,
    isProcedureActive: !!currentTrainArrivalAt,
    isCrossing: phase === "closed",
    cabinCount: TRAIN_CABIN_COUNT,
    cabinSpacing: TRAIN_CABIN_SPACING,
    cabinLength: TRAIN_CABIN_LENGTH,
  };
}

export function getTrainRenderState(now = Date.now()) {
  tickTrainSchedule(now);

  const phase = getPhaseAt(now, currentTrainArrivalAt);
  if (phase !== "closed") {
    return {
      visible: false,
      x: 0,
      y: 0,
      angle: Math.PI,
      progress: 0,
      cabinCount: TRAIN_CABIN_COUNT,
      cabinSpacing: TRAIN_CABIN_SPACING,
      cabinLength: TRAIN_CABIN_LENGTH,
      renderTotalMs: trainClosedMs,
    };
  }

  const closedStartAt = currentTrainArrivalAt + getClosedStartOffsetMs();
  const elapsed = now - closedStartAt;
  const progress = Math.min(
    1,
    Math.max(0, elapsed / Math.max(1, trainClosedMs)),
  );
  const trainPath = buildExtendedTrainPath();
  const noseDist = trainPath.totalLength * progress;
  const nose = posAt(trainPath, noseDist);

  return {
    visible: true,
    x: nose.x,
    y: nose.y,
    angle: nose.angle,
    progress,
    cabinCount: TRAIN_CABIN_COUNT,
    cabinSpacing: TRAIN_CABIN_SPACING,
    cabinLength: TRAIN_CABIN_LENGTH,
    renderTotalMs: trainClosedMs,
  };
}
