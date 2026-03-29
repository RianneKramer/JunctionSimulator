package junction;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class DataPostHandler implements HttpHandler {
    
    private final TrafficLightService service;
    private final Gson gson = new Gson();
    
    public DataPostHandler(TrafficLightService service) {
        this.service = service;
    }
    
    @Override
    public void handle(HttpExchange exchange) throws IOException {
        // Only allow POST
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendError(exchange, 405, "Method not allowed");
            return;
        }
        
        try {
            // read reques body
            InputStream is = exchange.getRequestBody();
            String body = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            System.out.println("[Controller] Received: " + body);
            
            // parse JSON
            JsonObject request = gson.fromJson(body, JsonObject.class);
            
            // process traffic light updates
            if (request.has("trafficLights")) {
                JsonArray trafficLights = request.getAsJsonArray("trafficLights");
                for (int i = 0; i < trafficLights.size(); i++) {
                    JsonObject light = trafficLights.get(i).getAsJsonObject();
                    String id = light.get("id").getAsString();
                    boolean hasEntity = light.get("hasEntity").getAsBoolean();
                    long triggeredTimestamp = light.get("triggeredTimestamp").getAsLong();
                    
                    service.processUpdate(id, hasEntity, triggeredTimestamp);
                }
            }
            
            // build response with current states
            JsonObject response = new JsonObject();
            JsonObject lightsObj = new JsonObject();
            for (Map.Entry<String, Integer> entry : service.getAllStates().entrySet()) {
                lightsObj.addProperty(entry.getKey(), entry.getValue());
            }
            response.add("trafficLights", lightsObj);
            
            String responseBody = gson.toJson(response);
            System.out.println("[Controller] Response: " + responseBody);
            
            // send response
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, responseBody.length());
            OutputStream os = exchange.getResponseBody();
            os.write(responseBody.getBytes(StandardCharsets.UTF_8));
            os.close();
            
        } catch (Exception e) {
            System.err.println("[Controller] Error: " + e.getMessage());
            sendError(exchange, 400, "Invalid request: " + e.getMessage());
        }
    }
    
    private void sendError(HttpExchange exchange, int code, String message) throws IOException {
        JsonObject error = new JsonObject();
        error.addProperty("error", message);
        String body = gson.toJson(error);
        
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(code, body.length());
        exchange.getResponseBody().write(body.getBytes(StandardCharsets.UTF_8));
        exchange.getResponseBody().close();
    }
}
