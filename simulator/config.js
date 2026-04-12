export default {
  controllerUrl: process.env.CONTROLLER_URL || 'http://localhost:8080',
  endpoint: process.env.ENDPOINT || '/data',
  postInterval: parseInt(process.env.POST_INTERVAL || '3000'), // 3 seconds
  serverPort: parseInt(process.env.PORT || '3000'),
  carTrafficLights: ['1.1', '2.1', '5.1', '6.1', '7.1', '8.1', '9.1', '10.1', '11.1', '12.1'],
  trafficLightList: ['1.1', '2.1', '5.1', '6.1', '7.1', '8.1', '9.1', '10.1', '11.1', '12.1', '22', '26.1', '28.1', '31.1', '31.2', '32.1', '32.2', '35.1', '35.2', '36.1', '36.2', '37.1', '37.2', '38.1', '38.2', '86.1', '88.1', '42']
};
