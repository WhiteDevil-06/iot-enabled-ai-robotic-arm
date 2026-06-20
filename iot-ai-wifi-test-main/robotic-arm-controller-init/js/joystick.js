import { controlAgent } from './control.js';

export function initJoysticks() {
    const optionsLeft = {
        zone: document.getElementById('joystick-left'),
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: '#3b82f6',
        size: 150
    };

    const optionsRight = {
        zone: document.getElementById('joystick-right'),
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: '#10b981',
        size: 150
    };

    const managerLeft = nipplejs.create(optionsLeft);
    const managerRight = nipplejs.create(optionsRight);

    // Left Joystick
    managerLeft.on('move', (evt, data) => {
        if (data.vector) {
            // NippleJS vector: x right is positive, y up is positive.
            controlAgent.setDisplacement('base', data.vector.x);
            controlAgent.setDisplacement('shoulder', data.vector.y);
            controlAgent.startJoystickLoop();
        }
    });

    managerLeft.on('end', () => {
        controlAgent.setDisplacement('base', 0);
        controlAgent.setDisplacement('shoulder', 0);
        checkStopLoop();
    });

    // Right Joystick
    managerRight.on('move', (evt, data) => {
        if (data.vector) {
            controlAgent.setDisplacement('claw', data.vector.x);
            controlAgent.setDisplacement('elbow', data.vector.y);
            controlAgent.startJoystickLoop();
        }
    });

    managerRight.on('end', () => {
        controlAgent.setDisplacement('claw', 0);
        controlAgent.setDisplacement('elbow', 0);
        checkStopLoop();
    });

    function checkStopLoop() {
        const d = controlAgent.displacements;
        if (d.base === 0 && d.shoulder === 0 && d.elbow === 0 && d.claw === 0) {
            controlAgent.stopJoystickLoop();
        }
    }
}
