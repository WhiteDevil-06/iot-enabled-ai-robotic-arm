import { stateManager } from './state.js';

class MemoryAgent {
    constructor() {
        this.savedActions = [];
        this.isPlaying = false;
        this.playbackDelayMs = 800; // 800ms between actions
        this._onUpdate = null; // optional callback: called after save/clear with new count
    }

    /** Register a callback that fires whenever the saved count changes */
    onUpdate(fn) {
        this._onUpdate = fn;
    }

    _notifyUpdate() {
        if (typeof this._onUpdate === 'function') {
            this._onUpdate(this.savedActions.length);
        }
    }

    saveAction() {
        if (this.isPlaying) return;
        const currentState = { ...stateManager.state };
        this.savedActions.push(currentState);
        console.log(`Action saved. Total: ${this.savedActions.length}`, currentState);
        this._notifyUpdate();
    }

    clearActions() {
        if (this.isPlaying) return;
        this.savedActions = [];
        console.log('All saved actions cleared.');
        this._notifyUpdate();
    }

    async runActions() {
        if (this.isPlaying || this.savedActions.length === 0) {
            console.log('Cannot run: already playing or nothing saved.');
            return;
        }

        console.log('Starting action replay...');
        this.isPlaying = true;

        for (let i = 0; i < this.savedActions.length; i++) {
            if (!this.isPlaying) break;

            const targetState = this.savedActions[i];
            console.log(`Replaying ${i + 1}/${this.savedActions.length}`);

            stateManager.update('base',     targetState.base);
            stateManager.update('shoulder', targetState.shoulder);
            stateManager.update('elbow',    targetState.elbow);
            stateManager.update('claw',     targetState.claw);

            await this._sleep(this.playbackDelayMs);
        }

        console.log('Replay finished.');
        this.isPlaying = false;
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const memoryAgent = new MemoryAgent();
