/**
 * Side panel UI.
 */

import { RAW_PATHS, MANUAL_LIGHTS, SPECIAL_LIGHTS, RAIL_SIGNAL_ID, getSignalIds } from './paths.js';
import { getCars, getTotalSpawned, spawnCar } from './carManager.js';
import { requestManualEntity, getManualEntity } from './entityDetection.js';
import { getTrainScheduleState, triggerTrainSoon } from './trainManager.js';

export function buildPanel(container, paths) {
  let html = '';

  html += '<h3>Auto (Spawn Cars)</h3>';
  for (const signalId of getSignalIds(RAW_PATHS)) {
    const raw = RAW_PATHS[signalId];
    const variantCount = raw.variants?.length || 1;
    html += `
      <div class="light-row" id="row-${signalId}">
        <div class="ind s0" id="ind-${signalId}"></div>
        <span>${signalId} - ${raw.desc}</span>
        <span class="entity-count" id="cnt-${signalId}"></span>
        <span class="variant-count">${variantCount > 1 ? `${variantCount}x` : ''}</span>
        <button class="spawn-btn" data-spawn="${signalId}">Spawn</button>
      </div>`;
  }

  html += '<h3>Trein</h3>';
  html += `
    <div class="light-row" id="row-${RAIL_SIGNAL_ID}">
      <div class="ind s0" id="ind-${RAIL_SIGNAL_ID}"></div>
      <span>${RAIL_SIGNAL_ID} - ${SPECIAL_LIGHTS[RAIL_SIGNAL_ID].desc}</span>
      <button class="spawn-btn" id="train-btn">Train soon</button>
    </div>
    <div class="train-status" id="train-status">No train scheduled</div>`;

  html += '<h3>Bus</h3>';
  for (const [id, info] of Object.entries(MANUAL_LIGHTS)) {
    if (info.cat === 'bus') html += manualRow(id, info.desc);
  }

  html += '<h3>Fiets (Bicycle)</h3>';
  for (const [id, info] of Object.entries(MANUAL_LIGHTS)) {
    if (info.cat === 'fiets') html += manualRow(id, info.desc);
  }

  html += '<h3>Voetganger (Pedestrian)</h3>';
  for (const [id, info] of Object.entries(MANUAL_LIGHTS)) {
    if (info.cat === 'voetg') html += manualRow(id, info.desc);
  }

  container.innerHTML = html;

  container.querySelectorAll('[data-spawn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      spawnCar(btn.dataset.spawn, paths);
    });
  });

  container.querySelectorAll('[data-request]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.request;
      requestManualEntity(id);
      btn.className = 'entity-btn' + (getManualEntity(id) ? ' pending' : '');
      btn.textContent = getManualEntity(id) ? 'Pending' : 'Request';
    });
  });

  document.getElementById('train-btn')?.addEventListener('click', () => {
    triggerTrainSoon();
  });
}

function manualRow(id, desc) {
  return `
    <div class="light-row" id="row-${id}">
      <div class="ind s0" id="ind-${id}"></div>
      <span>${id} - ${desc}</span>
      <button class="entity-btn" id="ebtn-${id}" data-request="${id}">Request</button>
    </div>`;
}

export function updatePanel(lightStates, connected) {
  const allIds = [...getSignalIds(RAW_PATHS), ...Object.keys(MANUAL_LIGHTS), RAIL_SIGNAL_ID];

  for (const id of allIds) {
    const ind = document.getElementById('ind-' + id);
    if (ind) ind.className = 'ind s' + (lightStates[id] || 0);
  }

  const cars = getCars();
  for (const signalId of getSignalIds(RAW_PATHS)) {
    const cnt = document.getElementById('cnt-' + signalId);
    if (cnt) {
      const n = cars.filter((c) => c.alive && c.signalId === signalId).length;
      cnt.textContent = n > 0 ? n : '';
    }
  }

  for (const id of Object.keys(MANUAL_LIGHTS)) {
    const btn = document.getElementById('ebtn-' + id);
    if (!btn) continue;
    const pending = getManualEntity(id);
    btn.className = 'entity-btn' + (pending ? ' pending' : '');
    btn.textContent = pending ? 'Pending' : 'Request';
  }

  const dotEl = document.getElementById('dot');
  const stEl = document.getElementById('st');
  if (dotEl) dotEl.className = 'dot ' + (connected ? 'ok' : 'err');
  if (stEl) stEl.textContent = connected ? 'Connected' : 'Disconnected';

  const statsEl = document.getElementById('stats');
  if (statsEl) {
    const alive = cars.filter((c) => c.alive).length;
    statsEl.textContent = `Vehicles: ${alive} | Total spawned: ${getTotalSpawned()}`;
  }

  const trainState = getTrainScheduleState();
  const trainStatus = document.getElementById('train-status');
  if (trainStatus) {
    const now = Date.now();
    if (trainState.phase === 'warning') {
      trainStatus.textContent = `Warning | barriers lowering in ${secondsUntil(trainState.loweringStartAt, now)}s`;
    } else if (trainState.phase === 'lowering') {
      trainStatus.textContent = `Barriers lowering | closed in ${secondsUntil(trainState.closedStartAt, now)}s`;
    } else if (trainState.phase === 'closed') {
      trainStatus.textContent = `Train passing | opens in ${secondsUntil(trainState.closedUntil, now)}s`;
    } else if (trainState.phase === 'raising') {
      trainStatus.textContent = `Barriers raising | clears in ${secondsUntil(trainState.redUntil, now)}s`;
    } else if (trainState.nextArrivalAt) {
      trainStatus.textContent = `Next train arrives in ${Math.max(0, Math.ceil((trainState.nextArrivalAt - Date.now()) / 1000))}s`;
    } else {
      trainStatus.textContent = 'No train scheduled';
    }
  }
}

function secondsUntil(timestamp, now = Date.now()) {
  return Math.max(0, Math.ceil((timestamp - now) / 1000));
}
