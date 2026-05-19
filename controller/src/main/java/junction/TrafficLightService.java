package junction;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Traffic light controller using conflict matrix.
 * States: 0 = red, 1 = orange, 2 = green
 * MAX_GREEN: once a light turns green, it can stay green for at most MAX_GREEN_MS.
 * The timer is based on when the light TRANSITIONED to green, not on entity presence.
 * Quick entity flickers (car leaving detection zone momentarily) do NOT reset the timer.
 * Only a full red->green transition resets it.
 */
public class TrafficLightService {

    private long minGreenMs = 6_000L;
    private static final long MAX_GREEN_MS = 30_000L;
    private static final long MAX_RED_MS = 120_000L; // 2 minutes
    private long orangeMs = 3_500L;
    private long minRedMs = 5000;
    private static final Map<String, String> PEDESTRIAN_SEQUENCE_PAIRS = Map.of(
            "31.1", "31.2",
            "32.1", "32.2",
            "35.1", "35.2",
            "36.1", "36.2",
            "37.1", "37.2",
            "38.1", "38.2"
    );

    private final ConflictHandler conflictHandler;
    private final TrainHandler trainHandler;
    private final BusHandler busHandler;
    private final BicycleHandler bicycleHandler;
    private final PedestrianHandler pedestrianHandler;
    private final CarHandler carHandler;

    private final Map<String, Integer> states = new ConcurrentHashMap<>(); // signal, state
    private final Map<String, Long> stateChangeTime = new ConcurrentHashMap<>();
    private final Map<String, Long> greenSince = new ConcurrentHashMap<>();
    private final Map<String, Boolean> entityPresence = new ConcurrentHashMap<>();
    private final Map<String, Long> triggeredTimestamps = new ConcurrentHashMap<>();

    public TrafficLightService() {
        this.conflictHandler = new ConflictHandler();
        this.trainHandler = new TrainHandler();
        this.busHandler = new BusHandler();
        this.bicycleHandler = new BicycleHandler();
        this.pedestrianHandler = new PedestrianHandler();
        this.carHandler = new CarHandler();
        for (String signal : conflictHandler.getAllSignals()) {
            states.put(signal, 0);
            stateChangeTime.put(signal, 0L);
            greenSince.put(signal, 0L);
            entityPresence.put(signal, false);
            triggeredTimestamps.put(signal, 0L);
        }
    }

    public void registerTrainArrival(long trainArrivalTimestamp) { trainHandler.registerTrainArrival(trainArrivalTimestamp); }
    public void clearTrainWindow() { trainHandler.clearTrainWindow(); }

    public synchronized Map<String, Integer> processUpdate(List<LightUpdate> updates, long currentTimestamp) {
        for (LightUpdate update : updates) {
            if (states.containsKey(update.id)) {
                entityPresence.put(update.id, update.hasEntity);
                triggeredTimestamps.put(update.id, update.triggeredTimestamp);
            }
        }

        // Phase X: train handling owns sb while a train window is active.
        String SB = "sb";
        int sbState = trainHandler.sbStateAt(currentTimestamp);
        if (states.get(SB) != sbState) {
            setState(SB, sbState, currentTimestamp);
            if (sbState == 2) {
                greenSince.put(SB, currentTimestamp);
            }
        }
        trainHandler.updateTerminalTrainSignals(currentTimestamp);
        forceTrainConflictingTrafficOrange(currentTimestamp);

        // Phase 1: orange -> red
        for (String signal : conflictHandler.getAllSignals()) {
            int state = states.getOrDefault(signal, 0);
            long changedAt = stateChangeTime.getOrDefault(signal, 0L);
            if ("sb".equals(signal)) continue;
            if (state == 1 && (currentTimestamp - changedAt) >= orangeMsFor(signal)) {
                setState(signal, 0, currentTimestamp);
            }
        }

        // Phase 2: green -> orange (max green OR no entity + min green)
        for (String signal : conflictHandler.getAllSignals()) {
            if ("sb".equals(signal)) continue;

            int state = states.getOrDefault(signal, 0);
            if (!isGreen(signal, state)) continue;

            long gSince = greenSince.getOrDefault(signal, 0L);
            boolean hasEntity = entityPresence.getOrDefault(signal, false);
            long effectiveMinGreenMs = minGreenMsFor(signal);
            long effectiveMaxGreenMs = maxGreenMsFor(signal);

            if ((currentTimestamp - gSince) >= effectiveMaxGreenMs) {
                System.out.println("[Controller] " + signal + " MAX GREEN reached, forcing orange");
                setState(signal, 1, currentTimestamp);
                continue;
            }

            if (!hasEntity && (currentTimestamp - gSince) >= effectiveMinGreenMs) {
                setState(signal, 1, currentTimestamp);
            }
        }

        // Phase 3: turn waiting lights green (longest-wait-first, greedy)
        Set<String> occupied = getOccupiedSignals();
        reserveTriggerDelayBlocks(occupied, currentTimestamp);

        List<ConflictHandler.WaitingRequest> waiting = new ArrayList<>();
        Set<String> waitingSignals = new HashSet<>();
        for (String signal : conflictHandler.getAllSignals()) {
            boolean hasEntity = entityPresence.getOrDefault(signal, false);
            int state = states.getOrDefault(signal, 0);
            if (hasEntity && state == 0) {
                addWaitingRequest(waiting, waitingSignals, signal, signal, currentTimestamp);
            }
        }

        waiting.sort(conflictHandler.waitingComparator());

        for (ConflictHandler.WaitingRequest wr : waiting) {
            String signal = wr.signalId();

            long triggered = triggeredTimestamps.getOrDefault(signal, 0L);
            long waitTime = currentTimestamp - triggered;
            boolean isStarving = waitTime >= MAX_RED_MS;

            if (isBlockedByTrain(signal, currentTimestamp)) {
                continue;
            }

            if (isStarving) {
                System.out.println("[Controller] " + signal + " STARVING after " + TimeFormat.duration(waitTime));
                for (String other : new HashSet<>(states.keySet())) {
                    if (conflictHandler.hasConflict(other, signal)) {
                        int otherState = states.getOrDefault(other, 0);
                        if (!"sb".equals(other) && isGreen(other, otherState)) {
                            setState(other, 1, currentTimestamp); // > Orange
                        }
                    }
                }
            }

            if (isStarving || conflictHandler.canTurnGreen(signal, occupied)) {
                setState(signal, greenStateFor(signal), currentTimestamp);
                greenSince.put(signal, currentTimestamp);
                occupied.add(signal);
                turnLinkedPedestrianGreenIfPossible(signal, occupied, currentTimestamp);
            }
        }

        return getAllStates();
    }

    private void setState(String signal, int state, long timestamp) {
        states.put(signal, state);
        stateChangeTime.put(signal, timestamp);
        String name = switch (state) { case 0 -> "RED"; case 1 -> "ORANGE"; case 2, 4 -> "GREEN"; default -> "?"; };
        System.out.println("[Controller] " + signal + " -> " + name);
    }

    private void turnLinkedPedestrianGreenIfPossible(String sourceSignal, Set<String> occupied, long currentTimestamp) {
        String linkedSignal = PEDESTRIAN_SEQUENCE_PAIRS.get(sourceSignal);
        if (linkedSignal == null) return;
        if (states.getOrDefault(linkedSignal, 0) != 0) return;

        long changedAt = stateChangeTime.getOrDefault(linkedSignal, 0L);
        if ((currentTimestamp - changedAt) < minRedMsFor(linkedSignal)) return;
        if (!isBlockedByTrain(linkedSignal, currentTimestamp) && conflictHandler.canTurnGreen(linkedSignal, occupied)) {
            setState(linkedSignal, greenStateFor(linkedSignal), currentTimestamp);
            greenSince.put(linkedSignal, currentTimestamp);
            occupied.add(linkedSignal);
        }
    }

    private void addWaitingRequest(List<ConflictHandler.WaitingRequest> waiting, Set<String> waitingSignals, String signal, String triggerSource, long currentTimestamp) {
        int state = states.getOrDefault(signal, 0);
        if (state != 0 || waitingSignals.contains(signal)) return;

        long changedAt = stateChangeTime.getOrDefault(signal, 0L);
        if ((currentTimestamp - changedAt) < minRedMsFor(signal)) return;

        long triggered = triggeredTimestamps.getOrDefault(triggerSource, currentTimestamp);
        long waitTime = currentTimestamp - triggered;
        if (!bicycleHandler.canRequestGreen(signal, waitTime)) return;
        if (!pedestrianHandler.canRequestGreen(signal, waitTime)) return;

        waitingSignals.add(signal);
        boolean isStarving = waitTime >= MAX_RED_MS;

        ConflictHandler.Priority pr = isStarving
                ? ConflictHandler.Priority.TRAIN
                : conflictHandler.priorityForSignal(signal);

        waiting.add(new ConflictHandler.WaitingRequest(signal, pr, triggered));
    }

    private Set<String> getOccupiedSignals() {
        Set<String> occ = new HashSet<>();
        for (Map.Entry<String, Integer> e : states.entrySet()) {
            int state = e.getValue();

            if (isGreen(e.getKey(), state) || state == 1) {
                occ.add(e.getKey());
            }
        }
        return occ;
    }

    public Map<String, Integer> getAllStates() { return new HashMap<>(states); }

    public Map<String, Long> getTimingConfig() {
        Map<String, Long> cfg = new LinkedHashMap<>();
        cfg.put("minGreenMs", minGreenMs);
        cfg.put("maxGreenMs", MAX_GREEN_MS);
        cfg.put("orangeMs", orangeMs);
        cfg.put("minRedMs", minRedMs);
        return cfg;
    }

    public void setTimingConfig(long minGreen, long maxGreen, long orange, long minRed) {
        this.minGreenMs = minGreen;
        this.orangeMs = orange;
        this.minRedMs = minRed;
        System.out.println("[Controller] Timing updated: minGreen=" + TimeFormat.duration(minGreen)
                + " maxGreen=" + TimeFormat.duration(MAX_GREEN_MS)
                + " orange=" + TimeFormat.duration(orange)
                + " minRed=" + TimeFormat.duration(minRed));
    }

    public static class LightUpdate {
        public final String id;
        public final boolean hasEntity;
        public final long triggeredTimestamp;
        public LightUpdate(String id, boolean hasEntity, long triggeredTimestamp) {
            this.id = id; this.hasEntity = hasEntity; this.triggeredTimestamp = triggeredTimestamp;
        }
    }

    private boolean isGreen(String signal, int state) {
        return busHandler.isGreen(signal, state);
    }

    private long minGreenMsFor(String signal) {
        if (bicycleHandler.isBicycleSignal(signal)) {
            return bicycleHandler.minGreenMsFor(signal, minGreenMs);
        }
        if (pedestrianHandler.isPedestrianSignal(signal)) {
            return pedestrianHandler.minGreenMsFor(signal, minGreenMs);
        }
        return carHandler.minGreenMsFor(signal, busHandler.minGreenMsFor(signal, minGreenMs));
    }

    private long maxGreenMsFor(String signal) {
        if (bicycleHandler.isBicycleSignal(signal)) {
            return bicycleHandler.maxGreenMsFor(signal, MAX_GREEN_MS);
        }
        if (pedestrianHandler.isPedestrianSignal(signal)) {
            return pedestrianHandler.maxGreenMsFor(signal, MAX_GREEN_MS);
        }
        return MAX_GREEN_MS;
    }

    private long orangeMsFor(String signal) {
        return pedestrianHandler.orangeMsFor(signal,
                bicycleHandler.orangeMsFor(signal,
                        carHandler.orangeMsFor(signal, busHandler.orangeMsFor(signal, orangeMs))));
    }

    private long minRedMsFor(String signal) {
        return pedestrianHandler.minRedMsFor(signal,
                bicycleHandler.minRedMsFor(signal,
                        carHandler.minRedMsFor(signal, busHandler.minRedMsFor(signal, minRedMs))));
    }

    private int greenStateFor(String signal) {
        return busHandler.greenStateFor(signal);
    }

    private boolean isBlockedByTrain(String signal, long currentTimestamp) {
        return !"sb".equals(signal)
                && trainHandler.isTrafficBlocked(currentTimestamp)
                && conflictHandler.hasConflict("sb", signal);
    }

    private void forceTrainConflictingTrafficOrange(long currentTimestamp) {
        if (!trainHandler.isTrafficBlocked(currentTimestamp)) return;

        for (String signal : conflictHandler.getAllSignals()) {
            if (!"sb".equals(signal)
                    && conflictHandler.hasConflict("sb", signal)
                    && isGreen(signal, states.getOrDefault(signal, 0))) {
                setState(signal, 1, currentTimestamp);
            }
        }
    }

    private void reserveTriggerDelayBlocks(Set<String> occupied, long currentTimestamp) {
        for (String signal : conflictHandler.getAllSignals()) {
            if (!isWaitingForTriggerDelay(signal, currentTimestamp)) continue;

            occupied.add(signal);
            forceConflictingGreenTrafficOrange(signal, currentTimestamp);
        }
    }

    private boolean isWaitingForTriggerDelay(String signal, long currentTimestamp) {
        if (!entityPresence.getOrDefault(signal, false)) return false;
        if (states.getOrDefault(signal, 0) != 0) return false;

        long changedAt = stateChangeTime.getOrDefault(signal, 0L);
        if ((currentTimestamp - changedAt) < minRedMsFor(signal)) return false;

        long triggered = triggeredTimestamps.getOrDefault(signal, currentTimestamp);
        long waitTime = currentTimestamp - triggered;
        return bicycleHandler.isWaitingForTriggerDelay(signal, waitTime)
                || pedestrianHandler.isWaitingForTriggerDelay(signal, waitTime);
    }

    private void forceConflictingGreenTrafficOrange(String protectedSignal, long currentTimestamp) {
        for (String signal : conflictHandler.getAllSignals()) {
            if (protectedSignal.equals(signal)) continue;
            if (conflictHandler.hasConflict(protectedSignal, signal)
                    && isGreen(signal, states.getOrDefault(signal, 0))) {
                setState(signal, 1, currentTimestamp);
            }
        }
    }
}
