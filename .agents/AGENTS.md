# AgroBot AI — Agent Guidelines & Repository Rules

These guidelines are automatically loaded as instructions for any AI agent pair programming on this repository. Follow them strictly to maintain architecture integrity and prevent system regressions.

---

## 1. ESP32 Firmware Development Rules
- **Non-Blocking Control Loop**: The firmware (`esp32-firmware.ino`) must remain a purely non-blocking state machine.
  - **NEVER** use blocking calls like `delay()` inside REST handlers or the main loop.
  - Always use `millis()` timers to schedule background operations.
- **Servo Smoothing**: Do not actuate servos directly to new targets in a single step. All movements must go through the time-based linear interpolation routine (`1°` every `8ms` to `16ms`).
- **Sequential Homing**: Ensure homing always executes sequentially (Claw -> Elbow -> Shoulder -> Base) to avoid mechanical crashes.

---

## 2. React UI Dashboard Development Rules (`argobot-app`)
- **Theme and Aesthetics**: Maintain the modern glassmorphism design language (translucent cards, dark/light toggle, vibrant color scales, CSS variables, and Lucide icons).
- **Video Stream Stability**: Keep the webcam stream reference stable. Always keep the `<video>` element mounted in the DOM, using a `.hidden` CSS class to toggle visibility (do NOT use conditional React rendering like `{isRunning && <video />}`).
- **Network Dispatch Throttling**: Manual joystick commands must be throttled to `60ms` intervals to synchronize with the firmware servo interpolation rate and avoid network queue overflow.
- **Cross-Tab State Sync**: Use local storage synchronization coupled with a 1-second polling loop to synchronize telemetry and conveyor status across multiple browser tabs.
- **Keyboard Shortcuts**: Debounce key handlers by checking `event.repeat` to prevent duplicate events on sustained keypress.

---

## 3. AI & Image Processing Rules (`ai/` directory)
- **Model Inputs**: Keep images at a fixed `128x128` input dimensions.
- **Strict Classes (6 Only)**: The CNN model must only classify the following 6 classes: `FreshApple`, `RottenApple`, `FreshGrape`, `RottenGrape`, `FreshStrawberry`, `RottenStrawberry`. Do not add custom categories.
- **NumPy CNN Inference**: The Python classification backend `realtime_classifier.py` runs inference using a pure NumPy-implemented forward pass loading Keras weight parameters. Do not introduce a TensorFlow dependency for runtime inference.
- **Pre-processing Limits**: The model starts with a built-in Keras `Rescaling(1./255)` layer. Do not rescale the image to `[0.0, 1.0]` in Python prior to inference, as this will lead to a double-rescaling bug.
- **ROI Contour Tracking**: Isolate fruits using grayscale background subtraction and contour filters (with a minimum area threshold of `800` to `1500` pixels). Bounding boxes below `0.85` confidence must be designated as `"Unknown Object"` and block sorting actions.

---

## 4. Git Workflow Governance
- **Conventional Commits**: Ensure commit messages use prefix tags: `feat:`, `fix:`, `docs:`, `chore:`, `model:`.
- **Notebook Hygiene**: Always clear cell outputs in `Fruit_Sorting_GDRIVE_Training.ipynb` before staging or committing to prevent merge conflicts.
- **Exclusion Filters**: Never commit raw image datasets, heavy intermediate weights, virtual environments (`venv/`), or `.env` files.
