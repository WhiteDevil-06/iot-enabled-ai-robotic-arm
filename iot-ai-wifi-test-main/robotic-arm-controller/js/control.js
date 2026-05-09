import { stateManager } from './state.js';

class ControlAgent {
    constructor() {
        this.joystickInterval = null;
        this.displacements = {
            base: 0,
            shoulder: 0,
            elbow: 0,
            claw: 0
        };
        // Angle points added per 50ms at full joystick tilt
        this.speedFactor = 2.5; 
    }

    setDisplacement(axis, value) {
        this.displacements[axis] = value;
    }

    startJoystickLoop() {
        if (this.joystickInterval) return;
        this.joystickInterval = setInterval(() => {
            let changed = false;
            for (const [axis, displacement] of Object.entries(this.displacements)) {
                if (displacement !== 0) {
                    const currentVal = stateManager.state[axis];
                    const delta = displacement * this.speedFactor;
                    changed = stateManager.update(axis, currentVal + delta) || changed;
                }
            }
        }, 50);
    }

    stopJoystickLoop() {
        if (this.joystickInterval) {
            clearInterval(this.joystickInterval);
            this.joystickInterval = null;
        }
        this.displacements = { base: 0, shoulder: 0, elbow: 0, claw: 0 };
    }
}

export const controlAgent = new ControlAgent();
