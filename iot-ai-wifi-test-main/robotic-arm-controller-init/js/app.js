import { stateManager } from './state.js';
import { commsAgent } from './comms.js';
import { initJoysticks } from './joystick.js';
import { initKeyboardControls } from './keyboard.js';
import { memoryAgent } from './memory.js';

document.addEventListener('DOMContentLoaded', () => {
    initJoysticks();
    initKeyboardControls();

    const els = {
        // Sliders
        baseSlider:     document.getElementById('slider-base'),
        shoulderSlider: document.getElementById('slider-shoulder'),
        elbowSlider:    document.getElementById('slider-elbow'),
        clawSlider:     document.getElementById('slider-claw'),

        // Value displays
        baseVal:     document.getElementById('base-val'),
        shoulderVal: document.getElementById('shoulder-val'),
        elbowVal:    document.getElementById('elbow-val'),
        clawVal:     document.getElementById('claw-val'),

        // Connection
        ipInput: document.getElementById('esp-ip'),

        // Footer controls
        resetBtn:      document.getElementById('btn-reset'),
        modeToggle:    document.getElementById('mode-toggle'),

        // Memory controls
        btnSave:    document.getElementById('btn-save-action'),
        btnPlay:    document.getElementById('btn-run-actions'),
        btnClear:   document.getElementById('btn-clear-actions'),
        memCount:   document.getElementById('memory-count'),
        conveyorSpeedVal: document.getElementById('conveyor-speed-val'),
        conveyorSpeedInput: document.getElementById('input-conveyor-speed'),
    };

    // ─── Toast Notification Helper ───────────────────────────────────────────
    function showToast(message, type) {
        if (!type) type = 'info';
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast ' + type;

        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'warning') icon = '⚠️';

        // Safe DOM creation using textContent to prevent XSS (CWE-79)
        const spanIcon = document.createElement('span');
        spanIcon.textContent = icon;

        const spanText = document.createElement('span');
        spanText.textContent = message;

        toast.appendChild(spanIcon);
        toast.appendChild(spanText);
        container.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);

        // Animate out and remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // ─── Memory count badge ──────────────────────────────────────────────────
    function updateMemoryCount(count) {
        if (els.memCount) {
            els.memCount.textContent = count + ' saved';
        }
    }

    memoryAgent.onUpdate(updateMemoryCount);

    // Memory button click handlers
    if (els.btnSave) els.btnSave.addEventListener('click', () => memoryAgent.saveAction());
    if (els.btnPlay) els.btnPlay.addEventListener('click', () => memoryAgent.runActions());
    if (els.btnClear) els.btnClear.addEventListener('click', () => memoryAgent.clearActions());

    // ─── Manual Mode Toggle ──────────────────────────────────────────────────
    let lastModeState = null;

    async function updateManualModeState(isProgrammatic) {
        if (isProgrammatic === undefined) isProgrammatic = false;
        if (!els.modeToggle) return;
        
        const isManual = els.modeToggle.checked;
        const label = document.getElementById('mode-label');
        if (label) {
            label.textContent = isManual ? "Website Control" : "Physical Joysticks";
        }

        // Joystick zones + manual slider groups
        const controlContainers = [
            document.getElementById('joystick-left'),
            document.getElementById('joystick-right'),
            document.querySelector('.left-panel .manual-controls'),
            document.querySelector('.right-panel .manual-controls'),
        ];

        controlContainers.forEach(el => {
            if (!el) return;
            el.classList.toggle('disabled-controls', !isManual);
        });

        // Disable sliders so they don't receive focus/interaction
        [els.baseSlider, els.shoulderSlider, els.elbowSlider, els.clawSlider].forEach(s => {
            if (s) s.disabled = !isManual;
        });

        // Reset + memory buttons follow the same gate
        [els.resetBtn, els.btnSave, els.btnPlay, els.btnClear].forEach(btn => {
            if (!btn) return;
            btn.disabled = !isManual;
            btn.classList.toggle('disabled-controls', !isManual);
        });

        // Handoff to ESP32: Notify the server of the mode change (only on user interaction)
        if (!isProgrammatic && commsAgent.ip) {
            const modeParam = isManual ? 'web' : 'physical';
            try {
                const response = await fetch('http://' + commsAgent.ip + '/setMode?mode=' + modeParam);
                if (response.ok) {
                    commsAgent.setStatus(true);
                } else {
                    commsAgent.setStatus(false);
                }
            } catch (err) {
                commsAgent.setStatus(false);
                console.warn('Error setting control mode on ESP32:', err);
            }
        }

        // Show visual feedback toast (only on user interaction)
        if (!isProgrammatic && lastModeState !== null && lastModeState !== isManual) {
            if (isManual) {
                showToast("Website Control Mode Activated", "success");
            } else {
                showToast("Physical Joystick Mode Activated", "info");
            }
        }
        lastModeState = isManual;
    }

    if (els.modeToggle) {
        els.modeToggle.addEventListener('change', () => updateManualModeState(false));
        lastModeState = els.modeToggle.checked;
    }
    updateManualModeState(true); // Apply initial layout programmatically on page load

    // ─── State subscriber ───────────────────────────────────────────────────
    stateManager.subscribe((state) => {
        if (els.baseSlider)     els.baseSlider.value     = state.base;
        if (els.shoulderSlider) els.shoulderSlider.value = state.shoulder;
        if (els.elbowSlider)    els.elbowSlider.value    = state.elbow;
        if (els.clawSlider)     els.clawSlider.value     = state.claw;

        if (els.baseVal)     els.baseVal.textContent     = state.base     + '°';
        if (els.shoulderVal) els.shoulderVal.textContent = state.shoulder + '°';
        if (els.elbowVal)    els.elbowVal.textContent    = state.elbow    + '°';
        if (els.clawVal)     els.clawVal.textContent     = state.claw     + '°';

        // Only send /move requests to ESP32 if Website Mode is active
        if (els.modeToggle && els.modeToggle.checked) {
            commsAgent.sendRequest(state);
        }
    });

    // Slider → state
    ['base', 'shoulder', 'elbow', 'claw'].forEach(axis => {
        // Use static property mappings to prevent index-signature compilation/lint errors
        let slider = null;
        if (axis === 'base') slider = els.baseSlider;
        else if (axis === 'shoulder') slider = els.shoulderSlider;
        else if (axis === 'elbow') slider = els.elbowSlider;
        else if (axis === 'claw') slider = els.clawSlider;

        if (slider) {
            slider.addEventListener('input', (e) => {
                stateManager.update(axis, parseInt(e.target.value));
            });
        }
    });

    // IP input
    if (els.ipInput) {
        els.ipInput.addEventListener('change', (e) => {
            commsAgent.setIP(e.target.value.trim());
        });
        commsAgent.setIP(els.ipInput.value.trim());
    }

    // Reset button
    if (els.resetBtn) {
        els.resetBtn.addEventListener('click', () => {
            stateManager.reset();
            showToast("Robotic Arm Reset to Center Position", "warning");
        });
    }

    // ─── Tab Switching Logic ────────────────────────────────────────────────
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            // Remove active classes
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to selected tab button and content
            btn.classList.add('active');
            const targetEl = document.getElementById(targetTab);
            if (targetEl) {
                targetEl.classList.add('active');
            }
        });
    });

    // ─── Conveyor Control Logic ─────────────────────────────────────────────
    function updateConveyorUIState(conveyorState) {
        const surface = document.getElementById('conveyor-surface');
        const light = document.getElementById('conveyor-status-light');
        if (!surface || !light) return;

        surface.classList.remove('moving-forward', 'moving-reverse');
        light.classList.remove('stopped', 'forward', 'reverse');

        if (conveyorState === 'started') {
            surface.classList.add('moving-forward');
            light.textContent = 'Running';
            light.classList.add('forward');
        } else if (conveyorState === 'reversed') {
            surface.classList.add('moving-reverse');
            light.textContent = 'Reversing';
            light.classList.add('reverse');
        } else {
            light.textContent = 'Stopped';
            light.classList.add('stopped');
        }
    }

    async function sendConveyorAction(action) {
        if (!commsAgent.ip) {
            showToast("Please enter an ESP32 IP first", "warning");
            return;
        }

        const url = `http://${commsAgent.ip}/conveyor/${action}`;
        try {
            const response = await fetch(url);
            if (response.ok) {
                showToast(`Conveyor: ${action.toUpperCase()}`, "success");
                updateConveyorUIState(action === 'start' ? 'started' : (action === 'reverse' ? 'reversed' : 'stopped'));
            } else {
                showToast(`Failed to execute conveyor action: ${action}`, "warning");
            }
        } catch (err) {
            showToast("Error connecting to ESP32", "warning");
            console.error("Conveyor action error:", err);
        }
    }

    async function setConveyorSpeed(value) {
        if (!commsAgent.ip) {
            showToast("Please enter an ESP32 IP first", "warning");
            return;
        }

        const speed = parseInt(value, 10);
        if (isNaN(speed) || speed < 0 || speed > 255) {
            showToast("Speed must be between 0 and 255", "warning");
            return;
        }

        try {
            const response = await fetch(`http://${commsAgent.ip}/conveyor/speed?value=${speed}`);
            if (response.ok) {
                const text = await response.text();
                if (els.conveyorSpeedVal) els.conveyorSpeedVal.textContent = text;
                if (els.conveyorSpeedInput) els.conveyorSpeedInput.value = text;
                showToast(`Conveyor speed set to ${text}`, "success");
            } else {
                showToast("Failed to set conveyor speed", "warning");
            }
        } catch (err) {
            showToast("Error connecting to ESP32", "warning");
            console.error("Conveyor speed error:", err);
        }
    }

    const startBtn = document.getElementById('btn-conveyor-start');
    const stopBtn = document.getElementById('btn-conveyor-stop');
    const reverseBtn = document.getElementById('btn-conveyor-reverse');
    const speedSetBtn = document.getElementById('btn-conveyor-speed-set');

    if (startBtn) startBtn.addEventListener('click', () => sendConveyorAction('start'));
    if (stopBtn) stopBtn.addEventListener('click', () => sendConveyorAction('stop'));
    if (reverseBtn) reverseBtn.addEventListener('click', () => sendConveyorAction('reverse'));

    if (speedSetBtn && els.conveyorSpeedInput) {
        speedSetBtn.addEventListener('click', () => setConveyorSpeed(els.conveyorSpeedInput.value));
        els.conveyorSpeedInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                setConveyorSpeed(els.conveyorSpeedInput.value);
            }
        });
    }

    // ─── ESP32 Status and State Synchronization Polling ─────────────────────
    let statusInterval = null;

    function startStatusPolling() {
        if (statusInterval) return;
        statusInterval = setInterval(async () => {
            if (!commsAgent.ip) return;

            try {
                const response = await fetch('http://' + commsAgent.ip + '/status');
                if (response.ok) {
                    const data = await response.json();
                    commsAgent.setStatus(true);

                    // Sync local website mode checkbox if ESP32 tells us it's out of sync
                    const espWebMode = (data.mode === "web");
                    if (els.modeToggle && els.modeToggle.checked !== espWebMode) {
                        els.modeToggle.checked = espWebMode;
                        updateManualModeState(true); // Programmatic sync
                    }

                    // Sync conveyor speed if returned in status payload
                    if (data.speed !== undefined) {
                        if (els.conveyorSpeedVal) els.conveyorSpeedVal.textContent = data.speed;
                        if (els.conveyorSpeedInput && document.activeElement !== els.conveyorSpeedInput) {
                            els.conveyorSpeedInput.value = data.speed;
                        }
                    }

                    // If Physical Joystick Mode is active, sync angles from the hardware
                    if (!espWebMode) {
                        stateManager.state.base = data.base;
                        stateManager.state.shoulder = data.shoulder;
                        stateManager.state.elbow = data.elbow;
                        stateManager.state.claw = data.claw;

                        if (els.baseSlider)     els.baseSlider.value     = data.base;
                        if (els.shoulderSlider) els.shoulderSlider.value = data.shoulder;
                        if (els.elbowSlider)    els.elbowSlider.value    = data.elbow;
                        if (els.clawSlider)     els.clawSlider.value     = data.claw;

                        if (els.baseVal)     els.baseVal.textContent     = data.base     + '°';
                        if (els.shoulderVal) els.shoulderVal.textContent = data.shoulder + '°';
                        if (els.elbowVal)    els.elbowVal.textContent    = data.elbow    + '°';
                        if (els.clawVal)     els.clawVal.textContent     = data.claw     + '°';
                    }
                } else {
                    commsAgent.setStatus(false);
                }
            } catch (error) {
                commsAgent.setStatus(false);
                console.warn('Status poll failed:', error);
            }
        }, 1000);
    }

    startStatusPolling();
    stateManager.notify(); // Initial render
});
