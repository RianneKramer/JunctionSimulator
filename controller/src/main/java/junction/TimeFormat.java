package junction;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

final class TimeFormat {
    private static final DateTimeFormatter CLOCK_TIME =
            DateTimeFormatter.ofPattern("HH:mm:ss").withZone(ZoneId.systemDefault());

    private TimeFormat() {
    }

    static String clockTime(long epochMillis) {
        return CLOCK_TIME.format(Instant.ofEpochMilli(epochMillis));
    }

    static String duration(long millis) {
        long totalSeconds = Math.max(0L, millis) / 1000L;
        long hours = totalSeconds / 3600L;
        long minutes = (totalSeconds % 3600L) / 60L;
        long seconds = totalSeconds % 60L;
        return String.format("%02d:%02d:%02d", hours, minutes, seconds);
    }
}
