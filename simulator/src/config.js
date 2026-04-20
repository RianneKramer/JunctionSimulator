/**
 * Simulator configuration.
 *
 * Loads config from the Node.js server on startup.
 * Provides a way to update the controller URL at runtime.
 */

const DEFAULT_CONFIG = {
  controllerUrl: 'http://localhost:8080',
  endpoint: '/data',
  postInterval: 3000,
  spawnInterval: 6000,
  trainLeadMs: 5000,
  trainActiveMs: 6000,
};

const CONFIG_RETRY_ATTEMPTS = 3;
const CONFIG_TIMEOUT_MS = 2500;

const config = { ...DEFAULT_CONFIG };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeControllerUrl(fullUrl) {
  const parsed = new URL(fullUrl);
  return parsed.origin;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = CONFIG_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function loadConfig() {
  for (let attempt = 1; attempt <= CONFIG_RETRY_ATTEMPTS; attempt++) {
    try {
      const resp = await fetchWithTimeout('/api/config');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      if (data.controllerUrl) {
        config.controllerUrl = normalizeControllerUrl(data.controllerUrl);
      }
      config.endpoint = '/data';

      const numericKeys = ['postInterval', 'spawnInterval', 'trainLeadMs', 'trainActiveMs'];
      for (const key of numericKeys) {
        const value = Number(data[key]);
        if (Number.isFinite(value) && value > 0) {
          config[key] = value;
        }
      }

      return config;
    } catch (e) {
      if (attempt === CONFIG_RETRY_ATTEMPTS) {
        Object.assign(config, DEFAULT_CONFIG);
        return config;
      }
      await sleep(300 * attempt);
    }
  }

  return config;
}

export async function setControllerUrl(fullUrl) {
  const baseUrl = normalizeControllerUrl(fullUrl.replace(/\/data\/?$/, ''));
  config.controllerUrl = baseUrl;
  config.endpoint = '/data';

  try {
    const resp = await fetchWithTimeout('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        controllerUrl: config.controllerUrl,
      }),
    });

    return resp.ok;
  } catch (e) {
    return false;
  }
}

export function getConfig() {
  return { ...config };
}
