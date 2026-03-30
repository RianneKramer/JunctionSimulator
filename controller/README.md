# Controller (Java)

Java HTTP server die verkeerslichten aanstuurt op basis van entity aanwezigheid.

## Bouwen en uitvoeren

```bash
mvn package
java -jar target/controller-1.0.0.jar
```

Optioneel: specificeer poort als argument:
```bash
java -jar target/controller-1.0.0.jar 9000
```

## Endpoints

### POST /data
Ontvangt simulator updates, stuurt stoplicht statussen terug.

Request:
```json
{
  "currentTimestamp": 1711477761492,
  "trafficLights": [
    { "id": "1.1", "hasEntity": true, "triggeredTimestamp": 1711477761000 }
  ]
}
```

Response:
```json
{
  "trafficLights": {
    "1.1": 2
  }
}
```

### GET /health
Health check.
