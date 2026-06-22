# Project Session Logs

## Session: 2026-06-23

### What Was Done
- **Development & System Gallery Upgrade**: Replaced 15 AI placeholder graphics with 10 real-world project pictures showing the physical arm and conveyor setup, complete with custom descriptive captions.
- **Centered Footer Redesign**: Re-styled and centered the global footer layout in `Footer.jsx` and `Footer.css` to vertically stack quick links and details for a clean look.
- **Contrast Accessibility Fixes**: Solved contrast issues on dynamic image cards and lightbox text overlays in Light Mode.
- **Webcam Telemetry Feed**: Integrated local browser webcam streaming dynamically inside the Dashboard's telemetry video box using `navigator.mediaDevices.getUserMedia`.
- **Ref Mounting Race Condition Prevention**: Kept the video stream reference stable by using CSS-based `hidden` class toggling instead of conditional React mounting.
- **AI Status Card Offline State**: Configured the AI Model status card to statically show "Offline" since the physical classifier backend is decoupled for manual telemetry testing.
- **Conveyor Status Tracking**: Decoupled conveyor status checks from the start/stop buttons, tracking and displaying statuses dynamically.
- **Fruit Classification Simulator**: Conditioned the UI simulator to trigger mock detections only when conveyor state is "running" and system is active.
- **Homepage Copy & Layout Realignment**: Cleaned up the value propositions, operations steps, and features list on the Home page to describe only what is actually built (twin joysticks, bin sequence recordings, smooth firmware interpolation, and local logs). Modified `Home.css` to add `height: 100%` and `min-height` constraints on cards to resolve any potential layout overlaps and text overflows.
- **Architecture Diagram Sync**: Synced the technical pipeline node chart with the implemented flow (USB Webcam -> Browser Telemetry -> ESP32 Server -> 4-DOF Robotic Arm -> Local Session Logs).


### Key Results
| Metric | Value |
|--------|-------|
| Gallery Images | 10 Real Photos |
| Camera Stream | Local Browser WebRTC/MediaDevices |
| AI Model Status | Offline (Decoupled Phase) |

## Session: 2026-06-22


### What Was Done
- **React Frontend Integration**: Fully ported the legacy HTML/JS dashboard into a modern React application (`argobot-app`). Implemented glassmorphism UI, interactive joysticks, sliders, and Toast notifications.
- **Dynamic Servo Speed API**: Modified ESP32 `/move` endpoint to accept a `speed` parameter. Implemented fast interpolation (`8ms`) for responsive manual joystick control, and slow interpolation (`16ms`) for smooth cinematic sequence playback.
- **Homing Fixes**: Replaced simultaneous reset (which caused hardware collisions) with a frontend-orchestrated sequential homing routine (Claw -> Elbow -> Shoulder -> Base).
- **Conveyor Inversion & Bug Fixes**:
  - Inverted conveyor logic on hardware (`IN1`/`IN2`) to properly support forward/reverse via `/conveyor/*` routes.
  - Swapped W/S and ArrowLeft/Right keys to match physical robotic arm orientation.
  - Debounced React's `keydown` listener to block `event.repeat`, fixing a double-save bug during Bin recording.
  - Eliminated joystick stutter by reducing HTTP dispatch throttle from 150ms to 60ms.
- **State Machine Refactoring**: Completed the ESP32 firmware transition from blocking `delay()` to a purely `millis()` driven non-blocking state machine.

### Key Results
| Metric | Value |
|--------|-------|
| Manual Servo Interval | 8ms (~125°/s) |
| Playback Servo Interval | 16ms (~60°/s) |
| Joystick Dispatch Throttle | 60ms |

### Next Steps
- Re-attach the AI prediction module (`realtime_classifier.py`).
- Conduct physical end-to-end tests with real fruit sorting.

## Session: 2026-06-20

### What Was Done
- **Firmware-Side Servo Smoothing**: Added time-based linear interpolation in the ESP32 firmware. The servos now slide toward target angles incrementally by 1.5° every 15ms, eliminating jerkiness and settling jitter.
- **Power Brownout Prevention**: By smoothing servo speed transitions, the peak current draw is minimized, resolving the brownout resets that previously simulated random disconnections (especially during center resets).
- **Physical vs. Web Handoff Logic**:
  - Added `/setMode?mode=web|physical` API to the ESP32.
  - Toggling Website Control off switches the ESP32 to physical mode, which continuously polls analog hardware joysticks (GPIO 34, 35, 32, 33) and maps readings to incremental target movements.
  - Implemented a `/status` JSON endpoint on the ESP32.
  - Integrated 1-second polling on the website to sync the sliders and values live with the physical hardware movements.
- **Conveyor Belt API Integration**: Integrated GPIO pin controls (IN1, IN2, ENA) on ESP32 and added the `/conveyor?action=start|stop|reverse` API routes without affecting servo execution.
- **Axes Correction & Dead Zones**:
  - Globally inverted the Base and Shoulder axis directions in `control.js` to ensure intuitive keyboard and joystick directions.
  - Added a 5% dead zone filter to displacements to eliminate analog off-center drift.
- **Toast Notifications System**: Developed a modern glassmorphic toast notification popup system in `index.html`, `style.css`, and `app.js` to notify users during mode switches and resets.
- **Strict Linting & Module Fixes**:
  - Removed dynamic string-key indexing (`els[axis + 'Slider']` and `displacements[axis]`) and replaced with safe, statically-typed property selections.
  - Replaced all ES6 template literals with single-quoted string concatenations in `app.js` to ensure cross-browser parsing stability.
  - Eliminated ES6 live-binding mutation errors in `control.js` by mutating `stateManager.state` fields directly rather than overriding read-only imported functions.

### Key Results
| Metric | Value |
|--------|-------|
| Servo Update Rate | 100ms (Trailing-Edge Throttle) |
| Servo Interpolation Step | 1.5° per 15ms (~100°/s) |
| Hardware Joystick Deadzone | 200 units (Analog ADC) |
| Connection Status | 100% Stable (Socket & Power) |

### Next Steps
- Verify the real-time sorting logic connected with the laptop's webcam CNN classifier (`realtime_classifier.py`).
- Conduct physical trial runs on the sorting conveyor belt.

## Session: 2026-06-03

### What Was Done
- **AI Model Validation**: Confirmed validation accuracy boost from 88% to **90.0%** (achieved by user adding 25 extra images to the `RottenGrape` class, elevating its F1-score to 81%, precision to 90%, and recall to 74%).
- **Webcam Real-Time Classification**:
  - Created `ai/requirements.txt` defining Python library requirements (`opencv-python`, `numpy`, `tensorflow`, `requests`).
  - Created `ai/realtime_classifier.py` implementing live webcam capture, TFLite/Keras loading, FPS counter, and ESP32 HTTP GET command routing.
- **Advanced CV & Bounding Box Logic**:
  - Added a **60-frame auto-exposure stabilization delay** to allow the camera brightness to settle on startup.
  - Implemented **Grayscale Background Calibration** (averaging 15 frames) to isolate background curtains and walls.
  - Added **Contour Tracking** that draws tight bounding boxes around fruits and ignores edge-touching border noise (user's hand/body).
  - Configured the CNN to run predictions **only** on the cropped bounding box of the object (`object_crop`) to remove background interference.
- **OOD ("Unknown Object") Rejection**: Configured a strict **0.85 confidence threshold**. Predictions below 0.85 display as `"Unknown Object"`, draw a gray box, and block robotic arm movements.
- **Pre-processing Bug Fix**: Identified and resolved a **double-rescaling bug** where dividing by 255 in python, combined with the model's built-in `Rescaling(1./255)` layer, sent near-black images to the model. Keeping images in the `[0.0, 255.0]` range resolved the issue.

### Key Results
| Metric | Value |
|--------|-------|
| Val Accuracy | 90.0% (Epoch 13) |
| Model Format | TFLite (`model.tflite`) or Keras (`final_model.keras`) |
| Cooldown | 5.0 seconds between sorting commands |
| Reject Threshold | 0.85 (Unknown Object filtering) |

### Next Steps
- Verify conveyor belt pauses and resumes when physical fruits pass.
- Link Laptop to the physical robotic arm AP and test live WiFi actions.

## Session: 2026-05-11

### What Was Done
- **Dashboard Extended**: Added full keyboard control (W/S/A/D + Arrow keys) tapping into the existing joystick displacement loop. Smooth, throttled, no duplicate logic.
- **Action Memory System**: Q (Save), T (Run replay with 800ms step delay), R (Reset). New `keyboard.js` and `memory.js` modules.
- **ESP32 Firmware**: Saved the Arduino `.ino` file into the repo at `iot-ai-wifi-test-main/esp32-firmware/`.
- **Notebook Cleanup**: Deleted all 5 deprecated/failed notebooks. Created single canonical `Fruit_Sorting_GDRIVE_Training.ipynb`.
- **Dataset Strategy Pivot**: Abandoned Mendeley direct download (too large/slow). Switched to user-curated 200-images-per-class zip uploaded to Google Drive `MAIN-EL-IOT/CURATED_DATASET.zip`.
- **CNN Training Completed**: 87.1% validation accuracy @ Epoch 9. Early Stopping triggered ~Epoch 15. 
- **Evaluation Metrics Added**: Confusion Matrix, Precision, Recall, F1-Score (Section 8.5 in notebook).
- **Export**: Models downloaded to local machine via `google.colab.files.download()`.
- **`class_names.json`** committed to repo.
- **Agent Logs Updated**: TASKS.md and MODEL.md fully synced with today's work.

### Key Results
| Metric | Value |
|--------|-------|
| Val Accuracy | 87.1% |
| Best Epoch | 9 |
| Model Size | 12.61 MB |
| Weakest Class | RottenGrape (57.5%) |
| Strongest Class | RottenStrawberry (97.9%) |

### Next Session: Milestone 4
- Build laptop backend (Python/Flask) to capture webcam feed
- Load `final_model.keras` + `class_names.json` for inference
- Fire `GET /move` to ESP32 based on prediction
- Test end-to-end with physical fruits on conveyor

### Known Issues
- RottenGrape confused with FreshGrape — visual ambiguity at 128x128. May need more training data or targeted augmentation.
- Keep confidence threshold at 0.7 to reject ambiguous predictions.
