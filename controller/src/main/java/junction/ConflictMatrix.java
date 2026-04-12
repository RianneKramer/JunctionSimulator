package junction

public class ConflictMatrix {
    private boolean[][] conflictMatrix = {
            { true, true, false, true, true, true, false, true, true, true, true, false, true, false, true, false, true, false, false, true, true, true, true, true, false, true, true, false, true },
            { true, true, false, false, true, true, false, false, false, false, true, false, false, true, false, false, true, false, false, true, false, true, true, false, true, true, true, true, true },
            { false, false, true, true, true, false, false, true, true, false, false, false, true, false, true, false, false, true, true, false, false, true, true, false, true, true, true, true, false },
            { true, false, true, true, true, false, false, false, false, false, false, true, false, true, false, true, true, true, true, true, false, true, true, false, true, true, true, true, false },
            { true, true, true, true, true, true, true, true, false, true, true, true, false, true, false, true, true, true, true, true, true, false, false, true, true, true, true, true, true },
            { true, true, false, false, true, true, false, false, false, false, true, false, false, true, false, false, true, false, false, true, false, true, true, false, true, true, true, true, true },
            { false, false, false, false, true, false, true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false },
            { true, false, true, false, true, false, false, true, false, false, false, true, false, true, false, true, true, true, true, true, false, true, true, false, true, true, true, true, false },
            { true, false, true, false, false, false, false, false, true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false },
            { true, false, false, false, true, false, false, false, false, true, false, true, false, true, false, true, true, true, true, true, false, true, true, false, true, true, true, true, false },
            { true, true, false, false, true, true, false, false, false, false, true, false, false, true, false, false, true, false, false, true, false, true, true, false, true, true, true, true, true },
            { false, false, false, true, true, false, false, true, false, true, false, true, false, true, false, true, true, true, true, true, false, true, true, false, true, true, true, true, false },
            { true, false, true, false, false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false },
            { false, true, false, true, true, true, false, true, false, true, true, true, false, true, false, true, true, true, true, true, true, false, false, true, true, true, true, true, true },
            { true, false, true, false, false, false, false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, false, false, false, false, false, false, false },
            { false, false, false, true, true, false, false, true, false, true, false, true, false, true, false, true, true, true, true, true, false, true, true, false, true, true, true, true, false },
            { true, true, false, true, true, true, false, true, false, true, true, true, false, true, false, true, true, true, true, true, true, false, false, true, true, true, true, true, true },
            { false, false, true, true, true, false, false, true, false, true, false, true, false, true, false, true, true, true, true, true, false, true, true, false, true, true, true, true, false },
            { false, false, true, true, true, false, false, true, false, true, false, true, false, true, false, true, true, true, true, true, false, true, true, false, true, true, true, true, false },
            { true, true, false, true, true, true, false, true, false, true, true, true, false, true, false, true, true, true, true, true, true, false, false, true, true, true, true, true, true },
            { true, false, false, false, true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, false },
            { true, true, true, true, false, true, false, true, false, true, true, true, false, false, false, true, false, true, true, false, false, true, false, true, true, true, true, true, true },
            { true, true, true, true, false, true, false, true, false, true, true, true, false, false, false, true, false, true, true, false, false, false, true, true, true, true, true, true, true },
            { true, false, false, false, true, false, false, false, false, false, false, false, false, true, false, false, true, false, false, true, false, true, true, true, false, false, false, false, false },
            { false, true, true, true, true, true, false, true, false, true, true, true, false, true, false, true, true, true, true, true, false, true, true, false, true, true, true, true, true },
            { true, true, true, true, true, true, false, true, false, true, true, true, false, true, false, true, true, true, true, true, false, true, true, false, true, true, true, true, true },
            { true, true, true, true, true, true, false, true, false, true, true, true, false, true, false, true, true, true, true, true, false, true, true, false, true, true, true, true, true },
            { false, true, true, true, true, true, false, true, false, true, true, true, false, true, false, true, true, true, true, true, false, true, true, false, true, true, true, true, true },
            { true, true, false, false, true, true, false, false, false, false, true, false, false, true, false, false, true, false, false, true, false, true, true, false, true, true, true, true, true }
    };

    private String[] signals = {
            "1.1","2.1","5.1","6.1","7.1","8.1","9.1","10.1","11.1","12.1","42","22","26.1","28.1","86.1","88.1","31.1","31.2","32.1","32.2","35.1","35.2","36.1","36.2","37.1","37.2","38.1","38.2","SP"
    };
}