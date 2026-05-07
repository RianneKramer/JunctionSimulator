package junction;

import java.util.*;

/**
 * Conflict matrix for the junction.
 * X = conflict (cannot be green simultaneously).
 * Built from Conflictenmatrix_V2.xlsx.
 */
public class ConflictMatrix {

    private static final String[] ALL_SIGNALS = {
        "1.1", "2.1", "5.1", "6.1", "7.1", "8.1", "9.1",
        "10.1", "11.1", "12.1", "42",
        "22", "26.1", "28.1", "86.1", "88.1",
        "31.1", "31.2", "32.1", "32.2",
        "35.1", "35.2", "36.1", "36.2",
        "37.1", "37.2", "38.1", "38.2",
        "SP"
    };

    // conflicts[signalA] = set of signals that conflict with A
    private final Map<String, Set<String>> conflicts = new HashMap<>();

    public ConflictMatrix() {
        for (String s : ALL_SIGNALS) {
            conflicts.put(s, new HashSet<>());
        }
        // Row by row from the matrix (symmetric, but we add both directions)
        addConflicts("1.1",  "5.1", "9.1", "22", "28.1", "88.1", "31.2", "32.1", "37.1", "38.2");
        addConflicts("2.1",  "5.1", "6.1", "9.1", "10.1", "11.1", "12.1", "22", "26.1", "86.1", "88.1", "31.2", "32.1", "35.1", "36.2");
        addConflicts("5.1",  "1.1", "2.1", "8.1", "9.1", "12.1", "42", "22", "28.1", "88.1", "31.1", "32.2", "35.1", "36.2", "SP");
        addConflicts("6.1",  "2.1", "8.1", "9.1", "10.1", "11.1", "12.1", "42", "26.1", "86.1", "35.1", "36.2", "SP");
        addConflicts("7.1",  "11.1", "26.1", "86.1", "35.2", "36.1", "SP");
        addConflicts("8.1",  "5.1", "6.1", "11.1", "12.1", "22", "26.1", "86.1", "31.1", "32.2", "35.2", "36.1");
        addConflicts("9.1",  "1.1", "2.1", "5.1", "6.1", "11.1", "12.1", "42", "22", "26.1", "86.1", "88.1", "35.2", "36.1", "37.1", "38.2");
        addConflicts("10.1", "2.1", "6.1", "42", "26.1", "28.1", "86.1", "88.1", "35.1", "36.2", "37.2", "38.1");
        addConflicts("11.1", "2.1", "6.1", "7.1", "8.1", "9.1", "42", "22", "28.1", "88.1", "37.2", "38.1", "SP");
        addConflicts("12.1", "2.1", "5.1", "6.1", "8.1", "9.1", "42", "22", "28.1", "88.1", "31.1", "32.2", "37.2", "38.1");
        addConflicts("42",   "5.1", "6.1", "9.1", "10.1", "11.1", "12.1", "22", "26.1", "28.1", "86.1", "88.1", "31.2", "32.1", "35.1", "36.2", "37.1", "38.2");
        addConflicts("22",   "1.1", "2.1", "5.1", "8.1", "9.1", "11.1", "12.1", "42");
        addConflicts("26.1", "2.1", "6.1", "7.1", "8.1", "9.1", "10.1", "42");
        addConflicts("28.1", "1.1", "5.1", "10.1", "11.1", "12.1", "42");
        addConflicts("86.1", "2.1", "6.1", "7.1", "8.1", "9.1", "10.1", "42");
        addConflicts("88.1", "1.1", "2.1", "9.1", "10.1", "11.1", "12.1", "42");
        addConflicts("31.1", "5.1", "8.1", "12.1");
        addConflicts("31.2", "1.1", "2.1", "42");
        addConflicts("32.1", "1.1", "2.1", "42");
        addConflicts("32.2", "5.1", "8.1", "12.1");
        addConflicts("35.1", "2.1", "5.1", "6.1", "10.1", "42");
        addConflicts("35.2", "7.1", "8.1", "9.1");
        addConflicts("36.1", "7.1", "8.1", "9.1");
        addConflicts("36.2", "2.1", "5.1", "6.1", "10.1", "42");
        addConflicts("37.1", "1.1", "9.1", "42");
        addConflicts("37.2", "10.1", "11.1", "12.1");
        addConflicts("38.1", "10.1", "11.1", "12.1");
        addConflicts("38.2", "1.1", "9.1", "42");
        addConflicts("SP",   "5.1", "6.1", "7.1", "11.1");
    }

    private void addConflicts(String signal, String... conflicting) {
        Set<String> set = conflicts.get(signal);
        if (set == null) {
            set = new HashSet<>();
            conflicts.put(signal, set);
        }
        for (String c : conflicting) {
            set.add(c);
            // symmetric
            conflicts.computeIfAbsent(c, k -> new HashSet<>()).add(signal);
        }
    }

    /**
     * Check if two signals conflict.
     */
    public boolean hasConflict(String a, String b) {
        Set<String> set = conflicts.get(a);
        return set != null && set.contains(b);
    }

    /**
     * Given a set of currently green signals, check if adding candidateSignal would cause a conflict.
     */
    public boolean canTurnGreen(String candidateSignal, Set<String> currentlyGreen) {
        for (String green : currentlyGreen) {
            if (hasConflict(candidateSignal, green)) {
                return false;
            }
        }
        return true;
    }

    public String[] getAllSignals() {
        return ALL_SIGNALS.clone();
    }
}
