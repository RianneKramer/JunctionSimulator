/**
 * Canvas renderer for the intersection simulation.
 */

import { posAt, getRepresentativePaths } from './pathMath.js';
import { getCars } from './carManager.js';
import { computeEntities } from './entityDetection.js';
import { getTrainRenderState } from './trainManager.js';
import { RAIL_SIGNAL_ID } from './paths.js';

const CANVAS_SIZE = 640;
const RAIL_Y = 438;
const BARRIER_LEFT = { x: 346, y: 454 };
const BARRIER_RIGHT = { x: 380, y: 454 };

export function render(ctx, paths, lightStates) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const entities = computeEntities(paths);
  const representativePaths = getRepresentativePaths(paths);

  drawRailCrossing(ctx, lightStates[RAIL_SIGNAL_ID] || 0);
  drawDetectionZones(ctx, representativePaths, entities);
  drawTrafficLights(ctx, representativePaths, lightStates);
  drawTrain(ctx);
  drawCars(ctx);
}

function drawRailCrossing(ctx, spState) {
  ctx.save();

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, RAIL_Y - 8);
  ctx.lineTo(CANVAS_SIZE, RAIL_Y - 8);
  ctx.moveTo(0, RAIL_Y + 8);
  ctx.lineTo(CANVAS_SIZE, RAIL_Y + 8);
  ctx.stroke();

  drawBarrier(ctx, BARRIER_LEFT.x, BARRIER_LEFT.y, spState, -1);
  drawBarrier(ctx, BARRIER_RIGHT.x, BARRIER_RIGHT.y, spState, 1);

  const boxX = 363;
  const boxY = 430;
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.roundRect(boxX - 10, boxY - 16, 20, 32, 4);
  ctx.fill();

  ctx.fillStyle = spState === 0 ? '#ff3333' : '#441111';
  ctx.beginPath();
  ctx.arc(boxX, boxY - 6, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = spState === 1 ? '#cccccc' : '#444';
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
  ctx.fillText('SP', boxX, boxY - 22);

  ctx.restore();
}

function drawBarrier(ctx, x, y, spState, side) {
  const progress = spState === 2 ? 1 : spState === 1 ? 0.7 : 0;
  const angle = side * (Math.PI / 2) * progress;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(side * 42, 0);
  ctx.stroke();

  ctx.strokeStyle = '#ff3b3b';
  ctx.lineWidth = 2;
  for (let i = 6; i < 42; i += 10) {
    ctx.beginPath();
    ctx.moveTo(side * i, -2);
    ctx.lineTo(side * (i + 4), 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawDetectionZones(ctx, paths, entities) {
  for (const [signalId, p] of Object.entries(paths)) {
    ctx.beginPath();
    ctx.strokeStyle = entities[signalId]
      ? 'rgba(255,200,0,0.4)'
      : 'rgba(100,100,100,0.2)';
    ctx.lineWidth = 14;
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

    ctx.fillStyle = ls === 2 ? '#33ff33' : '#113311';
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

  ctx.save();
  ctx.translate(train.x, train.y);
  ctx.rotate(train.angle);

  ctx.fillStyle = '#5dade2';
  ctx.beginPath();
  ctx.roundRect(-54, -12, 108, 24, 6);
  ctx.fill();

  ctx.fillStyle = '#d6eaf8';
  for (let x = -42; x <= 28; x += 18) {
    ctx.fillRect(x, -7, 10, 8);
  }

  ctx.fillStyle = '#1b4f72';
  ctx.fillRect(-56, 10, 112, 4);

  ctx.restore();
}

function drawCars(ctx) {
  for (const car of getCars()) {
    if (!car.alive) continue;

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
