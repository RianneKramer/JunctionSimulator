package junction;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;

public class Application {
    private static final int DEFAULT_PORT = 8080;

    public static void main(String[] args) throws IOException {
        int port = DEFAULT_PORT;
        if (args.length > 0) {
            port = Integer.parseInt(args[0]);
        }

        TrafficLightService service = new TrafficLightService();
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        
        server.createContext("/data", new DataPostHandler(service));
        server.createContext("/health", exchange -> {
            String response = "{\"status\":\"ok\"}";
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length());
            exchange.getResponseBody().write(response.getBytes());
            exchange.getResponseBody().close();
        });

        server.setExecutor(null);
        server.start();
        
        System.out.println("Controller running on port " + port);
        System.out.println("POST /data - receive simulator updates");
        System.out.println("GET /health - health check");
    }
}
