import Car from './Car.js';
import ControllerClient from './ControllerClient.js';
import config from './config.js';

/**
 * main simulation loop.
 * - spawns cars
 * - POSTs state to controler every 3 seconds
 * - updates car states based on response
 */
export default class Simulation {
  constructor() {
    this.client = new ControllerClient();
    this.cars = [];
    this.carCounter = 0;
    this.lightState = 0; // 0=red, 1=orange, 2=green
    this.lightId = config.trafficLightId;
    this.listeners = [];
  }

  /** Add state change listener */
  onUpdate(callback) {
    this.listeners.push(callback);
  }

  /** Notify listeners of state change */
  notify() {
    const state = this.getState();
    this.listeners.forEach(cb => cb(state));
  }

  /** Get current simulation state */
  getState() {
    return {
      lightId: this.lightId,
      lightState: this.lightState,
      cars: this.cars.map(c => ({ id: c.id, state: c.state }))
    };
  }

  /** Spawn a new car */
  spawnCar() {
    const car = new Car(++this.carCounter);
    this.cars.push(car);
    console.log(`[Simulator] Car ${car.id} spawned`);
    this.notify();
  }

  /** run one cycle: POST to controller, handle response */
  async tick() {
    // build payload - only include cars with entity presence
    const activeCars = this.cars.filter(c => c.isActive());
    const hasEntity = activeCars.some(c => c.hasEntity());

    const trafficLights = [{
      id: this.lightId,
      hasEntity: hasEntity,
      triggeredTimestamp: activeCars.length > 0 ? activeCars[0].triggeredTimestamp : Date.now()
    }];

    // POST to controller
    const response = await this.client.post(trafficLights);

    if (response && response.trafficLights) {
      const newState = response.trafficLights[this.lightId];
      if (newState !== undefined) {
        this.lightState = newState;
        console.log(`[Simulator] Light ${this.lightId} = ${newState} (${['red', 'orange', 'green'][newState]})`);

        // If green, let waiting cars pass
        if (newState === 2) {
          for (const car of activeCars) {
            if (car.state === 'waiting' || car.state === 'approaching') {
              car.pass();
              console.log(`[Simulator] Car ${car.id} passed`);
            }
          }
        } else {
          // Red/orange - cars wait
          for (const car of activeCars) {
            if (car.state === 'approaching') {
              car.wait();
              console.log(`[Simulator] Car ${car.id} waiting`);
            }
          }
        }
      }
    }

    // Clean up passed cars
    this.cars = this.cars.filter(c => c.isActive());
    this.notify();
  }

  /** Start the simulation loop */
  start() {
    console.log(`[Simulator] Starting - POST every ${config.postInterval}ms to ${config.controllerUrl}${config.endpoint}`);
    
    // Spawn first car
    this.spawnCar();

    // Main loop - POST every 3 seconds
    setInterval(() => this.tick(), config.postInterval);

    // Spawn new car every 10 seconds for demo
    setInterval(() => this.spawnCar(), 10000);
  }
}
