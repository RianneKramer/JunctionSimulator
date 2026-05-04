package junction;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Traffic light controller using conflict matrix.
 *
 * States: 0 = red, 1 = orange, 2 = green
 */
public class TrafficLightService {

    private long minGreenMs = 6000;
    private long maxGreenMs = 30000;
    private long orangeMs = 3000;
    private long minRedMs = 4000;

    private static final String TRAIN_SIGNAL_ID = "sb";
    private long trainWarningMs = 5000;
    private long trainLoweringMs = 15000;
    private long trainClosedMs = 30000;
    private long trainRaisingMs = 15000;

    private final ConflictMatrix matrix;

    private final Map<String, Integer> states = new ConcurrentHashMap<>();
    private final Map<String, Long> stateChangeTime = new ConcurrentHashMap<>();
    private final Map<String, Long> greenSince = new ConcurrentHashMap<>();
    private final Map<String, Boolean> entityPresence = new ConcurrentHashMap<>();
    private final Map<String, Long> triggeredTimestamps = new ConcurrentHashMap<>();

    public TrafficLightService() {
        this.matrix = new ConflictMatrix();
        for (String signal : matrix.getAllSignals()) {
            states.put(signal, 0);
            stateChangeTime.put(signal, 0L);
            greenSince.put(signal, 0L);
            entityPresence.put(signal, false);
            triggeredTimestamps.put(signal, 0L);
        }
    }

    public synchronized Map<String, Integer> processUpdate(List<LightUpdate> updates, long currentTimestamp) {
        return processUpdate(updates, currentTimestamp, 0L);
    }

    public synchronized Map<String, Integer> processUpdate(List<LightUpdate> updates, long currentTimestamp, long trainArrivalTimestamp) {
        applyLightUpdates(updates);
        boolean trainActive = applyTrainState(currentTimestamp, trainArrivalTimestamp);
        transitionOrangeToRed(currentTimestamp);
        transitionGreenToOrange(currentTimestamp, trainActive);
        activateWaitingSignals(currentTimestamp, trainActive);
        return getAllStates();
    }

    private void applyLightUpdates(List<LightUpdate> updates) {
        for (LightUpdate update : updates) {
            if (states.containsKey(update.id)) {
                entityPresence.put(update.id, update.hasEntity);
                triggeredTimestamps.put(update.id, update.triggeredTimestamp);
            }
        }
    }

    private boolean applyTrainState(long currentTimestamp, long trainArrivalTimestamp) {
        if (trainArrivalTimestamp <= 0) {
            entityPresence.put(TRAIN_SIGNAL_ID, false);
            setState(TRAIN_SIGNAL_ID, 2, currentTimestamp);
            return false;
        }

        long redUntil = trainArrivalTimestamp + getTrainProcedureDurationMs();
        boolean active = currentTimestamp >= trainArrivalTimestamp && currentTimestamp < redUntil;

        entityPresence.put(TRAIN_SIGNAL_ID, active);
        triggeredTimestamps.put(TRAIN_SIGNAL_ID, trainArrivalTimestamp);

        if (!active) {
            setState(TRAIN_SIGNAL_ID, 2, currentTimestamp);
            return false;
        }

        for (String signal : matrix.getAllSignals()) {
            if (TRAIN_SIGNAL_ID.equals(signal)) continue;
            if (!matrix.hasConflict(TRAIN_SIGNAL_ID, signal)) continue;
            if (states.getOrDefault(signal, 0) != 0) {
                setState(signal, 0, currentTimestamp);
            }
        }

        setState(TRAIN_SIGNAL_ID, 0, currentTimestamp);
        return true;
    }

    private long getTrainProcedureDurationMs() {
        return trainWarningMs + trainLoweringMs + trainClosedMs + trainRaisingMs;
    }

    private void transitionOrangeToRed(long currentTimestamp) {
        for (String signal : matrix.getAllSignals()) {
            if (TRAIN_SIGNAL_ID.equals(signal)) continue;
            int state = states.getOrDefault(signal, 0);
            long changedAt = stateChangeTime.getOrDefault(signal, 0L);
            if (state == 1 && (currentTimestamp - changedAt) >= orangeMs) {
                setState(signal, 0, currentTimestamp);
            }
        }
    }

    private void transitionGreenToOrange(long currentTimestamp, boolean trainActive) {
        for (String signal : matrix.getAllSignals()) {
            if (TRAIN_SIGNAL_ID.equals(signal)) continue;
            int state = states.getOrDefault(signal, 0);
            if (state != 2) continue;

            if (trainActive && matrix.hasConflict(TRAIN_SIGNAL_ID, signal)) {
                setState(signal, 0, currentTimestamp);
                continue;
            }

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
    }

    private void activateWaitingSignals(long currentTimestamp, boolean trainActive) {
        Set<String> occupied = getOccupiedSignals();
        List<String> waiting = new ArrayList<>();

        for (String signal : matrix.getAllSignals()) {
            if (TRAIN_SIGNAL_ID.equals(signal)) continue;

            boolean hasEntity = entityPresence.getOrDefault(signal, false);
            int state = states.getOrDefault(signal, 0);
            if (hasEntity && state == 0) {
                if (trainActive && matrix.hasConflict(TRAIN_SIGNAL_ID, signal)) {
                    continue;
                }

                long changedAt = stateChangeTime.getOrDefault(signal, 0L);
                if ((currentTimestamp - changedAt) >= minRedMs) {
                    waiting.add(signal);
                }
            }
        }

        waiting.sort(Comparator.comparingLong(s -> triggeredTimestamps.getOrDefault(s, 0L)));

        for (String signal : waiting) {
            if (matrix.canTurnGreen(signal, occupied)) {
                setState(signal, 2, currentTimestamp);
                greenSince.put(signal, currentTimestamp);
                occupied.add(signal);
            }
        }
    }

    private void setState(String signal, int state, long timestamp) {
        if (states.getOrDefault(signal, 0) == state) {
            return;
        }
        states.put(signal, state);
        stateChangeTime.put(signal, timestamp);
        String name = switch (state) {
            case 0 -> "RED";
            case 1 -> "ORANGE";
            case 2 -> "GREEN";
            default -> "?";
        };
        System.out.println("[Controller] " + signal + " -> " + name);
    }

    private Set<String> getOccupiedSignals() {
        Set<String> occ = new HashSet<>();
        for (Map.Entry<String, Integer> e : states.entrySet()) {
            if (TRAIN_SIGNAL_ID.equals(e.getKey())) continue;
            if (e.getValue() == 2 || e.getValue() == 1) occ.add(e.getKey());
        }
        return occ;
    }

    public Map<String, Integer> getAllStates() {
        return new HashMap<>(states);
    }

    public Map<String, Long> getTimingConfig() {
        Map<String, Long> cfg = new LinkedHashMap<>();
        cfg.put("minGreenMs", minGreenMs);
        cfg.put("maxGreenMs", maxGreenMs);
        cfg.put("orangeMs", orangeMs);
        cfg.put("minRedMs", minRedMs);
        cfg.put("trainWarningMs", trainWarningMs);
        cfg.put("trainLoweringMs", trainLoweringMs);
        cfg.put("trainClosedMs", trainClosedMs);
        cfg.put("trainRaisingMs", trainRaisingMs);
        return cfg;
    }

    public void setTimingConfig(long minGreen, long maxGreen, long orange, long minRed) {
        this.minGreenMs = minGreen;
        this.maxGreenMs = maxGreen;
        this.orangeMs = orange;
        this.minRedMs = minRed;
        System.out.println("[Controller] Timing updated: minGreen=" + minGreen + " maxGreen=" + maxGreen + " orange=" + orange + " minRed=" + minRed);
    }

    public void setTrainTimingConfig(long warning, long lowering, long closed, long raising) {
        this.trainWarningMs = warning;
        this.trainLoweringMs = lowering;
        this.trainClosedMs = closed;
        this.trainRaisingMs = raising;
        System.out.println("[Controller] Train timing updated: warning=" + warning + " lowering=" + lowering + " closed=" + closed + " raising=" + raising);
    }

    public static class LightUpdate {
        public final String id;
        public final boolean hasEntity;
        public final long triggeredTimestamp;

        public LightUpdate(String id, boolean hasEntity, long triggeredTimestamp) {
            this.id = id;
            this.hasEntity = hasEntity;
            this.triggeredTimestamp = triggeredTimestamp;
        }
    }
}
