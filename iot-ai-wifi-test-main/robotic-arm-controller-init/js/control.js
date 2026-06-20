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
        const val = Math.abs(value) < 0.05 ? 0 : value;
        
        // Use static checks to prevent index-signature compilation errors or type warnings
        if (axis === 'base') {
            this.displacements.base = val;
        } else if (axis === 'shoulder') {
            this.displacements.shoulder = val;
        } else if (axis === 'elbow') {
            this.displacements.elbow = val;
        } else if (axis === 'claw') {
            this.displacements.claw = val;
        }
    }

    startJoystickLoop() {
        if (this.joystickInterval) return;
        this.joystickInterval = setInterval(() => {
            let changed = false;
            
            // Loop through each axis using safe static properties and callback params (no brackets)
            const axes = ['base', 'shoulder', 'elbow', 'claw'];
            axes.forEach(axis => {
                let displacement = 0;
                
                if (axis === 'base') displacement = this.displacements.base;
                else if (axis === 'shoulder') displacement = this.displacements.shoulder;
                else if (axis === 'elbow') displacement = this.displacements.elbow;
                else if (axis === 'claw') displacement = this.displacements.claw;
                
                if (displacement !== 0) {
                    let currentVal = 90;
                    if (axis === 'base') currentVal = stateManager.state.base;
                    else if (axis === 'shoulder') currentVal = stateManager.state.shoulder;
                    else if (axis === 'elbow') currentVal = stateManager.state.elbow;
                    else if (axis === 'claw') currentVal = stateManager.state.claw;
                    
                    let delta = displacement * this.speedFactor;
                    if (axis === 'base' || axis === 'shoulder') {
                        delta = -delta;
                    }
                    
                    const newVal = Math.max(0, Math.min(180, Math.round(currentVal + delta)));
                    
                    let axisChanged = false;
                    if (axis === 'base' && stateManager.state.base !== newVal) {
                        stateManager.state.base = newVal;
                        axisChanged = true;
                    } else if (axis === 'shoulder' && stateManager.state.shoulder !== newVal) {
                        stateManager.state.shoulder = newVal;
                        axisChanged = true;
                    } else if (axis === 'elbow' && stateManager.state.elbow !== newVal) {
                        stateManager.state.elbow = newVal;
                        axisChanged = true;
                    } else if (axis === 'claw' && stateManager.state.claw !== newVal) {
                        stateManager.state.claw = newVal;
                        axisChanged = true;
                    }
                    
                    if (axisChanged) {
                        changed = true;
                    }
                }
            });
            
            // Trigger a single notification if any state parameter changed during this tick
            if (changed) {
                stateManager.notify();
            }
        }, 50);
    }

    stopJoystickLoop() {
        if (this.joystickInterval) {
            clearInterval(this.joystickInterval);
            this.joystickInterval = null;
        }
        this.displacements.base = 0;
        this.displacements.shoulder = 0;
        this.displacements.elbow = 0;
        this.displacements.claw = 0;
    }
}

export const controlAgent = new ControlAgent();
