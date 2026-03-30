/**
 * car entity.
*/
export default class Car {
  constructor(id) {
    this.id = id;
    this.triggeredTimestamp = Date.now();

    // States: approaching, waiting, passed
    this.state = 'approaching';
  }

  /** Car is at the light, waiting */
  wait() {
    this.state = 'waiting';
  }

  /** Car passed through */
  pass() {
    this.state = 'passed';
  }

  /** Check if car is still active (not passed) */
  isActive() {
    return this.state !== 'passed';
  }

  /** Check if car has entity presence at light */
  hasEntity() {
    return this.state === 'approaching' || this.state === 'waiting';
  }
}
