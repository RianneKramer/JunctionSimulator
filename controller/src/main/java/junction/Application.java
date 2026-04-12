package junction;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;

public class Application {
    private static final int DEFAULT_PORT = 8080;

    public static void main(String[] args) throws IOException {
        int port = DEFAULT_PORT;
        if (args.length > 0) {
            port = Integer.parseInt(args[0]);
        }

        TrafficLightService service = new TrafficLightService();
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);

        server.createContext("/data", new DataPostHandler(service));
        server.createContext("/config", new ConfigHandler(service, port));
        server.createContext("/health", exchange -> {
            String response = "{\"status\":\"ok\"}";
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.sendResponseHeaders(200, response.length());
            exchange.getResponseBody().write(response.getBytes());
            exchange.getResponseBody().close();
        });

        server.setExecutor(null);
        server.start();

        System.out.println("===========================================");
        System.out.println("  Junction Controller running on port " + port);
        System.out.println("===========================================");
        System.out.println("  Local addresses:");
        printLocalAddresses(port);
        System.out.println("  Endpoints:");
        System.out.println("    POST /data   - simulator communication");
        System.out.println("    GET  /config - configuration page");
        System.out.println("    GET  /health - health check");
        System.out.println("===========================================");
    }

    private static void printLocalAddresses(int port) {
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface ni = interfaces.nextElement();
                if (ni.isLoopback() || !ni.isUp()) continue;
                Enumeration<InetAddress> addresses = ni.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (addr instanceof java.net.Inet4Address) {
                        System.out.println("    http://" + addr.getHostAddress() + ":" + port);
                    }
                }
            }
        } catch (Exception e) {
            System.out.println("    http://localhost:" + port);
        }
    }
}
