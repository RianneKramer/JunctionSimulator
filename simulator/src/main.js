/**
 * Main entry point for the junction simulator.
 */

import { RAW_PATHS, MANUAL_LIGHTS, RAIL_SIGNAL_ID, getSignalIds } from './paths.js';
import { buildAllPaths } from './pathMath.js';
import { spawnCar, spawnRandom, updateAll } from './carManager.js';
import { postToController } from './controllerClient.js';
import { render } from './renderer.js';
import { buildPanel, updatePanel } from './ui.js';
import { loadConfig, setControllerUrl } from './config.js';
import { updateManualRequestStates } from './entityDetection.js';
import { configureTrain, tickTrainSchedule } from './trainManager.js';

const paths = buildAllPaths(RAW_PATHS);
const signalIds = getSignalIds(RAW_PATHS);

const lightStates = {};
for (const id of signalIds) lightStates[id] = 0;
for (const id of Object.keys(MANUAL_LIGHTS)) lightStates[id] = 0;
lightStates[RAIL_SIGNAL_ID] = 0;

let connected = false;

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const urlInput = document.getElementById('curl');
document.querySelector('.cfg-row button').addEventListener('click', async () => {
  try {
    const ok = await setControllerUrl(urlInput.value);
    if (!ok) {
      alert('Could not save controller URL. Check simulator server connection.');
      return;
    }
    const cfg = await loadConfig();
    urlInput.value = cfg.controllerUrl + cfg.endpoint;
  } catch (e) {
    alert('Invalid controller URL. Use format: http://host:port/data');
  }
});

window.spawnCar = (id) => spawnCar(id, paths);

buildPanel(document.getElementById('sections'), paths);

function gameLoop() {
  tickTrainSchedule();
  updateAll(lightStates);
  updateManualRequestStates(lightStates);
  render(ctx, paths, lightStates);
  updatePanel(lightStates, connected);
  requestAnimationFrame(gameLoop);
}

async function controllerTick() {
  connected = await postToController(paths, lightStates);
}

async function init() {
  const config = await loadConfig();
  urlInput.value = config.controllerUrl + config.endpoint;
  configureTrain({
    trainIntervalMs: config.trainIntervalMs,
    trainWarningMs: config.trainWarningMs,
    trainLoweringMs: config.trainLoweringMs,
    trainClosedMs: config.trainClosedMs,
    trainRaisingMs: config.trainRaisingMs,
  });

  controllerTick();
  setInterval(controllerTick, config.postInterval);
  setInterval(() => spawnRandom(signalIds, paths), config.spawnInterval);

  requestAnimationFrame(gameLoop);

  setTimeout(() => {
    spawnCar('2.1', paths);
    spawnCar('11.1', paths);
    spawnCar('5.1', paths);
  }, 500);
}

init();
