import { stateManager } from './state.js';
import { commsAgent } from './comms.js';
import { initJoysticks } from './joystick.js';

document.addEventListener('DOMContentLoaded', () => {
    initJoysticks();

    const els = {
        baseSlider: document.getElementById('slider-base'),
        shoulderSlider: document.getElementById('slider-shoulder'),
        elbowSlider: document.getElementById('slider-elbow'),
        clawSlider: document.getElementById('slider-claw'),
        baseVal: document.getElementById('base-val'),
        shoulderVal: document.getElementById('shoulder-val'),
        elbowVal: document.getElementById('elbow-val'),
        clawVal: document.getElementById('claw-val'),
        ipInput: document.getElementById('esp-ip'),
        resetBtn: document.getElementById('btn-reset')
    };

    stateManager.subscribe((state) => {
        els.baseSlider.value = state.base;
        els.shoulderSlider.value = state.shoulder;
        els.elbowSlider.value = state.elbow;
        els.clawSlider.value = state.claw;

        els.baseVal.textContent = state.base + '°';
        els.shoulderVal.textContent = state.shoulder + '°';
        els.elbowVal.textContent = state.elbow + '°';
        els.clawVal.textContent = state.claw + '°';

        commsAgent.sendRequest(state);
    });

    ['base', 'shoulder', 'elbow', 'claw'].forEach(axis => {
        els[`${axis}Slider`].addEventListener('input', (e) => {
            stateManager.update(axis, parseInt(e.target.value));
        });
    });

    els.ipInput.addEventListener('change', (e) => {
        commsAgent.setIP(e.target.value.trim());
    });
    commsAgent.setIP(els.ipInput.value.trim());

    els.resetBtn.addEventListener('click', () => {
        stateManager.reset();
    });

    stateManager.notify();
});
