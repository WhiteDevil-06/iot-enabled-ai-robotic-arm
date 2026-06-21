# ArgoBot AI Dashboard UI Architecture

The frontend is a React/Vite application styled with modern glassmorphism.

## 1. Home Page
- **Project Overview**: Mission statement, team details, and MVP scope.
- **Metrics**: High-level statistics of the system (e.g., accuracy, fruits sorted).
- **Architecture**: A visual flow of how the laptop, AI, and ESP32 interact.
- **Gallery**: Demo images and setup photos.

## 2. Dashboard / Control Center Page
- **Webcam Feed**: Live video stream from the USB webcam processing AI predictions.
- **Live Telemetry (Sync)**: 1-second interval polling from `/status` to visually sync the UI sliders/joysticks with physical hardware movements.
- **Mode Toggle**: A switch to transfer control between "Web Mode" (UI takes priority) and "Physical Mode" (hardware joysticks take priority).
- **ESP32 Connection Status**: Live indicator (Connected/Disconnected) based on `fetch` reachability.
- **Live Prediction & Confidence**: Current class predicted by the CNN with threshold warnings.
- **Conveyor Controls**: Manual override to Pause/Resume/Reverse the conveyor belt, including a PWM speed slider.
- **Manual Control Overrides**: Twin Joysticks and independent sliders for manual ESP32 control via `/move`.
- **Toast Notifications**: Glassmorphic popups to alert users of mode changes, connection drops, and prediction events.

## 3. History Page
- **Batch Reports**: Summary of the current sorting session.
- **Prediction Logs**: A scrolling list of recent predictions and overrides.
- **Timestamps**: Exact time of each action.
- **Statistics**: Count of Fresh vs. Rotten items sorted.
