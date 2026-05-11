import { stateManager } from './state.js';

class MemoryAgent {
    constructor() {
        this.savedActions = [];
        this.isPlaying = false;
        this.playbackDelayMs = 800; // 800ms between actions
    }

    saveAction() {
        if (this.isPlaying) return;
        // Deep copy current state to avoid reference mutation
        const currentState = { ...stateManager.state };
        this.savedActions.push(currentState);
        console.log(`Action saved. Total actions: ${this.savedActions.length}`, currentState);
    }

    clearActions() {
        if (this.isPlaying) return;
        this.savedActions = [];
        console.log("All saved actions cleared.");
    }

    async runActions() {
        if (this.isPlaying || this.savedActions.length === 0) {
            console.log("Cannot run actions: Already playing or no actions saved.");
            return;
        }

        console.log("Starting action replay...");
        this.isPlaying = true;

        for (let i = 0; i < this.savedActions.length; i++) {
            if (!this.isPlaying) break; // Allow interruption if needed later

            const targetState = this.savedActions[i];
            console.log(`Replaying action ${i + 1}/${this.savedActions.length}`);
            
            // Update the state manager directly with the saved values
            // This will automatically trigger UI slider updates and ESP32 HTTP requests
            stateManager.update('base', targetState.base);
            stateManager.update('shoulder', targetState.shoulder);
            stateManager.update('elbow', targetState.elbow);
            stateManager.update('claw', targetState.claw);

            // Wait before moving to the next action
            await this._sleep(this.playbackDelayMs);
        }

        console.log("Action replay finished.");
        this.isPlaying = false;
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const memoryAgent = new MemoryAgent();
