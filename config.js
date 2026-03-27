const config = {
  mode: process.env.MODE || 'standalone',
  
  controller: {
    baseUrl: process.env.CONTROLLER_URL || 'http://localhost:5001',
    triggerEndpoint: process.env.CONTROLLER_TRIGGER_ENDPOINT || '/api/data',
    stateEndpoint: process.env.CONTROLLER_STATE_ENDPOINT || '/api/data/state',
    timeout: parseInt(process.env.CONTROLLER_TIMEOUT || '5000')
  },
  
  simulator: {
    carSpawnInterval: parseInt(process.env.CAR_SPAWN_INTERVAL || '20000'),
    trafficLightCheckInterval: parseInt(process.env.LIGHT_CHECK_INTERVAL || '1000'),
    trafficLightId: process.env.TRAFFIC_LIGHT_ID || '1.1'
  }
};

module.exports = config;
