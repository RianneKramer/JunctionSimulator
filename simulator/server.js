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

// Config state
let config = {
  controllerUrl: process.env.CONTROLLER_URL || "http://localhost:8080",
  endpoint: process.env.ENDPOINT || "/data",
  postInterval: parseInt(process.env.POST_INTERVAL || "3000"),
  spawnInterval: parseInt(process.env.SPAWN_INTERVAL || "6000"),
};

// Load config from file if it exists
if (fs.existsSync(configFilePath)) {
  try {
    const savedConfig = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
    config = { ...config, ...savedConfig };
  } catch (err) {
    console.error("Error loading config file:", err.message);
  }
}

// Proxy endpoint - forwards POST to controller, avoids CORS issues
app.post("/api/proxy", async (req, res) => {
  const url = config.controllerUrl + config.endpoint;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    console.error(
      "[Proxy] Failed to reach controller at " + url + ":",
      e.message,
    );
    res
      .status(502)
      .json({ error: "Cannot reach controller at " + url + ": " + e.message });
  }
});

app.get("/api/config", (req, res) => res.json(config));
app.post("/api/config", (req, res) => {
  if (req.body.controllerUrl) config.controllerUrl = req.body.controllerUrl;
  if (req.body.endpoint) config.endpoint = req.body.endpoint;
  if (req.body.postInterval)
    config.postInterval = parseInt(req.body.postInterval);
  if (req.body.spawnInterval)
    config.spawnInterval = parseInt(req.body.spawnInterval);

  // Save config to file
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("Error saving config file:", err.message);
  }

  res.json(config);
});

app.get("/config", (req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>Simulator Config</title></head><body>
    <h2>Simulator Configuration</h2>
    <p><b>Simulator address:</b> see addresses below</p>
    <form method="POST" action="/api/config" onsubmit="event.preventDefault(); fetch('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(this)))}).then(r=>r.json()).then(d=>{alert('Saved: '+JSON.stringify(d));location.reload()})">
      <label>Controller URL: <input name="controllerUrl" value="${config.controllerUrl}" size="40"></label><br><br>
      <label>Endpoint: <input name="endpoint" value="${config.endpoint}" size="20"></label><br><br>
      <label>POST Interval (ms): <input name="postInterval" value="${config.postInterval}" type="number"></label><br><br>
      <label>Spawn Interval (ms): <input name="spawnInterval" value="${config.spawnInterval}" type="number"></label><br><br>
      <button type="submit">Save</button>
    </form>
    <hr><h3>Local Addresses</h3><ul>${getLocalIps()
      .map((ip) => `<li>http://${ip}:${port}</li>`)
      .join("")}</ul>
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

const port = parseInt(process.env.PORT || "3000");
app.listen(port, "0.0.0.0", () => {
  console.log("===========================================");
  console.log("  Junction Simulator running on port " + port);
  console.log("===========================================");
  console.log("  Local addresses:");
  getLocalIps().forEach((ip) => console.log("    http://" + ip + ":" + port));
  console.log("  Config page: /config");
  console.log("  Controller target: " + config.controllerUrl + config.endpoint);
  console.log("===========================================");
});
