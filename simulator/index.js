import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Simulation from './Simulation.js';
import config from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const simulation = new Simulation();

// Serve static files
app.use(express.static(join(__dirname, 'public')));

// API endpoint for frontend to get state
let currentState = simulation.getState();
simulation.onUpdate(state => { currentState = state; });

app.get('/state', (req, res) => {
  res.json(currentState);
});

// Start server
app.listen(config.serverPort, () => {
  console.log(`[Simulator] Visual at http://localhost:${config.serverPort}`);
});

// Start simulation
simulation.start();
