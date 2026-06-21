import { throttle } from './utils.js';

class CommsAgent {
    constructor() {
        this.ip = '192.168.4.1';
        this.isConnected = false;
        this.statusEl = document.getElementById('status-indicator');
        this.statusTextEl = document.getElementById('status-text');
        
        // Throttle sending to ESP32 every 150ms
        this.sendRequest = throttle(this._sendRequest.bind(this), 150);
    }

    setIP(ip) {
        this.ip = ip;
    }

    setStatus(connected) {
        this.isConnected = connected;
        if (connected) {
            this.statusEl.classList.add('connected');
            this.statusTextEl.textContent = 'Connected';
        } else {
            this.statusEl.classList.remove('connected');
            this.statusTextEl.textContent = 'Disconnected';
        }
    }

    async _sendRequest(state) {
        if (!this.ip) return;
        
        const url = `http://${this.ip}/move?base=${state.base}&shoulder=${state.shoulder}&elbow=${state.elbow}&claw=${state.claw}`;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000);
            
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            this.setStatus(response.ok);
        } catch (error) {
            this.setStatus(false);
            console.warn('ESP32 Connection Error:', error);
        }
    }
}

export const commsAgent = new CommsAgent();
