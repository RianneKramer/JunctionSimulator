package junction;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Traffic light controller using the conflict matrix.
 *
 * States: 0 = red, 1 = orange, 2 = green, 4 = bus green.
 */
public class TrafficLightService {
    private static final String TRAIN_BARRIER_SIGNAL = "sb";

    private static final int RED = 0;
    private static final int ORANGE = 1;
    private static final int GREEN = 2;

    private static final long DEFAULT_MIN_GREEN_MS = 6_000L;
    private static final long DEFAULT_ORANGE_MS = 3_500L;
    private static final long DEFAULT_MIN_RED_MS = 5_000L;
    private static final long MAX_GREEN_MS = 30_000L;
    private static final long MAX_RED_MS = 120_000L;

    private static final Map<String, String> PEDESTRIAN_SEQUENCE_PAIRS = Map.of(
            "31.1", "31.2",
            "32.1", "32.2",
            "35.1", "35.2",
            "36.1", "36.2",
            "37.1", "37.2",
            "38.1", "38.2"
    );

    private long minGreenMs = DEFAULT_MIN_GREEN_MS;
    private long orangeMs = DEFAULT_ORANGE_MS;
    private long minRedMs = DEFAULT_MIN_RED_MS;

    private final ConflictHandler conflictHandler;
    private final TrainHandler trainHandler;
    private final BusHandler busHandler;
    private final BicycleHandler bicycleHandler;
    private final PedestrianHandler pedestrianHandler;
    private final CarHandler carHandler;
    private final String[] allSignals;

    private final Map<String, Integer> states = new ConcurrentHashMap<>();
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
        this.allSignals = conflictHandler.getAllSignals();

        for (String signal : allSignals) {
            states.put(signal, RED);
            stateChangeTime.put(signal, 0L);
            greenSince.put(signal, 0L);
            entityPresence.put(signal, false);
            triggeredTimestamps.put(signal, 0L);
        }
    }

    public void registerTrainArrival(long trainArrivalTimestamp) {
        trainHandler.registerTrainArrival(trainArrivalTimestamp);
    }

    public void clearTrainWindow() {
        trainHandler.clearTrainWindow();
    }

    public synchronized Map<String, Integer> processUpdate(List<LightUpdate> updates, long currentTimestamp) {
        applyUpdates(updates);
        applyTrainPhase(currentTimestamp);
        expireOrangeSignals(currentTimestamp);
        expireGreenSignals(currentTimestamp);
        turnWaitingSignalsGreen(currentTimestamp);
        return getAllStates();
    }

    private void applyUpdates(List<LightUpdate> updates) {
        for (LightUpdate update : updates) {
            if (!states.containsKey(update.id)) continue;
            entityPresence.put(update.id, update.hasEntity);
            triggeredTimestamps.put(update.id, update.triggeredTimestamp);
        }
    }

    private void applyTrainPhase(long currentTimestamp) {
        int sbState = trainHandler.sbStateAt(currentTimestamp);
        if (stateOf(TRAIN_BARRIER_SIGNAL) != sbState) {
            setState(TRAIN_BARRIER_SIGNAL, sbState, currentTimestamp);
            if (sbState == GREEN) {
                greenSince.put(TRAIN_BARRIER_SIGNAL, currentTimestamp);
            }
        }

        trainHandler.updateTerminalTrainSignals(currentTimestamp);
        forceTrainConflictingTrafficOrange(currentTimestamp);
    }

    private void expireOrangeSignals(long currentTimestamp) {
        for (String signal : allSignals) {
            if (TRAIN_BARRIER_SIGNAL.equals(signal)) continue;
            if (stateOf(signal) != ORANGE) continue;

            long orangeSince = stateChangeTime.getOrDefault(signal, 0L);
            if ((currentTimestamp - orangeSince) >= orangeMsFor(signal)) {
                setState(signal, RED, currentTimestamp);
            }
        }
    }

    private void expireGreenSignals(long currentTimestamp) {
        for (String signal : allSignals) {
            if (TRAIN_BARRIER_SIGNAL.equals(signal)) continue;

            int state = stateOf(signal);
            if (!isGreen(signal, state)) continue;

            long greenDuration = currentTimestamp - greenSince.getOrDefault(signal, 0L);
            if (greenDuration >= maxGreenMsFor(signal)) {
                System.out.println("[Controller] " + signal + " MAX GREEN reached, forcing orange");
                setState(signal, ORANGE, currentTimestamp);
                continue;
            }

            boolean hasEntity = entityPresence.getOrDefault(signal, false);
            if (!hasEntity && greenDuration >= minGreenMsFor(signal)) {
                setState(signal, ORANGE, currentTimestamp);
            }
        }
    }

    private void turnWaitingSignalsGreen(long currentTimestamp) {
        Set<String> occupied = getOccupiedSignals();
        reserveTriggerDelayBlocks(occupied, currentTimestamp);

        List<ConflictHandler.WaitingRequest> waiting = collectWaitingRequests(currentTimestamp);
        waiting.sort(conflictHandler.waitingComparator());

        for (ConflictHandler.WaitingRequest request : waiting) {
            String signal = request.signalId();
            long waitTime = currentTimestamp - triggeredTimestamps.getOrDefault(signal, 0L);
            boolean isStarving = waitTime >= MAX_RED_MS;

            if (isBlockedByTrain(signal, currentTimestamp)) continue;

            if (isStarving) {
                forceConflictingGreenTrafficOrange(signal, currentTimestamp);
                System.out.println("[Controller] " + signal + " STARVING after " + TimeFormat.duration(waitTime));
            }

            if (isStarving || conflictHandler.canTurnGreen(signal, occupied)) {
                turnGreen(signal, occupied, currentTimestamp);
                turnLinkedPedestrianGreenIfPossible(signal, occupied, currentTimestamp);
            }
        }
    }

    private List<ConflictHandler.WaitingRequest> collectWaitingRequests(long currentTimestamp) {
        List<ConflictHandler.WaitingRequest> waiting = new ArrayList<>();
        Set<String> waitingSignals = new HashSet<>();

        for (String signal : allSignals) {
            if (!entityPresence.getOrDefault(signal, false)) continue;
            if (stateOf(signal) != RED) continue;
            addWaitingRequest(waiting, waitingSignals, signal, currentTimestamp);
        }

        return waiting;
    }

    private void addWaitingRequest(
            List<ConflictHandler.WaitingRequest> waiting,
            Set<String> waitingSignals,
            String signal,
            long currentTimestamp
    ) {
        if (waitingSignals.contains(signal)) return;
        if (hasSatisfiedMinRed(signal, currentTimestamp)) return;

        long triggered = triggeredTimestamps.getOrDefault(signal, currentTimestamp);
        long waitTime = currentTimestamp - triggered;
        if (!hasSatisfiedTriggerDelay(signal, waitTime)) return;

        waitingSignals.add(signal);
        ConflictHandler.Priority priority = waitTime >= MAX_RED_MS
                ? ConflictHandler.Priority.TRAIN
                : conflictHandler.priorityForSignal(signal);
        waiting.add(new ConflictHandler.WaitingRequest(signal, priority, triggered));
    }

    private void turnGreen(String signal, Set<String> occupied, long currentTimestamp) {
        setState(signal, greenStateFor(signal), currentTimestamp);
        greenSince.put(signal, currentTimestamp);
        occupied.add(signal);
    }

    private void turnLinkedPedestrianGreenIfPossible(String sourceSignal, Set<String> occupied, long currentTimestamp) {
        String linkedSignal = PEDESTRIAN_SEQUENCE_PAIRS.get(sourceSignal);
        if (linkedSignal == null) return;
        if (stateOf(linkedSignal) != RED) return;
        if (hasSatisfiedMinRed(linkedSignal, currentTimestamp)) return;
        if (isBlockedByTrain(linkedSignal, currentTimestamp)) return;
        if (!conflictHandler.canTurnGreen(linkedSignal, occupied)) return;

        turnGreen(linkedSignal, occupied, currentTimestamp);
    }

    private void reserveTriggerDelayBlocks(Set<String> occupied, long currentTimestamp) {
        for (String signal : allSignals) {
            if (!isWaitingForTriggerDelay(signal, currentTimestamp)) continue;
            occupied.add(signal);
            forceConflictingGreenTrafficOrange(signal, currentTimestamp);
        }
    }

    private boolean isWaitingForTriggerDelay(String signal, long currentTimestamp) {
        if (!entityPresence.getOrDefault(signal, false)) return false;
        if (stateOf(signal) != RED) return false;
        if (hasSatisfiedMinRed(signal, currentTimestamp)) return false;

        long triggered = triggeredTimestamps.getOrDefault(signal, currentTimestamp);
        long waitTime = currentTimestamp - triggered;
        return bicycleHandler.isWaitingForTriggerDelay(signal, waitTime)
                || pedestrianHandler.isWaitingForTriggerDelay(signal, waitTime);
    }

    private boolean hasSatisfiedTriggerDelay(String signal, long waitTime) {
        return bicycleHandler.canRequestGreen(signal, waitTime)
                && pedestrianHandler.canRequestGreen(signal, waitTime);
    }

    private boolean hasSatisfiedMinRed(String signal, long currentTimestamp) {
        long changedAt = stateChangeTime.getOrDefault(signal, 0L);
        return (currentTimestamp - changedAt) < minRedMsFor(signal);
    }

    private Set<String> getOccupiedSignals() {
        Set<String> occupied = new HashSet<>();
        for (Map.Entry<String, Integer> entry : states.entrySet()) {
            String signal = entry.getKey();
            int state = entry.getValue();
            if (isGreen(signal, state) || state == ORANGE) {
                occupied.add(signal);
            }
        }
        return occupied;
    }

    private void forceTrainConflictingTrafficOrange(long currentTimestamp) {
        if (!trainHandler.isTrafficBlocked(currentTimestamp)) return;

        for (String signal : allSignals) {
            if (TRAIN_BARRIER_SIGNAL.equals(signal)) continue;
            if (conflictHandler.hasConflict(TRAIN_BARRIER_SIGNAL, signal)
                    && isGreen(signal, stateOf(signal))) {
                setState(signal, ORANGE, currentTimestamp);
            }
        }
    }

    private void forceConflictingGreenTrafficOrange(String protectedSignal, long currentTimestamp) {
        for (String signal : allSignals) {
            if (protectedSignal.equals(signal)) continue;
            if (TRAIN_BARRIER_SIGNAL.equals(signal)) continue;
            if (conflictHandler.hasConflict(protectedSignal, signal)
                    && isGreen(signal, stateOf(signal))) {
                setState(signal, ORANGE, currentTimestamp);
            }
        }
    }

    private void setState(String signal, int state, long timestamp) {
        states.put(signal, state);
        stateChangeTime.put(signal, timestamp);
        System.out.println("[Controller] " + signal + " -> " + stateName(state));
    }

    private int stateOf(String signal) {
        return states.getOrDefault(signal, RED);
    }

    private String stateName(int state) {
        return switch (state) {
            case RED -> "RED";
            case ORANGE -> "ORANGE";
            case GREEN, 4 -> "GREEN";
            default -> "?";
        };
    }

    public Map<String, Integer> getAllStates() {
        return new HashMap<>(states);
    }

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

    private boolean isGreen(String signal, int state) {
        return busHandler.isGreen(signal, state);
    }

    private int greenStateFor(String signal) {
        return busHandler.greenStateFor(signal);
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

    private boolean isBlockedByTrain(String signal, long currentTimestamp) {
        return !TRAIN_BARRIER_SIGNAL.equals(signal)
                && trainHandler.isTrafficBlocked(currentTimestamp)
                && conflictHandler.hasConflict(TRAIN_BARRIER_SIGNAL, signal);
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
