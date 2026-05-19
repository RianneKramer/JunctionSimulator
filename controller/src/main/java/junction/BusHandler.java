package junction;

public class BusHandler {
    public static final String SIGNAL_ID = "42";

    private static final long MIN_GREEN_MS = 4_000L;
    private static final long ORANGE_MS = 3_500L;
    private static final long MIN_RED_MS = 5_000L;

    public boolean isBusSignal(String signal) {
        return SIGNAL_ID.equals(signal);
    }

    public int greenStateFor(String signal) {
        return isBusSignal(signal) ? 4 : 2;
    }

    public boolean isGreen(String signal, int state) {
        return isBusSignal(signal) ? state == 4 : state == 2;
    }

    public long minGreenMsFor(String signal, long defaultMinGreenMs) {
        return isBusSignal(signal) ? MIN_GREEN_MS : defaultMinGreenMs;
    }

    public long orangeMsFor(String signal, long defaultOrangeMs) {
        return isBusSignal(signal) ? ORANGE_MS : defaultOrangeMs;
    }

    public long minRedMsFor(String signal, long defaultMinRedMs) {
        return isBusSignal(signal) ? MIN_RED_MS : defaultMinRedMs;
    }
}
