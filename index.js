const TrafficLight = require('./TrafficLight');
const TrafficLightController = require('./TrafficLightController');
const TrafficLightState = require('./TrafficLightState');
const SpawnEvent = require('./SpawnEvent');
const config = require('./config');

console.log('=== Traffic Light Simulator ===\n');

const mode = config.mode;
console.log(`Mode: ${mode.toUpperCase()}`);
if (mode === 'connected') {
  console.log(`External Controller trigger: ${config.controller.baseUrl}${config.controller.triggerEndpoint}`);
  console.log(`External Controller state: ${config.controller.baseUrl}${config.controller.stateEndpoint}`);
  console.log(`Traffic Light ID: ${config.simulator.trafficLightId}\n`);
} else {
  console.log('Running in standalone mode (default when controller not connected)\n');
}

const trafficLight = new TrafficLight(config.simulator.trafficLightId);
const controller = new TrafficLightController(trafficLight, mode);

const spawnEvent = new SpawnEvent(
  controller, 
  config.simulator.carSpawnInterval
);
spawnEvent.start(config.simulator.trafficLightId);

let lightCycle = null;
if (mode === 'standalone') {
  let cycleCount = 0;
  lightCycle = setInterval(() => {
    const states = [TrafficLightState.GREEN, TrafficLightState.AMBER, TrafficLightState.RED];
    const currentState = states[cycleCount % states.length];
    controller.changeState(currentState);
    cycleCount++;
  }, 5000);
  console.log('Local traffic light cycling enabled (standalone mode)\n');
} else {
  console.log('Traffic light state controlled by external controller\n');
}

process.on('SIGINT', () => {
  console.log('\n\nShutting down simulator...');
  spawnEvent.stop();
  if (lightCycle) clearInterval(lightCycle);
  process.exit(0);
});

console.log('Simulator running. Press Ctrl+C to stop.\n');
