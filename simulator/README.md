# Simulator (JavaScript)

Simuleert verkeer bij een kruispunt. POST entity status naar controller, toont stoplich status.

## Uitvoeren

```bash
npm install
npm start
```

Visuele weergave op http://localhost:3000

## Configuratie

.env variabelen:
- `CONTROLLER_URL` - Controller basis URL (standaard: `http://localhost:8080`)
- `ENDPOINT` - POST endpoint (standaard: `/data`)
- `POST_INTERVAL` - Interval tussen POSTs in ms (standaard: `3000`)
- `PORT` - Server poort voor visuele weergave (standaard: `3000`)
