# AI-IOT-4TH Project Architecture

## 1. Full System Architecture
The AI-Based Robotic Fruit Sorting System integrates a laptop-based AI prediction module with an ESP32-controlled 4-DOF robotic arm.
- **Laptop (Brain)**: Captures webcam feed, runs CNN inference, and acts as the Backend API server.
- **ESP32 (Actuator)**: Connects via WiFi (broadcasting its own network), runs an async web server, and controls the servos.
- **Hardware**: 4-DOF Robotic Arm, Conveyor System, USB Webcam.

## 2. Hardware Flow
1. **Conveyor moves fruit** into the detection zone.
2. **Fruit reaches detection zone** -> Conveyor stops.
3. **USB webcam captures image**.
4. **CNN predicts class** (Fresh/Rotten).
5. **Backend interprets prediction** and sends a command to ESP32.
6. **ESP32 receives WiFi command** and moves the arm.
7. **Robotic arm sorts the fruit** into the ACCEPT or REJECT bin.
8. **Conveyor resumes**.

## 3. AI Pipeline
- **Input**: USB Webcam (single camera setup).
- **Processing**: Laptop-based CNN inference (Small CNN Architecture).
- **Classification**: 6 exact classes (fresh/rotten apple, grape, strawberry).
- **Logic**: No YOLO, no object detection, no segmentation. Pure image classification on a white conveyor background, one fruit at a time.

## 4. Communication Pipeline
- **Network**: ESP32 broadcasts its own WiFi network. Laptop connects directly.
- **Protocol**: HTTP GET requests.
- **Endpoint**: ESP32 exposes `GET /move?base=X&shoulder=Y&elbow=Z&claw=W&speed=S`.
- **Throttling**: Dashboard frontend limits requests to every 60ms during manual joystick control to maintain stutter-free smooth interpolation.

## 5. Dashboard Architecture
- **Frontend**: A React/Vite web application (`argobot-app`) branded as AgroBot AI.
- Provides manual override (joystick/sliders), sequence recording (Bins), and live monitoring (telemetry, prediction logs).
- Connects directly to the ESP32 IP (`192.168.4.1`) via client-side fetch for manual movement (`/move`), conveyor controls (`/conveyor`), and status polling (`/status`).
- ESP32 Firmware acts as a purely non-blocking state machine using `millis()`, allowing seamless multitasking between WiFi HTTP requests and servo interpolation.

## 6. Final Deployment Flow
- **Environment**: Local execution only (No cloud deployment).
- **Demo Reliability**: Prioritize system stability. The integration is locked to a single laptop talking to a single ESP32 over a local network.
