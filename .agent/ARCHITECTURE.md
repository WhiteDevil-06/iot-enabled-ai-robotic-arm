# Architecture

## System Flow
1. Image captured via Camera.
2. Image processed by Localhost backend.
3. CNN model predicts class (Good, Average, Defective).
4. Backend applies Decision Logic (Accept/Reject).
5. Backend sends HTTP request to ESP32.
6. ESP32 controls 4 DOF Robotic Arm to move to Bin A or Bin B.

## Layers
1. **Mechanical Layer**: 4 DOF Robotic Arm, Servos, Bins.
2. **Control Layer**: ESP32, Servo Controllers.
3. **AI Layer**: CNN Model, Image Classification.
4. **Communication Layer**: Wi-Fi, HTTP (GET/POST), Localhost Backend.
5. **Interface Layer**: Web-based Control System, Dashboard UI, Digital Joystick.
