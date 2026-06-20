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

## Future Debugging Strategy
1. **Confidence Thresholding**: If the model acts erratically, tune the `0.7` confidence threshold.
2. **Webcam Feed Verification**: Always verify the input tensor visually before it is passed to `model.predict()`.
3. **Hardware Comms**: If the arm fails to move, check the dashboard `status-indicator` and ensure the laptop is connected to the ESP32's WiFi AP.
4. **Log Analysis**: Rely on the History Page of the UI for tracking batch failures.
