# Product Requirements Document (PRD)

## Goals
- Build a 4 DOF robotic arm capable of sorting items into Accept (Bin A) and Reject (Bin B) bins based on AI classification.

## Features
- Web-based control dashboard with digital joysticks.
- CNN-based image classification for Quality Control.
- Multiple control modes: Manual, IoT, Automation, AI.
- Minimal, clean UI displaying live feed, predictions, and decisions.

## Constraints
- Localhost backend (Flask/FastAPI) and HTTP communication.
- Same Wi-Fi required for ESP32 and backend communication.
- Cloud services avoided.
- Keep models simple and input sizes fixed (128x128).
- Conveyor belt driven by a yellow TT DC Geared Motor (3V - 6V).

