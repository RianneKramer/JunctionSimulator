/**
 * Main entry point for the junction simulator.
 *
 * Wires together all modules: paths, cars, rendering, UI, and controller
 * communication. Runs the game loop and periodic controller POSTs.
 */

import { RAW_PATHS, MANUAL_LIGHTS } from './paths.js';
import { buildAllPaths } from './pathMath.js';
import { spawnCar, spawnRandom, updateAll } from './carManager.js';
import { postToController } from './controllerClient.js';
import { render } from './renderer.js';
import { buildPanel, updatePanel } from './ui.js';
import { loadConfig, setControllerUrl } from './config.js';

// Build computed paths from raw definitions
const paths = buildAllPaths(RAW_PATHS);
const pathIds = Object.keys(RAW_PATHS);

// Traffic light states (updated by controller responses)
const lightStates = {};
for (const id of Object.keys(RAW_PATHS)) lightStates[id] = 0;
for (const id of Object.keys(MANUAL_LIGHTS)) lightStates[id] = 0;

// Connection status
let connected = false;

// Canvas setup
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// Controller URL input
const urlInput = document.getElementById('curl');
document.querySelector('.cfg-row button').addEventListener('click', () => {
  setControllerUrl(urlInput.value);
});

// Make spawnCar available globally for the spawn buttons
window.spawnCar = (id) => spawnCar(id, paths);

// Build the side panel
buildPanel(document.getElementById('sections'), paths);

// Game loop
function gameLoop() {
  updateAll(lightStates);
  render(ctx, paths, lightStates);
  updatePanel(lightStates, connected);
  requestAnimationFrame(gameLoop);
}

// Periodic controller POST
async function controllerTick() {
  connected = await postToController(paths, lightStates);
}

// Initialize
async function init() {
  const config = await loadConfig();
  urlInput.value = config.controllerUrl + config.endpoint;

  // Start controller communication
  controllerTick();
  setInterval(controllerTick, config.postInterval);

  // Start random car spawning
  setInterval(() => spawnRandom(pathIds, paths), config.spawnInterval);

  // Start game loop
  requestAnimationFrame(gameLoop);

  // Spawn a few initial cars
  setTimeout(() => {
    spawnCar('2.1', paths);
    spawnCar('11.1', paths);
    spawnCar('5.1', paths);
  }, 500);
}

init();
