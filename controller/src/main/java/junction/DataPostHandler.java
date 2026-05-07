package junction;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class DataPostHandler implements HttpHandler {

    private final TrafficLightService service;
    private final Gson gson = new Gson();

    public DataPostHandler(TrafficLightService service) {
        this.service = service;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            setCorsHeaders(exchange);
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
            return;
        }
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendError(exchange, 405, "Method not allowed");
            return;
        }

        try {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            JsonObject request = gson.fromJson(body, JsonObject.class);

            long currentTimestamp = request.has("currentTimestamp")
                    ? request.get("currentTimestamp").getAsLong() : System.currentTimeMillis();

            long trainArrivalTimestamp = request.has("trainArrivalTimestamp")
                    ? request.get("trainArrivalTimestamp").getAsLong() : 0L;

            List<TrafficLightService.LightUpdate> updates = new ArrayList<>();
            if (request.has("trafficLights")) {
                JsonArray arr = request.getAsJsonArray("trafficLights");
                for (int i = 0; i < arr.size(); i++) {
                    JsonObject light = arr.get(i).getAsJsonObject();
                    String id = light.get("id").getAsString();
                    boolean hasEntity = light.get("hasEntity").getAsBoolean();
                    long ts = light.has("triggeredTimestamp") ? light.get("triggeredTimestamp").getAsLong() : currentTimestamp;
                    updates.add(new TrafficLightService.LightUpdate(id, hasEntity, ts));
                }
            }

            Map<String, Integer> newStates = service.processUpdate(updates, currentTimestamp, trainArrivalTimestamp);

            JsonObject response = new JsonObject();
            JsonObject lightsObj = new JsonObject();
            for (Map.Entry<String, Integer> entry : newStates.entrySet()) {
                lightsObj.addProperty(entry.getKey(), entry.getValue());
            }
            response.add("trafficLights", lightsObj);

            String responseBody = gson.toJson(response);
            setCorsHeaders(exchange);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            byte[] bytes = responseBody.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, bytes.length);
            OutputStream os = exchange.getResponseBody();
            os.write(bytes);
            os.close();

        } catch (Exception e) {
            System.err.println("[Controller] Error: " + e.getMessage());
            sendError(exchange, 400, "Invalid request: " + e.getMessage());
        }
    }

    private void setCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }

    private void sendError(HttpExchange exchange, int code, String message) throws IOException {
        JsonObject error = new JsonObject();
        error.addProperty("error", message);
        String body = gson.toJson(error);
        setCorsHeaders(exchange);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(code, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.getResponseBody().close();
    }
}
