package junction;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Traffic light controller using the conflict matrix.
 *
 * States:
 * - normal lights: 0 = red, 1 = orange, 2 = green
 * - bus 42: 0 = red, 1 = orange, 2 = straight, 3 = right, 4 = straight + right
 * - sb: 0 = closed, 1 = warning/clearing, 2 = open
 */
public class TrafficLightService {

    private long carMinGreenMs = 6000;
    private long busMinGreenMs = 4000;
    private long bikeMinGreenMs = 5000;
    private long pedestrianMinGreenMs = 4000;
    private long maxGreenMs = 30000;
    private long orangeMs = 3500;
    private long minRedMs = 4000;
    private long maxCarRedMs = 120000;

    private static final String TRAIN_SIGNAL_ID = "sb";
    private static final Set<String> BUS_SIGNALS = Set.of("42");
    private static final Set<String> BIKE_SIGNALS = Set.of("22", "26.1", "28.1", "86.1", "88.1");
    private static final Set<String> PEDESTRIAN_SIGNALS = Set.of(
            "31.1", "31.2", "32.1", "32.2",
            "35.1", "35.2", "36.1", "36.2",
            "37.1", "37.2", "38.1", "38.2"
    );
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

    public synchronized Map<String, Integer> processUpdate(List<LightUpdate> updates, long currentTimestamp, long trainArrivalTimestamp) {
        applyLightUpdates(updates);
        boolean trainActive = applyTrainState(currentTimestamp, trainArrivalTimestamp);
        transitionOrangeToRed(currentTimestamp);
        transitionGreenToOrange(currentTimestamp, trainActive);
        prioritizeExpiredCarRed(currentTimestamp, trainActive);
        prioritizeWaitingBuses(currentTimestamp, trainActive);
        activateWaitingSignals(currentTimestamp, trainActive);
        return getAllStates();
    }

    private void applyUpdates(List<LightUpdate> updates) {
        for (LightUpdate update : updates) {
            if (!states.containsKey(update.id)) continue;
            entityPresence.put(update.id, update.hasEntity);
            triggeredTimestamps.put(update.id, update.triggeredTimestamp);
        }
    }

    private boolean applyTrainState(long currentTimestamp, long trainArrivalTimestamp) {
        if (trainArrivalTimestamp <= 0) {
            entityPresence.put(TRAIN_SIGNAL_ID, false);
            setState(TRAIN_SIGNAL_ID, 2, currentTimestamp);
            return false;
        }

        long activeFrom = trainArrivalTimestamp - getTrainPreArrivalDurationMs();
        long loweringFrom = trainArrivalTimestamp - trainLoweringMs;
        long closedUntil = trainArrivalTimestamp + trainClosedMs;
        long activeUntil = closedUntil + trainRaisingMs;
        boolean active = currentTimestamp >= activeFrom && currentTimestamp < activeUntil;

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

        if (currentTimestamp < loweringFrom) {
            setState(TRAIN_SIGNAL_ID, 1, currentTimestamp);
        } else if (currentTimestamp < closedUntil) {
            setState(TRAIN_SIGNAL_ID, 0, currentTimestamp);
        } else {
            setState(TRAIN_SIGNAL_ID, 1, currentTimestamp);
        }
        return true;
    }

    private long getTrainPreArrivalDurationMs() {
        return trainWarningMs + trainLoweringMs;
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
            if (!isGoState(signal, state)) continue;

            if (trainActive && matrix.hasConflict(TRAIN_SIGNAL_ID, signal)) {
                setState(signal, 0, currentTimestamp);
                continue;
            }

            int state = stateOf(signal);
            if (!isGreen(signal, state)) continue;

            long greenDuration = currentTimestamp - greenSince.getOrDefault(signal, 0L);
            if (greenDuration >= maxGreenMsFor(signal)) {
                System.out.println("[Controller] " + signal + " MAX GREEN reached, forcing orange");
                setState(signal, ORANGE, currentTimestamp);
                continue;
            }

            if (!hasEntity && (currentTimestamp - gSince) >= getMinGreenMs(signal)) {
                setState(signal, 1, currentTimestamp);
            }
        }
    }

    private void prioritizeExpiredCarRed(long currentTimestamp, boolean trainActive) {
        for (String waitingCar : matrix.getAllSignals()) {
            if (!isCarSignal(waitingCar)) continue;
            if (!entityPresence.getOrDefault(waitingCar, false)) continue;
            if (states.getOrDefault(waitingCar, 0) != 0) continue;
            if (trainActive && matrix.hasConflict(TRAIN_SIGNAL_ID, waitingCar)) continue;

            long redSince = stateChangeTime.getOrDefault(waitingCar, currentTimestamp);
            if ((currentTimestamp - redSince) < maxCarRedMs) continue;

            for (String activeSignal : matrix.getAllSignals()) {
                if (TRAIN_SIGNAL_ID.equals(activeSignal)) continue;
                if (!matrix.hasConflict(waitingCar, activeSignal)) continue;
                if (!isGoState(activeSignal, states.getOrDefault(activeSignal, 0))) continue;

                long greenFor = currentTimestamp - greenSince.getOrDefault(activeSignal, 0L);
                if (greenFor >= getMinGreenMs(activeSignal)) {
                    System.out.println("[Controller] " + waitingCar + " reached max red wait, ending " + activeSignal);
                    setState(activeSignal, 1, currentTimestamp);
                }
            }
        }
    }

    private void prioritizeWaitingBuses(long currentTimestamp, boolean trainActive) {
        for (String waitingBus : BUS_SIGNALS) {
            if (!entityPresence.getOrDefault(waitingBus, false)) continue;
            if (states.getOrDefault(waitingBus, 0) != 0) continue;
            if (trainActive && matrix.hasConflict(TRAIN_SIGNAL_ID, waitingBus)) continue;

            long changedAt = stateChangeTime.getOrDefault(waitingBus, 0L);
            if ((currentTimestamp - changedAt) < minRedMs) continue;

            for (String activeSignal : matrix.getAllSignals()) {
                if (TRAIN_SIGNAL_ID.equals(activeSignal)) continue;
                if (!matrix.hasConflict(waitingBus, activeSignal)) continue;
                if (!isGoState(activeSignal, states.getOrDefault(activeSignal, 0))) continue;

                long greenFor = currentTimestamp - greenSince.getOrDefault(activeSignal, 0L);
                if (greenFor >= getMinGreenMs(activeSignal)) {
                    System.out.println("[Controller] " + waitingBus + " bus priority ending " + activeSignal);
                    setState(activeSignal, 1, currentTimestamp);
                }
            }
        }
    }

    private void activateWaitingSignals(long currentTimestamp, boolean trainActive) {
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

        waiting.sort(
                Comparator
                        .comparingInt((String s) -> isBusSignal(s) ? 0 : 1)
                        .thenComparing(
                                Comparator.comparingLong((String s) -> getPriorityScore(s, currentTimestamp))
                                        .reversed()
                        )
                        .thenComparingLong(s -> triggeredTimestamps.getOrDefault(s, Long.MAX_VALUE))
                        .thenComparing(s -> s)
        );

        for (String signal : waiting) {
            if (matrix.canTurnGreen(signal, occupied)) {
                setState(signal, getGoState(signal), currentTimestamp);
                greenSince.put(signal, currentTimestamp);
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
        String name = switch (state) {
            case 0 -> "RED";
            case 1 -> "ORANGE";
            case 2 -> isBusSignal(signal) ? "BUS_STRAIGHT" : "GREEN";
            case 3 -> "BUS_RIGHT";
            case 4 -> "BUS_STRAIGHT_RIGHT";
            default -> "?";
        };
        System.out.println("[Controller] " + signal + " -> " + name);
    }

    private Set<String> getOccupiedSignals() {
        Set<String> occ = new HashSet<>();
        for (Map.Entry<String, Integer> e : states.entrySet()) {
            if (TRAIN_SIGNAL_ID.equals(e.getKey())) continue;
            if (isOccupiedState(e.getKey(), e.getValue())) occ.add(e.getKey());
        }
        return occ;
    }

    public Map<String, Integer> getAllStates() {
        return new HashMap<>(states);
    }

    public Map<String, Long> getTimingConfig() {
        Map<String, Long> cfg = new LinkedHashMap<>();
        cfg.put("minGreenMs", carMinGreenMs);
        cfg.put("carMinGreenMs", carMinGreenMs);
        cfg.put("busMinGreenMs", busMinGreenMs);
        cfg.put("bikeMinGreenMs", bikeMinGreenMs);
        cfg.put("pedestrianMinGreenMs", pedestrianMinGreenMs);
        cfg.put("maxGreenMs", maxGreenMs);
        cfg.put("orangeMs", orangeMs);
        cfg.put("minRedMs", minRedMs);
        cfg.put("maxCarRedMs", maxCarRedMs);
        cfg.put("trainWarningMs", trainWarningMs);
        cfg.put("trainLoweringMs", trainLoweringMs);
        cfg.put("trainClosedMs", trainClosedMs);
        cfg.put("trainRaisingMs", trainRaisingMs);
        return cfg;
    }

    public void setTimingConfig(long minGreen, long maxGreen, long orange, long minRed) {
        setTimingConfig(minGreen, minGreen, minGreen, minGreen, maxGreen, orange, minRed, maxCarRedMs);
    }

    public void setTimingConfig(
            long carMinGreen,
            long busMinGreen,
            long bikeMinGreen,
            long pedestrianMinGreen,
            long maxGreen,
            long orange,
            long minRed,
            long maxCarRed
    ) {
        this.carMinGreenMs = carMinGreen;
        this.busMinGreenMs = busMinGreen;
        this.bikeMinGreenMs = bikeMinGreen;
        this.pedestrianMinGreenMs = pedestrianMinGreen;
        this.maxGreenMs = maxGreen;
        this.orangeMs = orange;
        this.minRedMs = minRed;
        this.maxCarRedMs = maxCarRed;
        System.out.println("[Controller] Timing updated: carMinGreen=" + carMinGreen
                + " busMinGreen=" + busMinGreen
                + " bikeMinGreen=" + bikeMinGreen
                + " pedestrianMinGreen=" + pedestrianMinGreen
                + " maxGreen=" + maxGreen
                + " orange=" + orange
                + " minRed=" + minRed
                + " maxCarRed=" + maxCarRed);
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

    private long getPriorityScore(String signal, long currentTimestamp) {
        long redSince = stateChangeTime.getOrDefault(signal, currentTimestamp);
        long redWaitMs = Math.max(0L, currentTimestamp - redSince);
        long triggeredAt = triggeredTimestamps.getOrDefault(signal, 0L);
        long requestWaitMs = triggeredAt > 0L ? Math.max(0L, currentTimestamp - triggeredAt) : 0L;
        long maxRedBonus = isCarSignal(signal) && redWaitMs >= maxCarRedMs ? maxCarRedMs : 0L;
        return redWaitMs + requestWaitMs + maxRedBonus;
    }

    private int getGoState(String signal) {
        if (isBusSignal(signal)) return 4;
        return 2;
    }

    boolean isGoState(String signal, int state) {
        if (isBusSignal(signal)) return state == 2 || state == 3 || state == 4;
        return state == 2;
    }

    private boolean isOccupiedState(String signal, int state) {
        return state == 1 || isGoState(signal, state);
    }

    private long getMinGreenMs(String signal) {
        if (isBusSignal(signal)) return busMinGreenMs;
        if (BIKE_SIGNALS.contains(signal)) return bikeMinGreenMs;
        if (PEDESTRIAN_SIGNALS.contains(signal)) return pedestrianMinGreenMs;
        return carMinGreenMs;
    }

    private boolean isBusSignal(String signal) {
        return BUS_SIGNALS.contains(signal);
    }

    private boolean isCarSignal(String signal) {
        return !TRAIN_SIGNAL_ID.equals(signal)
                && !isBusSignal(signal)
                && !BIKE_SIGNALS.contains(signal)
                && !PEDESTRIAN_SIGNALS.contains(signal);
    }
}
