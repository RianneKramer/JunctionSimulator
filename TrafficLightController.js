const TrafficLightState = require('./TrafficLightState');
const config = require('./config');

class TrafficLightController {
  constructor(trafficLight, mode = 'standalone') {
    this.trafficLight = trafficLight;
    this.mode = String(mode).trim().toLowerCase();
    this.axios = null;
    
    if (this.mode === 'connected') {
      this.axios = require('axios').default;
      this.triggerUrl = `${config.controller.baseUrl}${config.controller.triggerEndpoint}`;
      this.stateUrl = `${config.controller.baseUrl}${config.controller.stateEndpoint}`;
      console.log(`[TrafficLightController] Connected mode - Trigger: ${this.triggerUrl}, State: ${this.stateUrl}`);
    } else {
      console.log(`[TrafficLightController] Standalone mode - local simulation`);
    }
  }

  async triggerTrafficLight(payload) {
    if (this.mode === 'connected') {
      return await this.sendToController(payload, 'PUT');
    } else {
      return await this.triggerLocal(payload);
    }
  }

  async triggerLocal(payload) {
    console.log(`[TrafficLightController] Local trigger:`, payload);
    
    if (payload.id === this.trafficLight.getId() && payload['has-entity']) {
      console.log(`[TrafficLightController] Entity detected at ${payload.triggeredTimestamp}`);
    }
  }

  async sendToController(payload, method = 'PUT') {
    try {
      console.log(`[TrafficLightController] ${method} ${this.triggerUrl}`, payload);
      
      const response = await this.axios({
        method: method,
        url: this.triggerUrl,
        data: payload,
        timeout: config.controller.timeout,
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`[TrafficLightController] Controller response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[TrafficLightController] Controller request failed:`, error.message);
      console.log(`[TrafficLightController] Falling back to local mode`);
      return await this.triggerLocal(payload);
    }
  }

  async getTrafficLightResponse() {
    if (this.mode === 'connected') {
      return await this.getStateFromController();
    } else {
      return await this.getStateLocal();
    }
  }

  async getStateLocal() {
    const response = {
      [this.trafficLight.getId()]: this.trafficLight.getState()
    };
    return response;
  }

  async getStateFromController() {
    try {
      const response = await this.axios.get(this.stateUrl, {
        timeout: config.controller.timeout,
        params: { id: this.trafficLight.getId() }
      });

      return this.statePayload(response.data);
    } catch (error) {
      console.error(`[TrafficLightController] Controller state check failed:`, error.message);
      console.log(`[TrafficLightController] Falling back to local state`);
      return await this.getStateLocal();
    }
  }

  statePayload(payload) {
    const lightId = this.trafficLight.getId();
    const rawState = payload[lightId];
    const state = this.state(rawState);
    return {
      ...payload,
      [lightId]: state
    };
  }

  state(rawState) {
    if (rawState === TrafficLightState.RED || rawState === TrafficLightState.RED_CODE) {
      return TrafficLightState.RED;
    }

    if (rawState === TrafficLightState.AMBER || rawState === TrafficLightState.AMBER_CODE) {
      return TrafficLightState.AMBER;
    }

    if (rawState === TrafficLightState.GREEN || rawState === TrafficLightState.GREEN_CODE) {
      return TrafficLightState.GREEN;
    }

    console.warn(`[TrafficLightController] Unknown state payload: ${rawState}, defaulting to red`);
    return TrafficLightState.RED;
  }

  changeState(newState) {
    this.trafficLight.setState(newState);
  }

  getPollingIntervalMs() {
    return config.simulator.trafficLightCheckInterval;
  }
}

module.exports = TrafficLightController;
