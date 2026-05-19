package junction;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Handles the train crossing timeline.
 *
 * Only the sb signal is returned to the simulator. The ts.l and ts.r train
 * signals are terminal-only diagnostics.
 */
public class TrainHandler {
    private static final String LEFT_TRAIN_SIGNAL = "ts.l";
    private static final String RIGHT_TRAIN_SIGNAL = "ts.r";

    private static final long SB_ORANGE_BEFORE_ARRIVAL_MS = 20_000L;
    private static final long SB_RED_BEFORE_ARRIVAL_MS = 15_000L;
    private static final long SB_ORANGE_AFTER_PASS_MS = 10_000L;
    private static final long TRAFFIC_RELEASE_AFTER_PASS_MS = 20_000L;

    private final AtomicLong trainPassTimestamp = new AtomicLong(0L);

    private int leftTrainSignalState = 0;
    private int rightTrainSignalState = 0;

    public void registerTrainArrival(long trainArrivalTimestamp) {
        long previousTimestamp = trainPassTimestamp.getAndSet(trainArrivalTimestamp);
        if (previousTimestamp == trainArrivalTimestamp) {
            return;
        }

        leftTrainSignalState = 0;
        rightTrainSignalState = 0;

        long orangeAt = trainArrivalTimestamp - SB_ORANGE_BEFORE_ARRIVAL_MS;
        long redAt = trainArrivalTimestamp - SB_RED_BEFORE_ARRIVAL_MS;
        long orangeAfterPassAt = trainArrivalTimestamp + SB_ORANGE_AFTER_PASS_MS;
        long releaseAt = trainArrivalTimestamp + TRAFFIC_RELEASE_AFTER_PASS_MS;

        System.out.println("[TrainHandler] Registered train handling: sb ORANGE at "
                + TimeFormat.clockTime(orangeAt) + ", RED at " + TimeFormat.clockTime(redAt)
                + ", ORANGE after pass at " + TimeFormat.clockTime(orangeAfterPassAt)
                + ", GREEN at " + TimeFormat.clockTime(releaseAt)
                + ", traffic release at " + TimeFormat.clockTime(releaseAt));
    }

    public void clearTrainWindow() {
        trainPassTimestamp.set(0L);
        setTerminalTrainSignals(0);
    }

    public int sbStateAt(long currentTimestamp) {
        long passTimestamp = trainPassTimestamp.get();
        if (passTimestamp == 0L) return 2;

        if (currentTimestamp < passTimestamp - SB_ORANGE_BEFORE_ARRIVAL_MS) return 2;
        if (currentTimestamp < passTimestamp - SB_RED_BEFORE_ARRIVAL_MS) return 1;
        if (currentTimestamp < passTimestamp + SB_ORANGE_AFTER_PASS_MS) return 0;
        if (currentTimestamp < passTimestamp + TRAFFIC_RELEASE_AFTER_PASS_MS) return 1;
        return 2;
    }

    public boolean isTrafficBlocked(long currentTimestamp) {
        long passTimestamp = trainPassTimestamp.get();
        if (passTimestamp == 0L) return false;
        return currentTimestamp >= passTimestamp - SB_ORANGE_BEFORE_ARRIVAL_MS
                && currentTimestamp < passTimestamp + TRAFFIC_RELEASE_AFTER_PASS_MS;
    }

    public void updateTerminalTrainSignals(long currentTimestamp) {
        int trainSignalState = sbStateAt(currentTimestamp) == 0 ? 2 : 0;
        setTerminalTrainSignals(trainSignalState);
    }

    private void setTerminalTrainSignals(int state) {
        if (leftTrainSignalState != state) {
            leftTrainSignalState = state;
            System.out.println("[TrainHandler] " + LEFT_TRAIN_SIGNAL + " -> " + stateName(state));
        }
        if (rightTrainSignalState != state) {
            rightTrainSignalState = state;
            System.out.println("[TrainHandler] " + RIGHT_TRAIN_SIGNAL + " -> " + stateName(state));
        }
    }

    private String stateName(int state) {
        return switch (state) {
            case 0 -> "RED";
            case 1 -> "ORANGE";
            case 2 -> "GREEN";
            default -> "?";
        };
    }
}
