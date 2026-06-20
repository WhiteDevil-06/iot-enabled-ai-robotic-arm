class StateManager {
    constructor() {
        this.state = {
            base: 90,
            shoulder: 90,
            elbow: 90,
            claw: 90
        };
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    update(key, value) {
        value = Math.max(0, Math.min(180, Math.round(value))); // constrain 0-180
        if (this.state[key] !== value) {
            this.state[key] = value;
            this.notify();
            return true;
        }
        return false;
    }

    reset() {
        this.state = { base: 90, shoulder: 90, elbow: 90, claw: 90 };
        this.notify();
    }
}

export const stateManager = new StateManager();
