package junction;

import java.util.Set;

public class BicycleHandler {
    private static final Set<String> BICYCLE_SIGNALS = Set.of("22", "26.1", "28.1", "86.1", "88.1");

    private static final long MIN_GREEN_MS = 5_000L;
    private static final long ORANGE_MS = 3_500L;
    private static final long MIN_RED_MS = 10_000L;
    private static final long TRIGGER_DELAY_MS = 2_000L;

    public boolean isBicycleSignal(String signal) {
        return BICYCLE_SIGNALS.contains(signal);
    }

    public long minGreenMsFor(String signal, long defaultMinGreenMs) {
        return isBicycleSignal(signal) ? MIN_GREEN_MS : defaultMinGreenMs;
    }

    public long maxGreenMsFor(String signal, long defaultMaxGreenMs) {
        return defaultMaxGreenMs;
    }

    public long orangeMsFor(String signal, long defaultOrangeMs) {
        return isBicycleSignal(signal) ? ORANGE_MS : defaultOrangeMs;
    }

    public long minRedMsFor(String signal, long defaultMinRedMs) {
        return isBicycleSignal(signal) ? MIN_RED_MS : defaultMinRedMs;
    }

    public boolean canRequestGreen(String signal, long waitTime) {
        return !isBicycleSignal(signal) || waitTime >= TRIGGER_DELAY_MS;
    }

    public boolean isWaitingForTriggerDelay(String signal, long waitTime) {
        return isBicycleSignal(signal) && waitTime >= 0L && waitTime < TRIGGER_DELAY_MS;
    }
}
