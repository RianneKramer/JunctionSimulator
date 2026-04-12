/**
 * car entity
 */

export default class Car {
  constructor(id) {
    this.id = id;
    this.triggeredTimestamp = Date.now();
    this.state = 'approaching';
  }

  // --- STATE CHECKS ---
  isApproaching() {
    return this.state === 'approaching';
  }

  isWaiting() {
    return this.state === 'waiting';
  }

  hasPassed() {
    return this.state === 'passed';
  }

  isActive() {
    return !this.hasPassed();
  }

  hasEntity() {
    return this.isApproaching() || this.isWaiting();
  }

  canPass() {
    return this.isApproaching() || this.isWaiting();
  }

  // --- STATE TRANSITIONS ---
  wait() {
    if (this.isApproaching()) {
      this.state = 'waiting';
    }
  }

  pass() {
    if (this.canPass()) {
      this.state = 'passed';
    }
  }

  // --- DATA ACCESS ---
  getTriggeredTimestamp() {
    return this.triggeredTimestamp;
  }

  getState() {
    return {
      id: this.id,
      state: this.state
    };
  }
}