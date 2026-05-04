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

Open http://localhost:5173 voor visuele weergave.

## Communicatie

Simulator POST naar controller elke 3 seconden:
```json
{
  "currentTimestamp": 1711477761492,
  "trafficLights": [
    { "id": "1.1", "hasEntity": true, "triggeredTimestamp": 1711477761000 }
  ],
  "trainArrivalTimestamp": 1711477761000
}
```

`trainArrivalTimestamp` is t=0 van de overwegprocedure: vanaf dat moment moet
verkeer stoppen en zet de controller `sb` op rood. De simulator en controller
hebben ieder hun eigen lokale treinconfig. Die config wordt niet meegestuurd in
het simulator-controller protocol, zodat de bestaande JSON-standaard compatibel
blijft.

Controller antwoordt met stoplicht statussen:
```json
{
  "trafficLights": {
    "1.1": 2
  }
}
```

Status codes: 0=rood, 1=oranje, 2=groen
