export default {
  controllerUrl: process.env.CONTROLLER_URL || 'http://localhost:8080',
  endpoint: process.env.ENDPOINT || '/data',
  postInterval: parseInt(process.env.POST_INTERVAL || '3000'), // 3 seconds
  serverPort: parseInt(process.env.PORT || '3000'),
  trafficLightId: '1.1'
};
