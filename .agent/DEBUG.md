# Debugging & Lessons Learned

## Previous Dataset Failures
- **Random Dataset Mixing**: Early attempts combining random Kaggle datasets led to poor class balance and conflicting image sizes/quality. We are now strictly using the Mendeley dataset to ensure consistency.
- **Pre-Augmented Datasets**: Using datasets that were pre-augmented confused the model evaluation and led to data leakage. We now use ONLY original images and apply augmentation dynamically in TensorFlow.

## Domain Mismatch Issues
- Models trained on stock images fail when tested on real-world webcams. 
- **Solution**: The conveyor background MUST be white. This acts as a controlled environment, heavily reducing domain mismatch.

## Model Bias Causes
- Extraneous fruits (banana, orange) diluted the network's capacity. By restricting the system to exactly 6 classes, bias is minimized and accuracy is maximized.

## Lessons Learned (Session: 2026-06-20)
- **Severe Servo Jitter**: Moving the servos directly with discrete network packets every 100-150ms results in step-wise jerkiness. Replaced direct writes with a 15ms firmware-side interpolation loop where servos move at a smooth rate of 1.5° per step toward their targets.
- **Power Brownouts & Resets**: Commanding all servos to move simultaneously to a default center angle (e.g. 90°) at maximum speed draws a massive spike in current, causing a voltage drop that resets the ESP32 (simulating disconnection). Firmware-side interpolation slows down transitions and keeps current draw below the brownout threshold.
- **ES6 Import live-binding Mutation**: Reassigning methods on ES6 imports (e.g., monkey-patching `stateManager.notify`) causes runtime TypeErrors or crashes in strict modular environments since ES6 imports are read-only live bindings. Instead, we now mutate mutable object properties directly and invoke the clean public API.
- **Dynamic String Property Indexing**: Using dynamic string interpolation as object keys (e.g. `els[axis + 'Slider']` or `this.displacements[axis]`) triggers strict IDE linting errors and type-checking failures when objects lack dynamic index signatures. Refactored to explicit conditional branches using static references (e.g., `els.baseSlider`, `this.displacements.base`).
- **Programmatic Control Loops**: Pulling hardware state synchronously via polling can trigger UI listener callbacks, causing a loopback echo that sends commands back to the hardware. Resolved by passing an `isProgrammatic` flag to layout updates to skip outgoing network calls during active sync.

## Lessons Learned (Session: 2026-06-22)
- **Keyboard Event Repeat Spam**: Holding down a key (like 'Q' to save a step) rapidly fires hundreds of `keydown` events, causing the React app to push dozens of duplicates to state arrays instantly. Resolved by checking `event.repeat` in the handler and ignoring continuous firing.
- **Joystick Throttle Stutter**: Using an interval loop of `50ms` for joystick movements but throttling HTTP dispatches to `150ms` causes target values to "jump" massively every 150ms. Since the ESP32 was catching up quickly, it led to a start-stop "stutter". Aligning the HTTP throttle delay (`60ms`) with the joystick tick rate ensures the ESP32 receives tiny, constant target increments, resulting in smooth continuous hardware movement.
- **Cinematic vs Manual Servo Speed**: Hardcoding `SERVO_INTERVAL` to `8ms` made manual joystick movement wonderfully responsive but made sequenced playback (where targets change by 60+ degrees at once) look extremely aggressive and jittery. Resolved by making `servoInterval` dynamically configurable via the `/move?speed=X` API, allowing the frontend to specify `speed=8` for manual overrides and `speed=16` for smooth, cinematic sequential playback.
- **Sequential Homing vs Simultaneous Resets**: Clicking 'Reset' caused all servos to move simultaneously. Depending on arm geometry, this can cause the claw to smash into the base. Resolved by orchestrating homing locally in the frontend with `await new Promise` delays, stepping through Claw -> Elbow -> Shoulder -> Base sequentially to gracefully untangle the arm before retracting.

## Lessons Learned (Session: 2026-06-23)
- **React Ref Mounting Race Condition on Web Streams**: Accessing video DOM elements immediately on component mount can fail if conditional rendering (`{isRunning && <video />}`) is active. If the element is unmounted, the browser media stream has no target. Toggling element visibility using a `hidden` class ensures the video element is always mounted in the DOM, safely resolving reference timing issues.
- **Bi-Directional LocalStorage Telemetry Sync**: Synchronizing status indicators (such as conveyor speed, active state, and connection reachability) across multiple tabs (e.g. Dashboard and Control Center) requires combining window `storage` listeners for cross-tab events and a short polling loop (1s) to capture immediate updates in the current active tab.
- **Light Mode Accessibility and Visual Contrast**: Dynamic overlays (like the home page gallery lightbox and photo cards) that use white text on transparent backgrounds become illegible when toggled to Light Mode. Adding high-contrast dark text selectors, text-shadow properties, or solid background backing plates is essential to maintain WCAG readability under both theme options.

## Future Debugging Strategy

1. **Confidence Thresholding**: If the model acts erratically, tune the `0.7` confidence threshold.
2. **Webcam Feed Verification**: Always verify the input tensor visually before it is passed to `model.predict()`.
3. **Hardware Comms**: If the arm fails to move, check the dashboard `status-indicator` and ensure the laptop is connected to the ESP32's WiFi AP.
4. **Log Analysis**: Rely on the History Page of the UI for tracking batch failures.
