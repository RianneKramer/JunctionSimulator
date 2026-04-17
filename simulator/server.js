import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import os from "os";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configFilePath = join(__dirname, "config.json");
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const CONTROLLER_ENDPOINT = "/data";
const PROXY_TIMEOUT_MS = parseInt(process.env.PROXY_TIMEOUT_MS || "8000", 10);

let config = {
  controllerUrl: process.env.CONTROLLER_URL || "http://localhost:8080",
  endpoint: CONTROLLER_ENDPOINT,
  postInterval: parseInt(process.env.POST_INTERVAL || "3000", 10),
  spawnInterval: parseInt(process.env.SPAWN_INTERVAL || "6000", 10),
  trainLeadMs: parseInt(process.env.TRAIN_LEAD_MS || "8000", 10),
  trainActiveMs: parseInt(process.env.TRAIN_ACTIVE_MS || "12000", 10),
};

function saveConfigFile() {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("Error saving config file:", err.message);
  }
}

function normalizeControllerUrl(raw) {
  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return null;
  }
}

if (fs.existsSync(configFilePath)) {
  try {
    const savedConfig = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
    config = {
      ...config,
      ...savedConfig,
      endpoint: CONTROLLER_ENDPOINT,
    };

    const normalized = normalizeControllerUrl(config.controllerUrl);
    if (!normalized) {
      console.warn("Invalid controllerUrl in config.json, falling back to default.");
      config.controllerUrl = "http://localhost:8080";
      saveConfigFile();
    } else if (normalized !== config.controllerUrl || savedConfig.endpoint !== CONTROLLER_ENDPOINT) {
      config.controllerUrl = normalized;
      saveConfigFile();
    }
  } catch (err) {
    console.error("Error loading config file:", err.message);
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = PROXY_TIMEOUT_MS) {
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

app.post("/api/proxy", async (req, res) => {
  const url = config.controllerUrl + CONTROLLER_ENDPOINT;
  try {
    const resp = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await resp.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {
        error: "Controller returned non-JSON response",
        raw: text.slice(0, 500),
      };
    }

    if (!resp.ok) {
      res.status(resp.status).json({
        error: data?.error || `Controller returned HTTP ${resp.status}`,
        details: data,
      });
      return;
    }

    res.json(data);
  } catch (e) {
    const message = e.name === "AbortError"
      ? `Request timed out after ${PROXY_TIMEOUT_MS}ms`
      : e.message;

    console.error("[Proxy] Failed to reach controller at " + url + ":", message);
    res.status(502).json({
      error: "Cannot reach controller",
      target: url,
      details: message,
    });
  }
});

app.get("/api/config", (req, res) => {
  res.json({
    ...config,
    endpoint: CONTROLLER_ENDPOINT,
  });
});

app.post("/api/config", (req, res) => {
  if (req.body.controllerUrl) {
    const normalized = normalizeControllerUrl(req.body.controllerUrl);
    if (!normalized) {
      res.status(400).json({ error: "Invalid controllerUrl" });
      return;
    }
    config.controllerUrl = normalized;
  }

  for (const key of ["postInterval", "spawnInterval", "trainLeadMs", "trainActiveMs"]) {
    if (req.body[key]) {
      const parsed = parseInt(req.body[key], 10);
      if (!Number.isNaN(parsed) && parsed > 0) config[key] = parsed;
    }
  }

  config.endpoint = CONTROLLER_ENDPOINT;
  saveConfigFile();
  res.json(config);
});

app.get("/config", (req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>Simulator Config</title></head><body>
    <h2>Simulator Configuration</h2>
    <p><b>Simulator address:</b> see addresses below</p>
    <form method="POST" action="/api/config" onsubmit="event.preventDefault(); fetch('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(this)))}).then(async r=>{const d=await r.json(); if(!r.ok) throw new Error(d.error || 'Save failed'); return d;}).then(d=>{alert('Saved: '+JSON.stringify(d));location.reload()}).catch(e=>alert(e.message))">
      <label>Controller URL: <input name="controllerUrl" value="${config.controllerUrl}" size="40"></label><br><br>
      <label>Endpoint: <input value="${CONTROLLER_ENDPOINT}" size="20" disabled></label><br><br>
      <label>POST Interval (ms): <input name="postInterval" value="${config.postInterval}" type="number"></label><br><br>
      <label>Spawn Interval (ms): <input name="spawnInterval" value="${config.spawnInterval}" type="number"></label><br><br>
      <label>Train lead time (ms): <input name="trainLeadMs" value="${config.trainLeadMs}" type="number"></label><br><br>
      <label>Train active duration (ms): <input name="trainActiveMs" value="${config.trainActiveMs}" type="number"></label><br><br>
      <button type="submit">Save</button>
    </form>
    <hr><h3>Local Addresses</h3><ul>${getLocalIps().map((ip) => `<li>http://${ip}:${port}</li>`).join("")}</ul>
  </body></html>`);
});

function getLocalIps() {
  const ips = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips.length ? ips : ["localhost"];
}

const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, "0.0.0.0", () => {
  console.log("===========================================");
  console.log("  Junction Simulator running on port " + port);
  console.log("===========================================");
  console.log("  Local addresses:");
  getLocalIps().forEach((ip) => console.log("    http://" + ip + ":" + port));
  console.log("  Config page: /config");
  console.log("  Controller target: " + config.controllerUrl + CONTROLLER_ENDPOINT);
  console.log("===========================================");
});
