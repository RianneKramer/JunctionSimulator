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
    
    private final Map<String, LightState> lights = new ConcurrentHashMap<>();
    
    public TrafficLightService() {
        // Initialize light 1.1 as red
        lights.put("1.1", new LightState(0, false, 0));
    }
    
    /**
     * Process entity update from simulator.
     * If hasEntity becomes true -> set light to green.
     * If hasEntity becomes false -> set light to red.
     */
    public synchronized void processUpdate(String lightId, boolean hasEntity, long triggeredTimestamp) {
        if (!"1.1".equals(lightId)) {
            return;
        }
        
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
