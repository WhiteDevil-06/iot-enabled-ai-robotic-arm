# Robotic Arm Controller - Progress & TODO

## Recently Implemented
1. **Virtual Joysticks**: Browser-based NippleJS joysticks mapped to Base/Shoulder and Elbow/Claw.
2. **Keyboard Control Module**: Direct keyboard mapping (W/S, A/D, Arrows) to smoothly control the arm. Taps perfectly into the joystick displacement loop to guarantee safe 50ms throttling.
3. **Action Memory System**: 
   - `Q`: Save current servo coordinates.
   - `T`: Sequentially run saved actions with an 800ms delay between steps.
   - `R`: Reset memory buffer.
4. **UI Dashboard**: Sleek dark-mode glassmorphism styling with a live status indicator and a new keyboard shortcut helper panel.

## What is to be done NEXT
1. **ESP32 Firmware Finalization**: Ensure the ESP32 `GET /move` endpoint logic is rock solid and handles the throttled requests cleanly.
2. **Backend AI Integration**: The Flask/FastAPI backend needs to be connected so that when a physical fruit passes the webcam, the laptop CNN outputs the prediction and fires the identical `/move` command.
3. **Physical Hardware Testing**: Test the Action Memory system connected to the physical arm to ensure the 800ms step delay is sufficient for the real servos to reach their targets without burning out.
4. **Conveyor Control**: Introduce logic to pause the conveyor belt during prediction and resume after the sorting action is complete.
