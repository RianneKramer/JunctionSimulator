package junction;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.Map;

public class ConfigHandler implements HttpHandler {

    private final TrafficLightService service;
    private final int port;
    private final Gson gson = new Gson();

    public ConfigHandler(TrafficLightService service, int port) {
        this.service = service;
        this.port = port;
    }

    private List<String> getLocalIps() {
        List<String> ips = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface iface = interfaces.nextElement();
                Enumeration<InetAddress> addresses = iface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (!addr.isLoopbackAddress() && addr.getHostAddress().indexOf(':') == -1) {
                        ips.add(addr.getHostAddress());
                    }
                }
            }
        } catch (Exception e) {
            // Ignore errors
        }
        return ips.isEmpty() ? List.of("localhost") : ips;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();

        if ("POST".equalsIgnoreCase(method)) {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            // Parse form data
            Map<String, String> params = new java.util.HashMap<>();
            for (String pair : body.split("&")) {
                String[] kv = pair.split("=", 2);
                if (kv.length == 2) params.put(kv[0], kv[1]);
            }
            try {
                long minGreen = Long.parseLong(params.getOrDefault("minGreenMs", "6000"));
                long maxGreen = Long.parseLong(params.getOrDefault("maxGreenMs", "30000"));
                long orange = Long.parseLong(params.getOrDefault("orangeMs", "3000"));
                long minRed = Long.parseLong(params.getOrDefault("minRedMs", "4000"));
                service.setTimingConfig(minGreen, maxGreen, orange, minRed);
            } catch (NumberFormatException e) {
                // ignore bad input
            }
        }

        // GET or after POST: show config page
        Map<String, Long> cfg = service.getTimingConfig();
        List<String> localIps = getLocalIps();

        String html = """
            <!DOCTYPE html><html><head><title>Controller Config</title></head><body>
            <h2>Controller Configuration</h2>
            <p><b>Controller addresses:</b></p>
            <ul>%s</ul>
            <p><b>Endpoint:</b> POST /data</p>
            <hr>
            <h3>Timing Settings</h3>
            <form method="POST">
              <label>Min Green (ms): <input name="minGreenMs" value="%d" type="number"></label><br><br>
              <label>Max Green (ms): <input name="maxGreenMs" value="%d" type="number"></label><br><br>
              <label>Orange (ms): <input name="orangeMs" value="%d" type="number"></label><br><br>
              <label>Min Red (ms): <input name="minRedMs" value="%d" type="number"></label><br><br>
              <p><small>Train timings currently use controller defaults (lead %d ms, active %d ms).</small></p>
              <button type="submit">Save</button>
            </form>
            </body></html>
            """.formatted(localIps.stream().map(ip -> "<li>http://" + ip + ":" + port + "</li>").reduce("", (a, b) -> a + b),
                cfg.get("minGreenMs"), cfg.get("maxGreenMs"),
                cfg.get("orangeMs"), cfg.get("minRedMs"),
                cfg.get("trainLeadMs"), cfg.get("trainActiveMs"));

        exchange.getResponseHeaders().set("Content-Type", "text/html");
        byte[] bytes = html.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(200, bytes.length);
        OutputStream os = exchange.getResponseBody();
        os.write(bytes);
        os.close();
    }
}
