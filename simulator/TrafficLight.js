/**
 * Independent Traffic Lights for Simulator
 */

export default class TrafficLight {
    constructor(lightId) {
        this.lightId = lightId;
        this.cars = [];
        this.lightState = 0; // 0=red, 1=orange, 2=green
    }

    /** Get current simulation state */
    getState() {
        return {
            lightId: this.lightId,
            lightState: this.lightState,
            cars: this.cars.map(c => ({ id: c.id, state: c.state }))
        };
    }

    addCar(car) {
        this.cars.push(car);
    }

    getActiveCars() {
        return this.cars.filter(c => c.isActive());
    }

    hasEntity() {
        return this.getActiveCars().some(c => c.hasEntity());
    }

    getTriggeredTimestamp() {
        return Date.now()
    }

    buildPayload() {
        return {
            id: this.lightId,
            hasEntity: this.hasEntity(),
            triggeredTimestamp: this.getTriggeredTimestamp()
        };
    }

    updateState(newState) {
        this.lightState = newState;

        const activeCars = this.getActiveCars();

        if (newState === 2) {
            // GREEN
            for (const car of activeCars) {
                if (car.state === 'waiting' || car.state === 'approaching') {
                    car.pass();
                    console.log(`[Simulator] Car ${car.id} passed at ${this.lightId}`);
                }
            }
        } else {
            // RED / ORANGE
            for (const car of activeCars) {
                if (car.state === 'approaching') {
                    car.wait();
                    console.log(`[Simulator] Car ${car.id} waiting at ${this.lightId}`);
                }
            }
        }

        // cleanup
        this.cars = this.cars.filter(c => c.isActive());
    }
}