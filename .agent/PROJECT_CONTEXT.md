# Project Context & Vision

## Project Vision
Build a fully integrated AI-powered robotic fruit sorting system capable of detecting fruit type, identifying fresh vs. rotten quality, performing automated robotic sorting, and maintaining live dashboard monitoring over WiFi.

## Constraints
1. **MVP Scope**: This is an MVP demo system. Do NOT overengineer.
2. **Deadline**: Approximately 2 weeks.
3. **Hardware Constraints**: USB webcam, laptop-based inference (brain), ESP32 used ONLY for robotic control (actuator).
4. **Environment Constraints**: Conveyor background MUST be white. Fruits arrive ONE AT A TIME. Conveyor MUST stop during prediction.
5. **AI Constraints**: Image Classification ONLY. No object detection. No YOLO. No segmentation. 
6. **Deployment**: Local network only. No cloud deployment. No multiple-camera setups.

## Final Decisions
- Use the Mendeley dataset (Apple, Grape, Strawberry).
- Strictly 6 classes. No additional fruits.
- Small CNN architecture to prevent overfitting and guarantee performance.
- Direct ESP32 HTTP GET requests for communication.

## Current Progress
- 4 DOF robotic arm built.
- ESP32 robotic control working.
- WiFi dashboard communication working.
- Web joystick controller working.
- Teach-and-repeat mode working.
- ESP32 broadcasting its own WiFi network.
- Laptop successfully connected to ESP32.
- Robotic arm successfully controlled from browser dashboard.
- Project architecture and Dataset finalized.

## Rejected Approaches
- Transfer learning (initially avoided to keep the system simple).
- Pre-augmented datasets (rejected to maintain data integrity).
- Cloud AI APIs (rejected due to latency and demo stability concerns).
