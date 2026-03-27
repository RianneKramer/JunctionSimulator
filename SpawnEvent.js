const CarEntity = require('./CarEntity');

class SpawnEvent {
  constructor(trafficLightController, spawnIntervalMs = 20000) {
    this.trafficLightController = trafficLightController;
    this.spawnIntervalMs = spawnIntervalMs;
    this.carCounter = 0;
    this.spawnInterval = null;
    this.activeCars = [];
  }

  start(trafficLightId) {
    console.log(`[SpawnEvent] Starting car spawning every ${this.spawnIntervalMs}ms`);
    
    this.spawnInterval = setInterval(() => {
      this.spawnCar(trafficLightId);
    }, this.spawnIntervalMs);
    
    this.spawnCar(trafficLightId);
  }

  spawnCar(trafficLightId) {
    this.carCounter++;
    const car = new CarEntity(this.carCounter, this.trafficLightController);
    this.activeCars.push(car);
    
    console.log(`[SpawnEvent] Spawned Car ${this.carCounter}`);
    car.approach(trafficLightId);
  }

  stop() {
    if (this.spawnInterval) {
      clearInterval(this.spawnInterval);
      this.spawnInterval = null;
      console.log('[SpawnEvent] Stopped spawning cars');
    }
    
    this.activeCars.forEach(car => car.cleanup());
    this.activeCars = [];
  }
}

module.exports = SpawnEvent;
