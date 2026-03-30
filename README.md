# Junction Simulator

Verkeerslicht simulatiesysteem met controller-simulator communicatie via HTTP POST.

## Structuur

```
/
├── simulator/    # JavaScript - simuleert verkeer, visuele weergave
├── controller/   # Java - stuurt verkeerslichten aan
└── tester/       # Regressietester 
```

## Snel starten

### 1. Start Controller (Java)
```bash
cd controller
mvn package
java -jar target/controller-1.0.0.jar
```

### 2. Start Simulator (JavaScript)
```bash
cd simulator
npm install
npm start
```

Open http://localhost:3000 voor visuele weergave.

## Communicatie

Simulator POST naar controller elke 3 seconden:
```json
{
  "currentTimestamp": 1711477761492,
  "trafficLights": [
    { "id": "1.1", "hasEntity": true, "triggeredTimestamp": 1711477761000 }
  ]
}
```

Controller antwoordt met stoplicht statussen:
```json
{
  "trafficLights": {
    "1.1": 2
  }
}
```

Status codes: 0=rood, 1=oranje, 2=groen
