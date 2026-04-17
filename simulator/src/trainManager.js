/**
 * Train scheduling and animation state.
 *
 * The simulator decides when trains are due to arrive at the crossing and sends
 * that timestamp to the controller. The controller decides SP state. The
 * frontend renders barriers from controller output, while the train sprite uses
 * the local schedule for animation.
 */

let trainLeadMs = 8000;
let trainActiveMs = 12000;
let nextTrainArrivalAt = 0;
let currentTrainArrivalAt = 0;
let currentTrainActiveUntil = 0;

const DEFAULT_NEXT_TRAIN_GAP_MS = 60000;
const TRAIN_APPROACH_VISUAL_MS = 3000;
const TRAIN_PATH = {
  start: { x: 700, y: 438 },
  end: { x: -120, y: 438 },
};

function pickNextGapMs() {
  return DEFAULT_NEXT_TRAIN_GAP_MS + Math.round(Math.random() * 20000);
}

function ensureScheduled(now = Date.now()) {
  if (!nextTrainArrivalAt && !currentTrainActiveUntil) {
    nextTrainArrivalAt = now + pickNextGapMs();
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
  nextTrainArrivalAt = now + Math.max(delayMs, trainLeadMs + 1000);
}

export function triggerTrainSoon() {
  scheduleTrainAfter(trainLeadMs + 3000);
}

export function tickTrainSchedule(now = Date.now()) {
  ensureScheduled(now);

  if (!currentTrainArrivalAt && nextTrainArrivalAt && now >= nextTrainArrivalAt) {
    currentTrainArrivalAt = nextTrainArrivalAt;
    currentTrainActiveUntil = currentTrainArrivalAt + trainActiveMs;
    nextTrainArrivalAt = 0;
  }

  if (currentTrainActiveUntil && now > currentTrainActiveUntil) {
    currentTrainArrivalAt = 0;
    currentTrainActiveUntil = 0;
    nextTrainArrivalAt = now + pickNextGapMs();
  }
}

export function getNextTrainArrivalTimestamp() {
  if (currentTrainArrivalAt) return currentTrainArrivalAt;
  return nextTrainArrivalAt || 0;
}

export function getTrainScheduleState(now = Date.now()) {
  tickTrainSchedule(now);

  const activeArrival = currentTrainArrivalAt || nextTrainArrivalAt;
  const untilArrival = activeArrival ? activeArrival - now : 0;

  return {
    nextArrivalAt: nextTrainArrivalAt,
    currentArrivalAt: currentTrainArrivalAt,
    currentActiveUntil: currentTrainActiveUntil,
    trainLeadMs,
    trainActiveMs,
    untilArrival,
    isCrossing: !!currentTrainActiveUntil,
  };
}

export function getTrainRenderState(now = Date.now()) {
  tickTrainSchedule(now);

  let visible = false;
  let progress = 0;

  if (currentTrainArrivalAt) {
    const startAt = currentTrainArrivalAt - TRAIN_APPROACH_VISUAL_MS;
    const endAt = currentTrainActiveUntil;
    if (now >= startAt && now <= endAt) {
      visible = true;
      progress = Math.min(1, Math.max(0, (now - startAt) / Math.max(1, endAt - startAt)));
    }
  }

  const x = TRAIN_PATH.start.x + (TRAIN_PATH.end.x - TRAIN_PATH.start.x) * progress;
  const y = TRAIN_PATH.start.y + (TRAIN_PATH.end.y - TRAIN_PATH.start.y) * progress;

  return {
    visible,
    x,
    y,
    angle: Math.PI,
    progress,
  };
}
