/**
 * Simulator configuration.
 *
 * Loads config from the Node.js server on startup.
 * Provides a way to update the controller URL at runtime.
 */

const config = {
  controllerUrl: 'http://localhost:8080',
  endpoint: '/data',
  postInterval: 3000,
  spawnInterval: 6000,
};

/**
 * Load configuration from the server.
 * Falls back to defaults if the server is unreachable.
 */
export async function loadConfig() {
  try {
    const resp = await fetch('/api/config');
    const data = await resp.json();
    if (data.controllerUrl) config.controllerUrl = data.controllerUrl;
    if (data.endpoint) config.endpoint = data.endpoint;
    if (data.postInterval) config.postInterval = data.postInterval;
    if (data.spawnInterval) config.spawnInterval = data.spawnInterval;
  } catch (e) {
    // use defaults
  }
  return config;
}

/**
 * Update the controller URL and persist to server.
 *
 * @param {string} fullUrl - e.g. "http://10.0.0.5:8080/data"
 */
export async function setControllerUrl(fullUrl) {
  const baseUrl = fullUrl.replace(/\/data$/, '');
  config.controllerUrl = baseUrl;
  config.endpoint = '/data';

  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        controllerUrl: config.controllerUrl,
        endpoint: config.endpoint,
      }),
    });
  } catch (e) {
    // non-critical
  }
}

export function getConfig() {
  return { ...config };
}
