import { stateManager } from './state.js';
import { commsAgent } from './comms.js';
import { initJoysticks } from './joystick.js';
import { initKeyboardControls } from './keyboard.js';

document.addEventListener('DOMContentLoaded', () => {
    initJoysticks();
    initKeyboardControls();

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
        resetBtn: document.getElementById('btn-reset'),
        
        // Navigation Elements
        navItems: document.querySelectorAll('.nav-item'),
        viewSections: document.querySelectorAll('.view-section'),
        currentViewTitle: document.getElementById('current-view-title'),
        btnStartDemo: document.getElementById('btn-start-demo')
    };

    // --- Navigation Logic ---
    function switchView(targetId, title) {
        els.navItems.forEach(item => item.classList.remove('active'));
        els.viewSections.forEach(section => section.classList.remove('active'));
        
        const targetNav = Array.from(els.navItems).find(item => item.dataset.target === targetId);
        if(targetNav) targetNav.classList.add('active');
        
        document.getElementById(targetId).classList.add('active');
        els.currentViewTitle.textContent = title;
    }

    els.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;
            const title = e.currentTarget.textContent.trim();
            switchView(target, title + ' Overview');
        });
    });

    els.btnStartDemo.addEventListener('click', () => {
        switchView('view-dashboard', 'Dashboard Overview');
    });

    // --- Hardware Logic ---
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

    // --- Mock Chart for History ---
    const ctx = document.getElementById('historyChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Accept', 'Reject'],
            datasets: [{
                data: [12, 5], // Mock data
                backgroundColor: ['#537A5A', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#CFDBD5' } }
            }
        }
    });
});
