package junction;

import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Conflict & Priority Handler
 *
 * Responsibilities:
 * - Encapsulate the junction conflict matrix (delegates to ConflictMatrix)
 * - Provide priority ordering for different entity types (train, bus, bicycle/pedestrian, car)
 * - Provide simple train-priority windows: prepare window (20s before arrival) and clear window (30s after arrival).
 */
public class ConflictHandler {

    private final ConflictMatrix matrix = new ConflictMatrix();

    // Train timing windows (milliseconds)
    private static final long TRAIN_PREPARE_MS = 20_000L; // 20s before arrival
    private static final long TRAIN_CLEAR_MS   = 30_000L; // 30s after arrival

    // Tracks the active train block interval [blockStart, blockEnd). 0 means no active train block.
    private final AtomicLong blockStart = new AtomicLong(0);
    private final AtomicLong blockEnd = new AtomicLong(0);

    private final Set<String> trainConflictingSignals;

    public ConflictHandler() {
        // Compute which signals conflict with the SP (railway) signal using the matrix API
        Set<String> set = new HashSet<>();
        for (String s : matrix.getAllSignals()) {
            if (matrix.hasConflict("SP", s)) set.add(s);
        }
        trainConflictingSignals = Collections.unmodifiableSet(set);
    }

    // --- Train priority handling ---

    /**
     * Register an upcoming train arrival timestamp (epoch ms).
     * This creates a blocking window that starts TRAIN_PREPARE_MS before arrival and ends TRAIN_CLEAR_MS after arrival.
     */
    public void registerTrainArrival(long trainArrivalTimestamp) {
        long start = Math.max(0L, trainArrivalTimestamp - TRAIN_PREPARE_MS);
        long end = trainArrivalTimestamp + TRAIN_CLEAR_MS;
        blockStart.set(start);
        blockEnd.set(end);
        System.out.println("[ConflictHandler] Registered train window: " + start + " -> " + end);
    }

    /**
     * Clear any registered train blocking window.
     */
    public void clearTrainWindow() {
        blockStart.set(0);
        blockEnd.set(0);
    }

    /**
     * Returns true if the given signal should be kept red because of an active train window at currentTimestamp.
     */
    public boolean isBlockedByTrain(String signal, long currentTimestamp) {
        long s = blockStart.get();
        long e = blockEnd.get();
        if (s == 0 && e == 0) return false;
        if (currentTimestamp < s || currentTimestamp >= e) return false;
        return trainConflictingSignals.contains(signal);
    }

    // --- Priority logic ---

    /**
     * Priority levels: lower is higher priority.
     */
    public enum Priority {
        TRAIN(1), BUS(2), BICYCLE_PEDESTRIAN(3), CAR(4), UNKNOWN(5);
        private final int level;
        Priority(int level) { this.level = level; }
        public int level() { return level; }
    }

    /**
     * Determine priority based on signal id.
     * - "SP" is treated as TRAIN
     * - "42" is treated as BUS
     * - A configured set of signals is treated as bicycle/pedestrian
     * - All remaining known signals are treated as CAR
     * - Unknown IDs -> UNKNOWN
     */
    private static final Set<String> BICYCLE_PEDESTRIAN_SIGNALS = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
        "22","26.1","28.1","86.1","88.1",
        "31.1","31.2","32.1","32.2",
        "35.1","35.2","36.1","36.2",
        "37.1","37.2","38.1","38.2"
    )));

    public Priority priorityForSignal(String signalId) {
        if (signalId == null) return Priority.UNKNOWN;
        if ("SP".equals(signalId)) return Priority.TRAIN;
        if ("42".equals(signalId)) return Priority.BUS;
        if (BICYCLE_PEDESTRIAN_SIGNALS.contains(signalId)) return Priority.BICYCLE_PEDESTRIAN;
        // Known but uncategorized signals default to CAR
        for (String s : matrix.getAllSignals()) {
            if (s.equals(signalId)) return Priority.CAR;
        }
        return Priority.UNKNOWN;
    }

    /**
     * Comparator for two waiting signals that combines configured priority and request timestamp.
     * - Primary: entity priority (lower wins)
     * - Secondary: earlier triggeredTimestamp (longer waiting) wins
     */
    public Comparator<WaitingRequest> waitingComparator() {
        return (a, b) -> {
            int p = Integer.compare(a.priority.level(), b.priority.level());
            if (p != 0) return p;
            return Long.compare(a.triggeredTimestamp, b.triggeredTimestamp);
        };
    }

    /**
     * Small holder representing a waiting request for a signal.
     */
    public static class WaitingRequest {
        public final String signalId;
        public final Priority priority;
        public final long triggeredTimestamp;
        public WaitingRequest(String signalId, Priority priority, long triggeredTimestamp) {
            this.signalId = signalId; this.priority = priority; this.triggeredTimestamp = triggeredTimestamp;
        }
    }

    // --- Helpers delegating to underlying matrix ---
    public boolean canTurnGreen(String candidateSignal, Set<String> currentlyGreen, long currentTimestamp) {
        if (isBlockedByTrain(candidateSignal, currentTimestamp)) return false;
        return matrix.canTurnGreen(candidateSignal, currentlyGreen);
    }

    public String[] getAllSignals() { return matrix.getAllSignals(); }

}

