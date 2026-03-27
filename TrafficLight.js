const TrafficLightState = require('./TrafficLightState');

class TrafficLight {
  constructor(id) {
    this.id = id;
    this.state = TrafficLightState.RED;
  }

  setState(newState) {
    if (Object.values(TrafficLightState).includes(newState)) {
      this.state = newState;
      console.log(`[TrafficLight ${this.id}] State changed to: ${newState}`);
    } else {
      console.error(`Invalid traffic light state: ${newState}`);
    }
  }

  getState() {
    return this.state;
  }

  getId() {
    return this.id;
  }
}

module.exports = TrafficLight;
