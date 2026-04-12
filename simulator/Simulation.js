import Car from './Car.js';
import ControllerClient from './ControllerClient.js';
import TrafficLight from "./TrafficLight.js";
import config from './config.js';

/**
 * main simulation loop.
 * - spawns cars
 * - inits traffic lights
 * - POSTs state to controller every 3 seconds
 * - updates car states based on response
 */
export default class Simulation {
  constructor() {
    this.client = new ControllerClient();
    this.trafficLights = [];
    this.carCounter = 0;
    this.listeners = [];
  }

  /** Add state change listener */
  onUpdate(callback) {
    this.listeners.push(callback);
  }

  /** Notify listeners of state change */
  notify() {
    const state = this.trafficLights.map(light => light.getState());
    this.listeners.forEach(cb => cb(state));
  }

  /** Get current simulation state */
  getState() {
    return {
      trafficLights: this.trafficLights.map(light => light.getState())
    };
  }

  /** Spawn a new car */
  spawnCar() {
    const car = new Car(++this.carCounter);

    const lightId = config.carTrafficLights[
        Math.floor(Math.random() * config.carTrafficLights.length)
        ];

    const light = this.trafficLights.find(l => l.lightId === lightId);

    if (light) {
      light.addCar(car);
    }

    console.log(`[Simulator] Car ${car.id} spawned at ${lightId}`);
    this.notify();
  }

  /** run one cycle: POST to controller, handle response */
  async tick() {
    const payload = this.trafficLights.map(light => light.buildPayload());

    const response = await this.client.post(payload);

    if (response && response.trafficLights) {
      for (const light of this.trafficLights) {
        const newState = response.trafficLights[light.lightId];
        if (newState !== undefined) {
          console.log(
              `[Simulator] Light ${light.lightId} = ${newState} (${['red','orange','green'][newState]})`
          );

          // If green, let waiting cars pass
          if (newState === 2) {
            for (const light of this.trafficLights) {
              for (const car of light.getActiveCars()) {
                if (car.canPass()) {
                  car.pass();
                  console.log(`[Simulator] Car ${car.id} passed`);
                }
              }
            }

          } else {
            // Red/orange - cars wait
            for (const light of this.trafficLights) {
              for (const car of light.getActiveCars()) {
                if (car.isApproaching()) {
                  car.wait();
                  console.log(`[Simulator] Car ${car.id} waiting`);
                }
              }
            }
            light.updateState(newState);
          }
        }
      }
    }
    this.notify();
  }

  initCarTrafficLights() {
    this.trafficLights = [];

    for (const trafficLightId of config.carTrafficLights) {
      this.trafficLights.push(new TrafficLight(trafficLightId));
    }
  }

  /** Start the simulation loop */
  start() {
    console.log(`[Simulator] Starting - POST every ${config.postInterval}ms to ${config.controllerUrl}${config.endpoint}`);

    // Initialize Traffic Lights
    this.initCarTrafficLights();

    // Spawn first car
    this.spawnCar();

    // Main loop - POST every 3 seconds
    setInterval(() => this.tick(), config.postInterval);

    // Spawn new car every 10 seconds for demo
    setInterval(() => this.spawnCar(), 10000);
  }
}