/**
 * Side panel UI.
 *
 * Builds the light rows with spawn buttons and entity toggles,
 * and updates their visual state each frame.
 */

import { RAW_PATHS, MANUAL_LIGHTS } from './paths.js';
import { getCars, getTotalSpawned, spawnCar } from './carManager.js';
import { toggleManualEntity, getManualEntity } from './entityDetection.js';

/**
 * Build the side panel HTML for all light categories.
 *
 * @param {HTMLElement} container - the #sections element
 * @param {Object} paths - computed paths (needed for spawn)
 */
export function buildPanel(container, paths) {
  let html = '';

  // Car lights with spawn buttons
  html += '<h3>Auto (Spawn Cars)</h3>';
  for (const [id, raw] of Object.entries(RAW_PATHS)) {
    html += `
      <div class="light-row" id="row-${id}">
        <div class="ind s0" id="ind-${id}"></div>
        <span>${id} - ${raw.desc}</span>
        <span class="entity-count" id="cnt-${id}"></span>
        <button class="spawn-btn" data-spawn="${id}">Spawn</button>
      </div>`;
  }

  // Bus
  html += '<h3>Bus</h3>';
  for (const [id, info] of Object.entries(MANUAL_LIGHTS)) {
    if (info.cat === 'bus') html += manualRow(id, info.desc);
  }

  // Fiets
  html += '<h3>Fiets (Bicycle)</h3>';
  for (const [id, info] of Object.entries(MANUAL_LIGHTS)) {
    if (info.cat === 'fiets') html += manualRow(id, info.desc);
  }

  // Voetganger
  html += '<h3>Voetganger (Pedestrian)</h3>';
  for (const [id, info] of Object.entries(MANUAL_LIGHTS)) {
    if (info.cat === 'voetg') html += manualRow(id, info.desc);
  }

  container.innerHTML = html;

  // Attach event listeners (no inline onclick)
  container.querySelectorAll('[data-spawn]').forEach(btn => {
    btn.addEventListener('click', () => {
      spawnCar(btn.dataset.spawn, paths);
    });
  });

  container.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggle;
      toggleManualEntity(id);
      btn.className = 'entity-btn' + (getManualEntity(id) ? ' on' : '');
    });
  });
}

function manualRow(id, desc) {
  return `
    <div class="light-row" id="row-${id}">
      <div class="ind s0" id="ind-${id}"></div>
      <span>${id} - ${desc}</span>
      <button class="entity-btn" id="ebtn-${id}" data-toggle="${id}">Entity</button>
    </div>`;
}

/**
 * Update the panel to reflect current light states and car counts.
 *
 * @param {Object} lightStates - map of light ID -> state
 * @param {boolean} connected - controller connection status
 */
export function updatePanel(lightStates, connected) {
  const allIds = [...Object.keys(RAW_PATHS), ...Object.keys(MANUAL_LIGHTS)];

  for (const id of allIds) {
    const ind = document.getElementById('ind-' + id);
    if (ind) ind.className = 'ind s' + (lightStates[id] || 0);
  }

  const cars = getCars();
  for (const id of Object.keys(RAW_PATHS)) {
    const cnt = document.getElementById('cnt-' + id);
    if (cnt) {
      const n = cars.filter(c => c.alive && c.pathId === id).length;
      cnt.textContent = n > 0 ? n : '';
    }
  }

  const dotEl = document.getElementById('dot');
  const stEl = document.getElementById('st');
  if (dotEl) dotEl.className = 'dot ' + (connected ? 'ok' : 'err');
  if (stEl) stEl.textContent = connected ? 'Connected' : 'Disconnected';

  const statsEl = document.getElementById('stats');
  if (statsEl) {
    const alive = cars.filter(c => c.alive).length;
    statsEl.textContent = `Cars: ${alive} | Total spawned: ${getTotalSpawned()}`;
  }
}
