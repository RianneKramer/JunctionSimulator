package junction;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Traffic light controller using conflict matrix.
 * 
 * States: 0 = red, 1 = orange, 2 = green
 * 
 * MAX_GREEN: once a light turns green, it can stay green for at most MAX_GREEN_MS.
 * The timer is based on when the light TRANSITIONED to green, not on entity presence.
 * Quick entity flickers (car leaving detection zone momentarily) do NOT reset the timer.
 * Only a full red->green transition resets it.
 */
public class TrafficLightService {

    private long minGreenMs = 6000;
    private long maxGreenMs = 30000;
    private long orangeMs = 3000;
    private long minRedMs = 4000;

    private final ConflictHandler conflictHandler;

    private final Map<String, Integer> states = new ConcurrentHashMap<>();
    private final Map<String, Long> stateChangeTime = new ConcurrentHashMap<>();
    private final Map<String, Long> greenSince = new ConcurrentHashMap<>();
    private final Map<String, Boolean> entityPresence = new ConcurrentHashMap<>();
    private final Map<String, Long> triggeredTimestamps = new ConcurrentHashMap<>();

    public TrafficLightService() {
        this.conflictHandler = new ConflictHandler();
        for (String signal : conflictHandler.getAllSignals()) {
            states.put(signal, 0);
            stateChangeTime.put(signal, 0L);
            greenSince.put(signal, 0L);
            entityPresence.put(signal, false);
            triggeredTimestamps.put(signal, 0L);
        }
    }

    public void registerTrainArrival(long trainArrivalTimestamp) { conflictHandler.registerTrainArrival(trainArrivalTimestamp); }
    public void clearTrainWindow() { conflictHandler.clearTrainWindow(); }

    public synchronized Map<String, Integer> processUpdate(List<LightUpdate> updates, long currentTimestamp) {
        for (LightUpdate update : updates) {
            if (states.containsKey(update.id)) {
                entityPresence.put(update.id, update.hasEntity);
                triggeredTimestamps.put(update.id, update.triggeredTimestamp);
            }
        }

        // Phase 1: orange -> red
        for (String signal : conflictHandler.getAllSignals()) {
            int state = states.getOrDefault(signal, 0);
            long changedAt = stateChangeTime.getOrDefault(signal, 0L);
            if (state == 1 && (currentTimestamp - changedAt) >= orangeMs) {
                setState(signal, 0, currentTimestamp);
            }
        }

        // Phase 2: green -> orange (max green OR no entity + min green)
        for (String signal : conflictHandler.getAllSignals()) {
            int state = states.getOrDefault(signal, 0);
            if (state != 2) continue;

            long gSince = greenSince.getOrDefault(signal, 0L);
            boolean hasEntity = entityPresence.getOrDefault(signal, false);

            if ((currentTimestamp - gSince) >= maxGreenMs) {
                System.out.println("[Controller] " + signal + " MAX GREEN reached, forcing orange");
                setState(signal, 1, currentTimestamp);
                continue;
            }

            if (!hasEntity && (currentTimestamp - gSince) >= minGreenMs) {
                setState(signal, 1, currentTimestamp);
            }
        }

        // Phase 3: turn waiting lights green (longest-wait-first, greedy)
        Set<String> occupied = getOccupiedSignals();

        List<ConflictHandler.WaitingRequest> waiting = new ArrayList<>();
        for (String signal : conflictHandler.getAllSignals()) {
            boolean hasEntity = entityPresence.getOrDefault(signal, false);
            int state = states.getOrDefault(signal, 0);
            if (hasEntity && state == 0) {
                long changedAt = stateChangeTime.getOrDefault(signal, 0L);
                if ((currentTimestamp - changedAt) >= minRedMs) {
                    ConflictHandler.Priority pr = conflictHandler.priorityForSignal(signal);
                    waiting.add(new ConflictHandler.WaitingRequest(signal, pr, triggeredTimestamps.getOrDefault(signal, 0L)));
                }
            }
        }

        waiting.sort(conflictHandler.waitingComparator());

        for (ConflictHandler.WaitingRequest wr : waiting) {
            String signal = wr.signalId;
            if (conflictHandler.canTurnGreen(signal, occupied, currentTimestamp)) {
                setState(signal, 2, currentTimestamp);
                greenSince.put(signal, currentTimestamp);
                occupied.add(signal);
            }
        }

        return getAllStates();
    }

    private void setState(String signal, int state, long timestamp) {
        states.put(signal, state);
        stateChangeTime.put(signal, timestamp);
        String name = switch (state) { case 0 -> "RED"; case 1 -> "ORANGE"; case 2 -> "GREEN"; default -> "?"; };
        System.out.println("[Controller] " + signal + " -> " + name);
    }

    private Set<String> getOccupiedSignals() {
        Set<String> occ = new HashSet<>();
        for (Map.Entry<String, Integer> e : states.entrySet()) {
            if (e.getValue() == 2 || e.getValue() == 1) occ.add(e.getKey());
        }
        return occ;
    }

    public Map<String, Integer> getAllStates() { return new HashMap<>(states); }

    public Map<String, Long> getTimingConfig() {
        Map<String, Long> cfg = new LinkedHashMap<>();
        cfg.put("minGreenMs", minGreenMs);
        cfg.put("maxGreenMs", maxGreenMs);
        cfg.put("orangeMs", orangeMs);
        cfg.put("minRedMs", minRedMs);
        return cfg;
    }

    public void setTimingConfig(long minGreen, long maxGreen, long orange, long minRed) {
        this.minGreenMs = minGreen;
        this.maxGreenMs = maxGreen;
        this.orangeMs = orange;
        this.minRedMs = minRed;
        System.out.println("[Controller] Timing updated: minGreen=" + minGreen + " maxGreen=" + maxGreen + " orange=" + orange + " minRed=" + minRed);
    }

    public static class LightUpdate {
        public final String id;
        public final boolean hasEntity;
        public final long triggeredTimestamp;
        public LightUpdate(String id, boolean hasEntity, long triggeredTimestamp) {
            this.id = id; this.hasEntity = hasEntity; this.triggeredTimestamp = triggeredTimestamp;
        }
    }
}
