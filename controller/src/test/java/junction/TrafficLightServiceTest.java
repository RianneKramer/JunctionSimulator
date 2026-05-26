package junction;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrafficLightServiceTest {

    @Test
    void busWaitingBecomesStraightAndRightStateWhenEligible() {
        TrafficLightService service = configuredService();

        Map<String, Integer> states = service.processUpdate(
                List.of(update("42", true, 100L)),
                1500L
        );

        assertEquals(4, states.get("42"));
    }

    @Test
    void busSortsAheadOfConflictingCarWhenBothAreEligible() {
        TrafficLightService service = configuredService();

        Map<String, Integer> states = service.processUpdate(
                List.of(
                        update("1.1", true, 100L),
                        update("42", true, 200L)
                ),
                1500L
        );

        assertEquals(4, states.get("42"));
        assertEquals(0, states.get("1.1"));
    }

    @Test
    void busStateTransitionsToOrangeThenRedWhenRequestClears() {
        TrafficLightService service = configuredService();

        service.processUpdate(List.of(update("42", true, 100L)), 1500L);
        Map<String, Integer> orangeStates = service.processUpdate(
                List.of(update("42", false, 100L)),
                2600L
        );
        Map<String, Integer> redStates = service.processUpdate(
                List.of(update("42", false, 100L)),
                3700L
        );

        assertEquals(1, orangeStates.get("42"));
        assertEquals(0, redStates.get("42"));
    }

    @Test
    void busGoStateReachesMaxGreenEvenWhenRequestRemains() {
        TrafficLightService service = configuredService();

        service.processUpdate(List.of(update("42", true, 100L)), 1500L);
        Map<String, Integer> states = service.processUpdate(
                List.of(update("42", true, 100L)),
                7600L
        );

        assertEquals(1, states.get("42"));
    }

    @Test
    void busGoStatesAreSignalAware() {
        TrafficLightService service = configuredService();

        assertTrue(service.isGoState("42", 2));
        assertTrue(service.isGoState("42", 3));
        assertTrue(service.isGoState("42", 4));
        assertFalse(service.isGoState("42", 1));
        assertTrue(service.isGoState("1.1", 2));
        assertFalse(service.isGoState("1.1", 3));
    }

    private static TrafficLightService configuredService() {
        TrafficLightService service = new TrafficLightService();
        service.setTimingConfig(
                1000L,
                1000L,
                1000L,
                1000L,
                5000L,
                1000L,
                1000L,
                10000L
        );
        return service;
    }

    private static TrafficLightService.LightUpdate update(String id, boolean hasEntity, long timestamp) {
        return new TrafficLightService.LightUpdate(id, hasEntity, timestamp);
    }
}
