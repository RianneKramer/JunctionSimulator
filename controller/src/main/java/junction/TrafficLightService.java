package junction;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages traffic light state.
 * 
 * enum:
 * 0 = red
 * 1 = orange
 * 2 = green
 */
public class TrafficLightService {
    private String[] trafficLights = {"1.1", "2.1", "5.1", "6.1", "7.1", "8.1", "9.1", "10.1", "11.1", "12.1", "22", "26.1", "28.1", "31.1", "31.2", "32.1", "32.2", "35.1", "35.2", "36.1", "36.2", "37.1", "37.2", "38.1", "38.2", "86.1", "88.1", "42"};

    private final Map<String, LightState> lights = new ConcurrentHashMap<>();
    
    public TrafficLightService() {
        // set all traffic lights to red (0)
        for (int i = 0; i < trafficLights.length; i++) {
            lights.put(trafficLights[i], new LightState(0, false, 0));
        }
    }
    
    /**
     * Process entity update from simulator.
     * If hasEntity becomes true -> set light to green.
     * If hasEntity becomes false -> set light to red.
     */
    public synchronized void processUpdate(String lightId, boolean hasEntity, long triggeredTimestamp) {
        if (java.util.Arrays.stream(trafficLights).noneMatch(lightId::equals)) {
            return;
        }
        System.out.println("Processing update " + lightId);

        LightState current = lights.get(lightId);
        int newState;
        
        if (hasEntity) {
            // car present -> green
            newState = 2;
        } else {
            // car gone -> red
            newState = 0;
        }
        
        lights.put(lightId, new LightState(newState, hasEntity, triggeredTimestamp));
        System.out.println("[Controller] Light " + lightId + ": hasEntity=" + hasEntity + " -> state=" + newState);
    }
    
    /**
     * Get current state of a light.
     */
    public int getState(String lightId) {
        LightState state = lights.get(lightId);
        return state != null ? state.stateCode : 0;
    }
    
    /**
     * Get all light states for response.
     */
    public Map<String, Integer> getAllStates() {
        Map<String, Integer> result = new ConcurrentHashMap<>();
        for (Map.Entry<String, LightState> entry : lights.entrySet()) {
            result.put(entry.getKey(), entry.getValue().stateCode);
        }
        return result;
    }
    
    private static class LightState {
        final int stateCode;
        final boolean hasEntity;
        final long lastTriggeredTimestamp;
        
        LightState(int stateCode, boolean hasEntity, long lastTriggeredTimestamp) {
            this.stateCode = stateCode;
            this.hasEntity = hasEntity;
            this.lastTriggeredTimestamp = lastTriggeredTimestamp;
        }
    }
}
