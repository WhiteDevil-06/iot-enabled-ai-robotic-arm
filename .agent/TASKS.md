# Milestone-Driven Task Tracker

## Milestone 1: Hardware & Base Comms ✅ COMPLETED
- [x] Build 4 DOF robotic arm
- [x] Establish ESP32 robotic control
- [x] Implement WiFi dashboard communication
- [x] Implement Web joystick controller
- [x] Implement Teach-and-repeat mode
- [x] Configure ESP32 as a WiFi Access Point

## Milestone 2: Dataset & AI Architecture ✅ COMPLETED
- [x] Finalize dataset source (Mendeley / curated 200 images per class)
- [x] Define exact 6 classes (FreshApple, RottenApple, FreshGrape, RottenGrape, FreshStrawberry, RottenStrawberry)
- [x] Formalize Small CNN architecture
- [x] Archive/rename old unstable notebooks

## Milestone 2.5: Dashboard Extension ✅ COMPLETED
- [x] Add keyboard controls (W/S/A/D + Arrow keys)
- [x] Implement Action Memory System (Q=Save, T=Run, R=Reset)
- [x] Add Keyboard Shortcut Helper UI panel
- [x] Commit ESP32 firmware source code to repo (`esp32-firmware.ino`)

## Milestone 3: CNN Training Pipeline ✅ COMPLETED
- [x] Pivot from Mendeley download to Google Drive curated dataset strategy
- [x] Create unified `Fruit_Sorting_GDRIVE_Training.ipynb`
- [x] Implement Drive mount + shell unzip extraction to fast local Colab disk
- [x] Implement Data Augmentation (Flip, Rotation, Zoom, Contrast)
- [x] Train Small CNN — 87.1% validation accuracy achieved
- [x] Add Confusion Matrix, Precision, Recall, F1-Score evaluation (Section 8.5)
- [x] Export models to local machine via `google.colab.files.download()`
- [x] Commit `class_names.json` to repo

### Training Results (2026-05-11)
- **Best Epoch**: 9 (Early Stopping triggered at ~epoch 15)
- **Validation Accuracy**: 87.1%
- **Strong Classes**: FreshApple (94%), FreshGrape (97%), FreshStrawberry (97%), RottenStrawberry (98%)
- **Weak Class**: RottenGrape (57.5%) — visual ambiguity with FreshGrape
- **Model Size**: 12.61 MB (3.3M parameters)

## Milestone 4: Backend API & Integration 🔄 IN PROGRESS
- [x] Setup Laptop backend script to capture USB webcam feed (`realtime_classifier.py`)
- [x] Integrate CNN inference into the backend (load `model.tflite`/`final_model.keras` + `class_names.json`)
- [x] Link backend inference to the ESP32 API (`GET /move?base=X&shoulder=Y&elbow=Z&claw=W`)
- [x] Implement background subtraction and object contour tracking (filtering curtains/arms)
- [x] Implement confidence-based "Unknown Object" rejection (threshold = 0.85)
- [ ] Implement Conveyor logic (pause on detection, resume after sort)

## Milestone 5: Dashboard Enhancement & Testing (Pending)
- [ ] Finalize UI Dashboard sections (Home, Dashboard, History)
- [ ] Live AI testing with physical fruits on conveyor (requires static white background)
- [ ] Stability and edge-case testing

## Milestone 6: ESP32 Firmware Debugging & Stability ✅ COMPLETED
### Problem Analysis & Root Causes
- **Robotic Arm "Dancing"** (Confidence: High): Caused by a combination of a small joystick deadzone (`200`) and the relative incremental target update logic (`target += displacement`). Any small ADC noise that escapes the deadzone accumulates, causing continuous drift. Floating pins from incorrect physical mapping exacerbated this.
- **Joystick Mapping Reversed** (Confidence: High): ADC pin mapping in firmware did not match the physical wiring. (Fixed in previous session by swapping pins 33 and 35).
- **Toggle Mode Instability** (Confidence: Medium): When switching to physical mode, the sudden application of joystick displacement to the current target causes jumps.
- **Website Interference** (Confidence: High): Need to verify that `handlePhysicalJoysticks()` completely overrides or blocks `/move` HTTP requests to prevent conflicting target updates.

### List of Firmware Bugs Identified
1. **[Critical]** ADC Floating/Noise Accumulation: `target += displacement` continuously adds noise if joystick doesn't rest exactly within the `2048 +/- 200` deadzone. Fixed using `1.5` degree interpolation per `15ms`.
2. **[High]** Incorrect Joystick Pin Mapping: Physical pins did not match Left(Base/Shoulder) and Right(Elbow/Claw). (Mitigated)
3. **[Medium]** Lack of ADC Debugging: No visibility into actual resting ADC values to calibrate the deadzone.
4. **[Medium]** Potential Web/Physical Collision: If the website sends `/move` while physical mode is active, targets might conflict. Fixed with `webMode` API toggle `/setMode`.

### Files Modified
- `iot-ai-wifi-test-main/esp32-firmware/esp32-firmware.ino`:
  - Added interpolation for smooth servo movement.
  - Added physical/web mode switch logic.
  - Implemented `/status` and `/conveyor` routes.
- `argobot-app`:
  - Replaced the basic dashboard with a React/Vite web application (ArgoBot AI).
  - Fixed joystick layout overlapping navbar.

## Milestone 7: Integration of ArgoBot AI React Dashboard 🔄 IN PROGRESS
- [x] Clone and customize Monica's React website (`argobot-app`).
- [x] Integrate basic UI routes and manual controls via ESP32 API.
- [x] Sync physical hardware movements with live dashboard visualization.
- [x] Added Bin Position (Bin A / Bin B) saving system into legacy HTML dashboard.
- [x] Fixed legacy UI layout for better screen usage and removed toast notification spam.
- [x] Globally renamed "ArgoBot" to "AgroBot" in the React app.
- [ ] Connect the live AI prediction feed to the dashboard logic.

## Milestone 8: Finalizing Features & Porting (UNDER TEST & PENDING)
### Work Completed (But Needs Testing):
- **ESP32 Firmware**: Added `/moveBin` route and logic to store/recall Bin A and Bin B states on the hardware level. **STATUS: UNDER TEST**.
- **Legacy UI**: HTML/JS updated to allow capturing and storing multiple steps for Bin sequences.

### Pending Work (To Be Done Next):
1. **Test ESP Firmware**: Verify that `/moveBin` works correctly and does not conflict with manual movements or physical joysticks.
2. **Replicate Legacy UI into React App**: The Bin Position recording logic (sequence recording, step playback, keyboard shortcuts) needs to be ported into the main `argobot-app` Control Center.
3. **Connect AI Backend**: Integrate `realtime_classifier.py` stream to trigger the robotic arm sequence when a specific fruit is detected on the conveyor belt.
4. **Infinite Gallery Video Support**: Implement `<video>` tag support for the `argobot-app` infinite gallery on the homepage.

## Milestone 9: Project Restructure & Stability ✅ COMPLETED
- [x] Temporarily decouple AI subsystem (`realtime_classifier.py` intercepts requests to ESP32).
- [x] Completely refactor `esp32-firmware.ino` into a non-blocking state machine.
- [x] Replace blocking delays with `millis()` timer and Target Position System (1-degree increments per 15ms).
- [x] Add explicit `/conveyor` and `/home` endpoints in firmware.
- [x] Fix React frontend double-save bug on `Q` keypress via `event.repeat` blocking.
- [x] Re-style React Control Center panels with glassmorphism and `lucide-react` icons.
- [x] Embed GitHub repository SVG icon in the global frontend Footer.
- [x] Swap W/S and ArrowLeft/ArrowRight keybinds to correctly match physical orientation.
- [x] Fix conveyor belt reverse logic by applying inverted PWM duty cycle.
- [x] Implement smooth sequential homing (Claw -> Elbow -> Shoulder -> Base) directly in frontend.
- [x] Implement dynamic `servoInterval` API to enable fast manual control (8ms) and slow cinematic bin playback (16ms).

## Milestone 10: Gallery Upgrade & Telemetry Sync ✅ COMPLETED
- [x] Copy 10 real-world project photos to the public assets directory.
- [x] Replace the first 10 slots of the homepage gallery with real photos and custom descriptive captions.
- [x] Rename the gallery header to "Development & System Gallery".
- [x] Clean up assets by deleting all 15 old AI placeholder `.png` files.
- [x] Redesign the footer layout in `Footer.jsx` and `Footer.css` to be fully centered and stacked with the "Quick Links" column header.
- [x] Fix image gallery lightbox caption and hover card overlay text contrast issues in light mode.
- [x] Add live webcam access (streamed to a `<video>` element) inside the dashboard telemetry box.
- [x] Solve React ref mounting race condition for the video stream by always rendering the element and toggling visibility via classes.
- [x] Decouple conveyor status updates from dashboard start/stop buttons, reading the states purely from the Control Center.
- [x] Deactivate the AI Model status card (always displays "Offline").
- [x] Condition the fruit simulation on both the system active state and the conveyor running state.

