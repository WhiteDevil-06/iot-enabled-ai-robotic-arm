import { controlAgent } from './control.js';
import { memoryAgent } from './memory.js';

export function initKeyboardControls() {
    // Keep track of which keys are currently held down
    const activeKeys = new Set();

    document.addEventListener('keydown', (e) => {
        // Ignore if typing in an input field (like the IP address)
        if (e.target.tagName.toLowerCase() === 'input') return;

        // Ignore key controls if Manual Mode toggle is OFF
        const modeToggle = document.getElementById('mode-toggle');
        if (modeToggle && !modeToggle.checked) return;

        const key = e.key.toLowerCase();
        
        // Prevent default browser scrolling for arrow keys
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
            e.preventDefault();
        }

        // Prevent spamming keydown if already held
        if (activeKeys.has(key)) return;
        activeKeys.add(key);

        let mapped = true;

        switch (key) {
            // Left Joystick Equivalent (Base & Shoulder)
            case 'w':
                controlAgent.setDisplacement('shoulder', 1.0); // Up
                break;
            case 's':
                controlAgent.setDisplacement('shoulder', -1.0); // Down
                break;
            case 'a':
                controlAgent.setDisplacement('base', -1.0); // Left
                break;
            case 'd':
                controlAgent.setDisplacement('base', 1.0); // Right
                break;

            // Right Joystick Equivalent (Elbow & Claw)
            case 'arrowup':
                controlAgent.setDisplacement('elbow', 1.0); // Up
                break;
            case 'arrowdown':
                controlAgent.setDisplacement('elbow', -1.0); // Down
                break;
            case 'arrowleft':
                controlAgent.setDisplacement('claw', -1.0); // Open
                break;
            case 'arrowright':
                controlAgent.setDisplacement('claw', 1.0); // Close
                break;

            // Memory System
            case 'q':
                memoryAgent.saveAction();
                break;
            case 't':
                memoryAgent.runActions();
                break;
            case 'r':
                memoryAgent.clearActions();
                break;
                
            default:
                mapped = false;
        }

        // If a movement key was pressed, start the loop
        if (mapped && !['q', 't', 'r'].includes(key)) {
            controlAgent.startJoystickLoop();
        }
    });

    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        activeKeys.delete(key);

        switch (key) {
            case 'w':
            case 's':
                controlAgent.setDisplacement('shoulder', 0);
                break;
            case 'a':
            case 'd':
                controlAgent.setDisplacement('base', 0);
                break;
            case 'arrowup':
            case 'arrowdown':
                controlAgent.setDisplacement('elbow', 0);
                break;
            case 'arrowleft':
            case 'arrowright':
                controlAgent.setDisplacement('claw', 0);
                break;
        }

        // Check if all keys are released to stop the loop
        checkStopLoop();
    });

    function checkStopLoop() {
        const d = controlAgent.displacements;
        if (d.base === 0 && d.shoulder === 0 && d.elbow === 0 && d.claw === 0) {
            controlAgent.stopJoystickLoop();
        }
    }
}
