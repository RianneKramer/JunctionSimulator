/**
 * Canvas renderer for the intersection simulation.
 *
 * Draws detection zones, traffic light indicators at stop lines, and cars.
 */

import { posAt } from './pathMath.js';
import { getCars, CAR_LENGTH, CAR_WIDTH } from './carManager.js';
import { computeEntities } from './entityDetection.js';

const CANVAS_SIZE = 640;

/**
 * Render one frame onto the canvas.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} paths - map of computed paths
 * @param {Object} lightStates - map of light ID -> state (0/1/2)
 */
export function render(ctx, paths, lightStates) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const entities = computeEntities(paths);

  drawDetectionZones(ctx, paths, entities);
  drawTrafficLights(ctx, paths, lightStates);
  drawCars(ctx);
}

/**
 * Draw detection zones as highlighted path segments.
 */
function drawDetectionZones(ctx, paths, entities) {
  for (const [id, p] of Object.entries(paths)) {
    ctx.beginPath();
    ctx.strokeStyle = entities[id]
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

/**
 * Draw small traffic light indicators at each stop line.
 */
function drawTrafficLights(ctx, paths, lightStates) {
  for (const [id, p] of Object.entries(paths)) {
    const stop = posAt(p, p.stopDist);
    const ls = lightStates[id] || 0;
    const r = 5;

    // Background
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.roundRect(stop.x - 7, stop.y - 10, 14, 20, 3);
    ctx.fill();

    // Red bulb
    ctx.fillStyle = ls === 0 ? '#ff3333' : '#441111';
    ctx.beginPath();
    ctx.arc(stop.x, stop.y - 5, r - 1, 0, Math.PI * 2);
    ctx.fill();

    // Orange bulb
    ctx.fillStyle = ls === 1 ? '#ff9900' : '#332200';
    ctx.beginPath();
    ctx.arc(stop.x, stop.y, r - 1, 0, Math.PI * 2);
    ctx.fill();

    // Green bulb
    ctx.fillStyle = ls === 2 ? '#33ff33' : '#113311';
    ctx.beginPath();
    ctx.arc(stop.x, stop.y + 5, r - 1, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(id, stop.x, stop.y - 14);
  }
}

/**
 * Draw all living cars as colored rectangles with headlights.
 */
function drawCars(ctx) {
  for (const car of getCars()) {
    if (!car.alive) continue;

    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Body
    ctx.fillStyle = car.path.color;
    ctx.beginPath();
    ctx.roundRect(-CAR_LENGTH / 2, -CAR_WIDTH / 2, CAR_LENGTH, CAR_WIDTH, 3);
    ctx.fill();

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Headlights
    ctx.fillStyle = 'rgba(255,255,200,0.8)';
    ctx.fillRect(CAR_LENGTH / 2 - 2, -CAR_WIDTH / 2 + 1, 2, 3);
    ctx.fillRect(CAR_LENGTH / 2 - 2,  CAR_WIDTH / 2 - 4, 2, 3);

    ctx.restore();
  }
}
