# Project Context

## System:
- 4 DOF Robotic Arm (ESP32 controlled)
- Web-based control system (digital joystick)
- Camera-based AI classification system
- Localhost backend (Flask / FastAPI)
- Wi-Fi communication (HTTP)
- Optional dashboard UI

## AI Model:
- Custom CNN architecture (Conv2D -> MaxPool -> Dense -> Sigmoid)
- Binary Classification: 0 -> Good (includes average), 1 -> Defective
- Fixed input size: 224x224
- Training Environment: Google Colab (T4 GPU)
- Average → Accept (current constraint)
- Defective → Reject

## Output:
- Bin A → Accept
- Bin B → Reject

## Control Modes:
- Manual (Joystick)
- IoT (Web control)
- Automation (Teach & Repeat)
- AI Mode

## Final Goal:
- Working robotic arm
- Stable control (web + joystick)
- AI classification working
- Clean integration
- Demo-ready system

## Final Principle:
Build in layers
Test in isolation
Integrate carefully
Deliver reliably
