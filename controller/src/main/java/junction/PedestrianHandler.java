package junction;

import java.util.Set;

public class PedestrianHandler {
    private static final Set<String> PEDESTRIAN_SIGNALS = Set.of(
            "31.1", "31.2", "32.1", "32.2",
            "35.1", "35.2", "36.1", "36.2",
            "37.1", "37.2", "38.1", "38.2"
    );

    private static final long MIN_GREEN_MS = 4_000L;
    private static final long ORANGE_MS = 3_500L;
    private static final long MIN_RED_MS = 10_000L;
    private static final long TRIGGER_DELAY_MS = 2_000L;

    public boolean isPedestrianSignal(String signal) {
        return PEDESTRIAN_SIGNALS.contains(signal);
    }

    public long minGreenMsFor(String signal, long defaultMinGreenMs) {
        return isPedestrianSignal(signal) ? MIN_GREEN_MS : defaultMinGreenMs;
    }

    public long maxGreenMsFor(String signal, long defaultMaxGreenMs) {
        return defaultMaxGreenMs;
    }

    public long orangeMsFor(String signal, long defaultOrangeMs) {
        return isPedestrianSignal(signal) ? ORANGE_MS : defaultOrangeMs;
    }

    public long minRedMsFor(String signal, long defaultMinRedMs) {
        return isPedestrianSignal(signal) ? MIN_RED_MS : defaultMinRedMs;
    }

    public boolean canRequestGreen(String signal, long waitTime) {
        return !isPedestrianSignal(signal) || waitTime >= TRIGGER_DELAY_MS;
    }

    public boolean isWaitingForTriggerDelay(String signal, long waitTime) {
        return isPedestrianSignal(signal) && waitTime >= 0L && waitTime < TRIGGER_DELAY_MS;
    }
}
