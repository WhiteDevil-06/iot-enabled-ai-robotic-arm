# AgroBot AI Dashboard UI Architecture

The frontend is a React/Vite application styled with modern glassmorphism.

## 1. Home Page
- **Project Overview**: Mission statement, team details, and MVP scope.
- **Metrics**: High-level statistics of the system (e.g., accuracy, fruits sorted).
- **Architecture**: A visual flow of how the USB Webcam, Browser Telemetry, ESP32 Server, 4-DOF Robotic Arm, and Local Session Logs interact.

- **Gallery**: "Development & System Gallery" featuring 10 real-world project photos and custom descriptive captions, with high-contrast text overlays in light mode.
- **Global Footer**: Centered layout displaying GitHub repository link via inline SVG icon.

## 2. Dashboard / Control Center Page
- **Webcam Feed**: Live local camera feed utilizing browser MediaDevices API with robust ref race-condition prevention (always-mounted video element toggled via class names).
- **Live Telemetry (Sync)**: 1-second interval polling from `/status` to visually sync the UI sliders/joysticks with physical hardware movements.
- **Mode Toggle**: A switch to transfer control between "Web Mode" (UI takes priority) and "Physical Mode" (hardware joysticks take priority).
- **ESP32 Connection Status**: Live indicator (Connected/Disconnected) based on `fetch` reachability.
- **Live Prediction & Confidence**: Dynamic simulations of classification results active *only* when the conveyor is running.
- **AI Model Status**: Statically marked as "Offline" as the python classification script is decoupled for stable manual testing.
- **Conveyor Controls**: Manual override to Pause/Resume/Reverse the conveyor belt, including a PWM speed slider.
- **Manual Control Overrides**: Twin Joysticks and independent sliders for manual ESP32 control via `/move`.
- **Memory System (Bins)**: Ability to record, store, and playback custom sequence movements to Target Bins (Bin A & Bin B) using keyboard shortcuts (`Q` to save, `Esc` to stop). Includes sequential delays for cinematic, non-colliding playback.
- **Toast Notifications**: Glassmorphic popups to alert users of mode changes, connection drops, and prediction events.

## 3. History Page
- **Batch Reports**: Summary of the current sorting session.
- **Prediction Logs**: A scrolling list of recent predictions and overrides.
- **Timestamps**: Exact time of each action.
- **Statistics**: Count of Fresh vs. Rotten items sorted.
