import config from './config.js';

/**
 * HTTP client for controller communication.
 * 
 */
export default class ControllerClient {
  constructor() {
    this.url = config.controllerUrl + config.endpoint;
  }

  /**
   * POST traffic light states to controller.
   * Returns response with light states.
   */
  async post(trafficLights) {
    const payload = {
      currentTimestamp: Date.now(),
      trafficLights: trafficLights
    };

    console.log('[Simulator] POST to controller:', JSON.stringify(payload));

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[Simulator] Response:', JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('[Simulator] Controller error:', error.message);
      return null;
    }
  }
}
