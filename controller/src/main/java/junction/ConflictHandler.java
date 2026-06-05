package junction;

import java.util.*;

/**
 * Conflict & Priority Handler
 * Responsibilities:
 * - Encapsulate the junction conflict matrix (delegates to ConflictMatrix)
 * - Provide priority ordering for different entity types (train, bus, bicycle/pedestrian, car)
 */
public class ConflictHandler {

    private final ConflictMatrix matrix = new ConflictMatrix();

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
     * - "sb" is treated as TRAIN
     * - "42" is treated as BUS
     * - A configured set of signals is treated as bicycle/pedestrian
     * - All remaining known signals are treated as CAR
     * - Unknown IDs -> UNKNOWN
     */
    private static final Set<String> BICYCLE_PEDESTRIAN_SIGNALS = Set.of("22", "26.1", "28.1", "86.1", "88.1", "31.1", "31.2", "32.1", "32.2", "35.1", "35.2", "36.1", "36.2", "37.1", "37.2", "38.1", "38.2");
    // private static final Set<String> TRAIN_SIGNALS = Set.of("sb", "ts.l", "ts.r"); // Improved train logic; not implemented

    public boolean isBicycleOrPedestrianSignal(String signalId) {
        return BICYCLE_PEDESTRIAN_SIGNALS.contains(signalId);
    }

    public Priority priorityForSignal(String signalId) {
        if (signalId == null) return Priority.UNKNOWN;
        if ("sb".equals(signalId)) return Priority.TRAIN;
        if ("42".equals(signalId)) return Priority.BUS;
        if (isBicycleOrPedestrianSignal(signalId)) return Priority.BICYCLE_PEDESTRIAN;
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
        return Comparator.comparingInt((WaitingRequest a) -> a.priority.level()).thenComparingLong(a -> a.triggeredTimestamp);
    }

    /**
     * Small holder representing a waiting request for a signal.
     */
    public record WaitingRequest(String signalId, Priority priority, long triggeredTimestamp) {
    }

    // --- Helpers delegating to underlying matrix ---
    public boolean canTurnGreen(String candidateSignal, Set<String> currentlyGreen) {
        if ("sb".equals(candidateSignal)) return true;
        if (currentlyGreen.contains("sb")) {
            if (currentlyGreen.contains(candidateSignal)) return false;
        }

        for (String green : currentlyGreen) {
            if ("sb".equals(green)) continue;
            if (hasConflict(candidateSignal, green)) {
                return false;
            }
        }

        return true;
    }

    public boolean hasConflict(String a, String b) {
        return matrix.hasConflict(a, b);
    }

    public String[] getAllSignals() { return matrix.getAllSignals(); }

}

