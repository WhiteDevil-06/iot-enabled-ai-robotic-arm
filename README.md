# AgroBot AI: IoT-Enabled Robotic Arm for Object Classification & Sorting

AgroBot AI is a real-time object classification and sorting system designed for conveyor-based operations (e.g., fruit sorting). The system integrates a client-side React/Vite dashboard, an ESP32-controlled 4-DOF robotic arm, a conveyor system, and a Python-based local CNN classification pipeline.

---

## 📂 Project Repository Structure

- **[`argobot-app/`](file:///Users/saakshi/Desktop/MAIN_EL/iot-enabled-ai-robotic-arm/argobot-app/)**: The React/Vite frontend application (AgroBot AI Dashboard). Provides telemetry feeds, joystick controls, speed sliders, bin sequence recording, and local logs.
- **[`iot-ai-wifi-test-main/esp32-firmware/`](file:///Users/saakshi/Desktop/MAIN_EL/iot-enabled-ai-robotic-arm/iot-ai-wifi-test-main/esp32-firmware/)**: The C++ Arduino firmware for the ESP32. Operates as a non-blocking state machine utilizing time-based interpolation to actuate servo motors smoothly without voltage drops.
- **[`ai/`](file:///Users/saakshi/Desktop/MAIN_EL/iot-enabled-ai-robotic-arm/ai/)**: Python machine learning scripts, including real-time image classifier scripts (`realtime_classifier.py`) and TensorFlow/TFLite model assets.
- **[`.agent/`](file:///Users/saakshi/Desktop/MAIN_EL/iot-enabled-ai-robotic-arm/.agent/)**: Internal development tracking logs, architectural maps, and dashboard configuration guides.

---

## ⚙️ System Architecture & Data Flow

```
+------------------+                   +--------------------+
|  USB Webcam      | --(Live Video)--> |  Web Browser       |
|  (Telemetry)     |                   |  (React Dashboard) |
+------------------+                   +--------------------+
                                                 |
                                            (HTTP GETs)
                                                 v
+------------------+                   +--------------------+
|  4-DOF Robotic   | <--(PWM Angles)-- |  ESP32 Controller  |
|  Arm & Conveyor  |                   |  (WiFi AP Server)  |
+------------------+                   +--------------------+
```

1. **Telemetry Feed**: A mounted USB webcam streams real-time telemetry video directly into the browser dashboard via standard Media APIs.
2. **Command Dispatcher**: The dashboard dispatches throttled HTTP requests (every 60ms during manual overrides) to the ESP32 server.
3. **Non-Blocking Control Loop**: The ESP32 listens to GET requests while executing a time-based linear interpolation loop (incrementing servo angles by 1.5° every 15ms) to prevent physical servo jerks and voltage brownouts.
4. **Physical Handoff Mode**: A mode switch (`/setMode`) allows toggling between Web Mode (dashboard takes priority) and Physical Mode (analog joysticks connected directly to ESP32 take priority).

---

## 🛠️ Key Features

- **Dual Control Interfaces**: Adjust servo angles manually using interactive onscreen joysticks or physical hardware joysticks.
- **Sequential Homing Guard**: Safe initialization routine triggers homing sequentially (Claw -> Elbow -> Shoulder -> Base) to avoid mechanical crashes.
- **Sequence Playback (Action Memory)**: Record pick-and-place coordinate sequences (Bin A and Bin B) dynamically and replay them with built-in safety step delays.
- **Conveyor Belt Overrides**: Full dashboard control over the conveyor belt direction (Forward/Reverse) and velocity (via a PWM speed slider).
- **Glassmorphic UI**: Sleek dark and light themes with high-contrast text and real-time toast alerts for connection state changes.

---

## ⌨️ Dashboard Keyboard Shortcuts

When using the dashboard under manual web-override mode, the robotic arm can be controlled directly via keyboard commands:

| Action | Key Assignment |
| :--- | :--- |
| **Base Left / Right** | `A` / `D` |
| **Shoulder Forward / Back** | `W` / `S` |
| **Elbow Up / Down** | `ArrowUp` / `ArrowDown` |
| **Claw Open / Close** | `ArrowLeft` / `ArrowRight` |
| **Save Current Step to Memory** | `Q` |
| **Clear Memory Buffer** | `Esc` |
| **Trigger Sequence Playback** | `T` |

---

## 🔌 ESP32 API Endpoints

The ESP32 acts as a local HTTP server at `http://192.168.4.1` and exposes the following REST routes:

### 1. Manual Movements
- **Endpoint**: `/move`
- **Method**: `GET`
- **Parameters**:
  - `base`: Target angle for the Base servo (0–180)
  - `shoulder`: Target angle for the Shoulder servo (0–180)
  - `elbow`: Target angle for the Elbow servo (0–180)
  - `claw`: Target angle for the Claw servo (0–180)
  - `speed`: Interpolation interval delay in milliseconds (`8` for fast joystick tracking, `16` for slow sequence playbacks)

### 2. Conveyor Control
- **Endpoint**: `/conveyor`
- **Method**: `GET`
- **Parameters**:
  - `action`: Action type (`start` | `stop` | `reverse`)
- **Endpoint**: `/conveyor/speed`
- **Parameters**:
  - `value`: Speed duty cycle (`0` to `255`)

### 3. Mode Toggle
- **Endpoint**: `/setMode`
- **Method**: `GET`
- **Parameters**:
  - `mode`: Controller priority mode (`web` | `physical`)

### 4. Telemetry State Sync
- **Endpoint**: `/status`
- **Method**: `GET`
- **Returns**: JSON object containing current servo angles, conveyor status, speed settings, and hardware mode.

---

## 🚀 Setup & Installation

### 1. Uploading ESP32 Firmware
1. Open the [Arduino IDE](https://www.arduino.cc/en/software).
2. Install the ESP32 Board Manager and support package.
3. Open [`iot-ai-wifi-test-main/esp32-firmware/esp32-firmware.ino`](file:///Users/saakshi/Desktop/MAIN_EL/iot-enabled-ai-robotic-arm/iot-ai-wifi-test-main/esp32-firmware/esp32-firmware.ino).
4. Connect your ESP32 board, select the correct Port and Board type, and click **Upload**.

### 2. Running the Dashboard Frontend
1. Navigate to the frontend directory:
   ```bash
   cd argobot-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch the local development server:
   ```bash
   npm run dev
   ```
4. Access the web dashboard at the URL printed in the terminal (default: `http://localhost:5173`).

### 3. Running the Python Classifier
1. Navigate to the AI directory:
   ```bash
   cd ai
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On macOS/Linux
   ```
3. Install required libraries:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the classifier script:
   ```bash
   python realtime_classifier.py
   ```
