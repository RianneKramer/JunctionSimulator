/**
 * Canvas renderer for the intersection simulation.
 */

import { posAt, getRepresentativePaths } from './pathMath.js';
import { getCars } from './carManager.js';
import { computeEntities } from './entityDetection.js';
import { getTrainRenderState, getTrainScheduleState } from './trainManager.js';
import { RAIL_LAYOUT, RAIL_SIGNAL_ID } from './paths.js';

const CANVAS_SIZE = 640;
const TRAIN_BARRIER_CONFIG = {
  hingeRadius: 7,
  armWidth: 8,
  openLengthScale: 0.60,
  closedCenterMargin: 14,
  stripeWidth: 4,
  stripePattern: [14, 10],
  baseColor: '#d71920',
  stripeColor: '#ffffff',
  hingeColor: '#d71920',
};

export function render(ctx, paths, lightStates) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const entities = computeEntities(paths);
  const representativePaths = getRepresentativePaths(paths);

  drawRailCrossing(ctx, lightStates[RAIL_SIGNAL_ID] || 0);
  drawDetectionZones(ctx, representativePaths, entities);
  drawTrafficLights(ctx, representativePaths, lightStates);
  drawTrain(ctx);
  drawCars(ctx);
  drawTrainBarriers(ctx);
}

function drawRailCrossing(ctx, spState) {
  ctx.save();

  const [railStart, railEnd] = RAIL_LAYOUT.crossing.points;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(railStart[0], railStart[1] - 8);
  ctx.lineTo(railEnd[0], railEnd[1] - 8);
  ctx.moveTo(railStart[0], railStart[1] + 8);
  ctx.lineTo(railEnd[0], railEnd[1] + 8);
  ctx.stroke();

  const [signalPoint] = RAIL_LAYOUT.signal.points;
  const boxX = signalPoint[0];
  const boxY = signalPoint[1];
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.roundRect(boxX - 10, boxY - 16, 20, 32, 4);
  ctx.fill();

  ctx.fillStyle = spState === 0 ? '#ff3333' : '#441111';
  ctx.beginPath();
  ctx.arc(boxX, boxY - 6, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = spState === 1 ? '#ff9900' : '#332200';
  ctx.beginPath();
  ctx.arc(boxX, boxY, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = spState === 2 ? '#33ff33' : '#113311';
  ctx.beginPath();
  ctx.arc(boxX, boxY + 6, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('sb', boxX, boxY - 22);

  ctx.restore();
}

function getBarrierClosedProgress(trainState, now = Date.now()) {
  if (trainState.phase === 'lowering') {
    const elapsed = now - trainState.loweringStartAt;
    return clamp01(elapsed / Math.max(1, trainState.trainLoweringMs));
  }

  if (trainState.phase === 'closed') return 1;

  if (trainState.phase === 'raising') {
    const elapsed = now - trainState.closedUntil;
    return 1 - clamp01(elapsed / Math.max(1, trainState.trainRaisingMs));
  }

  return 0;
}

function drawTrainBarriers(ctx) {
  const trainState = getTrainScheduleState();
  const closedProgress = easeInOut(getBarrierClosedProgress(trainState));
  const [railStart, railEnd] = RAIL_LAYOUT.crossing.points;
  const centerX = (railStart[0] + railEnd[0]) / 2;
  const centerY = (railStart[1] + railEnd[1]) / 2;
  const railAngle = Math.atan2(railEnd[1] - railStart[1], railEnd[0] - railStart[0]);
  const barrierPoints = RAIL_LAYOUT.barriers?.points || [
    [centerX - 110, centerY - 20],
    [centerX + 110, centerY + 20],
  ];
  const [topHinge, bottomHinge] = barrierPoints;
  const halfHingeDistance = Math.hypot(
    bottomHinge[0] - topHinge[0],
    bottomHinge[1] - topHinge[1],
  ) / 2;
  const openLength = Math.max(
    40,
    halfHingeDistance * TRAIN_BARRIER_CONFIG.openLengthScale,
  );
  const closedLength = Math.max(
    openLength,
    halfHingeDistance - TRAIN_BARRIER_CONFIG.closedCenterMargin,
  );

  drawBarrierArm(ctx, {
    hingeX: topHinge[0],
    hingeY: topHinge[1],
    closedAngle: railAngle,
    openLength,
    closedLength,
    closedProgress,
    openDirection: -1,
  });

  drawBarrierArm(ctx, {
    hingeX: bottomHinge[0],
    hingeY: bottomHinge[1],
    closedAngle: railAngle + Math.PI,
    openLength,
    closedLength,
    closedProgress,
    openDirection: 1,
  });
}

function drawBarrierArm(ctx, { hingeX, hingeY, closedAngle, openLength, closedLength, closedProgress, openDirection }) {
  const openAngle = closedAngle + openDirection * Math.PI / 2;
  const angle = openAngle + Math.atan2(
    Math.sin(closedAngle - openAngle),
    Math.cos(closedAngle - openAngle),
  ) * closedProgress;
  const length = openLength + (closedLength - openLength) * closedProgress;

  ctx.save();
  ctx.translate(hingeX, hingeY);

  ctx.fillStyle = TRAIN_BARRIER_CONFIG.hingeColor;
  ctx.beginPath();
  ctx.arc(0, 0, TRAIN_BARRIER_CONFIG.hingeRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(angle);
  ctx.lineCap = 'butt';
  ctx.lineWidth = TRAIN_BARRIER_CONFIG.armWidth;
  ctx.strokeStyle = TRAIN_BARRIER_CONFIG.baseColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(length, 0);
  ctx.stroke();

  ctx.lineWidth = TRAIN_BARRIER_CONFIG.stripeWidth;
  ctx.strokeStyle = TRAIN_BARRIER_CONFIG.stripeColor;
  ctx.setLineDash(TRAIN_BARRIER_CONFIG.stripePattern);
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(length, 0);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function easeInOut(value) {
  const t = clamp01(value);
  return 0.5 - Math.cos(t * Math.PI) / 2;
}

function drawDetectionZones(ctx, paths, entities) {
  for (const [signalId, p] of Object.entries(paths)) {
    ctx.beginPath();
    ctx.strokeStyle = entities[signalId]
      ? 'rgba(255,200,0,0.4)'
      : 'rgba(100,100,100,0.2)';
    ctx.lineWidth = p.entityType === 'pedestrian' ? 7 : p.entityType === 'bike' ? 9 : 14;
    ctx.lineCap = 'round';

    const start = posAt(p, p.detectDist);
    ctx.moveTo(start.x, start.y);

    for (let d = p.detectDist; d <= p.stopDist; d += 5) {
      const pt = posAt(p, d);
      ctx.lineTo(pt.x, pt.y);
    }

    ctx.stroke();
  }
}

function drawTrafficLights(ctx, paths, lightStates) {
  for (const [signalId, p] of Object.entries(paths)) {
    const stop = posAt(p, p.stopDist);
    const ls = lightStates[signalId] || 0;
    const isBusSignal = p.entityType === 'bus';
    const isGo = isBusSignal ? [2, 3, 4].includes(ls) : ls === 2;
    const r = 5;

    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.roundRect(stop.x - 7, stop.y - 10, 14, 20, 3);
    ctx.fill();

    ctx.fillStyle = ls === 0 ? '#ff3333' : '#441111';
    ctx.beginPath();
    ctx.arc(stop.x, stop.y - 5, r - 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ls === 1 ? '#ff9900' : '#332200';
    ctx.beginPath();
    ctx.arc(stop.x, stop.y, r - 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isGo ? '#33ff33' : '#113311';
    ctx.beginPath();
    ctx.arc(stop.x, stop.y + 5, r - 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(signalId, stop.x, stop.y - 14);
  }
}

function drawTrain(ctx) {
  const train = getTrainRenderState();
  if (!train.visible) return;

  const cabinLength = 108;
  const forwardX = Math.cos(train.angle);
  const forwardY = Math.sin(train.angle);

  for (let i = 0; i < train.cabinCount; i++) {
    const offset = cabinLength / 2 + i * train.cabinSpacing;
    const cabinX = train.x - forwardX * offset;
    const cabinY = train.y - forwardY * offset;

    ctx.save();
    ctx.translate(cabinX, cabinY);
    ctx.rotate(train.angle);
    ctx.scale(1, Math.cos(train.angle) < 0 ? -1 : 1);

    ctx.fillStyle = '#5dade2';
    ctx.beginPath();
    ctx.roundRect(-cabinLength / 2, -12, cabinLength, 24, 6);
    ctx.fill();

    ctx.fillStyle = '#d6eaf8';
    for (let x = -42; x <= 28; x += 18) {
      ctx.fillRect(x, -7, 10, 8);
    }

    ctx.fillStyle = '#1b4f72';
    ctx.fillRect(-56, 10, 112, 4);

    ctx.restore();
  }
}

function drawCars(ctx) {
  for (const car of getCars()) {
    if (!car.alive) continue;

    if (car.vehicleType === 'pedestrian') {
      drawPedestrian(ctx, car);
      continue;
    }

    if (car.vehicleType === 'bike') {
      drawBike(ctx, car);
      continue;
    }

    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    ctx.fillStyle = car.vehicleType === 'bus' ? '#9b59b6' : car.path.color;
    ctx.beginPath();
    ctx.roundRect(-car.length / 2, -car.width / 2, car.length, car.width, 3);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,200,0.8)';
    ctx.fillRect(car.length / 2 - 2, -car.width / 2 + 1, 2, 3);
    ctx.fillRect(car.length / 2 - 2, car.width / 2 - 4, 2, 3);

    ctx.restore();
  }
}

function drawBike(ctx, bike) {
  ctx.save();
  ctx.translate(bike.x, bike.y);

  ctx.strokeStyle = '#0b6b57';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-4, 0, 3, 0, Math.PI * 2);
  ctx.arc(5, 0, 3, 0, Math.PI * 2);
  ctx.moveTo(-4, 0);
  ctx.lineTo(0, -4);
  ctx.lineTo(5, 0);
  ctx.moveTo(0, -4);
  ctx.lineTo(2, -8);
  ctx.stroke();

  ctx.fillStyle = bike.path.color || '#16a085';
  ctx.beginPath();
  ctx.arc(0, -6, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPedestrian(ctx, pedestrian) {
  ctx.save();
  ctx.translate(pedestrian.x, pedestrian.y);

  ctx.fillStyle = pedestrian.path.color || '#7bdcb5';
  ctx.beginPath();
  ctx.arc(0, -4, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1b5e4a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.lineTo(0, 5);
  ctx.moveTo(-4, 2);
  ctx.lineTo(4, 2);
  ctx.moveTo(0, 5);
  ctx.lineTo(-3, 10);
  ctx.moveTo(0, 5);
  ctx.lineTo(3, 10);
  ctx.stroke();

  ctx.restore();
}
