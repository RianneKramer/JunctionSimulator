package junction;

import java.util.Set;

public class CarHandler {
    private static final Set<String> CAR_SIGNALS = Set.of(
            "1.1", "2.1", "5.1", "6.1", "7.1",
            "8.1", "9.1", "10.1", "11.1", "12.1"
    );

    private static final long MIN_GREEN_MS = 6_000L;
    private static final long ORANGE_MS = 3_500L;
    private static final long MIN_RED_MS = 5_000L;

    public boolean isCarSignal(String signal) {
        return CAR_SIGNALS.contains(signal);
    }

    public long minGreenMsFor(String signal, long defaultMinGreenMs) {
        return isCarSignal(signal) ? MIN_GREEN_MS : defaultMinGreenMs;
    }

    public long orangeMsFor(String signal, long defaultOrangeMs) {
        return isCarSignal(signal) ? ORANGE_MS : defaultOrangeMs;
    }

    public long minRedMsFor(String signal, long defaultMinRedMs) {
        return isCarSignal(signal) ? MIN_RED_MS : defaultMinRedMs;
    }
}
