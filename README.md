# Traffic Light Simulator

A modular Node.js-based traffic light simulation system with car spawning and traffic light state management. Controller-agnostic design supports integration with any external controller (Java, Python, etc.) via REST API.

## Components

- **TrafficLightState.js** - Enum for traffic light states (RED, AMBER, GREEN)
- **TrafficLight.js** - Traffic light entity (default id: "1.1")
- **TrafficLightController.js** - Manages traffic light communication (local or REST)
- **CarEntity.js** - Car entity that monitors traffic light and responds to state
- **SpawnEvent.js** - Spawns cars at configurable intervals
- **config.js** - Centralized configuration via environment variables
- **index.js** - Main simulator entry point

## Operating Modes

### 🔌 Standalone Mode (Default)
When external controller is **not connected or not running**:
- Local traffic light state management
- Automatic traffic light cycling (demo mode)
- No external dependencies

### 🌐 Connected Mode
When integrated with an external controller (Java, Python, Go, etc.):
- Cars send trigger payload via **PUT** request to controller
- Cars query traffic light state via **GET** request from controller
- Traffic light state controlled by external controller
- **Automatic fallback** to standalone if connection fails

## Usage

**Install dependencies:**
```bash
npm install
```

**Standalone mode (default):**
```bash
npm start
```

**Connected mode (with external controller):**
```bash
# Windows
set MODE=connected
set CONTROLLER_URL=http://localhost:8080
npm start

# Linux/Mac
MODE=connected CONTROLLER_URL=http://localhost:8080 npm start
```

Press Ctrl+C to stop the simulator.

## Configuration

Configure via environment variables or modify `config.js`:

| Variable | Default | Description |
|----------|---------|-------------|
| `MODE` | `standalone` | Operating mode: "standalone" or "connected" |
| `CONTROLLER_URL` | `http://localhost:8080` | Base URL of external controller |
| `CONTROLLER_TRIGGER_ENDPOINT` | `/data` | Trigger REST endpoint path |
| `CONTROLLER_STATE_ENDPOINT` | `/api/data/state` | State REST endpoint path |
| `CONTROLLER_TIMEOUT` | `5000` | Request timeout in milliseconds |
| `CAR_SPAWN_INTERVAL` | `20000` | Car spawn interval in milliseconds |
| `LIGHT_CHECK_INTERVAL` | `1000` | Traffic light check interval in milliseconds |
| `TRAFFIC_LIGHT_ID` | `1.1` | Traffic light identifier |

## REST API Contract

The simulator expects the external controller to implement:

**Trigger Endpoint (Car Approaching):**
- **PUT** `/data`
- Body: 
```json
{
  "id": "1.1",
  "has-entity": true,
  "triggeredTimestamp": 1711477761492
}
```
`has-entity` remains `true` while the car is waiting at the junction and only changes to `false` once the light is green and the car leaves.

**State Query Endpoint:**
- **GET** `/api/data/state?id=1.1`
- Response: 
```json
{
  "1.1": 2
}
```

Enum mapping:
- `0` = RED
- `1` = AMBER
- `2` = GREEN

The simulator also accepts string states (`"red"`, `"amber"`, `"green"`), but numeric enum payloads are now normalized automatically.

## How It Works

1. Cars spawn at configured intervals (default: 20 seconds)
2. Each car approaches the traffic light and sends trigger payload
3. Cars continuously check the traffic light state
4. **RED/AMBER**: Car stops and waits
5. **GREEN**: Car sends final update with `"has-entity": false`, then proceeds and exits
6. **Standalone mode**: Traffic light cycles automatically
7. **Connected mode**: External controller manages state transitions
