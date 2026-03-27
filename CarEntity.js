const TrafficLightState = require('./TrafficLightState');

class CarEntity {
  constructor(id, trafficLightController) {
    this.id = id;
    this.trafficLightController = trafficLightController;
    this.position = 'approaching';
    this.stopped = false;
    this.checkInterval = null;
    this.trafficLightId = null;
    this.triggerTimestamp = null;
  }

  async approach(trafficLightId) {
    console.log(`[Car ${this.id}] Approaching traffic light ${trafficLightId}`);

    this.trafficLightId = trafficLightId;
    this.triggerTimestamp = Date.now();
    await this.sendEntityStatus(true);
    this.startCheckingTrafficLight(trafficLightId);
  }

  startCheckingTrafficLight(trafficLightId) {
    const checkTrafficLight = async () => {
      const response = await this.trafficLightController.getTrafficLightResponse();
      const state = response[trafficLightId];

      if (state === TrafficLightState.RED || state === TrafficLightState.AMBER) {
        // Keep controller payload consistent while the car is still waiting.
        await this.sendEntityStatus(true);
        if (!this.stopped) {
          console.log(`[Car ${this.id}] Stopping at ${state} light`);
          this.stopped = true;
        }
      } else if (state === TrafficLightState.GREEN) {
        if (this.stopped) {
          console.log(`[Car ${this.id}] Light is green, proceeding`);
        }
        await this.pass();
      }
    };

    // Do the first read immediately so controller polling starts right away.
    void checkTrafficLight();
    this.checkInterval = setInterval(
      checkTrafficLight,
      this.trafficLightController.getPollingIntervalMs()
    );
  }

  async pass() {
    await this.sendEntityStatus(false);
    console.log(`[Car ${this.id}] Passed through traffic light`);
    this.cleanup();
  }

  async sendEntityStatus(hasEntity) {
    const payload = {
      id: this.trafficLightId,
      hasEntity: hasEntity,
      triggeredTimestamp: this.triggerTimestamp
    };
    await this.trafficLightController.triggerTrafficLight(payload);
  }

  cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

module.exports = CarEntity;
