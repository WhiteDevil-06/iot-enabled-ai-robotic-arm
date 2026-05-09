# Dashboard UI Architecture

## 1. Home Page
- **Project Overview**: Mission statement, team details, and MVP scope.
- **Metrics**: High-level statistics of the system (e.g., accuracy, fruits sorted).
- **Architecture**: A visual flow of how the laptop, AI, and ESP32 interact.
- **Gallery**: Demo images and setup photos.

## 2. Dashboard Page
- **Webcam Feed**: Live video stream from the USB webcam.
- **ESP32 Connection Status**: Live indicator (Connected/Disconnected) based on `fetch` reachability.
- **Live Prediction**: The current class predicted by the CNN.
- **Confidence Score**: Displayed alongside the prediction (with threshold warnings < 0.7).
- **Action**: Indicator for the decision made (ACCEPT / REJECT).
- **Conveyor Controls**: Manual override to Pause/Resume the conveyor belt.
- **Manual Control Overrides**: Joysticks and sliders for manual ESP32 control via `/move`.

## 3. History Page
- **Batch Reports**: Summary of the current sorting session.
- **Prediction Logs**: A scrolling list of recent predictions.
- **Timestamps**: Exact time of each action.
- **Statistics**: Count of Fresh vs. Rotten items sorted.
